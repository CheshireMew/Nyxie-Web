import { useRef } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { externalLinks } from "../content/siteContent";
import { gsap, useGSAP } from "../animation/gsap";
import { ChapterHud } from "../components/ChapterHud";

function ExternalLinkRows({ variant }: { variant: "inline" | "drawer" }) {
  return externalLinks.map((link) => {
    const className = `external-link external-link--${variant}${link.href ? "" : " is-pending"}`;
    const content = (
      <>
        <span>{link.index}</span>
        <div>
          <small>{link.href ? "OPEN CHANNEL" : "COMING SOON"}</small>
          <strong>{link.label}</strong>
          <p>{link.description}</p>
        </div>
        <i aria-hidden="true">{link.href ? "↗" : "—"}</i>
      </>
    );

    return link.href ? (
      <a className={className} key={`${variant}-${link.index}`} href={link.href} target="_blank" rel="noreferrer" aria-label={`打开 ${link.label}：${link.description}`}>
        {content}
      </a>
    ) : (
      <div className={className} key={`${variant}-${link.index}`} aria-disabled="true">
        {content}
      </div>
    );
  });
}

export function LinksSection({ reducedMotion, onBackHome }: { reducedMotion: boolean; onBackHome: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const availableLinkCount = externalLinks.filter((link) => link.href).length;

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
      .fromTo(".links-portal", { scale: 0.25, rotate: -24, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.1, ease: "power3.out" })
      .fromTo(".links-character", { xPercent: -35, yPercent: 8, scale: 0.86, autoAlpha: 0 }, { xPercent: 0, yPercent: 0, scale: 1, autoAlpha: 1, duration: 1.1, ease: "power3.out" }, 0)
      .fromTo(".links-intro", { xPercent: 16, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.25);

    gsap.set(".links-drawer", { yPercent: 112, scale: 0.96, autoAlpha: 0 });
    gsap.set(".links-drawer-backdrop", { autoAlpha: 0 });
    gsap.set(gates, { y: 24, autoAlpha: 0 });
    gsap.set(".back-home", { y: 16, autoAlpha: 0 });

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.45,
      },
    });

    timeline
      .to(".links-character", { xPercent: -5, yPercent: -2, scale: 1.05, duration: 0.8, ease: "power2.inOut" })
      .to(".links-portal", { scale: 1.18, rotate: 8, duration: 0.8, ease: "power2.inOut" }, 0)
      .to(".links-intro", { yPercent: -18, scale: 0.92, autoAlpha: 0.12, duration: 0.62, ease: "power2.inOut" }, 0)
      .to(".links-drawer-backdrop", { autoAlpha: 1, duration: 0.52 }, 0.24)
      .to(".links-drawer", { yPercent: 0, scale: 1, autoAlpha: 1, duration: 0.86, ease: "power4.out" }, 0.38)
      .to(gates, { y: 0, autoAlpha: 1, duration: 0.48, stagger: 0.09, ease: "power3.out" }, 0.78)
      .to(".back-home", { y: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out" }, 0.94);

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
          <p>最后一段路不再设置谜语。选择一个真实入口，夜希会留在门后。</p>
          <div className="inline-link-gates">
            <ExternalLinkRows variant="inline" />
          </div>
          <span className="links-scroll-hint"><i aria-hidden="true" />SCROLL TO OPEN DIRECTORY</span>
        </div>

        <div className="links-drawer-backdrop" aria-hidden="true" />
        <aside className="links-drawer" aria-label="夜希的外部链接">
          <div className="links-drawer-rail">
            <span>04 / EXIT DIRECTORY</span>
            <span className="links-drawer-status"><i aria-hidden="true" />{availableLinkCount} {availableLinkCount === 1 ? "CHANNEL" : "CHANNELS"} ONLINE</span>
          </div>

          <div className="links-drawer-head">
            <div>
              <small>CHOOSE YOUR NEXT STOP</small>
              <h3>夜希的其他入口</h3>
              <p>这里收录所有真实入口。选择一个链接，在新的标签页继续。</p>
            </div>
            <span className="links-drawer-mark" aria-hidden="true">N<i>×</i></span>
          </div>

          <div className="drawer-link-gates">
            <ExternalLinkRows variant="drawer" />
          </div>

          <div className="links-drawer-foot">
            <span>END OF CURRENT PAGE / 2026</span>
          </div>
        </aside>

        <button className="back-home links-page-back" type="button" onClick={onBackHome}>BACK TO NYXIE ↑</button>
      </div>
    </section>
  );
}
