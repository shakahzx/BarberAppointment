const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/email');
const { createVerificationCode, hashVerificationCode, verificationCodeMatches } = require('../utils/emailVerification');

const router = express.Router();

function issueToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, preferences: user.preferences, role: user.role, barberProfile: user.barberProfile, isActive: user.isActive, isEmailVerified: user.isEmailVerified };
}

async function sendVerificationCode(user) {
  const code = createVerificationCode();
  await sendVerificationEmail({ email: user.email, name: user.name, code });
  user.emailVerificationCodeHash = hashVerificationCode(code);
  user.emailVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.emailVerificationSentAt = new Date();
  user.emailVerificationAttempts = 0;
  await user.save();
}

router.post('/register', asyncHandler(async (request, response) => {
  const { name, email, password, phone = '' } = request.body;
  if (!name?.trim() || !email?.trim() || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) {
    return response.status(400).json({ message: 'Enter your name, a valid email, and a password of at least 8 characters.' });
  }
  if (await User.exists({ email: email.toLowerCase() })) return response.status(409).json({ message: 'An account with this email already exists. Sign in or verify your email.' });

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    phone,
    role: 'customer',
    isActive: false,
    isEmailVerified: false,
  });
  try {
    await sendVerificationCode(user);
  } catch (error) {
    await user.deleteOne();
    return response.status(error.status || 503).json({ message: 'We could not send a verification email, so no account was created. Check the mail settings and try again.' });
  }
  response.status(201).json({ verificationRequired: true, email: user.email });
}));

router.post('/verify-email', asyncHandler(async (request, response) => {
  const email = String(request.body.email || '').trim().toLowerCase();
  const code = String(request.body.code || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ message: 'Enter your email and the six-digit code we sent.' });
  }

  const user = await User.findOne({ email }).select('+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts');
  if (!user || user.role !== 'customer' || user.isEmailVerified || !user.emailVerificationCodeHash) {
    return response.status(400).json({ message: 'That code is invalid or expired. Request a new code and try again.' });
  }
  if (user.emailVerificationAttempts >= 5) {
    return response.status(429).json({ message: 'Too many attempts. Request a new verification code.' });
  }
  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
    return response.status(400).json({ message: 'That code has expired. Request a new verification code.' });
  }

  if (!verificationCodeMatches(code, user.emailVerificationCodeHash)) {
    user.emailVerificationAttempts += 1;
    await user.save();
    return response.status(400).json({ message: 'That code is incorrect. Check the email and try again.' });
  }

  user.isEmailVerified = true;
  user.isActive = true;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  user.emailVerificationSentAt = undefined;
  user.emailVerificationAttempts = 0;
  await user.save();
  response.json({ token: issueToken(user), user: publicUser(user) });
}));

router.post('/resend-verification', asyncHandler(async (request, response) => {
  const email = String(request.body.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return response.status(400).json({ message: 'Enter a valid email address.' });
  const user = await User.findOne({ email }).select('+emailVerificationSentAt');
  const genericMessage = 'If an unverified account exists for that email, a new code will be sent.';
  if (!user || user.role !== 'customer' || user.isEmailVerified) return response.json({ message: genericMessage });

  const cooldownRemaining = user.emailVerificationSentAt
    ? 60_000 - (Date.now() - user.emailVerificationSentAt.getTime())
    : 0;
  if (cooldownRemaining > 0) {
    return response.status(429).json({ message: `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before requesting another code.` });
  }
  await sendVerificationCode(user);
  response.json({ message: genericMessage });
}));

router.post('/login', asyncHandler(async (request, response) => {
  const { email, password } = request.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('+password');
  if (user && user.role === 'customer' && !user.isEmailVerified) {
    return response.status(403).json({ message: 'Verify your email before signing in.' });
  }
  if (!user || !user.isActive || !await bcrypt.compare(String(password || ''), user.password)) {
    return response.status(401).json({ message: 'Email or password is incorrect.' });
  }
  response.json({ token: issueToken(user), user: publicUser(user) });
}));

router.get('/me', authenticate, (request, response) => response.json({ user: publicUser(request.user) }));

router.put('/profile', authenticate, asyncHandler(async (request, response) => {
  const { name, phone, hairType = '', styleGoal = '' } = request.body;
  if (!name?.trim()) return response.status(400).json({ message: 'Name is required.' });
  if (!['', 'straight', 'wavy', 'curly', 'coily'].includes(hairType)
    || !['', 'classic', 'low-maintenance', 'textured', 'formal'].includes(styleGoal)) {
    return response.status(400).json({ message: 'Choose a valid hair type and style preference.' });
  }
  request.user.name = name.trim();
  request.user.phone = String(phone || '').trim();
  request.user.preferences = { hairType, styleGoal };
  await request.user.save();
  response.json({ user: publicUser(request.user) });
}));

module.exports = router;