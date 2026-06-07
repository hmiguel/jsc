const PROD_ORIGIN   = 'https://totoloto.lixo.dev';
const SESSION_KEY   = 'jsc-ext-session';
const SESSION_TTL   = 4 * 60 * 1000;

function isAllowed(origin) {
  return origin === PROD_ORIGIN || origin.startsWith('http://localhost');
}

function announceReady(origin) {
  window.postMessage({ type: 'JSC_EXT_READY' }, origin);
}

function getCachedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { id, ts } = JSON.parse(raw);
    if (Date.now() - ts < SESSION_TTL) return id;
    localStorage.removeItem(SESSION_KEY);
    return null;
  } catch (e) { return null; }
}

function cacheSession(id) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ id, ts: Date.now() })); } catch (e) {}
}

// Announce immediately (handles: page listener registered before us)
announceReady(PROD_ORIGIN);
announceReady(location.origin);

window.addEventListener('message', async (event) => {
  if (!isAllowed(event.origin)) return;
  if (!chrome?.runtime?.id) return; // extension context invalidated after reload — user must refresh page

  if (event.data?.type === 'JSC_EXT_PING') {
    announceReady(event.origin);
    return;
  }

  if (event.data?.type === 'JSC_CHECKOUT') {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'INJECT_AND_OPEN', bets: event.data.bets, sessionId: getCachedSession() });
      if (resp?.ok) {
        if (resp.sessionId) cacheSession(resp.sessionId);
        window.postMessage({ type: 'JSC_CHECKOUT_ACK' }, event.origin);
      }
    } catch (e) { console.error('[totoloto-ext]', e); }
    return;
  }

  if (event.data?.type === 'JSC_EM_CHECKOUT') {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'EM_INJECT_AND_OPEN', bets: event.data.bets, sessionId: getCachedSession() });
      if (resp?.ok) {
        if (resp.sessionId) cacheSession(resp.sessionId);
        window.postMessage({ type: 'JSC_EM_CHECKOUT_ACK' }, event.origin);
      }
    } catch (e) { console.error('[totoloto-ext]', e); }
    return;
  }

  if (event.data?.type === 'JSC_ED_CHECKOUT') {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'ED_INJECT_AND_OPEN', bets: event.data.bets, sessionId: getCachedSession() });
      if (resp?.ok) {
        if (resp.sessionId) cacheSession(resp.sessionId);
        window.postMessage({ type: 'JSC_ED_CHECKOUT_ACK' }, event.origin);
      }
    } catch (e) { console.error('[totoloto-ext]', e); }
    return;
  }
});
