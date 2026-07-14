import { useRef } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { externalLinks } from "../content/siteContent";
import { gsap, useGSAP } from "../animation/gsap";
import { ChapterHud } from "../components/ChapterHud";

export function LinksSection({ reducedMotion, onBackHome }: { reducedMotion: boolean; onBackHome: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (reducedMotion) return;
    const gates = gsap.utils.toArray<HTMLElement>(".link-gate");
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
      .fromTo(".links-copy", { xPercent: 16, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.25);

    gates.forEach((gate, index) => {
      entrance.fromTo(gate, { xPercent: 18 + index * 4, yPercent: 20, rotate: 2 + index, autoAlpha: 0 }, {
        xPercent: 0,
        yPercent: 0,
        rotate: 0,
        autoAlpha: 1,
        duration: 0.5,
        ease: "power3.out",
      }, 1.02 + index * 0.16);
    });

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.45,
      },
    });

    timeline
      .to(".links-character", { xPercent: 7, yPercent: -2, scale: 1.08, duration: 0.85, ease: "power2.inOut" })
      .to(".links-portal", { scale: 1.22, rotate: 8, duration: 0.85, ease: "power2.inOut" }, "<")
      .to(".links-copy h2", { yPercent: -14, scale: 0.88, transformOrigin: "left center", autoAlpha: 0.28, duration: 0.65 }, "<")
      .to(".links-star-chain", { yPercent: 24, rotate: 12, duration: 0.8, ease: "power2.inOut" })
      .fromTo(".back-home", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.45 }, "<");

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
        <img className="links-star-chain" src={characterMedia.linksStarChain} alt="" aria-hidden="true" />
        <div className="links-portal" aria-hidden="true"><span /><i /></div>
        <img className="links-character" src={characterMedia.linksCharacter} alt="夜希向前迈步并回头看向用户" />

        <div className="links-copy">
          <small>YOU CAN LEAVE THIS PAGE</small>
          <h2>她负责让你记住，<br /><span>链接负责带你抵达</span>。</h2>
          <p>最后一段路不再设置谜语。选择一个真实入口，夜希会留在门后。</p>

          <div className="link-gates">
            {externalLinks.map((link) => link.href ? (
              <a className="link-gate" key={link.index} href={link.href} target="_blank" rel="noreferrer">
                <span>{link.index}</span><div><small>OPEN CHANNEL</small><strong>{link.label}</strong><p>{link.description}</p></div><i>↗</i>
              </a>
            ) : (
              <div className="link-gate is-pending" key={link.index}>
                <span>{link.index}</span><div><small>CHANNEL LOCKED</small><strong>{link.label}</strong><p>{link.description}</p></div><i>—</i>
              </div>
            ))}
          </div>

          <button className="back-home" type="button" onClick={onBackHome}>BACK TO NYXIE ↑</button>
        </div>

        <div className="links-stage-note" aria-hidden="true">CHOOSE YOUR NEXT TAB / NO KEY REQUIRED</div>
      </div>
    </section>
  );
}
