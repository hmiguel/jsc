const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const JSC_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

// Java Calendar: Sun=1 Mon=2 Tue=3 Wed=4 Thu=5 Fri=6 Sat=7
// Euromillions draws on Tuesday (3) and Friday (6)
function nextDrawWeekDay(): number {
  const todayJS = new Date().getDay(); // 0=Sun..6=Sat
  for (let offset = 0; offset <= 7; offset++) {
    const dayJS = (todayJS + offset) % 7;
    if (dayJS === 2 || dayJS === 5) return dayJS + 1;
  }
  return 3;
}

function buildBasketBody(bets: { numbers: number[]; stars: number[] }[], weekDay: string): string {
  const parts: string[] = [];
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
  // JSC expects ISO-8859-1; õ = %F5 in latin-1 (not %C3%B5 in UTF-8)
  parts.push('hidCartItemName=Euromilh%F5es');
  parts.push('hidJokerChecked=1');
  parts.push('hidNContest=1');
  parts.push('hidQuickPick=false');
  parts.push('hidChannel=1');
  parts.push('keyIdAlt=0');
  return parts.join('&');
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context: { request: Request }) {
  let bets: { numbers: number[]; stars: number[] }[];
  try {
    ({ bets } = await context.request.json() as { bets: { numbers: number[]; stars: number[] }[] });
    if (!Array.isArray(bets) || bets.length === 0) throw new Error();
  } catch {
    return Response.json({ error: 'Expected { bets: [{numbers, stars}] }' }, { status: 400, headers: CORS });
  }

  // 1. Get anonymous JSESSIONID from the Euromillions game page
  const initResp = await fetch('https://www.jogossantacasa.pt/web/JogarEuromilhoes', {
    headers: JSC_HEADERS,
    redirect: 'follow',
  });

  const setCookies: string[] = (initResp.headers as any).getSetCookie?.() ?? [];
  let jsessionid = '';
  for (const c of setCookies) {
    const m = c.match(/JSESSIONID=([^;,\s]+)/);
    if (m) { jsessionid = m[1]; break; }
  }
  if (!jsessionid) {
    const raw = initResp.headers.get('set-cookie') ?? '';
    const m = raw.match(/JSESSIONID=([^;,\s]+)/);
    if (m) jsessionid = m[1];
  }
  if (!jsessionid) {
    return Response.json({ error: 'Failed to get session from JSC' }, { status: 502, headers: CORS });
  }

  // 2. POST all bets in a single request
  const weekDay = String(nextDrawWeekDay());
  await fetch('https://www.jogossantacasa.pt/web/JogarEuromilhoes/adicCarr', {
    method: 'POST',
    headers: {
      ...JSC_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie':    `JSESSIONID=${jsessionid}`,
      'Referer':   'https://www.jogossantacasa.pt/web/JogarEuromilhoes',
      'Origin':    'https://www.jogossantacasa.pt',
    },
    body: buildBasketBody(bets, weekDay),
    redirect: 'follow',
  });

  return Response.json({ jsessionid, count: bets.length }, { headers: CORS });
}
