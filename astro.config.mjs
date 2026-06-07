import { defineConfig } from 'astro/config';
import { writeFileSync, mkdirSync } from 'fs';

const ARCHIVES = [
  { url: 'https://raw.githubusercontent.com/hmiguel/jsc-history/main/totoloto.jsonl',    local: './src/data/totoloto.jsonl' },
  { url: 'https://raw.githubusercontent.com/hmiguel/jsc-history/main/euromillions.jsonl', local: './src/data/euromillions.jsonl' },
  { url: 'https://raw.githubusercontent.com/hmiguel/jsc-history/main/eurodreams.jsonl',  local: './src/data/eurodreams.jsonl' },
];

const fetchArchive = {
  name: 'fetch-archive',
  hooks: {
    'astro:config:setup': async () => {
      mkdirSync('./src/data', { recursive: true });
      await Promise.all(ARCHIVES.map(async ({ url, local }) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
        writeFileSync(local, await res.text());
        console.log(`[fetch-archive] ${local.split('/').pop()} updated from jsc-history`);
      }));
    },
  },
};

export default defineConfig({
  site: 'https://totoloto.lixo.dev',
  integrations: [fetchArchive],
});
