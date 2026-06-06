const JSC_URL        = 'https://www.jogossantacasa.pt/web/JogarApostar/';
const JSC_CART_URL   = 'https://www.jogossantacasa.pt/web/JogarTotoloto/adicCarr';
const JSC_GAME_URL   = 'https://www.jogossantacasa.pt/web/JogarTotoloto';
const JSC_ORIGIN     = 'https://www.jogossantacasa.pt';
const SESSION_API    = 'https://totoloto.lixo.dev/api/session';

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
  // 1. Get a fresh anonymous JSESSIONID from our Pages Function
  const sessionResp = await fetch(SESSION_API);
  if (!sessionResp.ok) throw new Error(`Session API failed: HTTP ${sessionResp.status}`);
  const { sessionId, error } = await sessionResp.json();
  if (!sessionId) throw new Error(error ?? 'No JSESSIONID returned');

  // 2. Clear any existing JSC session cookies and set the fresh one
  const existing = await chrome.cookies.getAll({ url: JSC_ORIGIN, name: 'JSESSIONID' });
  for (const c of existing) {
    const scheme = c.secure ? 'https' : 'http';
    const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
    await chrome.cookies.remove({ url: `${scheme}://${domain}${c.path}`, name: 'JSESSIONID' });
  }
  const activeCookie = { value: sessionId, domain: 'www.jogossantacasa.pt', path: '/', secure: true, httpOnly: true, sameSite: 'no_restriction' };
  await chrome.cookies.set({ url: JSC_ORIGIN, name: 'JSESSIONID', ...activeCookie });

  // 4. POST each lucky-number group, isolating to the active session before each request
  const weekDay = String(nextDrawWeekDay());
  const groups = Map.groupBy(bets, b => b.lucky);
  for (const [lucky, group] of groups) {
    await isolateSession(activeCookie);

    const params = new URLSearchParams();
    group.forEach((bet, i) => params.append(`hidWager${i + 1}`, bet.numbers.join(',') + ','));
    params.append('hidNWager',         String(group.length));
    params.append('hidNLuckyDip',      '0');
    params.append('hidNumberLucky',    String(lucky));
    params.append('hidNumberLuckyDip', '0');
    params.append('hidWeekDay',        weekDay);
    params.append('hidDrawWeekDay',    weekDay);
    params.append('hidJoker',          'N');
    params.append('hidNLuckyDipJoker', '0');
    params.append('hidSubGamesIds',    '');
    params.append('hidSubGamesNames',  '');
    params.append('hidGameId',         '11');
    params.append('hidCartItemName',   'Totoloto');
    params.append('hidJokerChecked',   '1');
    params.append('hidNContest',       '1');
    params.append('hidQuickPick',      'true');
    params.append('hidChannel',        '1');
    params.append('keyIdAlt',          '0');
    params.append('hidType',           'S');

    await fetch(JSC_CART_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': JSC_GAME_URL,
        'Origin': JSC_ORIGIN,
      },
      body: params.toString(),
      redirect: 'follow',
    });
  }

  // 5. Isolate session one last time so the opened tab lands on the right cart
  await isolateSession(activeCookie);
  await chrome.tabs.create({ url: JSC_URL });
}

// Removes all JSESSIONID cookies except the active one, then restores it.
// This ensures JSC receives exactly one session cookie and uses the right cart.
async function isolateSession(activeCookie) {
  const all = await chrome.cookies.getAll({ url: JSC_ORIGIN, name: 'JSESSIONID' });
  for (const c of all) {
    if (c.value !== activeCookie.value) {
      const scheme = c.secure ? 'https' : 'http';
      const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
      await chrome.cookies.remove({ url: `${scheme}://${domain}${c.path}`, name: 'JSESSIONID' });
    }
  }
  await chrome.cookies.set({
    url: JSC_ORIGIN,
    name: 'JSESSIONID',
    value: activeCookie.value,
    domain: activeCookie.domain,
    path: activeCookie.path,
    secure: activeCookie.secure,
    httpOnly: activeCookie.httpOnly,
    sameSite: activeCookie.sameSite,
  });
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
