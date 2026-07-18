import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertAcceptance } from "./browser/assert_acceptance.mjs";
import { BrowserHarness } from "./browser/browser_harness.mjs";
import { runChapterScenario } from "./browser/scenario_chapters.mjs";
import { runHeroGalleryScenario } from "./browser/scenario_hero_gallery.mjs";
import { runHomeScenario } from "./browser/scenario_home.mjs";
import { runResponsiveScenario } from "./browser/scenario_responsive.mjs";

const browser = await BrowserHarness.connect();

try {
  await browser.initialize();
  const home = await runHomeScenario(browser);
  const heroGallery = await runHeroGalleryScenario(browser);
  const chapters = await runChapterScenario(browser);
  const responsive = await runResponsiveScenario(browser);
  const report = {
    ...home,
    ...heroGallery.report,
    ...chapters,
    ...responsive,
    browserErrors: browser.browserErrors,
    failedResources: browser.failedResources,
  };

  await writeFile(
    resolve(browser.outputDirectory, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  assertAcceptance(report, heroGallery.evidence, browser.siteUrl);
} finally {
  browser.close();
}
