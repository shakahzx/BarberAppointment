const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');
const { analyzeSentiment, getReviewInsights, handleBookingMessage, predictPeakHours, recommendForCustomer } = require('../services/aiAssistant');
const Barber = require('../models/Barber');

const router = express.Router();
const assistantRequests = new Map();
const faceShapeStyles = {
  oval: ['Textured crop', 'Classic taper', 'Side part'],
  round: ['High fade', 'Pompadour', 'Angular fringe'],
  square: ['Crew cut', 'Textured quiff', 'Soft side part'],
  heart: ['Longer fringe', 'Layered crop', 'Low taper'],
  oblong: ['Side fringe', 'Medium textured cut', 'Classic taper'],
};

function limitAssistantTraffic(request, response, next) {
  const key = request.user.id;
  const now = Date.now();
  const bucket = assistantRequests.get(key) || { count: 0, expiresAt: now + 60_000 };
  if (bucket.expiresAt <= now) {
    bucket.count = 0;
    bucket.expiresAt = now + 60_000;
  }
  bucket.count += 1;
  assistantRequests.set(key, bucket);
  if (bucket.count > 20) return response.status(429).json({ message: 'Please wait a moment before asking the assistant again.' });
  next();
}

router.post('/style-match', asyncHandler(async (request, response) => {
  const faceShape = String(request.body.faceShape || '').toLowerCase();
  if (!Object.hasOwn(faceShapeStyles, faceShape)) {
    return response.status(400).json({ message: 'Choose a supported face shape.', options: Object.keys(faceShapeStyles) });
  }
  const styles = faceShapeStyles[faceShape];
  const barbers = await Barber.find({ isActive: true, specialties: { $in: styles } }).select('name specialties avatarUrl').limit(3);
  response.json({
    faceShape,
    styles,
    barbers,
    method: 'on-device-user-selected-face-shape-rules',
    privacy: 'No face image is uploaded or stored. This is styling guidance, not facial recognition or professional advice.',
  });
}));

router.post('/chat', authenticate, requireRole('customer'), limitAssistantTraffic, asyncHandler(async (request, response) => {
  const message = String(request.body.message || '').trim();
  if (!message || message.length > 500) return response.status(400).json({ message: 'Enter a message of up to 500 characters.' });
  if (request.body.useLanguageModel !== undefined && typeof request.body.useLanguageModel !== 'boolean') {
    return response.status(400).json({ message: 'Invalid assistant preference.' });
  }
  response.json(await handleBookingMessage(message, { useLanguageModel: request.body.useLanguageModel === true }));
}));

router.get('/config', (_request, response) => {
  response.json({ externalLanguageModelAvailable: Boolean(process.env.AI_API_KEY), imagesLeaveDevice: false });
});

router.get('/recommendations/me', authenticate, requireRole('customer'), asyncHandler(async (request, response) => {
  response.json(await recommendForCustomer(request.user.id));
}));

router.get('/insights/peak-hours', authenticate, requireRole('admin'), asyncHandler(async (_request, response) => {
  response.json(await predictPeakHours());
}));

router.get('/insights/reviews', authenticate, requireRole('admin'), asyncHandler(async (_request, response) => {
  response.json(await getReviewInsights());
}));

router.post('/reviews/:id/analyze', authenticate, requireRole('admin'), asyncHandler(async (request, response) => {
  const Review = require('../models/Review');
  const review = await Review.findById(request.params.id).select('comment rating');
  if (!review) return response.status(404).json({ message: 'Review not found.' });
  response.json({ sentiment: analyzeSentiment(review.comment), rating: review.rating });
}));

module.exports = router;