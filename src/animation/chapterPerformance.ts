import { gsap, ScrollTrigger } from "./gsap";

type ChapterPerformanceOptions = {
  trigger: HTMLElement;
  entrance: Timeline;
  sequence?: Timeline;
  runwayVh?: number;
  trackChapterProgress?: boolean;
};

type Timeline = ReturnType<typeof gsap.timeline>;

let navigationTimer: number | null = null;
let navigationFinish: (() => void) | null = null;
let refreshFrame: number | null = null;

function clampProgress(progress: number) {
  return Math.min(1, Math.max(0, progress));
}

function scheduleRefresh() {
  if (refreshFrame !== null) cancelAnimationFrame(refreshFrame);
  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = null;
    ScrollTrigger.refresh();
  });
}

function isProgrammaticNavigation() {
  return document.documentElement.dataset.chapterNavigation === "true";
}

export function navigateToChapter(id: string, behavior: ScrollBehavior) {
  const target = document.getElementById(id);
  if (!target) return;

  navigationFinish?.();
  const root = document.documentElement;
  const finish = () => {
    window.removeEventListener("scrollend", finish);
    delete root.dataset.chapterNavigation;
    if (navigationTimer !== null) window.clearTimeout(navigationTimer);
    navigationTimer = null;
    if (navigationFinish === finish) navigationFinish = null;
  };

  root.dataset.chapterNavigation = "true";
  navigationFinish = finish;
  window.addEventListener("scrollend", finish, { once: true });
  navigationTimer = window.setTimeout(finish, behavior === "smooth" ? 1600 : 120);
  target.scrollIntoView({ behavior, block: "start" });
}

export function driveChapterPerformance({
  trigger,
  entrance,
  sequence,
  runwayVh = 0,
  trackChapterProgress = false,
}: ChapterPerformanceOptions) {
  let entranceProgress = 0;
  let sequenceProgress = 0;
  let skippingReverse = false;
  const progressFill = trackChapterProgress
    ? trigger.querySelector<HTMLElement>(".chapter-progress-fill")
    : null;

  const commitEntrance = (progress: number) => {
    const nextProgress = Math.max(entranceProgress, clampProgress(progress));
    if (nextProgress <= entranceProgress && entrance.progress() === nextProgress) return;

    entranceProgress = nextProgress;
    entrance.progress(nextProgress).pause();
    trigger.dataset.entranceState = nextProgress >= 0.9999 ? "staged" : "entering";
  };

  const commitSequence = (progress: number) => {
    if (!sequence) return;
    const nextProgress = Math.max(sequenceProgress, clampProgress(progress));
    if (nextProgress <= sequenceProgress && sequence.progress() === nextProgress) return;

    sequenceProgress = nextProgress;
    sequence.progress(nextProgress).pause();
    if (progressFill) gsap.set(progressFill, { scaleX: nextProgress });
    if (trackChapterProgress) trigger.dataset.forwardProgress = nextProgress.toFixed(4);
    trigger.dataset.performanceState = nextProgress >= 0.9999 ? "settled" : "performing";
  };

  const skipReverseRunway = () => {
    commitSequence(1);
    if (skippingReverse || isProgrammaticNavigation()) return;

    const sectionTop = trigger.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY <= sectionTop + 1) return;
    skippingReverse = true;

    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, sectionTop);
    root.style.scrollBehavior = previousBehavior;
    requestAnimationFrame(() => {
      skippingReverse = false;
      ScrollTrigger.update();
    });
  };

  entrance.progress(0).pause();
  trigger.dataset.entranceState = "waiting";

  ScrollTrigger.create({
    trigger,
    start: "top bottom",
    end: "top top",
    invalidateOnRefresh: true,
    onUpdate: (self) => commitEntrance(self.progress),
    onLeave: () => commitEntrance(1),
    onEnterBack: () => commitEntrance(1),
    onRefresh: (self) => {
      if (self.progress >= 1) commitEntrance(1);
      else if (self.progress > entranceProgress) commitEntrance(self.progress);
    },
  });

  if (!sequence || runwayVh <= 0) return;

  trigger.style.setProperty("--chapter-runway", `${runwayVh}svh`);
  sequence.progress(0).pause();
  if (progressFill) gsap.set(progressFill, { scaleX: 0 });
  if (trackChapterProgress) trigger.dataset.forwardProgress = "0";
  trigger.dataset.performanceState = "staged";

  ScrollTrigger.create({
    trigger,
    start: "top top",
    end: "bottom bottom",
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      if (self.direction < 0 && self.progress > 0) {
        skipReverseRunway();
        return;
      }
      commitSequence(self.progress >= 0.995 ? 1 : self.progress);
    },
    onLeave: () => commitSequence(1),
    onEnterBack: skipReverseRunway,
    onRefresh: (self) => {
      if (self.progress >= 1) commitSequence(1);
      else if (self.progress > sequenceProgress) commitSequence(self.progress >= 0.995 ? 1 : self.progress);
    },
  });

  scheduleRefresh();
}
