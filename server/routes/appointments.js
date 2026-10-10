const express = require('express');
const { randomUUID } = require('node:crypto');
const Appointment = require('../models/Appointment');
const Barber = require('../models/Barber');
const Service = require('../models/Service');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');
const { barberWorksOnDate, getEndTime, getReservationSlots, minutesToTime, overlapsBarberBreak, timeToMinutes } = require('../utils/schedule');
const { sendAppointmentEmail } = require('../services/email');
const { createManageToken, hashManageToken } = require('../utils/manageToken');

const router = express.Router();
const busyStatuses = ['Pending', 'Confirmed'];

function dateFromString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function populated(query) {
  return query.populate('customer', 'name email phone').populate('barber', 'name avatarUrl').populate('service', 'name price duration');
}

async function findManageAppointment(token) {
  if (typeof token !== 'string' || token.length < 40 || token.length > 100) return null;
  return Appointment.findOne({
    manageTokenHash: hashManageToken(token),
    manageTokenExpiresAt: { $gt: new Date() },
    status: { $in: ['Pending', 'Confirmed'] },
  }).select('+manageTokenHash +manageTokenExpiresAt');
}

async function validateRequestedSlot({ barberId, serviceId, appointmentDate, startTime, excludeAppointmentId }) {
  const selectedDate = dateFromString(appointmentDate);
  if (!selectedDate || selectedDate < new Date(new Date().setHours(0, 0, 0, 0))
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '') || timeToMinutes(startTime) % 15 !== 0) {
    return { error: 'Choose a valid future appointment date and 15-minute start time.' };
  }
  const [barber, service] = await Promise.all([
    Barber.findOne({ _id: barberId, isActive: true }),
    Service.findOne({ _id: serviceId, isActive: true }),
  ]);
  if (!barber || !service) return { error: 'The selected barber or service is unavailable.' };

  const weekday = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const start = timeToMinutes(startTime);
  const end = start + service.duration;
  const endTime = getEndTime(startTime, service.duration);
  const now = new Date();
  if (!barberWorksOnDate(barber, selectedDate, appointmentDate)
    || start < timeToMinutes(barber.startTime)
    || end > timeToMinutes(barber.endTime)
    || overlapsBarberBreak(barber, weekday, start, end)
    || (appointmentDate === dateString(now) && start <= now.getHours() * 60 + now.getMinutes())) {
    return { error: 'That time is outside barber availability. Please choose another slot.' };
  }

  const conflictFilter = {
    barber: barberId,
    appointmentDate,
    status: { $in: busyStatuses },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeAppointmentId) conflictFilter._id = { $ne: excludeAppointmentId };
  if (await Appointment.exists(conflictFilter)) return { error: 'That time was just booked. Please choose another slot.', conflict: true };

  return { barber, service, endTime, slotKeys: getReservationSlots(startTime, service.duration) };
}

router.get('/availability', asyncHandler(async (request, response) => {
  const { barber: barberId, service: serviceId, date } = request.query;
  const selectedDate = dateFromString(date);
  if (!barberId || !serviceId || !selectedDate) return response.status(400).json({ message: 'Choose a barber, service, and valid date.' });

  const [barber, service] = await Promise.all([
    Barber.findOne({ _id: barberId, isActive: true }),
    Service.findOne({ _id: serviceId, isActive: true }),
  ]);
  if (!barber || !service) return response.status(404).json({ message: 'The selected barber or service is unavailable.' });
  if (selectedDate < new Date(new Date().setHours(0, 0, 0, 0))) return response.json({ slots: [] });

  const weekday = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  if (!barberWorksOnDate(barber, selectedDate, date)) return response.json({ slots: [] });

  const appointments = await Appointment.find({ barber: barberId, appointmentDate: date, status: { $in: busyStatuses } }).select('startTime endTime');
  const slots = [];
  const opening = Math.ceil(timeToMinutes(barber.startTime) / 15) * 15;
  const closing = timeToMinutes(barber.endTime);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = dateString(now);

  for (let start = opening; start + service.duration <= closing; start += 15) {
    const end = start + service.duration;
    if (date === today && start <= nowMinutes) continue;
    if (overlapsBarberBreak(barber, weekday, start, end)) continue;
    const overlaps = appointments.some((appointment) => (
      timeToMinutes(appointment.startTime) < end && timeToMinutes(appointment.endTime) > start
    ));
    if (!overlaps) {
      slots.push({
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
      });
    }
  }
  response.json({ slots });
}));

