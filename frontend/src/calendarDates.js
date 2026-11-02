// Google all-day values are calendar dates, not UTC instants.
export function parseCalendarDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function calendarEventDates(event) {
  if (event.start.date) {
    return {
      rawDate: parseCalendarDate(event.start.date),
      allDayStart: event.start.date,
      allDayEnd: event.end?.date || null,
    };
  }
  return { rawDate: new Date(event.start.dateTime) };
}

export function eventOccursOnDate(event, day) {
  if (!event.allDayStart) return event.rawDate.toDateString() === day.toDateString();
  const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  // Google's end.date is exclusive. Missing ends fall back to a single day.
  return event.allDayEnd
    ? key >= event.allDayStart && key < event.allDayEnd
    : key === event.allDayStart;
}
