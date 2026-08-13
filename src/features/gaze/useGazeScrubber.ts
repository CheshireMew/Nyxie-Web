import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEventHandler, PointerEventHandler, SyntheticEvent } from "react";
import {
  clampGazeTime,
  gazeDirectionAtPosition,
  gazeEyeAnchorInCover,
  gazeFrontTime,
  gazePositionFromHorizontalOffset,
  gazeTimeAtPosition,
} from "./gazeTimeline";

type GazeScrubberOptions = {
  active: boolean;
  mediaActivated: boolean;
  reducedMotion: boolean;
};

type MediaState = "idle" | "loading" | "ready" | "error";

const seekIntervalMs = 42;
const minimumSeekDelta = 1 / 48;
const gazeMaximumTimelineSpeed = 4.5;
const gazeArrivalTimeConstantMs = 105;

export function useGazeScrubber({ active, mediaActivated, reducedMotion }: GazeScrubberOptions) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const directionRef = useRef<HTMLOutputElement>(null);
  const targetTimelineTimeRef = useRef(gazeFrontTime);
  const displayedTimelineTimeRef = useRef(gazeFrontTime);
  const animationFrameRef = useRef(0);
  const lastSeekAtRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const [mediaState, setMediaState] = useState<MediaState>(mediaActivated ? "loading" : "idle");

  const publishDirection = useCallback((direction: string) => {
    const stage = stageRef.current;
    if (stage?.dataset.gazeDirection === direction) return;
    if (stage) stage.dataset.gazeDirection = direction;
    if (directionRef.current) directionRef.current.value = `LOOK / ${direction}`;
  }, []);

  const setPointerTarget = useCallback((clientX: number) => {
    const stage = stageRef.current;
    if (!active || reducedMotion || !stage) return;
    const bounds = stage.getBoundingClientRect();
    const video = videoRef.current;
    const eyeAnchor = gazeEyeAnchorInCover(
      bounds.width,
      bounds.height,
      video?.videoWidth || undefined,
      video?.videoHeight || undefined,
    );
    const x = (clientX - (bounds.left + eyeAnchor.x)) / (bounds.width * 0.5);
    const position = gazePositionFromHorizontalOffset(x);
    targetTimelineTimeRef.current = gazeTimeAtPosition(position);
    stage.classList.add("is-tracking", "has-tracked");
    publishDirection(gazeDirectionAtPosition(position));
  }, [active, publishDirection, reducedMotion]);

  const stopTracking = useCallback(() => {
    targetTimelineTimeRef.current = displayedTimelineTimeRef.current;
    stageRef.current?.classList.remove("is-tracking");
  }, []);

  const onPointerEnter: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType !== "touch") setPointerTarget(event.clientX);
  }, [setPointerTarget]);

  const onPointerMove: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType === "touch" && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setPointerTarget(event.clientX);
  }, [setPointerTarget]);

  const onPointerDown: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType === "touch") event.currentTarget.setPointerCapture(event.pointerId);
    setPointerTarget(event.clientX);
  }, [setPointerTarget]);

  const onPointerUp: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const onPointerLeave: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.pointerType !== "touch") stopTracking();
  }, [stopTracking]);

  const onKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback((event) => {
    const positionByKey: Partial<Record<string, number>> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      Home: 0,
    };
    if (!(event.key in positionByKey)) return;
    event.preventDefault();
    const position = positionByKey[event.key];
    if (position === undefined) return;
    targetTimelineTimeRef.current = gazeTimeAtPosition(position);
    stageRef.current?.classList.add("is-tracking");
    stageRef.current?.classList.add("has-tracked");
    publishDirection(gazeDirectionAtPosition(position));
  }, [publishDirection]);

  const onLoadedMetadata = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    video.pause();
    const frontTime = Math.min(gazeFrontTime, Math.max(0, video.duration - 0.05));
    displayedTimelineTimeRef.current = frontTime;
    targetTimelineTimeRef.current = frontTime;
    video.currentTime = frontTime;
  }, []);

  const onSeeked = useCallback(() => setMediaState("ready"), []);
  const onError = useCallback(() => setMediaState("error"), []);

  useEffect(() => {
    if (mediaActivated && mediaState === "idle") setMediaState("loading");
  }, [mediaActivated, mediaState]);

  useEffect(() => {
    if (!active || reducedMotion || mediaState !== "ready") return;
    const tick = (now: number) => {
      const video = videoRef.current;
      const previousTick = lastTickAtRef.current || now;
      const elapsed = Math.min(100, now - previousTick);
      lastTickAtRef.current = now;
      const displayedTime = displayedTimelineTimeRef.current;
      const targetTime = targetTimelineTimeRef.current;
      const distance = targetTime - displayedTime;
      const maximumStep = gazeMaximumTimelineSpeed * elapsed / 1000;
      const arrivalStep = Math.abs(distance) * (1 - Math.exp(-elapsed / gazeArrivalTimeConstantMs));
      const step = Math.sign(distance) * Math.min(Math.abs(distance), maximumStep, arrivalStep);
      const nextTimelineTime = displayedTime + step;
      displayedTimelineTimeRef.current = nextTimelineTime;
      const nextMediaTime = clampGazeTime(nextTimelineTime);

      if (
        video
        && video.readyState >= 2
        && now - lastSeekAtRef.current >= seekIntervalMs
        && Math.abs(video.currentTime - nextMediaTime) >= minimumSeekDelta
      ) {
        video.currentTime = nextMediaTime;
        lastSeekAtRef.current = now;
      }
      animationFrameRef.current = window.requestAnimationFrame(tick);
    };
    animationFrameRef.current = window.requestAnimationFrame(tick);
    return () => {
      lastTickAtRef.current = 0;
      window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [active, mediaState, reducedMotion]);

  useEffect(() => {
    if (!active) stopTracking();
    return () => window.cancelAnimationFrame(animationFrameRef.current);
  }, [active, stopTracking]);

  return {
    stageRef,
    videoRef,
    directionRef,
    mediaState,
    mediaHandlers: { onLoadedMetadata, onSeeked, onError },
    interactionHandlers: {
      onPointerEnter,
      onPointerMove,
      onPointerLeave,
      onPointerDown,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
    },
  };
}
