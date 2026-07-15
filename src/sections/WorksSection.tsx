import { useRef } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { featuredWorks } from "../content/siteContent";
import { gsap, useGSAP } from "../animation/gsap";
import { ChapterHud } from "../components/ChapterHud";
import { ExternalLinksDrawer } from "../components/ExternalLinks";

export function WorksSection({ reducedMotion, onBackHome }: { reducedMotion: boolean; onBackHome: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (reducedMotion) return;
    const gates = gsap.utils.toArray<HTMLElement>(".external-link--drawer");
    const entrance = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top bottom",
        end: "top top",
        scrub: 0.45,
      },
    });

    entrance
      .fromTo(".works-stage-title", { yPercent: 35, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out" })
      .fromTo(".work-showcase", { yPercent: 42, scale: 0.72, rotate: -7, autoAlpha: 0 }, { yPercent: 0, scale: 1, rotate: -1.4, autoAlpha: 1, duration: 1.15, ease: "power3.out" }, 0.2)
      .fromTo(".works-character", { xPercent: 28, yPercent: 8, scale: 0.88, autoAlpha: 0 }, { xPercent: 0, yPercent: 0, scale: 1, autoAlpha: 1, duration: 1.05, ease: "power3.out" }, 0.35)
      .fromTo(".work-showcase-copy > *", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.55, ease: "power3.out" }, 1.05)
      .fromTo(".work-showcase-mobile", { xPercent: 45, yPercent: 30, rotate: 9, autoAlpha: 0 }, { xPercent: 0, yPercent: 0, rotate: 2, autoAlpha: 1, duration: 0.8, ease: "power3.out" }, 1.25);

    gsap.set(".links-drawer", { yPercent: 112, scale: 0.96, autoAlpha: 0 });
    gsap.set(".links-drawer-backdrop", { autoAlpha: 0 });
    gsap.set(gates, { y: 24, autoAlpha: 0 });
    gsap.set(".works-page-back", { y: 16, autoAlpha: 0 });

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.45,
      },
    });

    timeline
      .to(".works-stage-title", { yPercent: -42, scale: 0.8, autoAlpha: 0.18, duration: 0.7 })
      .to(".work-showcase", { rotate: 0, xPercent: -8, scale: 1.06, duration: 0.9, ease: "power2.inOut" }, "<")
      .to(".works-character", { xPercent: 8, scale: 1.1, duration: 0.9, ease: "power2.inOut" }, "<")
      .to(".work-showcase-screen img", { scale: 1.045, yPercent: -3, duration: 0.9, ease: "power2.inOut" })
      .to(".works-character", { xPercent: 14, yPercent: -2, scale: 1.14, duration: 0.9, ease: "power2.inOut" }, "<")
      .to(".work-showcase", { xPercent: -7, scale: 0.97, autoAlpha: 0.2, duration: 0.65, ease: "power2.inOut" }, 1.45)
      .to(".works-character", { xPercent: 10, scale: 1.08, autoAlpha: 0.26, duration: 0.65, ease: "power2.inOut" }, 1.45)
      .to(".works-stage-title", { autoAlpha: 0.08, duration: 0.55 }, 1.45)
      .to(".links-drawer-backdrop", { autoAlpha: 1, duration: 0.52 }, 1.48)
      .to(".links-drawer", { yPercent: 0, scale: 1, autoAlpha: 1, duration: 0.82, ease: "power4.out" }, 1.58)
      .to(gates, { y: 0, autoAlpha: 1, duration: 0.46, stagger: 0.09, ease: "power3.out" }, 1.94)
      .to(".works-page-back", { y: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out" }, 2.08);

    gsap.fromTo(".chapter-progress-fill", { scaleX: 0 }, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom bottom", scrub: true },
    });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return (
    <section ref={sectionRef} className="works-chapter chapter" id="works">
      <div className="works-stage">
        <ChapterHud index="05" label="CONTENT / PROJECTS" />
        <div className="works-grid-field" aria-hidden="true" />

        <header className="works-stage-title">
          <small>REAL OUTPUT / NOT A PLACEHOLDER</small>
          <h2>角色让人停下，<br /><span>作品证明她真的存在</span>。</h2>
        </header>

        <img className="works-character" src={characterMedia.worksCharacter} alt="夜希回头展示斗篷背面的猫笑图案" />

        {featuredWorks.map((work) => (
          <a className="work-showcase" key={work.index} href={work.href} target="_blank" rel="noreferrer">
            <div className="work-showcase-bar" aria-hidden="true"><i /><i /><i /><span>NYXIE-WEB / LIVE PROJECT</span></div>
            <div className="work-showcase-screen">
              <img src={work.desktopImage} alt={work.desktopImageAlt} loading="lazy" decoding="async" />
            </div>
            <figure className="work-showcase-mobile">
              <img src={work.mobileImage} alt={work.mobileImageAlt} loading="lazy" decoding="async" />
            </figure>
            <div className="work-showcase-copy">
              <div className="work-showcase-index"><b>{work.index}</b><small>{work.meta}</small></div>
              <div>
                <h3>{work.title}</h3>
                <p>{work.description}</p>
              </div>
              <ul aria-label="项目实现重点">
                {work.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
              </ul>
              <div className="work-showcase-tags" aria-label="项目技术标签">
                {work.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <strong>{work.cta} ↗</strong>
            </div>
          </a>
        ))}

        <div className="works-stage-caption" aria-hidden="true"><span>CREATIVE COMPANION</span><b>NYXIE</b></div>
        <ExternalLinksDrawer />
        <button className="back-home works-page-back" type="button" onClick={onBackHome}>BACK TO NYXIE ↑</button>
      </div>
    </section>
  );
}
