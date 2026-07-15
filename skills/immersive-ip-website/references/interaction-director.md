# 互动与视频导演实现

用于把多段独立生成视频组织成自主表演、偶然互动和滚动剧情，并避免抢播、卡顿与状态错乱。

## 1. 先建立唯一状态边界

页面只能有一个动画导演。按钮、滚轮、空白点击、自动时间线和返回首屏都调用导演公开方法。

导演至少维护：

```text
activePlayer       当前可见播放器
standbyPlayer      备用播放器
currentKey         当前片段
transitioning      是否正在切换
requestPriority    当前请求优先级
holdAtEnd          是否锁定到片尾
plannedKey         已计划的下一片段
visible            首屏是否可见
documentVisible    页面是否在前台
after              当前动作完成后的任务
```

不得在多个事件监听器里分别调用 `video.src = ...`、`play()`、`pause()` 或切换可见类。那会产生多个状态真源。

## 2. 给请求分优先级

推荐顺序：

| 优先级 | 类型 | 示例 | 规则 |
| --- | --- | --- | --- |
| 3 | 叙事锁定 | 首次滚动开门 | 播放完成前不接受其它片段 |
| 2 | 明确操作 | 动作按钮、对话入口 | 可替换普通待机，不打断叙事锁定 |
| 1 | 偶然互动 | 空白点击、返回回应 | 导演空闲时执行 |
| 0 | 自动表演 | 待机、随机动作 | 随时可被更高优先级替换 |

切换正在进行时，新请求应排队、合并或拒绝，不能同时启动第二次切换。连续相同请求只保留一次。

### 明确操作不能被自动回应吞掉

采用以下仲裁顺序：

1. 叙事锁定开始后，只接受结束、失败恢复或用户明确取消；其它请求不进入播放队列。
2. 普通转场进行时，新请求先记录，不启动第二个转场。
3. 多个待处理请求只保留最高优先级；同优先级保留用户最后一次明确操作。
4. 当前转场结束后重新检查页面和播放器状态，再执行保留请求。
5. 自动待机、返回欢迎和随机动作不能覆盖已经排队的按钮、目录或对话请求。

典型竞争：用户返回首屏后，欢迎回应刚开始切换，又点击指定动作。导演应让当前转场完成，随后执行用户最后点击的动作；不能因为 `transitioning === true` 直接丢弃该点击，也不能让欢迎回应持续占用状态。

推荐额外维护：

```text
requestSequence   递增请求编号
pendingRequest    当前待处理请求
pendingPriority   待处理请求优先级
storyLocked       是否处于不可抢占叙事
```

请求完成、被更高优先级替换或状态失效后，明确清除待处理项，不能留下跨章节的陈旧动作。

## 3. 使用双视频缓冲

两个 `<video>` 层交替承担活动和备用：

1. 活动播放器正常播放。
2. 导演根据当前片段提前决定下一片段。
3. 备用播放器设置 `src`，调用 `load()`，等待 `loadeddata`。
4. 切换时不再等待网络下载，直接从备用播放器启动。
5. 切换成功后交换活动索引，再给新的备用播放器加载后续片段。

每次加载使用递增的 `loadId`。异步加载返回时确认播放器仍在加载同一个片段，防止旧请求覆盖新请求。

播放前统一设置：

```text
currentTime = 0
playbackRate = 当前请求值
muted = 当前声音状态
```

`play()` 必须等待 Promise。带声音自动播放失败时，切回静音再试；再次失败则恢复旧画面或锚点。

## 4. 自动表演不是静态图夹视频

不使用以下循环：

```text
锚点图 → 待机视频 → 锚点图 → 待机视频
```

锚点图只在首次加载、切换模糊峰值和错误回退时出现。正常时间线直接在视频片段之间切换：

```text
主待机 → 次待机 → 随机动作 → 主待机
```

随机动作排除上一次动作。动作结束后回到主待机，避免多个强动作连续出现。

普通自动序列可以在片尾前约 0.35–0.65 秒开始切换，具体值由动作结尾决定。叙事片段不能提前切换。

## 5. 失焦锚点切换

推荐用 Web Animations API 操作整个媒体舞台的 `filter`，而不是让视频层分别淡化。

伪代码：

```js
async function transition(previous, next) {
  await ensureLoaded(next);

  await heroMedia.animate(
    [
      { filter: "blur(0px) brightness(1)" },
      { filter: "blur(14px) brightness(1.02)" },
    ],
    { duration: 180, easing: "cubic-bezier(.4,0,1,1)", fill: "both" }
  ).finished;

  previous.pause();
  previous.classList.remove("is-visible");

  const started = await startAtZero(next);
  if (!started) return restorePrevious(previous);
  next.classList.add("is-visible");

  await heroMedia.animate(
    [
      { filter: "blur(14px) brightness(1.02)" },
      { filter: "blur(0px) brightness(1)" },
    ],
    { duration: 260, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" }
  ).finished;
}
```

通过标准：

- 模糊只影响角色媒体，不影响导航、标题和按钮。
- 切点发生在模糊峰值。
- 任意时刻最多一个人物视频可见。
- 锚点不会清晰停留形成“卡住一帧”的感觉。
- 新视频失败后能恢复可用画面和正确导演状态。

## 6. 偶然互动的事件边界

空白或角色点击可以触发回应，但先排除：

```text
a, button, input, textarea, select, [contenteditable]
首屏文案区
动画控制区
滚动提示
打开的弹窗和面板
```

随后确认：

- 首屏仍可见。
- 页面位于首屏顶部容差范围内。
- 点击发生在首屏内部。
- 导演没有叙事锁定。
- 当前没有需要优先完成的明确操作。

