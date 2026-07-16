# Nyxie Wonderland

夜希（Nyxie）的互动式 IP 角色展示与创作入口。网站使用 React 管理页面和互动状态，GSAP / ScrollTrigger 负责章节进场与滚动表现，首屏继续使用双视频播放器完成自动表演和动作切换。

## 页面内容

- `HOME`：首屏角色主视觉、六段已有视频、随机动作、声音和对话入口。
- `GALLERY`：每次从八种夜希形态中随机抽取三种；向下滚轮一次切换一种，浏览完三种后再整页滑向下一章，向上滚动则直接返回首页；两侧角色、箭头、滑动和方向键也可切换。
- `CHARACTER`：全身形象与脸部、服装、背面、不对称袜鞋四组设计细节。
- `PERSONALITY`：10 秒透明人物动作视频；不支持 VP9 Alpha 或启用减少动态效果时显示静态海报。
- `LINKS`：GitHub 与博客入口，原有页面内链接完整保留。
- `WORKS`：最终章节展示真实 GitHub 项目；页面滚动到底后从下方弹出链接目录，并提供返回首页按钮。

## 技术结构

```text
Nyxie-Web/
├─ public/assets/
│  ├─ media/              # 首屏视频、锚点图和性格透明 WebM
│  ├─ gallery/            # 八种形态的透明 WebM 与静态海报
│  └─ character/          # 已抠图并裁切的网页角色素材
├─ src/
│  ├─ animation/          # GSAP 注册入口
│  ├─ app/                # 页面状态与 reducer
│  ├─ components/         # 导航、目录、对话、环境效果
│  ├─ content/            # 文案、链接和媒体路径的唯一数据源
│  ├─ hooks/              # 页面状态和首屏视频导演
│  ├─ sections/           # 六个页面章节
│  └─ styles/global.css   # 全站视觉与响应式样式
├─ scripts/
│  ├─ prepare_media.py    # 从绿幕母图生成透明 WebP
│  └─ browser_acceptance.mjs
├─ index.html
└─ vite.config.ts
```

绿幕母图和原始视频保留在本地素材目录，网站只读取 `public/assets/` 中的衍生素材。旧静态网站已移出运行目录，保存在 `archive/legacy-static/`。

## 本地运行

首次运行：

```powershell
npm install
npm run dev
```

然后打开 <http://127.0.0.1:4173>。也可以双击 `启动网站.bat`；它会检查依赖并启动同一个 Vite 开发服务器。

更换端口：

```powershell
npm run dev -- --port 8080
```

## 验证

```powershell
npm run typecheck
node scripts/browser_acceptance.mjs
```

浏览器验收脚本需要本机已经以 `9222` 端口启动 Chromium DevTools 调试接口。结果与截图写入 `artifacts/browser-acceptance/`，不会进入版本库。

## 显示与兼容

- 首屏视频默认静音自动播放，可通过桌面端右上角按钮切换声音。
- 第一次从首屏向下滚动会先播放完整开门动作，再进入角色章节。
- 触摸设备使用简化控制布局，保留主要角色动作和章节导航。
- 启用“减少动态效果”时，首屏和性格章节使用静态画面。
- Safari 使用性格静态海报，避免不支持 VP9 Alpha 时出现黑底。
