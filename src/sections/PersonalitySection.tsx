import { useEffect, useMemo, useRef, useState } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { ScrollTrigger } from "../animation/gsap";
import { ChapterHud } from "../components/ChapterHud";
import { useChapterPerformance } from "../hooks/useChapterPerformance";
import type { SectionDefinitionFor } from "../app/sectionRegistry";

function isSafariBrowser() {
  const userAgent = navigator.userAgent;
  return /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/i.test(userAgent);
}

export function PersonalitySection({ definition, reducedMotion, active }: { definition: SectionDefinitionFor<"personality">; reducedMotion: boolean; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const performanceStartedRef = useRef(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const useVideo = useMemo(() => !reducedMotion && !isSafariBrowser() && !videoFailed, [reducedMotion, videoFailed]);
  const { sectionRef, progressRef, mediaActivated } = useChapterPerformance({
    active,
    reducedMotion,
    setup: ({ gsap }) => {
    const beats = gsap.utils.toArray<HTMLElement>(".personality-beat");
    gsap.set(beats, { autoAlpha: 0.2, xPercent: 8 });
    gsap.set(beats[0], { autoAlpha: 1, xPercent: 0 });
    const entrance = gsap.timeline({ paused: true });
    const sequence = gsap.timeline({ paused: true });

    entrance
      .fromTo(".personality-copy", { xPercent: -12, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" })
      .fromTo(".personality-media", { xPercent: 14, scale: 0.86, autoAlpha: 0 }, { xPercent: 0, scale: 1, autoAlpha: 1, duration: 1, ease: "power3.out" }, 0)
      .fromTo(".personality-orbit", { scale: 0.6, rotate: -24 }, { scale: 1, rotate: 0, duration: 1.1, ease: "power2.out" }, 0);

    beats.forEach((beat, index) => {
      sequence
        .to(beat, { autoAlpha: 1, xPercent: 0, duration: 0.35, ease: "power2.out" })
        .to(".personality-media", { scale: 1 + index * 0.035, xPercent: -index * 2, duration: 0.65, ease: "power2.inOut" }, "<")
        .to(beat, { autoAlpha: 1, duration: 0.38 });
      if (index < beats.length - 1) {
        sequence
          .to(beat, { autoAlpha: 0.3, xPercent: -4, duration: 0.25 })
          .to(beats[index + 1], { autoAlpha: 1, xPercent: 0, duration: 0.25, ease: "power2.out" }, "<");
      }
    });

    sequence
      .fromTo(".personality-closeup", { xPercent: 12, scale: 0.9, autoAlpha: 0 }, { xPercent: 0, scale: 1, autoAlpha: 0.62, duration: 1.1, ease: "power2.inOut" })
      .to(".personality-copy", { yPercent: -12, autoAlpha: 0.35, duration: 0.65 }, "<");
    return { entrance, sequence, runwayVh: 56 };
    },
  });

  useEffect(() => {
    if (!useVideo || !mediaActivated || !sectionRef.current || !videoRef.current) return;
    const video = videoRef.current;
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 1px",
      end: "bottom bottom",
      onEnter: () => {
        if (performanceStartedRef.current) return;
        performanceStartedRef.current = true;
        video.currentTime = 0;
        void video.play().catch(() => setVideoFailed(true));
      },
      onLeave: () => video.pause(),
      onEnterBack: () => video.pause(),
      onLeaveBack: () => video.pause(),
      onUpdate: (self) => {
        if (self.direction < 0) video.pause();
      },
    });
    return () => {
      trigger.kill();
      video.pause();
    };
  }, [mediaActivated, useVideo]);

  return (
    <section ref={sectionRef} className="personality-chapter chapter chapter--sequenced" id={definition.id}>
      <div className="personality-stage">
        <ChapterHud index={definition.index} label={definition.hudLabel} inverted={definition.hudInverted} showStatus={definition.showHudStatus} progressRef={progressRef} />
        <div className="personality-grid-field" aria-hidden="true" />
        <div className="personality-copy">
          <small>SHE NOTICES FIRST</small>
          <h2>她先移动眼睛，<br />然后才让你知道<br /><span>自己被发现了</span>。</h2>
          <p>夜希不是热情的引导员。她更像一只安静观察你的猫：保持距离、判断反应，然后露出一点已经知道答案的笑。</p>
        </div>

        <div className="personality-media">
          <div className="personality-orbit" aria-hidden="true"><i /><i /><span /></div>
          {useVideo ? (
            <video
              ref={videoRef}
              className="personality-video"
              src={mediaActivated ? characterMedia.personalityVideo : undefined}
              poster={mediaActivated ? characterMedia.personalityPoster : undefined}
              muted
              playsInline
              preload="none"
              onError={() => setVideoFailed(true)}
              aria-label="夜希从侧视到注视用户的透明人物动画"
            />
          ) : (
            <img className="personality-poster" src={mediaActivated ? characterMedia.personalityPoster : undefined} alt="夜希注视用户的表情" decoding="async" />
          )}
          <span className="personality-caption">10 SEC / ONE CONTINUOUS REACTION</span>
        </div>

        <figure className="personality-closeup" aria-hidden="true">
          <img src={mediaActivated ? characterMedia.personalityCloseup : undefined} alt="" decoding="async" />
        </figure>

        <div className="personality-beats" aria-label="性格动作阶段">
          <article className="personality-beat"><b>01</b><span>SIDE GLANCE</span><small>先确认你是否值得注意</small></article>
          <article className="personality-beat"><b>02</b><span>EYE CONTACT</span><small>视线真正落到你身上</small></article>
          <article className="personality-beat"><b>03</b><span>SMALL FANG</span><small>最后才允许笑意出现</small></article>
        </div>

        <div className="personality-signal" aria-hidden="true"><i /><span>EYE CONTACT ACQUIRED</span></div>
      </div>
    </section>
  );
}
