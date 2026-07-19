export async function runHeroGalleryScenario(browser) {
  const { failedResources } = browser;
  const send = browser.send.bind(browser);
  const evaluate = browser.evaluate.bind(browser);
  const delay = browser.delay.bind(browser);
  const waitFor = browser.waitFor.bind(browser);
  const screenshot = browser.screenshot.bind(browser);
  const wheelAt = browser.wheelAt.bind(browser);

const expectedPortalFailureStart = failedResources.length;
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Network.setBlockedURLs", { urls: ["*portal.mp4*"] });
await evaluate("window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true }))");
await waitFor("document.querySelector('.video-retry')?.textContent?.trim() === 'RETRY VIDEO'");
const portalFailure = await evaluate(`({
  scrollY: Math.round(scrollY),
  activeSection: document.querySelector('.main-nav .is-active')?.textContent?.trim() ?? null,
  retryVisible: Boolean(document.querySelector('.video-retry')),
  controlsDisabled: [...document.querySelectorAll('.control-stack button, .cheshire-orb')].every((button) => button.disabled),
})`);
await delay(150);
failedResources.splice(expectedPortalFailureStart);
await send("Network.setBlockedURLs", { urls: [] });
await evaluate("document.querySelector('.video-retry')?.click()");
await waitFor("document.querySelector('.hero-video.is-visible')?.dataset.clip === 'portal' && document.querySelector('.hero-video.is-visible')?.currentTime > 0.25");
await send("Network.setCacheDisabled", { cacheDisabled: false });
const portalStartedAt = await evaluate("document.querySelector('.hero-video.is-visible')?.currentTime ?? 0");
await evaluate(`(() => {
  document.querySelector('#home')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  document.querySelector('.control-stack button:first-child')?.click();
  document.querySelector('.cheshire-orb')?.click();
  document.querySelector('.main-nav button:nth-child(3)')?.click();
  document.querySelector('.talk-button')?.click();
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 240, cancelable: true }));
})()`);
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "PageDown", code: "PageDown", windowsVirtualKeyCode: 34, nativeVirtualKeyCode: 34 });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "PageDown", code: "PageDown", windowsVirtualKeyCode: 34, nativeVirtualKeyCode: 34 });
await delay(180);
const portalLock = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  return {
    scrollY: Math.round(scrollY),
    clip: video?.dataset.clip ?? null,
    ended: video?.ended ?? false,
    paused: video?.paused ?? true,
    currentTime: video?.currentTime ?? 0,
    playbackRate: video?.playbackRate ?? null,
    muted: video?.muted ?? null,
    activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
    talkOpen: document.querySelector('.talk-dialog')?.open ?? false,
    headerControlsDisabled: [...document.querySelectorAll('.main-nav button, .talk-button, .menu-button')].every((button) => button.disabled),
    warmup: document.documentElement.dataset.chapterWarmup ?? null,
    warmupTarget: document.documentElement.dataset.chapterWarmupTarget ?? null,
  };
})()`);
await waitFor(`(() => {
  const gallery = document.querySelector('#gallery');
  const scrollPaddingTop = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return document.querySelector('.main-nav .is-active')?.textContent === 'GALLERY'
    && gallery
    && Math.abs(gallery.getBoundingClientRect().top - scrollPaddingTop) <= 4;
})()`, 18000);
const portalScroll = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  const gallery = document.querySelector('#gallery');
  const scrollPaddingTop = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return {
    clip: video?.dataset.clip ?? null,
    ended: video?.ended ?? false,
    currentTime: video?.currentTime ?? 0,
    duration: video?.duration ?? 0,
    scrollY: Math.round(scrollY),
    warmup: document.documentElement.dataset.chapterWarmup ?? null,
    warmupTarget: document.documentElement.dataset.chapterWarmupTarget ?? null,
    activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
    galleryTop: gallery ? Math.round(gallery.getBoundingClientRect().top) : null,
    scrollPaddingTop: Math.round(scrollPaddingTop),
  };
})()`);

