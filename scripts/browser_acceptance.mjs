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

  if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails?.text ?? "Runtime exception");
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

async function scrollChapterTo(selector, progress) {
  await evaluate(`(() => {
    const section = document.querySelector(${JSON.stringify(selector)});
    if (!section) return false;
    const top = section.getBoundingClientRect().top + scrollY;
    const travel = Math.max(0, section.offsetHeight - innerHeight);
    window.scrollTo({ top: top + travel * ${progress}, behavior: 'instant' });
    return true;
  })()`);
  await delay(1050);
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
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'GALLERY'", 18000);
const portalScroll = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  return { clip: video?.dataset.clip ?? null, ended: video?.ended ?? false, currentTime: video?.currentTime ?? 0, duration: video?.duration ?? 0, scrollY: Math.round(scrollY) };
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
await waitFor("document.querySelector('.index-dialog')?.open === true");
const indexOpen = await evaluate(`(() => {
  const dialog = document.querySelector('.index-dialog');
  const panel = document.querySelector('.index-shell');
  const rect = panel?.getBoundingClientRect();
  return Boolean(dialog?.open && dialog?.dataset.state === 'open' && rect && Math.abs(rect.right - innerWidth) < 1 && panel?.contains(document.activeElement));
})()`);
await screenshot("desktop-directory.png");
await evaluate("document.querySelector('.chapter-grid button')?.click()");
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'GALLERY'");
await waitFor("document.querySelector('.gallery-media video')?.readyState >= 2");
await waitFor("document.querySelector('.gallery-media video')?.currentTime > 0.1");
await screenshot("desktop-gallery.png");

const galleryStart = await evaluate(`(() => {
  const section = document.querySelector('#gallery');
  const video = section?.querySelector('video');
  const card = section?.querySelector('.gallery-carousel');
  const rect = card?.getBoundingClientRect();
  return {
    activeTitle: section?.querySelector('.gallery-card-copy h3')?.textContent?.trim() ?? '',
    cards: section?.querySelectorAll('.gallery-pagination button').length ?? 0,
    sideCards: section?.querySelectorAll('.gallery-side-card').length ?? 0,
    videoSrc: video?.currentSrc ?? '',
    videoReadyState: video?.readyState ?? 0,
    videoWidth: video?.videoWidth ?? 0,
    videoHeight: video?.videoHeight ?? 0,
    currentTime: video?.currentTime ?? 0,
    paused: video?.paused ?? true,
    cardInsideViewport: Boolean(rect && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight),
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
  };
})()`);

await evaluate("document.querySelector('.gallery-arrow--next')?.click()");
await waitFor("document.querySelector('.gallery-card-copy h3')?.textContent?.trim() === '花庭形态'");
await waitFor("document.querySelector('.gallery-media video')?.readyState >= 2 && document.querySelector('.gallery-media video')?.currentTime > 0.05");
await screenshot("desktop-gallery-next.png");
const galleryNext = await evaluate(`(() => {
  const video = document.querySelector('.gallery-media video');
  return { title: document.querySelector('.gallery-card-copy h3')?.textContent?.trim() ?? '', source: video?.currentSrc ?? '', currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true };
})()`);

const galleryPlayback = [];
const galleryFiles = ["goth", "garden", "demon", "winter", "astrologer", "starsea", "forbidden", "moonlit"];
for (let index = 0; index < galleryFiles.length; index += 1) {
  const file = galleryFiles[index];
  await evaluate(`document.querySelectorAll('.gallery-pagination button')[${index}]?.click()`);
  await waitFor(`document.querySelector('.gallery-media video')?.currentSrc.endsWith(${JSON.stringify(`${file}.webm`)}) && document.querySelector('.gallery-media video')?.readyState >= 2`);
  await waitFor("document.querySelector('.gallery-media video')?.currentTime > 0.03");
  galleryPlayback.push(await evaluate(`(() => {
    const video = document.querySelector('.gallery-media video');
    return { source: video?.currentSrc ?? '', readyState: video?.readyState ?? 0, videoWidth: video?.videoWidth ?? 0, currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true };
  })()`));
}

await scrollChapterTo('#character', 0.38);
await screenshot("desktop-character.png");
const character = await evaluate(`({
  scenes: document.querySelectorAll('.character-scene').length,
  activeScenes: [...document.querySelectorAll('.character-scene')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  portraitLoaded: document.querySelector('.character-portrait img')?.complete ?? false,
  detailImagesLoaded: [...document.querySelectorAll('.character-scene img')].every((node) => node.complete),
  progressTransform: getComputedStyle(document.querySelector('#character .chapter-progress-fill')).transform,
})`);

await scrollChapterTo('#personality', 0.46);
await screenshot("desktop-personality.png");
const personality = await evaluate(`(() => {
  const video = document.querySelector('.personality-video');
  return {
    hasVideo: Boolean(video), readyState: video?.readyState ?? null, currentTime: video?.currentTime ?? null, paused: video?.paused ?? null,
    activeBeats: [...document.querySelectorAll('.personality-beat')].filter((node) => Number(getComputedStyle(node).opacity) > 0.55).length,
  };
})()`);

await scrollChapterTo('#links', 0.24);
await screenshot("desktop-links.png");
const links = await evaluate(`({
  inlineRows: document.querySelectorAll('#links .external-link--inline').length,
  visibleInlineRows: [...document.querySelectorAll('#links .external-link--inline')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
  hrefs: [...document.querySelectorAll('#links a.external-link--inline[href]')].map((node) => node.href),
  characterLoaded: document.querySelector('#links .links-character')?.complete ?? false,
  drawerInsideLinks: Boolean(document.querySelector('#links .links-drawer')),
})`);

await scrollChapterTo('#works', 0.48);
await screenshot("desktop-works.png");
const works = await evaluate(`({
  featured: document.querySelectorAll('#works .work-showcase').length,
  realLinks: document.querySelectorAll('#works a.work-showcase[href]').length,
  desktopImageLoaded: document.querySelector('#works .work-showcase-screen img')?.complete ?? false,
  mobileImageLoaded: document.querySelector('#works .work-showcase-mobile img')?.complete ?? false,
  characterLoaded: document.querySelector('#works .works-character')?.complete ?? false,
  drawerInsideWorks: document.querySelector('.links-drawer')?.closest('section')?.id === 'works',
  drawerOpacity: Number(getComputedStyle(document.querySelector('.links-drawer')).opacity),
})`);

await scrollChapterTo('#works', 0.99);
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
await waitFor("document.querySelector('.gallery-media video')?.readyState >= 2");
await screenshot("mobile-gallery.png");
const mobileGallery = await evaluate(`(() => {
  const video = document.querySelector('.gallery-media video');
  const card = document.querySelector('.gallery-carousel')?.getBoundingClientRect();
  return {
    bodyWidth: document.body.scrollWidth, viewportWidth: innerWidth,
    cards: document.querySelectorAll('.gallery-pagination button').length,
    videoReadyState: video?.readyState ?? 0, videoWidth: video?.videoWidth ?? 0,
    cardInsideViewport: Boolean(card && card.left >= 0 && card.right <= innerWidth && card.top >= 0 && card.bottom <= innerHeight),
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

await scrollChapterTo('#works', 0.99);
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

const report = {
  bootState, desktopHome, blogCta, portalScroll, heroAction, indexOpen, galleryStart, galleryNext, galleryPlayback,
  character, personality, links, works, worksEnd, backHome, talkOpen, talkLatencyMs,
  mobileHome, mobileGallery, mobileCharacter, mobilePersonality, mobileLinks, mobileWorks,
  reducedGallery, reducedWorks, browserErrors, failedResources,
};

await writeFile(resolve(outputDirectory, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();

const ratios = desktopHome.ratios;
const checks = [
  [desktopHome.title.includes("夜希"), "page title"],
  [bootState?.visible && bootState?.bodyLocked && bootState?.overflow === "hidden" && bootState?.progressAnimated, "boot state"],
  [JSON.stringify(desktopHome.ids) === JSON.stringify(["home", "gallery", "character", "personality", "links", "works"]), "six-section order"],
  [ratios.gallery <= 1.7 && ratios.character <= 2.6 && ratios.personality <= 1.8 && ratios.links <= 1.6 && ratios.works <= 2.5, "chapter scroll distances"],
  [desktopHome.bodyWidth <= desktopHome.viewportWidth && desktopHome.videoReadyState >= 2 && Boolean(desktopHome.activeVideo), "desktop home media"],
  [blogCta.tagName === "A" && blogCta.text.includes("跳进兔子洞") && blogCta.href === "https://blog.blacknico.com/" && blogCta.target === "_blank", "home blog call to action"],
  [portalScroll.clip === "portal" && portalScroll.ended && portalScroll.scrollY > 500, "first-scroll portal to Gallery"],
  [Boolean(heroAction.clip) && heroAction.currentTime > 0 && !heroAction.paused, "hero action playback"],
  [indexOpen, "directory opens"],
  [galleryStart.cards === 8 && galleryStart.sideCards === 2 && galleryStart.videoSrc.endsWith("goth.webm") && galleryStart.videoReadyState >= 2 && galleryStart.videoWidth === 848 && galleryStart.videoHeight === 1072 && galleryStart.currentTime > 0 && !galleryStart.paused && galleryStart.cardInsideViewport && galleryStart.bodyWidth <= galleryStart.viewportWidth, "Gallery first video production and playback"],
  [galleryNext.title === "花庭形态" && galleryNext.source.endsWith("garden.webm") && galleryNext.currentTime > 0 && !galleryNext.paused, "Gallery manual carousel switch"],
  [galleryPlayback.length === 8 && galleryPlayback.every((video, index) => video.source.endsWith(`${galleryFiles[index]}.webm`) && video.readyState >= 2 && video.videoWidth === 848 && video.currentTime > 0 && !video.paused), "all eight Gallery videos play"],
  [character.scenes === 4 && character.activeScenes >= 1 && character.portraitLoaded && character.detailImagesLoaded && character.progressTransform !== "none", "desktop character presentation"],
  [personality.hasVideo && personality.readyState >= 2 && personality.currentTime > 0 && !personality.paused && personality.activeBeats >= 1, "personality video playback"],
  [links.inlineRows === 2 && links.visibleInlineRows === 2 && links.hrefs[0] === "https://github.com/CheshireMew" && links.hrefs[1] === "https://blog.blacknico.com/" && links.characterLoaded && !links.drawerInsideLinks, "Links page preserved"],
  [works.featured === 1 && works.realLinks === 1 && works.desktopImageLoaded && works.mobileImageLoaded && works.characterLoaded && works.drawerInsideWorks && works.drawerOpacity < 0.45, "Works content before drawer"],
  [worksEnd.rows === 2 && worksEnd.visibleRows === 2 && worksEnd.hrefs[0] === "https://github.com/CheshireMew" && worksEnd.hrefs[1] === "https://blog.blacknico.com/" && worksEnd.onlineStatus.includes("2 CHANNELS ONLINE"), "final link drawer content"],
  [worksEnd.drawerVisible && worksEnd.drawerCenterDelta?.x <= 2 && worksEnd.drawerCenterDelta?.y <= 3, "centered drawer reveal at final page"],
  [worksEnd.backVisible && worksEnd.backBelowProgress && worksEnd.backCenterDelta <= 2 && worksEnd.backInsideWorks && worksEnd.footerAbsent && worksEnd.pageEndsWithWorks, "centered back button below final progress"],
  [backHome.scrollY <= 4 && backHome.activeNav === "HOME", "back to home"],
  [talkOpen && talkLatencyMs < 1000, "talk panel response"],
  [mobileHome.bodyWidth <= mobileHome.viewportWidth && mobileHome.menuVisible !== "none", "mobile home layout"],
  [mobileGallery.bodyWidth <= mobileGallery.viewportWidth && mobileGallery.cards === 8 && mobileGallery.videoReadyState >= 2 && mobileGallery.videoWidth === 848 && mobileGallery.cardInsideViewport, "mobile Gallery layout"],
  [mobileCharacter.bodyWidth <= mobileCharacter.viewportWidth && mobileCharacter.scenes === 4 && mobileCharacter.activeScenes >= 1, "mobile character layout"],
  [mobilePersonality.bodyWidth <= mobilePersonality.viewportWidth && mobilePersonality.videoReadyState >= 2 && mobilePersonality.activeBeats >= 1, "mobile personality layout"],
  [mobileLinks.bodyWidth <= mobileLinks.viewportWidth && mobileLinks.inlineRows === 2 && mobileLinks.visibleRows === 2 && !mobileLinks.drawerInsideLinks, "mobile Links layout"],
  [mobileWorks.bodyWidth <= mobileWorks.viewportWidth && mobileWorks.featured === 1 && mobileWorks.rows === 2 && mobileWorks.visibleRows === 2 && mobileWorks.drawerVisible && mobileWorks.drawerCenterDelta <= 2 && mobileWorks.backVisible && mobileWorks.backBelowProgress && mobileWorks.backCenterDelta <= 2, "mobile final Works layout"],
  [reducedGallery.usesPoster && !reducedGallery.hasVideo && reducedGallery.posterLoaded && reducedGallery.cards === 8, "reduced-motion Gallery poster path"],
  [reducedWorks.drawerVisible && reducedWorks.rows === 2 && reducedWorks.workVisible && reducedWorks.backInsideWorks && reducedWorks.personalityUsesPoster && reducedWorks.cursorHidden, "reduced-motion content path"],
  [browserErrors.length === 0, "browser console"],
  [failedResources.length === 0, "resource loading"],
];

const failedChecks = checks.filter(([passed]) => !passed).map(([, label]) => label);
if (failedChecks.length) throw new Error(`Acceptance failed: ${failedChecks.join(", ")}`);
