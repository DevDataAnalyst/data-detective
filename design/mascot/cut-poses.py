"""Cuts Professor Ponku's poses out of the character sheet with transparent backgrounds.

Usage: python design/mascot/cut-poses.py [path/to/sheet.webp]

Full-size PNGs go to design/mascot/ (for banners and social posts); smaller WebPs for the app go
to src/assets/mascot/. Needs Pillow and numpy.
"""
import shutil
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent.parent
SHEET = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'professor-ponku-sheet.webp'
DESIGN = HERE
APP = PROJECT / 'src' / 'assets' / 'mascot'

# name: (left, right, top, bottom) on the 1672 x 941 sheet, from the column and row scan.
POSES = {
    'waving': (72, 427, 35, 456),
    'side': (472, 724, 35, 456),
    'back': (807, 1110, 35, 456),
    'celebrating': (1143, 1571, 35, 456),
    'thinking': (38, 300, 469, 795),
    'thumbs-up': (343, 637, 469, 795),
    'notes': (683, 909, 469, 795),
    'report': (955, 1279, 469, 795),
    'sleeping': (1340, 1622, 469, 795),
}
ICONS = {
    'icon-report': (901, 995, 810, 917),
    'icon-clipboard': (1024, 1113, 810, 917),
    'icon-sparkles': (1142, 1299, 810, 917),
}
# Poses the app uses, and the tallest size it needs (2x the largest display size).
APP_POSES = {
    'waving': 360,
    'celebrating': 360,
    'thinking': 300,
    'thumbs-up': 220,
    'notes': 300,
    'report': 300,
    'sleeping': 220,
}

PAD = 8
FRINGE_DIVISOR = 190.0


def background_mask(rgb: np.ndarray) -> np.ndarray:
    """Near-white, low-colour pixels connected to the crop's edge: paper and soft shadows."""
    diff = np.abs(rgb - 254).max(axis=2)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    # Paper and faint tints, plus the neutral grey of the drop shadows, which can be quite dark.
    candidate = ((diff <= 45) & (chroma <= 25)) | ((diff <= 110) & (chroma <= 10))
    h, w = candidate.shape
    seen = np.zeros_like(candidate)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if candidate[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if candidate[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    return seen


def near(mask: np.ndarray, steps: int) -> np.ndarray:
    """Pixels within `steps` of the mask (8-neighbourhood), without scipy."""
    grown = mask.copy()
    for _ in range(steps):
        g = grown.copy()
        g[1:, :] |= grown[:-1, :]
        g[:-1, :] |= grown[1:, :]
        g[:, 1:] |= grown[:, :-1]
        g[:, :-1] |= grown[:, 1:]
        g[1:, 1:] |= grown[:-1, :-1]
        g[1:, :-1] |= grown[:-1, 1:]
        g[:-1, 1:] |= grown[1:, :-1]
        g[:-1, :-1] |= grown[1:, 1:]
        grown = g
    return grown


def cut(sheet: np.ndarray, box) -> Image.Image:
    left, right, top, bottom = box
    region = sheet[max(0, top - PAD): bottom + PAD + 1, max(0, left - PAD): right + PAD + 1].astype(float)
    bg = background_mask(region.astype(int))
    alpha = np.where(bg, 0.0, 1.0)

    # Edge pixels are part white paper: estimate how much, and take the white back out.
    fringe = (~bg) & near(bg, 2)
    whiteness_gap = (255.0 - region).max(axis=2)
    edge_alpha = np.clip(whiteness_gap / FRINGE_DIVISOR, 0.0, 1.0)
    alpha = np.where(fringe, edge_alpha, alpha)
    safe = np.maximum(alpha, 1e-3)[..., None]
    colour = np.where(fringe[..., None], (region - (1 - alpha[..., None]) * 255.0) / safe, region)
    colour = np.clip(colour, 0, 255)

    rgba = np.dstack([colour, alpha * 255.0]).round().astype(np.uint8)
    image = Image.fromarray(rgba, 'RGBA')
    bbox = image.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    left_b, top_b, right_b, bottom_b = bbox
    return image.crop((max(0, left_b - 4), max(0, top_b - 4), min(image.width, right_b + 4), min(image.height, bottom_b + 4)))


def downscale(image: Image.Image, max_height: int) -> Image.Image:
    if image.height <= max_height:
        return image
    width = round(image.width * max_height / image.height)
    # Resize premultiplied, so transparent edges do not pick up dark or white halos.
    return image.convert('RGBa').resize((width, max_height), Image.Resampling.LANCZOS).convert('RGBA')


def main():
    sheet = np.asarray(Image.open(SHEET).convert('RGB'))
    DESIGN.mkdir(parents=True, exist_ok=True)
    APP.mkdir(parents=True, exist_ok=True)
    if SHEET.resolve() != (DESIGN / 'professor-ponku-sheet.webp').resolve():
        shutil.copyfile(SHEET, DESIGN / 'professor-ponku-sheet.webp')

    for name, box in {**POSES, **ICONS}.items():
        image = cut(sheet, box)
        image.save(DESIGN / f'{name}.png', optimize=True)
        line = f'{name:15} {image.width}x{image.height}'
        if name in APP_POSES:
            small = downscale(image, APP_POSES[name])
            target = APP / f'{name}.webp'
            small.save(target, 'WEBP', quality=88, method=6)
            line += f'  ->  app {small.width}x{small.height}, {target.stat().st_size // 1024} KB'
        print(line)


main()
