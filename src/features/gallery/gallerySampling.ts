export const sampledFormCount = 3;

export function createSeededRandom(seed: string) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function selectSeededSample<Item>(items: readonly Item[], seed: string, count: number) {
  const random = createSeededRandom(seed);
  const candidates = [...items];
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
  }
  return candidates.slice(0, Math.max(0, Math.min(count, candidates.length)));
}

export function wrapIndex(index: number, length: number) {
  if (length <= 0) throw new Error("Cannot wrap an index in an empty collection.");
  return ((index % length) + length) % length;
}
