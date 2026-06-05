import { readFileSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARCHIVE_PATH = join(__dirname, '../../src/data/totoloto.jsonl');
const URL = 'https://www.jogossantacasa.pt/web/ResultsBoard/totoloto';

async function fetchLatest() {
  const res = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    signal: AbortSignal.timeout(10000),
  });
  const buf  = await res.arrayBuffer();
  const html = new TextDecoder('iso-8859-1').decode(buf);

  const drawMatch    = html.match(/Sorteio:\s*(\d{3}\/\d{4})/);
  const dateMatch    = html.match(/Data do Sorteio\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/);
  const numbersMatch = html.match(/class="colums">\s*<li>([\d\s]+)\+\s*(\d+)\s*<\/li>/);

  if (!drawMatch || !dateMatch || !numbersMatch) {
    throw new Error('Could not parse draw data from JSC page');
  }

  const numbers = numbersMatch[1].trim().split(/\s+/).map(Number).sort((a, b) => a - b);
  const lucky   = parseInt(numbersMatch[2]);
  const date    = dateMatch[3] + '-' + dateMatch[2] + '-' + dateMatch[1];

  return { draw: drawMatch[1], date, numbers, lucky };
}

const lines  = readFileSync(ARCHIVE_PATH, 'utf8').trim().split('\n');
const latest = await fetchLatest();

const alreadyExists = lines.some(l => JSON.parse(l).draw === latest.draw);

if (alreadyExists) {
  console.log(`Draw ${latest.draw} already in archive — nothing to update.`);
  process.exit(0);
}

appendFileSync(ARCHIVE_PATH, '\n' + JSON.stringify(latest));
console.log(`Added draw ${latest.draw} (${latest.date}): ${latest.numbers.join(' ')} + ${latest.lucky}`);