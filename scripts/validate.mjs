// Checks plugins.json: every entry by the rules of README.md, and its latest release (the files the app downloads).
import { readFileSync } from 'node:fs';
import { BUILTIN, CATEGORIES, PERMISSIONS, gh, text } from './lib.mjs';

const problems = [];
const bad = (id, what) => problems.push(`«${id}»: ${what}`);
let list;
try {
  list = JSON.parse(readFileSync('plugins.json', 'utf8'));
  if (!Array.isArray(list)) throw new Error('не массив');
} catch (e) {
  console.error(`plugins.json: ${e.message}`);
  process.exit(1);
}
const seen = new Set();
for (const p of list) {
  const id = p?.id ?? '?';
  if (typeof p.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(p.id)) bad(id, 'id — строчные латинские буквы, цифры и «-», до 64');
  if (seen.has(p.id)) bad(id, 'id уже есть в каталоге');
  seen.add(p.id);
  if (BUILTIN.includes(p.id)) bad(id, 'id встроенного плагина');
  for (const k of ['name', 'author', 'description', 'repo']) if (typeof p[k] !== 'string' || !p[k].trim()) bad(id, `нет поля ${k}`);
  if (typeof p.repo === 'string' && !/^[\w.-]+\/[\w.-]+$/.test(p.repo)) bad(id, 'repo — «владелец/репозиторий»');
  if (!Array.isArray(p.categories) || !p.categories.length || p.categories.some((c) => !CATEGORIES.includes(c))) bad(id, `categories — из ${CATEGORIES.join(', ')}`);
  if (p.icon !== undefined && (typeof p.icon !== 'string' || !/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(p.icon))) bad(id, 'icon — путь SVG');
  const extra = Object.keys(p).filter((k) => !['id', 'name', 'author', 'description', 'repo', 'categories', 'icon'].includes(k));
  if (extra.length) bad(id, `лишние поля: ${extra.join(', ')}`);
  if (typeof p.repo !== 'string') continue;

  const repo = await gh(`/repos/${p.repo}`);
  if (!repo) {
    bad(id, `репозиторий ${p.repo} не найден`);
    continue;
  }
  if (repo.private) bad(id, 'репозиторий приватный');
  const rel = await gh(`/repos/${p.repo}/releases/latest`);
  if (!rel) {
    bad(id, 'нет релиза: поставьте тег с версией манифеста (см. README)');
    continue;
  }
  const asset = (n) => rel.assets.find((a) => a.name === n);
  if (!asset('manifest.json') || !asset('main.js')) {
    bad(id, `в релизе ${rel.tag_name} нет manifest.json и main.js`);
    continue;
  }
  let m;
  try {
    m = JSON.parse(await text(asset('manifest.json').browser_download_url));
  } catch (e) {
    bad(id, `manifest.json релиза: ${e.message}`);
    continue;
  }
  if (m.id !== p.id) bad(id, `id манифеста «${m.id}»`);
  if (m.version !== rel.tag_name.replace(/^v/, '')) bad(id, `тег ${rel.tag_name} не равен версии манифеста ${m.version}`);
  if (typeof m.api !== 'string' || !/^(\^|~|>=)?\d+\.\d+(\.\d+)?$/.test(m.api)) bad(id, 'api манифеста — «^1.8»');
  const perms = Array.isArray(m.permissions) ? m.permissions : [];
  for (const x of perms) if (!PERMISSIONS.includes(x)) bad(id, `неизвестное право ${x}`);
  if (perms.includes('net') && (!Array.isArray(m.net) || !m.net.length)) bad(id, 'право net без списка хостов net');
  console.log(`✓ ${p.id} ${m.version} (${p.repo})`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
