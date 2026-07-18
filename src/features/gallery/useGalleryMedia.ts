import { useCallback, useEffect, useRef, useState } from "react";
import { galleryVideoPlayback } from "../../content/mediaCatalog";
import type { GalleryId } from "../../content/mediaCatalog";
import { galleryItems } from "../../content/siteContent";

function prepareGalleryVideo(video: HTMLVideoElement) {
  video.defaultPlaybackRate = galleryVideoPlayback.playbackRate;
  video.playbackRate = galleryVideoPlayback.playbackRate;
  video.defaultMuted = galleryVideoPlayback.muted;
  video.muted = galleryVideoPlayback.muted;
}

type Options = {
  activeIndex: number;
  selectionDirection: -1 | 1;
  reducedMotion: boolean;
  sectionActive: boolean;
};

export function useGalleryMedia({ activeIndex, selectionDirection, reducedMotion, sectionActive }: Options) {
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const currentIndexRef = useRef(activeIndex);
  const [visibleVideoIndex, setVisibleVideoIndex] = useState(activeIndex);
  const visibleVideoIndexRef = useRef(activeIndex);
  const [failedVideoIds, setFailedVideoIds] = useState<Set<GalleryId>>(() => new Set());
  const [videoRetryTokens, setVideoRetryTokens] = useState<Partial<Record<GalleryId, number>>>({});
  currentIndexRef.current = activeIndex;
  visibleVideoIndexRef.current = visibleVideoIndex;

  const renderedVideoIndices = new Set([activeIndex, visibleVideoIndex]);

  const activeItem = galleryItems[activeIndex];
  const activeVideoFailed = failedVideoIds.has(activeItem.id);
  const activeVideoRetryToken = videoRetryTokens[activeItem.id] ?? 0;

  useEffect(() => {
    const video = videoRefs.current[activeIndex];
    if (reducedMotion || !video) return;
    const previousVisibleIndex = visibleVideoIndexRef.current;
    if (previousVisibleIndex !== activeIndex) videoRefs.current[previousVisibleIndex]?.pause();
    if (!sectionActive || activeVideoFailed) {
      video.pause();
      return;
    }

    prepareGalleryVideo(video);
    video.style.setProperty("--gallery-shift-x", selectionDirection > 0 ? "4%" : "-4%");
    video.currentTime = 0;
    void video.play().then(() => {
      if (currentIndexRef.current !== activeIndex || videoRefs.current[activeIndex] !== video) return;
      visibleVideoIndexRef.current = activeIndex;
      setVisibleVideoIndex(activeIndex);
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFailedVideoIds((ids) => new Set([...ids, activeItem.id]));
    });

    return () => { video.pause(); };
  }, [activeIndex, activeItem.id, activeVideoFailed, activeVideoRetryToken, reducedMotion, sectionActive, selectionDirection]);

  const bindVideo = useCallback((position: number, node: HTMLVideoElement | null) => {
    videoRefs.current[position] = node;
    if (!node) return;
    prepareGalleryVideo(node);
    node.style.setProperty("--gallery-shift-x", position > currentIndexRef.current ? "4%" : "-4%");
  }, []);

  const markFailed = useCallback((id: GalleryId) => {
    setFailedVideoIds((ids) => new Set([...ids, id]));
  }, []);

  const retry = useCallback((id: GalleryId) => {
    setFailedVideoIds((ids) => {
      const nextIds = new Set(ids);
      nextIds.delete(id);
      return nextIds;
    });
    setVideoRetryTokens((tokens) => ({ ...tokens, [id]: (tokens[id] ?? 0) + 1 }));
  }, []);

  return {
    renderedVideoIndices,
    visibleVideoIndex,
    failedVideoIds,
    videoRetryTokens,
    bindVideo,
    markFailed,
    retry,
  };
}

export type GalleryMediaController = ReturnType<typeof useGalleryMedia>;
