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

await evaluate("document.querySelector('.primary-button')?.click()");
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

await evaluate("document.querySelector('.menu-button')?.click()");
await waitFor("document.querySelector('.index-dialog')?.open === true");
const indexOpen = await evaluate("document.querySelector('.index-dialog')?.open === true");
await evaluate("document.querySelector('.chapter-grid button')?.click()");
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'CHARACTER'");
await screenshot("desktop-character.png");
const directoryNavigation = await evaluate(`({
  dialogOpen: document.querySelector('.index-dialog')?.open ?? false,
  scrollY: Math.round(window.scrollY),
  activeNav: document.querySelector('.main-nav .is-active')?.textContent ?? null,
})`);
const character = await evaluate(`({
  details: document.querySelectorAll('.character-detail').length,
  imageLoaded: document.querySelector('.character-figure img')?.complete ?? false,
  imageHeight: Math.round(document.querySelector('.character-figure img')?.getBoundingClientRect().height ?? 0),
})`);

await evaluate("document.querySelector('#personality')?.scrollIntoView({behavior:'instant'})");
await delay(1800);
await screenshot("desktop-personality.png");
const personality = await evaluate(`(() => {
  const video = document.querySelector('.personality-video');
  const media = document.querySelector('.personality-media');
  return {
    hasVideo: Boolean(video),
    readyState: video?.readyState ?? null,
    currentTime: video?.currentTime ?? null,
    paused: video?.paused ?? null,
    mediaHeight: Math.round(media?.getBoundingClientRect().height ?? 0),
  };
})()`);

await evaluate("document.querySelector('#works')?.scrollIntoView({behavior:'instant'})");
await delay(900);
await screenshot("desktop-works.png");
const works = await evaluate(`({
  cards: document.querySelectorAll('.work-card').length,
  realLinks: document.querySelectorAll('a.work-card[href]').length,
  characterLoaded: document.querySelector('.works-character')?.complete ?? false,
})`);

await evaluate("document.querySelector('#links')?.scrollIntoView({behavior:'instant'})");
await delay(900);
await screenshot("desktop-links.png");
const links = await evaluate(`({
  rows: document.querySelectorAll('.link-row').length,
  realLinks: document.querySelectorAll('a.link-row[href]').length,
  hrefs: [...document.querySelectorAll('a.link-row[href]')].map((node) => node.href),
})`);

await evaluate("document.querySelector('#home')?.scrollIntoView({behavior:'instant'})");
await delay(300);
await evaluate("document.querySelector('.hero-talk-shortcut')?.click()");
await waitFor("document.querySelector('.talk-panel')?.classList.contains('is-open') === true");
const talkOpen = await evaluate("document.querySelector('.talk-panel')?.classList.contains('is-open') === true");
await evaluate("document.querySelector('.talk-head button')?.click()");
await waitFor("document.querySelector('.talk-panel')?.classList.contains('is-open') === false");

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

await evaluate("document.querySelector('#character')?.scrollIntoView({behavior:'instant'})");
await delay(900);
await screenshot("mobile-character.png");
const mobileCharacter = await evaluate(`({
  bodyWidth: document.body.scrollWidth,
  viewportWidth: innerWidth,
  details: document.querySelectorAll('.character-detail').length,
  imageLoaded: document.querySelector('.character-figure img')?.complete ?? false,
})`);

const report = {
  desktopHome,
  portalScroll,
  heroAction,
  indexOpen,
  directoryNavigation,
  character,
  personality,
  works,
  links,
  talkOpen,
  mobileHome,
  mobileCharacter,
  browserErrors,
  failedResources,
};

await writeFile(resolve(outputDirectory, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
socket.close();

const checks = [
  [desktopHome.title.includes("夜希"), "page title"],
  [desktopHome.sectionCount === 5, "all five sections"],
  [desktopHome.videoReadyState >= 2 && Boolean(desktopHome.activeVideo), "hero video production and consumption"],
  [portalScroll.clip === "portal" && portalScroll.ended && portalScroll.scrollY > 500, "first-scroll portal sequence"],
  [heroAction.clip === "reactKey" && heroAction.currentTime > 0 && !heroAction.paused, "hero action playback"],
  [indexOpen && !directoryNavigation.dialogOpen && directoryNavigation.activeNav === "CHARACTER", "directory navigation"],
  [character.details === 4 && character.imageLoaded && character.imageHeight > 300, "desktop character presentation"],
  [personality.hasVideo && personality.readyState >= 2 && personality.currentTime > 0 && !personality.paused, "personality alpha video playback"],
  [works.cards === 3 && works.realLinks === 2 && works.characterLoaded, "works content"],
  [links.rows === 3 && links.realLinks === 2, "external links"],
  [talkOpen, "talk panel"],
  [mobileHome.bodyWidth <= mobileHome.viewportWidth && mobileHome.menuVisible !== "none", "mobile home layout"],
  [mobileCharacter.bodyWidth <= mobileCharacter.viewportWidth && mobileCharacter.details === 4 && mobileCharacter.imageLoaded, "mobile character layout"],
  [browserErrors.length === 0, "browser console"],
  [failedResources.length === 0, "resource loading"],
];

const failedChecks = checks.filter(([passed]) => !passed).map(([, label]) => label);
if (failedChecks.length) {
  throw new Error(`Acceptance failed: ${failedChecks.join(", ")}`);
}
