import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { sections } from "../content/siteContent";
import type { SiteAction } from "../app/siteTypes";

export function usePageState(dispatch: Dispatch<SiteAction>) {
  const headerSentinelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    const sentinel = headerSentinelRef.current;
    if (!elements.length || !sentinel) return;

    const updateActiveSection = () => {
      const marker = window.innerHeight * 0.38;
      const active = elements.find((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top <= marker && bounds.bottom > marker;
      });
      if (active) dispatch({ type: "set-section", section: active.id as (typeof sections)[number]["id"] });
    };

    const sectionObserver = new IntersectionObserver(updateActiveSection, {
      rootMargin: "-38% 0px -61% 0px",
      threshold: 0,
    });

    const headerObserver = new IntersectionObserver(([entry]) => {
      dispatch({ type: "set-header-compact", compact: !entry.isIntersecting });
    }, { threshold: 0 });

    elements.forEach((element) => sectionObserver.observe(element));
    headerObserver.observe(sentinel);
    window.addEventListener("scrollend", updateActiveSection);
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();
    return () => {
      sectionObserver.disconnect();
      headerObserver.disconnect();
      window.removeEventListener("scrollend", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [dispatch]);

  return headerSentinelRef;
}
