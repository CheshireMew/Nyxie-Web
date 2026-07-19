import { useEffect, useRef, useState } from "react";
import type { FocusEventHandler, PointerEventHandler } from "react";

const CARD_DEPTHS = [0.42, 0.68, 0.88, 1] as const;

type Options = {
  cardCount: number;
  reducedMotion: boolean;
};

export function useCreatorCardDeck({ cardCount, reducedMotion }: Options) {
  const deckRef = useRef<HTMLDivElement>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pointerPositionRef = useRef({ x: 0, y: 0 });
  const [lockedIndex, setLockedIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const visibleIndex = previewIndex ?? lockedIndex;

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

  useEffect(() => () => {
    if (pointerFrameRef.current !== null) window.cancelAnimationFrame(pointerFrameRef.current);
  }, []);

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
    setPreviewIndex(null);
    resetParallax();
  };

  const preview = (index: number) => setPreviewIndex(index);
  const clearPreview: FocusEventHandler<HTMLButtonElement> = (event) => {
    if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setPreviewIndex(null);
  };
  const select = (index: number) => {
    if (index >= 0 && index < cardCount) {
      setLockedIndex(index);
      setPreviewIndex(index);
    }
  };

  return {
    deckRef,
    lockedIndex,
    visibleIndex,
    preview,
    clearPreview,
    select,
    pointerHandlers: { onPointerMove, onPointerLeave },
  };
}
