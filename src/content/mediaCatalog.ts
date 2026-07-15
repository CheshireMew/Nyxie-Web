export type ClipKey = "idleMain" | "idleKey" | "reactKey" | "vanish" | "portal" | "tease";

export type ClipDefinition = {
  src: string;
  label: string;
  counter: string;
  switchLead: number;
  kind: "idle" | "action";
};

export const heroMedia = {
  anchor: "/assets/media/anchor-b.webp",
  clips: {
    idleMain: {
      src: "/assets/media/idle-main.mp4",
      label: "IDLE PERFORMANCE",
      counter: "IDLE / 01",
      switchLead: 0.62,
      kind: "idle",
    },
    idleKey: {
      src: "/assets/media/idle-key.mp4",
      label: "GOLDEN KEY",
      counter: "IDLE / 02",
      switchLead: 0.48,
      kind: "idle",
    },
    reactKey: {
      src: "/assets/media/react-key.mp4",
      label: "KEY INCOMING",
      counter: "ACTION / 01",
      switchLead: 0.5,
      kind: "action",
    },
    vanish: {
      src: "/assets/media/vanish.mp4",
      label: "CHESHIRE VANISH",
      counter: "ACTION / 02",
      switchLead: 0.5,
      kind: "action",
    },
    portal: {
      src: "/assets/media/portal.mp4",
      label: "OPENING WRONG DOOR",
      counter: "ACTION / 03",
      switchLead: 0.5,
      kind: "action",
    },
    tease: {
      src: "/assets/media/tease.mp4",
      label: "COME CLOSER",
      counter: "ACTION / 04",
      switchLead: 0.5,
      kind: "action",
    },
  } satisfies Record<ClipKey, ClipDefinition>,
};

export const characterMedia = {
  full: "/assets/character/character-full.webp",
  face: "/assets/character/detail-face.webp",
  costume: "/assets/character/detail-costume.webp",
  back: "/assets/character/detail-back.webp",
  legs: "/assets/character/detail-legs.webp",
  personalityStart: "/assets/character/personality-start.webp",
  personalityVideo: "/assets/media/personality.webm",
  personalityPoster: "/assets/character/personality-poster.webp",
  personalityCloseup: "/assets/character/personality-closeup.webp",
  personalityDynamic: "/assets/character/personality-dynamic.webp",
  worksCharacter: "/assets/character/works-character.webp",
  linksCharacter: "/assets/character/links-character.webp",
  linksFrame: "/assets/character/links-frame.webp",
};

export const workMedia = {
  nyxieDesktop: "/assets/works/nyxie-desktop.png",
  nyxieMobile: "/assets/works/nyxie-mobile.png",
};

export const galleryMedia = {
  goth: { video: "/assets/gallery/goth.webm", poster: "/assets/gallery/goth-poster.webp" },
  garden: { video: "/assets/gallery/garden.webm", poster: "/assets/gallery/garden-poster.webp" },
  demon: { video: "/assets/gallery/demon.webm", poster: "/assets/gallery/demon-poster.webp" },
  winter: { video: "/assets/gallery/winter.webm", poster: "/assets/gallery/winter-poster.webp" },
  astrologer: { video: "/assets/gallery/astrologer.webm", poster: "/assets/gallery/astrologer-poster.webp" },
  starsea: { video: "/assets/gallery/starsea.webm", poster: "/assets/gallery/starsea-poster.webp" },
  forbidden: { video: "/assets/gallery/forbidden.webm", poster: "/assets/gallery/forbidden-poster.webp" },
  moonlit: { video: "/assets/gallery/moonlit.webm", poster: "/assets/gallery/moonlit-poster.webp" },
} as const;
