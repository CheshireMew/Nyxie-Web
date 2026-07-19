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
    lensOpacity: Number(getComputedStyle(section?.querySelector('.character-lens')).opacity),
  };
})()`);

await scrollChapterTo('#character', 0);
await waitFor("document.querySelector('#character .character-film')?.readyState >= 2");
await waitFor("(document.querySelector('#character .character-film')?.currentTime ?? 0) > 0.05");
await waitFor(`(() => {
  const images = [...document.querySelectorAll('#creator .creator-card img')];
  return images.length === 4 && images.every((image) => image.complete && image.naturalWidth > 0);
})()`);
const creatorWarmup = await evaluate(`(() => {
  const section = document.querySelector('#creator');
  const images = [...section.querySelectorAll('.creator-card img')];
  return {
    activeSection: document.querySelector('.main-nav .is-active')?.textContent?.trim() ?? null,
    mediaState: section?.dataset.creatorMedia ?? null,
    sectionTop: Math.round(section?.getBoundingClientRect().top ?? -9999),
    viewportHeight: innerHeight,
    imageCount: images.length,
    sourcesAttached: images.every((image) => Boolean(image.getAttribute('src'))),
    imagesDecoded: images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
    sources: images.map((image) => image.currentSrc),
  };
})()`);
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 470, y: 410 });
await waitFor("(document.querySelector('#character .character-lens-canvas')?.width ?? 0) > 0");
await delay(160);
const characterScrollBefore = await evaluate("Math.round(scrollY)");
await wheelAt(720, 500, 120);
const characterScrollAfter = await evaluate("Math.round(scrollY)");
await screenshot("desktop-character.png");
const character = await evaluate(`(() => {
  const video = document.querySelector('#character .character-film');
  const lensCanvas = document.querySelector('#character .character-lens-canvas');
  const lens = document.querySelector('#character .character-lens');
  const focusMarker = document.querySelector('#character .character-focus-marker');
  const inspector = document.querySelector('#character .character-inspector');
  const inspectorInfo = document.querySelector('#character .character-inspector-copy');
  const stage = document.querySelector('#character .character-stage');
  const lensRect = lens?.getBoundingClientRect();
  const focusRect = focusMarker?.getBoundingClientRect();
  const inspectorRect = inspector?.getBoundingClientRect();
  const inspectorInfoRect = inspectorInfo?.getBoundingClientRect();
  const context = lensCanvas?.getContext('2d');
  const centerPixel = context && lensCanvas.width > 0
    ? Array.from(context.getImageData(Math.floor(lensCanvas.width / 2), Math.floor(lensCanvas.height / 2), 1, 1).data)
    : [];
  return {
    middleStatusLabels: document.querySelectorAll('#character .chapter-hud-status > span').length,
    videoReadyState: video?.readyState ?? 0,
    videoWidth: video?.videoWidth ?? 0,
    videoHeight: video?.videoHeight ?? 0,
    videoDuration: video?.duration ?? 0,
    videoSource: video?.currentSrc ?? '',
    videoObjectFit: getComputedStyle(video).objectFit,
    videoObjectPosition: getComputedStyle(video).objectPosition,
    warmupToken: video?.dataset.acceptanceWarmupToken ?? '',
    playerCount: document.querySelectorAll('#character video.character-film').length,
    videoCurrentTime: video?.currentTime ?? 0,
    videoPaused: video?.paused ?? true,
    videoMuted: video?.muted ?? false,
    videoLoop: video?.loop ?? false,
    lensOpacity: Number(getComputedStyle(lens).opacity),
    lensCenterX: lensRect ? lensRect.left + lensRect.width / 2 : 0,
    lensCenterY: lensRect ? lensRect.top + lensRect.height / 2 : 0,
    focusCenterX: focusRect ? focusRect.left + focusRect.width / 2 : 0,
    focusCenterY: focusRect ? focusRect.top + focusRect.height / 2 : 0,
    focusMarkerTransform: getComputedStyle(focusMarker).transform,
    inspectorWidth: inspectorRect?.width ?? 0,
    inspectorRight: inspectorRect?.right ?? 0,
    inspectorInfoLeft: inspectorInfoRect?.left ?? 0,
    inspectorInfoRight: inspectorInfoRect?.right ?? 0,
    lensCanvasWidth: lensCanvas?.width ?? 0,
    lensCanvasHeight: lensCanvas?.height ?? 0,
    lensCenterLuma: centerPixel.length === 4 ? centerPixel[0] + centerPixel[1] + centerPixel[2] : 765,
    coordinate: document.querySelector('#character .character-readout output')?.value ?? '',
    progressTransform: getComputedStyle(document.querySelector('#character .chapter-progress-fill')).transform,
    stageTop: Math.round(stage?.getBoundingClientRect().top ?? -9999),
    stageHeight: Math.round(stage?.getBoundingClientRect().height ?? 0),
    stageWidth: Math.round(stage?.getBoundingClientRect().width ?? 0),
    nextChapterTop: Math.round(document.querySelector('#creator')?.getBoundingClientRect().top ?? -9999),
  };
})()`);
character.internalWheelDelta = characterScrollAfter - characterScrollBefore;

await scrollChapterTo('#character', 0.99);
const nativeBoundaryDownBefore = await evaluate("Math.round(scrollY)");
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 120 });
await delay(260);
const nativeBoundaryDown = await evaluate(`(() => {
  const character = document.querySelector('#character');
  const creator = document.querySelector('#creator');
  const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const video = character?.querySelector('.character-film');
  return {
    activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
    nativeDelta: Math.round(scrollY) - ${nativeBoundaryDownBefore},
    pageTop: Math.round(creator?.getBoundingClientRect().top ?? -9999),
    padding: Math.round(padding),
    characterVideoPaused: video?.paused ?? true,
  };
})()`);

await scrollChapterTo('#creator', 0);
await waitFor("document.querySelector('.main-nav .is-active')?.textContent === 'CREATOR'");
await waitFor(`[
  document.querySelector('#links .links-character'),
  document.querySelector('#links .work-showcase-screen img'),
  document.querySelector('#links .work-showcase-mobile img'),
].every((image) => image?.complete && image.naturalWidth > 0)`);
const linksWarmup = await evaluate(`(() => {
  const section = document.querySelector('#links');
  const images = [...section.querySelectorAll('.links-character, .work-showcase-screen img, .work-showcase-mobile img')];
  return {
    activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
    mediaState: section?.dataset.linksMedia ?? null,
    sectionTop: Math.round(section?.getBoundingClientRect().top ?? -9999),
    viewportHeight: innerHeight,
    sourcesAttached: images.every((image) => Boolean(image.getAttribute('src'))),
    imagesDecoded: images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
    imageCount: images.length,
  };
})()`);

await screenshot("desktop-creator.png");
const creatorInitial = await evaluate(`(() => ({
  activeSection: document.querySelector('.main-nav .is-active')?.textContent?.trim() ?? null,
  title: document.querySelector('#creator h2')?.textContent?.trim() ?? '',
  introduction: document.querySelector('#creator .creator-copy > p')?.textContent?.trim() ?? '',
  facts: [...document.querySelectorAll('#creator .creator-facts > div')].map((row) => ({
    label: row.querySelector('dt')?.textContent?.trim() ?? '',
    value: row.querySelector('dd')?.textContent?.trim() ?? '',
  })),
  hudIndex: document.querySelector('#creator .chapter-hud-heading span')?.textContent?.trim() ?? '',
  cards: document.querySelectorAll('#creator .creator-card').length,
  images: document.querySelectorAll('#creator .creator-card img').length,
  imageSources: [...document.querySelectorAll('#creator img')].map((image) => image.currentSrc),
  imagesDecoded: [...document.querySelectorAll('#creator img')].every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
  status: document.querySelector('#creator .creator-copy-status')?.textContent?.trim() ?? '',
  activeCard: document.querySelector('#creator .creator-card-deck')?.dataset.activeCard ?? null,
  pressedCards: [...document.querySelectorAll('#creator .creator-card[aria-pressed="true"]')].map((card) => card.dataset.creatorCard),
  labels: [...document.querySelectorAll('#creator .creator-card')].map((card) => card.getAttribute('aria-label')),
}))()`);

const creatorPointerBefore = await evaluate(`[...document.querySelectorAll('#creator .creator-card')].map((card) => getComputedStyle(card).transform)`);
const creatorDeckPoint = await evaluate(`(() => {
  const rect = document.querySelector('#creator .creator-card-deck')?.getBoundingClientRect();
  return rect ? { x: Math.round(rect.right - 18), y: Math.round(rect.top + rect.height * 0.36) } : null;
})()`);
if (creatorDeckPoint) await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: creatorDeckPoint.x, y: creatorDeckPoint.y });
await delay(120);
const creatorPointerAfter = await evaluate(`[...document.querySelectorAll('#creator .creator-card')].map((card) => getComputedStyle(card).transform)`);

const creatorThirdCardPoint = await evaluate(`(() => {
  const rect = document.querySelectorAll('#creator .creator-card')[2]?.getBoundingClientRect();
  return rect ? { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) } : null;
})()`);
if (creatorThirdCardPoint) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: creatorThirdCardPoint.x, y: creatorThirdCardPoint.y });
  await delay(100);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: creatorThirdCardPoint.x, y: creatorThirdCardPoint.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: creatorThirdCardPoint.x, y: creatorThirdCardPoint.y, button: "left", clickCount: 1 });
}
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 120, y: 420 });
await delay(120);
const creatorClickSelection = await evaluate(`({
  activeCard: document.querySelector('#creator .creator-card-deck')?.dataset.activeCard ?? null,
  pressedCard: document.querySelector('#creator .creator-card[aria-pressed="true"]')?.dataset.creatorCard ?? null,
})`);

await evaluate("document.querySelectorAll('#creator .creator-card')[3]?.focus()");
await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
await delay(120);
const creator = await evaluate(`(() => {
  const stage = document.querySelector('#creator .creator-stage')?.getBoundingClientRect();
  const deck = document.querySelector('#creator .creator-card-deck');
  return {
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
    stageInsideViewport: Boolean(stage && stage.top <= 0 && stage.bottom >= innerHeight - 1),
    activeCard: deck?.dataset.activeCard ?? null,
    pressedCard: document.querySelector('#creator .creator-card[aria-pressed="true"]')?.dataset.creatorCard ?? null,
    focusedCard: document.activeElement?.getAttribute('data-creator-card') ?? null,
    readout: document.querySelector('#creator .creator-deck-readout strong')?.textContent?.trim() ?? '',
    parallaxChanged: ${JSON.stringify(creatorPointerBefore)}.some((value, index) => value !== ${JSON.stringify(creatorPointerAfter)}[index]),
  };
})()`);
creator.clickSelection = creatorClickSelection;

await scrollChapterTo('#creator', 0.99);
const creatorBoundaryDownBefore = await evaluate("Math.round(scrollY)");
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: 120 });
await delay(260);
const creatorBoundaryDown = await evaluate(`(() => {
  const links = document.querySelector('#links');
  const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return {
    nativeDelta: Math.round(scrollY) - ${creatorBoundaryDownBefore},
    pageTop: Math.round(links?.getBoundingClientRect().top ?? -9999),
    padding: Math.round(padding),
  };
})()`);

await scrollChapterTo('#links', 0);
const characterFinalBeforeReverse = await evaluate(`(() => {
  const section = document.querySelector('#character');
  const video = section?.querySelector('.character-film');
  return {
    currentTime: video?.currentTime ?? 0,
    paused: video?.paused ?? true,
  };
})()`);
const nativeBoundaryUpBefore = await evaluate("Math.round(scrollY)");
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 500, deltaX: 0, deltaY: -120 });
await delay(260);
const nativeBoundaryUp = await evaluate(`(() => {
  const creator = document.querySelector('#creator');
  return {
    activeSection: document.querySelector('.main-nav .is-active')?.textContent ?? null,
    nativeDelta: Math.round(scrollY) - ${nativeBoundaryUpBefore},
    pageBottom: Math.round(creator?.getBoundingClientRect().bottom ?? -9999),
    viewportBottom: innerHeight,
  };
})()`);
await scrollChapterTo('#character', 0.2);
const characterFinalAfterReverse = await evaluate(`(() => {
  const section = document.querySelector('#character');
  const video = section?.querySelector('.character-film');
  return {
    currentTime: video?.currentTime ?? 0,
    paused: video?.paused ?? true,
  };
})()`);

await scrollChapterTo('#links', 0.48, 350);
await screenshot("desktop-links.png");
const links = await evaluate(`(() => {
  const desktopImage = document.querySelector('#links .work-showcase-screen img');
  const mobileImage = document.querySelector('#links .work-showcase-mobile img');
  const characterImage = document.querySelector('#links .links-character');
  return {
    featured: document.querySelectorAll('#links .work-showcase').length,
    finalStatusLabels: document.querySelectorAll('#links .chapter-hud-status > span').length,
    showcaseTag: document.querySelector('#links .work-showcase')?.tagName ?? null,
    underlyingLinks: document.querySelectorAll('#links .work-showcase a[href], #links a.work-showcase[href]').length,
    desktopImageLoaded: desktopImage?.complete && desktopImage.naturalWidth > 0,
    mobileImageLoaded: mobileImage?.complete && mobileImage.naturalWidth > 0,
    characterLoaded: characterImage?.complete && characterImage.naturalWidth > 0,
    drawerInsideLinks: document.querySelector('.links-drawer')?.closest('section')?.id === 'links',
    drawerOpacity: Number(getComputedStyle(document.querySelector('.links-drawer')).opacity),
  };
})()`);

const linksShowcaseHit = await evaluate(`(() => {
  const showcase = document.querySelector('#links .work-showcase');
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
if (linksShowcaseHit) {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: linksShowcaseHit.x, y: linksShowcaseHit.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: linksShowcaseHit.x, y: linksShowcaseHit.y, button: "left", clickCount: 1 });
}
await delay(250);
const pageTargetsAfterShowcaseClick = await countPageTargets();
const linksShowcaseNonLink = {
  ...linksShowcaseHit,
  newPageTargets: pageTargetsAfterShowcaseClick - pageTargetsBeforeShowcaseClick,
  currentUrl: await evaluate("location.href"),
};

