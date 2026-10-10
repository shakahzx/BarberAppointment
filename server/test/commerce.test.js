const assert = require('node:assert/strict');
const test = require('node:test');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');
const { isWithinReminderWindow } = require('../services/reminders');

test('upcoming reminder window includes the next 24 hours but not past appointments', () => {
  const now = new Date('2026-10-10T09:00:00Z');
  assert.equal(isWithinReminderWindow(new Date('2026-10-11T09:00:00Z'), now), true);
  assert.equal(isWithinReminderWindow(new Date('2026-10-11T09:02:00Z'), now), true);
  assert.equal(isWithinReminderWindow(new Date('2026-10-11T09:04:00Z'), now), false);
  assert.equal(isWithinReminderWindow(new Date('2026-10-10T11:00:00Z'), now, 2), true);
  assert.equal(isWithinReminderWindow(new Date('2026-10-10T10:58:00Z'), now, 2), true);
  assert.equal(isWithinReminderWindow(new Date('2026-10-10T10:56:00Z'), now, 2), false);
  assert.equal(isWithinReminderWindow(new Date('2026-10-10T08:59:00Z'), now), false);
});

test('appointment schema only allows supported demo/pay-at-shop methods', () => {
  assert.deepEqual(Appointment.schema.path('paymentMethod').enumValues, ['pay-at-shop', 'mock']);
});

test('review schema requires a unique appointment reference and 1-5 ratings', () => {
  const appointmentIndex = Review.schema.indexes().find(([fields]) => fields.appointment === 1);
  assert.equal(appointmentIndex[1].unique, true);
  assert.equal(Review.schema.path('rating').options.min, 1);
  assert.equal(Review.schema.path('rating').options.max, 5);
});