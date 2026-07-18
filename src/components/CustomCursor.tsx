import { useEffect, useRef } from "react";

export function CustomCursor({ reducedMotion }: { reducedMotion: boolean }) {
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reducedMotion || window.matchMedia("(pointer: coarse)").matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const maximumLag = 12;
    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let velocityX = 0;
    let velocityY = 0;
    let animationFrame = 0;
    let running = false;
    let initialized = false;

    const placeRing = () => {
      ring.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    };

    const limitLag = () => {
      const offsetX = currentX - targetX;
      const offsetY = currentY - targetY;
      const distance = Math.hypot(offsetX, offsetY);
      if (distance <= maximumLag) return;
      const ratio = maximumLag / distance;
      currentX = targetX + offsetX * ratio;
      currentY = targetY + offsetY * ratio;
      velocityX *= 0.25;
      velocityY *= 0.25;
    };

    const animateRing = () => {
      const spring = 0.16;
      const damping = 0.72;
      velocityX = (velocityX + (targetX - currentX) * spring) * damping;
      velocityY = (velocityY + (targetY - currentY) * spring) * damping;
      currentX += velocityX;
      currentY += velocityY;
      limitLag();
      placeRing();

      const settled =
        Math.abs(targetX - currentX) < 0.1 &&
        Math.abs(targetY - currentY) < 0.1 &&
        Math.abs(velocityX) < 0.1 &&
        Math.abs(velocityY) < 0.1;
      if (settled) {
        currentX = targetX;
        currentY = targetY;
        placeRing();
        running = false;
        return;
      }
      animationFrame = window.requestAnimationFrame(animateRing);
    };

    const onPointerMove = (event: PointerEvent) => {
      dot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!initialized) {
        initialized = true;
        currentX = targetX;
        currentY = targetY;
      } else {
        limitLag();
      }
      placeRing();
      if (!running) {
        running = true;
        animationFrame = window.requestAnimationFrame(animateRing);
      }
      const target = event.target instanceof Element ? event.target : null;
      document.body.classList.toggle("cursor-active", Boolean(target?.closest("a, button, [data-cursor]")));
    };
    const onLeave = () => document.body.classList.remove("cursor-active");
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.cancelAnimationFrame(animationFrame);
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
