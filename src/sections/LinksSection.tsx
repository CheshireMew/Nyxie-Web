import { useRef, useState } from "react";
import { characterMedia } from "../content/mediaCatalog";
import { featuredWorks } from "../content/siteContent";
import { ChapterHud } from "../components/ChapterHud";
import { ExternalLinksDrawer } from "../components/ExternalLinks";
import { useChapterPerformance } from "../hooks/useChapterPerformance";
import type { SectionDefinitionFor } from "../app/sectionRegistry";

type Props = {
  definition: SectionDefinitionFor<"links">;
  reducedMotion: boolean;
  active: boolean;
  warmupRequested: boolean;
  onBackHome: () => void;
};

export function LinksSection({ definition, reducedMotion, active, warmupRequested, onBackHome }: Props) {
  const [drawerDismissed, setDrawerDismissed] = useState(false);
  const drawerRevealedRef = useRef(false);
  const revealDrawerRef = useRef<() => void>(() => undefined);
  const dismissDrawerRef = useRef<() => void>(() => setDrawerDismissed(true));
  const { sectionRef, progressRef, mediaActivated } = useChapterPerformance({
    active,
    warmupRequested,
    reducedMotion,
    setup: ({ section, gsap }) => {
    drawerRevealedRef.current = false;
    const gates = gsap.utils.toArray<HTMLElement>(".external-link--drawer");
    const entrance = gsap.timeline({ paused: true });
    const sequence = gsap.timeline({ paused: true });

    entrance
      .fromTo(".links-stage-title", { yPercent: 35, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.56, ease: "power3.out" })
      .fromTo(".work-showcase", { yPercent: 42, scale: 0.72, rotate: -7, autoAlpha: 0 }, { yPercent: 0, scale: 1, rotate: -1.4, autoAlpha: 1, duration: 0.92, ease: "power3.out" }, 0.14)
      .fromTo(".links-character", { xPercent: 28, yPercent: 8, scale: 0.88, autoAlpha: 0 }, { xPercent: 0, yPercent: 0, scale: 1, autoAlpha: 1, duration: 0.84, ease: "power3.out" }, 0.26)
      .fromTo(".work-showcase-copy > *", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.06, duration: 0.44, ease: "power3.out" }, 0.8)
      .fromTo(".work-showcase-mobile", { xPercent: 45, yPercent: 30, rotate: 9, autoAlpha: 0 }, { xPercent: 0, yPercent: 0, rotate: 2, autoAlpha: 1, duration: 0.64, ease: "power3.out" }, 0.95);

    gsap.set(".links-drawer", { yPercent: 112, scale: 0.96, autoAlpha: 0 });
    gsap.set(".links-drawer-backdrop", { autoAlpha: 0 });
    gsap.set(gates, { y: 24, autoAlpha: 0 });
    gsap.set(".links-page-back", { y: 16, autoAlpha: 0 });

    sequence
      .to(".links-stage-title", { yPercent: -42, scale: 0.8, autoAlpha: 0.18, duration: 0.56 })
      .to(".work-showcase", { rotate: 0, xPercent: -8, scale: 1.06, duration: 0.72, ease: "power2.inOut" }, "<")
      .to(".links-character", { xPercent: 8, scale: 1.1, duration: 0.72, ease: "power2.inOut" }, "<")
      .to(".work-showcase-screen img", { scale: 1.045, yPercent: -3, duration: 0.72, ease: "power2.inOut" })
      .to(".links-character", { xPercent: 14, yPercent: -2, scale: 1.14, duration: 0.72, ease: "power2.inOut" }, "<");

    const drawerTimeline = gsap.timeline({ paused: true })
      .to(".work-showcase", { xPercent: -7, scale: 0.97, autoAlpha: 0.2, duration: 0.36, ease: "power2.inOut" }, 0)
      .to(".links-character", { xPercent: 10, scale: 1.08, autoAlpha: 0.26, duration: 0.36, ease: "power2.inOut" }, 0)
      .to(".links-stage-title", { autoAlpha: 0.08, duration: 0.3 }, 0)
      .to(".links-drawer-backdrop", { autoAlpha: 1, duration: 0.3 }, 0.02)
      .to(".links-drawer", { yPercent: 0, scale: 1, autoAlpha: 1, duration: 0.46, ease: "power4.out" }, 0.06)
      .to(gates, { y: 0, autoAlpha: 1, duration: 0.26, stagger: 0.045, ease: "power3.out" }, 0.25);
    drawerTimeline.eventCallback("onComplete", () => {
      section.dataset.drawerState = "settled";
    });
    drawerTimeline.eventCallback("onReverseComplete", () => {
      section.dataset.drawerState = "closed";
      setDrawerDismissed(true);
      requestAnimationFrame(() => section.querySelector<HTMLButtonElement>(".links-page-back")?.focus());
    });

    revealDrawerRef.current = () => {
      if (drawerRevealedRef.current) return;
      drawerRevealedRef.current = true;
      section.dataset.drawerRevealed = "true";
      section.dataset.drawerState = "opening";
      drawerTimeline.play();
      gsap.to(".links-page-back", { y: 0, autoAlpha: 1, duration: 0.24, delay: 0.34, ease: "power3.out" });
    };
    dismissDrawerRef.current = () => {
      if (!drawerRevealedRef.current || section.dataset.drawerState === "closing") return;
      section.dataset.drawerState = "closing";
      drawerTimeline.reverse();
    };

    return {
      entrance,
      sequence,
      runwayVh: 34,
      onSettled: () => revealDrawerRef.current(),
      cleanup: () => {
        revealDrawerRef.current = () => undefined;
        dismissDrawerRef.current = () => setDrawerDismissed(true);
      },
    };
    },
  });

  return (
    <section
      ref={sectionRef}
      className="links-chapter chapter chapter--sequenced"
      id={definition.id}
      data-links-media={active ? "active" : warmupRequested ? "warming" : "idle"}
    >
      <div className="links-stage">
        <ChapterHud index={definition.index} label={definition.hudLabel} inverted={definition.hudInverted} showStatus={definition.showHudStatus} progressRef={progressRef} />
        <div className="links-grid-field" aria-hidden="true" />

        <header className="links-stage-title">
          <small>REAL OUTPUT / NOT A PLACEHOLDER</small>
          <h2>角色让人停下，<br /><span>作品证明她真的存在</span>。</h2>
        </header>

        <img className="links-character" src={mediaActivated ? characterMedia.linksCharacter : undefined} alt="夜希回头展示斗篷背面的猫笑图案" decoding="async" />

        {featuredWorks.map((work) => (
          <article className="work-showcase" key={work.index}>
            <div className="work-showcase-bar" aria-hidden="true"><i /><i /><i /><span>NYXIE-WEB / LIVE PROJECT</span></div>
            <div className="work-showcase-screen">
              <img src={mediaActivated ? work.desktopImage : undefined} alt={work.desktopImageAlt} decoding="async" />
            </div>
            <figure className="work-showcase-mobile">
              <img src={mediaActivated ? work.mobileImage : undefined} alt={work.mobileImageAlt} decoding="async" />
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
            </div>
          </article>
        ))}

        <div className="links-stage-caption" aria-hidden="true"><span>CREATIVE COMPANION</span><b>NYXIE</b></div>
        <ExternalLinksDrawer
          dismissed={drawerDismissed}
          onClose={() => {
            if (reducedMotion) setDrawerDismissed(true);
            else dismissDrawerRef.current();
          }}
        />
        <button className="back-home links-page-back" type="button" onClick={onBackHome}>BACK TO NYXIE ↑</button>
      </div>
    </section>
  );
}
