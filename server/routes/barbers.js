const express = require('express');
const bcrypt = require('bcryptjs');
const Barber = require('../models/Barber');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const adminOnly = [authenticate, requireRole('admin')];

router.get('/', asyncHandler(async (_request, response) => {
  response.json(await Barber.find({ isActive: true }).sort({ name: 1 }))
}));

router.get('/manage', ...adminOnly, asyncHandler(async (_request, response) => {
  response.json(await Barber.find().sort({ name: 1 }))
}));

router.post('/', ...adminOnly, asyncHandler(async (request, response) => {
  const barber = await Barber.create(request.body);
  response.status(201).json(barber);
}));

router.post('/:id/account', ...adminOnly, asyncHandler(async (request, response) => {
  const barber = await Barber.findById(request.params.id);
  if (!barber) return response.status(404).json({ message: 'Barber profile not found.' });
  const email = String(request.body.email || barber.email || '').trim().toLowerCase();
  const password = request.body.password;
  if (!/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 12) {
    return response.status(400).json({ message: 'Provide a valid email and a temporary password of at least 12 characters.' });
  }
  if (await User.exists({ barberProfile: barber.id })) return response.status(409).json({ message: 'This barber profile already has a login.' });
  if (await User.exists({ email })) return response.status(409).json({ message: 'That email already belongs to an account.' });

  const user = await User.create({
    name: barber.name,
    email,
    password: await bcrypt.hash(password, 12),
    role: 'barber',
    barberProfile: barber.id,
    isActive: true,
    isEmailVerified: true,
  });
  barber.email = email;
  await barber.save();
  response.status(201).json({ id: user.id, email: user.email, role: user.role, barberProfile: barber.id });
}));

router.put('/:id', ...adminOnly, asyncHandler(async (request, response) => {
  const barber = await Barber.findById(request.params.id);
  if (!barber) return response.status(404).json({ message: 'Barber not found.' });
  const editableFields = ['name', 'email', 'avatarUrl', 'specialties', 'workingDays', 'startTime', 'endTime', 'breaks', 'daysOff', 'isActive'];
  for (const field of editableFields) {
    if (request.body[field] !== undefined) barber[field] = request.body[field];
  }
  await barber.save();
  response.json(barber);
}));

router.delete('/:id', ...adminOnly, asyncHandler(async (request, response) => {
  const barber = await Barber.findByIdAndUpdate(request.params.id, { isActive: false }, { new: true });
  if (!barber) return response.status(404).json({ message: 'Barber not found.' });
  response.json({ message: 'Barber deactivated.' });
}));

module.exports = router;