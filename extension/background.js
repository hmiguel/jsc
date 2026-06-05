const JSC_URL      = 'https://www.jogossantacasa.pt/web/JogarApostar/';
const JSC_GAME_URL = 'https://www.jogossantacasa.pt/web/JogarTotoloto';
const JSC_CART_URL = 'https://www.jogossantacasa.pt/web/JogarTotoloto/adicCarr';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'INJECT_AND_OPEN') return false;

  placeInCart(msg.bets)
    .then(() => sendResponse({ ok: true }))
    .catch(e => {
      console.error('[totoloto-ext]', e);
      sendResponse({ ok: false, error: e.message });
    });

  return true;
});

async function placeInCart(bets) {
  // 1. Init JSC session — browser stores the JSESSIONID cookie automatically
  //    because credentials:'include' uses the user's own cookie jar
  const initResp = await fetch(JSC_GAME_URL, {
    credentials: 'include',
    headers: HEADERS,
    redirect: 'follow',
  });
  if (!initResp.ok) throw new Error(`JSC init failed: HTTP ${initResp.status}`);

  // 2. POST each bet into the cart
  const weekDay = String(nextDrawWeekDay());
  for (const bet of bets) {
    await fetch(JSC_CART_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': JSC_GAME_URL,
        'Origin': 'https://www.jogossantacasa.pt',
      },
      body: new URLSearchParams({
        hidWager1: bet.numbers.join(',') + ',',
        hidNWager: '1',
        hidNLuckyDip: '0',
        hidNumberLucky: String(bet.lucky),
        hidNumberLuckyDip: '0',
        hidWeekDay: weekDay,
        hidDrawWeekDay: weekDay,
        hidJoker: 'N',
        hidNLuckyDipJoker: '0',
        hidSubGamesIds: '',
        hidSubGamesNames: '',
        hidGameId: '11',
        hidCartItemName: 'Totoloto',
        hidJokerChecked: '1',
        hidNContest: '1',
        hidQuickPick: 'true',
        hidChannel: '1',
        keyIdAlt: '0',
        hidType: 'S',
      }).toString(),
      redirect: 'follow',
    });
  }

  // 3. Open JSC — browser sends the cookie it just stored, cart is pre-filled
  await chrome.tabs.create({ url: JSC_URL });
}

// Java Calendar: Sun=1 Mon=2 Tue=3 Wed=4 Thu=5 Fri=6 Sat=7
// Totoloto draws: Wednesday (4) and Saturday (7)
function nextDrawWeekDay() {
  const todayJS = new Date().getDay();
  for (let offset = 0; offset <= 7; offset++) {
    const dayJS = (todayJS + offset) % 7;
    if (dayJS === 3 || dayJS === 6) return dayJS + 1;
  }
  return 7;
}
