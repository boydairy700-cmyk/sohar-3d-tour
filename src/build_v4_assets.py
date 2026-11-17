# -*- coding: utf-8 -*-
"""Build the v4 asset pack:
   - real facade photos cut from the Sohar University 360 virtual tour (su.edu.om/virtualtour)
   - real campus paving, CC0 bark / grass (ambientCG), procedural foliage & grass tufts
"""
import io, json, math, os, random
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter

WS = r"C:\Users\pc i7\.minimax\sessions\mvs_6300634d1cb647159106ad0117f5e127\workspace"
OUT = os.path.join(WS, "assets")
PANO = os.path.join(WS, "pano")
os.makedirs(OUT, exist_ok=True)
random.seed(7); np.random.seed(7)

# ----------------------------------------------------------------- helpers
def face(pid, cf):
    return Image.open(os.path.join(PANO, pid, "hi3", "cf%d.jpg" % cf)).convert("RGB")

def cut(pid, cf, x0, y0, x1, y1, size=None, out=None, q=82):
    im = face(pid, cf); W, H = im.size
    box = (int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H))
    c = im.crop(box)
    if size:
        w, h = c.size
        s = size / max(w, h)
        c = c.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    p = os.path.join(OUT, out)
    c.save(p, quality=q)
    print("  ->", out, c.size, os.path.getsize(p))
    return c

# ------------------------------------------------------------------ facades
FACADES = [
    ("node32", 0, .270, .215, .690, .405, "fac_lang.jpg"),     # Faculty of Languages
    ("node32", 0, .620, .235, .920, .400, "fac_lang2.jpg"),    # Faculty of Languages (2)
    ("node30", 0, .590, .090, .980, .400, "fac_cit.jpg"),       # College of Technology & Business
    ("node39", 0, .570, .040, .985, .385, "fac_eng.jpg"),       # Engineering faculty (grand arch)
    ("node39", 0, .020, .075, .300, .375, "fac_eng2.jpg"),      # geometric mashrabiya wall
    ("node40", 0, .300, .040, .880, .400, "fac_arcade.jpg"),    # arcade + mashrabiya
    ("node60", 0, .700, .030, 1.0, .390, "fac_pink1.jpg"),      # salmon faculty building
    ("node45", 0, .010, .160, .460, .430, "fac_pink3.jpg"),     # pink faculty building
    ("node49", 0, .740, .040, 1.0, .385, "fac_cream.jpg"),      # cream faculty building
    ("node34", 0, .100, .325, .680, .495, "fac_health.jpg"),    # Health Centre
    ("node6",  1, .720, .080, 1.0, .400, "fac_theatre.jpg"),    # Theatre
    ("node73", 0, .500, .265, 1.0, .430, "fac_admin.jpg"),      # administration / greenhouses
    ("node31", 1, .640, .180, 1.0, .390, "fac_modern.jpg"),     # modern grey block
    ("node47", 1, .600, .090, 1.0, .390, "fac_pink2.jpg"),      # pink block by the library road
    ("node51", 0, .010, .270, .520, .455, "fac_campus.jpg"),    # campus row
    ("node44", 0, .030, .240, .430, .430, "fac_gate.jpg"),      # entrance canopy
]
print("facades:")
for pid, cf, x0, y0, x1, y1, name in FACADES:
    cut(pid, cf, x0, y0, x1, y1, 700, name)

# ------------------------------------------------------- real campus paving
print("ground surfaces:")
cut("node5",  1, .18, .44, .82, .78, 512, "pave_plaza.jpg", 84)   # grey plaza tiles
cut("node44", 0, .05, .66, .50, .96, 512, "pave_hex.jpg", 84)      # pink hexagon paving
cut("node31", 1, .00, .55, .45, .95, 512, "pave_path.jpg", 84)     # pink brick walkway
cut("node33", 0, .00, .58, .45, .98, 512, "pave_cream.jpg", 84)   # cream brick paving

