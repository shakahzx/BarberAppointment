const express = require('express');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', asyncHandler(async (request, response) => {
  const filter = { isPublished: true };
  if (request.query.barber) filter.barber = request.query.barber;
  const reviews = await Review.find(filter)
    .populate('customer', 'name')
    .populate('service', 'name')
    .sort({ createdAt: -1 })
    .limit(100);
  response.json(reviews);
}));

router.get('/my', authenticate, requireRole('customer'), asyncHandler(async (request, response) => {
  response.json(await Review.find({ customer: request.user.id }).select('appointment rating comment createdAt'));
}));

router.post('/', authenticate, requireRole('customer'), asyncHandler(async (request, response) => {
  const { appointment: appointmentId, rating, comment = '' } = request.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== 'string' || comment.length > 1000) {
    return response.status(400).json({ message: 'Choose a rating from 1 to 5 and keep feedback under 1,000 characters.' });
  }
  const appointment = await Appointment.findOne({ _id: appointmentId, customer: request.user.id, status: 'Completed' });
  if (!appointment) return response.status(403).json({ message: 'You can review only your own completed appointments.' });
  if (await Review.exists({ appointment: appointment.id })) return response.status(409).json({ message: 'This appointment already has a review.' });

  const review = await Review.create({
    customer: request.user.id,
    appointment: appointment.id,
    barber: appointment.barber,
    service: appointment.service,
    rating,
    comment: comment.trim(),
  });
  response.status(201).json(review);
}));

module.exports = router;