按钮触发后立即 `return`，避免同一次冒泡事件又触发空白点击回应。

## 7. 第一次滚动的章节门控

滚动剧情是输入门控，不是普通滚动监听。

状态：

```text
storyUsed       是否已成功完成首次剧情
storyLocked     是否正在播放剧情
touchStartY     触摸起点
```

流程伪代码：

```js
async function beginStoryScroll() {
  if (!canStartStory()) return false;

  storyLocked = true;
  try {
    await director.waitUntilReady();
    const started = await director.request("story", {
      priority: 3,
      holdAtEnd: true,
    });
    if (!started) throw new Error("story video could not start");

    const ended = await director.waitUntilEnded("story");
    if (!ended) throw new Error("story video did not finish");

    storyUsed = true;
    target.scrollIntoView({ behavior: "smooth" });
    return true;
  } catch (error) {
    showRetryOrStaticFallback(error);
    return false;
  } finally {
    storyLocked = false;
  }
}
```

滚轮监听必须使用 `{ passive: false }`。当 `storyLocked` 为真时，每一次滚轮都 `preventDefault()`。触摸端在 `touchstart` 记录起点，在向上移动超过阈值后触发，并在锁定期间阻止 `touchmove`。

`waitUntilEnded` 同时监听 `ended` 并检查：

- 当前播放器仍是启动剧情时的播放器。
- 当前片段仍是剧情片段。
- `player.ended === true`。

超时只用于释放死锁和显示失败，不滚动到下一章节。

## 8. 后续章节滚动舞台不是输入门控

首屏故事门控完成后，恢复浏览器原生滚动。后续章节可以使用固定舞台和滚动驱动时间线，但不继续拦截滚轮或触摸，也不用全局滚轮倍率弥补页面过长。

每个固定章节至少拆成两个边界：

1. **进入边界**：章节从视口外进入到舞台固定，例如 `top bottom → top top`。只负责建立构图和可见性。
2. **章内边界**：舞台固定后到章节结束，例如 `top top → bottom bottom`。只负责该章的状态推进。

不能让同一条 `ScrollTrigger` 或等价进度同时承担进入和章内推进。否则压缩章节高度后，元素可能在固定舞台真正开始前就已经到达结束状态。

先按有意义的可见状态估算章节高度：

| 章节复杂度 | 初始屏数建议 | 使用条件 |
| --- | --- | --- |
| 单一构图变化或两态切换 | 约 1.4–2.0 屏 | 开始与结束都能直接理解 |
| 三到四个有信息增量的阶段 | 约 2.2–3.0 屏 | 每个阶段都有新证据、关系或动作 |
| 超过 3 屏 | 单独说明 | 必须存在不能合并的新状态，不能只是停留或等待 |

这是初始调校范围，不是所有项目的硬性数值。真正标准是：自然滚动时，每一段距离都有可感知推进，且用户不会为了到下一章重复空滚。

当用户反馈“滚动太慢”时，按以下顺序处理：

1. 记录每章 `offsetHeight / innerHeight` 和当前 `scrub` 延迟。
2. 缩短没有新状态的章节高度和不必要的 `scrub` 滞后。
3. 重新映射章内状态，确认动画没有在进入阶段提前结束。
4. 用真实滚轮或触摸依次检查开始、中段和结束画面。

不要通过全局 `wheel` 增益、持续 `preventDefault()` 或强制翻页隐藏过长章节。任意抽样进度都应有一个清楚焦点；没有内容的新状态应被合并，而不是用漂浮、视差或循环运动填充。

## 9. 片尾锁定与自动推进

普通片段可以在临近片尾时调用 `advance()`。设置 `holdAtEnd` 后：

- `timeupdate` 不触发自动推进。
- `ended` 不切回待机。
- 页面重新可见时不重新播放已经结束的片段。
- 只有叙事流程或明确的新请求解除状态。

这能避免开门动画最后半秒被自动导演切掉，也能避免页面滚动后后台又切回待机。

## 10. 离开和返回首屏

用 `IntersectionObserver` 观察首屏：

- 离开首屏时暂停活动播放器，记录用户确实离开过。
- 返回首屏时先恢复可用画面，再按体验合同触发一次欢迎回应。
- 因“下方动作卡片要求返回首屏并播放指定动作”而返回时，抑制自动欢迎，避免两个动作抢播。
- 用户在欢迎回应切换期间选择了明确动作时，按请求优先级排队执行用户动作；不能为了欢迎效果忽略用户输入。
- 页面进入后台时暂停；回到前台时只在首屏可见且没有片尾锁定时恢复。

## 11. 导航、声音和减少动态效果

- 固定导航高度应成为媒体舞台的布局变量。媒体从导航下方开始，同时向底部补偿首屏高度，避免人物头部被遮挡。
- 声音默认关闭。声音按钮修改两个播放器的 `muted`，不只修改当前播放器。
- `prefers-reduced-motion` 下不启动自动导演，显示锚点，滚动直接进入章节；后续内容使用可读的静态布局，不保留没有信息价值的固定滚动距离。
- 粗指针设备不用悬停作为唯一入口；按钮和触摸手势都必须可用。

## 12. 失败恢复

每个异步阶段都定义恢复结果：

| 失败位置 | 恢复动作 |
| --- | --- |
| 备用视频加载失败 | 保持当前视频或锚点，状态不切换 |
| 新视频 `play()` 失败 | 恢复旧视频，清除模糊和切换锁 |
| 叙事视频未结束 | 留在首屏、解除输入锁、显示重试 |
| 页面切到后台 | 暂停，回到前台后按状态恢复 |
| 用户连续触发 | 按优先级拒绝、合并或排队 |

恢复逻辑属于导演，不在各个按钮或事件监听器里各写一套。
