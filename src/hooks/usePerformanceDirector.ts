import { useCallback, useEffect, useRef, useState } from "react";
import { HeroPerformanceController } from "../features/hero/HeroPerformanceController";
import { DEFAULT_PERFORMANCE_SNAPSHOT } from "../features/hero/types";
import type { PerformanceDirector, PlaybackOptions } from "../features/hero/types";
import type { ClipKey } from "../content/mediaCatalog";

const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

type UsePerformanceOptions = {
  reducedMotion: boolean;
  onTalk: () => void;
};

export function usePerformanceDirector({ reducedMotion, onTalk }: UsePerformanceOptions): PerformanceDirector {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const controllerRef = useRef<HeroPerformanceController | null>(null);
  const [snapshot, setSnapshot] = useState(DEFAULT_PERFORMANCE_SNAPSHOT);
  const onTalkRef = useRef(onTalk);
  onTalkRef.current = onTalk;

  useEffect(() => {
    if (!stageRef.current || !videoARef.current || !videoBRef.current) return;
    const controller = new HeroPerformanceController(
      [videoARef.current, videoBRef.current],
      stageRef.current,
      reducedMotion,
      {
        onSnapshot: setSnapshot,
        onProgress: (value) => {
          if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, value))})`;
        },
        onTalk: () => onTalkRef.current(),
      },
    );
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) controllerRef.current?.pause();
      else controllerRef.current?.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const start = useCallback(async () => {
    await delay(reducedMotion ? 120 : 260);
    return await controllerRef.current?.start() ?? false;
  }, [reducedMotion]);

  const retry = useCallback(() => controllerRef.current?.retry() ?? Promise.resolve(false), []);
  const request = useCallback((key: ClipKey, options: PlaybackOptions = {}) => (
    controllerRef.current?.request(key, options) ?? Promise.resolve(false)
  ), []);
  const playRandom = useCallback(() => {
    const options: ClipKey[] = ["reactKey", "vanish", "portal", "tease"];
    return request(options[Math.floor(Math.random() * options.length)]);
  }, [request]);
  const waitUntilEnded = useCallback((key: ClipKey) => (
    controllerRef.current?.waitUntilEnded(key) ?? Promise.resolve(false)
  ), []);
  const isInteractionLocked = useCallback(() => controllerRef.current?.isInteractionLocked() ?? false, []);
  const setHeroVisible = useCallback((visible: boolean) => controllerRef.current?.setHeroVisible(visible), []);
  const suppressNextWelcome = useCallback(() => controllerRef.current?.suppressNextWelcome(), []);

  return {
    stageRef,
    videoARef,
    videoBRef,
    progressRef,
    snapshot,
    start,
    retry,
    request,
    playRandom,
    waitUntilEnded,
    isInteractionLocked,
    setHeroVisible,
    suppressNextWelcome,
  };
}
