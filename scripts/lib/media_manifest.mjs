import { readFile } from "node:fs/promises";

export function collectManifestPaths(value, paths = []) {
  if (typeof value === "string") {
    paths.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectManifestPaths(item, paths));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectManifestPaths(item, paths));
  }
  return paths;
}

export async function loadMediaManifest(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return { manifest, assetPaths: collectManifestPaths(manifest) };
}
