import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import { galleryItems } from "../../content/siteContent";
import { sampledFormCount, selectSeededSample, wrapIndex } from "./gallerySampling";

function createGallerySession() {
  const requestedSeed = new URLSearchParams(window.location.search).get("gallerySeed");
  const values = new Uint32Array(2);
  if (!requestedSeed) window.crypto.getRandomValues(values);
  const seed = requestedSeed ?? `${values[0]}-${values[1]}`;
  return { seed, forms: selectSeededSample(galleryItems, seed, sampledFormCount) };
}

export function useGalleryController(sectionRef: RefObject<HTMLElement | null>) {
  const [session] = useState(createGallerySession);
  const initialActiveIndex = galleryItems.findIndex((item) => item.id === session.forms[0].id);
  const pointerStartX = useRef<number | null>(null);
  const wheelGestureRef = useRef(false);
  const wheelGestureTimerRef = useRef<number | null>(null);
  const activeIndexRef = useRef(initialActiveIndex);
  const lastSamplePositionRef = useRef(0);
  const viewedSamplePositionsRef = useRef(new Set([0]));
  const furthestProgressRef = useRef(1 / sampledFormCount);
  const [selection, setSelection] = useState({ activeIndex: initialActiveIndex, direction: 1 as -1 | 1 });
  const [viewedCount, setViewedCount] = useState(1);

  const selectItemIndex = useCallback((requestedIndex: number, directionHint?: -1 | 1) => {
    const nextIndex = wrapIndex(requestedIndex, galleryItems.length);
    const currentIndex = activeIndexRef.current;
    if (nextIndex === currentIndex) return;
    const direction = directionHint ?? (nextIndex >= currentIndex ? 1 : -1);
    activeIndexRef.current = nextIndex;
    setSelection({ activeIndex: nextIndex, direction });
  }, []);

  const selectSamplePosition = useCallback((requestedPosition: number, directionHint?: -1 | 1) => {
    const samplePosition = wrapIndex(requestedPosition, session.forms.length);
    const itemIndex = galleryItems.findIndex((item) => item.id === session.forms[samplePosition].id);
    if (!viewedSamplePositionsRef.current.has(samplePosition)) {
      viewedSamplePositionsRef.current.add(samplePosition);
      setViewedCount(viewedSamplePositionsRef.current.size);
    }
    lastSamplePositionRef.current = samplePosition;
    selectItemIndex(itemIndex, directionHint);
  }, [selectItemIndex, session.forms]);

  const showPrevious = useCallback(() => selectItemIndex(activeIndexRef.current - 1, -1), [selectItemIndex]);
  const showNext = useCallback(() => selectItemIndex(activeIndexRef.current + 1, 1), [selectItemIndex]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onWheel = (event: WheelEvent) => {
      const bounds = section.getBoundingClientRect();
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1;
      const deltaY = event.deltaY * unit;
      if (Math.abs(deltaY) < 6 || deltaY < 0) return;
      if (viewedSamplePositionsRef.current.size >= session.forms.length) return;

      const approachingStage = bounds.top > 2 && bounds.top < window.innerHeight * 0.2 && deltaY >= bounds.top;
      if (approachingStage) {
        event.preventDefault();
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo(0, bounds.top + window.scrollY);
        root.style.scrollBehavior = previousBehavior;
        return;
      }
      if (Math.abs(bounds.top) > 2) return;

      event.preventDefault();
      if (wheelGestureTimerRef.current !== null) window.clearTimeout(wheelGestureTimerRef.current);
      wheelGestureTimerRef.current = window.setTimeout(() => {
        wheelGestureRef.current = false;
        wheelGestureTimerRef.current = null;
      }, 55);
      if (wheelGestureRef.current) return;
      wheelGestureRef.current = true;

      let nextPosition = wrapIndex(lastSamplePositionRef.current + 1, session.forms.length);
      while (viewedSamplePositionsRef.current.has(nextPosition)) {
        nextPosition = wrapIndex(nextPosition + 1, session.forms.length);
      }
      selectSamplePosition(nextPosition, 1);
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      section.removeEventListener("wheel", onWheel);
      if (wheelGestureTimerRef.current !== null) window.clearTimeout(wheelGestureTimerRef.current);
    };
  }, [sectionRef, selectSamplePosition, session.forms.length]);

  furthestProgressRef.current = Math.max(furthestProgressRef.current, viewedCount / sampledFormCount);
  const active = galleryItems[selection.activeIndex];

  return {
    sessionSeed: session.seed,
    sampledForms: session.forms,
    active,
    activeIndex: selection.activeIndex,
    selectionDirection: selection.direction,
    previous: galleryItems[wrapIndex(selection.activeIndex - 1, galleryItems.length)],
    next: galleryItems[wrapIndex(selection.activeIndex + 1, galleryItems.length)],
    viewedProgress: furthestProgressRef.current,
    selectSamplePosition,
    showPrevious,
    showNext,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => { pointerStartX.current = event.clientX; },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const start = pointerStartX.current;
      pointerStartX.current = null;
      if (start === null || Math.abs(event.clientX - start) < 42) return;
      if (event.clientX < start) showNext();
      else showPrevious();
    },
  };
}

export type GalleryController = ReturnType<typeof useGalleryController>;
