export function hasOpenEditor(doc) {
  return Boolean(doc.querySelector('[role="dialog"], dialog[open], form, main[data-view="settings"]') ||
    doc.activeElement?.matches('input, textarea, select, [contenteditable="true"]'));
}

// Compare against the loaded bundle, not the first poll (which may follow a deployment).
export function createDeploymentCheck({ buildId, fetchVersion, isBlocked, reload }) {
  let checking = false;
  let reloading = false;
  return async () => {
    if (checking || reloading) return;
    checking = true;
    try {
      const version = await fetchVersion();
      if (typeof version?.buildId !== 'string' || !version.buildId || version.buildId === buildId) return;
      if (isBlocked()) return;
      reloading = true;
      reload();
    } catch {
      // Offline, restarting, or partially built: keep the current screen and retry.
    } finally {
      checking = false;
    }
  };
}

export function installDeploymentRefresh(win, doc, buildId) {
  const originalFetch = win.fetch;
  let pendingWrites = 0;
  const failedWrites = new Set();
  let lastInteraction = Date.now();
  const touch = () => { lastInteraction = Date.now(); };
  const trackedFetch = async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, win.location.href);
    const method = (init?.method || input?.method || 'GET').toUpperCase();
    const write = url.origin === win.location.origin && url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const savesState = write && url.pathname === '/api/state';
    const key = `${method} ${url.pathname}`;
    if (write) pendingWrites++;
    try {
      const response = await originalFetch.call(win, input, init);
      if (savesState) {
        if (response.ok) failedWrites.delete(key);
        else failedWrites.add(key);
      }
      return response;
    } catch (error) {
      if (savesState) failedWrites.add(key);
      throw error;
    } finally {
      if (write) { pendingWrites--; touch(); }
    }
  };
  win.fetch = trackedFetch;
  const check = createDeploymentCheck({
    buildId,
    fetchVersion: async () => {
      const response = await originalFetch.call(win, `/version.json?t=${Date.now()}`, {
        cache: 'no-store', signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Build unavailable');
      return response.json();
    },
    isBlocked: () => pendingWrites > 0 || failedWrites.size > 0 ||
      Date.now() - lastInteraction < 5000 || hasOpenEditor(doc),
    reload: () => win.location.reload(),
  });
  for (const event of ['pointerdown', 'keydown', 'input']) doc.addEventListener(event, touch, true);
  const timer = win.setInterval(check, 15000);
  win.addEventListener('online', check);
  return () => {
    win.clearInterval(timer);
    win.removeEventListener('online', check);
    for (const event of ['pointerdown', 'keydown', 'input']) doc.removeEventListener(event, touch, true);
    if (win.fetch === trackedFetch) win.fetch = originalFetch;
  };
}
