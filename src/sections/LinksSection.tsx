import { useRef } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { externalLinks } from "../content/siteContent";
import { gsap, useGSAP } from "../animation/gsap";

export function LinksSection({ reducedMotion, onBackHome }: { reducedMotion: boolean; onBackHome: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (reducedMotion) return;
    gsap.from(".links-character", {
      x: -90,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
      scrollTrigger: { trigger: sectionRef.current, start: "top 72%", once: true },
    });
    gsap.from(".link-row", {
      x: 70,
      opacity: 0,
      stagger: 0.12,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: ".links-list", start: "top 78%", once: true },
    });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return (
    <section ref={sectionRef} className="links-section chapter" id="links">
      <div className="links-sky" aria-hidden="true" />
      <img className="links-star-chain" src={characterMedia.linksStarChain} alt="" aria-hidden="true" />
      <div className="section-kicker dark"><span>04</span> LINKS / NEXT STOP</div>

      <div className="links-layout">
        <div className="links-character-wrap">
          <div className="links-moon" aria-hidden="true"><span /></div>
          <img className="links-character" src={characterMedia.linksCharacter} alt="夜希向前迈步并回头看向用户" />
        </div>

        <div className="links-copy">
          <small>YOU CAN LEAVE THIS PAGE</small>
          <h2>她负责让你记住，<br /><span>链接负责带你抵达</span>。</h2>
          <p>选择一个真实入口。没有门，没有谜语，也不需要钥匙。</p>

          <div className="links-frame-title">
            <img src={characterMedia.linksFrame} alt="" aria-hidden="true" />
            <strong>CHOOSE YOUR NEXT TAB</strong>
          </div>

          <div className="links-list">
            {externalLinks.map((link) => link.href ? (
              <a className="link-row" key={link.index} href={link.href} target="_blank" rel="noreferrer">
                <span>{link.index}</span>
                <div><strong>{link.label}</strong><small>{link.description}</small></div>
                <i>↗</i>
              </a>
            ) : (
              <div className="link-row is-pending" key={link.index}>
                <span>{link.index}</span>
                <div><strong>{link.label}</strong><small>{link.description}</small></div>
                <i>—</i>
              </div>
            ))}
          </div>

          <button className="back-home" type="button" onClick={onBackHome}>BACK TO NYXIE ↑</button>
        </div>
      </div>
    </section>
  );
}
