const JSC_URL           = 'https://www.jogossantacasa.pt/web/JogarApostar/';
const JSC_CART_URL      = 'https://www.jogossantacasa.pt/web/JogarTotoloto/adicCarr';
const JSC_GAME_URL      = 'https://www.jogossantacasa.pt/web/JogarTotoloto';
const JSC_EM_CART_URL   = 'https://www.jogossantacasa.pt/web/JogarEuromilhoes/adicCarr';
const JSC_EM_GAME_URL   = 'https://www.jogossantacasa.pt/web/JogarEuromilhoes';
const JSC_ED_CART_URL   = 'https://www.jogossantacasa.pt/web/JogarEuroDreams/adicCarr';
const JSC_ED_GAME_URL   = 'https://www.jogossantacasa.pt/web/JogarEuroDreams';
const JSC_ORIGIN        = 'https://www.jogossantacasa.pt';
const SESSION_API       = 'https://totoloto.lixo.dev/api/session';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'INJECT_AND_OPEN') {
    placeInCart(msg.bets)
      .then(() => sendResponse({ ok: true }))
      .catch(e => { console.error('[totoloto-ext]', e); sendResponse({ ok: false, error: e.message }); });
    return true;
  }
  if (msg.type === 'EM_INJECT_AND_OPEN') {
    placeEMInCart(msg.bets)
      .then(() => sendResponse({ ok: true }))
      .catch(e => { console.error('[totoloto-ext]', e); sendResponse({ ok: false, error: e.message }); });
    return true;
  }
  if (msg.type === 'ED_INJECT_AND_OPEN') {
    placeEDInCart(msg.bets)
      .then(() => sendResponse({ ok: true }))
      .catch(e => { console.error('[totoloto-ext]', e); sendResponse({ ok: false, error: e.message }); });
    return true;
  }
  return false;
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

// Euromillions draws: Tuesday (3) and Friday (6)
function nextEMDrawWeekDay() {
  const todayJS = new Date().getDay();
  for (let offset = 0; offset <= 7; offset++) {
    const dayJS = (todayJS + offset) % 7;
    if (dayJS === 2 || dayJS === 5) return dayJS + 1;
  }
  return 3;
}

async function placeEMInCart(bets) {
  // 1. Get a fresh anonymous JSESSIONID
  const sessionResp = await fetch(SESSION_API);
  if (!sessionResp.ok) throw new Error(`Session API failed: HTTP ${sessionResp.status}`);
  const { sessionId, error } = await sessionResp.json();
  if (!sessionId) throw new Error(error ?? 'No JSESSIONID returned');

  // 2. Set the session cookie
  const existing = await chrome.cookies.getAll({ url: JSC_ORIGIN, name: 'JSESSIONID' });
  for (const c of existing) {
    const scheme = c.secure ? 'https' : 'http';
    const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
    await chrome.cookies.remove({ url: `${scheme}://${domain}${c.path}`, name: 'JSESSIONID' });
  }
  const activeCookie = { value: sessionId, domain: 'www.jogossantacasa.pt', path: '/', secure: true, httpOnly: true, sameSite: 'no_restriction' };
  await chrome.cookies.set({ url: JSC_ORIGIN, name: 'JSESSIONID', ...activeCookie });

  // 3. POST all bets in a single request (no grouping — each bet has unique stars)
  await isolateSession(activeCookie);

  const weekDay = String(nextEMDrawWeekDay());
  const parts = [];
  bets.forEach((bet, i) => {
    parts.push(`hidNumber${i + 1}=${encodeURIComponent(bet.numbers.join(','))}`);
    parts.push(`hidStar${i + 1}=${encodeURIComponent(bet.stars.join(','))}`);
  });
  parts.push(`hidNWager=${bets.length}`);
  parts.push('hidNLuckyDip=0');
  parts.push(`hidWeekDay=${weekDay}`);
  parts.push(`hidDrawWeekDay=${weekDay}`);
  parts.push('hidJoker=N');
  parts.push('hidNLuckyDipJoker=0');
  parts.push('hidSubGamesIds=');
  parts.push('hidSubGamesNames=');
  parts.push('hidEMSubGamesIds=14');
  parts.push('hidGameId=10');
  // JSC expects ISO-8859-1 encoding; õ = %F5 in latin-1 (not %C3%B5 in UTF-8)
  parts.push('hidCartItemName=Euromilh%F5es');
  parts.push('hidJokerChecked=1');
  parts.push('hidNContest=1');
  parts.push('hidQuickPick=false');
  parts.push('hidChannel=1');
  parts.push('keyIdAlt=0');
  const body = parts.join('&');

  await fetch(JSC_EM_CART_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': JSC_EM_GAME_URL,
      'Origin':  JSC_ORIGIN,
    },
    body,
    redirect: 'follow',
  });

  // 4. Isolate session and open cart
  await isolateSession(activeCookie);
  await chrome.tabs.create({ url: JSC_URL });
}

// EuroDreams draws: Monday (2) and Thursday (5)
function nextEDDrawWeekDay() {
  const todayJS = new Date().getDay();
  for (let offset = 0; offset <= 7; offset++) {
    const dayJS = (todayJS + offset) % 7;
    if (dayJS === 1 || dayJS === 4) return dayJS + 1;
  }
  return 2;
}

async function placeEDInCart(bets) {
  const sessionResp = await fetch(SESSION_API);
  if (!sessionResp.ok) throw new Error(`Session API failed: HTTP ${sessionResp.status}`);
  const { sessionId, error } = await sessionResp.json();
  if (!sessionId) throw new Error(error ?? 'No JSESSIONID returned');

  const existing = await chrome.cookies.getAll({ url: JSC_ORIGIN, name: 'JSESSIONID' });
  for (const c of existing) {
    const scheme = c.secure ? 'https' : 'http';
    const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
    await chrome.cookies.remove({ url: `${scheme}://${domain}${c.path}`, name: 'JSESSIONID' });
  }
  const activeCookie = { value: sessionId, domain: 'www.jogossantacasa.pt', path: '/', secure: true, httpOnly: true, sameSite: 'no_restriction' };
  await chrome.cookies.set({ url: JSC_ORIGIN, name: 'JSESSIONID', ...activeCookie });

  await isolateSession(activeCookie);

  const weekDay = String(nextEDDrawWeekDay());
  const parts = [];
  bets.forEach((bet, i) => {
    parts.push(`hidNumber${i + 1}=${encodeURIComponent(bet.numbers.join(','))}`);
    parts.push(`hidExtra${i + 1}=${bet.dream}`);
  });
  parts.push(`hidNWager=${bets.length}`);
  parts.push('hidNLuckyDip=0');
  parts.push(`hidWeekDay=${weekDay}`);
  parts.push(`hidDrawWeekDay=${weekDay}`);
  parts.push('hidGameId=15');
  parts.push('hidCartItemName=EuroDreams');
  parts.push('hidNContest=1');
  parts.push('hidQuickPick=false');
  parts.push('hidChannel=1');
  parts.push('keyIdAlt=0');
  parts.push('hidType=S');
  const body = parts.join('&');

  await fetch(JSC_ED_CART_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': JSC_ED_GAME_URL,
      'Origin':  JSC_ORIGIN,
    },
    body,
    redirect: 'follow',
  });

  await isolateSession(activeCookie);
  await chrome.tabs.create({ url: JSC_URL });
}
