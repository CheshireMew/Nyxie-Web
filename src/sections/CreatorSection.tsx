import { creatorCards, creatorProfile } from "../content/siteContent";
import { ChapterHud } from "../components/ChapterHud";
import { arrangeCreatorCards } from "../features/creator/creatorCardRows";
import { useCreatorCardDeck } from "../features/creator/useCreatorCardDeck";
import { useChapterPerformance } from "../hooks/useChapterPerformance";
import type { SectionDefinitionFor } from "../app/sectionRegistry";
import type { CSSProperties } from "react";

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
        .fromTo(".creator-deck-readout", { x: 24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out" }, 0.12)
        .fromTo(".creator-card-surface", { y: 54, scale: 0.84, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.88, stagger: 0.09, ease: "power3.out" }, 0.18)
        .fromTo(progressFill, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power2.out" }, 0);
      return { entrance };
    },
  });
  const deck = useCreatorCardDeck({ cardCount: creatorCards.length, reducedMotion });
  const visibleCard = creatorCards[deck.visibleIndex] ?? creatorCards[0];
  const cardRows = arrangeCreatorCards(creatorCards.map((card, index) => ({ card, index })));

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
            <span className="creator-copy-wordmark" aria-hidden="true">CHESHIRE</span>
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
            <a
              className="creator-x-link"
              href={creatorProfile.xProfile.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`在 X 上关注 ${creatorProfile.xProfile.handle}，新窗口打开`}
            >
              <span>
                <small>{creatorProfile.xProfile.label}</small>
                <strong>{creatorProfile.xProfile.handle}</strong>
              </span>
              <b aria-hidden="true">↗</b>
            </a>
          </article>

          <div className="creator-deck-shell">
            <div className="creator-deck-readout" aria-live="polite">
              <span>SELECTED / {visibleCard.index}</span>
              <strong>{visibleCard.label}</strong>
              <small>{visibleCard.meta}</small>
            </div>

            <div
              ref={deck.deckRef}
              className="creator-card-deck"
              data-active-card={visibleCard.index}
              data-card-count={creatorCards.length}
              {...deck.pointerHandlers}
            >
              {cardRows.map((row, rowIndex) => (
                <div className="creator-card-row" data-creator-row={rowIndex + 1} key={`creator-row-${rowIndex + 1}`}>
                  {row.map(({ card, index }) => {
                    const current = deck.visibleIndex === index;
                    const locked = deck.lockedIndex === index;
                    return (
                      <button
                        key={card.id}
                        className={`creator-card${current ? " is-current" : ""}${locked ? " is-locked" : ""}`}
                        style={{ "--creator-card-aspect": card.width / card.height } as CSSProperties}
                        type="button"
                        data-creator-card={card.index}
                        data-creator-tilt={index % 4}
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
                            <img
                              src={card.src}
                              alt={card.alt}
                              width={card.width}
                              height={card.height}
                              decoding="async"
                            />
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
