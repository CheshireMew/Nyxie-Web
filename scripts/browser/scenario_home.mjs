export async function runHomeScenario(browser) {
  const { browserErrors, failedResources, siteUrl } = browser;
  const send = browser.send.bind(browser);
  const evaluate = browser.evaluate.bind(browser);
  const delay = browser.delay.bind(browser);
  const waitFor = browser.waitFor.bind(browser);
  const screenshot = browser.screenshot.bind(browser);
  const navigate = browser.navigate.bind(browser);

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
const expectedFallbackBrowserErrors = browserErrors.length;
const expectedFallbackResourceFailures = failedResources.length;
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Network.setBlockedURLs", { urls: ["*src/main.tsx*", "*assets/*.js*"] });
const fallbackUrl = `${siteUrl}/?fallback=${Date.now()}`;
await send("Page.navigate", { url: fallbackUrl });
await waitFor(`location.href === ${JSON.stringify(fallbackUrl)} && document.readyState === 'complete'`);
await delay(500);
const staticFallback = await evaluate(`(() => {
  const fallback = document.querySelector('.static-fallback');
  return {
    visible: Boolean(fallback && getComputedStyle(fallback).display !== 'none' && fallback.getBoundingClientRect().height >= innerHeight),
    title: fallback?.querySelector('h1')?.textContent?.trim() ?? '',
    links: [...(fallback?.querySelectorAll('a') ?? [])].map((link) => link.href),
    applicationAbsent: document.querySelector('.site-header') === null,
  };
})()`);
browserErrors.splice(expectedFallbackBrowserErrors);
failedResources.splice(expectedFallbackResourceFailures);
await send("Network.setBlockedURLs", { urls: [] });
await send("Network.setCacheDisabled", { cacheDisabled: false });
const bootPaintObserver = await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `(() => {
    window.__nyxieBootPaintAudit = [];
    let frames = 0;
    const sample = () => {
      const staticBoot = document.querySelector('.static-boot-screen');
      const fallback = document.querySelector('.static-fallback');
      const reactBoot = document.querySelector('.boot-screen:not(.static-boot-screen)');
      window.__nyxieBootPaintAudit.push({
        staticBootVisible: Boolean(staticBoot && getComputedStyle(staticBoot).display !== 'none'),
        fallbackVisible: Boolean(fallback && getComputedStyle(fallback).display !== 'none'),
        reactBootVisible: Boolean(reactBoot && getComputedStyle(reactBoot).visibility !== 'hidden'),
      });
      frames += 1;
      if (frames < 180) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  })();`,
});
const bootState = await navigate(true);
const bootPaint = await evaluate(`(() => {
  const samples = window.__nyxieBootPaintAudit ?? [];
  return {
    sawStaticBoot: samples.some((sample) => sample.staticBootVisible),
    sawReactBoot: samples.some((sample) => sample.reactBootVisible),
    sawFallback: samples.some((sample) => sample.fallbackVisible),
  };
})()`);
await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: bootPaintObserver.identifier });
await screenshot("desktop-home.png");
const homeResourceBudget = await evaluate(`(() => {
  const resources = performance.getEntriesByType('resource');
  const completed = resources.filter((entry) => entry.decodedBodySize > 100000);
  return {
    idleMainDownloads: completed.filter((entry) => entry.name.endsWith('/assets/media/idle-main.mp4')).length,
    idleKeyDownloads: completed.filter((entry) => entry.name.endsWith('/assets/media/idle-key.mp4')).length,
    galleryRequests: resources.filter((entry) => entry.name.includes('/assets/gallery/')).length,
    characterRequests: resources.filter((entry) => entry.name.includes('/assets/character/')).length,
    worksRequests: resources.filter((entry) => entry.name.includes('/assets/works/')).length,
    personalityVideoRequests: resources.filter((entry) => entry.name.endsWith('/assets/media/personality.webm')).length,
    bgmRequests: resources.filter((entry) => entry.name.endsWith('/assets/audio/nyxie-bgm.m4a')).length,
    galleryVideoBytes: completed.filter((entry) => entry.name.includes('/assets/gallery/') && entry.name.endsWith('.webm')).reduce((sum, entry) => sum + entry.decodedBodySize, 0),
    worksImageBytes: completed.filter((entry) => entry.name.includes('/assets/works/')).reduce((sum, entry) => sum + entry.decodedBodySize, 0),
    bgmBytes: completed.filter((entry) => entry.name.endsWith('/assets/audio/nyxie-bgm.m4a')).reduce((sum, entry) => sum + entry.decodedBodySize, 0),
  };
})()`);
await evaluate("document.querySelector('#character')?.scrollIntoView({ behavior: 'instant', block: 'start' })");
await waitFor("scrollY > 1500");
await waitFor("location.hash === '#character' && document.querySelector('.main-nav .is-active')?.textContent === 'CHARACTER'");
await send("Page.reload", { ignoreCache: true });
await delay(350);
await waitFor("performance.getEntriesByType('navigation')[0]?.type === 'reload' && document.readyState === 'complete'", 20000);
await waitFor("document.querySelector('.boot-screen')?.classList.contains('is-done') === true", 20000);
await delay(700);
const reloadEntry = await evaluate(`({
  navigationType: performance.getEntriesByType('navigation')[0]?.type ?? null,
  scrollY: Math.round(scrollY),
  hash: location.hash,
  characterTop: Math.round(document.querySelector('#character')?.getBoundingClientRect().top ?? -9999),
  restoration: history.scrollRestoration,
  activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
})`);
await screenshot("desktop-reload-home.png");
await evaluate("document.querySelector('.main-nav button:first-child')?.click()");
await waitFor("scrollY <= 4 && document.querySelector('.main-nav .is-active')?.textContent === 'HOME'");
await delay(450);
await evaluate("history.back()");
await waitFor("location.hash === '#character' && document.querySelector('.main-nav .is-active')?.textContent === 'CHARACTER' && Math.abs(document.querySelector('#character')?.getBoundingClientRect().top ?? -9999) <= 8");
const historyBack = await evaluate(`({
  hash: location.hash,
  activeSection: document.querySelector('.main-nav .is-active')?.textContent?.trim() ?? null,
  characterTop: Math.round(document.querySelector('#character')?.getBoundingClientRect().top ?? -9999),
})`);
await evaluate("history.forward()");
await waitFor("location.hash === '#home' && document.querySelector('.main-nav .is-active')?.textContent === 'HOME' && scrollY <= 4");
const historyForward = await evaluate(`({
  hash: location.hash,
  activeSection: document.querySelector('.main-nav .is-active')?.textContent?.trim() ?? null,
  scrollY: Math.round(scrollY),
})`);
const cursorTarget = await evaluate(`(() => {
  const bounds = document.querySelector('.bgm-toggle')?.getBoundingClientRect();
  return bounds ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 } : null;
})()`);
if (!cursorTarget) throw new Error("The BGM control is not available for cursor acceptance.");
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cursorTarget.x - 320, y: cursorTarget.y + 180 });
await delay(260);
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cursorTarget.x, y: cursorTarget.y });
await delay(20);
const cursorLag = await evaluate(`(() => {
  const dot = document.querySelector('.cursor-dot')?.getBoundingClientRect();
  const ringElement = document.querySelector('.cursor-ring');
  const ring = ringElement?.getBoundingClientRect();
  if (!dot || !ring) return null;
  return {
    centerDeltaX: Math.abs((dot.left + dot.width / 2) - (ring.left + ring.width / 2)),
    centerDeltaY: Math.abs((dot.top + dot.height / 2) - (ring.top + ring.height / 2)),
    centerDistance: Math.hypot(
      (dot.left + dot.width / 2) - (ring.left + ring.width / 2),
      (dot.top + dot.height / 2) - (ring.top + ring.height / 2),
    ),
    interactive: document.body.classList.contains('cursor-active'),
  };
})()`);
await delay(480);
await waitFor(`(() => {
  const dot = document.querySelector('.cursor-dot')?.getBoundingClientRect();
  const ring = document.querySelector('.cursor-ring')?.getBoundingClientRect();
  return Boolean(dot && ring && Math.hypot(
    (dot.left + dot.width / 2) - (ring.left + ring.width / 2),
    (dot.top + dot.height / 2) - (ring.top + ring.height / 2)
  ) <= 0.1);
})()`, 2500);
const cursorSettled = await evaluate(`(() => {
  const dot = document.querySelector('.cursor-dot')?.getBoundingClientRect();
  const ringElement = document.querySelector('.cursor-ring');
  const ring = ringElement?.getBoundingClientRect();
  if (!dot || !ring) return null;
  const visualTransform = getComputedStyle(ringElement, '::before').transform;
  return {
    centerDistance: Math.hypot(
      (dot.left + dot.width / 2) - (ring.left + ring.width / 2),
      (dot.top + dot.height / 2) - (ring.top + ring.height / 2),
    ),
    ringScale: visualTransform === 'none' ? 1 : new DOMMatrix(visualTransform).a,
  };
})()`);

const bgmInitial = await evaluate(`(() => {
  const audio = document.querySelector('.background-music');
  const toggle = document.querySelector('.bgm-toggle');
  return {
    source: audio?.currentSrc ?? '',
    sourceAttribute: audio?.getAttribute('src') ?? '',
    fetchedSource: performance.getEntriesByType('resource')
      .find((entry) => entry.name.endsWith('/assets/audio/nyxie-bgm.m4a'))?.name ?? '',
    duration: Number.isFinite(audio?.duration) ? audio.duration : 0,
    loop: audio?.loop ?? false,
    volume: audio?.volume ?? null,
    muted: audio?.muted ?? null,
    paused: audio?.paused ?? true,
    togglePressed: toggle?.getAttribute('aria-pressed') ?? null,
    toggleLabel: toggle?.textContent?.trim() ?? '',
  };
})()`);

await evaluate("document.querySelector('.bgm-toggle')?.click()");
await waitFor("document.querySelector('.bgm-toggle')?.getAttribute('aria-pressed') === 'true' && document.querySelector('.background-music')?.paused === false && document.querySelector('.background-music')?.currentTime > 0.05");
const bgmPlaying = await evaluate(`(() => {
  const audio = document.querySelector('.background-music');
  return {
    source: audio?.currentSrc ?? '',
    duration: audio?.duration ?? 0,
    volume: audio?.volume ?? null,
    paused: audio?.paused ?? true,
  };
})()`);
await evaluate(`(async () => {
  const audio = document.querySelector('.background-music');
  const seeked = new Promise((resolve) => audio.addEventListener('seeked', resolve, { once: true }));
  audio.currentTime = Math.max(0, audio.duration - 0.12);
  await seeked;
  await audio.play();
})()`);
await waitFor("document.querySelector('.background-music')?.paused === false && document.querySelector('.background-music')?.currentTime < 1", 4000);
const bgmLooped = await evaluate(`({
  currentTime: document.querySelector('.background-music')?.currentTime ?? 999,
  paused: document.querySelector('.background-music')?.paused ?? true,
  toggleLabel: document.querySelector('.bgm-toggle')?.textContent?.trim() ?? '',
})`);
await evaluate("document.querySelector('.bgm-toggle')?.click()");
await waitFor("document.querySelector('.bgm-toggle')?.getAttribute('aria-pressed') === 'false' && document.querySelector('.background-music')?.paused === true");
const bgmOff = await evaluate(`({
  paused: document.querySelector('.background-music')?.paused ?? false,
  source: document.querySelector('.background-music')?.currentSrc ?? '',
  sourceAttribute: document.querySelector('.background-music')?.getAttribute('src') ?? '',
  toggleLabel: document.querySelector('.bgm-toggle')?.textContent?.trim() ?? '',
})`);

const expectedFailureStart = failedResources.length;
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Network.setBlockedURLs", { urls: ["*nyxie-bgm.m4a*"] });
await evaluate("document.querySelector('.bgm-toggle')?.click()");
await waitFor("document.querySelector('.bgm-toggle')?.textContent?.includes('BGM RETRY') === true && document.querySelector('.background-music')?.paused === true");
const bgmFailure = await evaluate(`({
  paused: document.querySelector('.background-music')?.paused ?? false,
  pressed: document.querySelector('.bgm-toggle')?.getAttribute('aria-pressed') ?? null,
  label: document.querySelector('.bgm-toggle')?.textContent?.trim() ?? '',
})`);
await delay(150);
failedResources.splice(expectedFailureStart);
await send("Network.setBlockedURLs", { urls: [] });
await evaluate("document.querySelector('.bgm-toggle')?.click()");
await waitFor("document.querySelector('.bgm-toggle')?.getAttribute('aria-pressed') === 'true' && document.querySelector('.background-music')?.paused === false");
const bgmRetry = await evaluate(`({
  paused: document.querySelector('.background-music')?.paused ?? true,
  label: document.querySelector('.bgm-toggle')?.textContent?.trim() ?? '',
})`);
await evaluate("document.querySelector('.bgm-toggle')?.click()");
await waitFor("document.querySelector('.bgm-toggle')?.getAttribute('aria-pressed') === 'false'");
await send("Network.setCacheDisabled", { cacheDisabled: false });

const desktopHome = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  const ids = [...document.querySelectorAll('main > section')].map((section) => section.id);
  const ratios = Object.fromEntries(ids.slice(1).map((id) => {
    const section = document.getElementById(id);
    return [id, Number(((section?.offsetHeight ?? 0) / innerHeight).toFixed(2))];
  }));
  return {
    title: document.title,
    ids,
    ratios,
    snapType: getComputedStyle(document.documentElement).scrollSnapType,
    snapAligns: ids.map((id) => getComputedStyle(document.getElementById(id)).scrollSnapAlign),
    homeStatusLabels: document.querySelectorAll('#home .system-status > span').length,
    activeVideo: video?.dataset.clip ?? null,
    videoReadyState: video?.readyState ?? null,
    videoPlaybackRate: video?.playbackRate ?? null,
    videoMuted: video?.muted ?? null,
    allVideosMuted: [...document.querySelectorAll('video')].every((item) => item.muted),
    currentNavLabels: [...document.querySelectorAll('.main-nav [aria-current="page"]')].map((item) => item.textContent?.trim()),
    headerHeight: document.querySelector('.site-header')?.getBoundingClientRect().height ?? null,
    pageScrollbarWidth: getComputedStyle(document.documentElement).scrollbarWidth,
    pageWebkitScrollbarDisplay: getComputedStyle(document.documentElement, '::-webkit-scrollbar').display,
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
  };
})()`);

await evaluate("scrollTo({ top: 50, behavior: 'instant' })");
await delay(350);
await evaluate("scrollTo({ top: 0, behavior: 'instant' })");
const homeHeaderBoundary = await evaluate(`(() => {
  const header = document.querySelector('.site-header')?.getBoundingClientRect();
  const media = document.querySelector('.hero-media')?.getBoundingClientRect();
  return {
    headerHeight: header?.height ?? null,
    headerBottom: header?.bottom ?? null,
    mediaTop: media?.top ?? null,
    gap: header && media ? Math.max(0, media.top - header.bottom) : null,
  };
})()`);
await waitFor("window.scrollY === 0");

const blogCta = await evaluate(`(() => {
  const link = document.querySelector('.primary-button');
  return { tagName: link?.tagName ?? null, text: link?.textContent?.trim() ?? '', href: link?.href ?? null, target: link?.target ?? null };
})()`);


  return {
    staticFallback,
    bootState,
    bootPaint,
    homeResourceBudget,
    reloadEntry,
    historyBack,
    historyForward,
    cursorLag,
    cursorSettled,
    bgmInitial,
    bgmPlaying,
    bgmLooped,
    bgmOff,
    bgmFailure,
    bgmRetry,
    desktopHome,
    homeHeaderBoundary,
    blogCta,
  };
}
