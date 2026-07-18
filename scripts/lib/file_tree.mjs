import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

export async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(absolutePath);
    return entry.isFile() ? [absolutePath] : [];
  }));
  return nestedFiles.flat();
}
