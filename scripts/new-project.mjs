import { writeFile, mkdir } from 'node:fs/promises';

const [slug, title = '新作品'] = process.argv.slice(2);
if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error('用法：pnpm new:project my-project "作品标题"\n名称使用小写英文字母、数字与连字符。');
  process.exit(1);
}
const path = `src/content/projects/${slug}.md`;
const front = {
  title, english: 'A NEW WORLD', short: 'PROJECT', category: 'level', order: 110,
  draft: true, color: '#b6c9ec',
  summary: '在这里填写作品简介。', tagline: '在这里填写一句话介绍。',
  role: '填写你实际负责的内容', tools: ['Unreal Engine'], tags: ['关卡设计'],
  resources: [], legacy: [],
};
await mkdir('src/content/projects', { recursive: true });
try {
  await writeFile(path, `---\n${Object.entries(front).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n## 项目简介\n\n描述项目的目标和背景。\n\n## 我的贡献\n\n介绍你的设计决策与实际完成的工作。\n\n## 作品展示\n\n将图片放到 public/images/，使用 ![图片说明](/images/文件名.webp) 引用。\n`, { flag: 'wx' });
  console.log(`已创建草稿：${path}\n添加封面和真实内容，确认无误后将 draft 改为 false 即可展示。`);
} catch (error) {
  if (error.code === 'EEXIST') { console.error(`文件已存在，未覆盖：${path}`); process.exit(1); }
  throw error;
}
