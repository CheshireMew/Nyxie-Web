import { useRef } from "react";
import { driveChapterPerformance } from "../animation/chapterPerformance";
import { gsap, useGSAP } from "../animation/gsap";
import { useSectionMedia } from "./useSectionMedia";

type Timeline = ReturnType<typeof gsap.timeline>;

type SetupContext = {
  section: HTMLElement;
  progressFill: HTMLElement;
  gsap: typeof gsap;
};

type SetupResult = {
  entrance: Timeline;
  sequence?: Timeline;
  runwayVh?: number;
  trackChapterProgress?: boolean;
  onSettled?: () => void;
  cleanup?: () => void;
};

type Options = {
  active: boolean;
  warmupRequested?: boolean;
  reducedMotion: boolean;
  setup: (context: SetupContext) => SetupResult;
};

export function useChapterPerformance({ active, warmupRequested = false, reducedMotion, setup }: Options) {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const mediaActivated = useSectionMedia(active || warmupRequested);

  useGSAP(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    const progressFill = progressRef.current;
    if (!section || !progressFill) return;

    const performance = setup({ section, progressFill, gsap });
    driveChapterPerformance({
      trigger: section,
      entrance: performance.entrance,
      sequence: performance.sequence,
      runwayVh: performance.runwayVh,
      trackChapterProgress: performance.trackChapterProgress ?? Boolean(performance.sequence),
      progressFill,
      onSettled: performance.onSettled,
    });
    return performance.cleanup;
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return { sectionRef, progressRef, mediaActivated };
}
