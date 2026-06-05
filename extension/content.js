const ORIGIN = 'https://totoloto.lixo.dev';

window.addEventListener('message', async (event) => {
  if (event.origin !== ORIGIN) return;
  if (event.data?.type !== 'JSC_CHECKOUT') return;

  try {
    const resp = await chrome.runtime.sendMessage({
      type: 'INJECT_AND_OPEN',
      jsessionid: event.data.jsessionid,
    });
    if (resp?.ok) {
      window.postMessage({ type: 'JSC_CHECKOUT_ACK' }, ORIGIN);
    }
  } catch (e) {
    console.error('[totoloto-ext]', e);
  }
});
