// Reuse the dashboard's existing visibility and deduplication rules.
import { shouldDisplaySchoolEvent } from '../frontend/src/schoolSportsFilter.js';
import { deduplicateCalendarEvents } from '../frontend/src/calendarDisplay.js';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const { sources, customEvents = [], hiddenEventIds = [], calendarFilters = [], date } = JSON.parse(input);
const dayStart = new Date(`${date}T00:00:00`);
const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
let events = [];
for (const source of sources) {
  for (const event of source.items || []) {
    if (event.status === 'cancelled' || !shouldDisplaySchoolEvent(event, source.id)) continue;
    const start = event.start?.dateTime || (event.start?.date && `${event.start.date}T00:00:00`);
    const end = event.end?.dateTime || (event.end?.date && `${event.end.date}T00:00:00`);
    if (!start || new Date(start) >= dayEnd || new Date(end || start) < dayStart || (end && new Date(end) <= dayStart)) continue;
    events.push({ id: event.id, title: event.summary || 'Untitled event', calendarLabel: source.label,
      rawDate: new Date(start), startInstant: event.start?.dateTime || null, endInstant: event.end?.dateTime || null,
      allDayStart: event.start?.date || null, allDayEnd: event.end?.date || null,
      time: event.start?.date ? 'All Day' : '', location: event.location || '', isCustom: false });
  }
}
for (const event of customEvents) {
  if (String(event.date).slice(0,10) !== date) continue;
  const time = event.startTime || event.time;
  events.push({ id: event.id, title: event.title, calendarLabel: event.type || 'Family',
    rawDate: new Date(`${date}T00:00:00`), rawCustomData: event, isCustom: true,
    time: time || 'All Day', startInstant: time ? new Date(`${date}T${time}`).toISOString() : null,
    allDayStart: time ? null : date, location: event.location || '' });
}
events = events.filter(event => !hiddenEventIds.includes(event.id) &&
  !calendarFilters.some(filter => event.title.toLowerCase().includes(String(filter).toLowerCase())));
const result = deduplicateCalendarEvents(events).filter(event =>
  !event.allDayStart || event.allDayStart === date).map(event => ({
    title: event.title.replace(/\s+/g,' ').trim().slice(0,220),
    sources: event.calendarLabels || [event.calendarLabel],
    all_day: Boolean(event.allDayStart) || event.time === 'All Day',
    start: event.startInstant,
    cancelled: /\b(cancelled|canceled)\b/i.test(event.title),
  })).sort((a,b) => Number(b.all_day)-Number(a.all_day) || (Date.parse(a.start)||0)-(Date.parse(b.start)||0) || a.title.localeCompare(b.title));
process.stdout.write(JSON.stringify(result));
