import type { ClipKey } from "../../content/mediaCatalog";

const ambientActions = ["reactKey", "vanish", "tease"] as const satisfies readonly ClipKey[];

export type HeroSequenceStep = {
  nextKey: ClipKey;
  lastAmbientAction: ClipKey | null;
};

export function chooseNextHeroClip(
  currentKey: ClipKey,
  lastAmbientAction: ClipKey | null,
  random: () => number = Math.random,
): HeroSequenceStep {
  if (currentKey === "idleMain") return { nextKey: "idleKey", lastAmbientAction };
  if (currentKey !== "idleKey") return { nextKey: "idleMain", lastAmbientAction };

  const available = ambientActions.filter((key) => key !== lastAmbientAction);
  const boundedRandom = Math.min(0.999999999, Math.max(0, random()));
  const nextKey = available[Math.floor(boundedRandom * available.length)];
  return { nextKey, lastAmbientAction: nextKey };
}
