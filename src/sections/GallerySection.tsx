import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { galleryItems } from "../content/siteContent";
import { gsap, ScrollTrigger, useGSAP } from "../animation/gsap";
import { driveChapterPerformance } from "../animation/chapterPerformance";
import { ChapterHud } from "../components/ChapterHud";

const visibleFormCount = 3;

function selectRandomForms() {
  const candidates = [...galleryItems];
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
  }
  return candidates.slice(0, visibleFormCount);
}

const wrapPosition = (position: number) => (position + visibleFormCount) % visibleFormCount;

export function GallerySection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const pointerStartX = useRef<number | null>(null);
  const wheelGestureRef = useRef(false);
  const wheelGestureTimerRef = useRef<number | null>(null);
  const activePositionRef = useRef(0);
  const viewedPositionsRef = useRef(new Set([0]));
  const furthestFormProgressRef = useRef(1 / visibleFormCount);
  const inViewRef = useRef(false);
  const [forms] = useState(selectRandomForms);
  const [activePosition, setActivePosition] = useState(0);
  const [viewedCount, setViewedCount] = useState(1);
  const [inView, setInView] = useState(false);

  const active = forms[activePosition];
  const previous = forms[wrapPosition(activePosition - 1)];
  const next = forms[wrapPosition(activePosition + 1)];
  const style = useMemo(() => ({ "--gallery-accent": active.accent } as CSSProperties), [active.accent]);

  const selectPosition = useCallback((position: number, directionHint?: -1 | 1) => {
    const nextPosition = wrapPosition(position);
    const currentPosition = activePositionRef.current;
    const direction = directionHint ?? (nextPosition >= currentPosition ? 1 : -1);
    const outgoingVideo = videoRefs.current[currentPosition];
    const incomingVideo = videoRefs.current[nextPosition];

    if (!reducedMotion && inViewRef.current && incomingVideo) {
      incomingVideo.style.setProperty("--gallery-shift-x", direction > 0 ? "4%" : "-4%");
      incomingVideo.currentTime = 0;
      void incomingVideo.play().catch(() => undefined);

      if (outgoingVideo && outgoingVideo !== incomingVideo) {
        outgoingVideo.style.setProperty("--gallery-shift-x", direction > 0 ? "-4%" : "4%");
        outgoingVideo.pause();
      }
    }

    if (!viewedPositionsRef.current.has(nextPosition)) {
      viewedPositionsRef.current.add(nextPosition);
      setViewedCount(viewedPositionsRef.current.size);
    }
    activePositionRef.current = nextPosition;
    setActivePosition(nextPosition);
  }, [reducedMotion]);
  const showPrevious = useCallback(() => selectPosition(activePositionRef.current - 1, -1), [selectPosition]);
  const showNext = useCallback(() => selectPosition(activePositionRef.current + 1, 1), [selectPosition]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const updateInView = (visible: boolean) => {
      inViewRef.current = visible;
      setInView(visible);
    };
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top 1px",
      end: "bottom 1px",
      onEnter: () => updateInView(true),
      onLeave: () => updateInView(false),
      onEnterBack: () => updateInView(false),
      onLeaveBack: () => updateInView(false),
    });
    return () => trigger.kill();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    videoRefs.current.forEach((video, position) => {
      if (!video) return;
      if (!inView || position !== activePosition) {
        video.pause();
        return;
      }
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    });
    return () => { videoRefs.current.forEach((video) => video?.pause()); };
  }, [inView, reducedMotion]);

  useEffect(() => {
    const section = sectionRef.current;
    const progressFill = section?.querySelector<HTMLElement>(".chapter-progress-fill");
    if (!section || !progressFill) return;
    furthestFormProgressRef.current = Math.max(
      furthestFormProgressRef.current,
      viewedCount / visibleFormCount,
    );
    section.dataset.forwardProgress = furthestFormProgressRef.current.toFixed(4);
    gsap.set(progressFill, { scaleX: reducedMotion ? 1 : furthestFormProgressRef.current });
  }, [reducedMotion, viewedCount]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onWheel = (event: WheelEvent) => {
      const bounds = section.getBoundingClientRect();
      const deltaY = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1);
      if (Math.abs(deltaY) < 6) return;
      if (deltaY < 0) {
        videoRefs.current.forEach((video) => video?.pause());
        return;
      }
      if (viewedPositionsRef.current.size >= forms.length) return;

      const approachingStage = bounds.top > 2 && bounds.top < window.innerHeight * 0.2 && deltaY >= bounds.top;
      if (approachingStage) {
        event.preventDefault();
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo(0, bounds.top + window.scrollY);
        root.style.scrollBehavior = previousBehavior;
        return;
      }
      if (Math.abs(bounds.top) > 2) return;

      event.preventDefault();
      if (wheelGestureTimerRef.current !== null) window.clearTimeout(wheelGestureTimerRef.current);
      wheelGestureTimerRef.current = window.setTimeout(() => {
        wheelGestureRef.current = false;
        wheelGestureTimerRef.current = null;
      }, 55);
      if (wheelGestureRef.current) return;
      wheelGestureRef.current = true;

      const currentPosition = activePositionRef.current;
      let nextPosition = wrapPosition(currentPosition + 1);
      while (viewedPositionsRef.current.has(nextPosition)) nextPosition = wrapPosition(nextPosition + 1);
      selectPosition(nextPosition, 1);
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      section.removeEventListener("wheel", onWheel);
      if (wheelGestureTimerRef.current !== null) window.clearTimeout(wheelGestureTimerRef.current);
    };
  }, [forms.length, reducedMotion, selectPosition]);

  useGSAP(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    if (!section) return;
    const entrance = gsap.timeline({ paused: true });
    entrance
      .fromTo(".gallery-heading", { yPercent: 38, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.72, ease: "power3.out" })
      .fromTo(".gallery-orbit", { scale: 0.68, rotate: -18, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.08, ease: "power3.out" }, 0.08)
      .fromTo(".gallery-form-watermark", { xPercent: 12, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.14)
      .fromTo(".gallery-carousel", { yPercent: 22, scale: 0.82, autoAlpha: 0 }, { yPercent: 0, scale: 1, autoAlpha: 1, duration: 1.05, ease: "power3.out" }, 0.12)
      .fromTo(".gallery-side-card--previous", { xPercent: 32, rotate: -8, autoAlpha: 0 }, { xPercent: 0, rotate: -3, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.36)
      .fromTo(".gallery-side-card--next", { xPercent: -32, rotate: 8, autoAlpha: 0 }, { xPercent: 0, rotate: 3, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.36);
    driveChapterPerformance({ trigger: section, entrance });
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
      data-gallery-sequence={forms.map((item) => item.id).join(",")}
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
      aria-label="夜希形态画廊，本次随机展示三种形态，可使用滚轮、左右方向键或按钮切换"
    >
      <div className="gallery-stage">
        <ChapterHud index="01" label="GALLERY / FORM ARCHIVE" showStatus={false} />
        <div className="gallery-grid-field" aria-hidden="true" />
        <div className="gallery-orbit" aria-hidden="true"><span /><i /></div>
        <div className="gallery-form-watermark" aria-hidden="true">{active.en}</div>

        <header className="gallery-heading">
          <small>NYXIE / EIGHT SIGNALS</small>
          <h2>同一双红瞳，<br /><span>八种不同的夜色</span>。</h2>
          <p>本次随机抽取三种形态。向下滚动一次切换一位，浏览完三位后进入下一页；向上滚动直接返回首页，也可点击两侧角色或使用方向键查看。</p>
        </header>

        <button className="gallery-arrow gallery-arrow--previous" type="button" onClick={showPrevious} aria-label="上一种形态">←</button>
        <button className="gallery-arrow gallery-arrow--next" type="button" onClick={showNext} aria-label="下一种形态">→</button>

        <button className="gallery-side-card gallery-side-card--previous" type="button" onClick={showPrevious} aria-label={`查看上一种形态：${previous.title}`}>
          <img src={previous.poster} alt="" />
          <span>{previous.index} / {previous.title}</span>
        </button>

        <article className="gallery-carousel" aria-live="polite">
          <div className="gallery-card-rail">
            <span>{active.index} / 08</span>
            <span>{active.en}</span>
          </div>
          <div className="gallery-media">
            {reducedMotion ? (
              <img src={active.poster} alt={`${active.title}全身立绘`} />
            ) : (
              forms.map((item, position) => (
                <video
                  key={item.id}
                  ref={(node) => { videoRefs.current[position] = node; }}
                  className={`gallery-form-video${position === activePosition ? " is-active" : ""}`}
                  src={item.video}
                  poster={item.poster}
                  muted
                  playsInline
                  preload="auto"
                  aria-hidden={position !== activePosition}
                  aria-label={position === activePosition ? `${item.title}六秒角色动作` : undefined}
                />
              ))
            )}
            <div className="gallery-reticle" aria-hidden="true"><i /><span>FORM {active.index}</span></div>
          </div>
          <div className="gallery-card-copy" key={active.id}>
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

        <div className="gallery-pagination" aria-label="本次随机形态">
          {forms.map((item, position) => (
            <button
              key={item.id}
              type="button"
              className={position === activePosition ? "is-active" : ""}
              onClick={() => selectPosition(position)}
              aria-label={`查看${item.title}`}
              aria-current={position === activePosition ? "true" : undefined}
            >
              <span>{item.index}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
