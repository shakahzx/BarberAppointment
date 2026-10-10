const express = require('express');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler(async (_request, response) => {
  response.json(await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 }))
}));

router.put('/:id/status', asyncHandler(async (request, response) => {
  const customer = await User.findOneAndUpdate(
    { _id: request.params.id, role: 'customer' },
    { isActive: Boolean(request.body.isActive) },
    { new: true, runValidators: true },
  );
  if (!customer) return response.status(404).json({ message: 'Customer not found.' });
  response.json({ id: customer.id, isActive: customer.isActive });
}));

module.exports = router;