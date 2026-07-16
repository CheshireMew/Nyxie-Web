import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const cdpBase = "http://127.0.0.1:9222";
const siteUrl = process.env.NYXIE_TEST_URL ?? "http://127.0.0.1:4173";
const outputDirectory = resolve("artifacts/browser-acceptance");

await mkdir(outputDirectory, { recursive: true });

const targets = await fetch(`${cdpBase}/json/list`).then((response) => response.json());
const pageTarget = targets.find((target) => target.type === "page");
if (!pageTarget) throw new Error("No browser page target is available.");

const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener("open", resolveOpen, { once: true });
  socket.addEventListener("error", rejectOpen, { once: true });
});

let commandId = 0;
const pending = new Map();
const browserErrors = [];
const failedResources = [];
let bootState = null;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
    return;
  }

  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params.exceptionDetails;
    const description = details?.exception?.description ?? details?.text ?? "Runtime exception";
    browserErrors.push(`${details?.url ?? "unknown source"}: ${description}`);
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") browserErrors.push(message.params.entry.text);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) failedResources.push(`${message.params.type}: ${message.params.errorText}`);
  if (message.method === "Network.responseReceived" && message.params.response.status >= 400) failedResources.push(`${message.params.response.status}: ${message.params.response.url}`);
});

function send(method, params = {}) {
  commandId += 1;
  const id = commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveCommand, rejectCommand) => pending.set(id, { resolve: resolveCommand, reject: rejectCommand }));
}

async function evaluate(expression, awaitPromise = true) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitFor(expression, timeout = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(expression)) return;
    await delay(150);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function screenshot(name) {
  const capture = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await writeFile(resolve(outputDirectory, name), Buffer.from(capture.data, "base64"));
}

async function scrollChapterTo(selector, progress, settleMs = 1050) {
  await evaluate(`(() => {
    const section = document.querySelector(${JSON.stringify(selector)});
    if (!section) return false;
    const top = section.getBoundingClientRect().top + scrollY;
    const travel = Math.max(0, section.offsetHeight - innerHeight);
    window.scrollTo({ top: top + travel * ${progress}, behavior: 'instant' });
    return true;
  })()`);
  await delay(settleMs);
}

async function positionChapterTop(selector, viewportTop, settleMs = 350) {
  await evaluate(`(() => {
    const section = document.querySelector(${JSON.stringify(selector)});
    if (!section) return false;
    const top = section.getBoundingClientRect().top + scrollY;
    window.scrollTo({ top: top - ${viewportTop}, behavior: 'instant' });
    return true;
  })()`);
  await delay(settleMs);
}

async function wheelAt(x, y, deltaY) {
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY });
  await delay(260);
}

async function navigate(captureBoot = false) {
  const targetUrl = `${siteUrl}/?acceptance=${Date.now()}`;
  await send("Page.navigate", { url: targetUrl });
  await waitFor(`location.href === ${JSON.stringify(targetUrl)}`);
  await waitFor("document.readyState === 'complete'");
  if (captureBoot) {
    await waitFor("Boolean(document.querySelector('.boot-screen:not(.is-done)'))");
    bootState = await evaluate(`({
      visible: getComputedStyle(document.querySelector('.boot-screen')).visibility === 'visible',
      bodyLocked: document.body.classList.contains('is-booting'),
      overflow: getComputedStyle(document.body).overflow,
      progressAnimated: getComputedStyle(document.querySelector('.boot-line span')).animationName === 'boot-scan',
    })`);
    await screenshot("desktop-boot.png");
  }
  await waitFor("document.querySelector('.boot-screen')?.classList.contains('is-done') === true", 20000);
  await delay(700);
}

await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Log.enable"), send("Network.enable")]);

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await navigate(true);
await screenshot("desktop-home.png");

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
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
  };
})()`);

const blogCta = await evaluate(`(() => {
  const link = document.querySelector('.primary-button');
  return { tagName: link?.tagName ?? null, text: link?.textContent?.trim() ?? '', href: link?.href ?? null, target: link?.target ?? null };
})()`);

await evaluate("window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true }))");
await waitFor("document.querySelector('.hero-video.is-visible')?.dataset.clip === 'portal' && document.querySelector('.hero-video.is-visible')?.currentTime > 0.25");
const portalLock = await evaluate(`(async () => {
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 240, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 220));
  const video = document.querySelector('.hero-video.is-visible');
  return {
    scrollY: Math.round(scrollY),
    clip: video?.dataset.clip ?? null,
    ended: video?.ended ?? false,
    warmup: document.documentElement.dataset.chapterWarmup ?? null,
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
    activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
    galleryTop: gallery ? Math.round(gallery.getBoundingClientRect().top) : null,
    scrollPaddingTop: Math.round(scrollPaddingTop),
  };
})()`);

await waitFor("document.querySelector('.gallery-form-video.is-active')?.currentTime > 0.1");
const galleryInitialPlayback = await evaluate(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return { source: video?.currentSrc ?? '', currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true };
})()`);

