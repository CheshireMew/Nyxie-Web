import { characterMedia } from "../content/mediaCatalog";
import { ChapterHud } from "../components/ChapterHud";
import { useChapterPerformance } from "../hooks/useChapterPerformance";
import { useCharacterLens } from "../features/character/useCharacterLens";
import type { SectionDefinitionFor } from "../app/sectionRegistry";

export function CharacterSection({ definition, reducedMotion, active, warmupRequested }: { definition: SectionDefinitionFor<"character">; reducedMotion: boolean; active: boolean; warmupRequested: boolean }) {
  const { sectionRef, progressRef, mediaActivated } = useChapterPerformance({
    active,
    warmupRequested,
    reducedMotion,
    setup: ({ gsap, progressFill }) => {
      const entrance = gsap.timeline({ paused: true });
      entrance
        .fromTo(".character-film", { scale: 1.025, autoAlpha: 0.35 }, { scale: 1, autoAlpha: 1, duration: 1.25, ease: "power2.out" })
        .fromTo(".character-interface > *", { yPercent: 28, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: "power3.out" }, 0.12)
        .fromTo(".character-readout", { xPercent: 18, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 0.28)
        .fromTo(".character-lens-hint", { scale: 0.72, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.8, ease: "back.out(1.5)" }, 0.34)
        .fromTo(progressFill, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power2.out" }, 0);
      return { entrance };
    },
  });
  const lens = useCharacterLens({ active, mediaActivated, reducedMotion });

  return (
    <section ref={sectionRef} className="character-chapter chapter" id={definition.id} data-character-media={active ? "active" : warmupRequested ? "warming" : "idle"}>
      <div ref={lens.stageRef} className="character-stage" data-cursor="detail" {...lens.pointerHandlers}>
        <ChapterHud index={definition.index} label={definition.hudLabel} inverted={definition.hudInverted} showStatus={definition.showHudStatus} progressRef={progressRef} />

        <div className="character-media" role="img" aria-label="夜希的全身动态形象">
          {reducedMotion ? (
            <img ref={lens.baseImageRef} className="character-film" src={mediaActivated ? characterMedia.loopPoster : undefined} alt="" aria-hidden="true" />
          ) : (
            <video
              ref={lens.baseVideoRef}
              className="character-film"
              poster={mediaActivated ? characterMedia.loopPoster : undefined}
              preload={mediaActivated ? "auto" : "none"}
              autoPlay={active}
              loop
              muted
              playsInline
              aria-hidden="true"
            >
              <source src={characterMedia.loopVideoWebm} type="video/webm" />
              <source src={characterMedia.loopVideoMp4} type="video/mp4" />
            </video>
          )}
          <div className="character-film-wash" aria-hidden="true" />
          <div className="character-film-grid" aria-hidden="true" />
        </div>

        <span ref={lens.focusMarkerRef} className="character-focus-marker" aria-hidden="true" />

        <aside className="character-inspector" aria-label="人物细节查看台">
          <div className="character-inspector-lens">
            <div className="character-lens-hint" aria-hidden="true">
              <i />
              <span>MOVE TO INSPECT</span>
            </div>

            <div ref={lens.lensRef} className="character-lens" aria-hidden="true">
              <canvas ref={lens.lensCanvasRef} className="character-lens-canvas" />
              <span className="character-lens-crosshair" />
              <span className="character-lens-scale">1.75×</span>
            </div>
          </div>

          <div className="character-inspector-copy">
            <header className="character-interface">
              <small>CHARACTER / 02</small>
              <h2 id="character-title">NYXIE <span>夜希</span></h2>
              <p>
                <span className="character-instruction--pointer">移动鼠标，查看画面细节</span>
                <span className="character-instruction--touch">触摸画面，查看局部细节</span>
              </p>
            </header>

            <div className="character-readout" aria-label="画面查看状态">
              <span>FULL FIGURE</span>
              <span>DETAIL / 1.75×</span>
              <output ref={lens.coordinateRef}>X 000 / Y 000</output>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
