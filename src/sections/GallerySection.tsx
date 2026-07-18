import { useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import type { SectionDefinitionFor } from "../app/sectionRegistry";
import { gsap } from "../animation/gsap";
import { ChapterHud } from "../components/ChapterHud";
import { GalleryCarousel } from "../features/gallery/GalleryCarousel";
import { useGalleryController } from "../features/gallery/useGalleryController";
import { useGalleryMedia } from "../features/gallery/useGalleryMedia";
import { useChapterPerformance } from "../hooks/useChapterPerformance";

type Props = {
  definition: SectionDefinitionFor<"gallery">;
  reducedMotion: boolean;
  active: boolean;
  warmupRequested: boolean;
};

export function GallerySection({ definition, reducedMotion, active: sectionActive, warmupRequested }: Props) {
  const { sectionRef, progressRef, mediaActivated } = useChapterPerformance({
    active: sectionActive,
    reducedMotion,
    setup: ({ gsap: scopedGsap }) => {
      const entrance = scopedGsap.timeline({ paused: true });
      entrance
        .fromTo(".gallery-heading", { yPercent: 38, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.72, ease: "power3.out" })
        .fromTo(".gallery-orbit", { scale: 0.68, rotate: -18, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.08, ease: "power3.out" }, 0.08)
        .fromTo(".gallery-form-watermark", { xPercent: 12, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.14)
        .fromTo(".gallery-carousel", { yPercent: 22, scale: 0.82, autoAlpha: 0 }, { yPercent: 0, scale: 1, autoAlpha: 1, duration: 1.05, ease: "power3.out" }, 0.12)
        .fromTo(".gallery-side-card--previous", { xPercent: 32, rotate: -8, autoAlpha: 0 }, { xPercent: 0, rotate: -3, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.36)
        .fromTo(".gallery-side-card--next", { xPercent: -32, rotate: 8, autoAlpha: 0 }, { xPercent: 0, rotate: 3, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.36);
      return { entrance };
    },
  });
  const controller = useGalleryController(sectionRef);
  const media = useGalleryMedia({
    activeIndex: controller.activeIndex,
    selectionDirection: controller.selectionDirection,
    reducedMotion,
    sectionActive,
  });
  const style = useMemo(
    () => ({ "--gallery-accent": controller.active.accent } as CSSProperties),
    [controller.active.accent],
  );

  useEffect(() => {
    const section = sectionRef.current;
    const progressFill = progressRef.current;
    if (!section || !progressFill) return;
    section.dataset.forwardProgress = controller.viewedProgress.toFixed(4);
    gsap.set(progressFill, { scaleX: reducedMotion ? 1 : controller.viewedProgress });
  }, [controller.viewedProgress, progressRef, reducedMotion, sectionRef]);

  return (
    <section
      ref={sectionRef}
      className="gallery-chapter chapter"
      id={definition.id}
      style={style}
      data-gallery-sequence={controller.sampledForms.map((item) => item.id).join(",")}
      data-gallery-seed={controller.sessionSeed}
      data-gallery-media={sectionActive ? "active" : warmupRequested ? "warming" : "idle"}
      tabIndex={0}
      onKeyDown={controller.onKeyDown}
      onPointerDown={controller.onPointerDown}
      onPointerUp={controller.onPointerUp}
      aria-label="夜希形态画廊，向下滚轮浏览随机三种形态，左右方向键或按钮浏览全部八种形态"
    >
      <div className="gallery-stage">
        <ChapterHud index={definition.index} label={definition.hudLabel} inverted={definition.hudInverted} showStatus={definition.showHudStatus} progressRef={progressRef} />
        <div className="gallery-grid-field" aria-hidden="true" />
        <div className="gallery-orbit" aria-hidden="true"><span /><i /></div>
        <div className="gallery-form-watermark" aria-hidden="true">{controller.active.en}</div>

        <header className="gallery-heading">
          <small>NYXIE / EIGHT SIGNALS</small>
          <h2>你眼中的我，<br /><span>又是怎样的呢？</span></h2>
          <p>本次随机抽取三种形态供滚轮浏览。向下滚动一次切换一位，浏览完三位后进入下一页；左右按钮、两侧角色或方向键可查看全部八种形态，向上滚动直接返回首页。</p>
        </header>

        <GalleryCarousel
          controller={controller}
          media={media}
          mediaActivated={mediaActivated}
          reducedMotion={reducedMotion}
          sectionActive={sectionActive}
          warmupRequested={warmupRequested}
        />
      </div>
    </section>
  );
}
