# PS5 页面转场参考与本站实现

调研日期：2026-11-04；对应 R40 / V1.4.0。以下区分录像观察、本站选定参数和未验证范围。

## 录像与关键帧

优先参考 [PlayStation 官方 UX 介绍](https://blog.playstation.com/2020/10/15/first-look-playstation-5s-next-generation-user-experience/)（2020-10-15），结合以前保存的官方 Home → Game Hub 1080p60 片段。该官方介绍没有完整演示 Media，因此本轮补充 BWOne 的 [PS5 UI Walkthrough / Full PS5 UI Tour](https://www.youtube.com/watch?v=t3TLeNuDTkw)（2020-11-17）；[作者原文](https://www.bwone.com/ps5-ui-walkthrough-full-ps5-ui-tour/)提供相应章节说明。

通过视频播放器逐帧观察；关键帧以视频 currentTime 命名，保存在仓库外 `design/PS5reference/page-transitions/`。采样约每 0.17–0.25 秒，足以判断层次，不能据此声称得到 Sony 精确曲线。

| 录像位置 | 实际观察 | 用于本站 |
| --- | --- | --- |
| [15:47 Games → Media](https://www.youtube.com/watch?v=t3TLeNuDTkw&t=947s)，947.252–947.752s | 顶部 Games / Media 保持位置，字重切换；旧图标和说明退去，新图标先出现，背景随后交叉渐变；没有整屏长距离横移 | 主页 ↔ 作品集共用导航快照；正文淡出/淡入，仅约 12px 的方向提示，背景交叠 |
| [17:40 进入 Profile](https://www.youtube.com/watch?v=t3TLeNuDTkw&t=1060s)，1060.714–1061.514s | 用户菜单收起，原主画面退暗；头像、姓名、标签先淡入并轻微放大到原尺寸，下方四张卡片随后出现 | 档案头部及标签独立于正文；先头部，后内容；不实现录像中联网资料的空卡等待 |
| [19:59–20:01 章节及返回](https://www.youtube.com/watch?v=t3TLeNuDTkw&t=1199s)，1199.264–1200.764s | 标签变化时头像和姓名留在顶部，下方区域替换；离开档案后主页背景和导航在原档案淡出时恢复 | 章节切换只动下方，返回通过淡出和微缩放恢复主画面 |
| 本地旧参考 51 / 52 | 固定头像、姓名、横向标签；游戏列表/四张概览卡 | 六个简历章节；游戏总时长与三款真实游戏卡；内容区可独立纵向滚动 |

录像中的 Profile 入口来自 Media 顶部账户菜单，不能表述成已拍到 Games 的同一路径。本轮没有另外核实 Media → Games 的完整逆向片段；本站反向切换采用对应的反向微位移与同一淡化节奏，这是设计适配。PS5 固件版本会改变界面；当前目标是用户指定的 2020 年参考风格。

## 实现参数（本站选择，不是 Sony 源码参数）

- 背景/根快照：旧层 320ms、新层 420ms；缓动为 ease。
- 页面主体：旧层 180ms；新层 380ms，延迟 70ms，`cubic-bezier(.22,.8,.22,1)`；位移约 6–10px，缩放 0.985 → 1。
- 主页 ↔ 作品集：导航留在原位置，内容横向微移约 12px；反向改变方向。不将页面改为横向长距离滑动。
- 进入档案：头像/标题/标签 360ms、延迟 40ms；下方内容 380ms、延迟 140ms。返回内容从 1.015 → 1。
- 档案章节：280ms 淡入与约 10.4px 水平微移，旧动画可被取消；固定顶部不参与。
- 现有就地 Game Hub 保留独立控制器与原有分层转场；页面导航脚本不拦截已处理的 Hub/封面/锚点事件。

使用原生跨文档 View Transition，HTML 仍为静态多页。`pageswap`/`pagereveal` 在 head 提前注册，完整 DOM 的 render expectation 避免只解析半页便截取快照；不额外等待大视频。依据 [Chrome 官方跨文档文档](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document)。

浏览器不支持时采用短暂退出及 320ms 入场；原生快照被窗口变化等情况取消时也有入场恢复。动画不承担页面可见性或导航解锁职责，不会让页面永久透明。首次主页的图片门禁独立保留，站内来回不重播开场。系统减少动态效果与手动暂停同时关闭跨页/章节动画；无 JavaScript 仍有普通链接和完整简历。

动画主要使用 opacity / transform，不增加全屏模糊、视频背景或动画库。原生转场仍需短时快照内存，不能把本机流畅等同于所有低端设备实测。
