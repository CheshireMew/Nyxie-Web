import { useEffect } from "react";
import type { Dispatch } from "react";
import { sections } from "../content/siteContent";
import type { SiteAction } from "../app/siteTypes";

export function usePageState(dispatch: Dispatch<SiteAction>) {
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const marker = window.scrollY + window.innerHeight * 0.38;
      let active = sections[0].id;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= marker) active = section.id;
      }
      dispatch({ type: "set-section", section: active });
      dispatch({ type: "set-header-compact", compact: window.scrollY > 32 });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [dispatch]);
}
