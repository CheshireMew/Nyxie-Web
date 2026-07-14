import { useRef } from "react";
import type { ButtonHTMLAttributes, PointerEvent } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  reducedMotion?: boolean;
};

export function MagneticButton({ reducedMotion = false, className = "", onPointerMove, onPointerLeave, ...props }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(event);
    if (reducedMotion || window.matchMedia("(pointer: coarse)").matches || !ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    ref.current.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
  };

  const leave = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerLeave?.(event);
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <button
      ref={ref}
      className={`magnetic ${className}`.trim()}
      onPointerMove={move}
      onPointerLeave={leave}
      {...props}
    />
  );
}
