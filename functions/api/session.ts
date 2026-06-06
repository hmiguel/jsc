export const onRequest: PagesFunction = async () => {
  const resp = await fetch('https://www.jogossantacasa.pt/web/JogarTotoloto', {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });

  const setCookie = resp.headers.get('set-cookie') ?? '';
  const match     = setCookie.match(/JSESSIONID=([^;,\s]+)/);
  const sessionId = match?.[1];

  if (!sessionId) {
    return Response.json({ error: 'No JSESSIONID from JSC' }, { status: 502 });
  }

  return Response.json({ sessionId }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
