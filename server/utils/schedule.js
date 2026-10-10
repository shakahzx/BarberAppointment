function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function getEndTime(startTime, duration) {
  return minutesToTime(timeToMinutes(startTime) + duration);
}

function getReservationSlots(startTime, duration) {
  const slots = [];
  const end = timeToMinutes(startTime) + duration;
  for (let slot = timeToMinutes(startTime); slot < end; slot += 15) slots.push(minutesToTime(slot));
  return slots;
}

function intervalsOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

function barberWorksOnDate(barber, date, dateValue) {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  return (barber.workingDays || []).includes(weekday) && !(barber.daysOff || []).includes(dateValue);
}

function overlapsBarberBreak(barber, weekday, start, end) {
  return (barber.breaks || []).some((breakPeriod) => (
    (breakPeriod.workingDays || []).includes(weekday)
    && intervalsOverlap(start, end, timeToMinutes(breakPeriod.startTime), timeToMinutes(breakPeriod.endTime))
  ));
}

module.exports = {
  barberWorksOnDate,
  getEndTime,
  getReservationSlots,
  intervalsOverlap,
  minutesToTime,
  overlapsBarberBreak,
  timeToMinutes,
};