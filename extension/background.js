const JSC_ORIGIN = 'https://www.jogossantacasa.pt';

async function setupSession(sessionId) {
  const existing = await chrome.cookies.getAll({ url: JSC_ORIGIN, name: 'JSESSIONID' });
  for (const c of existing) {
    const scheme = c.secure ? 'https' : 'http';
    const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
    await chrome.cookies.remove({ url: `${scheme}://${domain}${c.path}`, name: 'JSESSIONID' });
  }
  await chrome.cookies.set({
    url: JSC_ORIGIN,
    name: 'JSESSIONID',
    value: sessionId,
    domain: 'www.jogossantacasa.pt',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'no_restriction',
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SET_SESSION') {
    setupSession(msg.sessionId)
      .then(() => sendResponse({ ok: true }))
      .catch(e => { console.error('[totoloto-ext]', e); sendResponse({ ok: false, error: e.message }); });
    return true;
  }
  return false;
});
