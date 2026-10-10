const Appointment = require('../models/Appointment');
const cron = require('node-cron');
const { sendAppointmentEmail } = require('./email');

function isWithinReminderWindow(startsAt, now = new Date(), windowHours = 24, toleranceMinutes = 3) {
  const hoursUntilStart = (startsAt.getTime() - now.getTime()) / 3_600_000;
  return Math.abs(hoursUntilStart - windowHours) <= toleranceMinutes / 60;
}

async function sendReminderWindow({ now, hours, field, kind }) {
  const candidates = await Appointment.find({ status: 'Confirmed', [field]: null })
    .populate('customer', 'name email')
    .populate('barber', 'name avatarUrl')
    .populate('service', 'name');
  let sentCount = 0;

  for (const appointment of candidates) {
    const startsAt = new Date(`${appointment.appointmentDate}T${appointment.startTime}:00`);
    if (!isWithinReminderWindow(startsAt, now, hours)) continue;

    const claimed = await Appointment.findOneAndUpdate(
      { _id: appointment.id, status: 'Confirmed', [field]: null },
      { [field]: now },
      { new: true },
    );
    if (!claimed) continue;

    try {
      await sendAppointmentEmail({ appointment, kind });
      sentCount += 1;
    } catch (error) {
      await Appointment.updateOne({ _id: appointment.id, [field]: now }, { [field]: null });
      console.error(`Reminder email failed for appointment ${appointment.id}: ${error.message}`);
    }
  }
  return sentCount;
}

async function sendDueReminders(now = new Date()) {
  const [sent24h, sent2h] = await Promise.all([
    sendReminderWindow({ now, hours: 24, field: 'reminder24hSentAt', kind: 'upcoming24h' }),
    sendReminderWindow({ now, hours: 2, field: 'reminder2hSentAt', kind: 'upcoming2h' }),
  ]);
  return { sent24h, sent2h };
}

function startReminderService() {
  const run = () => sendDueReminders().catch((error) => console.error(`Reminder check failed: ${error.message}`));
  run();
  return cron.schedule('*/2 * * * *', run, { timezone: process.env.TZ || 'UTC' });
}

module.exports = { isWithinReminderWindow, sendDueReminders, startReminderService };