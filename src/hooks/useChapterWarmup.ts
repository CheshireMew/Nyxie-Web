import { useEffect } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { characterDetails, featuredWorks, galleryItems } from "../content/siteContent";

const chapterImageSources = [
  characterMedia.full,
  ...characterDetails.map((detail) => detail.image),
  ...galleryItems.map((item) => item.poster),
  characterMedia.personalityPoster,
  characterMedia.personalityCloseup,
  characterMedia.linksCharacter,
  characterMedia.worksCharacter,
  ...featuredWorks.flatMap((work) => [work.desktopImage, work.mobileImage]),
];

export function useChapterWarmup(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer = 0;
    const sources = [...new Set(chapterImageSources)];
    let index = 0;

    document.documentElement.dataset.chapterWarmup = "warming";

    const warmNext = async () => {
      if (cancelled) return;
      const source = sources[index];
      if (!source) {
        document.documentElement.dataset.chapterWarmup = "ready";
        return;
      }
      index += 1;

      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.src = source;
      try {
        await image.decode();
      } catch {
        // The visible component remains responsible for its own fallback.
      }
      if (!cancelled) timer = window.setTimeout(() => { void warmNext(); }, 80);
    };

    timer = window.setTimeout(() => { void warmNext(); }, 240);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      delete document.documentElement.dataset.chapterWarmup;
    };
  }, [enabled]);
}
