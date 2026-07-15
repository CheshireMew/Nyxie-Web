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
    browserErrors.push(message.params.exceptionDetails?.text ?? "Runtime exception");
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    browserErrors.push(message.params.entry.text);
  }
  if (message.method === "Network.loadingFailed" && !message.params.canceled) {
    failedResources.push(`${message.params.type}: ${message.params.errorText}`);
  }
  if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
    failedResources.push(`${message.params.response.status}: ${message.params.response.url}`);
  }
});

function send(method, params = {}) {
  commandId += 1;
  const id = commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveCommand, rejectCommand) => {
    pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
  });
}

async function evaluate(expression, awaitPromise = true) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function delay(milliseconds) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function scrollChapterTo(selector, progress) {
  await evaluate(`(() => {
    const section = document.querySelector(${JSON.stringify(selector)});
    if (!section) return false;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const travel = Math.max(0, section.offsetHeight - innerHeight);
    window.scrollTo({ top: sectionTop + travel * ${progress}, behavior: 'instant' });
    return true;
  })()`);
  await delay(1050);
}

async function waitFor(expression, timeout = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(expression)) return;
    await delay(150);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function screenshot(name) {
  const capture = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(resolve(outputDirectory, name), Buffer.from(capture.data, "base64"));
}

async function navigate(url, captureBoot = false) {
  const targetUrl = `${url}/?acceptance=${Date.now()}`;
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

await Promise.all([
  send("Page.enable"),
  send("Runtime.enable"),
  send("Log.enable"),
  send("Network.enable"),
]);

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await navigate(siteUrl, true);
await screenshot("desktop-home.png");

const desktopHome = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  return {
    title: document.title,
    sectionCount: document.querySelectorAll('main > section').length,
    activeVideo: video?.dataset.clip ?? null,
    videoReadyState: video?.readyState ?? null,
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
    heroHeight: document.querySelector('#home')?.getBoundingClientRect().height ?? 0,
  };
})()`);

const chapterScroll = await evaluate(`(() => {
  const ratios = Object.fromEntries(['character', 'personality', 'works', 'links'].map((id) => {
    const section = document.getElementById(id);
    return [id, Number(((section?.offsetHeight ?? 0) / innerHeight).toFixed(2))];
  }));
  return { ...ratios, total: Number(Object.values(ratios).reduce((sum, value) => sum + value, 0).toFixed(2)) };
})()`);

const pastedAccessoryCount = await evaluate(`[
  'works-moon-chain.webp',
  'works-gem.webp',
  'links-star-chain.webp',
].filter((fileName) => [...document.images].some((image) => image.currentSrc.includes(fileName))).length`);

await evaluate("window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true }))");
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'CHARACTER'", 18000);
const portalScroll = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  return {
    clip: video?.dataset.clip ?? null,
    ended: video?.ended ?? false,
    currentTime: video?.currentTime ?? 0,
    duration: video?.duration ?? 0,
    scrollY: Math.round(window.scrollY),
  };
})()`);
await evaluate("document.querySelector('#home')?.scrollIntoView({behavior:'instant'})");
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'HOME'");
await delay(850);