# ------------------------------------------------------------- ambientCG CC0
def ambient(src, name, size=512, q=84):
    p = os.path.join(WS, src)
    im = Image.open(p).convert("RGB").resize((size, size), Image.LANCZOS)
    out = os.path.join(OUT, name); im.save(out, quality=q)
    print("  ->", name, im.size, os.path.getsize(out))

print("ambientCG:")
ambient(r"Bark001_2K-JPG\Bark001_2K-JPG_Color.jpg", "bark.jpg")
ambient(r"Bark001_2K-JPG\Bark001_2K-JPG_NormalGL.jpg", "bark_n.jpg")
ambient(r"Grass004_2K-JPG\Grass004_2K-JPG_Color.jpg", "grass.jpg")
ambient(r"Grass004_2K-JPG\Grass004_2K-JPG_NormalGL.jpg", "grass_n.jpg")

# ------------------------------------------- procedural foliage leaf clusters
def leaf_cluster(size=512, n=1500, seed=1, hue=0):
    rnd = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # depth layers: darker leaves behind
    for layer, (cnt, dark) in enumerate([(int(n * .55), .55), (int(n * .45), 1.0)]):
        for i in range(cnt):
            cx = rnd.uniform(-.1, 1.1) * size
            cy = rnd.uniform(-.1, 1.1) * size
            r = rnd.uniform(.012, .030) * size * (1.25 if layer == 0 else 1.0)
            ang = rnd.uniform(0, math.pi)
            g = rnd.uniform(78, 140) * dark
            rr = rnd.uniform(30, 62) * dark
            b = rnd.uniform(26, 48) * dark
            if hue: rr += hue * 18; b += hue * 6
            col = (int(min(255, rr)), int(min(255, g)), int(min(255, b)), 255)
            # leaf = ellipse rotated
            steps = 14
            pts = []
            for s in range(steps):
                a = ang + s / steps * math.tau
                rad = r * (1.0 + .18 * math.sin(3 * a))
                pts.append((cx + math.cos(a) * rad * 1.45, cy + math.sin(a) * rad * .78))
            d.polygon(pts, fill=col)
            # midrib
            if layer == 1 and rnd.random() < .5:
                d.line([pts[0], pts[steps // 2]], fill=(int(min(255, rr * .6)), int(g * .7), int(b * .7), 200), width=1)
    img = img.filter(ImageFilter.GaussianBlur(0.7))
    return img

print("foliage:")
for i, (seed, hue) in enumerate([(3, 0), (9, 1), (17, -1)]):
    im = leaf_cluster(512, 1900, seed, hue)
    p = os.path.join(OUT, "leaf%d.png" % i); im.save(p)
    print("  -> leaf%d.png" % i, os.path.getsize(p))

# ---------------------------------------------------------- grass tuft card
def tuft(size=256, seed=5):
    rnd = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i in range(46):
        x0 = rnd.uniform(.15, .85) * size
        h = rnd.uniform(.45, .95) * size
        w = rnd.uniform(.012, .022) * size
        bend = rnd.uniform(-.28, .28) * size
        g = rnd.uniform(88, 150); rr = rnd.uniform(44, 78); bb = rnd.uniform(28, 52)
        col = (int(rr), int(g), int(bb), 255)
        pts = []
        for s in range(9):
            t = s / 8
            pts.append((x0 + bend * t * t + math.sin(t * 3) * w * .4, size - h * t))
        d.polygon([(x0 - w, size), (x0 + w, size)] + pts[::-1], fill=col)
    return img.filter(ImageFilter.GaussianBlur(0.6))

tuft(256).save(os.path.join(OUT, "tuft.png"))
print("  -> tuft.png", os.path.getsize(os.path.join(OUT, "tuft.png")))

# ------------------------------------------------------------------- report
tot = 0
for f in sorted(os.listdir(OUT)):
    tot += os.path.getsize(os.path.join(OUT, f))
print("assets total", tot, "bytes;", len(os.listdir(OUT)), "files")
