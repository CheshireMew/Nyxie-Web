import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { collectFiles } from "./lib/file_tree.mjs";
import { loadMediaManifest } from "./lib/media_manifest.mjs";
import { normalizeSiteUrl } from "./lib/site_url.mjs";

const root = resolve(import.meta.dirname, "..");
const publicDirectory = resolve(root, "public");
const distDirectory = resolve(root, "dist");
const { assetPaths: manifestPaths } = await loadMediaManifest(resolve(root, "src/content/mediaManifest.json"));
for (const assetPath of manifestPaths) {
  const source = await readFile(resolve(publicDirectory, assetPath));
  const built = await readFile(resolve(distDirectory, assetPath));
  if (!source.equals(built)) throw new Error(`构建产物与媒体源不一致：${assetPath}`);
}

const declared = new Set(manifestPaths);
const runtimeDirectories = new Set(["audio", "character", "gallery", "media", "works"]);
const builtAssetFiles = await collectFiles(resolve(distDirectory, "assets"));
const undeclaredRuntimeFiles = builtAssetFiles
  .map((absolutePath) => relative(distDirectory, absolutePath).replaceAll("\\", "/"))
  .filter((assetPath) => runtimeDirectories.has(assetPath.split("/")[1]) && !declared.has(assetPath));
if (undeclaredRuntimeFiles.length) {
  throw new Error(`构建产物包含未声明媒体：${undeclaredRuntimeFiles.join(", ")}`);
}

const html = await readFile(resolve(distDirectory, "index.html"), "utf8");
if (html.includes("%BASE_URL%") || html.includes("/src/main.tsx")) {
  throw new Error("构建后的 index.html 仍包含开发期占位符或源码入口。");
}

const moduleSource = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
const stylesheet = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1];
if (!moduleSource?.startsWith("./assets/") || !stylesheet?.startsWith("./assets/")) {
  throw new Error("生产 JS/CSS 入口不是可部署的相对资源地址。");
}

const normalizedSiteUrl = normalizeSiteUrl(process.env.NYXIE_SITE_URL);
if (normalizedSiteUrl) {
  const expectedShareImage = `${normalizedSiteUrl}assets/media/anchor-b.webp`;
  if (
    !html.includes(`<link rel="canonical" href="${normalizedSiteUrl}"`)
    || !html.includes(`<meta property="og:url" content="${normalizedSiteUrl}"`)
    || !html.includes(`<meta property="og:image" content="${expectedShareImage}"`)
  ) throw new Error("构建产物缺少与 NYXIE_SITE_URL 一致的绝对分享元数据。");
} else if (html.includes('rel="canonical"') || html.includes('property="og:url"')) {
  throw new Error("未配置 NYXIE_SITE_URL 时不应生成 canonical 或 og:url。");
}

for (const localReference of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)[^"\s]*"/g)) {
  await readFile(resolve(distDirectory, localReference[1].slice(2)));
}

console.log(`生产产物验证通过：${manifestPaths.length} 个媒体副本一致，HTML 入口和相对资源完整。`);
