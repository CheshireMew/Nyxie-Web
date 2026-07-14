import { useRef } from "react";
import { characterDetails } from "../content/siteContent";
import { characterMedia } from "../content/mediaCatalog";
import { gsap, ScrollTrigger, useGSAP } from "../animation/gsap";

export function CharacterSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (reducedMotion) return;
    const cards = gsap.utils.toArray<HTMLElement>(".character-detail");
    cards.forEach((card) => {
      gsap.from(card, {
        y: 72,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: card, start: "top 82%", once: true },
      });
      const image = card.querySelector("img");
      if (image) {
        gsap.fromTo(image, { scale: 1.08 }, {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: 1 },
        });
      }
    });

    const visual = sectionRef.current?.querySelector(".character-figure img");
    if (visual) {
      gsap.fromTo(visual, { yPercent: 3, rotate: -1.2 }, {
        yPercent: -3,
        rotate: 1.2,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }
    return () => ScrollTrigger.refresh();
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return (
    <section ref={sectionRef} className="character-section chapter" id="character">
      <div className="chapter-no" aria-hidden="true">01</div>
      <div className="section-kicker dark"><span>01</span> CHARACTER / DESIGN LANGUAGE</div>
      <header className="character-intro">
        <p>从一眼认出她开始</p>
        <h2>不是装饰的集合，<br />是夜希的<span>完整轮廓</span>。</h2>
      </header>

      <div className="character-layout">
        <div className="character-visual-column">
          <div className="character-sticky">
            <div className="character-halo" aria-hidden="true"><span /><i /></div>
            <div className="character-figure">
              <img src={characterMedia.full} alt="夜希自然比例3D全身形象" />
            </div>
            <div className="character-nameplate">
              <small>NYXIE / MODEL 025</small>
              <strong>夜希</strong>
              <span>CAT EARS · RED EYES · ASYMMETRIC RHYTHM</span>
            </div>
          </div>
        </div>

        <div className="character-details">
          {characterDetails.map((detail) => (
            <article className="character-detail" key={detail.id}>
              <div className="detail-index">{detail.index}</div>
              <div className="detail-media"><img src={detail.image} alt={detail.imageAlt} /></div>
              <div className="detail-copy">
                <small>{detail.eyebrow}</small>
                <h3>{detail.title}</h3>
                <p>{detail.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
