import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve('dist');
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    files.push(...(entry.isDirectory() ? await walk(path) : [path]));
  }
  return files;
}
const files = await walk(root);
const pages = files.filter(file => extname(file) === '.html');
const failures = [];
let links = 0;
for (const file of pages) {
  const html = await readFile(file, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${file}: missing page title`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(ids).size !== ids.length) failures.push(`${file}: duplicate HTML id`);
  for (const match of html.matchAll(/\s(?:href|src)="([^"#]+)"/g)) {
    const url = match[1].replaceAll('&amp;', '&');
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
    const direct = resolve(root, `.${pathname}`);
    if (!direct.startsWith(root + '/') && direct !== root) { failures.push(`Path escapes dist: ${url}`); continue; }
    links++;
    const candidates = [direct, resolve(direct, 'index.html')];
    let found = false;
    for (const path of candidates) {
      try { if ((await stat(path)).isFile()) { found = true; break; } } catch { /* Try the directory index. */ }
    }
    if (!found) failures.push(`${file.replace(root, '')}: missing ${pathname}`);
  }
  if (/设计样稿|后续迁移时|后续补充最新/.test(html)) failures.push(`${file}: prototype placeholder text`);
}
const home = await readFile(resolve(root, 'index.html'), 'utf8');
const tabCount = [...home.matchAll(/role="tab"/g)].length;
const panelCount = [...home.matchAll(/role="tabpanel"/g)].length;
if (tabCount !== panelCount || tabCount < 2) failures.push(`Tabs (${tabCount}) do not match panels (${panelCount}).`);
const attr = (tag, name) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1];
const tabTags = [...home.matchAll(/<a\b[^>]*role="tab"[^>]*>/g)].map(match => match[0]);
const panelTags = [...home.matchAll(/<section\b[^>]*role="tabpanel"[^>]*>/g)].map(match => match[0]);
const controlled = new Set();
for (const tab of tabTags) {
  const id = attr(tab, 'id');
  const target = attr(tab, 'aria-controls');
  const panel = panelTags.find(tag => attr(tag, 'id') === target);
  if (!panel || attr(panel, 'aria-labelledby') !== id || controlled.has(target)) failures.push(`Invalid tab/panel relationship: ${id}.`);
  controlled.add(target);
}
const selected = tabTags.filter(tag => attr(tag, 'aria-selected') === 'true');
const visible = panelTags.filter(tag => !/\shidden(?:\s|=|>)/.test(tag));
if (selected.length !== 1 || attr(selected[0] || '', 'id') !== 'tile-profile' || visible.length !== 1 || attr(visible[0] || '', 'id') !== 'panel-profile') failures.push('Home must start with only the profile tab and panel selected.');
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
if (!sitemap.includes('https://cannon999.github.io/works/abyss/')) failures.push('Missing project sitemap route.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Verified ${pages.length} HTML pages, ${links} local references, ${tabCount} matching tabs/panels, and sitemap.`);
