import type { PerformanceDirector } from "../features/hero/types";
import { CharacterSection } from "../sections/CharacterSection";
import { CreatorSection } from "../sections/CreatorSection";
import { GallerySection } from "../sections/GallerySection";
import { HeroSection } from "../sections/HeroSection";
import { LinksSection } from "../sections/LinksSection";
import { nextSectionAfter } from "./sectionRegistry";
import type { SectionDefinition, SectionId } from "./sectionRegistry";

type SectionRuntime = {
  director: PerformanceDirector;
  reducedMotion: boolean;
  overlaysOpen: boolean;
  activeSection: SectionId;
  galleryWarmupRequested: boolean;
  portalConsumed: boolean;
  onGalleryWarmup: () => void;
  onPortalConsumed: () => void;
  onNavigate: (id: SectionId) => void;
};

function assertNever(value: never): never {
  throw new Error(`Unknown section: ${String(value)}`);
}

export function renderSection(definition: SectionDefinition, runtime: SectionRuntime) {
  const sequentialWarmupRequested = nextSectionAfter(runtime.activeSection)?.id === definition.id;

  switch (definition.id) {
    case "home":
      return (
        <HeroSection
          definition={definition}
          director={runtime.director}
          reducedMotion={runtime.reducedMotion}
          overlaysOpen={runtime.overlaysOpen}
          portalConsumed={runtime.portalConsumed}
          onGalleryWarmup={runtime.onGalleryWarmup}
          onPortalConsumed={runtime.onPortalConsumed}
          onNavigate={runtime.onNavigate}
        />
      );
    case "gallery":
      return (
        <GallerySection
          definition={definition}
          reducedMotion={runtime.reducedMotion}
          active={runtime.activeSection === definition.id}
          warmupRequested={runtime.galleryWarmupRequested}
        />
      );
    case "character":
      return (
        <CharacterSection
          definition={definition}
          reducedMotion={runtime.reducedMotion}
          active={runtime.activeSection === definition.id}
          warmupRequested={sequentialWarmupRequested}
        />
      );
    case "creator":
      return (
        <CreatorSection
          definition={definition}
          reducedMotion={runtime.reducedMotion}
          active={runtime.activeSection === definition.id}
          warmupRequested={sequentialWarmupRequested}
        />
      );
    case "links":
      return (
        <LinksSection
          definition={definition}
          reducedMotion={runtime.reducedMotion}
          active={runtime.activeSection === definition.id}
          warmupRequested={sequentialWarmupRequested}
          onBackHome={() => runtime.onNavigate("home")}
        />
      );
    default:
      return assertNever(definition);
  }
}