await waitFor(`(() => {
  const section = document.querySelector('#character');
  const video = section?.querySelector('.character-film');
  return section?.dataset.characterMedia === 'warming'
    && video?.currentSrc.endsWith('/assets/character/character-loop.webm')
    && video.preload === 'auto'
    && video.readyState >= 2
    && video.poster.endsWith('/assets/character/character-loop-poster.webp');
})()`, 10000);
const characterWarmup = await evaluate(`(() => {
  const section = document.querySelector('#character');
  const video = section?.querySelector('.character-film');
  if (video) video.dataset.acceptanceWarmupToken = 'same-character-player';
  return {
    mediaState: section?.dataset.characterMedia ?? null,
    playerCount: section?.querySelectorAll('video.character-film').length ?? 0,
    source: video?.currentSrc ?? '',
    poster: video?.poster ?? '',
    preload: video?.preload ?? null,
    readyState: video?.readyState ?? 0,
    paused: video?.paused ?? false,
  };
})()`);

await waitFor("document.querySelector('.gallery-form-video.is-active')?.currentTime > 0.1");
const galleryInitialPlayback = await evaluate(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return { source: video?.currentSrc ?? '', currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true };
})()`);

await evaluate("document.querySelector('.main-nav button:first-child')?.click()");
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'HOME'");
await delay(650);
await waitFor("[...document.querySelectorAll('.control-stack button, .cheshire-orb')].every((button) => !button.disabled) && document.querySelector('.video-retry') === null");
const heroFailureTarget = await evaluate(`(() => {
  const loaded = new Set([...document.querySelectorAll('.hero-video')].map((video) => video.dataset.clip));
  return [
    { clip: 'reactKey', file: 'react-key.mp4', button: 1 },
    { clip: 'vanish', file: 'vanish.mp4', button: 2 },
    { clip: 'tease', file: 'tease.mp4', button: 4 },
  ].find((candidate) => !loaded.has(candidate.clip)) ?? null;
})()`);
if (!heroFailureTarget) throw new Error("No unloaded Hero action is available for failure acceptance.");
const expectedHeroFailureStart = failedResources.length;
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Network.setBlockedURLs", { urls: [`*${heroFailureTarget.file}*`] });
await evaluate(`document.querySelector('.control-stack button:nth-child(${heroFailureTarget.button})')?.click()`);
await waitFor("document.querySelector('.video-retry')?.textContent?.trim() === 'RETRY VIDEO'");
const heroFailure = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  return {
    requestedClip: ${JSON.stringify(heroFailureTarget.clip)},
    retryVisible: Boolean(document.querySelector('.video-retry')),
    controlsDisabled: [...document.querySelectorAll('.control-stack button, .cheshire-orb')].every((button) => button.disabled),
    visibleClip: video?.dataset.clip ?? null,
    visibleFrameRetained: Boolean(video && video.readyState >= 2),
  };
})()`);
await delay(150);
failedResources.splice(expectedHeroFailureStart);
await send("Network.setBlockedURLs", { urls: [] });
await evaluate("document.querySelector('.video-retry')?.click()");
await waitFor(`document.querySelector('.hero-video.is-visible')?.dataset.clip === ${JSON.stringify(heroFailureTarget.clip)} && document.querySelector('.hero-video.is-visible')?.currentTime > 0.1 && document.querySelector('.video-retry') === null`);
await send("Network.setCacheDisabled", { cacheDisabled: false });
const heroAction = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  return { clip: video?.dataset.clip ?? null, currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true, playbackRate: video?.playbackRate ?? null, muted: video?.muted ?? null };
})()`);

await evaluate(`(() => {
  const opener = document.querySelector('.main-nav button:last-child');
  opener?.focus();
  opener?.click();
})()`);
await waitFor(`(() => {
  const dialog = document.querySelector('.index-dialog');
  const panel = document.querySelector('.index-shell');
  const rect = panel?.getBoundingClientRect();
  return Boolean(
    dialog?.open
      && dialog?.dataset.state === 'open'
      && rect
      && Math.abs(rect.right - innerWidth) < 1
      && panel?.contains(document.activeElement)
  );
})()`);
const indexOpen = await evaluate(`(() => {
  const dialog = document.querySelector('.index-dialog');
  const panel = document.querySelector('.index-shell');
  const rect = panel?.getBoundingClientRect();
  return Boolean(dialog?.open && dialog?.dataset.state === 'open' && rect && Math.abs(rect.right - innerWidth) < 1 && panel?.contains(document.activeElement));
})()`);
const indexA11yOpen = await evaluate(`({
  expanded: document.querySelector('.main-nav button:last-child')?.getAttribute('aria-expanded') ?? null,
  controls: document.querySelector('.main-nav button:last-child')?.getAttribute('aria-controls') ?? null,
  dialogId: document.querySelector('.index-dialog')?.id ?? null,
})`);
await screenshot("desktop-directory.png");
const directoryChapters = await evaluate(`[...document.querySelectorAll('.chapter-grid button')].map((button) => ({
  index: button.querySelector('span')?.textContent?.trim() ?? '',
  en: button.querySelector('strong')?.textContent?.trim() ?? '',
  zh: button.querySelector('small')?.textContent?.trim() ?? '',
}))`);
await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await waitFor("document.querySelector('.index-dialog')?.open === false && document.activeElement === document.querySelector('.main-nav button:last-child')");
const indexA11yClosed = await evaluate(`({
  expanded: document.querySelector('.main-nav button:last-child')?.getAttribute('aria-expanded') ?? null,
  openerFocused: document.activeElement === document.querySelector('.main-nav button:last-child'),
})`);
await evaluate("document.querySelector('.main-nav button:last-child')?.click()");
await waitFor("document.querySelector('.index-dialog')?.dataset.state === 'open'");
await evaluate("document.querySelector('.chapter-grid button')?.click()");
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'GALLERY'");
await waitFor(`(() => {
  const section = document.querySelector('#gallery');
  const sequence = section?.dataset.gallerySequence?.split(',').filter(Boolean) ?? [];
  const videos = [...(section?.querySelectorAll('.gallery-form-video') ?? [])];
  return videos.length >= 1 && videos.length <= 2 && sequence.length === 3 && videos.some((video) => video.classList.contains('is-active') && video.readyState >= 2);
})()`);
await waitFor("document.querySelector('.gallery-form-video.is-active')?.currentTime > 0.1");
await screenshot("desktop-gallery.png");

const galleryStart = await evaluate(`(() => {
  const section = document.querySelector('#gallery');
  const video = section?.querySelector('.gallery-form-video.is-active');
  const card = section?.querySelector('.gallery-carousel');
  const rect = card?.getBoundingClientRect();
  const sequence = section?.dataset.gallerySequence?.split(',').filter(Boolean) ?? [];
  const videos = [...(section?.querySelectorAll('.gallery-form-video') ?? [])];
  return {
    activeTitle: section?.querySelector('.gallery-card-copy h3')?.textContent?.trim() ?? '',
    sequence,
    cards: section?.querySelectorAll('.gallery-pagination button').length ?? 0,
    totalVideos: videos.length,
    renderedVideoIds: videos.map((item) => item.currentSrc.split('/').pop()?.replace('.webm', '') ?? ''),
    sideCards: section?.querySelectorAll('.gallery-side-card').length ?? 0,
    middleStatusLabels: section?.querySelectorAll('.chapter-hud-status > span').length ?? 0,
    sideFilter: getComputedStyle(section.querySelector('.gallery-side-card')).filter,
    previousLeft: Math.round(section.querySelector('.gallery-side-card--previous')?.getBoundingClientRect().left ?? -9999),
    previousRight: Math.round(section.querySelector('.gallery-side-card--previous')?.getBoundingClientRect().right ?? 9999),
    carouselLeft: Math.round(rect?.left ?? -9999),
    copyLeft: Math.round(section.querySelector('.gallery-card-copy')?.getBoundingClientRect().left ?? -9999),
    videoSrc: video?.currentSrc ?? '',
    videoReadyState: video?.readyState ?? 0,
    videoWidth: video?.videoWidth ?? 0,
    videoHeight: video?.videoHeight ?? 0,
    playbackRate: video?.playbackRate ?? null,
    muted: video?.muted ?? null,
    preloadedVideos: videos.filter((item) => item.readyState >= 2).length,
    sampledVideosReady: sequence.filter((id) => videos.some((item) => item.currentSrc.endsWith('/' + id + '.webm') && item.readyState >= 2)).length,
    currentTime: video?.currentTime ?? 0,
    paused: video?.paused ?? true,
    cardInsideViewport: Boolean(rect && rect.left < innerWidth && rect.right > 0 && rect.top < innerHeight && rect.bottom > 0),
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
  };
})()`);

const galleryContinuousPlayback = await evaluate(`new Promise((resolve) => {
  const samples = [];
  const startedAt = performance.now();
  const timer = window.setInterval(() => {
    const video = document.querySelector('.gallery-form-video.is-active');
    samples.push(video?.currentTime ?? -1);
    if (performance.now() - startedAt < 1200) return;
    window.clearInterval(timer);
    resolve({
      samples,
      duration: video?.duration ?? 0,
      loop: video?.loop ?? false,
      paused: video?.paused ?? true,
      source: video?.currentSrc ?? '',
    });
  }, 100);
})`);
const galleryEndedAdvance = await evaluate(`new Promise((resolve) => {
  const previous = document.querySelector('.gallery-form-video.is-active');
  const previousSource = previous?.currentSrc ?? '';
  const previousIndex = Number(previous?.dataset.galleryIndex ?? -1);
  let maxVisibleVideos = 0;
  let incomingStagedHidden = false;
  const startedAt = performance.now();
  if (previous && Number.isFinite(previous.duration)) previous.currentTime = Math.max(0, previous.duration - 0.12);

  const inspect = () => {
    const videos = [...document.querySelectorAll('.gallery-form-video')];
    const visible = videos.filter((video) => (
      getComputedStyle(video).visibility === 'visible' && Number(getComputedStyle(video).opacity) > 0.01
    ));
    maxVisibleVideos = Math.max(maxVisibleVideos, visible.length);
    const incoming = videos.find((video) => video.currentSrc !== previousSource);
    if (incoming && !visible.includes(incoming)) incomingStagedHidden = true;
    const active = document.querySelector('.gallery-form-video.is-active');
    if (active?.currentSrc !== previousSource && active?.readyState >= 2 && active?.currentTime > 0.03) {
      resolve({
        previousSource,
        previousIndex,
        nextSource: active.currentSrc,
        nextIndex: Number(active.dataset.galleryIndex ?? -1),
        currentTime: active.currentTime,
        loop: active.loop,
        paused: active.paused,
        maxVisibleVideos,
        incomingStagedHidden,
        previousRemoved: !videos.some((video) => video.currentSrc === previousSource),
      });
      return;
    }
    if (performance.now() - startedAt > 5000) {
      resolve({ timedOut: true, previousSource, previousIndex, maxVisibleVideos, incomingStagedHidden });
      return;
    }
    requestAnimationFrame(inspect);
  };
  inspect();
})`);
await waitFor(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return Boolean(video && getComputedStyle(video).visibility === 'visible' && Number(getComputedStyle(video).opacity) > 0.9);
})()`);

