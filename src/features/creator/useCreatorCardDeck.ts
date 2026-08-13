import { useCallback, useEffect, useRef, useState } from "react";
import type { FocusEventHandler, PointerEventHandler } from "react";

const CARD_DEPTHS = [0.42, 0.68, 0.88, 1] as const;
const ROTATION_START_DELAY_MS = 2200;
const ROTATION_STEP_MS = 1600;
const ROTATION_RESUME_DELAY_MS = 2600;

function hasKeyboardFocusInside(deck: HTMLElement | null) {
  return document.activeElement instanceof HTMLElement
    && Boolean(deck?.contains(document.activeElement))
    && document.activeElement.matches(":focus-visible");
}

type Options = {
  cardCount: number;
  reducedMotion: boolean;
  active: boolean;
};

export function useCreatorCardDeck({ cardCount, reducedMotion, active }: Options) {
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const deckRef = useRef<HTMLDivElement>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pointerPositionRef = useRef({ x: 0, y: 0 });
  const rotationDelayRef = useRef<number | null>(null);
  const rotationIntervalRef = useRef<number | null>(null);
  const rotationEligibleRef = useRef(false);
  const lockedIndexRef = useRef(0);
  const previewIndexRef = useRef<number | null>(null);
  const autoIndexRef = useRef<number | null>(null);
  const cardCountRef = useRef(cardCount);
  const [lockedIndex, setLockedIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [autoIndex, setAutoIndex] = useState<number | null>(null);
  const visibleIndex = previewIndex ?? autoIndex ?? lockedIndex;

  rotationEligibleRef.current = active && !reducedMotion && supportsHover && cardCount > 1;
  lockedIndexRef.current = lockedIndex;
  previewIndexRef.current = previewIndex;
  autoIndexRef.current = autoIndex;
  cardCountRef.current = cardCount;

  const clearRotationTimers = useCallback(() => {
    if (rotationDelayRef.current !== null) window.clearTimeout(rotationDelayRef.current);
    if (rotationIntervalRef.current !== null) window.clearInterval(rotationIntervalRef.current);
    rotationDelayRef.current = null;
    rotationIntervalRef.current = null;
  }, []);

  const startRotationAfter = useCallback((delay: number) => {
    clearRotationTimers();
    if (!rotationEligibleRef.current) return;

    rotationDelayRef.current = window.setTimeout(() => {
      rotationDelayRef.current = null;
      if (!rotationEligibleRef.current || previewIndexRef.current !== null || hasKeyboardFocusInside(deckRef.current)) return;

      const firstAutoIndex = (lockedIndexRef.current + 1) % cardCountRef.current;
      autoIndexRef.current = firstAutoIndex;
      setAutoIndex(firstAutoIndex);
      rotationIntervalRef.current = window.setInterval(() => {
        if (!rotationEligibleRef.current || previewIndexRef.current !== null) return;
        setAutoIndex((current) => {
          const nextIndex = ((current ?? lockedIndexRef.current) + 1) % cardCountRef.current;
          autoIndexRef.current = nextIndex;
          return nextIndex;
        });
      }, ROTATION_STEP_MS);
    }, delay);
  }, [clearRotationTimers]);

  const pauseRotation = useCallback(() => {
    clearRotationTimers();
    if (autoIndexRef.current !== null) {
      autoIndexRef.current = null;
      setAutoIndex(null);
    }
  }, [clearRotationTimers]);

  const resumeRotationAfterIdle = useCallback(() => {
    if (autoIndexRef.current !== null) {
      autoIndexRef.current = null;
      setAutoIndex(null);
    }
    startRotationAfter(ROTATION_RESUME_DELAY_MS);
  }, [startRotationAfter]);

  const renderParallax = () => {
    pointerFrameRef.current = null;
    const deck = deckRef.current;
    if (!deck) return;
    const cards = deck.querySelectorAll<HTMLElement>("[data-creator-card]");
    cards.forEach((card, index) => {
      const depth = CARD_DEPTHS[index] ?? 1;
      card.style.setProperty("--creator-card-shift-x", `${pointerPositionRef.current.x * depth * 9}px`);
      card.style.setProperty("--creator-card-shift-y", `${pointerPositionRef.current.y * depth * 7}px`);
    });
  };

  const scheduleParallax = () => {
    if (pointerFrameRef.current === null) pointerFrameRef.current = window.requestAnimationFrame(renderParallax);
  };

  const resetParallax = () => {
    pointerPositionRef.current = { x: 0, y: 0 };
    scheduleParallax();
  };

  useEffect(() => {
    if (!rotationEligibleRef.current) {
      pauseRotation();
      return;
    }

    startRotationAfter(ROTATION_START_DELAY_MS);
    const registerActivity = () => resumeRotationAfterIdle();
    window.addEventListener("pointermove", registerActivity, { passive: true });
    window.addEventListener("pointerdown", registerActivity, { passive: true });
    window.addEventListener("keydown", registerActivity);
    window.addEventListener("touchstart", registerActivity, { passive: true });
    return () => {
      clearRotationTimers();
      window.removeEventListener("pointermove", registerActivity);
      window.removeEventListener("pointerdown", registerActivity);
      window.removeEventListener("keydown", registerActivity);
      window.removeEventListener("touchstart", registerActivity);
    };
  }, [active, cardCount, clearRotationTimers, pauseRotation, reducedMotion, resumeRotationAfterIdle, startRotationAfter, supportsHover]);

  useEffect(() => () => {
    clearRotationTimers();
    if (pointerFrameRef.current !== null) window.cancelAnimationFrame(pointerFrameRef.current);
  }, [clearRotationTimers]);

  useEffect(() => {
    if (reducedMotion) resetParallax();
  }, [reducedMotion]);

  const onPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (reducedMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerPositionRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
    };
    scheduleParallax();
  };

  const onPointerLeave: PointerEventHandler<HTMLDivElement> = () => {
    if (hasKeyboardFocusInside(deckRef.current)) {
      resetParallax();
      return;
    }
    setPreviewIndex(null);
    resetParallax();
    resumeRotationAfterIdle();
  };

  const preview = (index: number) => {
    pauseRotation();
    setPreviewIndex(index);
  };
  const clearPreview: FocusEventHandler<HTMLButtonElement> = (event) => {
    if (deckRef.current?.contains(event.relatedTarget as Node | null)) return;
    setPreviewIndex(null);
    resumeRotationAfterIdle();
  };
  const select = (index: number) => {
    if (index >= 0 && index < cardCount) {
      pauseRotation();
      setLockedIndex(index);
      setPreviewIndex(index);
    }
  };

  return {
    deckRef,
    autoIndex,
    lockedIndex,
    visibleIndex,
    preview,
    clearPreview,
    select,
    pointerHandlers: { onPointerMove, onPointerLeave },
  };
}
