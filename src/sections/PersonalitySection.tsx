import { useEffect, useMemo, useRef, useState } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { gsap, ScrollTrigger, useGSAP } from "../animation/gsap";

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
    gsap.from(".personality-copy > *", {
      y: 52,
      opacity: 0,
      stagger: 0.1,
      duration: 0.85,
      ease: "power3.out",
      scrollTrigger: { trigger: sectionRef.current, start: "top 68%", once: true },
    });
    gsap.fromTo(".personality-closeup", { xPercent: 18, rotate: 4 }, {
      xPercent: -4,
      rotate: -2,
      ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1 },
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
    <section ref={sectionRef} className="personality-section chapter" id="personality">
      <div className="personality-grid" aria-hidden="true" />
      <div className="section-kicker"><span>02</span> PERSONALITY / EYE CONTACT</div>
      <div className="personality-stage">
        <div className="personality-copy">
          <small>SHE NOTICES FIRST</small>
          <h2>她先移动眼睛，<br />然后才让你知道<br /><span>自己被发现了</span>。</h2>
          <p>夜希不是热情的引导员。她更像一只安静观察你的猫：保持距离、判断反应，然后露出一点已经知道答案的笑。</p>
          <div className="personality-beats" aria-label="性格动作阶段">
            <span><b>01</b> SIDE GLANCE</span>
            <span><b>02</b> EYE CONTACT</span>
            <span><b>03</b> SMALL FANG</span>
          </div>
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
      </div>
    </section>
  );
}