await scrollChapterTo('#links', 1, 0);
await waitFor("Number(document.querySelector('#links')?.dataset.forwardProgress ?? 0) >= 0.999");
await waitFor("Number(getComputedStyle(document.querySelector('.links-drawer')).opacity) > 0.1");
const linksDrawerOpening = await evaluate(`(() => {
  const drawer = document.querySelector('.links-drawer');
  const rect = drawer?.getBoundingClientRect();
  return {
    opacity: Number(getComputedStyle(drawer).opacity),
    centerDelta: rect ? {
      x: Math.round(Math.abs(rect.left + rect.width / 2 - document.documentElement.clientWidth / 2)),
      y: Math.round(Math.abs(rect.top + rect.height / 2 - innerHeight / 2)),
    } : null,
    centerOffsetY: rect ? Math.round(rect.top + rect.height / 2 - innerHeight / 2) : null,
  };
})()`);
await waitFor("document.querySelector('#links')?.dataset.drawerState === 'settled'");
await screenshot("desktop-links-open.png");
const linksEnd = await evaluate(`(() => {
  const drawer = document.querySelector('.links-drawer');
  const drawerRect = drawer?.getBoundingClientRect();
  const button = document.querySelector('.links-page-back');
  const buttonRect = button?.getBoundingClientRect();
  const progressRect = document.querySelector('#links .chapter-progress-track')?.getBoundingClientRect();
  const links = document.querySelector('#links');
  return {
    rows: document.querySelectorAll('#links .external-link--drawer').length,
    visibleRows: [...document.querySelectorAll('#links .external-link--drawer')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
    hrefs: [...document.querySelectorAll('#links a.external-link--drawer[href]')].map((node) => node.href),
    onlineStatus: document.querySelector('.links-drawer-status')?.textContent?.trim() ?? '',
    drawerVisible: Boolean(drawerRect && Number(getComputedStyle(drawer).opacity) > 0.9 && drawerRect.top < innerHeight && drawerRect.bottom > 0),
    drawerCenterDelta: drawerRect ? { x: Math.round(Math.abs(drawerRect.left + drawerRect.width / 2 - document.documentElement.clientWidth / 2)), y: Math.round(Math.abs(drawerRect.top + drawerRect.height / 2 - innerHeight / 2)) } : null,
    backVisible: Boolean(buttonRect && Number(getComputedStyle(button).opacity) > 0.75 && buttonRect.top < innerHeight && buttonRect.bottom > 0),
    backBelowProgress: Boolean(buttonRect && progressRect && buttonRect.top > progressRect.bottom),
    backCenterDelta: buttonRect ? Math.round(Math.abs(buttonRect.left + buttonRect.width / 2 - document.documentElement.clientWidth / 2)) : null,
    backInsideLinks: button?.closest('section')?.id === 'links',
    footerAbsent: document.querySelector('.site-footer') === null,
    pageEndsWithLinks: links ? Math.abs(document.body.scrollHeight - (links.offsetTop + links.offsetHeight)) <= 1 : false,
  };
})()`);

