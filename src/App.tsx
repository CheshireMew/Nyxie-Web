import { useCallback, useEffect, useReducer, useState } from "react";
import { initialSiteState, siteReducer } from "./app/siteTypes";
import type { ClipKey } from "./content/mediaCatalog";
import type { SectionId } from "./content/siteContent";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { usePageState } from "./hooks/usePageState";
import { usePerformanceDirector } from "./hooks/usePerformanceDirector";
import { AmbientCanvas } from "./components/AmbientCanvas";
import { CustomCursor } from "./components/CustomCursor";
import { BootScreen } from "./components/BootScreen";
import { SiteHeader } from "./components/SiteHeader";
import { DirectoryDialog } from "./components/DirectoryDialog";
import { TalkPanel } from "./components/TalkPanel";
import { HeroSection } from "./sections/HeroSection";
import { GallerySection } from "./sections/GallerySection";
import { CharacterSection } from "./sections/CharacterSection";
import { PersonalitySection } from "./sections/PersonalitySection";
import { WorksSection } from "./sections/WorksSection";
import { LinksSection } from "./sections/LinksSection";

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export default function App() {
  const [site, dispatch] = useReducer(siteReducer, initialSiteState);
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();
  usePageState(dispatch);

  const openTalk = useCallback(() => dispatch({ type: "open-talk" }), []);
  const rejectSound = useCallback(() => dispatch({ type: "set-sound", soundOn: false }), []);
  const director = usePerformanceDirector({
    soundOn: site.soundOn,
    reducedMotion,
    onTalk: openTalk,
    onSoundRejected: rejectSound,
  });
  const { request: requestHeroClip, start: startDirector, suppressNextWelcome } = director;

  useEffect(() => {
    let cancelled = false;
    void Promise.all([wait(reducedMotion ? 120 : 350), startDirector()]).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [reducedMotion, startDirector]);

  useEffect(() => {
    document.body.classList.toggle("is-booting", !ready);
    return () => document.body.classList.remove("is-booting");
  }, [ready]);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", site.indexOpen || site.talkOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [site.indexOpen, site.talkOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "close-overlays" });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = useCallback((id: SectionId) => {
    dispatch({ type: "close-overlays" });
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, [reducedMotion]);

  const playAtHero = useCallback((key: ClipKey, after?: "talk") => {
    dispatch({ type: "close-overlays" });
    const alreadyHome = window.scrollY <= 4;
    if (!alreadyHome) {
      suppressNextWelcome();
      document.getElementById("home")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
    window.setTimeout(() => {
      void requestHeroClip(key, after ? { after } : undefined);
    }, alreadyHome || reducedMotion ? 40 : 650);
  }, [reducedMotion, requestHeroClip, suppressNextWelcome]);

  const openTalkWithTease = useCallback(() => {
    openTalk();
    void requestHeroClip("tease");
  }, [openTalk, requestHeroClip]);

  return (
    <>
      <BootScreen ready={ready} />
      <AmbientCanvas reducedMotion={reducedMotion} />
      <div className="grain" aria-hidden="true" />
      <CustomCursor reducedMotion={reducedMotion} />

      <SiteHeader
        activeSection={site.activeSection}
        compact={site.headerCompact}
        soundOn={site.soundOn}
        reducedMotion={reducedMotion}
        onNavigate={navigate}
        onOpenIndex={() => dispatch({ type: "open-index" })}
        onOpenTalk={openTalkWithTease}
        onToggleSound={() => dispatch({ type: "toggle-sound" })}
      />

      <main>
        <HeroSection
          director={director}
          reducedMotion={reducedMotion}
          overlaysOpen={site.indexOpen || site.talkOpen}
          onNavigate={navigate}
        />
        <GallerySection reducedMotion={reducedMotion} />
        <CharacterSection reducedMotion={reducedMotion} />
        <PersonalitySection reducedMotion={reducedMotion} />
        <LinksSection reducedMotion={reducedMotion} />
        <WorksSection reducedMotion={reducedMotion} onBackHome={() => navigate("home")} />
      </main>

      <DirectoryDialog
        open={site.indexOpen}
        onClose={() => dispatch({ type: "close-index" })}
        onNavigate={navigate}
      />
      <TalkPanel
        open={site.talkOpen}
        onClose={() => dispatch({ type: "close-talk" })}
        onNavigate={navigate}
        onPlayAtHero={(key) => playAtHero(key)}
      />

      <noscript>这个页面需要 JavaScript 才能展示夜希的动画与互动。</noscript>
    </>
  );
}
