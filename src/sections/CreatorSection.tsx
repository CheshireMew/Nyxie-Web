import { creatorCards, creatorProfile } from "../content/siteContent";
import { ChapterHud } from "../components/ChapterHud";
import { useCreatorCardDeck } from "../features/creator/useCreatorCardDeck";
import { useChapterPerformance } from "../hooks/useChapterPerformance";
import type { SectionDefinitionFor } from "../app/sectionRegistry";

type Props = {
  definition: SectionDefinitionFor<"creator">;
  reducedMotion: boolean;
  active: boolean;
  warmupRequested: boolean;
};

export function CreatorSection({ definition, reducedMotion, active, warmupRequested }: Props) {
  const { sectionRef, progressRef, mediaActivated } = useChapterPerformance({
    active,
    warmupRequested,
    reducedMotion,
    setup: ({ gsap, progressFill }) => {
      const entrance = gsap.timeline({ paused: true });
      entrance
        .fromTo(".creator-copy > *", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.68, stagger: 0.08, ease: "power3.out" })
        .fromTo(".creator-deck-head", { x: 24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out" }, 0.12)
        .fromTo(".creator-card-surface", { y: 54, scale: 0.84, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.88, stagger: 0.09, ease: "power3.out" }, 0.18)
        .fromTo(".creator-deck-readout", { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" }, 0.62)
        .fromTo(progressFill, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power2.out" }, 0);
      return { entrance };
    },
  });
  const deck = useCreatorCardDeck({ cardCount: creatorCards.length, reducedMotion });
  const visibleCard = creatorCards[deck.visibleIndex] ?? creatorCards[0];

  return (
    <section
      ref={sectionRef}
      className="creator-chapter chapter"
      id={definition.id}
      data-creator-media={active ? "active" : warmupRequested ? "warming" : "idle"}
    >
      <div className="creator-stage">
        <ChapterHud index={definition.index} label={definition.hudLabel} inverted={definition.hudInverted} showStatus={definition.showHudStatus} progressRef={progressRef} />
        <div className="chapter-grid-field creator-grid-field" aria-hidden="true" />

        <div className="creator-layout">
          <article className="creator-copy" aria-labelledby="creator-title">
            <small>{creatorProfile.eyebrow}</small>
            <h2 id="creator-title">{creatorProfile.title}</h2>
            <p>{creatorProfile.introduction}</p>
            <dl className="creator-facts">
              {creatorProfile.facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
            <span className="creator-copy-status"><i aria-hidden="true" /> NYXIE / OFFICIAL CHARACTER ONLINE</span>
          </article>

          <div className="creator-deck-shell">
            <header className="creator-deck-head" aria-hidden="true">
              <span>NYXIE / CREATOR ARCHIVE</span>
              <span>04 FRAMES</span>
            </header>

            <div
              ref={deck.deckRef}
              className="creator-card-deck"
              data-active-card={visibleCard.index}
              {...deck.pointerHandlers}
            >
              {creatorCards.map((card, index) => {
                const current = deck.visibleIndex === index;
                const locked = deck.lockedIndex === index;
                return (
                  <button
                    key={card.id}
                    className={`creator-card creator-card--${index + 1}${current ? " is-current" : ""}${locked ? " is-locked" : ""}`}
                    type="button"
                    data-creator-card={card.index}
                    aria-pressed={locked}
                    aria-label={`${card.label}，${card.alt}`}
                    onPointerEnter={() => deck.preview(index)}
                    onFocus={() => deck.preview(index)}
                    onBlur={deck.clearPreview}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      deck.select(index);
                    }}
                    onClick={() => deck.select(index)}
                  >
                    <span className="creator-card-surface">
                      {mediaActivated && (
                        <img src={card.src} alt={card.alt} decoding="async" />
                      )}
                      <span className="creator-card-caption">
                        <strong>{card.label}</strong>
                        <small>{card.meta}</small>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="creator-deck-readout" aria-live="polite">
              <span>SELECTED / {visibleCard.index}</span>
              <strong>{visibleCard.label}</strong>
              <small>{visibleCard.meta}</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
