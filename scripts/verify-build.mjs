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
const stylePaths = [...home.matchAll(/<link\b[^>]*href="([^\"]+\.css)"[^>]*>/g)].map(match => resolve(root, `.${match[1]}`));
const homeStyles = (await Promise.all(stylePaths.map(path => readFile(path, 'utf8')))).join('\n');
const railSizes = [...homeStyles.matchAll(/--cover-(?:small|large|gap):([^;}]+)/g)].map(match => match[1].trim());
// console.ts passes these values to rail-layout.ts as rems. Reject a unit drift
// that would leave large-screen covers outside their calculated selection slot.
if (railSizes.length < 3 || railSizes.some(size => !/^(?:\d*\.)?\d+rem$/.test(size))) failures.push('Cover dimensions must stay in rem units shared by layout and rail navigation.');
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
if (selected.length !== 1 || attr(selected[0] || '', 'id') !== 'tile-welcome' || visible.length !== 1 || attr(visible[0] || '', 'id') !== 'panel-welcome') failures.push('Home must start with only the welcome tab and panel selected.');
if (tabTags.slice(0, 2).map(tag => attr(tag, 'id')).join(',') !== 'tile-welcome,tile-profile') failures.push('Welcome and profile must remain separate first and second tiles.');
if (attr(tabTags[0], 'aria-label') !== '欢迎你' || attr(tabTags[1], 'aria-label') !== '个人介绍') failures.push('Personal tile labels must identify their separate scenes.');
const landing = /<section\b[^>]*id="panel-welcome"[^>]*>([\s\S]*?)<\/section>/.exec(home)?.[1] || '';
if (!landing.includes('欢迎来到') || !landing.includes('class="landing-name">肖冠荣</strong>') || !landing.includes('的个人主页') || /data-widget|<a\b|<img\b/.test(landing)) failures.push('Welcome must show only the greeting, prominent name and homepage description, without widget/preview cards.');
const images = [...home.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
if (images.some(tag => attr(tag, 'loading') !== 'eager' || attr(tag, 'decoding') !== 'async')) failures.push('All home images must be available to the startup decode gate.');
if ([...home.matchAll(/<canvas\b/g)].length !== 1 || !home.includes('id="ambient-canvas"')) failures.push('Startup, welcome and profile must share a single particle canvas.');
const head = home.slice(0, home.indexOf('</head>'));
if (!head.includes('cannon-ready-v2') || !head.includes('visibility:hidden')) failures.push('First-paint readiness gate must be in the document head.');
if (!home.includes('id="retry-loading"') || !home.includes('id="skip-intro"')) failures.push('Image failures must provide recovery controls.');
const mainNav = html => /<nav\b[^>]*class="section-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] || '';
const homeNav = mainNav(home);
const collection = await readFile(resolve(root, 'works/index.html'), 'utf8');
if (!homeNav.includes('个人主页') || !homeNav.includes('作品集') || [...homeNav.matchAll(/<a\b/g)].length !== 2) failures.push('Primary navigation must contain exactly the home and portfolio tabs.');
if (!/<a[^>]*aria-current="page"[^>]*>个人主页<\/a>/.test(homeNav) || !/<a[^>]*aria-current="page"[^>]*>作品集<\/a>/.test(mainNav(collection))) failures.push('Primary navigation must indicate the active section.');
const widgets = [...home.matchAll(/data-widget="([^"]+)"/g)].map(match => match[1]);
if (widgets.join(',') !== 'profile,education,tools,projects,internship,interests') failures.push('Profile must retain exactly the six agreed widgets.');
if (home.includes('class="cover-word"') || [...home.matchAll(/class="cover-name"/g)].length !== tabCount) failures.push('Remove cover captions while preserving the expanded title.');
const embeddedHubs = [...home.matchAll(/data-hub-id="([^"]+)"/g)].map(match => match[1]);
const projectIds = tabTags.filter(tag => attr(tag, 'data-kind') === 'project').map(tag => attr(tag, 'data-id'));
if (embeddedHubs.join(',') !== projectIds.join(',') || new Set(embeddedHubs).size !== embeddedHubs.length) failures.push('Every project, and no personal scene, must have exactly one ready-to-open hub.');
function checkBackButtons(html, expected) {
  const bars = [...html.matchAll(/<header class="hub-topbar">([\s\S]*?)<\/header>/g)].map(match => match[1]);
  if (bars.length !== expected.length) failures.push('Missing hub navigation.');
  bars.forEach((bar, i) => {
    const back = /<a\b[^>]*class="hub-back"[^>]*>/.exec(bar)?.[0] || '';
    if (attr(back, 'aria-label') !== '返回作品选择' || attr(back, 'href') !== `/#${expected[i]}` || !bar.includes('<svg') || bar.indexOf('class="hub-back"') > bar.indexOf('class="hub-mini-cover"')) failures.push(`${expected[i]}: accessible back arrow must precede the cover and link to the same selected work.`);
    const nav = /<nav\b[^>]*class="hub-navigation"[^>]*>([\s\S]*?)<\/nav>/.exec(bar)?.[1] || '';
    if (nav.includes('返回作品选择') || [...bar.matchAll(/class="hub-back"/g)].length !== 1) failures.push(`${expected[i]}: replace, do not duplicate, the old return link.`);
  });
}
checkBackButtons(home, embeddedHubs);
for (const id of embeddedHubs) {
  const detail = await readFile(resolve(root, `works/${id}/index.html`), 'utf8');
  checkBackButtons(detail, [id]);
  if (!detail.includes(`data-hub-id="${id}"`) || !detail.includes('id="project-story"')) failures.push(`${id}: standalone hub and original project story must exist.`);
  for (const kind of ['document', 'video', 'download']) if (!detail.includes(`data-resource-kind="${kind}"`)) failures.push(`${id}: missing ${kind} resource card.`);
  if (/<a\b[^>]*href="#"/.test(detail)) failures.push(`${id}: placeholders must not be dead links.`);
}
// V1.5 profile: four chapters and a portrait outside the personal reader.
const about = await readFile(resolve(root, 'about/index.html'), 'utf8');
const chapters = ['info','experience','projects','games'];
for (const id of chapters) {
  if (!about.includes(`aria-controls="${id}"`) || !about.includes(`id="${id}" role="tabpanel" aria-labelledby="profile-tab-${id}"`)) failures.push(`Missing linked resume chapter: ${id}`);
}
const fixedTabs = /<nav[^>]*class="profile-tabbar"[^>]*>[\s\S]*?<\/nav>/.exec(about);
if (about.indexOf('</header>') > about.indexOf('<main') || !fixedTabs || fixedTabs.index + fixedTabs[0].length > about.indexOf('<main')) failures.push('Profile header and tabs must remain outside the reading pane.');
if ([...about.matchAll(/role="tab"/g)].length !== 4) failures.push('Profile must have exactly four chapter tabs.');
const personalReader = /<div class="profile-scroll personal-scroll"[^>]*>([\s\S]+?)<\/div>\s*<aside class="portrait-rail"/.exec(about)?.[1];
if (!personalReader || ['education','campus','skills'].some(id => !personalReader.includes(`data-profile-anchor="${id}"`)) || personalReader.includes('class="profile-portrait"')) failures.push('Merged personal chapters must scroll together with the portrait outside their reader.');
for (const file of ['sjtu.webp','insa-lyon.webp']) if (!about.includes(`/images/schools/${file}`)) failures.push(`Missing official school mark: ${file}`);
if (!about.includes('data-profile-content') || !about.includes('class="profile-portrait"') || !about.includes('aria-label="返回个人主页"')) failures.push('Missing profile scroll pane, portrait or back navigation.');
if (images.filter(tag => attr(tag,'src') === '/images/profile/avatar.webp').length !== 3) failures.push('Home must use the supplied avatar in header, personal tile and identity widget.');
if ([...about.matchAll(/class="game-stat-card/g)].length !== 4) failures.push('Game overview must have the total plus three real game cards.');
for (const html of [home, collection, about]) if (!html.slice(0,html.indexOf('</head>')).includes('cannon-page-transition')) failures.push('Page transition controller must register before first paint.');
const toolRows = [...home.matchAll(/<div class="tool-track">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g)].map(match => match[1]);
const toolCatalogue = JSON.parse(await readFile('src/data/tools.json', 'utf8'));
// Keep the standard declaration after the prefixed fallback: the production
// optimizer otherwise may retain only WebKit's version, leaving Chromium sharp.
if (!/\.widget-tools \.widget-heading\{[^}]*[;{]backdrop-filter:blur\(/.test(homeStyles)) failures.push('Tool heading must retain a standard backdrop blur in the production CSS.');
if (toolRows.length !== 3 || !toolCatalogue.length) failures.push('Tool card needs three populated animated rows.');
for (const row of toolRows) {
  const icons = [...row.matchAll(/data-tool="([^"]+)"/g)].map(match => match[1]);
  const half = icons.length / 2;
  if (icons.length !== toolCatalogue.length * 2 || icons.slice(0, half).join(',') !== icons.slice(half).join(',') || new Set(icons).size !== toolCatalogue.length) failures.push('Each tool row must repeat one complete catalogue with identical halves.');
}
for (const tool of toolCatalogue) if (!home.includes(`<li>${tool.name}</li>`) || !images.some(image => attr(image,'src') === tool.image)) failures.push(`Tool needs a loaded local icon and readable name: ${tool.id}`);
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
if (!sitemap.includes('https://cannon999.github.io/works/abyss/')) failures.push('Missing project sitemap route.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Verified ${pages.length} HTML pages, ${links} local references, ${tabCount} matching tabs/panels, separate welcome/profile scenes, 6 profile widgets, ${embeddedHubs.length} project hubs with back arrows, navigation, and sitemap.`);
