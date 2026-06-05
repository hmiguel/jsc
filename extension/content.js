const ORIGIN = 'https://totoloto.lixo.dev';

function announceReady() {
  window.postMessage({ type: 'JSC_EXT_READY' }, ORIGIN);
}

// Announce immediately (handles: page listener registered before us)
announceReady();

window.addEventListener('message', async (event) => {
  if (event.origin !== ORIGIN) return;

  // Respond to ping (handles: we loaded before page listener was registered)
  if (event.data?.type === 'JSC_EXT_PING') {
    announceReady();
    return;
  }

  if (event.data?.type !== 'JSC_CHECKOUT') return;

  try {
    const resp = await chrome.runtime.sendMessage({
      type: 'INJECT_AND_OPEN',
      bets: event.data.bets,
    });
    if (resp?.ok) {
      window.postMessage({ type: 'JSC_CHECKOUT_ACK' }, ORIGIN);
    }
  } catch (e) {
    console.error('[totoloto-ext]', e);
  }
});
