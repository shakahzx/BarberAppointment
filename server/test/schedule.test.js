const assert = require('node:assert/strict');
const test = require('node:test');
const Appointment = require('../models/Appointment');
const { barberWorksOnDate, getEndTime, getReservationSlots, intervalsOverlap, overlapsBarberBreak } = require('../utils/schedule');

test('service duration produces the correct appointment end time', () => {
  assert.equal(getEndTime('09:15', 40), '09:55');
});

test('reservations include each quarter-hour touched by a service', () => {
  assert.deepEqual(getReservationSlots('09:15', 40), ['09:15', '09:30', '09:45']);
});

test('overlapping appointments share a reservation key while adjacent appointments do not', () => {
  const firstSlots = getReservationSlots('09:00', 45);
  const overlappingSlots = getReservationSlots('09:30', 30);
  const adjacentSlots = getReservationSlots('09:45', 30);
  assert.ok(firstSlots.some((slot) => overlappingSlots.includes(slot)));
  assert.ok(!firstSlots.some((slot) => adjacentSlots.includes(slot)));
  assert.equal(intervalsOverlap(540, 585, 585, 615), false);
});

test('barber date-specific days off override recurring working days', () => {
  const barber = { workingDays: ['Monday'], daysOff: ['2026-10-12'] };
  assert.equal(barberWorksOnDate(barber, new Date(2026, 9, 12), '2026-10-12'), false);
  assert.equal(barberWorksOnDate(barber, new Date(2026, 9, 19), '2026-10-19'), true);
});

test('legacy barber schedules without new arrays remain available', () => {
  const barber = { workingDays: ['Monday'] };
  assert.equal(barberWorksOnDate(barber, new Date(2026, 9, 12), '2026-10-12'), true);
  assert.equal(overlapsBarberBreak(barber, 'Monday', 600, 630), false);
});

test('appointments overlapping recurring breaks are unavailable, adjacent appointments are allowed', () => {
  const barber = { breaks: [{ startTime: '12:00', endTime: '13:00', workingDays: ['Monday'] }] };
  assert.equal(overlapsBarberBreak(barber, 'Monday', 705, 735), true);
  assert.equal(overlapsBarberBreak(barber, 'Monday', 780, 810), false);
  assert.equal(overlapsBarberBreak(barber, 'Tuesday', 720, 750), false);
});

test('MongoDB uniquely indexes active barber reservation slots', () => {
  const reservationIndex = Appointment.schema.indexes().find(([fields]) => fields.slotKeys === 1);
  assert.ok(reservationIndex);
  assert.equal(reservationIndex[1].unique, true);
  assert.deepEqual(reservationIndex[1].partialFilterExpression.status.$in, ['Pending', 'Confirmed']);
});