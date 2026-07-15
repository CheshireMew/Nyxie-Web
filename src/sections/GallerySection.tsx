import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { galleryItems } from "../content/siteContent";
import { gsap, useGSAP } from "../animation/gsap";
import { ChapterHud } from "../components/ChapterHud";

const wrapIndex = (index: number) => (index + galleryItems.length) % galleryItems.length;

export function GallerySection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointerStartX = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inView, setInView] = useState(false);

  const active = galleryItems[activeIndex];
  const previous = galleryItems[wrapIndex(activeIndex - 1)];
  const next = galleryItems[wrapIndex(activeIndex + 1)];
  const style = useMemo(() => ({ "--gallery-accent": active.accent } as CSSProperties), [active.accent]);

  const showPrevious = useCallback(() => setActiveIndex((index) => wrapIndex(index - 1)), []);
  const showNext = useCallback(() => setActiveIndex((index) => wrapIndex(index + 1)), []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.42 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;
    if (!inView) {
      video.pause();
      return;
    }
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [activeIndex, inView, reducedMotion]);

  useGSAP(() => {
    if (reducedMotion) return;
    gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top bottom",
        end: "top top",
        scrub: 0.45,
      },
    })
      .fromTo(".gallery-heading", { yPercent: 38, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.72, ease: "power3.out" })
      .fromTo(".gallery-carousel", { yPercent: 22, scale: 0.82, autoAlpha: 0 }, { yPercent: 0, scale: 1, autoAlpha: 1, duration: 1.05, ease: "power3.out" }, 0.12)
      .fromTo(".gallery-side-card--previous", { xPercent: 32, rotate: -8, autoAlpha: 0 }, { xPercent: 0, rotate: -3, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.36)
      .fromTo(".gallery-side-card--next", { xPercent: -32, rotate: 8, autoAlpha: 0 }, { xPercent: 0, rotate: 3, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.36);

    gsap.fromTo(".chapter-progress-fill", { scaleX: 0 }, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom bottom", scrub: true },
    });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") showPrevious();
    if (event.key === "ArrowRight") showNext();
  };

  return (
    <section
      ref={sectionRef}
      className="gallery-chapter chapter"
      id="gallery"
      style={style}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => { pointerStartX.current = event.clientX; }}
      onPointerUp={(event) => {
        const start = pointerStartX.current;
        pointerStartX.current = null;
        if (start === null || Math.abs(event.clientX - start) < 42) return;
        if (event.clientX < start) showNext();
        else showPrevious();
      }}
      aria-label="夜希形态画廊，使用左右方向键或按钮切换"
    >
      <div className="gallery-stage">
        <ChapterHud index="01" label="GALLERY / FORM ARCHIVE" inverted />
        <div className="gallery-grid-field" aria-hidden="true" />

        <header className="gallery-heading">
          <small>NYXIE / EIGHT SIGNALS</small>
          <h2>同一双红瞳，<br /><span>八种不同的夜色</span>。</h2>
          <p>当前卡片会播放一次6秒动作。点击两侧角色、使用箭头或左右滑动，查看下一种形态。</p>
        </header>

        <button className="gallery-arrow gallery-arrow--previous" type="button" onClick={showPrevious} aria-label="上一种形态">←</button>
        <button className="gallery-arrow gallery-arrow--next" type="button" onClick={showNext} aria-label="下一种形态">→</button>

        <button className="gallery-side-card gallery-side-card--previous" type="button" onClick={showPrevious} aria-label={`查看上一种形态：${previous.title}`}>
          <img src={previous.poster} alt="" />
          <span>{previous.index} / {previous.title}</span>
        </button>

        <article className="gallery-carousel" key={active.id} aria-live="polite">
          <div className="gallery-card-rail">
            <span>{active.index} / 08</span>
            <span>{active.en}</span>
          </div>
          <div className="gallery-media">
            {reducedMotion ? (
              <img src={active.poster} alt={`${active.title}全身立绘`} />
            ) : (
              <video
                ref={videoRef}
                src={active.video}
                poster={active.poster}
                muted
                playsInline
                preload="metadata"
                onEnded={showNext}
                aria-label={`${active.title}六秒角色动作`}
              />
            )}
            <div className="gallery-reticle" aria-hidden="true"><i /><span>FORM {active.index}</span></div>
          </div>
          <div className="gallery-card-copy">
            <div>
              <small>{active.en}</small>
              <h3>{active.title}</h3>
            </div>
            <p>{active.description}</p>
            <span className="gallery-playing"><i aria-hidden="true" />{reducedMotion ? "STILL FRAME" : "6S PERFORMANCE"}</span>
          </div>
        </article>

        <button className="gallery-side-card gallery-side-card--next" type="button" onClick={showNext} aria-label={`查看下一种形态：${next.title}`}>
          <img src={next.poster} alt="" />
          <span>{next.index} / {next.title}</span>
        </button>

        <div className="gallery-pagination" aria-label="选择夜希形态">
          {galleryItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`查看${item.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <span>{item.index}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
