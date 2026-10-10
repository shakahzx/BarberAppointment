const express = require('express');
const Service = require('../models/Service');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const adminOnly = [authenticate, requireRole('admin')];

router.get('/', asyncHandler(async (_request, response) => {
  response.json(await Service.find({ isActive: true }).sort({ name: 1 }))
}));

router.get('/manage', ...adminOnly, asyncHandler(async (_request, response) => {
  response.json(await Service.find().sort({ name: 1 }))
}));

router.post('/', ...adminOnly, asyncHandler(async (request, response) => {
  const service = await Service.create(request.body);
  response.status(201).json(service);
}));

router.put('/:id', ...adminOnly, asyncHandler(async (request, response) => {
  const service = await Service.findByIdAndUpdate(request.params.id, request.body, { new: true, runValidators: true });
  if (!service) return response.status(404).json({ message: 'Service not found.' });
  response.json(service);
}));

router.delete('/:id', ...adminOnly, asyncHandler(async (request, response) => {
  const service = await Service.findByIdAndUpdate(request.params.id, { isActive: false }, { new: true });
  if (!service) return response.status(404).json({ message: 'Service not found.' });
  response.json({ message: 'Service deactivated.' });
}));

module.exports = router;