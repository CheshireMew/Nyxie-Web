import { useEffect, useMemo, useRef, useState } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { gsap, ScrollTrigger, useGSAP } from "../animation/gsap";
import { ChapterHud } from "../components/ChapterHud";

function isSafariBrowser() {
  const userAgent = navigator.userAgent;
  return /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/i.test(userAgent);
}

export function PersonalitySection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const useVideo = useMemo(() => !reducedMotion && !isSafariBrowser() && !videoFailed, [reducedMotion, videoFailed]);

  useGSAP(() => {
    if (reducedMotion) return;
    const beats = gsap.utils.toArray<HTMLElement>(".personality-beat");
    gsap.set(beats, { autoAlpha: 0.2, xPercent: 8 });
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.8,
      },
    });

    timeline
      .fromTo(".personality-copy", { xPercent: -12, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" })
      .fromTo(".personality-media", { xPercent: 14, scale: 0.86, autoAlpha: 0 }, { xPercent: 0, scale: 1, autoAlpha: 1, duration: 1, ease: "power3.out" }, 0)
      .fromTo(".personality-orbit", { scale: 0.6, rotate: -24 }, { scale: 1, rotate: 0, duration: 1.1, ease: "power2.out" }, 0);

    beats.forEach((beat, index) => {
      timeline
        .to(beat, { autoAlpha: 1, xPercent: 0, duration: 0.35, ease: "power2.out" })
        .to(".personality-media", { scale: 1 + index * 0.035, xPercent: -index * 2, duration: 0.65, ease: "power2.inOut" }, "<")
        .to(beat, { autoAlpha: 1, duration: 0.38 });
      if (index < beats.length - 1) timeline.to(beat, { autoAlpha: 0.3, xPercent: -4, duration: 0.25 });
    });

    timeline
      .fromTo(".personality-closeup", { clipPath: "circle(0% at 78% 50%)", autoAlpha: 0 }, { clipPath: "circle(72% at 72% 50%)", autoAlpha: 0.72, duration: 1.1, ease: "power2.inOut" })
      .to(".personality-copy", { yPercent: -12, autoAlpha: 0.35, duration: 0.65 }, "<");

    gsap.fromTo(".chapter-progress-fill", { scaleX: 0 }, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom bottom", scrub: true },
    });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  useEffect(() => {
    if (!useVideo || !sectionRef.current || !videoRef.current) return;
    const video = videoRef.current;
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 58%",
      end: "bottom 28%",
      onEnter: () => {
        video.currentTime = 0;
        void video.play().catch(() => setVideoFailed(true));
      },
      onLeave: () => video.pause(),
      onEnterBack: () => {
        if (video.ended || video.currentTime > 9.5) video.currentTime = 0;
        void video.play().catch(() => setVideoFailed(true));
      },
      onLeaveBack: () => {
        video.pause();
        video.currentTime = 0;
      },
    });
    return () => {
      trigger.kill();
      video.pause();
    };
  }, [useVideo]);

  return (
    <section ref={sectionRef} className="personality-chapter chapter" id="personality">
      <div className="personality-stage">
        <ChapterHud index="02" label="PERSONALITY / EYE CONTACT" inverted />
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
              src={characterMedia.personalityVideo}
              poster={characterMedia.personalityPoster}
              muted
              playsInline
              preload="metadata"
              onError={() => setVideoFailed(true)}
              aria-label="夜希从侧视到注视用户的透明人物动画"
            />
          ) : (
            <img className="personality-poster" src={characterMedia.personalityPoster} alt="夜希注视用户的表情" />
          )}
          <span className="personality-caption">10 SEC / ONE CONTINUOUS REACTION</span>
        </div>

        <figure className="personality-closeup" aria-hidden="true">
          <img src={characterMedia.personalityCloseup} alt="" />
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
