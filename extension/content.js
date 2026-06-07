const PROD_ORIGIN = 'https://totoloto.lixo.dev';

function isAllowed(origin) {
  return origin === PROD_ORIGIN || origin.startsWith('http://localhost');
}

function announceReady(origin) {
  window.postMessage({ type: 'JSC_EXT_READY' }, origin);
}

// Announce immediately (handles: page listener registered before us)
announceReady(PROD_ORIGIN);
announceReady(location.origin); // also target whatever origin this page is on

window.addEventListener('message', async (event) => {
  if (!isAllowed(event.origin)) return;

  // Respond to ping (handles: we loaded before page listener was registered)
  if (event.data?.type === 'JSC_EXT_PING') {
    announceReady(event.origin);
    return;
  }

  if (event.data?.type === 'JSC_CHECKOUT') {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'INJECT_AND_OPEN', bets: event.data.bets });
      if (resp?.ok) window.postMessage({ type: 'JSC_CHECKOUT_ACK' }, event.origin);
    } catch (e) { console.error('[totoloto-ext]', e); }
    return;
  }

  if (event.data?.type === 'JSC_EM_CHECKOUT') {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'EM_INJECT_AND_OPEN', bets: event.data.bets });
      if (resp?.ok) window.postMessage({ type: 'JSC_EM_CHECKOUT_ACK' }, event.origin);
    } catch (e) { console.error('[totoloto-ext]', e); }
    return;
  }
});
