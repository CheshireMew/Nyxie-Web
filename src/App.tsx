import { Fragment, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { initialSiteState, siteReducer } from "./app/siteTypes";
import type { ClipKey } from "./content/mediaCatalog";
import { sectionRegistry } from "./app/sectionRegistry";
import type { SectionId } from "./app/sectionRegistry";
import { renderSection } from "./app/renderSection";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { usePageState } from "./hooks/usePageState";
import { useChapterWarmup } from "./hooks/useChapterWarmup";
import { usePerformanceDirector } from "./hooks/usePerformanceDirector";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic";
import { navigateToChapter, sectionIdFromHash } from "./navigation/chapterNavigation";
import { AmbientCanvas } from "./components/AmbientCanvas";
import { CustomCursor } from "./components/CustomCursor";
import { BootScreen } from "./components/BootScreen";
import { SiteHeader } from "./components/SiteHeader";
import { DirectoryDialog } from "./components/DirectoryDialog";
import { TalkPanel } from "./components/TalkPanel";

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export default function App() {
  const [site, dispatch] = useReducer(siteReducer, initialSiteState);
  const [ready, setReady] = useState(false);
  const [portalConsumed, setPortalConsumed] = useState(false);
  const heroActionOperationRef = useRef(0);
  const reducedMotion = useReducedMotion();
  useChapterWarmup(site.activeSection, ready);
  const backgroundMusic = useBackgroundMusic();

  const openTalk = useCallback(() => dispatch({ type: "open-talk" }), []);
  const consumePortal = useCallback(() => setPortalConsumed(true), []);
  const director = usePerformanceDirector({
    reducedMotion,
    onTalk: openTalk,
  });
  const {
    isInteractionLocked,
    request: requestHeroClip,
    start: startDirector,
    suppressNextWelcome,
  } = director;

  useEffect(() => {
    let cancelled = false;
    void startDirector();
    void wait(reducedMotion ? 120 : 350).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [reducedMotion, startDirector]);

  useEffect(() => {
    if (!ready) return;
    const navigateFromHistory = () => {
      const section = sectionIdFromHash();
      if (section) void navigateToChapter(section, "auto", "none");
    };
    window.addEventListener("popstate", navigateFromHistory);
    return () => window.removeEventListener("popstate", navigateFromHistory);
  }, [ready]);

  usePageState(dispatch, ready);

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

  const navigate = useCallback(async (id: SectionId) => {
    if (isInteractionLocked()) return false;
    heroActionOperationRef.current += 1;
    dispatch({ type: "close-overlays" });
    return navigateToChapter(id, reducedMotion ? "auto" : "smooth");
  }, [isInteractionLocked, reducedMotion]);

  const playAtHero = useCallback(async (key: ClipKey, after?: "talk") => {
    if (isInteractionLocked()) return false;
    const operation = heroActionOperationRef.current + 1;
    heroActionOperationRef.current = operation;
    dispatch({ type: "close-overlays" });
    const alreadyHome = window.scrollY <= 4;
    if (!alreadyHome) {
      suppressNextWelcome();
      const navigated = await navigateToChapter("home", reducedMotion ? "auto" : "smooth");
      if (!navigated || heroActionOperationRef.current !== operation) return false;
    }
    if (isInteractionLocked()) return false;
    return requestHeroClip(key, after ? { after } : undefined);
  }, [isInteractionLocked, reducedMotion, requestHeroClip, suppressNextWelcome]);

  const openTalkWithTease = useCallback(() => {
    if (isInteractionLocked()) return;
    openTalk();
    void requestHeroClip("tease");
  }, [isInteractionLocked, openTalk, requestHeroClip]);

  const openIndex = useCallback(() => {
    if (!isInteractionLocked()) dispatch({ type: "open-index" });
  }, [isInteractionLocked]);

  return (
    <>
      <BootScreen ready={ready} />
      <audio
        ref={backgroundMusic.audioRef}
        className="background-music"
        loop
        preload="none"
        aria-hidden="true"
      />
      <AmbientCanvas reducedMotion={reducedMotion} />
      <div className="grain" aria-hidden="true" />
      <CustomCursor reducedMotion={reducedMotion} />

      <SiteHeader
        activeSection={site.activeSection}
        bgmStatus={backgroundMusic.status}
        bgmError={backgroundMusic.error}
        interactionLocked={director.snapshot.interactionLocked}
        indexOpen={site.indexOpen}
        talkOpen={site.talkOpen}
        reducedMotion={reducedMotion}
        onNavigate={navigate}
        onOpenIndex={openIndex}
        onOpenTalk={openTalkWithTease}
        onToggleBgm={() => { void backgroundMusic.toggle(); }}
      />

      <main>
        {sectionRegistry.map((section) => (
          <Fragment key={section.id}>
            {renderSection(section, {
              director,
              reducedMotion,
              overlaysOpen: site.indexOpen || site.talkOpen,
              activeSection: site.activeSection,
              mediaWarmupEnabled: ready,
              portalConsumed,
              onPortalConsumed: consumePortal,
              onNavigate: (id) => { void navigate(id); },
            })}
          </Fragment>
        ))}
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
        onPlayAtHero={(key) => { void playAtHero(key); }}
      />
    </>
  );
}
