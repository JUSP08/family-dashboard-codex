import test from 'node:test';
import assert from 'node:assert/strict';
import { getDailyTheme } from './dailyTheme.js';

test('themes stay consistent throughout each local date and dim at night', () => {
  const names = new Set();
  const fonts = new Set();
  for (let month = 0; month < 12; month++) {
    for (let day = 1; day <= 31; day++) {
      const date = new Date(2026, month, day, 12);
      if (date.getMonth() !== month) continue;
      const theme = getDailyTheme(date);
      assert.deepEqual(theme, getDailyTheme(new Date(2026, month, day, 23)));
      assert.notEqual(theme.style.backgroundImage, getDailyTheme(date, 'night').style.backgroundImage);
      assert.match(theme.style['--theme-accent'], /^#[0-9a-f]{6}$/);
      names.add(theme.name);
      fonts.add(theme.style['--theme-heading-font']);
    }
  }
  assert.ok(names.size > 8);
  assert.equal(fonts.size, 3);
});

test('occasion themes take precedence over seasonal palettes', () => {
  for (const [month, day, name] of [[0, 1, 'New Year'], [9, 31, 'Halloween'], [10, 26, 'Thanksgiving'], [8, 8, 'Back to school'], [11, 25, 'Christmas']]) {
    assert.equal(getDailyTheme(new Date(2026, month, day)).name, name);
  }
  assert.notEqual(getDailyTheme(new Date(2026, 10, 19)).name, 'Thanksgiving');
  assert.notEqual(getDailyTheme(new Date(2026, 8, 5)).name, 'Back to school');
});
