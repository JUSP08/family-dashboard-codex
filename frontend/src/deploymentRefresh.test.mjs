import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeploymentCheck, hasOpenEditor, installDeploymentRefresh } from './deploymentRefresh.js';

test('reloads once for a changed build, never for same or malformed build', async () => {
  let version = { buildId: 'old' };
  let reloads = 0;
  const check = createDeploymentCheck({ buildId: 'old', fetchVersion: async () => version, isBlocked: () => false, reload: () => reloads++ });
  for (version of [{ buildId: 'old' }, {}, null, { buildId: '' }]) await check();
  assert.equal(reloads, 0);
  version = { buildId: 'new' };
  await check(); await check();
  assert.equal(reloads, 1);
});

test('waits for editors to close and retries server outages', async () => {
  let blocked = true;
  let offline = true;
  let reloads = 0;
  const check = createDeploymentCheck({ buildId: 'old', fetchVersion: async () => {
    if (offline) throw new Error('Restarting');
    return { buildId: 'new' };
  }, isBlocked: () => blocked, reload: () => reloads++ });
  await check(); offline = false;
  await check(); assert.equal(reloads, 0);
  blocked = false;
  await check(); assert.equal(reloads, 1);
});

test('does not overlap version requests', async () => {
  let finish;
  let calls = 0;
  const check = createDeploymentCheck({ buildId: 'old', fetchVersion: () => {
    calls++;
    return new Promise(resolve => { finish = resolve; });
  }, isBlocked: () => false, reload: () => {} });
  const first = check(); await check();
  assert.equal(calls, 1);
  finish({ buildId: 'old' }); await first;
});

test('blocks dialog, form, settings, and focused input; permits idle dashboard', () => {
  for (const selector of ['[role="dialog"]', 'dialog[open]', 'form', 'main[data-view="settings"]']) {
    assert.equal(hasOpenEditor({ querySelector: all => all.includes(selector), activeElement: null }), true);
  }
  assert.equal(hasOpenEditor({ querySelector: () => null, activeElement: { matches: () => true } }), true);
  assert.equal(hasOpenEditor({ querySelector: () => null, activeElement: null }), false);
});

test('tracks pending/failed writes, resumes after successful retry, preserves fetch responses', async (t) => {
  let now = 0;
  t.mock.method(Date, 'now', () => now);
  let check;
  let resolveWrite;
  let reloads = 0;
  const originalFetch = async (url) => url.startsWith('/version.json')
    ? { ok: true, json: async () => ({ buildId: 'new' }) }
    : new Promise(resolve => { resolveWrite = resolve; });
  const win = {
    fetch: originalFetch, location: { href: 'http://localhost/', origin: 'http://localhost', reload: () => reloads++ },
    setInterval: (callback, interval) => {
      assert.equal(interval, 60 * 60 * 1000);
      check = callback; return 1;
    }, clearInterval() {}, addEventListener() {}, removeEventListener() {},
  };
  const doc = { querySelector: () => null, activeElement: null, addEventListener() {}, removeEventListener() {} };
  const cleanup = installDeploymentRefresh(win, doc, 'old');
  await check(); assert.equal(reloads, 0);
  now = 6000;
  const request = win.fetch('/api/state', { method: 'PUT' });
  await check(); assert.equal(reloads, 0);
  const failure = { ok: false };
  resolveWrite(failure); assert.equal(await request, failure);
  now += 6000;
  await check(); assert.equal(reloads, 0);
  const retry = win.fetch('/api/state', { method: 'PUT' });
  const success = { ok: true };
  resolveWrite(success); assert.equal(await retry, success);
  await check(); assert.equal(reloads, 0);
  const sparkle = win.fetch('/api/sparkle', { method: 'POST' });
  resolveWrite({ ok: false }); await sparkle;
  now += 6000;
  await check(); assert.equal(reloads, 1);
  cleanup(); assert.equal(win.fetch, originalFetch);
});
