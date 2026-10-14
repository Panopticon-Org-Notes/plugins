// stats.json: downloads of main.js over every release of each plugin, the day of its latest release.
import { readFileSync, writeFileSync } from 'node:fs';
import { gh } from './lib.mjs';

const list = JSON.parse(readFileSync('plugins.json', 'utf8'));
const out = {};
for (const p of list) {
  const rels = (await gh(`/repos/${p.repo}/releases?per_page=100`)) ?? [];
  const downloads = rels.flatMap((r) => r.assets).filter((a) => a.name === 'main.js').reduce((n, a) => n + a.download_count, 0);
  const last = rels.filter((r) => !r.draft && !r.prerelease).map((r) => r.published_at).sort().pop();
  out[p.id] = { downloads, ...(last ? { updated: last.slice(0, 10) } : {}) };
}
writeFileSync('stats.json', JSON.stringify(out, null, 2) + '\n');
console.log(out);
