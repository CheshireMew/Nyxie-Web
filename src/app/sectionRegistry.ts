import { characterMedia } from "../content/mediaCatalog";
import { creatorCards, featuredWorks } from "../content/siteContent";

export const sectionRegistry = [
  { id: "home", index: "00", en: "HOME", zh: "首页", hudLabel: null, hudInverted: false, showHudStatus: false, warmup: [] },
  { id: "gallery", index: "01", en: "GALLERY", zh: "百变形态", hudLabel: "GALLERY / FORM ARCHIVE", hudInverted: false, showHudStatus: false, warmup: [] },
  {
    id: "character",
    index: "02",
    en: "CHARACTER",
    zh: "角色设定",
    hudLabel: "CHARACTER / FULL FIGURE",
    hudInverted: false,
    showHudStatus: false,
    warmup: [characterMedia.loopPoster],
  },
  {
    id: "creator",
    index: "03",
    en: "CREATOR",
    zh: "关于我",
    hudLabel: "CREATOR / ABOUT ME",
    hudInverted: false,
    showHudStatus: false,
    warmup: creatorCards.map((card) => card.src),
  },
  {
    id: "links",
    index: "04",
    en: "LINKS",
    zh: "内容与入口",
    hudLabel: "CONTENT / LINKS",
    hudInverted: false,
    showHudStatus: true,
    warmup: [
      characterMedia.linksCharacter,
      ...featuredWorks.flatMap((work) => [work.desktopImage, work.mobileImage]),
    ],
  },
] as const;

export type SectionId = (typeof sectionRegistry)[number]["id"];
export type SectionDefinition = (typeof sectionRegistry)[number];
export type SectionDefinitionFor<Id extends SectionId> = Extract<SectionDefinition, { id: Id }>;

const sectionIds = new Set<string>(sectionRegistry.map((section) => section.id));

export function isSectionId(value: string): value is SectionId {
  return sectionIds.has(value);
}

export function nextSectionAfter(id: SectionId) {
  const index = sectionRegistry.findIndex((section) => section.id === id);
  return sectionRegistry[index + 1] ?? null;
}
