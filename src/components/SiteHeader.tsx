import { sectionRegistry } from "../app/sectionRegistry";
import type { SectionId } from "../app/sectionRegistry";
import type { BackgroundMusicStatus } from "../hooks/useBackgroundMusic";
import { MagneticButton } from "./MagneticButton";

type Props = {
  activeSection: SectionId;
  bgmStatus: BackgroundMusicStatus;
  bgmError: string | null;
  interactionLocked: boolean;
  indexOpen: boolean;
  talkOpen: boolean;
  reducedMotion: boolean;
  onNavigate: (id: SectionId) => void;
  onOpenIndex: () => void;
  onOpenTalk: () => void;
  onToggleBgm: () => void;
};

export function SiteHeader({
  activeSection,
  bgmStatus,
  bgmError,
  interactionLocked,
  indexOpen,
  talkOpen,
  reducedMotion,
  onNavigate,
  onOpenIndex,
  onOpenTalk,
  onToggleBgm,
}: Props) {
  const bgmPlaying = bgmStatus === "playing";
  const bgmLabel = bgmStatus === "loading"
    ? "BGM LOADING"
    : bgmStatus === "error"
      ? "BGM RETRY"
      : bgmPlaying
        ? "BGM ON"
        : "BGM OFF";

  return (
    <header className="site-header">
      <button className="brand" type="button" onClick={() => onNavigate("home")} disabled={interactionLocked} aria-label="返回首页">
        <img className="brand-sigil" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" aria-hidden="true" draggable="false" />
        <span className="brand-name">夜希 <small>NYXIE</small></span>
      </button>

      <nav className="main-nav" aria-label="主导航">
        {sectionRegistry.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? "is-active" : ""}
            onClick={() => onNavigate(section.id)}
            disabled={interactionLocked}
            aria-current={activeSection === section.id ? "page" : undefined}
          >
            {section.en}
          </button>
        ))}
        <button type="button" onClick={onOpenIndex} disabled={interactionLocked} aria-haspopup="dialog" aria-controls="chapter-directory" aria-expanded={indexOpen}>INDEX</button>
      </nav>

      <div className="header-actions">
        <button
          className={`bgm-toggle is-${bgmStatus}`}
          type="button"
          aria-pressed={bgmPlaying}
          aria-label={bgmError ?? bgmLabel}
          onClick={onToggleBgm}
        >
          <span className="bgm-led" />
          <span aria-live="polite">{bgmLabel}</span>
        </button>
        <MagneticButton
          className="talk-button"
          type="button"
          reducedMotion={reducedMotion}
          onClick={onOpenTalk}
          disabled={interactionLocked}
          aria-haspopup="dialog"
          aria-controls="nyxie-talk-panel"
          aria-expanded={talkOpen}
        >
          TALK TO NYXIE
        </MagneticButton>
        <button className="menu-button" type="button" onClick={onOpenIndex} disabled={interactionLocked} aria-haspopup="dialog" aria-controls="chapter-directory" aria-expanded={indexOpen} aria-label="打开目录">
          <i /><i />
        </button>
      </div>
    </header>
  );
}