const blogCta = await evaluate(`(() => {
  const link = document.querySelector('.primary-button');
  return {
    tagName: link?.tagName ?? null,
    text: link?.textContent?.trim() ?? '',
    href: link?.href ?? null,
    target: link?.target ?? null,
  };
})()`);
await evaluate("document.querySelector('.control-stack button:first-child')?.click()");
await delay(950);
const heroAction = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  return {
    clip: video?.dataset.clip ?? null,
    currentTime: video?.currentTime ?? 0,
    paused: video?.paused ?? true,
    status: document.querySelector('.control-caption span')?.textContent ?? '',
  };
})()`);

await evaluate("document.querySelector('.main-nav button:last-child')?.click()");
await waitFor("document.querySelector('.index-dialog')?.open === true");
await delay(350);
const indexOpen = await evaluate(`(() => {
  const dialog = document.querySelector('.index-dialog');
  const panel = document.querySelector('.index-shell');
  const rect = panel?.getBoundingClientRect();
  return Boolean(dialog?.open && dialog?.dataset.state === 'open' && rect && Math.abs(rect.right - innerWidth) < 1 && panel?.contains(document.activeElement));
})()`);
await screenshot("desktop-directory.png");
await evaluate("document.querySelector('.chapter-grid button')?.click()");
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'CHARACTER'");
await delay(900);
await screenshot("desktop-character.png");
const directoryNavigation = await evaluate(`({
  dialogOpen: document.querySelector('.index-dialog')?.open ?? false,
  scrollY: Math.round(window.scrollY),
  activeNav: document.querySelector('.main-nav .is-active')?.textContent ?? null,
})`);
const characterStart = await evaluate(`({
  titleTransform: getComputedStyle(document.querySelector('.character-stage-title')).transform,
  portraitTransform: getComputedStyle(document.querySelector('.character-portrait')).transform,
})`);
await scrollChapterTo('#character', 0.38);
await screenshot("desktop-character-scene.png");
const character = await evaluate(`({
  scenes: document.querySelectorAll('.character-scene').length,
  activeScenes: [...document.querySelectorAll('.character-scene')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  portraitLoaded: document.querySelector('.character-portrait img')?.complete ?? false,
  detailImagesLoaded: [...document.querySelectorAll('.character-scene img')].every((node) => node.complete),
  titleTransform: getComputedStyle(document.querySelector('.character-stage-title')).transform,
  portraitTransform: getComputedStyle(document.querySelector('.character-portrait')).transform,
  progressTransform: getComputedStyle(document.querySelector('#character .chapter-progress-fill')).transform,
})`);

await scrollChapterTo('#personality', 0.08);
await screenshot("desktop-personality.png");
const personalityStart = await evaluate(`({
  copyTransform: getComputedStyle(document.querySelector('.personality-copy')).transform,
  mediaTransform: getComputedStyle(document.querySelector('.personality-media')).transform,
  beatOpacities: [...document.querySelectorAll('.personality-beat')].map((node) => getComputedStyle(node).opacity),
})`);
await scrollChapterTo('#personality', 0.46);
await screenshot("desktop-personality-reaction.png");
const personality = await evaluate(`(() => {
  const video = document.querySelector('.personality-video');
  const media = document.querySelector('.personality-media');
  return {
    hasVideo: Boolean(video),
    readyState: video?.readyState ?? null,
    currentTime: video?.currentTime ?? null,
    paused: video?.paused ?? null,
    mediaHeight: Math.round(media?.getBoundingClientRect().height ?? 0),
    copyTransform: getComputedStyle(document.querySelector('.personality-copy')).transform,
    mediaTransform: getComputedStyle(media).transform,
    beatOpacities: [...document.querySelectorAll('.personality-beat')].map((node) => getComputedStyle(node).opacity),
    activeBeats: [...document.querySelectorAll('.personality-beat')].filter((node) => Number(getComputedStyle(node).opacity) > 0.55).length,
  };
})()`);

await scrollChapterTo('#works', 0.08);
await screenshot("desktop-works.png");
const worksStart = await evaluate(`({
  showcaseTransform: getComputedStyle(document.querySelector('.work-showcase')).transform,
  characterTransform: getComputedStyle(document.querySelector('#works .works-character')).transform,
})`);
await scrollChapterTo('#works', 0.56);
await screenshot("desktop-works-focus.png");
const works = await evaluate(`({
  featured: document.querySelectorAll('.work-showcase').length,
  realLinks: document.querySelectorAll('a.work-showcase[href]').length,
  desktopImageLoaded: document.querySelector('.work-showcase-screen img')?.complete ?? false,
  mobileImageLoaded: document.querySelector('.work-showcase-mobile img')?.complete ?? false,
  characterLoaded: document.querySelector('.works-character')?.complete ?? false,
  characterVisible: (() => {
    const rect = document.querySelector('#works .works-character')?.getBoundingClientRect();
    return Boolean(rect && rect.top < innerHeight && rect.bottom > 0);
  })(),
  showcaseTransform: getComputedStyle(document.querySelector('.work-showcase')).transform,
  characterTransform: getComputedStyle(document.querySelector('#works .works-character')).transform,
  escapedMarkupVisible: document.body.innerText.includes('&lt;') || document.body.innerText.includes('&gt;'),
})`);

await scrollChapterTo('#links', 0.08);
await screenshot("desktop-links.png");
const linksStart = await evaluate(`({
  characterTransform: getComputedStyle(document.querySelector('#links .links-character')).transform,
  portalTransform: getComputedStyle(document.querySelector('.links-portal')).transform,
  inlineRows: document.querySelectorAll('.external-link--inline').length,
  visibleInlineRows: [...document.querySelectorAll('.external-link--inline')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  inlineRealLinks: document.querySelectorAll('a.external-link--inline[href]').length,
  drawerTransform: getComputedStyle(document.querySelector('.links-drawer')).transform,
  drawerOpacity: Number(getComputedStyle(document.querySelector('.links-drawer')).opacity),
  drawerTop: Math.round(document.querySelector('.links-drawer')?.getBoundingClientRect().top ?? 0),
})`);
await scrollChapterTo('#links', 0.96);
await screenshot("desktop-links-open.png");
const links = await evaluate(`({
  rows: document.querySelectorAll('.external-link--drawer').length,
  visibleRows: [...document.querySelectorAll('.external-link--drawer')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  realLinks: document.querySelectorAll('a.external-link--drawer[href]').length,
  hrefs: [...document.querySelectorAll('a.external-link--drawer[href]')].map((node) => node.href),
  characterTransform: getComputedStyle(document.querySelector('#links .links-character')).transform,
  portalTransform: getComputedStyle(document.querySelector('.links-portal')).transform,
  drawerTransform: getComputedStyle(document.querySelector('.links-drawer')).transform,
  drawerOpacity: Number(getComputedStyle(document.querySelector('.links-drawer')).opacity),
  drawerTop: Math.round(document.querySelector('.links-drawer')?.getBoundingClientRect().top ?? 0),
  drawerVisible: (() => {
    const drawer = document.querySelector('.links-drawer');
    const rect = drawer?.getBoundingClientRect();
    return Boolean(rect && Number(getComputedStyle(drawer).opacity) > 0.9 && rect.top < innerHeight && rect.bottom > 0);
  })(),
  drawerCenterDelta: (() => {
    const rect = document.querySelector('.links-drawer')?.getBoundingClientRect();
    return rect ? {
      x: Math.round(Math.abs(rect.left + rect.width / 2 - document.documentElement.clientWidth / 2)),
      y: Math.round(Math.abs(rect.top + rect.height / 2 - innerHeight / 2)),
    } : null;
  })(),
  pageBackVisible: (() => {
    const button = document.querySelector('.links-page-back');
    const rect = button?.getBoundingClientRect();
    return Boolean(rect && Number(getComputedStyle(button).opacity) > 0.75 && rect.top < innerHeight && rect.bottom > 0);
  })(),
  pageBackBelowProgress: (() => {
    const buttonRect = document.querySelector('.links-page-back')?.getBoundingClientRect();
    const progressRect = document.querySelector('#links .chapter-progress-track')?.getBoundingClientRect();
    return Boolean(buttonRect && progressRect && buttonRect.top > progressRect.bottom);
  })(),
  pageBackInsideLinks: document.querySelector('.links-page-back')?.closest('section')?.id === 'links',
  footerAbsent: document.querySelector('.site-footer') === null,
  onlineStatus: document.querySelector('.links-drawer-status')?.textContent?.trim() ?? '',
  pageEndsWithLinks: (() => {
    const section = document.querySelector('#links');
    return section ? Math.abs(document.body.scrollHeight - (section.offsetTop + section.offsetHeight)) <= 1 : false;
  })(),
})`);

await evaluate("document.querySelector('.links-page-back')?.click()");
await waitFor("window.scrollY <= 4 && document.querySelector('.main-nav .is-active')?.textContent === 'HOME'");
const linksBackHome = await evaluate(`({
  scrollY: Math.round(window.scrollY),
  activeNav: document.querySelector('.main-nav .is-active')?.textContent ?? null,
  buttonInsideLinks: document.querySelector('.links-page-back')?.closest('section')?.id === 'links',
  footerPresent: Boolean(document.querySelector('.site-footer')),
})`);
await delay(300);
const talkStartedAt = Date.now();
await evaluate("document.querySelector('.talk-button')?.click()");
await waitFor("document.querySelector('.talk-dialog')?.dataset.state === 'open'");
await delay(350);
const talkLatencyMs = Date.now() - talkStartedAt;
const talkOpen = await evaluate(`(() => {
  const dialog = document.querySelector('.talk-dialog');
  const panel = document.querySelector('.talk-panel');
  const rect = panel?.getBoundingClientRect();
  return Boolean(dialog?.open && dialog?.dataset.state === 'open' && rect && Math.abs(rect.right - innerWidth) < 1 && panel?.contains(document.activeElement));
})()`);
await screenshot("desktop-talk.png");
await evaluate("document.querySelector('.talk-head button')?.click()");
await waitFor("document.querySelector('.talk-dialog')?.open === false");

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await navigate(siteUrl);
await screenshot("mobile-home.png");
const mobileHome = await evaluate(`({
  bodyWidth: document.body.scrollWidth,
  viewportWidth: innerWidth,
  headerWidth: Math.round(document.querySelector('.site-header')?.getBoundingClientRect().width ?? 0),
  heroHeight: Math.round(document.querySelector('#home')?.getBoundingClientRect().height ?? 0),
  menuVisible: getComputedStyle(document.querySelector('.menu-button')).display,
})`);

await scrollChapterTo('#character', 0.38);
await screenshot("mobile-character.png");
const mobileCharacter = await evaluate(`({
  bodyWidth: document.body.scrollWidth,
  viewportWidth: innerWidth,
  scenes: document.querySelectorAll('.character-scene').length,
  activeScenes: [...document.querySelectorAll('.character-scene')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  portraitLoaded: document.querySelector('.character-portrait img')?.complete ?? false,
  detailImagesLoaded: [...document.querySelectorAll('.character-scene img')].every((node) => node.complete),
})`);

await scrollChapterTo('#personality', 0.46);
await screenshot("mobile-personality.png");
const mobilePersonality = await evaluate(`(() => {
  const media = document.querySelector('.personality-media');
  return {
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
    mediaVisible: Boolean(media && media.getBoundingClientRect().top < innerHeight && media.getBoundingClientRect().bottom > 0),
    activeBeats: [...document.querySelectorAll('.personality-beat')].filter((node) => Number(getComputedStyle(node).opacity) > 0.55).length,
    videoReadyState: document.querySelector('.personality-video')?.readyState ?? null,
  };
})()`);

await scrollChapterTo('#works', 0.56);
await screenshot("mobile-works.png");
const mobileWorks = await evaluate(`({
  bodyWidth: document.body.scrollWidth,
  viewportWidth: innerWidth,
  featured: document.querySelectorAll('.work-showcase').length,
  desktopImageLoaded: document.querySelector('.work-showcase-screen img')?.complete ?? false,
  mobileImageLoaded: document.querySelector('.work-showcase-mobile img')?.complete ?? false,
  copyVisible: [...document.querySelectorAll('.work-showcase-copy > *')].some((node) => Number(getComputedStyle(node).opacity) > 0.8),
})`);

await scrollChapterTo('#links', 0.96);
await screenshot("mobile-links.png");
const mobileLinks = await evaluate(`({
  bodyWidth: document.body.scrollWidth,
  viewportWidth: innerWidth,
  inlineRows: document.querySelectorAll('.external-link--inline').length,
  rows: document.querySelectorAll('.external-link--drawer').length,
  visibleRows: [...document.querySelectorAll('.external-link--drawer')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  characterLoaded: document.querySelector('.links-character')?.complete ?? false,
  drawerVisible: (() => {
    const drawer = document.querySelector('.links-drawer');
    const rect = drawer?.getBoundingClientRect();
    return Boolean(rect && Number(getComputedStyle(drawer).opacity) > 0.9 && rect.top >= 0 && rect.bottom <= innerHeight);
  })(),
  drawerCenterDelta: (() => {
    const rect = document.querySelector('.links-drawer')?.getBoundingClientRect();
    return rect ? {
      x: Math.round(Math.abs(rect.left + rect.width / 2 - document.documentElement.clientWidth / 2)),
      y: Math.round(Math.abs(rect.top + rect.height / 2 - innerHeight / 2)),
    } : null;
  })(),
  pageBackVisible: (() => {
    const button = document.querySelector('.links-page-back');
    const rect = button?.getBoundingClientRect();
    return Boolean(rect && Number(getComputedStyle(button).opacity) > 0.75 && rect.top < innerHeight && rect.bottom > 0);
  })(),
  pageBackBelowProgress: (() => {
    const buttonRect = document.querySelector('.links-page-back')?.getBoundingClientRect();
    const progressRect = document.querySelector('#links .chapter-progress-track')?.getBoundingClientRect();
    return Boolean(buttonRect && progressRect && buttonRect.top > progressRect.bottom);
  })(),
  footerAbsent: document.querySelector('.site-footer') === null,
})`);

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await navigate(siteUrl);
await screenshot("reduced-motion-home.png");
await evaluate("document.querySelector('.talk-button')?.click()");
await waitFor("document.querySelector('.talk-dialog')?.dataset.state === 'open'");
const reducedMotion = await evaluate(`({
  currentClip: document.querySelector('.hero-video.is-visible')?.dataset.clip ?? null,
  personalityUsesPoster: Boolean(document.querySelector('.personality-poster')),
  cursorHidden: getComputedStyle(document.querySelector('.cursor-ring')).display === 'none',
  panelOpen: document.querySelector('.talk-dialog')?.open === true,
  panelTransform: getComputedStyle(document.querySelector('.side-panel-shell')).transform,
})`);
await evaluate("document.querySelector('.talk-head button')?.click()");
await waitFor("document.querySelector('.talk-dialog')?.open === false");
await evaluate("document.querySelector('#works')?.scrollIntoView({behavior:'instant', block:'start'})");
await delay(500);
await screenshot("reduced-motion-works.png");
const reducedChapter = await evaluate(`({
  showcaseVisible: Number(getComputedStyle(document.querySelector('.work-showcase')).opacity) === 1,
  projectCopyVisible: [...document.querySelectorAll('.work-showcase-copy > *')].every((node) => Number(getComputedStyle(node).opacity) === 1),
  characterVisible: Number(getComputedStyle(document.querySelector('#works .works-character')).opacity) === 1,
  stageHeight: Math.round(document.querySelector('.works-stage')?.getBoundingClientRect().height ?? 0),
})`);
await evaluate("document.querySelector('.links-drawer')?.scrollIntoView({behavior:'instant', block:'center'})");
await delay(500);
await screenshot("reduced-motion-links.png");
const reducedLinks = await evaluate(`({
  drawerVisible: (() => {
    const drawer = document.querySelector('.links-drawer');
    const rect = drawer?.getBoundingClientRect();
    return Boolean(rect && Number(getComputedStyle(drawer).opacity) === 1 && rect.top < innerHeight && rect.bottom > 0);
  })(),
  inlineRows: document.querySelectorAll('.external-link--inline').length,
  rows: document.querySelectorAll('.external-link--drawer').length,
  visibleRows: [...document.querySelectorAll('.external-link--drawer')].filter((node) => Number(getComputedStyle(node).opacity) === 1).length,
  realLinks: document.querySelectorAll('a.external-link--drawer[href]').length,
  pageBackInsideLinks: document.querySelector('.links-page-back')?.closest('section')?.id === 'links',
  footerAbsent: document.querySelector('.site-footer') === null,
})`);
await send("Emulation.setEmulatedMedia", { media: "screen", features: [] });

const report = {
  desktopHome,
  chapterScroll,
  pastedAccessoryCount,
  bootState,
  portalScroll,
  blogCta,
  heroAction,
  indexOpen,
  directoryNavigation,
  characterStart,
  character,
  personalityStart,
  personality,
  worksStart,
  works,
  linksStart,
  links,
  linksBackHome,
  talkOpen,
  talkLatencyMs,
  mobileHome,
  mobileCharacter,
  mobilePersonality,
  mobileWorks,
  mobileLinks,
  reducedMotion,
  reducedChapter,
  reducedLinks,
  browserErrors,
  failedResources,
};

await writeFile(resolve(outputDirectory, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();

const checks = [
  [desktopHome.title.includes("夜希"), "page title"],
  [bootState?.visible && bootState?.bodyLocked && bootState?.overflow === "hidden" && bootState?.progressAnimated, "boot state"],
  [desktopHome.sectionCount === 5, "all five sections"],
  [chapterScroll.character <= 2.5 && chapterScroll.personality <= 1.7 && chapterScroll.works <= 1.8 && chapterScroll.links <= 1.6 && chapterScroll.total <= 7.6, "compact chapter scroll distances"],
  [pastedAccessoryCount === 0, "no standalone accessory images"],
  [desktopHome.videoReadyState >= 2 && Boolean(desktopHome.activeVideo), "hero video production and consumption"],
  [portalScroll.clip === "portal" && portalScroll.ended && portalScroll.scrollY > 500, "first-scroll portal sequence"],
  [blogCta.tagName === "A" && blogCta.text.includes("跳进兔子洞") && blogCta.href === "https://blog.blacknico.com/" && blogCta.target === "_blank", "home blog call to action"],
  [heroAction.clip === "reactKey" && heroAction.currentTime > 0 && !heroAction.paused, "hero action playback"],
  [indexOpen && !directoryNavigation.dialogOpen && directoryNavigation.activeNav === "CHARACTER", "directory navigation"],
  [character.scenes === 4 && character.activeScenes >= 1 && character.portraitLoaded && character.detailImagesLoaded, "desktop character presentation"],
  [characterStart.titleTransform !== character.titleTransform && characterStart.portraitTransform !== character.portraitTransform && character.progressTransform !== "none", "character scroll choreography"],
  [personality.hasVideo && personality.readyState >= 2 && personality.currentTime > 0 && !personality.paused && personality.activeBeats >= 1, "personality alpha video playback"],
  [personalityStart.mediaTransform !== personality.mediaTransform && JSON.stringify(personalityStart.beatOpacities) !== JSON.stringify(personality.beatOpacities), "personality scroll choreography"],
  [works.featured === 1 && works.realLinks === 1 && works.desktopImageLoaded && works.mobileImageLoaded && works.characterLoaded && works.characterVisible && !works.escapedMarkupVisible, "works content"],
  [worksStart.showcaseTransform !== works.showcaseTransform && worksStart.characterTransform !== works.characterTransform, "works scroll choreography"],
  [links.rows === 2 && links.visibleRows === 2 && links.realLinks === 2 && links.hrefs[0] === "https://github.com/CheshireMew" && links.hrefs[1] === "https://blog.blacknico.com/" && links.onlineStatus.includes("2 CHANNELS ONLINE"), "external links"],
  [linksStart.inlineRows === 2 && linksStart.visibleInlineRows === 2 && linksStart.inlineRealLinks === 2, "original inline links preserved"],
  [linksStart.characterTransform !== links.characterTransform && linksStart.portalTransform !== links.portalTransform, "links scroll choreography"],
  [linksStart.drawerOpacity < 0.1 && links.drawerVisible && links.drawerOpacity > 0.9 && linksStart.drawerTop - links.drawerTop > 200 && linksStart.drawerTransform !== links.drawerTransform && links.drawerCenterDelta?.x <= 2 && links.drawerCenterDelta?.y <= 2, "links centered bottom drawer reveal"],
  [links.footerAbsent && links.pageEndsWithLinks && links.pageBackInsideLinks && links.pageBackVisible && links.pageBackBelowProgress && !linksBackHome.footerPresent && linksBackHome.buttonInsideLinks && linksBackHome.activeNav === "HOME" && linksBackHome.scrollY <= 4, "footer removed and back-home moved below progress"],
  [talkOpen && talkLatencyMs < 1000, "talk panel direct response"],
  [mobileHome.bodyWidth <= mobileHome.viewportWidth && mobileHome.menuVisible !== "none", "mobile home layout"],
  [mobileCharacter.bodyWidth <= mobileCharacter.viewportWidth && mobileCharacter.scenes === 4 && mobileCharacter.activeScenes >= 1 && mobileCharacter.portraitLoaded && mobileCharacter.detailImagesLoaded, "mobile character layout"],
  [mobilePersonality.bodyWidth <= mobilePersonality.viewportWidth && mobilePersonality.mediaVisible && mobilePersonality.activeBeats >= 1 && mobilePersonality.videoReadyState >= 2, "mobile personality layout"],
  [mobileWorks.bodyWidth <= mobileWorks.viewportWidth && mobileWorks.featured === 1 && mobileWorks.desktopImageLoaded && mobileWorks.mobileImageLoaded && mobileWorks.copyVisible, "mobile works layout"],
  [mobileLinks.bodyWidth <= mobileLinks.viewportWidth && mobileLinks.inlineRows === 2 && mobileLinks.rows === 2 && mobileLinks.visibleRows === 2 && mobileLinks.characterLoaded && mobileLinks.drawerVisible && mobileLinks.drawerCenterDelta?.x <= 2 && mobileLinks.drawerCenterDelta?.y <= 2 && mobileLinks.pageBackVisible && mobileLinks.pageBackBelowProgress && mobileLinks.footerAbsent, "mobile links layout"],
  [reducedMotion.currentClip === null && reducedMotion.personalityUsesPoster && reducedMotion.cursorHidden && reducedMotion.panelOpen && reducedMotion.panelTransform === "none", "reduced motion path"],
  [reducedChapter.showcaseVisible && reducedChapter.projectCopyVisible && reducedChapter.characterVisible && reducedChapter.stageHeight >= 1000, "reduced motion chapter content"],
  [reducedLinks.drawerVisible && reducedLinks.inlineRows === 2 && reducedLinks.rows === 2 && reducedLinks.visibleRows === 2 && reducedLinks.realLinks === 2 && reducedLinks.pageBackInsideLinks && reducedLinks.footerAbsent, "reduced motion links drawer"],
  [browserErrors.length === 0, "browser console"],
  [failedResources.length === 0, "resource loading"],
];

const failedChecks = checks.filter(([passed]) => !passed).map(([, label]) => label);
if (failedChecks.length) {
  throw new Error(`Acceptance failed: ${failedChecks.join(", ")}`);
}
