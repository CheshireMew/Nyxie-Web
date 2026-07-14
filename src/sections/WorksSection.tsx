import { useRef } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { works } from "../content/siteContent";
import { gsap, useGSAP } from "../animation/gsap";

export function WorksSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (reducedMotion) return;
    gsap.from(".work-card", {
      y: 80,
      opacity: 0,
      stagger: 0.14,
      duration: 0.95,
      ease: "power3.out",
      scrollTrigger: { trigger: ".works-grid", start: "top 78%", once: true },
    });
    gsap.fromTo(".works-character", { yPercent: 8, rotate: -1.5 }, {
      yPercent: -5,
      rotate: 1,
      ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1.2 },
    });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return (
    <section ref={sectionRef} className="works-section chapter" id="works">
      <img className="works-moon-chain" src={characterMedia.worksMoonChain} alt="" aria-hidden="true" />
      <img className="works-gem" src={characterMedia.worksGem} alt="" aria-hidden="true" />
      <div className="section-kicker dark"><span>03</span> CONTENT / PROJECTS</div>
      <header className="works-head">
        <div>
          <small>WHAT I MAKE</small>
          <h2>角色让人停下，<br /><span>内容让人继续走</span>。</h2>
        </div>
        <p>这里不放生成出来的假文章或假代码。每一张卡片都对应真实地址，后续增加内容只需要更新数据。</p>
      </header>

      <div className="works-layout">
        <div className="works-character-wrap">
          <div className="works-character-label"><span>NYXIE</span><small>CREATIVE COMPANION</small></div>
          <img className="works-character" src={characterMedia.worksCharacter} alt="夜希回头展示斗篷背面的猫笑图案" />
        </div>

        <div className="works-grid">
          {works.map((work) => {
            const content = (
              <>
                <div className={`work-preview ${work.kind}`} aria-hidden="true">
                  <span className="work-preview-top"><i /><i /><i /></span>
                  <strong>{work.kind === "article" ? "Aa" : work.kind === "repository" ? "&lt;/&gt;" : "NX"}</strong>
                  <em>{work.index}</em>
                </div>
                <div className="work-copy">
                  <small>{work.meta}</small>
                  <h3>{work.title}</h3>
                  <p>{work.description}</p>
                  <span>{work.cta} {work.href ? "↗" : "·"}</span>
                </div>
              </>
            );
            return work.href ? (
              <a className="work-card" key={work.index} href={work.href} target="_blank" rel="noreferrer">
                {content}
              </a>
            ) : (
              <article className="work-card is-pending" key={work.index} aria-label={`${work.title}，${work.cta}`}>
                {content}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
