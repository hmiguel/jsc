import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const root = dirname(fileURLToPath(import.meta.url));
const src  = join(root, 'extension');
const tmp  = join(root, 'dist-extension');
const out  = join(root, 'totoloto-jsc.zip');

// Clean up
try { rmSync(tmp, { recursive: true }); } catch {}
try { rmSync(out); } catch {}
mkdirSync(join(tmp, 'icons'), { recursive: true });

// Copy extension files (exclude dev-only files)
for (const f of ['background.js', 'content.js']) {
  copyFileSync(join(src, f), join(tmp, f));
}
for (const size of [16, 32, 48, 128]) {
  copyFileSync(join(src, 'icons', `icon${size}.png`), join(tmp, 'icons', `icon${size}.png`));
}

// Strip localhost from manifest
const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
manifest.host_permissions       = manifest.host_permissions.filter(p => !p.includes('localhost'));
manifest.content_scripts[0].matches = manifest.content_scripts[0].matches.filter(p => !p.includes('localhost'));
writeFileSync(join(tmp, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Zip
execSync(`powershell Compress-Archive -Path "${tmp}\\*" -DestinationPath "${out}" -Force`);
rmSync(tmp, { recursive: true });

console.log(`Built: totoloto-jsc.zip`);
