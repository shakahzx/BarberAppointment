const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, lowercase: true, trim: true, default: '' },
  avatarUrl: { type: String, trim: true, default: '' },
  specialties: [{ type: String, trim: true }],
  workingDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  breaks: [{
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    workingDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
  }],
  daysOff: [{ type: String, match: /^\d{4}-\d{2}-\d{2}$/ }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

barberSchema.pre('validate', function validateSchedule() {
  if (!this.workingDays.length) this.invalidate('workingDays', 'Choose at least one working day.');
  if (this.startTime >= this.endTime) this.invalidate('endTime', 'End time must be later than start time.');
  this.breaks.forEach((breakPeriod, index) => {
    if (breakPeriod.startTime >= breakPeriod.endTime
      || breakPeriod.startTime < this.startTime
      || breakPeriod.endTime > this.endTime
      || !breakPeriod.workingDays.length) {
      this.invalidate(`breaks.${index}`, 'Breaks must be within working hours and have at least one working day.');
    }
  });
});

module.exports = mongoose.model('Barber', barberSchema);