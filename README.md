# CANNON · 个人创作空间

基于第三版主机界面设计开发的静态个人主页。Astro 7 + TypeScript + Markdown，发布目标为 GitHub Pages：<https://cannon999.github.io/>。

网页运行不需要常驻服务器、数据库或付费 API。Node.js 只用于开发与构建，访客访问的是构建后的 HTML、CSS、JavaScript 和图片。

## 先看效果

本机已安装构建依赖。双击本目录中的 `预览网站.command`，然后在浏览器访问 <http://127.0.0.1:4321/>。这是编译结果的本地预览，终端中按 Control+C 关闭。

开发时运行：

```sh
./scripts/dev.sh
```

脚本会优先使用已安装的 Node；在这台电脑上也支持现有的桌面应用 Node 运行时。修改内容后，开发预览会自动更新。非交互终端中 Astro 可能启动后台服务，可运行 `pnpm exec astro dev stop` 结束。

## 在新电脑上开发

安装 Node.js 24 LTS 与 pnpm 11.25.0，然后在本目录运行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

验证并生成发布文件：

```sh
pnpm verify
```

验证包含内容字段与类型检查、静态构建、站内链接和图片存在性检查。构建结果在 `dist/`，可以整体交给任何普通静态托管平台。

## 需求、设计、日志与测试

- [需求记录](docs/requirements.md)：逐条保留用户要求、修改、撤销和验收条件。
- [当前设计细则](docs/design-spec.md)：当前版本的页面、视觉、交互、动效、响应式和发布标准。
- [开发日志](docs/development-log.md)：需求处理、诊断、每项修改、验证和发布过程。
- [测试用例](docs/test-cases.md)：自动测试、浏览器回归和每次新增功能的测试规则。
- [V1.5.0 测试报告](docs/test-results/2026-11-04-v1.5.0.md)：导航对齐、四章档案、固定照片与 14 工具图标墙。
- [工具与学校图标来源](docs/icon-sources.md)：官方资源、许可记录和本地处理。
- [V1.4.1 测试报告](docs/test-results/2026-11-04-v1.4.1.md)：个人介绍与作品背景回切闪烁修复。
- [V1.4.0 测试报告](docs/test-results/2026-11-04-v1.4.0.md)：个人档案、头像照片、滚轮上限、封面选择与全站转场。
- [PS5 转场调研](docs/ps5-transition-reference.md)：实机录像、时间点、观察和实现参数。
- [V1.3.1 测试报告](docs/test-results/2026-11-03-v1.3.1.md)：Mac 基准统一缩放、大屏/4K 布局、作品主标题粗体。
- [V1.3.0 测试报告](docs/test-results/2026-11-03-v1.3.0.md)：独立欢迎入口、圆形返回按钮、至少一秒开场。
- [V1.2.0 测试报告](docs/test-results/2026-11-03-v1.2.0.md)：六组件、双导航、作品 Hub 与连续转场的实际验证。
- [V1.1.0 测试报告](docs/test-results/2026-11-03-v1.1.0.md)：粒子背景、首次加载和相关回归的实际结果与边界。
- [V1.0.1 测试报告](docs/test-results/2026-10-30-v1.0.1.md)：此前触控板修复与用户验收记录。

每次新功能或修复都维护上述记录并补对应测试。`pnpm test` 运行输入和内容脚本回归；`pnpm verify` 会先运行测试再检查、构建与校验资源。GitHub 自动发布也运行同一套验证，失败时不会部署。

## 日常修改位置

个人档案资料（四个标签、个人信息包含教育/在校/技能）及游戏时长在 `src/data/resume.json`；头像/照片路径在 `src/data/profile.json`，图片在 `public/images/profile/`。游戏卡片封面在 `public/images/games/`，校标在 `public/images/schools/`。更新记录时同步简历版本日期，不把原始简历 PDF 或私人联系方式直接放进 public。