await evaluate("document.querySelector('.main-nav button:first-child')?.click()");
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'HOME'");
await evaluate("document.querySelector('.control-stack button:first-child')?.click()");
await delay(900);
const heroAction = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  return { clip: video?.dataset.clip ?? null, currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true };
})()`);

await evaluate("document.querySelector('.main-nav button:last-child')?.click()");
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
await screenshot("desktop-directory.png");
await evaluate("document.querySelector('.chapter-grid button')?.click()");
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'GALLERY'");
await waitFor("document.querySelectorAll('.gallery-form-video').length === 3 && [...document.querySelectorAll('.gallery-form-video')].every((video) => video.readyState >= 2)");
await waitFor("document.querySelector('.gallery-form-video.is-active')?.currentTime > 0.1");
await screenshot("desktop-gallery.png");

const galleryStart = await evaluate(`(() => {
  const section = document.querySelector('#gallery');
  const video = section?.querySelector('.gallery-form-video.is-active');
  const card = section?.querySelector('.gallery-carousel');
  const rect = card?.getBoundingClientRect();
  return {
    activeTitle: section?.querySelector('.gallery-card-copy h3')?.textContent?.trim() ?? '',
    sequence: section?.dataset.gallerySequence?.split(',').filter(Boolean) ?? [],
    cards: section?.querySelectorAll('.gallery-pagination button').length ?? 0,
    sideCards: section?.querySelectorAll('.gallery-side-card').length ?? 0,
    middleStatusLabels: section?.querySelectorAll('.chapter-hud-status > span').length ?? 0,
    sideFilter: getComputedStyle(section.querySelector('.gallery-side-card')).filter,
    previousLeft: Math.round(section.querySelector('.gallery-side-card--previous')?.getBoundingClientRect().left ?? -9999),
    carouselLeft: Math.round(rect?.left ?? -9999),
    videoSrc: video?.currentSrc ?? '',
    videoReadyState: video?.readyState ?? 0,
    videoWidth: video?.videoWidth ?? 0,
    videoHeight: video?.videoHeight ?? 0,
    preloadedVideos: [...(section?.querySelectorAll('.gallery-form-video') ?? [])].filter((item) => item.readyState >= 2).length,
    currentTime: video?.currentTime ?? 0,
    paused: video?.paused ?? true,
    cardInsideViewport: Boolean(rect && rect.left < innerWidth && rect.right > 0 && rect.top < innerHeight && rect.bottom > 0),
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
  };
})()`);

const galleryWheelStartedAt = Date.now();
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 120 });
await waitFor("document.querySelector('.gallery-pagination button[aria-current=\"true\"]') === document.querySelectorAll('.gallery-pagination button')[1]");
const galleryWheelSwitchLatencyMs = Date.now() - galleryWheelStartedAt;
await delay(110);
await waitFor("document.querySelector('.gallery-form-video.is-active')?.readyState >= 2 && document.querySelector('.gallery-form-video.is-active')?.currentTime > 0.05");
await screenshot("desktop-gallery-next.png");
const galleryNext = await evaluate(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return { title: document.querySelector('.gallery-card-copy h3')?.textContent?.trim() ?? '', source: video?.currentSrc ?? '', readyState: video?.readyState ?? 0, videoWidth: video?.videoWidth ?? 0, currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true, pageTop: Math.round(document.querySelector('#gallery')?.getBoundingClientRect().top ?? -9999) };
})()`);

