const JSC_ORIGIN = 'https://www.jogossantacasa.pt';

const CART_URLS = {
  totoloto:    'https://www.jogossantacasa.pt/web/JogarTotoloto/adicCarr',
  euromilhoes: 'https://www.jogossantacasa.pt/web/JogarEuromilhoes/adicCarr',
  eurodreams:  'https://www.jogossantacasa.pt/web/JogarEuroDreams/adicCarr',
};

const GAME_URLS = {
  totoloto:    'https://www.jogossantacasa.pt/web/JogarTotoloto',
  euromilhoes: 'https://www.jogossantacasa.pt/web/JogarEuromilhoes',
  eurodreams:  'https://www.jogossantacasa.pt/web/JogarEuroDreams',
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

function nextDrawWeekDay(jsDays) {
  const todayJS = new Date().getDay();
  for (let offset = 0; offset <= 7; offset++) {
    const dayJS = (todayJS + offset) % 7;
    if (jsDays.includes(dayJS)) return dayJS + 1;
  }
  return jsDays[0] + 1;
}

async function getSession(providedId) {
  if (providedId) return providedId;
  const res = await fetch(GAME_URLS.totoloto, { headers: HEADERS, redirect: 'follow' });
  const setCookie = res.headers.get('set-cookie') || '';
  const m = setCookie.match(/JSESSIONID=([^;,\s]+)/);
  if (!m) throw new Error('Failed to obtain JSESSIONID from JSC');
  return m[1];
}

function buildTotolotoBodies(bets) {
  const weekDay = String(nextDrawWeekDay([3, 6])); // Wed=3 Sat=6
  const groups = new Map();
  for (const bet of bets) {
    const key = bet.lucky;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(bet);
  }
  return [...groups.entries()].map(([lucky, group]) => {
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
    return params.toString();
  });
}

function buildEuromilhoesBodies(bets) {
  const weekDay = String(nextDrawWeekDay([2, 5])); // Tue=2 Fri=5
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
  parts.push('hidCartItemName=Euromilh%F5es');
  parts.push('hidJokerChecked=1');
  parts.push('hidNContest=1');
  parts.push('hidQuickPick=false');
  parts.push('hidChannel=1');
  parts.push('keyIdAlt=0');
  return [parts.join('&')];
}

function buildEuroDreamsBodies(bets) {
  const weekDay = String(nextDrawWeekDay([1, 4])); // Mon=1 Thu=4
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
  return [parts.join('&')];
}

export async function onRequestPost(context) {
  try {
    const { game, bets, sessionId: providedSession } = await context.request.json();

    if (!game || !Array.isArray(bets) || bets.length === 0) {
      return Response.json({ ok: false, error: 'Invalid request' }, { status: 400 });
    }

    const cartUrl = CART_URLS[game];
    const gameUrl = GAME_URLS[game];
    if (!cartUrl) {
      return Response.json({ ok: false, error: 'Unknown game' }, { status: 400 });
    }

    const sessionId = await getSession(providedSession);

    let bodies;
    if (game === 'totoloto')    bodies = buildTotolotoBodies(bets);
    else if (game === 'euromilhoes') bodies = buildEuromilhoesBodies(bets);
    else                             bodies = buildEuroDreamsBodies(bets);

    for (const body of bodies) {
      await fetch(cartUrl, {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Cookie': `JSESSIONID=${sessionId}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': gameUrl,
          'Origin':  JSC_ORIGIN,
        },
        body,
        redirect: 'follow',
      });
    }

    return Response.json({ ok: true, sessionId });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
