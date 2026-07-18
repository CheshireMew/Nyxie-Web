import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { collectFiles } from "./lib/file_tree.mjs";
import { loadMediaManifest } from "./lib/media_manifest.mjs";

const root = resolve(import.meta.dirname, "..");
const publicDirectory = resolve(root, "public");
const manifestPath = resolve(root, "src/content/mediaManifest.json");
const { assetPaths } = await loadMediaManifest(manifestPath);
const duplicates = assetPaths.filter((assetPath, index) => assetPaths.indexOf(assetPath) !== index);
if (duplicates.length) throw new Error(`媒体清单存在重复路径：${[...new Set(duplicates)].join(", ")}`);

const missing = [];
const empty = [];
for (const assetPath of assetPaths) {
  const absolutePath = resolve(publicDirectory, assetPath);
  const publicRelativePath = relative(publicDirectory, absolutePath);
  if (publicRelativePath.startsWith("..") || isAbsolute(publicRelativePath)) {
    throw new Error(`媒体路径越过 public 边界：${assetPath}`);
  }
  try {
    await access(absolutePath, constants.R_OK);
    if ((await stat(absolutePath)).size === 0) empty.push(assetPath);
  } catch {
    missing.push(assetPath);
  }
}

const declared = new Set(assetPaths.map((assetPath) => assetPath.replaceAll("\\", "/")));
const runtimeFiles = await collectFiles(resolve(publicDirectory, "assets"));
const undeclared = runtimeFiles
  .map((absolutePath) => absolutePath.slice(publicDirectory.length + 1).replaceAll("\\", "/"))
  .filter((assetPath) => !declared.has(assetPath));

if (missing.length || empty.length || undeclared.length) {
  const messages = [];
  if (missing.length) messages.push(`缺少：${missing.join(", ")}`);
  if (empty.length) messages.push(`空文件：${empty.join(", ")}`);
  if (undeclared.length) messages.push(`未声明：${undeclared.join(", ")}`);
  throw new Error(messages.join("；"));
}

console.log(`媒体边界验证通过：${assetPaths.length} 个文件，且没有未声明文件。`);