const galleryPlayback = [];
galleryPlayback.push(galleryNext);
await wheelAt(720, 500, 120);
await waitFor("document.querySelector('.gallery-pagination button[aria-current=\"true\"]') === document.querySelectorAll('.gallery-pagination button')[2]");
await waitFor("document.querySelector('.gallery-form-video.is-active')?.readyState >= 2 && document.querySelector('.gallery-form-video.is-active')?.currentTime > 0.03");
galleryPlayback.push(await evaluate(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  return { source: video?.currentSrc ?? '', readyState: video?.readyState ?? 0, videoWidth: video?.videoWidth ?? 0, currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true };
})()`));
await evaluate("document.querySelector('.gallery-arrow--previous')?.click()");
await waitFor("document.querySelector('.gallery-pagination button[aria-current=\"true\"]') === document.querySelectorAll('.gallery-pagination button')[1]");
await delay(90);
const galleryArrowSwitch = await evaluate(`(() => {
  const videos = [...document.querySelectorAll('.gallery-form-video')];
  const active = document.querySelector('.gallery-form-video.is-active');
  const outgoing = videos.filter((video, index) => index !== 1 && getComputedStyle(video).visibility === 'visible');
  return {
    activeIndex: videos.indexOf(active),
    currentTime: active?.currentTime ?? 0,
    paused: active?.paused ?? true,
    readyState: active?.readyState ?? 0,
    outgoingStillVisible: outgoing.length > 0,
    outgoingPaused: outgoing.every((video) => video.paused),
  };
})()`);
await waitFor("document.querySelector('.gallery-form-video.is-active')?.readyState >= 2 && document.querySelector('.gallery-form-video.is-active')?.currentTime > 0");
const galleryArrowPlayback = await evaluate(`(() => {
  const active = document.querySelector('.gallery-form-video.is-active');
  return { currentTime: active?.currentTime ?? 0, paused: active?.paused ?? true, readyState: active?.readyState ?? 0 };
})()`);
await evaluate("document.querySelector('#gallery')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))");
await waitFor("document.querySelector('.gallery-pagination button[aria-current=\"true\"]') === document.querySelectorAll('.gallery-pagination button')[2]");
await waitFor("document.querySelector('.gallery-form-video.is-active')?.readyState >= 2 && document.querySelector('.gallery-form-video.is-active')?.currentTime > 0");
const galleryKeyboardReplay = await evaluate(`(() => {
  const videos = [...document.querySelectorAll('.gallery-form-video')];
  const active = document.querySelector('.gallery-form-video.is-active');
  return {
    activeIndex: videos.indexOf(active),
    source: active?.currentSrc ?? '',
    currentTime: active?.currentTime ?? 0,
    paused: active?.paused ?? true,
    readyState: active?.readyState ?? 0,
  };
})()`);
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
await delay(300);
const galleryScrollBeforeReturn = await evaluate("Math.round(scrollY)");
await wheelAt(720, 500, -120);
const galleryWheelReturn = await evaluate(`({
  scrollY: Math.round(scrollY),
  nativeDelta: Math.round(scrollY) - ${galleryScrollBeforeReturn},
  activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
})`);

await positionChapterTop('#character', 240);
const characterBeforeStage = await evaluate(`(() => {
  const section = document.querySelector('#character');
  const stage = section?.querySelector('.character-stage');
  return {
    pageTop: Math.round(section?.getBoundingClientRect().top ?? -9999),
    stageTop: Math.round(stage?.getBoundingClientRect().top ?? -9999),
    entranceState: section?.dataset.entranceState ?? null,
    performanceState: section?.dataset.performanceState ?? null,
    performanceProgress: Number(section?.dataset.forwardProgress ?? 0),
    visibleScenes: [...section.querySelectorAll('.character-scene')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  };
})()`);

await scrollChapterTo('#character', 0.38);
const characterScrollBefore = await evaluate("Math.round(scrollY)");
await wheelAt(720, 500, 120);
const characterScrollAfter = await evaluate("Math.round(scrollY)");
await screenshot("desktop-character.png");
const character = await evaluate(`({
  scenes: document.querySelectorAll('.character-scene').length,
  middleStatusLabels: document.querySelectorAll('#character .chapter-hud-status > span').length,
  activeScenes: [...document.querySelectorAll('.character-scene')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  portraitLoaded: document.querySelector('.character-portrait img')?.complete ?? false,
  detailImagesLoaded: [...document.querySelectorAll('.character-scene img')].every((node) => node.complete),
  progressTransform: getComputedStyle(document.querySelector('#character .chapter-progress-fill')).transform,
  performanceProgress: Number(document.querySelector('#character')?.dataset.forwardProgress ?? 0),
  stageTop: Math.round(document.querySelector('#character .character-stage')?.getBoundingClientRect().top ?? -9999),
  nextChapterTop: Math.round(document.querySelector('#personality')?.getBoundingClientRect().top ?? -9999),
})`);
character.internalWheelDelta = characterScrollAfter - characterScrollBefore;

await scrollChapterTo('#character', 0.99);
const nativeBoundaryDownBefore = await evaluate("Math.round(scrollY)");
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 120 });
await delay(260);
const nativeBoundaryDown = await evaluate(`(() => {
  const character = document.querySelector('#character');
  const personality = document.querySelector('#personality');
  const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const finalScene = character?.querySelector('.character-scene:last-child');
  return {
    activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
    nativeDelta: Math.round(scrollY) - ${nativeBoundaryDownBefore},
    pageTop: Math.round(personality?.getBoundingClientRect().top ?? -9999),
    padding: Math.round(padding),
    characterProgress: Number(character?.dataset.forwardProgress ?? 0),
    characterState: character?.dataset.performanceState ?? null,
    finalSceneOpacity: Number(getComputedStyle(finalScene).opacity),
  };
})()`);

await scrollChapterTo('#personality', 0);
const personalityFirstEntry = await evaluate(`(() => {
  const video = document.querySelector('.personality-video');
  return { currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true };
})()`);
const characterFinalBeforeReverse = await evaluate(`(() => {
  const section = document.querySelector('#character');
  return {
    progress: Number(section?.dataset.forwardProgress ?? 0),
    fill: getComputedStyle(section.querySelector('.chapter-progress-fill')).transform,
    scenes: [...section.querySelectorAll('.character-scene')].map((scene) => getComputedStyle(scene).opacity),
    portrait: getComputedStyle(section.querySelector('.character-portrait')).transform,
  };
})()`);
const nativeBoundaryUpBefore = await evaluate("Math.round(scrollY)");
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: -120 });
await delay(260);
const nativeBoundaryUp = await evaluate(`(() => {
  const character = document.querySelector('#character');
  return {
    activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
    nativeDelta: Math.round(scrollY) - ${nativeBoundaryUpBefore},
    pageBottom: Math.round(character?.getBoundingClientRect().bottom ?? -9999),
    viewportBottom: innerHeight,
  };
})()`);
const personalityFrozenAfterUp = await evaluate(`(() => {
  const video = document.querySelector('.personality-video');
  return { currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true };
})()`);
await scrollChapterTo('#character', 0.2);
const characterFinalAfterReverse = await evaluate(`(() => {
  const section = document.querySelector('#character');
  return {
    progress: Number(section?.dataset.forwardProgress ?? 0),
    fill: getComputedStyle(section.querySelector('.chapter-progress-fill')).transform,
    scenes: [...section.querySelectorAll('.character-scene')].map((scene) => getComputedStyle(scene).opacity),
    portrait: getComputedStyle(section.querySelector('.character-portrait')).transform,
  };
})()`);

await scrollChapterTo('#personality', 0.46);
await screenshot("desktop-personality.png");
const personality = await evaluate(`(() => {
  const video = document.querySelector('.personality-video');
  return {
    hasVideo: Boolean(video), readyState: video?.readyState ?? null, currentTime: video?.currentTime ?? null, paused: video?.paused ?? null,
    middleStatusLabels: document.querySelectorAll('#personality .chapter-hud-status > span').length,
    activeBeats: [...document.querySelectorAll('.personality-beat')].filter((node) => Number(getComputedStyle(node).opacity) > 0.55).length,
  };
})()`);

await scrollChapterTo('#links', 0.24);
await screenshot("desktop-links.png");
const links = await evaluate(`({
  inlineRows: document.querySelectorAll('#links .external-link--inline').length,
  middleStatusLabels: document.querySelectorAll('#links .chapter-hud-status > span').length,
  visibleInlineRows: [...document.querySelectorAll('#links .external-link--inline')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  hrefs: [...document.querySelectorAll('#links a.external-link--inline[href]')].map((node) => node.href),
  characterLoaded: document.querySelector('#links .links-character')?.complete ?? false,
  drawerInsideLinks: Boolean(document.querySelector('#links .links-drawer')),
})`);

await scrollChapterTo('#works', 0.48, 350);
await screenshot("desktop-works.png");
const works = await evaluate(`({
  featured: document.querySelectorAll('#works .work-showcase').length,
  finalStatusLabels: document.querySelectorAll('#works .chapter-hud-status > span').length,
  realLinks: document.querySelectorAll('#works a.work-showcase[href]').length,
  desktopImageLoaded: document.querySelector('#works .work-showcase-screen img')?.complete ?? false,
  mobileImageLoaded: document.querySelector('#works .work-showcase-mobile img')?.complete ?? false,
  characterLoaded: document.querySelector('#works .works-character')?.complete ?? false,
  drawerInsideWorks: document.querySelector('.links-drawer')?.closest('section')?.id === 'works',
  drawerOpacity: Number(getComputedStyle(document.querySelector('.links-drawer')).opacity),
})`);

await scrollChapterTo('#works', 1, 0);
await waitFor("Number(document.querySelector('#works')?.dataset.forwardProgress ?? 0) >= 0.999");
await wheelAt(720, 500, 120);
await waitFor("document.querySelector('#works')?.dataset.drawerState === 'settled'");
await screenshot("desktop-works-open.png");
const worksEnd = await evaluate(`(() => {
  const drawer = document.querySelector('.links-drawer');
  const drawerRect = drawer?.getBoundingClientRect();
  const button = document.querySelector('.works-page-back');
  const buttonRect = button?.getBoundingClientRect();
  const progressRect = document.querySelector('#works .chapter-progress-track')?.getBoundingClientRect();
  const works = document.querySelector('#works');
  return {
    rows: document.querySelectorAll('#works .external-link--drawer').length,
    visibleRows: [...document.querySelectorAll('#works .external-link--drawer')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
    hrefs: [...document.querySelectorAll('#works a.external-link--drawer[href]')].map((node) => node.href),
    onlineStatus: document.querySelector('.links-drawer-status')?.textContent?.trim() ?? '',
    drawerVisible: Boolean(drawerRect && Number(getComputedStyle(drawer).opacity) > 0.9 && drawerRect.top < innerHeight && drawerRect.bottom > 0),
    drawerCenterDelta: drawerRect ? { x: Math.round(Math.abs(drawerRect.left + drawerRect.width / 2 - document.documentElement.clientWidth / 2)), y: Math.round(Math.abs(drawerRect.top + drawerRect.height / 2 - innerHeight / 2)) } : null,
    backVisible: Boolean(buttonRect && Number(getComputedStyle(button).opacity) > 0.75 && buttonRect.top < innerHeight && buttonRect.bottom > 0),
    backBelowProgress: Boolean(buttonRect && progressRect && buttonRect.top > progressRect.bottom),
    backCenterDelta: buttonRect ? Math.round(Math.abs(buttonRect.left + buttonRect.width / 2 - document.documentElement.clientWidth / 2)) : null,
    backInsideWorks: button?.closest('section')?.id === 'works',
    footerAbsent: document.querySelector('.site-footer') === null,
    pageEndsWithWorks: works ? Math.abs(document.body.scrollHeight - (works.offsetTop + works.offsetHeight)) <= 1 : false,
  };
})()`);

const completedChapterProgress = await evaluate(`Object.fromEntries(['character', 'personality', 'links', 'works'].map((id) => [id, Number(document.getElementById(id)?.dataset.forwardProgress ?? 0)]))`);
const worksFinalBeforeReverse = await evaluate(`(() => {
  const section = document.querySelector('#works');
  return {
    progress: Number(section?.dataset.forwardProgress ?? 0),
    drawerOpacity: getComputedStyle(section.querySelector('.links-drawer')).opacity,
    drawerTransform: getComputedStyle(section.querySelector('.links-drawer')).transform,
    backOpacity: getComputedStyle(section.querySelector('.works-page-back')).opacity,
  };
})()`);
const worksReverseBefore = await evaluate("Math.round(scrollY)");
await wheelAt(720, 500, -120);
const worksFinalAfterReverse = await evaluate(`(() => {
  const section = document.querySelector('#works');
  return {
    progress: Number(section?.dataset.forwardProgress ?? 0),
    drawerOpacity: getComputedStyle(section.querySelector('.links-drawer')).opacity,
    drawerTransform: getComputedStyle(section.querySelector('.links-drawer')).transform,
    backOpacity: getComputedStyle(section.querySelector('.works-page-back')).opacity,
  };
})()`);
const worksReverseNativeDelta = await evaluate(`Math.round(scrollY) - ${worksReverseBefore}`);

await evaluate("document.querySelector('.works-page-back')?.click()");
await waitFor("window.scrollY <= 4 && document.querySelector('.main-nav .is-active')?.textContent === 'HOME'");
const backHome = await evaluate(`({ scrollY: Math.round(scrollY), activeNav: document.querySelector('.main-nav .is-active')?.textContent ?? null })`);

const talkStartedAt = Date.now();
await evaluate("document.querySelector('.talk-button')?.click()");
await waitFor("document.querySelector('.talk-dialog')?.dataset.state === 'open'");
const talkLatencyMs = Date.now() - talkStartedAt;
const talkOpen = await evaluate("document.querySelector('.talk-dialog')?.open === true");
await evaluate("document.querySelector('.talk-head button')?.click()");
await waitFor("document.querySelector('.talk-dialog')?.open === false");

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await navigate();
await screenshot("mobile-home.png");
const mobileHome = await evaluate(`({ bodyWidth: document.body.scrollWidth, viewportWidth: innerWidth, menuVisible: getComputedStyle(document.querySelector('.menu-button')).display })`);

await scrollChapterTo('#gallery', 0.24);
await waitFor("document.querySelector('.gallery-form-video.is-active')?.readyState >= 2");
await screenshot("mobile-gallery.png");
const mobileGallery = await evaluate(`(() => {
  const video = document.querySelector('.gallery-form-video.is-active');
  const card = document.querySelector('.gallery-carousel')?.getBoundingClientRect();
  return {
    bodyWidth: document.body.scrollWidth, viewportWidth: innerWidth,
    cards: document.querySelectorAll('.gallery-pagination button').length,
    videoReadyState: video?.readyState ?? 0, videoWidth: video?.videoWidth ?? 0,
    cardInsideViewport: Boolean(card && card.left < innerWidth && card.right > 0 && card.top < innerHeight && card.bottom > 0),
  };
})()`);

await scrollChapterTo('#character', 0.38);
const mobileCharacter = await evaluate(`({
  bodyWidth: document.body.scrollWidth, viewportWidth: innerWidth, scenes: document.querySelectorAll('.character-scene').length,
  activeScenes: [...document.querySelectorAll('.character-scene')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
})`);

await scrollChapterTo('#personality', 0.46);
const mobilePersonality = await evaluate(`({
  bodyWidth: document.body.scrollWidth, viewportWidth: innerWidth,
  videoReadyState: document.querySelector('.personality-video')?.readyState ?? null,
  activeBeats: [...document.querySelectorAll('.personality-beat')].filter((node) => Number(getComputedStyle(node).opacity) > 0.55).length,
})`);

await scrollChapterTo('#links', 0.24);
await screenshot("mobile-links.png");
const mobileLinks = await evaluate(`({
  bodyWidth: document.body.scrollWidth, viewportWidth: innerWidth,
  inlineRows: document.querySelectorAll('#links .external-link--inline').length,
  visibleRows: [...document.querySelectorAll('#links .external-link--inline')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  drawerInsideLinks: Boolean(document.querySelector('#links .links-drawer')),
})`);

await scrollChapterTo('#works', 1, 0);
await waitFor("Number(document.querySelector('#works')?.dataset.forwardProgress ?? 0) >= 0.999");
await wheelAt(195, 422, 120);
await waitFor("document.querySelector('#works')?.dataset.drawerState === 'settled'");
await screenshot("mobile-works-open.png");
const mobileWorks = await evaluate(`(() => {
  const drawer = document.querySelector('.links-drawer');
  const drawerRect = drawer?.getBoundingClientRect();
  const buttonRect = document.querySelector('.works-page-back')?.getBoundingClientRect();
  const progressRect = document.querySelector('#works .chapter-progress-track')?.getBoundingClientRect();
  return {
    bodyWidth: document.body.scrollWidth, viewportWidth: innerWidth,
    featured: document.querySelectorAll('#works .work-showcase').length,
    rows: document.querySelectorAll('#works .external-link--drawer').length,
    visibleRows: [...document.querySelectorAll('#works .external-link--drawer')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
    drawerVisible: Boolean(drawerRect && Number(getComputedStyle(drawer).opacity) > 0.9 && drawerRect.top >= 0 && drawerRect.bottom <= innerHeight),
    drawerCenterDelta: drawerRect ? Math.round(Math.abs(drawerRect.left + drawerRect.width / 2 - document.documentElement.clientWidth / 2)) : null,
    backVisible: Boolean(buttonRect && Number(getComputedStyle(document.querySelector('.works-page-back')).opacity) > 0.75 && buttonRect.top < innerHeight && buttonRect.bottom > 0),
    backBelowProgress: Boolean(buttonRect && progressRect && buttonRect.top > progressRect.bottom),
    backCenterDelta: buttonRect ? Math.round(Math.abs(buttonRect.left + buttonRect.width / 2 - document.documentElement.clientWidth / 2)) : null,
  };
})()`);

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await navigate();
await evaluate("document.querySelector('#gallery')?.scrollIntoView({behavior:'instant', block:'start'})");
await delay(500);
await screenshot("reduced-motion-gallery.png");
const reducedGallery = await evaluate(`({
  usesPoster: Boolean(document.querySelector('#gallery .gallery-media > img')),
  hasVideo: Boolean(document.querySelector('#gallery .gallery-media video')),
  posterLoaded: document.querySelector('#gallery .gallery-media > img')?.complete ?? false,
  cards: document.querySelectorAll('#gallery .gallery-pagination button').length,
})`);

await evaluate("document.querySelector('.links-drawer')?.scrollIntoView({behavior:'instant', block:'center'})");
await delay(500);
await screenshot("reduced-motion-works.png");
const reducedWorks = await evaluate(`(() => {
  const drawer = document.querySelector('.links-drawer');
  const rect = drawer?.getBoundingClientRect();
  return {
    drawerVisible: Boolean(rect && Number(getComputedStyle(drawer).opacity) === 1 && rect.top < innerHeight && rect.bottom > 0),
    rows: document.querySelectorAll('#works .external-link--drawer').length,
    workVisible: Number(getComputedStyle(document.querySelector('#works .work-showcase')).opacity) === 1,
    backInsideWorks: document.querySelector('.works-page-back')?.closest('section')?.id === 'works',
    personalityUsesPoster: Boolean(document.querySelector('.personality-poster')),
    cursorHidden: getComputedStyle(document.querySelector('.cursor-ring')).display === 'none',
  };
})()`);
await send("Emulation.setEmulatedMedia", { media: "screen", features: [] });

await send("Emulation.setDeviceMetricsOverride", { width: 2048, height: 950, deviceScaleFactor: 1, mobile: false });
await navigate();
await evaluate("document.querySelector('#gallery')?.scrollIntoView({behavior:'instant', block:'start'})");
await waitFor("document.querySelector('.gallery-form-video.is-active')?.readyState >= 2");
await delay(500);
await screenshot("wide-gallery.png");
const wideGallery = await evaluate(`(() => {
  const previous = document.querySelector('.gallery-side-card--previous')?.getBoundingClientRect();
  const carousel = document.querySelector('.gallery-carousel')?.getBoundingClientRect();
  const header = document.querySelector('.site-header')?.getBoundingClientRect();
  return {
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
    previousLeft: Math.round(previous?.left ?? -9999),
    carouselLeft: Math.round(carousel?.left ?? -9999),
    carouselTop: Math.round(carousel?.top ?? -9999),
    headerBottom: Math.round(header?.bottom ?? -9999),
    cards: document.querySelectorAll('.gallery-pagination button').length,
  };
})()`);

const report = {
  bootState, desktopHome, blogCta, portalLock, portalScroll, heroAction, indexOpen, galleryInitialPlayback, galleryStart, galleryArrowSwitch, galleryArrowPlayback, galleryKeyboardReplay, galleryNext, galleryPlayback, galleryWheelSwitchLatencyMs, galleryWheelExit, galleryWheelReturn,
  characterBeforeStage, character, nativeBoundaryDown, personalityFirstEntry, nativeBoundaryUp, characterFinalBeforeReverse, characterFinalAfterReverse, personalityFrozenAfterUp, personality, links, works, worksEnd, completedChapterProgress, worksFinalBeforeReverse, worksFinalAfterReverse, worksReverseNativeDelta, backHome, talkOpen, talkLatencyMs,
  mobileHome, mobileGallery, mobileCharacter, mobilePersonality, mobileLinks, mobileWorks,
  reducedGallery, reducedWorks, wideGallery, browserErrors, failedResources,
};

await writeFile(resolve(outputDirectory, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();

const ratios = desktopHome.ratios;
const checks = [
  [desktopHome.title.includes("夜希"), "page title"],
  [bootState?.visible && bootState?.bodyLocked && bootState?.overflow === "hidden" && bootState?.progressAnimated, "boot state"],
  [JSON.stringify(desktopHome.ids) === JSON.stringify(["home", "gallery", "character", "personality", "links", "works"]), "six-section order"],
  [ratios.gallery === 1 && ratios.character === 1.72 && ratios.personality === 1.56 && ratios.links === 1.3 && ratios.works === 1.42, "only chapters with internal performances receive a declared scroll runway"],
  [desktopHome.snapType === "none" && desktopHome.snapAligns.every((value) => value === "none"), "native page snapping is disabled inside chapters"],
  [desktopHome.homeStatusLabels === 3, "home status labels are preserved"],
  [desktopHome.bodyWidth <= desktopHome.viewportWidth && desktopHome.videoReadyState >= 2 && Boolean(desktopHome.activeVideo), "desktop home media"],
  [blogCta.tagName === "A" && blogCta.text.includes("跳进兔子洞") && blogCta.href === "https://blog.blacknico.com/" && blogCta.target === "_blank", "home blog call to action"],
  [portalLock.clip === "portal" && !portalLock.ended && portalLock.scrollY <= 4, "portal playback holds the first scroll"],
  [portalScroll.clip === "portal" && portalScroll.ended && portalScroll.activeSection === "GALLERY" && Math.abs(portalScroll.galleryTop - portalScroll.scrollPaddingTop) <= 4 && portalScroll.warmup === "ready", "portal playback settles on Gallery and chapter warmup completes"],
  [galleryInitialPlayback.currentTime > 0 && !galleryInitialPlayback.paused, "Gallery first form starts on the first downward entry"],
  [Boolean(heroAction.clip) && heroAction.currentTime > 0 && !heroAction.paused, "hero action playback"],
  [indexOpen, "directory opens"],
  [galleryStart.cards === 3 && galleryStart.sequence.length === 3 && new Set(galleryStart.sequence).size === 3 && galleryStart.sideCards === 2 && galleryStart.middleStatusLabels === 0 && galleryStart.preloadedVideos === 3 && galleryStart.sequence.some((id) => galleryStart.videoSrc.endsWith(`${id}.webm`)) && galleryStart.videoReadyState >= 2 && galleryStart.videoWidth === 848 && galleryStart.videoHeight === 1072 && galleryStart.currentTime > 0 && !galleryStart.paused && galleryStart.cardInsideViewport && galleryStart.bodyWidth <= galleryStart.viewportWidth, "Gallery random three-form preload and playback"],
  [galleryStart.sideFilter.includes("blur") && !galleryStart.sideFilter.includes("grayscale") && !galleryStart.sideFilter.includes("saturate") && galleryStart.previousLeft >= -5 && galleryStart.carouselLeft > 540, "Gallery side figures keep their color while remaining visually secondary"],
  [galleryArrowSwitch.activeIndex === 1 && galleryArrowSwitch.outgoingStillVisible && galleryArrowSwitch.outgoingPaused && galleryArrowPlayback.readyState >= 2 && galleryArrowPlayback.currentTime > 0 && !galleryArrowPlayback.paused, "Gallery arrow switch fades a paused previous frame while the next form starts"],
  [galleryKeyboardReplay.activeIndex === 2 && galleryKeyboardReplay.source === galleryPlayback[1].source && galleryKeyboardReplay.readyState >= 2 && galleryKeyboardReplay.currentTime > 0 && !galleryKeyboardReplay.paused, "Gallery keyboard return replays an already viewed form"],
  [galleryNext.source.endsWith(`${galleryStart.sequence[1]}.webm`) && galleryNext.currentTime > 0 && !galleryNext.paused && Math.abs(galleryNext.pageTop - portalScroll.scrollPaddingTop) <= 4, "Gallery first wheel switches form without leaving the page"],
  [galleryWheelSwitchLatencyMs <= 250, "Gallery wheel switch responds without waiting for video completion"],
  [galleryPlayback.length === 2 && galleryPlayback.every((video, index) => video.source.endsWith(`${galleryStart.sequence[index + 1]}.webm`) && video.readyState >= 2 && video.videoWidth === 848 && video.currentTime > 0 && !video.paused), "Gallery wheel plays the remaining sampled forms"],
  [galleryWheelExit.nativeDelta >= 40 && galleryWheelExit.nativeDelta <= 200 && Math.abs(galleryWheelExit.characterTop - galleryWheelExit.scrollPaddingTop) > 100 && galleryWheelExit.galleryProgress === 1, "Gallery releases the wheel to native scrolling after all three sampled forms"],
  [galleryWheelReturn.nativeDelta <= -40 && galleryWheelReturn.scrollY > 4, "Gallery upward wheel uses native scrolling without forced navigation"],
  [characterBeforeStage.pageTop === 240 && characterBeforeStage.stageTop === 240 && characterBeforeStage.performanceState === "staged" && characterBeforeStage.performanceProgress === 0 && characterBeforeStage.visibleScenes === 0, "chapter entry cannot start its internal performance before the page is fully staged"],
  [character.scenes === 4 && character.middleStatusLabels === 0 && character.internalWheelDelta >= 40 && character.activeScenes >= 1 && character.portraitLoaded && character.detailImagesLoaded && character.progressTransform !== "none" && character.performanceProgress > 0 && character.performanceProgress < 1 && character.stageTop === 0 && character.nextChapterTop >= 1000, "internal performance runs only on a full sticky stage while the next chapter stays hidden"],
  [nativeBoundaryDown.nativeDelta >= 40 && nativeBoundaryDown.nativeDelta <= 200 && Math.abs(nativeBoundaryDown.pageTop - nativeBoundaryDown.padding) > 200, "downward chapter boundary remains at the native wheel position"],
  [nativeBoundaryDown.characterProgress >= 0.999 && nativeBoundaryDown.characterState === "settled" && nativeBoundaryDown.finalSceneOpacity > 0.9 && nativeBoundaryDown.pageTop < 1000, "Character final scene is settled before the next chapter becomes visible"],
  [nativeBoundaryUp.nativeDelta <= -40 && Math.abs(nativeBoundaryUp.pageBottom - nativeBoundaryUp.viewportBottom) > 200, "upward chapter boundary remains at the native wheel position"],
  [characterFinalBeforeReverse.progress >= 0.999 && JSON.stringify(characterFinalAfterReverse) === JSON.stringify(characterFinalBeforeReverse), "Character animation remains at its furthest state while scrolling upward"],
  [personality.hasVideo && personality.middleStatusLabels === 0 && personality.readyState >= 2 && personalityFirstEntry.currentTime > 0 && !personalityFirstEntry.paused && personalityFrozenAfterUp.paused && personality.paused && Math.abs(personality.currentTime - personalityFrozenAfterUp.currentTime) < 0.08 && personality.activeBeats >= 1, "Personality video plays once downward and stays frozen on reverse scrolling"],
  [links.inlineRows === 2 && links.middleStatusLabels === 0 && links.visibleInlineRows === 2 && links.hrefs[0] === "https://github.com/CheshireMew" && links.hrefs[1] === "https://blog.blacknico.com/" && links.characterLoaded && !links.drawerInsideLinks, "Links page preserved"],
  [works.featured === 1 && works.finalStatusLabels === 3 && works.realLinks === 1 && works.desktopImageLoaded && works.mobileImageLoaded && works.characterLoaded && works.drawerInsideWorks && works.drawerOpacity < 0.45, "Works content before drawer"],
  [worksEnd.rows === 2 && worksEnd.visibleRows === 2 && worksEnd.hrefs[0] === "https://github.com/CheshireMew" && worksEnd.hrefs[1] === "https://blog.blacknico.com/" && worksEnd.onlineStatus.includes("2 CHANNELS ONLINE"), "final link drawer content"],
  [worksEnd.drawerVisible && worksEnd.drawerCenterDelta?.x <= 2 && worksEnd.drawerCenterDelta?.y <= 3, "centered drawer reveal at final page"],
  [worksEnd.backVisible && worksEnd.backBelowProgress && worksEnd.backCenterDelta <= 2 && worksEnd.backInsideWorks && worksEnd.footerAbsent && worksEnd.pageEndsWithWorks, "centered back button below final progress"],
  [Object.values(completedChapterProgress).every((progress) => progress >= 0.98), "all scroll chapters advance their shared forward-only progress"],
  [worksReverseNativeDelta <= -40 && JSON.stringify(worksFinalAfterReverse) === JSON.stringify(worksFinalBeforeReverse), "Works final state remains fixed without delaying upward native scrolling"],
  [backHome.scrollY <= 4 && backHome.activeNav === "HOME", "back to home"],
  [talkOpen && talkLatencyMs < 1000, "talk panel response"],
  [mobileHome.bodyWidth <= mobileHome.viewportWidth && mobileHome.menuVisible !== "none", "mobile home layout"],
  [mobileGallery.bodyWidth <= mobileGallery.viewportWidth && mobileGallery.cards === 3 && mobileGallery.videoReadyState >= 2 && mobileGallery.videoWidth === 848 && mobileGallery.cardInsideViewport, "mobile Gallery layout"],
  [mobileCharacter.bodyWidth <= mobileCharacter.viewportWidth && mobileCharacter.scenes === 4 && mobileCharacter.activeScenes >= 1, "mobile character layout"],
  [mobilePersonality.bodyWidth <= mobilePersonality.viewportWidth && mobilePersonality.videoReadyState >= 2 && mobilePersonality.activeBeats >= 1, "mobile personality layout"],
  [mobileLinks.bodyWidth <= mobileLinks.viewportWidth && mobileLinks.inlineRows === 2 && mobileLinks.visibleRows === 2 && !mobileLinks.drawerInsideLinks, "mobile Links layout"],
  [mobileWorks.bodyWidth <= mobileWorks.viewportWidth && mobileWorks.featured === 1 && mobileWorks.rows === 2 && mobileWorks.visibleRows === 2 && mobileWorks.drawerVisible && mobileWorks.drawerCenterDelta <= 2 && mobileWorks.backVisible && mobileWorks.backBelowProgress && mobileWorks.backCenterDelta <= 2, "mobile final Works layout"],
  [reducedGallery.usesPoster && !reducedGallery.hasVideo && reducedGallery.posterLoaded && reducedGallery.cards === 3, "reduced-motion Gallery poster path"],
  [reducedWorks.drawerVisible && reducedWorks.rows === 2 && reducedWorks.workVisible && reducedWorks.backInsideWorks && reducedWorks.personalityUsesPoster && reducedWorks.cursorHidden, "reduced-motion content path"],
  [wideGallery.bodyWidth <= wideGallery.viewportWidth && wideGallery.previousLeft >= -5 && wideGallery.carouselLeft > 820 && wideGallery.carouselTop > wideGallery.headerBottom + 40 && wideGallery.cards === 3, "wide Gallery layout matches the reported viewport"],
  [browserErrors.length === 0, "browser console"],
  [failedResources.length === 0, "resource loading"],
];

const failedChecks = checks.filter(([passed]) => !passed).map(([, label]) => label);
if (failedChecks.length) throw new Error(`Acceptance failed: ${failedChecks.join(", ")}`);