| 想修改什么 | 修改位置 |
| --- | --- |
| 姓名、邮箱、简介与首页摘要 | `src/data/profile.json` |
| 单个作品的标题、简介、资源链接与正文 | `src/content/projects/对应作品.md` |
| 作品封面和正文图片 | `public/images/` |
| 独立欢迎页面与文字样式 | `src/pages/index.astro`、`src/styles/landing.css`（姓名读取 profile.json） |
| 个人介绍六组件内容与样式 | `src/components/WelcomeWidgets.astro`、`src/styles/welcome.css`（资料读取 profile.json） |
| 主导航和右侧个人入口 | `src/components/Header.astro`、`src/styles/navigation.css` |
| 作品 Hub、资源分组和转场 | `src/components/ProjectHub.astro`、`src/lib/project-hub.ts`、`src/scripts/project-hub.ts`、`src/styles/project-hub.css` |
| 大屏比例与基础尺寸 | `src/styles/display-scale.css`；UI 尺寸使用 rem，Mac 基准 1rem=16px |
| 主机界面布局与响应式样式 | `src/styles/console.css`；封面定位在 `src/scripts/rail-layout.ts` |
| 作品列表、详情样式 | `src/styles/global.css` |
| 个人档案四标签、固定照片和教育校标 | `src/pages/about.astro`、`src/styles/profile.css`、`src/data/resume.json`、`src/scripts/profile-tabs.ts` |
| 创作工具图标、顺序和动效 | `src/data/tools.json`、`src/components/ToolMarquee.astro`、`src/styles/tool-marquee.css` |
| 滚轮、键盘、开场、动效偏好 | `src/scripts/console.ts` |
| 作品与粒子背景切换 | `src/scripts/scene-background.ts` |
| 粒子构图、运动、分辨率与性能策略 | `src/scripts/particle-field.ts`、`src/scripts/particles.ts` |
| 粒子背景光照与加载界面样式 | `src/styles/particles.css` |
| 首次访问判断、图片等待和异常恢复 | `src/scripts/entry-gate.ts`、`src/scripts/image-readiness.ts`、`src/scripts/console.ts` |
| 内容字段校验 | `src/content.config.ts` |
| GitHub Pages 自动构建与发布 | `.github/workflows/pages.yml` |

## 添加创作工具图标

在 `public/images/tools/` 放官方来源的 SVG 或优化 WebP，在 `src/data/tools.json` 添加唯一 `id`、显示 `name`、本地 `image` 与官网 `url`。三个循环行、读屏列表和首页加载清单会自动更新；不必修改组件。同步 `docs/icon-sources.md` 来源记录，然后运行 `pnpm verify` 并查看工具卡，确认完整图标、标题模糊及无缝循环。不要引入外站热链或脚本型 SVG。

## 添加新作品

```sh
pnpm new:project my-new-level "我的新关卡"
```

会生成 `src/content/projects/my-new-level.md`，且默认 `draft: true`，不会出现在公开页面。已有同名文件时会停止，避免覆盖。

1. 把封面放入 `public/images/`，优先使用 WebP，建议宽度 1600–1920 像素。已有首版图片不依赖第三方图床。
2. 编辑作品文件，补齐真实信息，并添加 `cover: "/images/my-new-level.webp"`。
3. 在 `---` 下面写 Markdown 正文，添加过程图、设计思考与个人贡献。
4. 预览确认后，把 `draft` 改为 `false`，运行 `pnpm verify`。
5. 提交到 GitHub。首次发布配置完成后，合并到 `master` 会自动更新主页。

关键字段：

```yaml
title: "我的新关卡"
english: "A NEW WORLD"
short: "NEW WORLD"
category: "level"
order: 15
draft: false
year: "2026"
color: "#b6c9ec"
cover: "/images/my-new-level.webp"
summary: "一句话介绍你的项目。\n也可以分成两三行。"
tagline: "一个清楚的设计主题。"
role: "关卡设计与白盒制作"
tools: ["Unreal Engine", "Blender"]
tags: ["关卡设计", "第三人称"]
resources:
  - label: "观看项目演示"
    url: "https://你的实际视频地址"
    kind: "video"
legacy: []
```

- `category`：`level`（关卡）、`game`（开发）、`art`（美术）、`notes`（拆解）。
- `order`：数字越小越靠前，可以用 15 将项目插入 10 与 20 之间。
- `year`：可省略，不确定的时间不必填写。
- `resources`：支持 `document`、`video`、`download`、`source`。网盘资源可增加 `code` 提取码；链接使用 HTTPS。
- `legacy`：旧网页路径，自动生成通往该作品的新入口。
- 文件名会成为作品地址，如 `/works/my-new-level/`；发布后尽量保持文件名稳定。
- 正文图片写法：`![图片说明](/images/my-new-level.webp)`。

新增内容会自动出现在主页横向栏、作品集、首页展开 Hub、独立详情页和 sitemap 中，无需修改页面代码。未发布的草稿不会生成详情页。

## 发布到 GitHub Pages

发布仓库是 `CANNON999/CANNON999.github.io`，发布分支是 `master`，公开地址是 <https://cannon999.github.io/>。

本项目默认交付流程：完成开发 → `pnpm verify` → 提交并推送 → 等待 Actions 构建与部署成功 → 检查公开页面。用户已授权常规开发完成后直接发布，无需逐次确认，协作约定见 `AGENTS.md`。只有部署成功且线上检查通过，才能报告“已上线”。

首次配置或迁移电脑时：

1. 使用 GitHub CLI 的浏览器登录完成仓库写入授权，更新工作流还需要 `workflow` 权限。凭据保留在系统凭据管理中，不写入项目文件。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**，无需添加新的示例工作流。
3. 保留旧站分支 `backup/legacy-2026-10-23`，指向 `da8fc5f05245c1bc985c681a6cb77a90c1c592ac`。
4. 获取远端最新状态，将验证通过的修改正常提交到 `master`，不要强制覆盖历史。
5. 在仓库 Actions 中查看对应提交的 `Build and deploy portfolio`，确认构建与部署均成功，再检查主页、作品详情和图片。

