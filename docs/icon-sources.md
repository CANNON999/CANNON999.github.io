# 工具图标与学校标志来源

采集与核对日期：2026-11-04。用途：个人主页「创作工具」组件及个人资料中的教育经历。所有图形均来自品牌、学校的官网或其官方代码仓库；不把第三方重绘图标作为官方素材。

`src/data/tools.json` 是工具清单的唯一数据入口；新增项沿用 `{ id, name, image, url }`，并在本表补充来源。页面使用本地静态文件，不依赖第三方图床实时响应。素材为标识相关软件或学校的说明性展示，不表示合作或背书；品牌及学校标志的权利仍归原权利人。

## 工具

| 工具 | 本地文件 / 原图规格 | 官方出处及下载地址 | 使用约束与处理 |
| --- | --- | --- | --- |
| Unreal Engine | `public/images/tools/unreal.webp`；180 × 180 | [官方首页](https://www.unrealengine.com/)实际引用的 [apple-touch-icon.png](https://www.unrealengine.com/cosmos/static/favicons/apple-touch-icon.png)；通过浏览器下载 | Epic Games 标志；[品牌入口](https://www.unrealengine.com/en-US/branding)。保留原黑白圆形 U 标与白底，仅无损转 WebP。作为工具名称的辅助识别，不用作本站品牌。 |
| Blender | `public/images/tools/blender.webp`；256 × 256 | [官方 Logo 页面](https://www.blender.org/about/logo/) → [官方素材包](https://download.blender.org/branding/blender_logo_kit.zip)中的 `square/blender_icon_256x256.png` | Blender Foundation 标志，遵循官方 Logo 指引；完整保留橙蓝符号和透明区域，仅无损转 WebP。 |
| XMind | `public/images/tools/xmind.webp`；原图 384 × 384，输出 256 × 256 | [官方设计资源](https://xmind.app/design-resources/)页面引用的 [webapp icon](https://xmind.app/webapp-icon/icon_384.png) | [Logo Guidelines](https://xmind.app/logo-guidelines/)；保持原色和比例，不暗示官方隶属。等比例缩小后无损转 WebP。 |
| Godot | `public/images/tools/godot.svg`；矢量 | [官方 Press Kit](https://godotengine.org/press/) → [icon_color.svg](https://godotengine.org/assets/press/icon_color.svg) | Godot Engine logo © Juan Linietsky, Ariel Manzur and contributors，按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 提供。保留原图形，移除 XML 声明和编辑器注释。 |
| Unity | `public/images/tools/unity.svg`；矢量 | [官方首页](https://unity.com/)引用的 [icon.svg](https://unity.com/icon.svg) | [Unity 品牌与商标指南](https://unity.com/legal/branding-trademarks)。保留完整官方黑色立方标志；移除源文件按系统深色模式自动变白的 CSS 分支，固定使用源文件已有的黑色版本，适配浅色图标卡底。 |
| ChatGPT | `public/images/tools/chatgpt.webp`；原图 1024 × 1024，输出 256 × 256 | [OpenAI 官方应用 FAQ](https://help.openai.com/en/articles/8142208-chatgpt-ios-and-android-app-faq)中明确标注的官方应用图标 → [原始 PNG](https://images.ctfassets.net/j22is2dtoxu1/intercom-img-b10ab9f4d70661d93db667c0/9716417ee02ffe9988beb6aeb2507856/openai-logo_2B-282-29.png) | [OpenAI 品牌指南](https://openai.com/brand/)。保留原黑色 Blossom 与白底，不增加效果，不用于表示本站属于 OpenAI。等比例缩小后无损转 WebP。 |
| Tripo AI | `public/images/tools/tripo.svg`；矢量 | [官方开发者站](https://developers.tripo3d.ai/en)引用的 [favicon.svg](https://developers.tripo3d.ai/favicon.svg) | Tripo 官方黑底黄白应用标志，未在来源页发现单独的开放图标许可；保留原始 SVG。用户口述的「Triple 3D」暂对应 Tripo AI。 |
| Gemini | `public/images/tools/gemini.webp`；原图 512 × 512，输出 256 × 256 | [Gemini 官方产品页](https://gemini.google.com/)引用的 [512px 图标](https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png) | Google / Gemini 标志；不把 Google 商标用于本站品牌或暗示合作。保留官方多色渐变，等比例缩小后无损转 WebP。 |
| Python | `public/images/tools/python.svg`；矢量 | [Python 官方 Logo 页面](https://www.python.org/community/logos/) → [python-logo-only.svg](https://s3.dualstack.us-east-2.amazonaws.com/pythondotorg-assets/media/files/python-logo-only.svg) | Python Software Foundation 标志；按官方商标指引用于相关工具说明。原文件缺少 `viewBox`，按原 pt 尺寸换算补充 `0 0 111.161356 134.668107`，避免 `<img>` 缩放时裁切；未改变路径、颜色或阴影。 |
| C++ | `public/images/tools/cpp.svg`；矢量 | [Standard C++ Foundation 官方 Logo 仓库](https://github.com/isocpp/logos) → [cpp_logo.svg](https://raw.githubusercontent.com/isocpp/logos/master/cpp_logo.svg) | [isocpp.org 使用条款](https://isocpp.org/home/terms-of-use)：保留完整 Logo，不暗示背书；原设计 Jeremy Kratz，相关权利由 Standard C++ Foundation 管理。删除外部 DTD 声明和编辑器注释，无图形修改。 |
| C# | `public/images/tools/csharp.webp`；256 × 256 | [Microsoft / dotnet 官方 C# 扩展仓库](https://github.com/dotnet/vscode-csharp) → [images/csharpIcon.png](https://raw.githubusercontent.com/dotnet/vscode-csharp/main/images/csharpIcon.png) | 官方仓库采用 MIT 许可（原文见下），品牌标志仍属于 Microsoft。保留原紫色 C# 图标，仅无损转 WebP。 |
| Eagle | `public/images/tools/eagle.webp`；256 × 256 | [Eagle 官网](https://eagle.cool/)引用的 [home-cta-logo.png](https://eagle.cool/images/home-cta-logo.png) | Eagle 官方应用图标；来源页未提供独立开放图标许可。完整保留图形，仅无损转 WebP。 |
| Aseprite | `public/images/tools/aseprite.webp`；256 × 256 | [Aseprite 官方仓库](https://github.com/aseprite/aseprite) → [data/icons/ase256.png](https://raw.githubusercontent.com/aseprite/aseprite/main/data/icons/ase256.png) | Aseprite / Igara Studio 标志；[官方条款](https://www.aseprite.org/terms/)及仓库许可适用，未将软件源码许可解释为品牌授权。保留原像素风格，不平滑重绘，仅无损转 WebP。 |
| Krita | `public/images/tools/krita.webp`；256 × 256 | [Krita 官网 Press 页面](https://krita.org/en/about/press/)与 [KDE 官方镜像](https://github.com/KDE/krita) → [默认应用图标](https://raw.githubusercontent.com/KDE/krita/master/krita/pics/branding/default/256-apps-krita.png) | [Krita 商标政策](https://krita.org/en/posts/2013/krita-trademark-policy/)；采用默认正式版图标，非 Beta / Next / Plus 变体。完整保留图形，仅无损转 WebP。 |

## 学校

| 学校 | 本地文件 / 原图规格 | 官方出处及下载地址 | 使用约束与处理 |
| --- | --- | --- | --- |
| 上海交通大学 | `public/images/schools/sjtu.webp`；原图 2805 × 2806，输出 384 × 384 | [上海交通大学视觉形象识别系统：常用资料下载](https://vi.sjtu.edu.cn/index.php/articles/bulletin/13) → [官方校徽 PNG](https://vi.sjtu.edu.cn/uploads/files/caf2f5045c47308250fab3812dfe2003-6896b91594f238b24e67696224948251.png) | 校徽权利归上海交通大学；保留完整红色圆章与文字，遵守官方 VI。等比例缩小后无损转 WebP，教育经历中的交大记录复用此文件。 |
| INSA Lyon | `public/images/schools/insa-lyon.webp`；384 × 103 | [学校官网](https://www.insa-lyon.fr/)页头实际使用的 [logo.png](https://www.insa-lyon.fr/sites/all/themes/insa/logo.png) | 学校官方 INSA Lyon / Université de Lyon 组合标志；保留完整字标与白底，仅无损转 WebP。宽高比约 3.73:1，使用 `object-fit: contain`，不裁成圆章。 |

## 检查与维护

- 已逐个确认文件能被图像解码器读取；SVG 可正常栅格化。
- SVG 无脚本、事件处理器、`foreignObject`、远程渲染资源或外部 DTD；内部渐变 `url(#...)` 保留。
- 14 个工具图标已制作接触表检查：符号完整，无错图或外部页面伪装成图片。Python 原 SVG 的缩放裁切已修复并再次检查。
- 位图保留透明度及原始图案，静态资源总量约 210 KiB（工具约 155 KiB，学校约 56 KiB）。
- UI 应在浅色图标容器中以 `contain` 显示，不滤色、不拉伸，不裁掉图形。仅修正格式、压缩和尺寸，不重新设计品牌。
- 后续更新官方品牌资产时，替换本地文件并更新来源、日期及尺寸；不要只更改远程链接来热链展示。

### C# 官方仓库 MIT 许可

来源：[dotnet/vscode-csharp/LICENSE.txt](https://github.com/dotnet/vscode-csharp/blob/main/LICENSE.txt)。

MIT License

Copyright (c) .NET Foundation and Contributors
All Rights Reserved

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
