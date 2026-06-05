const JSC_URL = 'https://www.jogossantacasa.pt/web/JogarApostar/';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'INJECT_AND_OPEN') return false;

  injectAndOpen(msg.jsessionid)
    .then(() => sendResponse({ ok: true }))
    .catch(e => sendResponse({ ok: false, error: e.message }));

  return true;
});

async function injectAndOpen(jsessionid) {
  await chrome.cookies.set({
    url: 'https://www.jogossantacasa.pt',
    name: 'JSESSIONID',
    value: jsessionid,
    domain: 'www.jogossantacasa.pt',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'no_restriction',
  });
  await chrome.tabs.create({ url: JSC_URL });
}
