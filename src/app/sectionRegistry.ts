import { characterMedia } from "../content/mediaCatalog";
import { featuredWorks } from "../content/siteContent";

export const sectionRegistry = [
  { id: "home", index: "00", en: "HOME", zh: "首页", hudLabel: null, hudInverted: false, showHudStatus: false, warmup: [] },
  { id: "gallery", index: "01", en: "GALLERY", zh: "百变形态", hudLabel: "GALLERY / FORM ARCHIVE", hudInverted: false, showHudStatus: false, warmup: [] },
  {
    id: "character",
    index: "02",
    en: "CHARACTER",
    zh: "角色设定",
    hudLabel: "CHARACTER / DESIGN LANGUAGE",
    hudInverted: false,
    showHudStatus: false,
    warmup: [],
  },
  {
    id: "personality",
    index: "03",
    en: "PERSONALITY",
    zh: "性格表现",
    hudLabel: "PERSONALITY / EYE CONTACT",
    hudInverted: true,
    showHudStatus: false,
    warmup: [characterMedia.personalityPoster, characterMedia.personalityCloseup],
  },
  { id: "links", index: "04", en: "LINKS", zh: "外部入口", hudLabel: "LINKS / NEXT STOP", hudInverted: false, showHudStatus: false, warmup: [characterMedia.linksCharacter] },
  {
    id: "works",
    index: "05",
    en: "WORKS",
    zh: "内容与项目",
    hudLabel: "CONTENT / PROJECTS",
    hudInverted: false,
    showHudStatus: true,
    warmup: [
      characterMedia.worksCharacter,
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
