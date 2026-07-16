import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { heroMedia } from "../content/mediaCatalog";
import type { ClipKey } from "../content/mediaCatalog";
import { siteLinks, type SectionId } from "../content/siteContent";
import type { PerformanceDirector } from "../hooks/usePerformanceDirector";
import { MagneticButton } from "../components/MagneticButton";

type Props = {
  director: PerformanceDirector;
  reducedMotion: boolean;
  overlaysOpen: boolean;
  onNavigate: (id: SectionId) => void;
};

const actions: Array<{ key: ClipKey; index: string; zh: string; en: string }> = [
  { key: "reactKey", index: "01", zh: "钥匙", en: "KEY" },
  { key: "vanish", index: "02", zh: "消失", en: "VANISH" },
  { key: "portal", index: "03", zh: "开门", en: "DOOR" },
  { key: "tease", index: "04", zh: "靠近", en: "TEASE" },
];

export function HeroSection({ director, reducedMotion, overlaysOpen, onNavigate }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const portalUsedRef = useRef(false);
  const portalLockedRef = useRef(false);
  const touchStartRef = useRef(0);
  const {
    playRandom,
    request,
    setHeroVisible,
    snapshot,
    waitUntilEnded,
    waitUntilReady,
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
      portalUsedRef.current ||
      portalLockedRef.current ||
      reducedMotion ||
      !snapshot.started ||
      window.scrollY > 4 ||
      overlaysOpen
    ) return false;

    portalUsedRef.current = true;
    portalLockedRef.current = true;
    void (async () => {
      try {
        await waitUntilReady();
        const started = await request("portal", { playbackRate: 1.25, holdAtEnd: true });
        if (started) await waitUntilEnded("portal");
        onNavigate("gallery");
      } finally {
        portalLockedRef.current = false;
      }
    })();
    return true;
  }, [onNavigate, overlaysOpen, reducedMotion, request, snapshot.started, waitUntilEnded, waitUntilReady]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (portalLockedRef.current) {
        event.preventDefault();
        return;
      }
      if (event.deltaY > 28 && beginPortalScroll()) event.preventDefault();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartRef.current = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (portalLockedRef.current) {
        event.preventDefault();
        return;
      }
      const current = event.touches[0]?.clientY ?? touchStartRef.current;
      if (touchStartRef.current - current > 46 && beginPortalScroll()) event.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [beginPortalScroll]);

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

  return (
    <section ref={sectionRef} className="hero" id="home" aria-label="夜希首页" onClick={onHeroClick}>
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
        <p className="hero-role reveal-up">梦境导航员 · 柴郡猫的不可靠继承者</p>
        <p className="hero-intro reveal-up">她不负责带你走出仙境。<br />她只负责让迷路变得值得。</p>
        <div className="hero-cta reveal-up">
          <a
            className="primary-button"
            href={siteLinks.blog}
            target="_blank"
            rel="noreferrer"
          >
            <span>跳进兔子洞</span><b>↗</b>
          </a>
          <button className="text-button" type="button" onClick={() => onNavigate("character")}>
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
          <span>{snapshot.status}</span>
          <small>{snapshot.counter}</small>
        </div>
        <div className="clip-progress" aria-hidden="true"><span ref={director.progressRef} /></div>
        <div className="control-stack">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={snapshot.activeAction === action.key ? "is-active" : ""}
              aria-label={`播放夜希动作：${action.zh}`}
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
