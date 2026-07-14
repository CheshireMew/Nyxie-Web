import type { ClipKey } from "../content/mediaCatalog";
import { sections } from "../content/siteContent";
import type { SectionId } from "../content/siteContent";
import { MagneticButton } from "./MagneticButton";

type Props = {
  activeSection: SectionId;
  compact: boolean;
  soundOn: boolean;
  reducedMotion: boolean;
  onNavigate: (id: SectionId) => void;
  onOpenIndex: () => void;
  onToggleSound: () => void;
  onPlay: (key: ClipKey, after?: "talk") => void;
};

export function SiteHeader({
  activeSection,
  compact,
  soundOn,
  reducedMotion,
  onNavigate,
  onOpenIndex,
  onToggleSound,
  onPlay,
}: Props) {
  return (
    <header className={`site-header${compact ? " is-compact" : ""}`}>
      <button className="brand" type="button" onClick={() => onNavigate("home")} aria-label="返回首页">
        <span className="brand-sigil">N<span>×</span></span>
        <span className="brand-name">夜希 <small>NYXIE</small></span>
      </button>

      <nav className="main-nav" aria-label="主导航">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? "is-active" : ""}
            onClick={() => onNavigate(section.id)}
          >
            {section.en}
          </button>
        ))}
        <button type="button" onClick={onOpenIndex}>INDEX</button>
      </nav>

      <div className="header-actions">
        <button className="sound-toggle" type="button" aria-pressed={soundOn} onClick={onToggleSound}>
          <span className="sound-led" />
          <span>{soundOn ? "SOUND ON" : "SOUND OFF"}</span>
        </button>
        <MagneticButton
          className="talk-button"
          type="button"
          reducedMotion={reducedMotion}
          onClick={() => onPlay("tease", "talk")}
        >
          TALK TO NYXIE
        </MagneticButton>
        <button className="menu-button" type="button" onClick={onOpenIndex} aria-label="打开目录">
          <i /><i />
        </button>
      </div>
    </header>
  );
}
