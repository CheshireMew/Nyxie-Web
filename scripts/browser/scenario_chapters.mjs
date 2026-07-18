export async function runChapterScenario(browser) {
  const send = browser.send.bind(browser);
  const evaluate = browser.evaluate.bind(browser);
  const delay = browser.delay.bind(browser);
  const waitFor = browser.waitFor.bind(browser);
  const screenshot = browser.screenshot.bind(browser);
  const scrollChapterTo = browser.scrollChapterTo.bind(browser);
  const positionChapterTop = browser.positionChapterTop.bind(browser);
  const wheelAt = browser.wheelAt.bind(browser);
  const countPageTargets = browser.countPageTargets.bind(browser);

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
  return { currentTime: video?.currentTime ?? 0, paused: video?.paused ?? true, playbackRate: video?.playbackRate ?? null, muted: video?.muted ?? null };
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
  showcaseTag: document.querySelector('#works .work-showcase')?.tagName ?? null,
  underlyingLinks: document.querySelectorAll('#works .work-showcase a[href], #works a.work-showcase[href]').length,
  desktopImageLoaded: document.querySelector('#works .work-showcase-screen img')?.complete ?? false,
  mobileImageLoaded: document.querySelector('#works .work-showcase-mobile img')?.complete ?? false,
  characterLoaded: document.querySelector('#works .works-character')?.complete ?? false,
  drawerInsideWorks: document.querySelector('.links-drawer')?.closest('section')?.id === 'works',
  drawerOpacity: Number(getComputedStyle(document.querySelector('.links-drawer')).opacity),
})`);

const worksShowcaseHit = await evaluate(`(() => {
  const showcase = document.querySelector('#works .work-showcase');
  const rect = showcase?.getBoundingClientRect();
  if (!showcase || !rect) return null;
  const x = Math.round(Math.min(innerWidth - 24, Math.max(24, rect.left + rect.width / 2)));
  const y = Math.round(Math.min(innerHeight - 80, Math.max(80, rect.top + rect.height / 2)));
  const target = document.elementFromPoint(x, y);
  return {
    x,
    y,
    showcaseTag: showcase.tagName,
    targetInsideShowcase: Boolean(target?.closest('.work-showcase')),
    targetLink: target?.closest('a[href]')?.getAttribute('href') ?? null,
  };
})()`);
const pageTargetsBeforeShowcaseClick = await countPageTargets();
if (worksShowcaseHit) {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: worksShowcaseHit.x, y: worksShowcaseHit.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: worksShowcaseHit.x, y: worksShowcaseHit.y, button: "left", clickCount: 1 });
}
await delay(250);
const pageTargetsAfterShowcaseClick = await countPageTargets();
const worksShowcaseNonLink = {
  ...worksShowcaseHit,
  newPageTargets: pageTargetsAfterShowcaseClick - pageTargetsBeforeShowcaseClick,
  currentUrl: await evaluate("location.href"),
};

await scrollChapterTo('#works', 1, 0);
await waitFor("Number(document.querySelector('#works')?.dataset.forwardProgress ?? 0) >= 0.999");
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

const worksBackdropHit = await evaluate(`(() => {
  const work = document.querySelector('#works .work-showcase')?.getBoundingClientRect();
  const drawer = document.querySelector('#works .links-drawer')?.getBoundingClientRect();
  const header = document.querySelector('.site-header')?.getBoundingClientRect();
  if (!work || !drawer) return null;
  const x = Math.round(work.left + 24);
  const y = Math.round(Math.min(innerHeight - 80, Math.max((header?.bottom ?? 0) + 24, work.top + work.height / 2)));
  const target = document.elementFromPoint(x, y);
  return {
    x,
    y,
    targetClass: target?.className ?? null,
    targetTag: target?.tagName ?? null,
    pointInsideWork: x >= work.left && x <= work.right && y >= work.top && y <= work.bottom,
    pointOutsideDrawer: x < drawer.left || x > drawer.right || y < drawer.top || y > drawer.bottom,
  };
})()`);
const pageTargetsBeforeBackdropClick = await countPageTargets();
if (worksBackdropHit) {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: worksBackdropHit.x, y: worksBackdropHit.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: worksBackdropHit.x, y: worksBackdropHit.y, button: "left", clickCount: 1 });
}
await delay(250);
const pageTargetsAfterBackdropClick = await countPageTargets();
const worksBackdropProtection = {
  ...worksBackdropHit,
  newPageTargets: pageTargetsAfterBackdropClick - pageTargetsBeforeBackdropClick,
  currentUrl: await evaluate("location.href"),
};

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

await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 120 });
await delay(300);
const portalOneShot = await evaluate(`(() => {
  const video = document.querySelector('.hero-video.is-visible');
  return {
    scrollY: Math.round(scrollY),
    clip: video?.dataset.clip ?? null,
    playbackRate: video?.playbackRate ?? null,
  };
})()`);
await evaluate("scrollTo({ top: 0, behavior: 'instant' })");
await waitFor("scrollY <= 4");

const talkStartedAt = Date.now();
await evaluate(`(() => {
  const opener = document.querySelector('.talk-button');
  opener?.focus();
  opener?.click();
})()`);
await waitFor("document.querySelector('.talk-dialog')?.dataset.state === 'open'");
const talkLatencyMs = Date.now() - talkStartedAt;
const talkOpen = await evaluate("document.querySelector('.talk-dialog')?.open === true");
const talkA11yOpen = await evaluate(`({
  expanded: document.querySelector('.talk-button')?.getAttribute('aria-expanded') ?? null,
  controls: document.querySelector('.talk-button')?.getAttribute('aria-controls') ?? null,
  dialogId: document.querySelector('.talk-dialog')?.id ?? null,
  focusInside: document.querySelector('.talk-dialog')?.contains(document.activeElement) ?? false,
})`);
await evaluate("document.querySelector('.talk-head button')?.click()");
await waitFor("document.querySelector('.talk-dialog')?.open === false && document.activeElement === document.querySelector('.talk-button')");
const talkA11yClosed = await evaluate(`({
  expanded: document.querySelector('.talk-button')?.getAttribute('aria-expanded') ?? null,
  openerFocused: document.activeElement === document.querySelector('.talk-button'),
})`);

  return {
    characterBeforeStage,
    character,
    nativeBoundaryDown,
    personalityFirstEntry,
    nativeBoundaryUp,
    characterFinalBeforeReverse,
    characterFinalAfterReverse,
    personalityFrozenAfterUp,
    personality,
    links,
    works,
    worksShowcaseNonLink,
    worksEnd,
    worksBackdropProtection,
    completedChapterProgress,
    worksFinalBeforeReverse,
    worksFinalAfterReverse,
    worksReverseNativeDelta,
    backHome,
    portalOneShot,
    talkOpen,
    talkA11yOpen,
    talkA11yClosed,
    talkLatencyMs,
  };
}
