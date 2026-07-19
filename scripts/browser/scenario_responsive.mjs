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

await scrollChapterTo('#character', 0);
await waitFor("document.querySelector('#character .character-film')?.readyState >= 2");
const mobileCharacter = await evaluate(`(() => {
  const video = document.querySelector('#character .character-film');
  const title = document.querySelector('#character .character-interface')?.getBoundingClientRect();
  const instruction = document.querySelector('#character .character-instruction--touch');
  return {
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
    videoReadyState: video?.readyState ?? 0,
    videoWidth: video?.videoWidth ?? 0,
    videoHeight: video?.videoHeight ?? 0,
    videoMuted: video?.muted ?? false,
    objectFit: getComputedStyle(video).objectFit,
    objectPosition: getComputedStyle(video).objectPosition,
    titleInsideViewport: Boolean(title && title.left >= 0 && title.right <= innerWidth && title.top >= 0 && title.bottom <= innerHeight),
    touchInstructionVisible: instruction ? getComputedStyle(instruction).display !== 'none' : false,
  };
})()`);
await screenshot("mobile-character.png");

await scrollChapterTo('#creator', 0);
await waitFor(`(() => {
  const images = [...document.querySelectorAll('#creator .creator-card img')];
  return images.length === 4 && images.every((image) => image.complete && image.naturalWidth > 0);
})()`);
await screenshot("mobile-creator.png");
const mobileCreator = await evaluate(`(() => {
  const rail = document.querySelector('#creator .creator-card-deck');
  const firstCard = rail?.querySelector('.creator-card')?.getBoundingClientRect();
  return {
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
    cards: document.querySelectorAll('#creator .creator-card').length,
    images: document.querySelectorAll('#creator .creator-card img').length,
    imagesDecoded: [...document.querySelectorAll('#creator .creator-card img')].every((image) => image.complete && image.naturalWidth > 0),
    railOverflowX: getComputedStyle(rail).overflowX,
    railSnapType: getComputedStyle(rail).scrollSnapType,
    railScrollable: (rail?.scrollWidth ?? 0) > (rail?.clientWidth ?? 0),
    firstCardVisible: Boolean(firstCard && firstCard.left < innerWidth && firstCard.right > 0),
  };
})()`);
await evaluate("document.querySelector('#creator .creator-card-deck')?.scrollTo({left: 9999, behavior: 'instant'})");
await delay(160);
mobileCreator.scrolled = await evaluate(`(() => {
  const rail = document.querySelector('#creator .creator-card-deck');
  const card = rail?.querySelector('.creator-card:last-child')?.getBoundingClientRect();
  const bounds = rail?.getBoundingClientRect();
  return {
    scrollLeft: rail?.scrollLeft ?? 0,
    lastCardVisible: Boolean(card && bounds && card.left < bounds.right && card.right > bounds.left),
  };
})()`);

await scrollChapterTo('#links', 1, 0);
await waitFor("Number(document.querySelector('#links')?.dataset.forwardProgress ?? 0) >= 0.999");
await waitFor("document.querySelector('#links')?.dataset.drawerState === 'settled'");
await screenshot("mobile-links-open.png");
const mobileLinks = await evaluate(`(() => {
  const drawer = document.querySelector('.links-drawer');
  const drawerRect = drawer?.getBoundingClientRect();
  const buttonRect = document.querySelector('.links-page-back')?.getBoundingClientRect();
  const progressRect = document.querySelector('#links .chapter-progress-track')?.getBoundingClientRect();
  return {
    bodyWidth: document.body.scrollWidth, viewportWidth: innerWidth,
    featured: document.querySelectorAll('#links .work-showcase').length,
    rows: document.querySelectorAll('#links .external-link--drawer').length,
    visibleRows: [...document.querySelectorAll('#links .external-link--drawer')].filter((node) => Number(getComputedStyle(node).opacity) > 0.45).length,
    drawerVisible: Boolean(drawerRect && Number(getComputedStyle(drawer).opacity) > 0.9 && drawerRect.top >= 0 && drawerRect.bottom <= innerHeight),
    drawerCenterDelta: drawerRect ? Math.round(Math.abs(drawerRect.left + drawerRect.width / 2 - document.documentElement.clientWidth / 2)) : null,
    backVisible: Boolean(buttonRect && Number(getComputedStyle(document.querySelector('.links-page-back')).opacity) > 0.75 && buttonRect.top < innerHeight && buttonRect.bottom > 0),
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

await evaluate("document.querySelector('#creator')?.scrollIntoView({behavior:'instant', block:'start'})");
await waitFor(`(() => {
  const images = [...document.querySelectorAll('#creator .creator-card img')];
  return images.length === 4 && images.every((image) => image.complete && image.naturalWidth > 0);
})()`);
await delay(160);
await screenshot("reduced-motion-creator.png");
const reducedCreator = await evaluate(`(() => {
  const cards = [...document.querySelectorAll('#creator .creator-card')];
  const deck = document.querySelector('#creator .creator-card-deck');
  return {
    cards: cards.length,
    images: document.querySelectorAll('#creator .creator-card img').length,
    imagesDecoded: [...document.querySelectorAll('#creator .creator-card img')].every((image) => image.complete && image.naturalWidth > 0),
    deckDisplay: getComputedStyle(deck).display,
    transformsStatic: cards.every((card) => getComputedStyle(card).transform === 'none'),
    cursorHidden: getComputedStyle(document.querySelector('.cursor-ring')).display === 'none',
  };
})()`);

await evaluate("document.querySelector('.links-drawer')?.scrollIntoView({behavior:'instant', block:'center'})");
await delay(500);
await screenshot("reduced-motion-links.png");
const reducedLinks = await evaluate(`(() => {
  const drawer = document.querySelector('.links-drawer');
  const rect = drawer?.getBoundingClientRect();
  return {
    drawerVisible: Boolean(rect && Number(getComputedStyle(drawer).opacity) === 1 && rect.top < innerHeight && rect.bottom > 0),
    rows: document.querySelectorAll('#links .external-link--drawer').length,
    workVisible: Number(getComputedStyle(document.querySelector('#links .work-showcase')).opacity) === 1,
    backInsideLinks: document.querySelector('.links-page-back')?.closest('section')?.id === 'links',
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
    mobileCreator,
    mobileLinks,
    reducedGallery,
    reducedCreator,
    reducedLinks,
    wideGallery,
  };
}
