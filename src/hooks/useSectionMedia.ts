import { useEffect, useState } from "react";

export function useSectionMedia(active: boolean) {
  const [activated, setActivated] = useState(active);

  useEffect(() => {
    if (active) setActivated(true);
  }, [active]);

  return activated;
}
