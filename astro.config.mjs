import { defineConfig } from 'astro/config';
import { writeFileSync, mkdirSync } from 'fs';

const ARCHIVE_URL = 'https://raw.githubusercontent.com/hmiguel/jsc-history/main/totoloto.jsonl';
const ARCHIVE_LOCAL = './src/data/totoloto.jsonl';

const fetchArchive = {
  name: 'fetch-archive',
  hooks: {
    'astro:config:setup': async () => {
      const res = await fetch(ARCHIVE_URL);
      if (!res.ok) throw new Error(`Failed to fetch archive: HTTP ${res.status}`);
      mkdirSync('./src/data', { recursive: true });
      writeFileSync(ARCHIVE_LOCAL, await res.text());
      console.log('[fetch-archive] totoloto.jsonl updated from jsc-history');
    },
  },
};

export default defineConfig({
  site: 'https://totoloto.lixo.dev',
  integrations: [fetchArchive],
});
