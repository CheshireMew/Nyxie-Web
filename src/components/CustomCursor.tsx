import { useEffect, useRef } from "react";

export function CustomCursor({ reducedMotion }: { reducedMotion: boolean }) {
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reducedMotion || window.matchMedia("(pointer: coarse)").matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onPointerMove = (event: PointerEvent) => {
      dot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      ring.animate(
        { transform: `translate3d(${event.clientX}px, ${event.clientY}px, 0)` },
        { duration: 260, fill: "forwards", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      const target = event.target instanceof Element ? event.target : null;
      document.body.classList.toggle("cursor-active", Boolean(target?.closest("a, button, [data-cursor]")));
    };
    const onLeave = () => document.body.classList.remove("cursor-active");
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.body.classList.remove("cursor-active");
    };
  }, [reducedMotion]);

  return (
    <>
      <span ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <span ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