router.post('/', authenticate, requireRole('customer'), asyncHandler(async (request, response) => {
  const { barber: barberId, service: serviceId, appointmentDate, startTime, notes = '', paymentMethod = 'pay-at-shop' } = request.body;
  if (!['pay-at-shop', 'mock'].includes(paymentMethod)) {
    return response.status(400).json({ message: 'Choose a supported checkout option.' });
  }
  const slot = await validateRequestedSlot({ barberId, serviceId, appointmentDate, startTime });
  if (slot.error) return response.status(slot.conflict ? 409 : 400).json({ message: slot.error });
  const { barber, service, endTime, slotKeys } = slot;
  const now = new Date();
  const start = timeToMinutes(startTime);
  if (appointmentDate === dateString(now) && start <= now.getHours() * 60 + now.getMinutes()) {
    return response.status(400).json({ message: 'Appointments cannot be booked in the past.' });
  }

  const manageToken = createManageToken();
  const appointment = await Appointment.create({
    customer: request.user.id,
    barber: barberId,
    service: serviceId,
    appointmentDate,
    startTime,
    endTime,
    slotKeys,
    paymentMethod,
    paymentStatus: paymentMethod === 'mock' ? 'paid' : 'unpaid',
    paymentReference: paymentMethod === 'mock' ? `DEMO-${randomUUID()}` : '',
    manageTokenHash: hashManageToken(manageToken),
    manageTokenExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    notes,
  });
  const createdAppointment = await populated(Appointment.findById(appointment.id));
  void sendAppointmentEmail({ appointment: createdAppointment, kind: 'requested', manageToken })
    .catch((error) => console.error(`Appointment request email failed: ${error.message}`));
  response.status(201).json(createdAppointment);
}));

router.get('/my', authenticate, requireRole('customer'), asyncHandler(async (request, response) => {
  response.json(await populated(Appointment.find({ customer: request.user.id }).sort({ appointmentDate: -1, startTime: -1 })));
}));

router.get('/', authenticate, requireRole('admin'), asyncHandler(async (request, response) => {
  const filter = {};
  if (request.query.status) filter.status = request.query.status;
  if (request.query.date) filter.appointmentDate = request.query.date;
  let appointments = await populated(Appointment.find(filter).sort({ appointmentDate: 1, startTime: 1 }));
  if (request.query.search) {
    const search = request.query.search.toLowerCase();
    appointments = appointments.filter((appointment) => (
      appointment.customer?.name.toLowerCase().includes(search)
      || appointment.customer?.email.toLowerCase().includes(search)
      || appointment.barber?.name.toLowerCase().includes(search)
      || appointment.service?.name.toLowerCase().includes(search)
    ));
  }
  response.json(appointments);
}));

router.get('/manage/:token', asyncHandler(async (request, response) => {
  const appointment = await findManageAppointment(request.params.token);
  if (!appointment) return response.status(404).json({ message: 'This private appointment link is invalid, expired, or already used.' });
  const details = await populated(Appointment.findById(appointment.id));
  response.json({
    appointment: {
      id: details.id,
      service: details.service,
      barber: details.barber,
      appointmentDate: details.appointmentDate,
      startTime: details.startTime,
      endTime: details.endTime,
      status: details.status,
    },
  });
}));

router.post('/manage/:token/cancel', asyncHandler(async (request, response) => {
  const appointment = await findManageAppointment(request.params.token);
  if (!appointment) return response.status(404).json({ message: 'This private appointment link is invalid, expired, or already used.' });
  const start = new Date(`${appointment.appointmentDate}T${appointment.startTime}:00`);
  if (start.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
    return response.status(400).json({ message: 'Online cancellation must be at least 24 hours before the appointment.' });
  }
  appointment.status = 'Cancelled';
  appointment.manageTokenHash = undefined;
  appointment.manageTokenExpiresAt = undefined;
  await appointment.save();
  const updatedAppointment = await populated(Appointment.findById(appointment.id));
  void sendAppointmentEmail({ appointment: updatedAppointment, kind: 'cancelled' })
    .catch((error) => console.error(`Cancellation email failed: ${error.message}`));
  response.json({ message: 'Appointment cancelled.' });
}));

