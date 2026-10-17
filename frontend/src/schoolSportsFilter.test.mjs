import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldDisplaySchoolEvent as show } from './schoolSportsFilter.js';
const bhs = 'ke619q4g2ntjl8hd50omn4v1ih88o164@import.calendar.google.com';
const family = 'kidlindstrom@gmail.com';

test('BHS athletics keep varsity and freshman/sophomore football games', () => {
  for (const summary of ['Varsity Football - Boys Bethel', 'Freshman Football vs Newtown', 'Sophomore Football at Bunnell', 'Froshmore Football vs Joel Barlow', 'Fr/Soph Football vs Newtown', 'JV/Froshmore football at New Fairfield']) {
    assert.equal(show({ summary }, bhs), true, summary);
  }
  for (const summary of ['Varsity Field Hockey - Girls Bethel', 'Varsity Volleyball - Girls Bethel', 'Varsity Soccer - Boys Bethel', 'Varsity Cross Country - Girls Bethel', 'Varsity Swimming - Girls BDI', 'JV Football - Boys Bethel', 'Junior Varsity Football vs Newtown', 'Varsity Football practice', 'Froshmore Football scrimmage', 'Varsity Wrestling - Boys Bethel']) {
    assert.equal(show({ summary }, bhs), false, summary);
  }
});

test('unrelated school announcements, Family calendar and younger sports stay intact', () => {
  for (const summary of ['BOE Meeting', 'PSAT Testing Day', 'Thanksgiving Recess', 'Varsity Soccer Awards Banquet', 'Football fundraiser', 'Picture Retake DAY Gr. 9-11']) assert.equal(show({ summary }, bhs), true, summary);
  for (const source of [family, 'BMS', 'JES', 'RES', 'Soccer (H+S)', 'Soccer (E)', 'Tristan Flag']) {
    for (const summary of ['Soccer practice', 'Varsity Soccer - Girls Bethel', 'Blake: JV football at Brookfield', 'Tristan @ NF Flag', 'Family Fire Drill']) assert.equal(show({ summary }, source), true, `${source}: ${summary}`);
  }
  assert.equal(show({}, bhs), true);
});

test('explicit high-school Family athletics follow games-only scope with curated exceptions', () => {
  for (const summary of ['Blake: Football lift and practice (everyone)', 'BHS Varsity soccer vs Newtown', 'BHS football conditioning']) assert.equal(show({summary}, family), false, summary);
  for (const summary of ['Blake: JV football at Brookfield', 'Blake: JV football vs Weston', 'Blake: JV football vs Notre Dame Prep', 'Blake: Varsity football at Weston', 'Hannah: U15 soccer practice']) assert.equal(show({summary}, family), true, summary);
});

test('only the approved Oct 17 film session is excepted', () => {
  const session = {id: 'eev7oktm8li4bkoukb6u7g9uks', summary: 'Blake: BHS football film session', start: {dateTime: '2026-10-17T08:00:00-04:00'}, end: {dateTime: '2026-10-17T10:00:00-04:00'}};
  assert.equal(show(session, family), true);
  assert.equal(show({...session, id: 'another-film-session'}, family), false);
  assert.equal(show(session, bhs), false);
  for (const summary of ['Blake: Football film and practice (everyone)', 'BHS football: varsity-only film', 'Blake: BHS football (cafe meeting at 2:20 PM)']) assert.equal(show({summary}, family), false, summary);
});
