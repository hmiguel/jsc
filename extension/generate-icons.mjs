import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const svg   = readFileSync(join(__dir, 'icon.svg'));
const out   = join(__dir, 'icons');

mkdirSync(out, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const buf = await sharp(svg).resize(size, size).png().toBuffer();
  await writeFile(join(out, `icon${size}.png`), buf);
  console.log(`icons/icon${size}.png`);
}
console.log('Done.');
