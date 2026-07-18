import mediaManifest from "./mediaManifest.json";

export type ClipKey = keyof typeof mediaManifest.hero.clips;
export type GalleryId = keyof typeof mediaManifest.gallery;

export type ClipDefinition = {
  src: string;
  label: string;
  counter: string;
  playbackRate: number;
  switchLead: number;
  kind: "idle" | "action";
};

export const galleryVideoPlayback = {
  playbackRate: 1.5,
  muted: true,
} as const;

function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

export const backgroundMusic = {
  src: assetUrl(mediaManifest.backgroundMusic),
  mimeType: "audio/mp4",
  volume: 0.55,
} as const;

export const heroMedia = {
  anchor: assetUrl(mediaManifest.hero.anchor),
  clips: {
    idleMain: {
      src: assetUrl(mediaManifest.hero.clips.idleMain),
      label: "IDLE PERFORMANCE",
      counter: "IDLE / 01",
      playbackRate: 2,
      switchLead: 0.62,
      kind: "idle",
    },
    idleKey: {
      src: assetUrl(mediaManifest.hero.clips.idleKey),
      label: "GOLDEN KEY",
      counter: "IDLE / 02",
      playbackRate: 2,
      switchLead: 0.48,
      kind: "idle",
    },
    reactKey: {
      src: assetUrl(mediaManifest.hero.clips.reactKey),
      label: "KEY INCOMING",
      counter: "ACTION / 01",
      playbackRate: 2,
      switchLead: 0.5,
      kind: "action",
    },
    vanish: {
      src: assetUrl(mediaManifest.hero.clips.vanish),
      label: "CHESHIRE VANISH",
      counter: "ACTION / 02",
      playbackRate: 2,
      switchLead: 0.5,
      kind: "action",
    },
    portal: {
      src: assetUrl(mediaManifest.hero.clips.portal),
      label: "OPENING WRONG DOOR",
      counter: "ACTION / 03",
      playbackRate: 2,
      switchLead: 0.5,
      kind: "action",
    },
    tease: {
      src: assetUrl(mediaManifest.hero.clips.tease),
      label: "COME CLOSER",
      counter: "ACTION / 04",
      playbackRate: 2,
      switchLead: 0.5,
      kind: "action",
    },
  } satisfies Record<ClipKey, ClipDefinition>,
};

export const characterMedia = {
  personalityVideo: assetUrl(mediaManifest.character.personalityVideo),
  personalityPoster: assetUrl(mediaManifest.character.personalityPoster),
  personalityCloseup: assetUrl(mediaManifest.character.personalityCloseup),
  worksCharacter: assetUrl(mediaManifest.character.worksCharacter),
  linksCharacter: assetUrl(mediaManifest.character.linksCharacter),
};

export const workMedia = {
  nyxieDesktop: assetUrl(mediaManifest.works.nyxieDesktop),
  nyxieMobile: assetUrl(mediaManifest.works.nyxieMobile),
};

export const galleryIds = Object.keys(mediaManifest.gallery) as GalleryId[];

export function getGalleryMedia(id: GalleryId) {
  const media = mediaManifest.gallery[id];
  return { video: assetUrl(media.video), poster: assetUrl(media.poster) };
}
