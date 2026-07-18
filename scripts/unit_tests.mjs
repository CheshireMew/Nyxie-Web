import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { collectManifestPaths } from "./lib/media_manifest.mjs";
import { normalizeSiteUrl } from "./lib/site_url.mjs";

const sampling = await import(pathToFileURL(resolve("src/features/gallery/gallerySampling.ts")));
const heroSequence = await import(pathToFileURL(resolve("src/features/hero/heroSequence.ts")));

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

assert.deepEqual(
  collectManifestPaths({ a: "one", nested: { b: "two" }, list: ["three"] }),
  ["one", "two", "three"],
);
assert.equal(normalizeSiteUrl(undefined), null);
assert.equal(normalizeSiteUrl(" https://example.com/nyxie?draft=1#top "), "https://example.com/nyxie/");
assert.throws(() => normalizeSiteUrl("example.com/nyxie"));

console.log("聚焦测试通过：Gallery 采样、Hero 序列、媒体清单和部署 URL 规则正常。");