const expectedGalleryFailureStart = failedResources.length;
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Network.setBlockedURLs", { urls: ["*assets/gallery/*.webm*"] });
const galleryFailurePreviousSource = await evaluate("document.querySelector('.gallery-form-video.is-active')?.currentSrc ?? ''");
await evaluate("document.querySelector('.gallery-arrow--next')?.click()");
await waitFor("document.querySelector('.gallery-video-retry') !== null && document.querySelector('.gallery-playing')?.textContent?.trim() === 'STILL FRAME'");
const galleryFailure = await evaluate(`(() => {
  const videos = [...document.querySelectorAll('.gallery-form-video')];
  const displayed = document.querySelector('.gallery-form-video.is-active');
  const target = videos.find((video) => video !== displayed);
  const targetStyle = target ? getComputedStyle(target) : null;
  const visible = videos.filter((video) => (
    getComputedStyle(video).visibility === 'visible' && Number(getComputedStyle(video).opacity) > 0.01
  ));
  return {
    targetIndex: Number(target?.dataset.galleryIndex ?? -1),
    targetSource: target?.currentSrc ?? '',
    targetPoster: target?.poster ?? '',
    displayedSource: displayed?.currentSrc ?? '',
    retryVisible: Boolean(document.querySelector('.gallery-video-retry')),
    label: document.querySelector('.gallery-playing')?.textContent?.trim() ?? '',
    previousFrameRetained: displayed?.currentSrc === ${JSON.stringify(galleryFailurePreviousSource)},
    targetHidden: targetStyle?.visibility === 'hidden' && Number(targetStyle.opacity) === 0,
    visibleVideoCount: visible.length,
  };
})()`);
await delay(150);
failedResources.splice(expectedGalleryFailureStart);
await send("Network.setBlockedURLs", { urls: [] });
await evaluate("document.querySelector('.gallery-video-retry')?.click()");
await waitFor(`document.querySelector('.gallery-video-retry') === null && document.querySelector('.gallery-form-video.is-active')?.currentSrc === ${JSON.stringify(galleryFailure.targetSource)} && document.querySelector('.gallery-form-video.is-active')?.readyState >= 2 && document.querySelector('.gallery-form-video.is-active')?.currentTime > 0.03`);
const galleryRetry = await evaluate(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return {
    activeIndex: Number(video?.dataset.galleryIndex ?? -1),
    source: video?.currentSrc ?? '',
    currentTime: video?.currentTime ?? 0,
    paused: video?.paused ?? true,
    label: document.querySelector('.gallery-playing')?.textContent?.trim() ?? '',
  };
})()`);
await send("Network.setCacheDisabled", { cacheDisabled: false });

let galleryArrowSwitch = null;
let galleryArrowOutside = null;
for (let attempt = 0; attempt < 8; attempt += 1) {
  const previousSource = await evaluate("document.querySelector('.gallery-form-video.is-active')?.currentSrc ?? ''");
  await evaluate("document.querySelector('.gallery-arrow--next')?.click()");
  const arrowState = await evaluate(`new Promise((resolve) => {
    const startedAt = performance.now();
    let maxVisibleVideos = 0;
    let incomingStagedHidden = false;
    const inspect = () => {
      const videos = [...document.querySelectorAll('.gallery-form-video')];
      const visible = videos.filter((video) => (
        getComputedStyle(video).visibility === 'visible' && Number(getComputedStyle(video).opacity) > 0.01
      ));
      maxVisibleVideos = Math.max(maxVisibleVideos, visible.length);
      const incoming = videos.find((video) => video.currentSrc !== ${JSON.stringify(previousSource)});
      if (incoming && !visible.includes(incoming)) incomingStagedHidden = true;
      const active = document.querySelector('.gallery-form-video.is-active');
      if (active?.currentSrc !== ${JSON.stringify(previousSource)} && active?.readyState >= 2 && active?.currentTime > 0.03) {
        resolve({
          activeIndex: Number(active.dataset.galleryIndex ?? -1),
          source: active.currentSrc,
          currentTime: active.currentTime,
          paused: active.paused,
          readyState: active.readyState,
          playbackRate: active.playbackRate,
          muted: active.muted,
          maxVisibleVideos,
          incomingStagedHidden,
          previousRemoved: !videos.some((video) => video.currentSrc === ${JSON.stringify(previousSource)}),
        });
        return;
      }
      if (performance.now() - startedAt > 15000) {
        resolve({ timedOut: true, source: active?.currentSrc ?? '' });
        return;
      }
      requestAnimationFrame(inspect);
    };
    inspect();
  })`);
  galleryArrowSwitch ??= arrowState;
  if (!galleryStart.sequence.some((id) => arrowState.source.endsWith(`/${id}.webm`))) {
    galleryArrowOutside = arrowState;
    break;
  }
}

const galleryKeyboardBefore = await evaluate("document.querySelector('.gallery-form-video.is-active')?.currentSrc ?? ''");
await evaluate("document.querySelector('#gallery')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))");
await waitFor(`document.querySelector('.gallery-form-video.is-active')?.currentSrc !== ${JSON.stringify(galleryKeyboardBefore)}`);
await waitFor("document.querySelector('.gallery-form-video.is-active')?.readyState >= 2 && document.querySelector('.gallery-form-video.is-active')?.currentTime > 0.03");
const galleryKeyboardNavigation = await evaluate(`(() => {
  const videos = [...document.querySelectorAll('.gallery-form-video')];
  const active = document.querySelector('.gallery-form-video.is-active');
  return {
    activeIndex: Number(active?.dataset.galleryIndex ?? -1),
    source: active?.currentSrc ?? '',
    currentTime: active?.currentTime ?? 0,
    paused: active?.paused ?? true,
    readyState: active?.readyState ?? 0,
  };
})()`);

await evaluate("document.querySelectorAll('.gallery-pagination button')[0]?.click()");
await waitFor("document.querySelector('.gallery-pagination button[aria-current=\"true\"]') === document.querySelectorAll('.gallery-pagination button')[0]");
await waitFor(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return video?.currentSrc.endsWith('/${galleryStart.sequence[0]}.webm')
    && video.readyState >= 2
    && video.currentTime > 0.03
    && !video.paused;
})()`);
const galleryScrollBeforeThreshold = await evaluate("Math.round(scrollY)");
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 40 });
await delay(60);
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 40 });
await delay(60);
const galleryWheelThreshold = await evaluate(`({
  activeSamplePosition: [...document.querySelectorAll('.gallery-pagination button')].findIndex((button) => button.getAttribute('aria-current') === 'true'),
  nativeDelta: Math.round(scrollY) - ${galleryScrollBeforeThreshold},
})`);
await evaluate(`(() => {
  const expected = document.querySelectorAll('.gallery-pagination button')[1];
  window.__galleryWheelSwitchLatencyMs = null;
  const startedAt = performance.now();
  const observer = new MutationObserver(() => {
    if (expected?.getAttribute('aria-current') !== 'true') return;
    window.__galleryWheelSwitchLatencyMs = performance.now() - startedAt;
    observer.disconnect();
  });
  observer.observe(document.querySelector('.gallery-pagination'), {
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-current'],
  });
})()`);
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 16 });
for (let eventIndex = 0; eventIndex < 3; eventIndex += 1) {
  await delay(80);
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 120 });
}
await waitFor("document.querySelector('.gallery-pagination button[aria-current=\"true\"]') === document.querySelectorAll('.gallery-pagination button')[1]");
const galleryWheelSwitchLatencyMs = await evaluate("window.__galleryWheelSwitchLatencyMs ?? 9999");
await delay(30);
const galleryWheelBurst = await evaluate(`({
  activeSamplePosition: [...document.querySelectorAll('.gallery-pagination button')].findIndex((button) => button.getAttribute('aria-current') === 'true'),
  nativeDelta: Math.round(scrollY) - ${galleryScrollBeforeThreshold},
  pageTop: Math.round(document.querySelector('#gallery')?.getBoundingClientRect().top ?? -9999),
})`);
await waitFor(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return video?.currentSrc.endsWith('/${galleryStart.sequence[1]}.webm')
    && video.readyState >= 2
    && video.currentTime > 0.05
    && !video.paused;
})()`);
await screenshot("desktop-gallery-next.png");
const galleryNext = await evaluate(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return { title: document.querySelector('.gallery-card-copy h3')?.textContent?.trim() ?? '', source: video?.currentSrc ?? '', readyState: video?.readyState ?? 0, videoWidth: video?.videoWidth ?? 0, currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true, pageTop: Math.round(document.querySelector('#gallery')?.getBoundingClientRect().top ?? -9999) };
})()`);

const galleryPlayback = [];
galleryPlayback.push(galleryNext);
await delay(220);
const galleryScrollBeforeFinalBurst = await evaluate("Math.round(scrollY)");
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 120 });
for (let eventIndex = 0; eventIndex < 3; eventIndex += 1) {
  await delay(80);
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 120 });
}
await waitFor("document.querySelector('.gallery-pagination button[aria-current=\"true\"]') === document.querySelectorAll('.gallery-pagination button')[2]");
await delay(30);
const galleryFinalWheelBurst = await evaluate(`({
  activeSamplePosition: [...document.querySelectorAll('.gallery-pagination button')].findIndex((button) => button.getAttribute('aria-current') === 'true'),
  nativeDelta: Math.round(scrollY) - ${galleryScrollBeforeFinalBurst},
  pageTop: Math.round(document.querySelector('#gallery')?.getBoundingClientRect().top ?? -9999),
})`);
await waitFor(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return video?.currentSrc.endsWith('/${galleryStart.sequence[2]}.webm')
    && video.readyState >= 2
    && video.currentTime > 0.03
    && !video.paused;
})()`);
galleryPlayback.push(await evaluate(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return { source: video?.currentSrc ?? '', readyState: video?.readyState ?? 0, videoWidth: video?.videoWidth ?? 0, currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true };
})()`));
await delay(220);
const galleryScrollBeforeExit = await evaluate("Math.round(scrollY)");
await wheelAt(720, 500, 120);
const galleryWheelExit = await evaluate(`(() => {
  const character = document.querySelector('#character');
  const scrollPaddingTop = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return {
    activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
    scrollY: Math.round(scrollY),
    nativeDelta: Math.round(scrollY) - ${galleryScrollBeforeExit},
    characterTop: Math.round(character?.getBoundingClientRect().top ?? -9999),
    scrollPaddingTop: Math.round(scrollPaddingTop),
    galleryProgress: Number(document.querySelector('#gallery')?.dataset.forwardProgress ?? 0),
  };
})()`);

await evaluate("document.querySelector('#gallery')?.scrollIntoView({behavior:'instant', block:'start'})");
await waitFor("document.querySelector('.gallery-form-video.is-active')?.paused === false && document.querySelector('.gallery-form-video.is-active')?.currentTime > 0.05");
const galleryReverseStartedAt = await evaluate("document.querySelector('.gallery-form-video.is-active')?.currentTime ?? 0");
const galleryScrollBeforeReturn = await evaluate("Math.round(scrollY)");
await wheelAt(720, 500, -120);
const galleryWheelReturn = await evaluate(`({
  scrollY: Math.round(scrollY),
  nativeDelta: Math.round(scrollY) - ${galleryScrollBeforeReturn},
  activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
})`);
const galleryReversePlayback = await evaluate(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return {
    source: video?.currentSrc ?? '',
    currentTime: video?.currentTime ?? 0,
    paused: video?.paused ?? true,
    pageTop: Math.round(document.querySelector('#gallery')?.getBoundingClientRect().top ?? -9999),
  };
})()`);

  return {
    report: {
      portalFailure,
      portalLock,
      portalScroll,
      characterWarmup,
      galleryInitialPlayback,
      heroFailure,
      heroAction,
      indexOpen,
      directoryChapters,
      indexA11yOpen,
      indexA11yClosed,
      galleryStart,
      galleryContinuousPlayback,
      galleryEndedAdvance,
      galleryFailure,
      galleryRetry,
      galleryArrowSwitch,
      galleryArrowOutside,
      galleryKeyboardNavigation,
      galleryNext,
      galleryPlayback,
      galleryWheelThreshold,
      galleryWheelBurst,
      galleryFinalWheelBurst,
      galleryWheelSwitchLatencyMs,
      galleryWheelExit,
      galleryWheelReturn,
      galleryReversePlayback,
    },
    evidence: {
      portalStartedAt,
      galleryKeyboardBefore,
      galleryReverseStartedAt,
    },
  };
}
