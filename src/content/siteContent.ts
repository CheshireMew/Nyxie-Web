import { creatorMedia, galleryIds, getGalleryMedia, workMedia } from "./mediaCatalog";
import type { GalleryId } from "./mediaCatalog";

export const siteLinks = {
  github: "https://github.com/CheshireMew",
  blog: "https://blog.blacknico.com/",
  x: "https://x.com/0xCheshire",
  binanceInvite: "https://binance.com/join?ref=SRXT5KUM",
  okxInvite: "https://okx.com/join/A999998",
} as const;

export type CreatorProfile = {
  eyebrow: string;
  title: string;
  introduction: string;
  facts: ReadonlyArray<{
    label: string;
    value: string;
  }>;
  xProfile: {
    label: string;
    handle: string;
    href: string;
  };
};

export type CreatorCard = {
  id: string;
  index: string;
  label: string;
  meta: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const creatorProfile: CreatorProfile = {
  eyebrow: "CHESHIRE / CREATOR PROFILE",
  title: "你好，我是柴郡。",
  introduction: "夜希（Nyxie）将作为我的官方看板娘、IP 角色形象一直活跃。",
  facts: [
    { label: "身份", value: "内容创作者 / AI 非典型爱好者 / 无业宅民" },
    { label: "常驻空间", value: "X / Codex / 二次元 / 博客" },
  ],
  xProfile: {
    label: "X / FOLLOW",
    handle: "@0xCheshire",
    href: siteLinks.x,
  },
};

export const creatorCards: CreatorCard[] = [
  {
    id: "creator-sunny",
    index: "01",
    label: "SUNNY NYXIE",
    meta: "VISUAL ARCHIVE / 01",
    src: creatorMedia.sunny,
    alt: "夜希眨眼比出手势，上方写有日文太阳字样的明亮头像插画",
    width: 1254,
    height: 1254,
  },
  {
    id: "creator-winter",
    index: "02",
    label: "WINTER NYXIE",
    meta: "VISUAL ARCHIVE / 02",
    src: creatorMedia.winter,
    alt: "雪夜古镇中，夜希披红色斗篷手持白梅",
    width: 1448,
    height: 1086,
  },
  {
    id: "creator-chibi",
    index: "03",
    label: "CHIBI NYXIE",
    meta: "VISUAL ARCHIVE / 03",
    src: creatorMedia.chibi,
    alt: "夜希穿黑色斗篷裙、手指脸颊的 Q 版全身插画",
    width: 1254,
    height: 1254,
  },
  {
    id: "creator-moonlit",
    index: "04",
    label: "MOONLIT NYXIE",
    meta: "VISUAL ARCHIVE / 04",
    src: creatorMedia.moonlit,
    alt: "满月剧场中，夜希手持面具起舞的黑金礼服插画",
    width: 984,
    height: 940,
  },
];

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
    title: "春色满园",
    en: "SOFT BLOOM",
    description: "轻紫薄纱收起锋芒，让回眸和微风成为这一面的主要动作。",
    accent: "#a98ed3",
  },
  demon: {
    title: "紫焰魅魔",
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
    title: "星海翩跹",
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
    href: siteLinks.github,
  },
  {
    index: "02",
    label: "Blog",
    description: "文章、笔记与持续更新",
    href: siteLinks.blog,
  },
  {
    index: "03",
    label: "X / @0xCheshire",
    description: "关注我的最新动态与公开分享",
    href: siteLinks.x,
  },
  {
    index: "04",
    label: "Binance",
    description: "通过我的邀请链接注册币安",
    href: siteLinks.binanceInvite,
  },
  {
    index: "05",
    label: "OKX",
    description: "通过我的邀请链接注册 OKX",
    href: siteLinks.okxInvite,
  },
];
