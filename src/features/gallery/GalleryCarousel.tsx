import { galleryItems } from "../../content/siteContent";
import { galleryVideoPlayback } from "../../content/mediaCatalog";
import type { GalleryController } from "./useGalleryController";
import type { GalleryMediaController } from "./useGalleryMedia";

type Props = {
  controller: GalleryController;
  media: GalleryMediaController;
  mediaActivated: boolean;
  reducedMotion: boolean;
  sectionActive: boolean;
  warmupRequested: boolean;
};

export function GalleryCarousel({ controller, media, mediaActivated, reducedMotion, sectionActive, warmupRequested }: Props) {
  const { active, activeIndex, previous, next } = controller;
  const mediaRequested = mediaActivated || warmupRequested;

  return (
    <>
      <button className="gallery-arrow gallery-arrow--previous" type="button" onClick={controller.showPrevious} aria-label="上一种形态">←</button>
      <button className="gallery-arrow gallery-arrow--next" type="button" onClick={controller.showNext} aria-label="下一种形态">→</button>

      <button className="gallery-side-card gallery-side-card--previous" type="button" onClick={controller.showPrevious} aria-label={`查看上一种形态：${previous.title}`}>
        <img src={mediaRequested ? previous.poster : undefined} alt="" decoding="async" />
        <span>{previous.index} / {previous.title}</span>
      </button>

      <article className="gallery-carousel" aria-live="polite">
        <div className="gallery-card-rail">
          <span>{active.index} / 08</span>
          <span>{active.en}</span>
        </div>
        <div className="gallery-media">
          {reducedMotion ? (
            <img src={mediaRequested ? active.poster : undefined} alt={`${active.title}全身立绘`} decoding="async" />
          ) : (
            galleryItems.map((item, position) => media.renderedVideoIndices.has(position) ? (
              <video
                key={`${item.id}-${media.videoRetryTokens[item.id] ?? 0}`}
                ref={(node) => media.bindVideo(position, node)}
                className={`gallery-form-video${position === media.visibleVideoIndex ? " is-active" : ""}`}
                data-gallery-index={position}
                src={sectionActive || (warmupRequested && position === activeIndex) ? item.video : undefined}
                poster={mediaRequested ? item.poster : undefined}
                muted={galleryVideoPlayback.muted}
                playsInline
                preload={(sectionActive || warmupRequested) && position === activeIndex ? "auto" : "none"}
                aria-hidden={position !== media.visibleVideoIndex}
                aria-label={position === media.visibleVideoIndex ? `${item.title}六秒角色动作` : undefined}
                onEnded={position === activeIndex && position === media.visibleVideoIndex ? controller.showNext : undefined}
                onError={() => media.markFailed(item.id)}
              />
            ) : null)
          )}
          <div className="gallery-reticle" aria-hidden="true"><i /><span>FORM {active.index}</span></div>
        </div>
        <div className="gallery-card-copy" key={active.id}>
          <div><small>{active.en}</small><h3>{active.title}</h3></div>
          <p>{active.description}</p>
          <span className="gallery-playing"><i aria-hidden="true" />{reducedMotion || media.failedVideoIds.has(active.id) ? "STILL FRAME" : "6S PERFORMANCE"}</span>
          {media.failedVideoIds.has(active.id) && (
            <button className="gallery-video-retry" type="button" onClick={() => media.retry(active.id)}>重试动画</button>
          )}
        </div>
      </article>

      <button className="gallery-side-card gallery-side-card--next" type="button" onClick={controller.showNext} aria-label={`查看下一种形态：${next.title}`}>
        <img src={mediaRequested ? next.poster : undefined} alt="" decoding="async" />
        <span>{next.index} / {next.title}</span>
      </button>

      <div className="gallery-pagination" aria-label="本次随机形态">
        {controller.sampledForms.map((item, position) => (
          <button
            key={item.id}
            type="button"
            className={item.id === active.id ? "is-active" : ""}
            onClick={() => controller.selectSamplePosition(position)}
            aria-label={`查看${item.title}`}
            aria-current={item.id === active.id ? "true" : undefined}
          >
            <span>{item.index}</span>
          </button>
        ))}
      </div>
    </>
  );
}
