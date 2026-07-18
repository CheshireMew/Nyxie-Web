import { galleryIds, getGalleryMedia, workMedia } from "./mediaCatalog";
import type { GalleryId } from "./mediaCatalog";

export const siteLinks = {
  blog: "https://blog.blacknico.com/",
} as const;

export type GalleryItem = {
  id: GalleryId;
  index: string;
  title: string;
  en: string;
  description: string;
  video: string;
  poster: string;
  accent: string;
};

const galleryCopy = {
  goth: {
    title: "黑猫哥特",
    en: "DEFAULT SIGNAL",
    description: "红瞳、猫耳和不对称长袜构成夜希最清晰的默认识别。",
    accent: "#c91f3c",
  },
  garden: {
    title: "花庭形态",
    en: "SOFT BLOOM",
    description: "轻紫薄纱收起锋芒，让回眸和微风成为这一面的主要动作。",
    accent: "#a98ed3",
  },
  demon: {
    title: "恶魔形态",
    en: "NIGHTFIRE",
    description: "弯角、蝠翼、尾巴与紫焰，把危险感集中在完整轮廓里。",
    accent: "#8f5ce7",
  },
  winter: {
    title: "雪夜梅枝",
    en: "WINTER BLOOM",
    description: "红色披风与白梅形成冬日反差，安静里仍保留红瞳的锋利。",
    accent: "#d83d48",
  },
  astrologer: {
    title: "星象魔女",
    en: "CELESTIAL WITCH",
    description: "宽檐帽和星月垂饰组成轻盈、聪明又带恶作剧意味的形态。",
    accent: "#c49a4b",
  },
  starsea: {
    title: "星海形态",
    en: "STELLAR TIDE",
    description: "淡紫薄纱与水光降低重量，让夜希像从星海边缘回身。",
    accent: "#7897d8",
  },
  forbidden: {
    title: "禁术魔女",
    en: "FORBIDDEN EYE",
    description: "月牙法杖与眼瞳火焰同时出现，组成最接近禁术仪式的一面。",
    accent: "#a04ee5",
  },
  moonlit: {
    title: "东方月夜",
    en: "LUNAR SILK",
    description: "深蓝长袖、金色月纹与流苏把动作延伸成一段克制的袖舞。",
    accent: "#557cbb",
  },
} satisfies Record<GalleryId, Pick<GalleryItem, "title" | "en" | "description" | "accent">>;

export const galleryItems: GalleryItem[] = galleryIds.map((id, index) => ({
  id,
  index: String(index + 1).padStart(2, "0"),
  ...galleryCopy[id],
  ...getGalleryMedia(id),
}));

export type FeaturedWork = {
  index: string;
  title: string;
  description: string;
  meta: string;
  desktopImage: string;
  desktopImageAlt: string;
  mobileImage: string;
  mobileImageAlt: string;
  tags: string[];
  highlights: string[];
};

export const featuredWorks: FeaturedWork[] = [
  {
    index: "01",
    title: "Nyxie Web",
    description: "夜希的互动式角色展示网站，也是这次视觉、动画与前端结构重做的完整项目。",
    meta: "GITHUB / FEATURED REPOSITORY",
    desktopImage: workMedia.nyxieDesktop,
    desktopImageAlt: "Nyxie Web 桌面端首页真实界面",
    mobileImage: workMedia.nyxieMobile,
    mobileImageAlt: "Nyxie Web 移动端首页真实界面",
    tags: ["React", "GSAP", "Media Director", "Responsive"],
    highlights: ["双视频预加载", "角色动作导演", "滚动章节", "移动端重排"],
  },
];

export const externalLinks = [
  {
    index: "01",
    label: "GitHub",
    description: "代码、项目与持续更新",
    href: "https://github.com/CheshireMew",
  },
  {
    index: "02",
    label: "Blog",
    description: "文章、笔记与持续更新",
    href: siteLinks.blog,
  },
];
