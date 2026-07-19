import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { heroMedia } from "../content/mediaCatalog";
import type { ClipKey } from "../content/mediaCatalog";
import { siteLinks } from "../content/siteContent";
import type { SectionId } from "../app/sectionRegistry";
import type { PerformanceDirector } from "../features/hero/types";
import { MagneticButton } from "../components/MagneticButton";
import type { SectionDefinitionFor } from "../app/sectionRegistry";

type Props = {
  definition: SectionDefinitionFor<"home">;
  director: PerformanceDirector;
  reducedMotion: boolean;
  overlaysOpen: boolean;
  portalConsumed: boolean;
  onPortalConsumed: () => void;
  onNavigate: (id: SectionId) => void;
};

const actions: Array<{ key: ClipKey; index: string; zh: string; en: string }> = [
  { key: "reactKey", index: "01", zh: "钥匙", en: "KEY" },
  { key: "vanish", index: "02", zh: "消失", en: "VANISH" },
  { key: "portal", index: "03", zh: "开门", en: "DOOR" },
  { key: "tease", index: "04", zh: "靠近", en: "TEASE" },
];

export function HeroSection({
  definition,
  director,
  reducedMotion,
  overlaysOpen,
  portalConsumed,
  onPortalConsumed,
  onNavigate,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const portalRequestPendingRef = useRef(false);
  const touchStartRef = useRef(0);
  const {
    playRandom,
    isInteractionLocked,
    request,
    retry,
    setHeroVisible,
    snapshot,
    waitUntilEnded,
  } = director;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.24 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [setHeroVisible]);

  const beginPortalScroll = useCallback(() => {
    if (
      portalConsumed ||
      portalRequestPendingRef.current ||
      isInteractionLocked() ||
      reducedMotion ||
      !snapshot.started ||
      window.scrollY > 4 ||
      overlaysOpen
    ) return false;

    portalRequestPendingRef.current = true;
    void (async () => {
      const started = await request("portal", { lockUntilEnd: true });
      if (!started) {
        portalRequestPendingRef.current = false;
        return;
      }
      onPortalConsumed();
      const completed = await waitUntilEnded("portal");
      portalRequestPendingRef.current = false;
      if (completed) onNavigate("gallery");
    })();
    return true;
  }, [isInteractionLocked, onNavigate, onPortalConsumed, overlaysOpen, portalConsumed, reducedMotion, request, snapshot.started, waitUntilEnded]);

  useEffect(() => {
    const scrollKeys = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);
    const onWheel = (event: WheelEvent) => {
      if (isInteractionLocked()) {
        event.preventDefault();
        return;
      }
      if (event.deltaY > 28 && beginPortalScroll()) event.preventDefault();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartRef.current = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (isInteractionLocked()) {
        event.preventDefault();
        return;
      }
      const current = event.touches[0]?.clientY ?? touchStartRef.current;
      if (touchStartRef.current - current > 46 && beginPortalScroll()) event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!scrollKeys.has(event.key)) return;
      if (isInteractionLocked()) {
        event.preventDefault();
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const isInteractive = target?.closest("a, button, input, textarea, select, [contenteditable='true']");
      const movesDown = event.key === "ArrowDown" || event.key === "PageDown" || event.key === "End" || event.key === " ";
      if (!isInteractive && movesDown && beginPortalScroll()) event.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [beginPortalScroll, isInteractionLocked]);

  const retryPlayback = useCallback(async () => {
    const started = await retry();
    if (!started || !isInteractionLocked()) return;
    onPortalConsumed();
    const completed = await waitUntilEnded("portal");
    if (completed) onNavigate("gallery");
  }, [isInteractionLocked, onNavigate, onPortalConsumed, retry, waitUntilEnded]);

  const onHeroClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (
      !target ||
      target.closest("a, button, input, .hero-copy, .hero-controls, .scroll-cue") ||
      overlaysOpen ||
      window.scrollY > 4
    ) return;
    void request("reactKey");
  };

  const blockClicksDuringPortal = (event: MouseEvent<HTMLElement>) => {
    if (!isInteractionLocked()) return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section
      ref={sectionRef}
      className="hero"
      id={definition.id}
      aria-label="夜希首页"
      onClickCapture={blockClicksDuringPortal}
      onClick={onHeroClick}
    >
      <div ref={director.stageRef} className="hero-media">
        <img className="hero-anchor" src={heroMedia.anchor} alt="夜希坐在云海之上的透明观测平台" />
        <video
          ref={director.videoARef}
          className="hero-video"
          playsInline
          muted
          preload="auto"
          poster={heroMedia.anchor}
        />
        <video
          ref={director.videoBRef}
          className="hero-video"
          playsInline
          muted
          preload="auto"
          aria-hidden="true"
        />
        <div className="hero-shade" aria-hidden="true" />
        <div className="glass-refraction" aria-hidden="true" />
      </div>

      <div className="hero-grid" aria-hidden="true" />
      <div className="vertical-mantra" aria-hidden="true">WE ARE ALL MAD HERE · FOLLOW THE WRONG KEY ·</div>

      <div className="hero-copy">
        <div className="eyebrow reveal-up"><span className="live-dot" /> CHESHIRE PROTOCOL / 00-25</div>
        <h1 className="hero-title reveal-up">
          <span className="title-cn">夜希</span>
          <span className="title-en">NYXIE</span>
        </h1>
        <p className="hero-role reveal-up">柴郡猫拟人化 · 个人原创 IP 角色形象</p>
        <p className="hero-intro reveal-up">在纷乱的世界里，<br />保持清醒。</p>
        <div className="hero-cta reveal-up">
          <a
            className="primary-button"
            href={siteLinks.blog}
            target="_blank"
            rel="noreferrer"
          >
            <span>跳进兔子洞</span><b>↗</b>
          </a>
          <button className="text-button" type="button" onClick={() => onNavigate("gallery")}>
            读取角色档案 <span>↓</span>
          </button>
        </div>
        <div className="system-status reveal-up">
          <span><i className="status-light red" /> RED EYES ONLINE</span>
          <span><i className="status-light gold" /> GOLDEN KEY FOUND</span>
          <span><i className="status-light blue" /> REALITY UNSTABLE</span>
        </div>
      </div>

      <div className="hero-controls" aria-label="角色互动控制">
        <div className="control-caption">
          <span aria-live="polite">{snapshot.status}</span>
          <small>{snapshot.counter}</small>
          {snapshot.error && (
            <button type="button" className="video-retry" onClick={() => { void retryPlayback(); }}>RETRY VIDEO</button>
          )}
        </div>
        <div className="clip-progress" aria-hidden="true"><span ref={director.progressRef} /></div>
        <div className="control-stack">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={snapshot.activeAction === action.key ? "is-active" : ""}
              aria-label={`播放夜希动作：${action.zh}`}
              disabled={snapshot.interactionLocked || snapshot.phase === "loading" || snapshot.phase === "error"}
              onClick={() => {
                if (action.key === "tease") void request(action.key, { after: "talk" });
                else void request(action.key);
              }}
            >
              <span className="control-action-index">{action.index}</span>
              <span className="control-action-label">{action.zh}<small>{action.en}</small></span>
            </button>
          ))}
        </div>
        <MagneticButton
          className="cheshire-orb"
          type="button"
          reducedMotion={reducedMotion}
          onClick={() => void playRandom()}
          disabled={snapshot.interactionLocked || snapshot.phase === "loading" || snapshot.phase === "error"}
          aria-label="随机播放夜希动画"
        >
          <span className="orb-eye" /><span className="orb-label">PLAY<br />MAD</span>
        </MagneticButton>
      </div>

      <button className="scroll-cue" type="button" onClick={() => {
        if (!beginPortalScroll()) onNavigate("gallery");
      }}>
        <span>SCROLL DOWN THE RABBIT HOLE</span><i />
      </button>

    </section>
  );
}
