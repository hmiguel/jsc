const API_URL = 'https://totoloto.lixo.dev/api/basket';
const JSC_BASKET_URL = 'https://www.jogossantacasa.pt/web/Carrinho';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'ADD_TO_BASKET') return false;

  addToBasket(msg.numbers, msg.lucky)
    .then(result => sendResponse({ ok: true, ...result }))
    .catch(err => sendResponse({ ok: false, error: err.message }));

  return true; // keep channel open for async response
});

async function addToBasket(numbers, lucky) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numbers, lucky }),
  });

  const data = await resp.json();
  if (!resp.ok || !data.jsessionid) {
    throw new Error(data.error ?? `HTTP ${resp.status}`);
  }

  await chrome.cookies.set({
    url: 'https://www.jogossantacasa.pt',
    name: 'JSESSIONID',
    value: data.jsessionid,
    domain: 'www.jogossantacasa.pt',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'no_restriction',
  });

  await chrome.tabs.create({ url: JSC_BASKET_URL });

  return { jsessionid: data.jsessionid };
}
