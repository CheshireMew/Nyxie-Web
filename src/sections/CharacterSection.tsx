import { characterIdentity } from "../content/siteContent";
import { ChapterHud } from "../components/ChapterHud";
import { useChapterPerformance } from "../hooks/useChapterPerformance";
import type { SectionDefinitionFor } from "../app/sectionRegistry";

export function CharacterSection({ definition, reducedMotion, active }: { definition: SectionDefinitionFor<"character">; reducedMotion: boolean; active: boolean }) {
  const { sectionRef, progressRef } = useChapterPerformance({
    active,
    reducedMotion,
    setup: ({ gsap, progressFill }) => {
      const entrance = gsap.timeline({ paused: true });
      entrance
        .fromTo(".character-intro > *", { yPercent: 34, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.72, stagger: 0.07, ease: "power3.out" })
        .fromTo(".character-sigil", { scale: 0.72, rotate: -10, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.05, ease: "power3.out" }, 0.04)
        .fromTo(".character-sigil-core", { scale: 0.82 }, { scale: 1, duration: 1.08, ease: "power2.out" }, 0.08)
        .fromTo(".character-wordmark", { xPercent: 7, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 1.1, ease: "power2.out" }, 0.12)
        .fromTo(".character-signature", { yPercent: 24, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.58, stagger: 0.09, ease: "power2.out" }, 0.32)
        .fromTo(progressFill, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power2.out" }, 0);
      return { entrance };
    },
  });

  return (
    <section ref={sectionRef} className="character-chapter chapter" id={definition.id}>
      <div className="character-stage">
        <ChapterHud index={definition.index} label={definition.hudLabel} inverted={definition.hudInverted} showStatus={definition.showHudStatus} progressRef={progressRef} />
        <div className="character-paper-grid" aria-hidden="true" />
        <div className="character-wordmark" aria-hidden="true">NYXIE</div>

        <header className="character-intro">
          <small>{characterIdentity.eyebrow}</small>
          <h2>
            {characterIdentity.title.map((line, index) => (
              <span className={index === characterIdentity.title.length - 1 ? "is-accent" : undefined} key={line}>{line}</span>
            ))}
          </h2>
          <p>{characterIdentity.description}</p>
          <div className="character-meta" aria-label="角色身份">
            {characterIdentity.meta.map((item) => <span key={item}>{item}</span>)}
          </div>
        </header>

        <div className="character-sigil" aria-hidden="true">
          <span className="character-orbit character-orbit--outer" />
          <span className="character-orbit character-orbit--inner" />
          <span className="character-orbit-dot character-orbit-dot--red" />
          <span className="character-orbit-dot character-orbit-dot--gold" />
          <div className="character-sigil-core">
            <span className="character-sigil-letter">N</span>
            <span className="character-sigil-eye"><i /></span>
            <b>025</b>
          </div>
          <span className="character-sigil-caption">IDENTITY / VISUAL FINGERPRINT</span>
        </div>

        <ol className="character-signatures" aria-label="夜希的视觉指纹">
          {characterIdentity.signatures.map((signature) => (
            <li className="character-signature" key={signature.en}>
              <div><b>{signature.index}</b><small>{signature.en}</small></div>
              <strong>{signature.title}</strong>
              <p>{signature.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
