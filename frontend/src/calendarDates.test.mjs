import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCalendarDate, calendarEventDates, eventOccursOnDate } from './calendarDates.js';

const allDay = (start, end) => calendarEventDates({ start: { date: start }, end: end ? { date: end } : undefined });
const occurs = (event, day) => eventOccursOnDate(event, parseCalendarDate(day));

test('single all-day Sunday stays on October 25 and excludes both adjacent days', () => {
  const event = allDay('2026-10-25', '2026-10-26');
  assert.equal(event.rawDate.getDay(), 0);
  assert.equal(event.rawDate.getDate(), 25);
  assert.equal(event.rawDate.getHours(), 0);
  assert.equal(occurs(event, '2026-10-24'), false);
  assert.equal(occurs(event, '2026-10-25'), true);
  assert.equal(occurs(event, '2026-10-26'), false);
});

test('multi-day ranges include start and interior dates, exclude end, across months and years', () => {
  for (const [start, middle, last, end] of [
    ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28'],
    ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03'],
    ['2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'],
    ['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02'],
  ]) {
    const event = allDay(start, end);
    for (const day of [start, middle, last]) assert.equal(occurs(event, day), true, day);
    assert.equal(occurs(event, end), false, end);
  }
});

test('spring and fall DST spans retain every calendar day and exclusive end', () => {
  for (const [start, transition, end] of [
    ['2026-03-07', '2026-03-08', '2026-03-09'],
    ['2026-10-31', '2026-11-01', '2026-11-02'],
  ]) {
    const event = allDay(start, end);
    assert.equal(occurs(event, start), true);
    assert.equal(occurs(event, transition), true);
    assert.equal(occurs(event, end), false);
  }
});

test('missing end is one day; source records remain unchanged', () => {
  const source = { start: { date: '2026-10-25' }, end: { date: '2026-10-28' } };
  const before = JSON.stringify(source);
  calendarEventDates(source);
  assert.equal(JSON.stringify(source), before);
  const event = allDay('2026-10-25');
  assert.equal(occurs(event, '2026-10-25'), true);
  assert.equal(occurs(event, '2026-10-26'), false);
});

test('timed events preserve offset instants, including repeated DST hour', () => {
  for (const value of ['2026-10-25T17:00:00-04:00', '2026-11-01T01:30:00-04:00', '2026-11-01T01:30:00-05:00', '2026-03-08T03:30:00-04:00']) {
    const event = calendarEventDates({ start: { dateTime: value } });
    assert.equal(event.rawDate.getTime(), Date.parse(value));
    assert.equal(event.allDayStart, undefined);
    assert.equal(eventOccursOnDate(event, new Date(value)), true);
  }
});
