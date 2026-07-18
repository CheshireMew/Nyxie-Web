import { isSectionId } from "../app/sectionRegistry";
import type { SectionId } from "../app/sectionRegistry";

export type ChapterHistoryMode = "push" | "replace" | "none";

type SettledListener = (section: SectionId) => void;

let navigationTimer: number | null = null;
let finishNavigation: ((completed: boolean) => void) | null = null;
let navigating = false;
const settledListeners = new Set<SettledListener>();

export function isChapterNavigationInProgress() {
  return navigating;
}

export function sectionIdFromHash(hash = window.location.hash): SectionId | null {
  const value = decodeURIComponent(hash.replace(/^#/, ""));
  return isSectionId(value) ? value : null;
}

export function subscribeToChapterSettled(listener: SettledListener) {
  settledListeners.add(listener);
  return () => settledListeners.delete(listener);
}

export function navigateToChapter(
  id: SectionId,
  behavior: ScrollBehavior,
  historyMode: ChapterHistoryMode = "push",
) {
  const target = document.getElementById(id);
  if (!target) return Promise.resolve(false);

  finishNavigation?.(false);
  return new Promise<boolean>((resolve) => {
    const finish = (completed = true) => {
      window.removeEventListener("scrollend", onScrollEnd);
      if (navigationTimer !== null) window.clearTimeout(navigationTimer);
      navigationTimer = null;
      navigating = false;
      if (finishNavigation === finish) finishNavigation = null;
      if (completed && historyMode !== "none") {
        const method = historyMode === "replace" ? "replaceState" : "pushState";
        window.history[method]({ section: id }, "", `#${encodeURIComponent(id)}`);
      }
      if (completed) settledListeners.forEach((listener) => listener(id));
      resolve(completed);
    };
    const onScrollEnd = () => finish(true);

    navigating = true;
    finishNavigation = finish;
    window.addEventListener("scrollend", onScrollEnd, { once: true });
    navigationTimer = window.setTimeout(() => finish(true), behavior === "smooth" ? 1600 : 120);
    target.scrollIntoView({ behavior, block: "start" });
  });
}
