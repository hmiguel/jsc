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
// Totoloto draws on Wednesday (4) and Saturday (7)
function nextDrawWeekDay(): number {
  const todayJS = new Date().getDay(); // 0=Sun..6=Sat
  for (let offset = 0; offset <= 7; offset++) {
    const dayJS = (todayJS + offset) % 7;
    if (dayJS === 3 || dayJS === 6) return dayJS + 1;
  }
  return 7;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context: { request: Request }) {
  let numbers: number[], lucky: number;
  try {
    ({ numbers, lucky } = await context.request.json() as { numbers: number[]; lucky: number });
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  // 1. Get anonymous JSESSIONID
  const initResp = await fetch('https://www.jogossantacasa.pt/web/JogarTotoloto', {
    headers: JSC_HEADERS,
    redirect: 'follow',
  });

  const setCookies: string[] = (initResp.headers as any).getSetCookie?.() ?? [];
  let jsessionid = '';
  for (const c of setCookies) {
    const m = c.match(/JSESSIONID=([^;,\s]+)/);
    if (m) { jsessionid = m[1]; break; }
  }
  // Fallback: parse the combined set-cookie string
  if (!jsessionid) {
    const raw = initResp.headers.get('set-cookie') ?? '';
    const m = raw.match(/JSESSIONID=([^;,\s]+)/);
    if (m) jsessionid = m[1];
  }

  if (!jsessionid) {
    return Response.json({ error: 'Failed to get session from JSC' }, { status: 502, headers: CORS });
  }

  // 2. POST numbers to basket
  const weekDay = String(nextDrawWeekDay());
  const body = new URLSearchParams({
    hidWager1: numbers.join(',') + ',',
    hidNWager: '1',
    hidNLuckyDip: '0',
    hidNumberLucky: String(lucky),
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
  });

  const addResp = await fetch('https://www.jogossantacasa.pt/web/JogarTotoloto/adicCarr', {
    method: 'POST',
    headers: {
      ...JSC_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `JSESSIONID=${jsessionid}`,
      'Referer': 'https://www.jogossantacasa.pt/web/JogarTotoloto',
      'Origin': 'https://www.jogossantacasa.pt',
    },
    body: body.toString(),
    redirect: 'follow',
  });

  return Response.json(
    { jsessionid, ok: addResp.ok, status: addResp.status },
    { headers: CORS },
  );
}
