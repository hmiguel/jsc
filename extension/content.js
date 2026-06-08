const PROD_ORIGIN = 'https://totoloto.lixo.dev';

function isAllowed(origin) {
  return origin === PROD_ORIGIN || origin.startsWith('http://localhost');
}

function announceReady(origin) {
  window.postMessage({ type: 'JSC_EXT_READY' }, origin);
}

// Announce immediately (handles: page listener registered before us)
announceReady(PROD_ORIGIN);
announceReady(location.origin);

window.addEventListener('message', async (event) => {
  if (!isAllowed(event.origin)) return;
  if (!chrome?.runtime?.id) return; // extension context invalidated — user must refresh

  if (event.data?.type === 'JSC_EXT_PING') {
    announceReady(event.origin);
    return;
  }

  if (event.data?.type === 'JSC_SET_SESSION') {
    try {
      await chrome.runtime.sendMessage({ type: 'SET_SESSION', sessionId: event.data.sessionId });
      window.postMessage({ type: 'JSC_SET_SESSION_ACK' }, event.origin);
    } catch (e) { console.error('[totoloto-ext]', e); }
    return;
  }
});
