const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  appointmentDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  slotKeys: [{ type: String }],
  status: { type: String, enum: ['Pending', 'Confirmed', 'Rejected', 'Cancelled', 'Completed'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['pay-at-shop', 'mock'], default: 'pay-at-shop' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  paymentReference: { type: String, default: '' },
  reminder24hSentAt: { type: Date, default: null },
  reminder2hSentAt: { type: Date, default: null },
  manageTokenHash: { type: String, select: false },
  manageTokenExpiresAt: { type: Date, select: false },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true });

appointmentSchema.index({ barber: 1, appointmentDate: 1, startTime: 1 });
appointmentSchema.index(
  { barber: 1, appointmentDate: 1, slotKeys: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['Pending', 'Confirmed'] } } },
);

module.exports = mongoose.model('Appointment', appointmentSchema);