from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "绿幕图"
OUTPUT = ROOT / "public" / "assets" / "character"


@dataclass(frozen=True)
class Asset:
    source: str
    output: str
    crop: tuple[int, int, int, int] | None = None
    padding: int = 18


ASSETS = (
    Asset("02｜角色设定素材母图.png", "character-full.webp", (120, 0, 610, 941)),
    Asset("02｜角色设定素材母图.png", "detail-face.webp", (680, 0, 1220, 465)),
    Asset("02｜角色设定素材母图.png", "detail-costume.webp", (1190, 0, 1672, 455)),
    Asset("02｜角色设定素材母图.png", "detail-back.webp", (680, 435, 1225, 925)),
    Asset("02｜角色设定素材母图.png", "detail-legs.webp", (1200, 435, 1645, 941)),
    Asset("03｜性格视频首帧.png", "personality-start.webp", (700, 0, 1220, 941)),
    Asset("04｜内容与项目素材母图.png", "works-character.webp", (35, 0, 625, 941)),
    Asset("04｜内容与项目素材母图.png", "works-moon-chain.webp", (615, 575, 790, 875)),
    Asset("04｜内容与项目素材母图.png", "works-gem.webp", (980, 600, 1320, 880)),
    Asset("05｜最终入口素材母图.png", "links-character.webp", (190, 0, 660, 941)),
    Asset("05｜最终入口素材母图.png", "links-frame.webp", (740, 45, 1485, 335)),
    Asset("05｜最终入口素材母图.png", "links-star-chain.webp", (20, 560, 220, 900)),
    Asset("ChatGPT Image 2026年7月14日 14_50_16.png", "personality-closeup.webp"),
    Asset("ChatGPT Image 2026年7月14日 14_50_29.png", "personality-dynamic.webp"),
)


def remove_green(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    rgb = rgba[:, :, :3].astype(np.int16)
    original_alpha = rgba[:, :, 3].astype(np.float32) / 255.0

    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]
    dominance = green - np.maximum(red, blue)

    matte = np.ones_like(green, dtype=np.float32)
    transparent = (dominance >= 130) & (green >= 150)
    opaque = (dominance <= 34) | (green < 105)
    transition = ~(transparent | opaque)

    matte[transparent] = 0.0
    matte[transition] = (130.0 - dominance[transition]) / 96.0
    matte = np.clip(matte, 0.0, 1.0) * original_alpha

    spill = (green > np.maximum(red, blue) + 5) & (matte > 0)
    neutral_green = np.maximum(red, blue) + 5
    rgb[:, :, 1][spill] = np.minimum(green[spill], neutral_green[spill])

    rgba[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = np.round(matte * 255).astype(np.uint8)
    return Image.fromarray(rgba, mode="RGBA")


def trim(image: Image.Image, padding: int) -> Image.Image:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > 6)
    if not len(xs):
        return image

    left = max(0, int(xs.min()) - padding)
    top = max(0, int(ys.min()) - padding)
    right = min(image.width, int(xs.max()) + padding + 1)
    bottom = min(image.height, int(ys.max()) + padding + 1)
    return image.crop((left, top, right, bottom))


def prepare(asset: Asset) -> None:
    source_path = SOURCE / asset.source
    image = Image.open(source_path)
    if asset.crop:
        image = image.crop(asset.crop)
    image = trim(remove_green(image), asset.padding)

    output_path = OUTPUT / asset.output
    image.save(output_path, "WEBP", lossless=True, method=6, exact=True)
    print(f"{asset.output}: {image.width}x{image.height}")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        prepare(asset)


if __name__ == "__main__":
    main()