请不要把 `node_modules/`、`dist/`、凭据、备份目录或本地预览图提交到源代码分支。登录失效时重新进行官方浏览器授权，不要在聊天中发送密码或访问令牌。

工作流使用 Astro 官方部署 action，参考：[Astro 的 GitHub Pages 部署说明](https://docs.astro.build/en/guides/deploy/github/)。GitHub 在云端运行构建并托管静态页面，本机关闭后公开网站仍可访问。

GitHub Pages 的可访问性仍受访客当地网络影响；国内访问速度需要上线后实测。如以后增加镜像托管，可复用同一个 `dist/`，无需重写页面。

## 旧站备份与恢复

本机备份位于相邻目录 `../backups/2026-10-23/`：

- `legacy-history.bundle`：完整 478 次提交，已校验。
- `legacy-source.zip`：旧站当前源码与仓库内素材。
- `manifest.json`：来源提交和 SHA-256 校验值。
- `恢复说明.md`：从备份恢复到新目录的方法。

这里保留了 GitHub 仓库资料。百度网盘、腾讯文档中的外部文件未下载到备份，首版继续使用旧站提供的原链接。

## 交互与实现约定

- 桌面以 1504×862 的 Mac 浏览器视口为基准，随可用宽高等比放大字体、封面、按钮、卡片和间距；保留窄屏布局。尺寸用 rem，避免新增固定像素组件破坏比例。粒子画布保持原生 DPR，不用整页截图缩放。
- 作品预览及 Hub 最大标题统一 700 字重；顶部封面右下小标题保留细体。

- 首次进入先显示动态粒子和加载提示，开场至少展示 1 秒，期间同时加载首页图片；全部解码后平滑进入“欢迎你”；同标签页、站内返回及作品切换不强制重播。图片失败或超过 12 秒时可重试或主动进入；迟到的图片全部解码后仍会自动进入。手动重播可立即跳过。
- 滚轮向下/右选择下一项，向上/左选择上一项；普通轻扫一项，连续新手势可在惯性尾部和动画中响应；触控板一手势一步，衰减惯性不连跳；鼠标每阵最多五项、140ms 一步。
- 单击、双击和在作品封面按 Enter 均只选中预览；通过下方大按钮展开 Game Hub。Home/End 跳首尾。Escape、返回按钮或浏览器后退回到原作品，前进可再次展开。独立 `/works/id/` 保持可分享、无脚本可用。
- 欢迎你与个人介绍是作品栏最左端的两个独立方框，欢迎页只显示三行欢迎文字和粒子背景；Enter 可进入个人介绍。
- Hub 左上角返回箭头位于封面之前，悬停/键盘选中亮起白色圆形背景；独立作品页也保留此入口。
- 个人介绍固定六个组件：桌面三列、手机两列，没有隐藏分页。组件上的滚轮不切换作品。实习经历暂待补充；资料仍以真实 profile.json 为准。
- Hub 的文档、视频、下载卡片自动读取作品 resources；有多个视频/工程包会全部保留，缺资源只显示待补充。主要按钮优先文档，无资源则前往本站作品介绍。
- 手机支持横向手势；短屏或放大页面可以正常纵向滚动，详情页始终按常规方式阅读。
- 粒子画布匹配显示器实际 DPR；性能不足时减少数量和更新频率，不降低画布分辨率。支持系统“减少动态效果”和手动暂停；作品背景完全遮盖粒子后及页面隐藏时停止粒子帧循环；过渡期间保持同一粒子场连续。
- 没有 JavaScript 时仍可通过封面链接、作品库和详情页访问内容。
- 不自动播放音频，不使用访客账号、表单后端或统计追踪。

视觉灵感来自主机界面，品牌、内容和粒子实现属于此个人主页；没有嵌入 PlayStation 启动画面或游戏商标作为网站标识。

## 加载行为的本地验证

构建后可启动测试服务器，用不同端口隔离会话。以下选项只在本地模拟网络，不会进入线上业务代码：

```sh
python3 scripts/preview-test-server.py --port 4322 --delay-images-ms 4500
python3 scripts/preview-test-server.py --port 4323 --fail-image abyss --fail-once --delay-images-ms 500
python3 scripts/preview-test-server.py --port 4324 --delay-images-ms 15000
python3 scripts/preview-test-server.py --port 4325 --fail-scripts
```

依次检查慢图遮挡、失败重试、超时继续以及脚本失败回退；每个服务器在其终端按 Control+C 停止。粒子实际采样写在 `#ambient-canvas` 的 `data-fps`、`data-draw-ms`、`data-particles` 等属性中，每 60 次绘制更新一次。`draw-ms` 仅是 JS 绘制指令提交耗时，不能当作完整 GPU 帧时间。
