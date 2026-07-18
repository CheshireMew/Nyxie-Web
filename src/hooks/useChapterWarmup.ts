import { useEffect } from "react";
import { nextSectionAfter } from "../app/sectionRegistry";
import type { SectionId } from "../app/sectionRegistry";

export function useChapterWarmup(activeSection: SectionId, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer = 0;
    const nextSection = nextSectionAfter(activeSection);
    const sources = [...new Set(nextSection?.warmup ?? [])];
    let index = 0;
    let warmingVideo: HTMLVideoElement | null = null;

    document.documentElement.dataset.chapterWarmupTarget = nextSection?.id ?? "none";
    if (sources.length === 0) {
      document.documentElement.dataset.chapterWarmup = "idle";
      return () => {
        delete document.documentElement.dataset.chapterWarmup;
        delete document.documentElement.dataset.chapterWarmupTarget;
      };
    }
    document.documentElement.dataset.chapterWarmup = "warming";

    const warmNext = async () => {
      if (cancelled) return;
      const source = sources[index];
      if (!source) {
        document.documentElement.dataset.chapterWarmup = "ready";
        return;
      }
      index += 1;

      if (/\.(?:mp4|webm)(?:$|[?#])/i.test(source)) {
        await new Promise<void>((resolve) => {
          const video = document.createElement("video");
          warmingVideo = video;
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            video.removeEventListener("canplay", finish);
            video.removeEventListener("error", finish);
            if (warmingVideo === video) warmingVideo = null;
            resolve();
          };
          const timeout = window.setTimeout(finish, 6000);
          video.preload = "auto";
          video.muted = true;
          video.playsInline = true;
          video.addEventListener("canplay", finish, { once: true });
          video.addEventListener("error", finish, { once: true });
          video.src = source;
          video.load();
        });
      } else {
        const image = new Image();
        image.decoding = "async";
        image.fetchPriority = "low";
        image.src = source;
        try {
          await image.decode();
        } catch {
          // The visible component remains responsible for its own fallback.
        }
      }
      if (!cancelled) timer = window.setTimeout(() => { void warmNext(); }, 80);
    };

    timer = window.setTimeout(() => { void warmNext(); }, 240);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (warmingVideo) {
        warmingVideo.removeAttribute("src");
        warmingVideo.load();
        warmingVideo = null;
      }
      delete document.documentElement.dataset.chapterWarmup;
      delete document.documentElement.dataset.chapterWarmupTarget;
    };
  }, [activeSection, enabled]);
}
