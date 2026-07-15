import { useRef } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { gsap, useGSAP } from "../animation/gsap";
import { ChapterHud } from "../components/ChapterHud";
import { ExternalLinkRows } from "../components/ExternalLinks";

export function LinksSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (reducedMotion) return;
    const entrance = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top bottom",
        end: "top top",
        scrub: 0.45,
      },
    });

    entrance
      .fromTo(".links-portal", { scale: 0.25, rotate: -24, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.1, ease: "power3.out" })
      .fromTo(".links-character", { xPercent: -35, yPercent: 8, scale: 0.86, autoAlpha: 0 }, { xPercent: 0, yPercent: 0, scale: 1, autoAlpha: 1, duration: 1.1, ease: "power3.out" }, 0)
      .fromTo(".links-intro", { xPercent: 16, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.25);

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.45,
      },
    });

    timeline
      .to(".links-character", { xPercent: -4, yPercent: -2, scale: 1.04, duration: 0.8, ease: "power2.inOut" })
      .to(".links-portal", { scale: 1.1, rotate: 5, duration: 0.8, ease: "power2.inOut" }, 0)
      .to(".links-intro", { yPercent: -5, scale: 0.98, duration: 0.8, ease: "power2.inOut" }, 0);

    gsap.fromTo(".chapter-progress-fill", { scaleX: 0 }, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom bottom", scrub: true },
    });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return (
    <section ref={sectionRef} className="links-chapter chapter" id="links">
      <div className="links-stage">
        <ChapterHud index="04" label="LINKS / NEXT STOP" />
        <div className="links-grid-field" aria-hidden="true" />
        <div className="links-portal" aria-hidden="true"><span /><i /></div>
        <img className="links-character" src={characterMedia.linksCharacter} alt="夜希向前迈步并回头看向用户" />

        <div className="links-intro">
          <small>YOU CAN LEAVE THIS PAGE</small>
          <h2>她负责让你记住，<br /><span>链接负责带你抵达</span>。</h2>
          <p>选择一个真实入口，或者继续向下查看完整作品；抵达页面尽头时，链接目录会再次出现。</p>
          <div className="inline-link-gates">
            <ExternalLinkRows variant="inline" />
          </div>
          <span className="links-scroll-hint"><i aria-hidden="true" />NEXT / WORKS ARCHIVE</span>
        </div>
      </div>
    </section>
  );
}
