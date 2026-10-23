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

## 日常修改位置

| 想修改什么 | 修改位置 |
| --- | --- |
| 姓名、邮箱、简介、学校与工具 | `src/data/profile.json` |
| 单个作品的标题、简介、资源链接与正文 | `src/content/projects/对应作品.md` |
| 作品封面和正文图片 | `public/images/` |
| 主机界面布局与响应式样式 | `src/styles/console.css` |
| 作品列表、详情、个人档案样式 | `src/styles/global.css` |
| 滚轮、键盘、开场、动效偏好 | `src/scripts/console.ts` |
| 粒子绘制 | `src/scripts/particles.js` |
| 内容字段校验 | `src/content.config.ts` |
| GitHub Pages 自动构建与发布 | `.github/workflows/pages.yml` |

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

新增内容会自动出现在主页横向栏、作品库、独立详情页和 sitemap 中，无需修改页面代码。未发布的草稿不会生成详情页。

## 首次发布到 GitHub Pages

当前 GitHub 连接能读取仓库，但创建备份分支返回 403，远端写入尚未完成。旧站仍然保持原样。新站的源文件已准备好；请不要把 `node_modules/`、`dist/`、备份目录或本地预览图提交到源代码分支。

获得 `CANNON999/CANNON999.github.io` 的仓库写入权限后：

1. 创建远端 `backup/legacy-2026-10-23`，指向 `da8fc5f05245c1bc985c681a6cb77a90c1c592ac`，保留旧站恢复点。
2. 将首版提交到独立的 `redesign/v1` 分支，先检查差异与构建结果。
3. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
4. 合并审核过的首版到 `master`。工作流会检查内容、构建、校验资源后部署。
5. 在 Actions 中确认部署成功，再访问公开网址。后续更新只需提交内容文件。

工作流使用 Astro 官方部署 action，参考：[Astro 的 GitHub Pages 部署说明](https://docs.astro.build/en/guides/deploy/github/)。当前 Actions 尚未在远端运行，本地构建已验证。

GitHub Pages 的可访问性仍受访客当地网络影响；国内访问速度需要上线后实测。如以后增加镜像托管，可复用同一个 `dist/`，无需重写页面。

## 旧站备份与恢复

本机备份位于相邻目录 `../backups/2026-10-23/`：

- `legacy-history.bundle`：完整 478 次提交，已校验。
- `legacy-source.zip`：旧站当前源码与仓库内素材。
- `manifest.json`：来源提交和 SHA-256 校验值。
- `恢复说明.md`：从备份恢复到新目录的方法。

这里保留了 GitHub 仓库资料。百度网盘、腾讯文档中的外部文件未下载到备份，首版继续使用旧站提供的原链接。

## 交互与实现约定

- 首次进入默认显示个人介绍，开场每个标签页会话播放一次，可以立即跳过或手动重播。
- 滚轮向下/右选择下一项，向上/左选择上一项；每次手势只切换一个作品，抑制触控板惯性。
- 点击封面选择作品，方向键切换；封面获焦时 Home/End 跳到首尾，Enter 打开详情。
- 手机支持横向手势；短屏或放大页面可以正常纵向滚动，详情页始终按常规方式阅读。
- 支持系统“减少动态效果”和手动暂停；页面隐藏时停止粒子帧循环。
- 没有 JavaScript 时仍可通过封面链接、作品库和详情页访问内容。
- 不自动播放音频，不使用访客账号、表单后端或统计追踪。

视觉灵感来自主机界面，品牌、内容和粒子实现属于此个人主页；没有嵌入 PlayStation 启动画面或游戏商标作为网站标识。
