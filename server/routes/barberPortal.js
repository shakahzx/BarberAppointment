const express = require('express');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('barber'));

router.get('/appointments', asyncHandler(async (request, response) => {
  if (!request.user.barberProfile) return response.status(403).json({ message: 'This barber account is not linked to a barber profile.' });
  const appointments = await Appointment.find({ barber: request.user.barberProfile })
    .populate('customer', 'name')
    .populate('service', 'name duration')
    .sort({ appointmentDate: 1, startTime: 1 });
  response.json(appointments);
}));

router.put('/appointments/:id/complete', asyncHandler(async (request, response) => {
  if (!request.user.barberProfile) return response.status(403).json({ message: 'This barber account is not linked to a barber profile.' });
  const appointment = await Appointment.findOne({ _id: request.params.id, barber: request.user.barberProfile, status: 'Confirmed' });
  if (!appointment) return response.status(404).json({ message: 'Confirmed appointment not found.' });
  appointment.status = 'Completed';
  await appointment.save();
  response.json({ id: appointment.id, status: appointment.status });
}));

module.exports = router;