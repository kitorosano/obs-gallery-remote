import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..');
const publicRoot = path.join(root, 'public');
const serviceWorker = await fs.readFile(path.join(publicRoot, 'service-worker.js'), 'utf8');
const assetMatches = serviceWorker.matchAll(/^\s*'([^']+)',?$/gm);
const missing = [];

for (const [, asset] of assetMatches) {
  const relativeAsset = asset === '/' ? 'index.html' : asset.replace(/^\//, '');
  try {
    await fs.access(path.join(publicRoot, relativeAsset));
  } catch {
    missing.push(asset);
  }
}

if (missing.length) {
  throw new Error(`Assets inexistentes en APP_SHELL: ${missing.join(', ')}`);
}

console.log('APP_SHELL referencia únicamente assets existentes.');
