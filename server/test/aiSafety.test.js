const assert = require('node:assert/strict');
const test = require('node:test');
const { emailShell } = require('../services/email');
const { analyzeSentiment, parseRequestedDate, parseRequestedTime } = require('../services/aiAssistant');
const { createManageToken, hashManageToken } = require('../utils/manageToken');
const User = require('../models/User');

test('chat date/time parser extracts tomorrow and 3 PM without creating a booking', () => {
  const now = new Date('2026-10-10T09:00:00');
  assert.equal(parseRequestedDate('Haircut tomorrow', now), '2026-10-11');
  assert.equal(parseRequestedDate('Haircut on 2026-10-12', now), '2026-10-12');
  assert.equal(parseRequestedTime('Book a fade tomorrow at 3 PM'), '15:00');
  assert.equal(parseRequestedTime('around 10:30 am'), '10:30');
});

test('review sentiment is explicit and returns neutral for unrecognized language', () => {
  assert.equal(analyzeSentiment('great friendly service').label, 'positive');
  assert.equal(analyzeSentiment('late and rushed').label, 'needs-attention');
  assert.equal(analyzeSentiment('the visit was fine').label, 'neutral');
  assert.equal(analyzeSentiment('great').method, 'transparent-keyword-heuristic');
});

test('one-click tokens have high entropy and are stored only as hashes', () => {
  const token = createManageToken();
  assert.ok(token.length >= 40);
  assert.notEqual(hashManageToken(token), token);
  assert.notEqual(hashManageToken(token), hashManageToken(createManageToken()));
});

test('email template supports dark mode, circular remote avatar, and fallback', () => {
  const avatarTemplate = emailShell({ title: 'Confirmed', body: 'Appointment detail', avatarUrl: 'https://cdn.example/avatar.png' });
  const fallbackTemplate = emailShell({ title: 'Confirmed', body: 'Appointment detail' });
  assert.match(avatarTemplate, /prefers-color-scheme:\s*dark/);
  assert.match(avatarTemplate, /border-radius:50%/);
  assert.match(avatarTemplate, /https:\/\/cdn\.example\/avatar\.png/);
  assert.match(fallbackTemplate, /avatar-fallback/);
  assert.doesNotMatch(emailShell({ title: 'Test', body: 'OK', avatarUrl: 'javascript:alert(1)' }), /javascript:/);
});

test('barber role is explicitly supported for RBAC accounts', () => {
  assert.deepEqual(User.schema.path('role').enumValues, ['admin', 'customer', 'barber']);
});