const linksBackdropHit = await evaluate(`(() => {
  const work = document.querySelector('#links .work-showcase')?.getBoundingClientRect();
  const drawer = document.querySelector('#links .links-drawer')?.getBoundingClientRect();
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
if (linksBackdropHit) {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: linksBackdropHit.x, y: linksBackdropHit.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: linksBackdropHit.x, y: linksBackdropHit.y, button: "left", clickCount: 1 });
}
await delay(250);
const pageTargetsAfterBackdropClick = await countPageTargets();
const linksBackdropProtection = {
  ...linksBackdropHit,
  newPageTargets: pageTargetsAfterBackdropClick - pageTargetsBeforeBackdropClick,
  currentUrl: await evaluate("location.href"),
};

const completedChapterProgress = await evaluate(`({ links: Number(document.querySelector('#links')?.dataset.forwardProgress ?? 0) })`);
const linksFinalBeforeReverse = await evaluate(`(() => {
  const section = document.querySelector('#links');
  return {
    progress: Number(section?.dataset.forwardProgress ?? 0),
    drawerOpacity: getComputedStyle(section.querySelector('.links-drawer')).opacity,
    drawerTransform: getComputedStyle(section.querySelector('.links-drawer')).transform,
    backOpacity: getComputedStyle(section.querySelector('.links-page-back')).opacity,
  };
})()`);
const linksReverseBefore = await evaluate("Math.round(scrollY)");
await wheelAt(720, 500, -120);
const linksFinalAfterReverse = await evaluate(`(() => {
  const section = document.querySelector('#links');
  return {
    progress: Number(section?.dataset.forwardProgress ?? 0),
    drawerOpacity: getComputedStyle(section.querySelector('.links-drawer')).opacity,
    drawerTransform: getComputedStyle(section.querySelector('.links-drawer')).transform,
    backOpacity: getComputedStyle(section.querySelector('.links-page-back')).opacity,
  };
})()`);
const linksReverseNativeDelta = await evaluate(`Math.round(scrollY) - ${linksReverseBefore}`);

await evaluate("document.querySelector('.links-page-back')?.click()");
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
    creatorWarmup,
    creatorInitial,
    creator,
    linksWarmup,
    nativeBoundaryDown,
    creatorBoundaryDown,
    nativeBoundaryUp,
    characterFinalBeforeReverse,
    characterFinalAfterReverse,
    links,
    linksShowcaseNonLink,
    linksDrawerOpening,
    linksEnd,
    linksBackdropProtection,
    completedChapterProgress,
    linksFinalBeforeReverse,
    linksFinalAfterReverse,
    linksReverseNativeDelta,
    backHome,
    portalOneShot,
    talkOpen,
    talkA11yOpen,
    talkA11yClosed,
    talkLatencyMs,
  };
}
