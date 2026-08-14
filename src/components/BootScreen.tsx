import { useEffect } from "react";

export function BootScreen({ ready }: { ready: boolean }) {
  useEffect(() => {
    document.getElementById("nyxie-boot")?.classList.toggle("is-done", ready);
  }, [ready]);

  return null;
}
