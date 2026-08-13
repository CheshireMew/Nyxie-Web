import { ChapterHud } from "../components/ChapterHud";
import { gazeMedia } from "../content/mediaCatalog";
import { useGazeScrubber } from "../features/gaze/useGazeScrubber";
import { useChapterPerformance } from "../hooks/useChapterPerformance";
import type { SectionDefinitionFor } from "../app/sectionRegistry";

type Props = {
  definition: SectionDefinitionFor<"gaze">;
  reducedMotion: boolean;
  active: boolean;
  warmupRequested: boolean;
};

export function GazeSection({ definition, reducedMotion, active, warmupRequested }: Props) {
  const { sectionRef, progressRef, mediaActivated } = useChapterPerformance({
    active,
    warmupRequested,
    reducedMotion,
    setup: ({ gsap, progressFill }) => {
      const entrance = gsap.timeline({ paused: true });
      entrance
        .fromTo(".gaze-character", { scale: 1.035, autoAlpha: 0.3 }, { scale: 1, autoAlpha: 1, duration: 1.1, ease: "power2.out" })
        .fromTo(".gaze-copy > *", { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.68, stagger: 0.08, ease: "power3.out" }, 0.12)
        .fromTo(".gaze-readout", { x: 22, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.65, ease: "power3.out" }, 0.24)
        .fromTo(".gaze-hint", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.58, ease: "power3.out" }, 0.34)
        .fromTo(progressFill, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power2.out" }, 0);
      return { entrance };
    },
  });
  const gaze = useGazeScrubber({ active, mediaActivated, reducedMotion });
  const videoReady = gaze.mediaState === "ready";

  return (
    <section
      ref={sectionRef}
      className="gaze-chapter chapter"
      id={definition.id}
      data-gaze-media={active ? "active" : warmupRequested ? "warming" : "idle"}
    >
      <div
        ref={gaze.stageRef}
        className="gaze-stage"
        data-cursor="detail"
        data-gaze-direction="FRONT"
        tabIndex={0}
        aria-label="互动凝视：左右移动鼠标或使用左右方向键，让夜希转向你；Home 键回到正面"
        {...gaze.interactionHandlers}
      >
        <ChapterHud index={definition.index} label={definition.hudLabel} inverted={definition.hudInverted} showStatus={definition.showHudStatus} progressRef={progressRef} />

        <div className={`gaze-media${videoReady ? " has-video" : ""}`} aria-hidden="true">
          {mediaActivated && (
            <img className="gaze-character gaze-poster" src={gazeMedia.poster} alt="" draggable="false" />
          )}
          {!reducedMotion && (
            <video
              ref={gaze.videoRef}
              className={`gaze-character gaze-video${videoReady ? " is-ready" : ""}`}
              poster={mediaActivated ? gazeMedia.poster : undefined}
              preload={mediaActivated ? "auto" : "none"}
              muted
              playsInline
              aria-hidden="true"
              {...gaze.mediaHandlers}
            >
              {mediaActivated && <source src={gazeMedia.video} type="video/webm" />}
            </video>
          )}
          <div className="gaze-film-wash" />
          <div className="gaze-grid-field" />
        </div>

        <header className="gaze-copy" aria-labelledby="gaze-title">
          <small>INTERACTIVE PORTRAIT / 03</small>
          <h2 id="gaze-title">EYES<br />ON YOU</h2>
          <p>别移开视线。她会找到你。</p>
        </header>

        <aside className="gaze-readout" aria-label="视线追踪状态">
          <span><i aria-hidden="true" /> GAZE TRACKING</span>
          <output ref={gaze.directionRef}>LOOK / FRONT</output>
          <small>{gaze.mediaState === "error" ? "STILL FRAME" : videoReady ? "POINTER LINKED" : "CALIBRATING"}</small>
        </aside>

        <div className="gaze-hint" aria-hidden="true">
          <i><span /></i>
          <span className="gaze-hint--pointer">移动鼠标，让夜希看向你</span>
          <span className="gaze-hint--touch">触摸画面，改变夜希的视线</span>
        </div>
      </div>
    </section>
  );
}
