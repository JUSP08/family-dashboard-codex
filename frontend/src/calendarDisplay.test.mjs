import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateCalendarEvents as dedup } from './calendarDisplay.js';
const day = (id, title, date = '2026-11-25', extra = {}) => ({ id, title, rawDate: new Date(`${date}T12:00:00`), time: 'All Day', calendarLabel: id, ...extra });
const timed = (id, start, end, extra = {}) => ({ id, title: 'Musical rehearsal', rawDate: new Date(start), startInstant: start, endInstant: end, time: '3 PM - 6 PM', calendarLabel: id, ...extra });

test('copies collapse across calendars without mutating the originals or losing source IDs', () => {
  const input = [day('bhs', ' Thanksgiving Recess '), day('bms', 'thanksgiving recess')];
  const before = JSON.stringify(input);
  const result = dedup(input);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].sourceEventIds, ['bhs', 'bms']);
  assert.deepEqual(result[0].calendarLabels, ['bhs', 'bms']);
  assert.equal(JSON.stringify(input), before);
});
test('closure aliases and multi-day recess copies appear once on each date', () => {
  const result = dedup([day('span', 'Thanksgiving Recess', '2026-11-25', { allDayStart: '2026-11-25', allDayEnd: '2026-11-28' }),
    day('family', 'Bethel Public Schools: Thanksgiving recess', '2026-11-26')]);
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(e => e.allDayStart), ['2026-11-25', '2026-11-26', '2026-11-27']);
  assert.deepEqual(result[1].sourceEventIds, ['span', 'family']);
  assert.equal(dedup([day('a', "Veteran's Day- School Closed"), day('b', 'No school (Veterans Day)'), day('c', "Veteran's Day Observed")]).length, 1);
});
test('separate dates, performances, durations and conflicting locations are retained', () => {
  assert.equal(dedup([day('a', 'Concert'), day('b', 'Concert', '2026-11-26')]).length, 2);
  assert.equal(dedup([timed('a', '2026-11-16T20:00:00Z', '2026-11-16T23:00:00Z'), timed('b', '2026-11-16T20:00:00Z', '2026-11-17T01:00:00Z')]).length, 2);
  assert.equal(dedup([day('a', 'Concert', undefined, { location: 'Room A' }), day('b', 'Concert', undefined, { location: 'Room B' })]).length, 2);
});
test('same instants with different timezone offsets collapse; DST repeated hours do not', () => {
  assert.equal(dedup([timed('a', '2026-11-16T20:00:00Z', '2026-11-16T23:00:00Z'), timed('b', '2026-11-16T15:00:00-05:00', '2026-11-16T18:00:00-05:00')]).length, 1);
  assert.equal(dedup([timed('a', '2026-11-01T01:30:00-04:00', null), timed('b', '2026-11-01T01:30:00-05:00', null)]).length, 2);
});
test('editable custom copy wins without losing the external copy or removal IDs', () => {
  const rawCustomData = { startTime: '15:00', endTime: '18:00' };
  const local = day('local', 'Musical rehearsal', '2026-11-16', { isCustom: true, time: '3 PM - 6 PM', rawCustomData });
  const start = new Date('2026-11-16T15:00:00'); const end = new Date('2026-11-16T18:00:00');
  const result = dedup([timed('external', start.toISOString(), end.toISOString()), local]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'local');
  assert.deepEqual(result[0].sourceEventIds, ['external']);
  assert.deepEqual(result[0].customEventIds, ['local']);
});
test('missing titles and invalid dates do not disappear or merge', () => {
  assert.equal(dedup([day('a', ''), day('b', ''), { id: 'bad', title: 'Bad', rawDate: new Date('invalid') }]).length, 3);
});
