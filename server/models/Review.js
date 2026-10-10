const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  comment: { type: String, trim: true, maxlength: 1000, default: '' },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

reviewSchema.index({ barber: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);