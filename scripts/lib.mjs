// What the catalog's scripts share: the GitHub API (a token from the workflow), the rules of an entry.
export const BUILTIN = ['calendar', 'hello', 'inbox', 'kanban', 'quarter-goals', 'theme-pack'];
export const CATEGORIES = ['planning', 'view', 'integrations', 'export', 'themes'];
export const PERMISSIONS = ['index.read', 'files.read', 'files.edit', 'clipboard', 'net'];

export async function gh(path) {
  const r = await fetch('https://api.github.com' + path, {
    headers: { accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}
export async function text(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.text();
}
