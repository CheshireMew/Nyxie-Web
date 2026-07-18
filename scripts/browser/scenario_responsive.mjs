export async function runResponsiveScenario(browser) {
  const send = browser.send.bind(browser);
  const evaluate = browser.evaluate.bind(browser);
  const delay = browser.delay.bind(browser);
  const waitFor = browser.waitFor.bind(browser);
  const screenshot = browser.screenshot.bind(browser);
  const scrollChapterTo = browser.scrollChapterTo.bind(browser);
  const navigate = browser.navigate.bind(browser);

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await navigate();
await screenshot("mobile-home.png");
const mobileHome = await evaluate(`({
  bodyWidth: document.body.scrollWidth,
  viewportWidth: innerWidth,
  menuVisible: getComputedStyle(document.querySelector('.menu-button')).display,
  headerHeight: document.querySelector('.site-header')?.getBoundingClientRect().height ?? null,
})`);

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

await send("Emulation.setDeviceMetricsOverride", { width: 2048, height: 846, deviceScaleFactor: 1, mobile: false });
await navigate();
await evaluate("document.querySelector('#gallery')?.scrollIntoView({behavior:'instant', block:'start'})");
await waitFor("document.querySelector('.gallery-form-video.is-active')?.readyState >= 2");
await delay(500);
await screenshot("wide-gallery.png");
const wideGallery = await evaluate(`(() => {
  const previous = document.querySelector('.gallery-side-card--previous')?.getBoundingClientRect();
  const next = document.querySelector('.gallery-side-card--next')?.getBoundingClientRect();
  const carousel = document.querySelector('.gallery-carousel')?.getBoundingClientRect();
  const copy = document.querySelector('.gallery-card-copy')?.getBoundingClientRect();
  const media = document.querySelector('.gallery-media')?.getBoundingClientRect();
  const header = document.querySelector('.site-header')?.getBoundingClientRect();
  return {
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
    previousLeft: Math.round(previous?.left ?? -9999),
    previousRight: Math.round(previous?.right ?? 9999),
    previousTop: Math.round(previous?.top ?? -9999),
    nextLeft: Math.round(next?.left ?? -9999),
    nextTop: Math.round(next?.top ?? -9999),
    carouselLeft: Math.round(carousel?.left ?? -9999),
    carouselTop: Math.round(carousel?.top ?? -9999),
    copyLeft: Math.round(copy?.left ?? -9999),
    figureBaseline: Math.round(media?.bottom ?? -9999),
    headerBottom: Math.round(header?.bottom ?? -9999),
    cards: document.querySelectorAll('.gallery-pagination button').length,
  };
})()`);

  return {
    mobileHome,
    mobileGallery,
    mobileCharacter,
    mobilePersonality,
    mobileLinks,
    mobileWorks,
    reducedGallery,
    reducedWorks,
    wideGallery,
  };
}
