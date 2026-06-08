#!/usr/bin/env node
// Builds jsc-extension.zip for Chrome Web Store upload.
// Strips localhost entries from manifest.json — they're dev-only and
// rejected by the store.

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(ROOT, '.ext-build');
const OUT = path.join(ROOT, 'jsc-extension.zip');

// Clean temp dir
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP);

// Copy files
for (const f of ['background.js', 'content.js']) {
  fs.copyFileSync(path.join(__dirname, f), path.join(TMP, f));
}
fs.cpSync(path.join(__dirname, 'icons'), path.join(TMP, 'icons'), { recursive: true });

// Strip localhost from manifest
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const isLocalhost = (u) => u.startsWith('http://localhost');
manifest.host_permissions = manifest.host_permissions.filter(u => !isLocalhost(u));
for (const cs of manifest.content_scripts ?? []) {
  cs.matches = cs.matches.filter(u => !isLocalhost(u));
}
fs.writeFileSync(path.join(TMP, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Zip
fs.rmSync(OUT, { force: true });
execSync(`powershell -Command "Compress-Archive -Path '${TMP}\\*' -DestinationPath '${OUT}'"`, { stdio: 'inherit' });

// Cleanup
fs.rmSync(TMP, { recursive: true, force: true });

const size = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`Built ${path.relative(ROOT, OUT)} (${size} KB)`);
