import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { collectManifestPaths } from "./lib/media_manifest.mjs";
import { normalizeSiteUrl } from "./lib/site_url.mjs";

const sampling = await import(pathToFileURL(resolve("src/features/gallery/gallerySampling.ts")));
const heroSequence = await import(pathToFileURL(resolve("src/features/hero/heroSequence.ts")));
const creatorRows = await import(pathToFileURL(resolve("src/features/creator/creatorCardRows.ts")));
const gazeTimeline = await import(pathToFileURL(resolve("src/features/gaze/gazeTimeline.ts")));

const sourceItems = ["a", "b", "c", "d", "e"];
const firstSample = sampling.selectSeededSample(sourceItems, "stable-seed", 3);
const secondSample = sampling.selectSeededSample(sourceItems, "stable-seed", 3);
assert.deepEqual(firstSample, secondSample, "seeded Gallery samples must be deterministic");
assert.equal(new Set(firstSample).size, 3, "Gallery samples must not repeat forms");
assert.deepEqual(sourceItems, ["a", "b", "c", "d", "e"], "sampling must not mutate canonical content");
assert.equal(sampling.wrapIndex(-1, 8), 7);
assert.equal(sampling.wrapIndex(9, 8), 1);
assert.throws(() => sampling.wrapIndex(0, 0));

assert.deepEqual(heroSequence.chooseNextHeroClip("idleMain", null, () => 0), {
  nextKey: "idleKey",
  lastAmbientAction: null,
});
assert.deepEqual(heroSequence.chooseNextHeroClip("tease", "tease", () => 0), {
  nextKey: "idleMain",
  lastAmbientAction: "tease",
});
const ambientStep = heroSequence.chooseNextHeroClip("idleKey", "reactKey", () => 0);
assert.equal(ambientStep.nextKey, "vanish", "ambient actions must not immediately repeat");
assert.equal(ambientStep.lastAmbientAction, ambientStep.nextKey);

assert.deepEqual(creatorRows.arrangeCreatorCards([1, 2, 3, 4]), [[1, 2], [3, 4]]);
assert.deepEqual(creatorRows.arrangeCreatorCards([1, 2, 3, 4, 5]), [[1, 2, 3], [4, 5]]);
assert.deepEqual(creatorRows.arrangeCreatorCards([1, 2, 3, 4, 5, 6]), [[1, 2, 3], [4, 5, 6]]);
assert.deepEqual(creatorRows.arrangeCreatorCards([]), []);

assert.equal(gazeTimeline.gazeDirectionAtPosition(-1), "LEFT");
assert.equal(gazeTimeline.gazeDirectionAtPosition(0), "FRONT");
assert.equal(gazeTimeline.gazeDirectionAtPosition(1), "RIGHT");
assert.equal(gazeTimeline.gazePositionFromHorizontalOffset(-0.78), -1);
assert.equal(gazeTimeline.gazePositionFromHorizontalOffset(0), 0);
assert.equal(gazeTimeline.gazePositionFromHorizontalOffset(0.78), 1);
assert.equal(gazeTimeline.gazePositionFromHorizontalOffset(3), 1);
assert.deepEqual(gazeTimeline.gazeEyeAnchorInCover(1920, 1080), { x: 960, y: 588.6 });
const ultraWideEyeAnchor = gazeTimeline.gazeEyeAnchorInCover(2048, 1000);
assert.ok(Math.abs(ultraWideEyeAnchor.x - 1024) < 0.0001);
assert.ok(Math.abs(ultraWideEyeAnchor.y - 551.84) < 0.0001);
assert.equal(gazeTimeline.gazeTimeAtPosition(-1), 8.25);
assert.equal(gazeTimeline.gazeTimeAtPosition(0), 10.5);
assert.equal(gazeTimeline.gazeTimeAtPosition(1), 12.25);
assert.equal(gazeTimeline.gazeTimeAtPosition(-0.5), 9.375);
assert.equal(gazeTimeline.gazeTimeAtPosition(0.5), 11.375);
assert.equal(gazeTimeline.clampGazeTime(3), 8.25);
assert.equal(gazeTimeline.clampGazeTime(15), 12.25);

assert.deepEqual(
  collectManifestPaths({ a: "one", nested: { b: "two" }, list: ["three"] }),
  ["one", "two", "three"],
);
assert.equal(normalizeSiteUrl(undefined), null);
assert.equal(normalizeSiteUrl(" https://example.com/nyxie?draft=1#top "), "https://example.com/nyxie/");
assert.throws(() => normalizeSiteUrl("example.com/nyxie"));

console.log("聚焦测试通过：Gallery 采样、Hero 序列、Creator 卡片分组、媒体清单和部署 URL 规则正常。");
