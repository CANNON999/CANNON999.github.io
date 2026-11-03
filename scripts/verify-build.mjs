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
const images = [...home.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
if (images.some(tag => attr(tag, 'loading') !== 'eager' || attr(tag, 'decoding') !== 'async')) failures.push('All home images must be available to the startup decode gate.');
if ([...home.matchAll(/<canvas\b/g)].length !== 1 || !home.includes('id="ambient-canvas"')) failures.push('Startup and profile must share a single particle canvas.');
const head = home.slice(0, home.indexOf('</head>'));
if (!head.includes('cannon-ready-v2') || !head.includes('visibility:hidden')) failures.push('First-paint readiness gate must be in the document head.');
if (!home.includes('id="retry-loading"') || !home.includes('id="skip-intro"')) failures.push('Image failures must provide recovery controls.');
const mainNav = html => /<nav\b[^>]*class="section-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] || '';
const homeNav = mainNav(home);
const collection = await readFile(resolve(root, 'works/index.html'), 'utf8');
if (!homeNav.includes('个人主页') || !homeNav.includes('作品集') || [...homeNav.matchAll(/<a\b/g)].length !== 2) failures.push('Primary navigation must contain exactly the home and portfolio tabs.');
if (!/<a[^>]*aria-current="page"[^>]*>个人主页<\/a>/.test(homeNav) || !/<a[^>]*aria-current="page"[^>]*>作品集<\/a>/.test(mainNav(collection))) failures.push('Primary navigation must indicate the active section.');
const widgets = [...home.matchAll(/data-widget="([^"]+)"/g)].map(match => match[1]);
if (widgets.join(',') !== 'profile,education,tools,projects,internship,interests') failures.push('Welcome must contain exactly the six agreed widgets.');
if (home.includes('class="cover-word"') || [...home.matchAll(/class="cover-name"/g)].length !== tabCount) failures.push('Remove cover captions while preserving the expanded title.');
const embeddedHubs = [...home.matchAll(/data-hub-id="([^"]+)"/g)].map(match => match[1]);
if (embeddedHubs.length !== tabCount - 1 || new Set(embeddedHubs).size !== embeddedHubs.length) failures.push('Every project must have exactly one ready-to-open hub.');
for (const id of embeddedHubs) {
  const detail = await readFile(resolve(root, `works/${id}/index.html`), 'utf8');
  if (!detail.includes(`data-hub-id="${id}"`) || !detail.includes('id="project-story"')) failures.push(`${id}: standalone hub and original project story must exist.`);
  for (const kind of ['document', 'video', 'download']) if (!detail.includes(`data-resource-kind="${kind}"`)) failures.push(`${id}: missing ${kind} resource card.`);
  if (/<a\b[^>]*href="#"/.test(detail)) failures.push(`${id}: placeholders must not be dead links.`);
}
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
if (!sitemap.includes('https://cannon999.github.io/works/abyss/')) failures.push('Missing project sitemap route.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Verified ${pages.length} HTML pages, ${links} local references, ${tabCount} matching tabs/panels, 6 welcome widgets, ${embeddedHubs.length} project hubs, navigation, and sitemap.`);
