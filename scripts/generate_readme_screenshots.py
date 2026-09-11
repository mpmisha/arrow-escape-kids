from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "screenshots"
BG = (32, 38, 79)
TOP = (92, 120, 219)
BOTTOM = (56, 66, 153)
PANEL = (51, 59, 107)
GOLD = (255, 204, 61)
PIECE = (238, 234, 220)
PIECE_FACE = (250, 247, 233)
SELECTED = (231, 95, 102)
SELECTED_FACE = (255, 140, 145)
BOARD_CELL = (19, 27, 83, 72)


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("Arial Rounded Bold.ttf", "Arial.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def gradient(size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, BG)
    pixels = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        color = tuple(round(TOP[i] * (1 - t) + BOTTOM[i] * t) for i in range(3))
        for x in range(w):
            pixels[x, y] = color
    return img


def round_rect(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def arrow_head(draw: ImageDraw.ImageDraw, center, direction, size, fill):
    x, y = center
    if direction == "right":
        pts = [(x + size, y), (x - size * .65, y - size * .72), (x - size * .36, y), (x - size * .65, y + size * .72)]
    elif direction == "left":
        pts = [(x - size, y), (x + size * .65, y - size * .72), (x + size * .36, y), (x + size * .65, y + size * .72)]
    elif direction == "up":
        pts = [(x, y - size), (x - size * .72, y + size * .65), (x, y + size * .36), (x + size * .72, y + size * .65)]
    else:
        pts = [(x, y + size), (x - size * .72, y - size * .65), (x, y - size * .36), (x + size * .72, y - size * .65)]
    draw.polygon(pts, fill=fill)


def draw_piece(draw: ImageDraw.ImageDraw, path, direction, cell, ox, oy, selected=False):
    centers = [(ox + x * cell + cell / 2, oy + y * cell + cell / 2) for x, y in path]
    body = SELECTED if selected else PIECE
    face = SELECTED_FACE if selected else PIECE_FACE
    draw.line(centers, fill=(24, 25, 35), width=round(cell * .64), joint="curve")
    draw.line(centers, fill=body, width=round(cell * .58), joint="curve")
    draw.line(centers, fill=face, width=round(cell * .36), joint="curve")
    if len(centers) > 1:
        highlight = [(x - cell * .04, y - cell * .05) for x, y in centers]
        draw.line(highlight, fill=(255, 255, 255), width=max(2, round(cell * .08)), joint="curve")
    arrow_head(draw, centers[0], direction, cell * .28, GOLD if selected else (248, 242, 218))


def board_frame(title: str, score: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = gradient((720, 1180)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    title_font, score_font = font(31), font(46)
    draw.text((46, 48), f"Best {title}", font=title_font, fill=GOLD)
    tw = draw.textlength(score, font=score_font)
    draw.text(((720 - tw) / 2, 36), score, font=score_font, fill=(255, 255, 255))
    round_rect(draw, (611, 45, 677, 111), 18, (255, 255, 255, 30), (255, 255, 255, 50), 2)
    draw.ellipse((631, 65, 657, 91), outline=(255, 255, 255), width=4)
    draw.line((644, 56, 644, 101), fill=(255, 255, 255), width=4)
    draw.line((622, 78, 666, 78), fill=(255, 255, 255), width=4)
    return img, draw


def draw_board(draw, mask, pieces, cell=78):
    h, w = len(mask), len(mask[0])
    ox = (720 - w * cell) / 2
    oy = 215
    for y, row in enumerate(mask):
        for x, value in enumerate(row):
            if value == "#":
                round_rect(draw, (ox + x * cell + 9, oy + y * cell + 9, ox + (x + 1) * cell - 9, oy + (y + 1) * cell - 9), 16, BOARD_CELL)
    for piece in pieces:
        draw_piece(draw, piece["path"], piece["dir"], cell, ox, oy, piece.get("selected", False))


def onboarding():
    img, draw = board_frame("1", "0 / 2")
    mask = ["##", "##"]
    pieces = [
        {"path": [(1, 0), (0, 0)], "dir": "right", "selected": True},
        {"path": [(0, 1), (1, 1)], "dir": "left"},
    ]
    draw_board(draw, mask, pieces, 116)
    actions(draw)
    img.convert("RGB").save(OUT / "onboarding-board.png")


def butterfly():
    img, draw = board_frame("18", "0 / 9")
    mask = ["##...##", "###.###", ".#####.", "..###..", ".#####.", "###.###", "##...##"]
    pieces = [
        {"path": [(1, 0), (0, 0), (0, 1), (1, 1), (2, 1)], "dir": "left"},
        {"path": [(5, 0), (6, 0), (6, 1), (5, 1), (4, 1)], "dir": "right"},
        {"path": [(1, 2), (2, 2), (3, 2), (4, 2), (5, 2)], "dir": "right", "selected": True},
        {"path": [(4, 3), (3, 3), (2, 3)], "dir": "left"},
        {"path": [(5, 4), (4, 4), (3, 4), (2, 4), (1, 4)], "dir": "left"},
        {"path": [(0, 5), (1, 5), (2, 5), (2, 6), (1, 6), (0, 6)], "dir": "down"},
        {"path": [(6, 5), (5, 5), (4, 5), (4, 6), (5, 6), (6, 6)], "dir": "down"},
        {"path": [(3, 1), (3, 2), (3, 3)], "dir": "up"},
        {"path": [(3, 5), (3, 4)], "dir": "down"},
    ]
    draw_board(draw, mask, pieces, 76)
    actions(draw)
    img.convert("RGB").save(OUT / "butterfly-silhouette-board.png")


def actions(draw):
    labels = [("Undo", 75, 1000, 172), ("Reset", 274, 1000, 172), ("Hint", 473, 1000, 172)]
    for text, x, y, w in labels:
        fill = (87, 199, 112) if "Hint" in text else (92, 107, 173)
        round_rect(draw, (x, y, x + w, y + 62), 20, fill)
        tw = draw.textlength(text, font=font(25))
        draw.text((x + (w - tw) / 2, y + 14), text, font=font(25), fill=(255, 255, 255))


def settings():
    img, draw = board_frame("4", "1 / 7")
    round_rect(draw, (108, 258, 612, 853), 34, (16, 18, 41, 175))
    round_rect(draw, (145, 303, 575, 815), 28, PANEL, (255, 255, 255, 45), 2)
    heading = "Settings"
    tw = draw.textlength(heading, font=font(42))
    draw.text(((720 - tw) / 2, 337), heading, font=font(42), fill=(255, 255, 255))
    rows = [("Sound", True, 420), ("Vibration", True, 505)]
    for label, enabled, y in rows:
        draw.text((186, y), label, font=font(29), fill=(255, 255, 255))
        fill = (87, 199, 112) if enabled else (255, 255, 255, 56)
        round_rect(draw, (452, y - 2, 528, y + 40), 21, fill)
        draw.ellipse((488, y + 2, 524, y + 38), fill=(255, 255, 255))
    for label, y, fill in [("Reset Best", 592, (237, 102, 107)), ("Close", 674, (92, 107, 173))]:
        round_rect(draw, (184, y, 536, y + 62), 20, fill)
        tw = draw.textlength(label, font=font(28))
        draw.text(((720 - tw) / 2, y + 13), label, font=font(28), fill=(255, 255, 255))
    img.convert("RGB").save(OUT / "settings-panel.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    onboarding()
    butterfly()
    settings()
    print(f"wrote screenshots to {OUT}")


if __name__ == "__main__":
    main()
