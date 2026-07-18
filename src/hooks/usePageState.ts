import { useEffect } from "react";
import type { Dispatch } from "react";
import { sectionRegistry } from "../app/sectionRegistry";
import type { SectionId } from "../app/sectionRegistry";
import type { SiteAction } from "../app/siteTypes";
import { isChapterNavigationInProgress, subscribeToChapterSettled } from "../navigation/chapterNavigation";

export function usePageState(dispatch: Dispatch<SiteAction>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const elements = sectionRegistry.map((section) => {
      const element = document.getElementById(section.id);
      if (!element) throw new Error(`章节注册表与页面不一致：缺少 #${section.id}`);
      return element;
    });

    const updateActiveSection = () => {
      if (isChapterNavigationInProgress()) return;
      const marker = window.innerHeight * 0.38;
      const active = elements.find((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top <= marker && bounds.bottom > marker;
      });
      if (!active) return;
      const section = active.id as SectionId;
      dispatch({ type: "set-section", section });
      if (!isChapterNavigationInProgress()) {
        window.history.replaceState({ section }, "", `#${section}`);
      }
    };

    const sectionObserver = new IntersectionObserver(updateActiveSection, {
      rootMargin: "-38% 0px -61% 0px",
      threshold: 0,
    });

    elements.forEach((element) => sectionObserver.observe(element));
    window.addEventListener("scrollend", updateActiveSection);
    const unsubscribeSettled = subscribeToChapterSettled(updateActiveSection);
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();
    return () => {
      sectionObserver.disconnect();
      window.removeEventListener("scrollend", updateActiveSection);
      unsubscribeSettled();
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [dispatch, enabled]);
}
