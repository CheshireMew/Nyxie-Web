# Nyxie Wonderland

夜希（Nyxie）的互动式 IP 角色展示与创作入口。这是一个纯静态 React 前端，没有应用后端、数据库或服务端会话；生产边界是 Vite 生成的静态文件和 `public/assets/` 中经过审核的网页媒体。

## 页面内容

- `HOME`：首屏角色主视觉、动作视频、随机播放、背景音乐和对话入口。
- `GALLERY`：从八种形态中稳定抽取三种作为本次滚轮序列，同时允许箭头和键盘浏览全部八种；只挂载当前视频和正在淡出的上一段视频。
- `CHARACTER`：全身形象与脸部、服装、背面、不对称袜鞋四组设计细节。
- `LINKS`：项目展示、GitHub 与博客目录，以及返回首页入口。

有效章节会同步到 URL hash，例如 `#character`。同一次页面会话里的浏览器前进和后退会恢复对应章节；重新加载或重新打开网站始终从 `HOME` 开始。

## 架构边界

```text
Nyxie-Web/
├─ public/assets/                  # 可直接部署的运行时媒体
├─ src/
│  ├─ app/
│  │  ├─ sectionRegistry.ts       # 章节 ID、编号、HUD、顺序和预热资源的唯一来源
│  │  └─ renderSection.tsx        # 章节到 React 组件的穷尽映射
│  ├─ content/
│  │  ├─ mediaManifest.json       # 所有运行时媒体路径的唯一清单
│  │  ├─ mediaCatalog.ts          # 带类型的媒体目录
│  │  └─ siteContent.ts           # 文案与外部链接
│  ├─ features/
│  │  ├─ hero/                    # 视频双缓冲、动作状态机、纯序列策略
│  │  └─ gallery/                 # 抽样、交互控制、媒体状态和展示组件
│  ├─ navigation/
│  │  └─ chapterNavigation.ts     # 滚动事务、历史记录和完成通知的唯一所有者
│  ├─ hooks/
│  │  ├─ usePerformanceDirector.ts# 首屏状态机的 React 生命周期适配层
│  │  ├─ useBackgroundMusic.ts    # BGM 的真实播放状态与重试
│  │  ├─ useChapterPerformance.ts # 章节动画生命周期脚手架
│  │  ├─ useChapterWarmup.ts      # 只预热下一章
│  │  └─ usePageState.ts          # 可见章节状态同步
│  ├─ sections/                   # 四个章节
│  └─ styles/                     # 全局、组件、章节和响应式职责文件
├─ scripts/
│  ├─ validate_assets.mjs         # 校验媒体清单与实际文件
│  ├─ validate_architecture.mjs   # 循环依赖、旧协议和上帝入口守卫
│  ├─ unit_tests.mjs              # 纯状态与构建规则聚焦测试
│  ├─ browser_acceptance.mjs      # Chromium 验收入口
│  ├─ browser/                    # CDP 工具、场景与断言
│  ├─ lib/                        # 媒体清单、文件树和部署 URL 公共规则
│  ├─ prepare_media.py            # 生成受脚本管理的角色静态图
│  └─ MEDIA_PIPELINE.md           # 素材来源和更新边界
└─ .github/workflows/verify.yml   # 类型、素材、构建和浏览器 CI
```

章节注册表驱动渲染顺序、导航界面、章节类型和下一章预热；章节组件不再保存第二份 ID、编号或 HUD 标签。章节导航模块独占 hash 解析、滚动事务与历史写入，不通过 DOM dataset 或字符串事件传递内部状态。媒体清单同时驱动目录和文件验证。交互锁由首屏表演状态机统一发布，BGM 的按钮状态则只由实际 `play()` 结果决定。

## 本地运行

需要 Node.js `22.12+`，依赖版本由 `package-lock.json` 固定。

```powershell
npm ci
npm run dev
```

打开 <http://127.0.0.1:4173>。也可以双击 `启动网站.bat`；它会检查 Node.js，缺少依赖时运行 `npm ci`。更换端口可执行 `npm run dev -- --port 8080`。

## 验证与生产输出

```powershell
npm run check
npm run test:browser
npm run build
npm run preview
```

`check` 包含 TypeScript、纯逻辑聚焦测试、架构边界守卫和 36 项运行时媒体验证，并拒绝循环依赖、旧导航协议、重新膨胀的入口文件和任何未在清单声明的部署文件。浏览器验收脚本需要网站已在 `4173` 端口运行，并且本机已有监听 `9222` 端口的 Chromium DevTools；它会验证静态回退、深链接与历史遍历、真实媒体加载与失败重试、章节滚动、键盘/触摸入口、响应式布局和减少动态效果路径。报告与截图写入 `artifacts/browser-acceptance/`。

`build` 生成可部署的 `dist/` 静态目录，并自动执行 `validate:dist`：比对 36 个媒体副本、拒绝未声明媒体和开发期入口、检查相对 JS/CSS/静态资源。`base: "./"` 允许部署在域名根路径或静态子目录。CI 构建后会分别从根路径和 `/dist/` 静态子目录启动真实产物，再运行同一套浏览器验收。

部署地址确定后，通过环境变量生成绝对 canonical、`og:url` 和分享图地址：

```powershell
$env:NYXIE_SITE_URL="https://example.com/nyxie/"
npm run build
```

没有配置真实部署地址时，构建不会写入虚假的 canonical。

## 媒体策略

首页冷启动只请求首屏锚点和当前首屏视频，不请求任何下方章节媒体或 BGM。用户开启 BGM 时才设置音频源；各章节首次激活后才绑定自己的媒体源；后台只预热当前章节的下一章。媒体请求失败会保留最后可用画面或静态图，并在原控制位置提供真实重试。

`public/assets/` 是版本化的运行时媒体边界，`src/content/mediaManifest.json` 是路径清单。静态角色素材的再生成方式和视频、音频的更新规则见 `scripts/MEDIA_PIPELINE.md`。

所有角色视频固定静音。触摸设备保留主要动作与章节导航；启用“减少动态效果”时使用静态展示；Safari 对 VP9 Alpha 不支持的路径使用海报回退。
