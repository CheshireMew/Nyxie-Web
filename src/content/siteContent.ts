import { characterMedia } from "./mediaCatalog";

export type SectionId = "home" | "character" | "personality" | "works" | "links";

export const sections: Array<{ id: SectionId; index: string; en: string; zh: string }> = [
  { id: "home", index: "00", en: "HOME", zh: "首页" },
  { id: "character", index: "01", en: "CHARACTER", zh: "角色设定" },
  { id: "personality", index: "02", en: "PERSONALITY", zh: "性格表现" },
  { id: "works", index: "03", en: "WORKS", zh: "内容与项目" },
  { id: "links", index: "04", en: "LINKS", zh: "外部入口" },
];

export const characterDetails = [
  {
    id: "face",
    index: "01",
    eyebrow: "FACE / IDENTITY",
    title: "红瞳、猫耳与小虎牙",
    body: "红色猫眼是第一视觉中心。黑色猫耳、耳内白色绒毛和冷蓝发梢共同构成夜希最清晰的头部轮廓。",
    image: characterMedia.face,
    imageAlt: "夜希的脸部、猫耳与月牙星链发饰细节",
  },
  {
    id: "costume",
    index: "02",
    eyebrow: "COSTUME / MATERIAL",
    title: "短斗篷与红色猫眼胸饰",
    body: "石墨黑布料、白色荷叶边、十字饰边和金属结构保持清楚层次，胸饰只是服装细节，不抢夺脸部焦点。",
    image: characterMedia.costume,
    imageAlt: "夜希的斗篷、胸饰与荷叶边细节",
  },
  {
    id: "back",
    index: "03",
    eyebrow: "BACK / SIGNATURE",
    title: "藏在背后的猫笑",
    body: "斗篷背面的猫笑图案和月牙挂饰，让角色转身时仍然拥有明确、可识别的视觉信息。",
    image: characterMedia.back,
    imageAlt: "夜希斗篷背面的猫笑图案与月牙挂饰",
  },
  {
    id: "legs",
    index: "04",
    eyebrow: "ASYMMETRY / RHYTHM",
    title: "不对称长袜与厚底鞋",
    body: "纯黑与黑白条纹形成强烈节奏，蓝色宝石和香槟金链条在黑色鞋面上提供少量明亮焦点。",
    image: characterMedia.legs,
    imageAlt: "夜希的不对称长袜与厚底鞋细节",
  },
];

export type WorkItem = {
  kind: "article" | "repository" | "profile";
  index: string;
  title: string;
  description: string;
  meta: string;
  href?: string;
  cta: string;
};

export const works: WorkItem[] = [
  {
    kind: "repository",
    index: "01",
    title: "Nyxie Web",
    description: "夜希的互动式角色展示网站，也是这次视觉、动画与前端结构重做的完整项目。",
    meta: "GITHUB / FEATURED REPOSITORY",
    href: "https://github.com/CheshireMew/Nyxie-Web",
    cta: "查看仓库",
  },
  {
    kind: "profile",
    index: "02",
    title: "CheshireMew",
    description: "更多代码、实验项目与正在进行的创作会持续整理在 GitHub 主页。",
    meta: "GITHUB / CREATOR PROFILE",
    href: "https://github.com/CheshireMew",
    cta: "进入主页",
  },
  {
    kind: "article",
    index: "03",
    title: "Blog Archive",
    description: "文章入口已经为真实内容预留。提供博客地址后，只需要更新内容数据，不需要修改页面组件。",
    meta: "BLOG / WAITING FOR URL",
    cta: "待接入",
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
    label: "Nyxie Web Repo",
    description: "查看这个网站的项目仓库",
    href: "https://github.com/CheshireMew/Nyxie-Web",
  },
  {
    index: "03",
    label: "Blog",
    description: "博客地址待接入",
  },
];