router.post('/manage/:token/reschedule', asyncHandler(async (request, response) => {
  const appointment = await findManageAppointment(request.params.token);
  if (!appointment) return response.status(404).json({ message: 'This private appointment link is invalid, expired, or already used.' });
  const { barber: barberId, appointmentDate, startTime } = request.body;
  const slot = await validateRequestedSlot({
    barberId: barberId || appointment.barber,
    serviceId: appointment.service,
    appointmentDate,
    startTime,
    excludeAppointmentId: appointment.id,
  });
  if (slot.error) return response.status(slot.conflict ? 409 : 400).json({ message: slot.error });

  appointment.barber = slot.barber.id;
  appointment.appointmentDate = appointmentDate;
  appointment.startTime = startTime;
  appointment.endTime = slot.endTime;
  appointment.slotKeys = slot.slotKeys;
  appointment.status = 'Pending';
  const nextToken = createManageToken();
  appointment.manageTokenHash = hashManageToken(nextToken);
  appointment.manageTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await appointment.save();
  const updatedAppointment = await populated(Appointment.findById(appointment.id));
  void sendAppointmentEmail({ appointment: updatedAppointment, kind: 'requested', manageToken: nextToken })
    .catch((error) => console.error(`Reschedule email failed: ${error.message}`));
  response.json({ message: 'Reschedule requested. The shop will confirm the new time.' });
}));

router.get('/:id', authenticate, asyncHandler(async (request, response) => {
  const appointment = await populated(Appointment.findById(request.params.id));
  if (!appointment) return response.status(404).json({ message: 'Appointment not found.' });
  if (request.user.role !== 'admin' && String(appointment.customer.id) !== String(request.user.id)) {
    return response.status(403).json({ message: 'You cannot view another customer’s appointment.' });
  }
  response.json(appointment);
}));

router.put('/:id/status', authenticate, requireRole('admin'), asyncHandler(async (request, response) => {
  const allowed = ['Confirmed', 'Rejected', 'Completed'];
  const appointment = await Appointment.findById(request.params.id);
  if (!appointment) return response.status(404).json({ message: 'Appointment not found.' });
  if (!allowed.includes(request.body.status)) return response.status(400).json({ message: 'Choose a valid appointment status.' });
  const nextStatuses = { Pending: ['Confirmed', 'Rejected'], Confirmed: ['Completed'] };
  if (!nextStatuses[appointment.status]?.includes(request.body.status)) {
    return response.status(400).json({ message: `A ${appointment.status.toLowerCase()} appointment cannot be changed to ${request.body.status.toLowerCase()}.` });
  }
  appointment.status = request.body.status;
  await appointment.save();
  const updatedAppointment = await populated(Appointment.findById(appointment.id));
  const notificationKind = { Confirmed: 'confirmed', Rejected: 'rejected', Cancelled: 'cancelled' }[appointment.status];
  if (notificationKind) {
    void sendAppointmentEmail({ appointment: updatedAppointment, kind: notificationKind })
      .catch((error) => console.error(`Appointment notification failed: ${error.message}`));
  }
  response.json(updatedAppointment);
}));

router.put('/:id/cancel', authenticate, requireRole('customer'), asyncHandler(async (request, response) => {
  const appointment = await Appointment.findOne({ _id: request.params.id, customer: request.user.id });
  if (!appointment) return response.status(404).json({ message: 'Appointment not found.' });
  const appointmentStart = new Date(`${appointment.appointmentDate}T${appointment.startTime}:00`);
  if (!['Pending', 'Confirmed'].includes(appointment.status) || appointmentStart.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
    return response.status(400).json({ message: 'This appointment can no longer be cancelled online. Please contact the barbershop.' });
  }
  appointment.status = 'Cancelled';
  await appointment.save();
  const updatedAppointment = await populated(Appointment.findById(appointment.id));
  void sendAppointmentEmail({ appointment: updatedAppointment, kind: 'cancelled' })
    .catch((error) => console.error(`Cancellation email failed: ${error.message}`));
  response.json(updatedAppointment);
}));

module.exports = router;