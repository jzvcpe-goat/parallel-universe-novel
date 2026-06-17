from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "parallel-assets" / "covers"
SIZE = (1200, 720)


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def gradient(width: int, height: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", (width, height))
    px = img.load()
    for y in range(height):
        t = y / max(height - 1, 1)
        row = tuple(lerp(top[i], bottom[i], t) for i in range(3))
        for x in range(width):
            px[x, y] = row
    return img


def add_stars(img: Image.Image, seed: int, amount: int = 160) -> None:
    rng = random.Random(seed)
    draw = ImageDraw.Draw(img, "RGBA")
    width, height = img.size
    for _ in range(amount):
        x = rng.randrange(width)
        y = rng.randrange(int(height * 0.04), int(height * 0.62))
        r = rng.choice([1, 1, 1, 2])
        alpha = rng.randrange(55, 170)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(225, 241, 255, alpha))


def add_vignette(img: Image.Image) -> Image.Image:
    width, height = img.size
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    max_inset = min(width, height) // 2 - 12
    for i in range(0, max_inset, 6):
        alpha = int(255 * (i / max_inset) ** 1.8)
        draw.rounded_rectangle((i, i, width - i, height - i), radius=26, fill=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(42))
    dark = Image.new("RGB", (width, height), (2, 5, 12))
    return Image.composite(img, dark, mask)


def glow(draw: ImageDraw.ImageDraw, xy: tuple[int, int], radius: int, color: tuple[int, int, int, int]) -> None:
    x, y = xy
    for step in range(radius, 0, -8):
        alpha = int(color[3] * (step / radius) ** 2)
        draw.ellipse((x - step, y - step, x + step, y + step), fill=(*color[:3], alpha))


def cover_beacon() -> Image.Image:
    img = gradient(*SIZE, (6, 17, 31), (15, 38, 51))
    draw = ImageDraw.Draw(img, "RGBA")
    add_stars(img, 17, 180)
    for y in range(420, 720, 18):
        draw.line((0, y, 1200, y + 24), fill=(128, 177, 190, 22), width=2)
    glow(draw, (792, 186), 170, (237, 205, 130, 34))
    draw.polygon([(706, 600), (760, 232), (826, 232), (882, 600)], fill=(11, 20, 31, 230))
    draw.rectangle((746, 196, 840, 244), fill=(17, 30, 45, 245))
    draw.rectangle((768, 170, 818, 200), fill=(235, 202, 120, 235))
    draw.polygon([(728, 170), (858, 170), (834, 130), (752, 130)], fill=(7, 15, 25, 245))
    draw.polygon([(0, 608), (302, 560), (560, 598), (1200, 548), (1200, 720), (0, 720)], fill=(5, 11, 18, 238))
    return add_vignette(img)


def cover_bridge() -> Image.Image:
    img = gradient(*SIZE, (6, 12, 26), (19, 36, 46))
    draw = ImageDraw.Draw(img, "RGBA")
    add_stars(img, 28, 110)
    for x in range(40, 1200, 110):
      draw.line((x, 0, x - 120, 720), fill=(141, 190, 225, 38), width=2)
    draw.polygon([(0, 492), (1200, 392), (1200, 486), (0, 590)], fill=(7, 14, 22, 235))
    for x in range(84, 1120, 120):
        draw.line((x, 468, x + 58, 562), fill=(112, 160, 178, 90), width=6)
    glow(draw, (908, 246), 150, (95, 177, 216, 44))
    draw.arc((250, 284, 980, 880), 198, 342, fill=(155, 198, 216, 100), width=6)
    draw.ellipse((248, 618, 962, 720), fill=(80, 124, 143, 38))
    return add_vignette(img)


def cover_jade() -> Image.Image:
    img = gradient(*SIZE, (6, 24, 30), (13, 43, 42))
    draw = ImageDraw.Draw(img, "RGBA")
    add_stars(img, 43, 130)
    glow(draw, (416, 290), 190, (87, 204, 180, 44))
    draw.polygon([(178, 610), (302, 302), (432, 610)], fill=(8, 21, 24, 230))
    draw.polygon([(300, 610), (462, 208), (622, 610)], fill=(10, 29, 30, 230))
    draw.polygon([(606, 610), (738, 338), (880, 610)], fill=(7, 19, 21, 222))
    for x in [268, 434, 560, 748]:
        draw.rectangle((x, 406, x + 30, 610), fill=(91, 211, 175, 30))
    draw.line((80, 620, 1120, 564), fill=(221, 192, 118, 72), width=5)
    draw.line((102, 648, 1136, 600), fill=(83, 210, 177, 48), width=3)
    return add_vignette(img)


def cover_lotus() -> Image.Image:
    img = gradient(*SIZE, (18, 12, 30), (38, 29, 46))
    draw = ImageDraw.Draw(img, "RGBA")
    add_stars(img, 71, 150)
    glow(draw, (872, 238), 220, (213, 119, 168, 42))
    for i in range(9):
        x = 110 + i * 124
        h = 260 + (i % 3) * 56
        draw.rectangle((x, 720 - h, x + 70, 720), fill=(10, 17, 25, 220))
        draw.rectangle((x + 16, 720 - h + 34, x + 32, 720 - h + 82), fill=(237, 192, 120, 42))
    for i in range(34):
        angle = i * 0.62
        x = 820 + math.cos(angle) * (80 + i * 5)
        y = 330 + math.sin(angle) * (28 + i * 2)
        draw.ellipse((x - 8, y - 5, x + 8, y + 5), fill=(225, 145, 178, 105))
    draw.polygon([(0, 630), (360, 572), (670, 625), (1200, 586), (1200, 720), (0, 720)], fill=(6, 12, 18, 232))
    return add_vignette(img)


COVERS = {
    "beacon-beyond.jpg": cover_beacon,
    "rain-bridge.jpg": cover_bridge,
    "jade-contract.jpg": cover_jade,
    "lotus-lane.jpg": cover_lotus,
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, factory in COVERS.items():
        image = factory()
        image.save(OUT / name, quality=92, optimize=True)
        print(OUT / name)


if __name__ == "__main__":
    main()
