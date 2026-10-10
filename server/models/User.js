const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'customer', 'barber'], default: 'customer' },
  barberProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', default: null },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  preferences: {
    hairType: { type: String, enum: ['', 'straight', 'wavy', 'curly', 'coily'], default: '' },
    styleGoal: { type: String, enum: ['', 'classic', 'low-maintenance', 'textured', 'formal'], default: '' },
  },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: true },
  emailVerificationCodeHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  emailVerificationSentAt: { type: Date, select: false },
  emailVerificationAttempts: { type: Number, default: 0, select: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);