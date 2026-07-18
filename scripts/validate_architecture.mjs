import { readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { collectFiles } from "./lib/file_tree.mjs";

const root = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(root, "src");
const sourceFiles = (await collectFiles(sourceDirectory)).filter((file) => [".ts", ".tsx"].includes(extname(file)));
const sourceByPath = new Map(await Promise.all(sourceFiles.map(async (file) => [file, await readFile(file, "utf8")])));
const failures = [];

function projectPath(file) {
  return relative(root, file).replaceAll("\\", "/");
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  return [`.ts`, `.tsx`].map((extension) => `${base}${extension}`).find((candidate) => sourceByPath.has(candidate)) ?? null;
}

const graph = new Map(sourceFiles.map((file) => {
  const dependencies = [...sourceByPath.get(file).matchAll(/^import .* from "([^"]+)"/gm)]
    .map((match) => resolveImport(file, match[1]))
    .filter(Boolean);
  return [file, [...new Set(dependencies)]];
}));

const visited = new Set();
const active = new Set();
function visit(file, path = []) {
  if (active.has(file)) {
    const start = path.indexOf(file);
    failures.push(`循环依赖：${[...path.slice(start), file].map(projectPath).join(" -> ")}`);
    return;
  }
  if (visited.has(file)) return;
  active.add(file);
  for (const dependency of graph.get(file) ?? []) visit(dependency, [...path, file]);
  active.delete(file);
  visited.add(file);
}
sourceFiles.forEach((file) => visit(file));

const allSource = [...sourceByPath.entries()].map(([file, content]) => `${projectPath(file)}\n${content}`).join("\n");
for (const forbidden of ["dataset.chapterNavigation", "nyxie:chapter-settled"]) {
  if (allSource.includes(forbidden)) failures.push(`仍存在旧章节导航协议：${forbidden}`);
}

for (const [file, content] of sourceByPath) {
  const path = projectPath(file);
  if (path.startsWith("src/sections/") && /id="(?:home|gallery|character|personality|links|works)"/.test(content)) {
    failures.push(`章节组件仍硬编码注册 ID：${path}`);
  }
  if (path.startsWith("src/sections/") && /<ChapterHud\s+index="/.test(content)) {
    failures.push(`章节组件仍硬编码 HUD 编号：${path}`);
  }
  if (path.startsWith("src/sections/") && [...graph.get(file) ?? []].some((dependency) => projectPath(dependency).startsWith("src/sections/"))) {
    failures.push(`章节之间不应直接依赖：${path}`);
  }
}

const sizeLimits = new Map([
  ["src/hooks/usePerformanceDirector.ts", 150],
  ["src/sections/GallerySection.tsx", 180],
]);
for (const [path, limit] of sizeLimits) {
  const content = [...sourceByPath.entries()].find(([file]) => projectPath(file) === path)?.[1];
  const lines = content?.split(/\r?\n/).length ?? 0;
  if (lines > limit) failures.push(`${path} 超过职责边界：${lines} 行，限制 ${limit} 行`);
}

const browserEntry = await readFile(resolve(root, "scripts/browser_acceptance.mjs"), "utf8");
if (browserEntry.split(/\r?\n/).length > 80) failures.push("浏览器验收入口再次聚合了场景实现。");
if (sourceByPath.get(resolve(sourceDirectory, "hooks/usePerformanceDirector.ts"))?.includes("class HeroPerformanceController")) {
  failures.push("Hero 状态机重新进入了 React hook。");
}
if (/useState\(|HTMLVideoElement|createSeededRandom|const onWheel/.test(sourceByPath.get(resolve(sourceDirectory, "sections/GallerySection.tsx")) ?? "")) {
  failures.push("Gallery 状态或媒体生命周期重新进入了章节视图。");
}

if (failures.length) throw new Error(failures.join("\n"));
console.log(`架构边界验证通过：${sourceFiles.length} 个模块无循环依赖，旧协议和上帝入口均未回流。`);
