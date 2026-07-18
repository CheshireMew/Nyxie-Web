import type { RefObject } from "react";
import type { ClipKey } from "../../content/mediaCatalog";

export type PlaybackOptions = {
  after?: "talk";
  initial?: boolean;
  lockUntilEnd?: boolean;
};

export type PerformancePhase = "idle" | "loading" | "playing" | "error";

export type PerformanceSnapshot = {
  status: string;
  counter: string;
  activeAction: ClipKey | null;
  currentKey: ClipKey | null;
  started: boolean;
  phase: PerformancePhase;
  interactionLocked: boolean;
  error: string | null;
};

export type PerformanceDirector = {
  stageRef: RefObject<HTMLDivElement | null>;
  videoARef: RefObject<HTMLVideoElement | null>;
  videoBRef: RefObject<HTMLVideoElement | null>;
  progressRef: RefObject<HTMLSpanElement | null>;
  snapshot: PerformanceSnapshot;
  start: () => Promise<boolean>;
  retry: () => Promise<boolean>;
  request: (key: ClipKey, options?: PlaybackOptions) => Promise<boolean>;
  playRandom: () => Promise<boolean>;
  waitUntilEnded: (key: ClipKey) => Promise<boolean>;
  isInteractionLocked: () => boolean;
  setHeroVisible: (visible: boolean) => void;
  suppressNextWelcome: () => void;
};

export const DEFAULT_PERFORMANCE_SNAPSHOT: PerformanceSnapshot = {
  status: "NYXIE IS WATCHING",
  counter: "READY / 00",
  activeAction: null,
  currentKey: null,
  started: false,
  phase: "idle",
  interactionLocked: false,
  error: null,
};
