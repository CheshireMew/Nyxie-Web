import { BrowserHarness } from "./browser_harness.mjs";

const browser = await BrowserHarness.connect();

try {
  await browser.initialize();
  const { send, evaluate, waitFor, delay, screenshot, navigate } = {
    send: browser.send.bind(browser),
    evaluate: browser.evaluate.bind(browser),
    waitFor: browser.waitFor.bind(browser),
    delay: browser.delay.bind(browser),
    screenshot: browser.screenshot.bind(browser),
    navigate: browser.navigate.bind(browser),
  };

  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate();
  await evaluate("document.querySelector('#gaze')?.scrollIntoView({ behavior: 'instant', block: 'start' })");
  await waitFor("location.hash === '#gaze' && document.querySelector('#gaze .gaze-video')?.readyState >= 2 && document.querySelector('#gaze .gaze-video')?.paused");

  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 720, y: 120 });
  await waitFor("document.querySelector('#gaze .gaze-stage')?.dataset.gazeDirection === 'FRONT'");
  await delay(800);
  const topCenterTime = await evaluate("document.querySelector('#gaze .gaze-video')?.currentTime ?? -1");
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 720, y: 880 });
  await delay(800);
  const bottomCenterTime = await evaluate("document.querySelector('#gaze .gaze-video')?.currentTime ?? -1");

  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1290, y: 430 });
  const firstTurnSamples = [];
  for (let index = 0; index < 10; index += 1) {
    await delay(100);
    firstTurnSamples.push(await evaluate("document.querySelector('#gaze .gaze-video')?.currentTime ?? -1"));
  }
  await delay(500);
  const rightTime = await evaluate("document.querySelector('#gaze .gaze-video')?.currentTime ?? -1");

  // Traverse the whole real source passage from right to left. Every sampled
  // time must move backward continuously inside the measured 8.25–12.25s
  // interval; there is no circular seam to cross anymore.
  const continuousSweepSamples = [];
  for (let index = 0; index <= 24; index += 1) {
    const x = 1290 - index * (1150 / 24);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y: 180 });
    await delay(110);
    continuousSweepSamples.push(await evaluate("document.querySelector('#gaze .gaze-video')?.currentTime ?? -1"));
  }
  await delay(600);
  const leftTime = await evaluate("document.querySelector('#gaze .gaze-video')?.currentTime ?? -1");

  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 720, y: 430 });
  await waitFor("document.querySelector('#gaze .gaze-stage')?.dataset.gazeDirection === 'FRONT'");
  await delay(1200);
  const centerTime = await evaluate("document.querySelector('#gaze .gaze-video')?.currentTime ?? -1");
  await screenshot("desktop-gaze.png");
  const desktop = await evaluate(`(() => {
    const stage = document.querySelector('#gaze .gaze-stage');
    const video = document.querySelector('#gaze .gaze-video');
    const title = document.querySelector('#gaze .gaze-copy')?.getBoundingClientRect();
    const readout = document.querySelector('#gaze .gaze-readout')?.getBoundingClientRect();
    return {
      bodyWidth: document.body.scrollWidth,
      viewportWidth: innerWidth,
      stageHeight: Math.round(stage?.getBoundingClientRect().height ?? 0),
      source: video?.currentSrc ?? '',
      duration: video?.duration ?? 0,
      paused: video?.paused ?? false,
      readyState: video?.readyState ?? 0,
      direction: stage?.dataset.gazeDirection ?? '',
      titleInside: Boolean(title && title.left >= 0 && title.right <= innerWidth && title.top >= 0 && title.bottom <= innerHeight),
      readoutInside: Boolean(readout && readout.left >= 0 && readout.right <= innerWidth && readout.top >= 0 && readout.bottom <= innerHeight),
    };
  })()`);

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate();
  await evaluate("document.querySelector('#gaze')?.scrollIntoView({ behavior: 'instant', block: 'start' })");
  await waitFor("location.hash === '#gaze' && document.querySelector('#gaze .gaze-video')?.readyState >= 2");
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 345, y: 360 }] });
  await delay(180);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await delay(500);
  await screenshot("mobile-gaze.png");
  const mobile = await evaluate(`(() => {
    const poster = document.querySelector('#gaze .gaze-poster');
    const readout = document.querySelector('#gaze .gaze-readout')?.getBoundingClientRect();
    return {
      bodyWidth: document.body.scrollWidth,
      viewportWidth: innerWidth,
      direction: document.querySelector('#gaze .gaze-stage')?.dataset.gazeDirection ?? '',
      posterLoaded: Boolean(poster?.complete && poster.naturalWidth > 0),
      readoutInside: Boolean(readout && readout.left >= 0 && readout.right <= innerWidth && readout.bottom <= innerHeight),
    };
  })()`);

  await send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await navigate();
  await evaluate("document.querySelector('#gaze')?.scrollIntoView({ behavior: 'instant', block: 'start' })");
  await waitFor("document.querySelector('#gaze .gaze-poster')?.complete === true");
  const reduced = await evaluate(`({
    hasVideo: Boolean(document.querySelector('#gaze .gaze-video')),
    posterLoaded: (document.querySelector('#gaze .gaze-poster')?.naturalWidth ?? 0) > 0,
  })`);
  await send("Emulation.setEmulatedMedia", { media: "screen", features: [] });

  const report = { topCenterTime, bottomCenterTime, firstTurnSamples, continuousSweepSamples, rightTime, leftTime, centerTime, desktop, mobile, reduced, browserErrors: browser.browserErrors };
  console.log(JSON.stringify(report, null, 2));

  const isNondecreasing = firstTurnSamples.every((time, index) => index === 0 || time >= firstTurnSamples[index - 1] - 0.03);
  const isNonincreasing = continuousSweepSamples.every((time, index) => index === 0 || time <= continuousSweepSamples[index - 1] + 0.03);
  const largestSweepStep = Math.max(...continuousSweepSamples.slice(1).map((time, index) => Math.abs(time - continuousSweepSamples[index])));
  const checks = [
    [Math.abs(topCenterTime - 10.5) < 0.08 && Math.abs(bottomCenterTime - 10.5) < 0.08, "vertical pointer movement stays on the real front frame because the source has no up/down poses"],
    [isNondecreasing && firstTurnSamples.every((time) => time >= 10.45 && time <= 12.3), "center-to-right movement advances monotonically inside the measured source passage"],
    [isNonincreasing && largestSweepStep < 0.65 && continuousSweepSamples.every((time) => time >= 8.2 && time <= 12.3), "right-to-left sweep remains continuous and never wraps outside the measured source passage"],
    [rightTime > 12.15 && rightTime < 12.3, "right pointer reaches the measured right-looking source frame"],
    [leftTime > 8.2 && leftTime < 8.35, "left pointer reaches the measured left-looking source frame"],
    [centerTime > 10.42 && centerTime < 10.58, "center pointer reaches the measured front source frame"],
    [desktop.bodyWidth <= desktop.viewportWidth && desktop.stageHeight === 1000 && desktop.source.endsWith("/assets/gaze/gaze-scrub-original.webm") && Math.abs(desktop.duration - 15.042) < 0.04 && desktop.paused && desktop.readyState >= 2 && desktop.titleInside && desktop.readoutInside, "desktop Gaze layout and original unblended scrub media"],
    [mobile.bodyWidth <= mobile.viewportWidth && mobile.direction === "RIGHT" && mobile.posterLoaded && mobile.readoutInside, "mobile Gaze horizontal touch interaction and layout"],
    [!reduced.hasVideo && reduced.posterLoaded, "reduced-motion Gaze poster path"],
    [browser.browserErrors.length === 0, "browser console"],
    [browser.failedResources.length === 0, "resource loading"],
  ];
  const failures = checks.filter(([passed]) => !passed).map(([, label]) => label);
  if (failures.length) throw new Error(`Gaze acceptance failed: ${failures.join(", ")}`);
} finally {
  browser.close();
}
