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
  const images = [...document.querySelectorAll('#creator .creator-card img')];
  const copy = document.querySelector('#creator .creator-copy');
  const xLink = document.querySelector('#creator .creator-x-link');
  const xLinkRect = xLink?.getBoundingClientRect();
  return {
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
    cards: document.querySelectorAll('#creator .creator-card').length,
    images: images.length,
    imagesDecoded: images.every((image) => image.complete && image.naturalWidth > 0),
    imageHeightSpread: Math.max(...images.map((image) => image.offsetHeight)) - Math.min(...images.map((image) => image.offsetHeight)),
    imagesPreserveIntrinsicRatio: images.every((image) => {
      const rect = image.getBoundingClientRect();
      return Math.abs(rect.width / rect.height - image.naturalWidth / image.naturalHeight) < 0.01
        && getComputedStyle(image).objectFit === 'contain';
    }),
    railOverflowX: getComputedStyle(rail).overflowX,
    railSnapType: getComputedStyle(rail).scrollSnapType,
    railScrollable: (rail?.scrollWidth ?? 0) > (rail?.clientWidth ?? 0),
    firstCardVisible: Boolean(firstCard && firstCard.left < innerWidth && firstCard.right > 0),
    copyTranslate: copy ? getComputedStyle(copy).translate : null,
    xHref: xLink?.href ?? '',
    xLinkInsideViewport: Boolean(xLinkRect && xLinkRect.left >= 0 && xLinkRect.right <= innerWidth && xLinkRect.top >= 0 && xLinkRect.bottom <= innerHeight),
  };
})()`);
await evaluate("document.querySelector('#creator .creator-card-deck')?.scrollTo({left: 9999, behavior: 'instant'})");
await delay(160);
mobileCreator.scrolled = await evaluate(`(() => {
  const rail = document.querySelector('#creator .creator-card-deck');
  const card = [...(rail?.querySelectorAll('.creator-card') ?? [])].at(-1)?.getBoundingClientRect();
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
  const images = [...document.querySelectorAll('#creator .creator-card img')];
  const xLink = document.querySelector('#creator .creator-x-link');
  const xLinkRect = xLink?.getBoundingClientRect();
  return {
    cards: cards.length,
    images: images.length,
    imagesDecoded: images.every((image) => image.complete && image.naturalWidth > 0),
    imageHeightSpread: Math.max(...images.map((image) => image.offsetHeight)) - Math.min(...images.map((image) => image.offsetHeight)),
    imagesPreserveIntrinsicRatio: images.every((image) => {
      const rect = image.getBoundingClientRect();
      return Math.abs(rect.width / rect.height - image.naturalWidth / image.naturalHeight) < 0.01
        && getComputedStyle(image).objectFit === 'contain';
    }),
    deckDisplay: getComputedStyle(deck).display,
    transformsStatic: cards.every((card) => getComputedStyle(card).transform === 'none'),
    xHref: xLink?.href ?? '',
    xLinkInsideViewport: Boolean(xLinkRect && xLinkRect.left >= 0 && xLinkRect.right <= innerWidth && xLinkRect.top >= 0 && xLinkRect.bottom <= innerHeight),
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

await evaluate("document.querySelector('#creator')?.scrollIntoView({behavior:'instant', block:'start'})");
await waitFor(`(() => {
  const images = [...document.querySelectorAll('#creator .creator-card img')];
  return images.length === 4 && images.every((image) => image.complete && image.naturalWidth > 0);
})()`);
await delay(160);
await screenshot("wide-creator.png");
const wideCreator = await evaluate(`(() => {
  const shell = document.querySelector('#creator .creator-deck-shell');
  const deck = document.querySelector('#creator .creator-card-deck');
  const readout = document.querySelector('#creator .creator-deck-readout');
  const cards = [...document.querySelectorAll('#creator .creator-card')];
  const images = [...document.querySelectorAll('#creator .creator-card img')];
  const shellRect = shell?.getBoundingClientRect();
  const readoutRect = readout?.getBoundingClientRect();
  const cardRects = cards.map((card) => card.getBoundingClientRect());
  const horizontalGap = (a, b) => Math.max(0, b.left - a.right, a.left - b.right);
  const verticalOverlap = (top, bottom) => Math.max(0, Math.min(top.bottom, bottom.bottom) - Math.max(top.top, bottom.top));
  return {
    bodyWidth: document.body.scrollWidth,
    viewportWidth: innerWidth,
    shellWidth: Math.round(shellRect?.width ?? 9999),
    topHorizontalGap: Math.round(horizontalGap(cardRects[0], cardRects[1])),
    bottomHorizontalGap: Math.round(horizontalGap(cardRects[2], cardRects[3])),
    maxVerticalOverlap: Math.round(Math.max(verticalOverlap(cardRects[0], cardRects[2]), verticalOverlap(cardRects[1], cardRects[3]))),
    imageHeightSpread: Math.round(Math.max(...images.map((image) => image.offsetHeight)) - Math.min(...images.map((image) => image.offsetHeight))),
    rowSizes: [...document.querySelectorAll('#creator .creator-card-row')].map((row) => row.querySelectorAll('.creator-card').length),
    readoutAboveCards: Boolean(readoutRect && readoutRect.bottom < Math.min(...cardRects.map((card) => card.top))),
    obsoleteDeckHeadAbsent: !document.querySelector('#creator .creator-deck-head'),
    cards: cards.length,
    deckWidth: Math.round(deck?.getBoundingClientRect().width ?? 9999),
  };
})()`);

await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 620, deviceScaleFactor: 1, mobile: false });
await navigate();
await screenshot("compact-home.png");
const compactHome = await evaluate(`(() => {
  const measure = (selector) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect ? {
      top: Math.round(rect.top), bottom: Math.round(rect.bottom),
      left: Math.round(rect.left), right: Math.round(rect.right),
      inside: rect.top >= -1 && rect.bottom <= innerHeight + 1 && rect.left >= -1 && rect.right <= innerWidth + 1,
    } : null;
  };
  return {
    viewportHeight: innerHeight,
    viewportWidth: innerWidth,
    bodyWidth: document.body.scrollWidth,
    stageHeight: Math.round(document.querySelector('#home')?.getBoundingClientRect().height ?? 0),
    archiveAction: measure('.hero-cta'),
    status: measure('.system-status'),
    controls: measure('.hero-controls'),
    scrollCue: measure('.scroll-cue'),
  };
})()`);

await evaluate("document.querySelector('#gallery')?.scrollIntoView({behavior:'instant', block:'start'})");
await waitFor("document.querySelector('.gallery-form-video.is-active')?.readyState >= 2");
await delay(420);
await screenshot("compact-gallery.png");
const compactGallery = await evaluate(`(() => {
  const measure = (selector) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect ? {
      top: Math.round(rect.top), bottom: Math.round(rect.bottom),
      left: Math.round(rect.left), right: Math.round(rect.right),
      inside: rect.top >= -1 && rect.bottom <= innerHeight + 1 && rect.left >= -1 && rect.right <= innerWidth + 1,
    } : null;
  };
  return {
    viewportHeight: innerHeight,
    viewportWidth: innerWidth,
    bodyWidth: document.body.scrollWidth,
    stageHeight: Math.round(document.querySelector('#gallery .gallery-stage')?.getBoundingClientRect().height ?? 0),
    heading: measure('#gallery .gallery-heading'),
    carousel: measure('#gallery .gallery-carousel'),
    copy: measure('#gallery .gallery-card-copy'),
    pagination: measure('#gallery .gallery-pagination'),
  };
})()`);

await evaluate("document.querySelector('#character')?.scrollIntoView({behavior:'instant', block:'start'})");
await waitFor("document.querySelector('#character .character-film')?.readyState >= 2");
await delay(300);
await screenshot("compact-character.png");
const compactCharacter = await evaluate(`(() => {
  const measure = (selector) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect ? {
      top: Math.round(rect.top), bottom: Math.round(rect.bottom),
      left: Math.round(rect.left), right: Math.round(rect.right),
      inside: rect.top >= -1 && rect.bottom <= innerHeight + 1 && rect.left >= -1 && rect.right <= innerWidth + 1,
    } : null;
  };
  return {
    viewportHeight: innerHeight,
    viewportWidth: innerWidth,
    bodyWidth: document.body.scrollWidth,
    stageHeight: Math.round(document.querySelector('#character .character-stage')?.getBoundingClientRect().height ?? 0),
    inspector: measure('#character .character-inspector'),
    interface: measure('#character .character-interface'),
    readout: measure('#character .character-readout'),
  };
})()`);

await evaluate("document.querySelector('#creator')?.scrollIntoView({behavior:'instant', block:'start'})");
await waitFor(`(() => {
  const images = [...document.querySelectorAll('#creator .creator-card img')];
  return images.length === 4 && images.every((image) => image.complete && image.naturalWidth > 0);
})()`);
await delay(300);
await screenshot("compact-creator.png");
const compactCreator = await evaluate(`(() => {
  const measure = (selector) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect ? {
      top: Math.round(rect.top), bottom: Math.round(rect.bottom),
      left: Math.round(rect.left), right: Math.round(rect.right),
      inside: rect.top >= -1 && rect.bottom <= innerHeight + 1 && rect.left >= -1 && rect.right <= innerWidth + 1,
    } : null;
  };
  const cards = [...document.querySelectorAll('#creator .creator-card')].map((card) => {
    const rect = card.getBoundingClientRect();
    return rect.top >= -1 && rect.bottom <= innerHeight + 1 && rect.left >= -1 && rect.right <= innerWidth + 1;
  });
  return {
    viewportHeight: innerHeight,
    viewportWidth: innerWidth,
    bodyWidth: document.body.scrollWidth,
    stageHeight: Math.round(document.querySelector('#creator .creator-stage')?.getBoundingClientRect().height ?? 0),
    copy: measure('#creator .creator-copy'),
    xLink: measure('#creator .creator-x-link'),
    deck: measure('#creator .creator-card-deck'),
    readout: measure('#creator .creator-deck-readout'),
    cardsInside: cards.every(Boolean),
  };
})()`);

await evaluate("document.querySelector('#links')?.scrollIntoView({behavior:'instant', block:'start'})");
await delay(420);
await screenshot("compact-links.png");
const compactLinks = await evaluate(`(() => {
  const measure = (selector) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect ? {
      top: Math.round(rect.top), bottom: Math.round(rect.bottom),
      left: Math.round(rect.left), right: Math.round(rect.right),
      inside: rect.top >= -1 && rect.bottom <= innerHeight + 1 && rect.left >= -1 && rect.right <= innerWidth + 1,
    } : null;
  };
  return {
    viewportHeight: innerHeight,
    viewportWidth: innerWidth,
    bodyWidth: document.body.scrollWidth,
    stageHeight: Math.round(document.querySelector('#links .links-stage')?.getBoundingClientRect().height ?? 0),
    showcase: measure('#links .work-showcase'),
    progress: measure('#links .chapter-progress-track'),
  };
})()`);

await scrollChapterTo('#links', 1, 0);
await waitFor("Number(document.querySelector('#links')?.dataset.forwardProgress ?? 0) >= 0.999");
await waitFor("document.querySelector('#links')?.dataset.drawerState === 'settled'");
await screenshot("compact-links-open.png");
compactLinks.drawer = await evaluate(`(() => {
  const drawer = document.querySelector('#links .links-drawer');
  const close = document.querySelector('#links .links-drawer-close');
  const rect = drawer?.getBoundingClientRect();
  const closeRect = close?.getBoundingClientRect();
  return {
    headerBottom: Math.round(document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? -1),
    top: Math.round(rect?.top ?? -1),
    bottom: Math.round(rect?.bottom ?? -1),
    width: Math.round(rect?.width ?? -1),
    height: Math.round(rect?.height ?? -1),
    clientHeight: drawer?.clientHeight ?? -1,
    scrollHeight: drawer?.scrollHeight ?? -1,
    inside: Boolean(rect && rect.top >= -1 && rect.bottom <= innerHeight + 1),
    closeInside: Boolean(closeRect && rect && closeRect.top >= rect.top && closeRect.right <= rect.right && closeRect.bottom <= rect.bottom),
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
    wideCreator,
    compactHome,
    compactGallery,
    compactCharacter,
    compactCreator,
    compactLinks,
  };
}
