# -*- coding: utf-8 -*-
"""Rebuild the campus ground texture (su-ground2.jpg) without plan-ink artefacts.

Root cause of the artefacts (thin white/cream hairlines + green "GATE" labels on
the paved ground):  the official printed plan leaks into the texture twice -

  (a) its colour classification keeps the plan's own *hairline strokes* (the cream
      boundary of every area = class 1 "paths") and the blobs of the printed
      labels / digits (classified as lawn / garden colours), so they are painted
      straight onto the ground, and
  (b) the low-frequency `dev` shading layer was taken from the raw plan raster,
      carrying every label, arrow and dashed line over to the ground.

This script rebuilds the class map with the same REFS / map bounds / background
rule, then scrubs the plan ink (compact strokes only) out of both the class map
and the shading source before rendering.

Self-contained: works entirely inside D:\\SU3D, reads su-official-map.pdf and
su-campus.json, imports neither build_assets nor any session path.
"""
import json, os
import numpy as np, cv2, pymupdf
from PIL import Image

WS = r"D:\SU3D"
MAP_X0, MAP_Y0, MAP_X1, MAP_Y1 = 508, 312, 2960, 2921
K = 0.20                                   # 1 world unit = 1 metre
CX, CY = (MAP_X0 + MAP_X1) / 2.0, (MAP_Y0 + MAP_Y1) / 2.0
S = 3034.0 / 1396.0                        # printed plan scale
MANUAL = {14: (565, 925, 660, 1050), 18: (908, 686, 1000, 800), 19: (1136, 455, 1216, 510)}
ANCHORS = {1: (782, 1063), 2: (782, 962), 3: (780, 872), 4: (830, 775), 5: (470, 862),
           6: (480, 940), 7: (790, 520), 8: (475, 740), 9: (350, 800), 10: (702, 770),
           11: (1063, 462), 12: (380, 1150), 13: (874, 216), 15: (620, 665),
           16: (492, 480), 17: (945, 890), 20: (385, 483)}

# ----------------------------------------------------------------- plan raster
doc = pymupdf.open(os.path.join(WS, "su-official-map.pdf"))
pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(1.0, 1.0))
RGB = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
BGR = cv2.cvtColor(RGB, cv2.COLOR_RGB2BGR)
H, W = RGB.shape[:2]
print("plan raster:", W, "x", H)

# ------------------------------------------------------- build_mask (footprints)
# Same algorithm as build_assets.py (colour components on the printed plan), so
# the building pads are identical to the ones the 3D models sit on - and the
# courtyards stay open.  The JSON contour polygons are used only as a cross check:
# filling them would pave the courtyards of the 1/2/3 complex and of building 13.
def mode_colour(pixels_bgr):
    p = pixels_bgr.reshape(-1, 3)
    p = p[p.sum(axis=1) < 700]
    if not len(p):
        return None
    q = (p.astype(np.int32) // 12) * 12
    keys, counts = np.unique(q, axis=0, return_counts=True)
    best = keys[counts.argmax()]
    sel = p[np.abs(p.astype(np.int32) - best).sum(axis=1) < 60]
    return tuple(int(v) for v in np.median(sel, axis=0)) if len(sel) else tuple(int(v) for v in best)


def sample(px, py, r=9):
    x, y = int(px), int(py)
    return mode_colour(BGR[max(0, y - r):y + r, max(0, x - r):x + r])


rows = []
for row, (ax, ay) in sorted(ANCHORS.items()):
    col = sample(ax * S, ay * S)
    if col:
        rows.append({"row": row, "col": col, "anchor": (ax * S, ay * S)})
groups = {}
for r in rows:
    groups.setdefault(r["col"], []).append(r)

build_mask = np.zeros((H, W), np.uint8)
for col, rs in groups.items():
    m = (np.abs(BGR.astype(np.int16) - np.array(col, np.int16)).sum(axis=2) < 110).astype(np.uint8) * 255
    m[:, :MAP_X0] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m, 8)
    comps = [(i, int(stats[i, cv2.CC_STAT_AREA]), float(cent[i][0]), float(cent[i][1]))
             for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] >= 300]
    used = set()
    for r in sorted(rs, key=lambda q: q["row"]):
        ax, ay = r["anchor"]
        pick, bd = None, 1e18
        for i, a, cx, cy in comps:
            if i in used:
                continue
            d = ((cx - ax) ** 2 + (cy - ay) ** 2) ** 0.5
            if d < bd:
                bd, pick = d, (i, a, cx, cy)
        if pick is None:
            print("row %2d : no component" % r["row"]); continue
        used.add(pick[0])
        build_mask |= (lab == pick[0]).astype(np.uint8) * 255
for row, (x0, y0, x1, y1) in MANUAL.items():
    X0, Y0, X1, Y1 = int(x0 * S), int(y0 * S), int(x1 * S), int(y1 * S)
    mm = np.zeros((H, W), np.uint8)
    mm[Y0:Y1, X0:X1] = 255
    mm = cv2.morphologyEx(mm, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    build_mask |= mm
print("build_mask px:", int((build_mask > 0).sum()))

# cross check against the exported footprints
camp = json.load(open(os.path.join(WS, "su-campus.json"), encoding="utf-8"))
jsonm = np.zeros((H, W), np.uint8)
for b in camp["buildings"]:
    for poly in b.get("polys", []):
        pts = np.array([[round(x / K + CX), round(y / K + CY)] for x, y in poly], np.int32)
        if len(pts) >= 3:
            cv2.fillPoly(jsonm, [pts], 255)
for row, (x0, y0, x1, y1) in MANUAL.items():
    X0, Y0, X1, Y1 = int(x0 * S), int(y0 * S), int(x1 * S), int(y1 * S)
    cv2.rectangle(jsonm, (X0, Y0), (X1, Y1), 255, -1)
print("json footprint mask px: %d (cross check, courtyards get paved by it)"
      % int((jsonm > 0).sum()))

# ------------------------------------------------------------------- classes
REFS = [(211, 233, 195),   # 0 lawn
        (198, 209, 191),   # 1 paths / inner roads
        (186, 210, 170),   # 2 planted rows / gardens
        (208, 210, 210),   # 3 asphalt roads
        (255, 255, 255),   # 4 outside the campus (desert)
        (216, 190, 200)]   # 5 parking courts on the plan
REFA = np.array(REFS, np.float32)
flat = RGB.astype(np.float32).reshape(-1, 3)
d2 = ((flat[:, None, :] - REFA[None, :, :]) ** 2).sum(axis=2)
cls = d2.argmin(axis=1).reshape(H, W).astype(np.uint8)
bg = RGB[40, 40].astype(np.int16)
cls[np.abs(RGB.astype(np.int16) - bg).sum(axis=2) < 26] = 4   # page background = desert
cls[build_mask > 0] = 6
print("raw class histogram:", np.bincount(cls[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1].ravel(), minlength=7))

# ------------------------------------------------------- plan-ink detection
# black-hat / top-hat react to *compact* strokes only, so large filled areas
# (planting plots, building blocks, the page background) survive untouched.
gray = cv2.cvtColor(RGB, cv2.COLOR_RGB2GRAY)
K13 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
bh = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, K13)
wh = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, K13)
ink = ((bh > 16) | (wh > 16)).astype(np.uint8) * 255
ink[build_mask > 0] = 0                       # footprints are painted by the 3D models
ink = cv2.dilate(ink, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
print("ink px:", int((ink > 0).sum()))

# --------------------------------------------------------- class-map clean-up
def nearest_fill(lbl, valid):
    """Replace every pixel whose `valid` is False by the label of the nearest
    valid pixel (Euclidean nearest neighbour)."""
    src = np.where(valid, 0, 255).astype(np.uint8)      # zeros = valid pixels
    _, labels = cv2.distanceTransformWithLabels(src, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    flat_valid = np.flatnonzero(valid.ravel())
    idx = np.clip(labels.astype(np.int64) - 1, 0, len(flat_valid) - 1)
    return lbl.ravel()[flat_valid[idx]].reshape(lbl.shape)

cls_c = nearest_fill(cls, ink == 0)                      # 1. labels / digits gone
print("after ink removal  :", np.bincount(cls_c[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1].ravel(), minlength=7))

# 2. class 1 "paths": the plan outlines every area with a cream hairline and draws
#    the basketball court as a cream block.  Keep only the thick blocks (distance
#    transform core), fill them solid so the court markings vanish, drop the
#    hairlines - they are exactly the white threads on the ground.
m1 = (cls_c == 1).astype(np.uint8)
dist = cv2.distanceTransform(m1, cv2.DIST_L2, 5)
core = ((m1 > 0) & (dist >= 5.0)).astype(np.uint8)
core = cv2.morphologyEx(core, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))
n, lab, st, _ = cv2.connectedComponentsWithStats(core, 8)
filled = np.zeros_like(m1)
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] < 400:
        continue
    cnts, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(filled, cnts, -1, 1, -1)
hair = (m1 > 0) & (filled == 0)
cls_c = nearest_fill(cls_c, ~hair)
cls_c[filled > 0] = 1
print("hairline px removed:", int(hair.sum()), " solid path blocks kept:", int((filled > 0).sum()))

# 3. drop tiny leftover blobs (label residue, speckle)
for c in range(7):
    m = (cls_c == c).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    small = np.zeros_like(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] < 200 and max(st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]) < 34:
            small[lab == i] = 1
    if small.any():
        cls_c = nearest_fill(cls_c, small == 0)
print("after clean-up      :", np.bincount(cls_c[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1].ravel(), minlength=7))
np.save(os.path.join(WS, "_diag_cls_clean.npy"), cls_c)

# ------------------------------------------------------------------ palette
def samp(pid, cf, x0, y0, x1, y1):
    im = Image.open(os.path.join(WS, "pano", pid, "hi3", "cf%d.jpg" % cf)).convert("RGB")
    w, h = im.size
    c = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    a = np.asarray(c).reshape(-1, 3).astype(np.float32)
    return tuple(int(v) for v in np.median(a, axis=0))

LAWN = samp("node32", 0, .30, .56, .66, .70)
PATHS = samp("node33", 0, .02, .68, .28, .92)
ASPH = samp("node45", 0, .46, .62, .74, .82)
PARK = samp("node5", 1, .35, .56, .78, .76)
DESERT = samp("node44", 0, .06, .76, .28, .94)
GARDEN = samp("node31", 1, .52, .40, .80, .54)
print("sampled:", dict(lawn=LAWN, paths=PATHS, asphalt=ASPH, parking=PARK, desert=DESERT, garden=GARDEN))

# The palette of the previous su-ground2.jpg (hand tuned against the campus
# photography).  The two brightest entries are pulled down a little so that no
# pixel of the texture can read as "very bright" (all three channels > 190).
COL = {0: (104, 141, 71),    # lawn
       1: (196, 186, 168),   # cream paths   (was 214,203,188)
       2: (93, 126, 66),     # gardens
       3: (109, 111, 113),   # asphalt
       4: (216, 190, 152),   # desert
       5: (180, 182, 176),   # parking       (was 197,198,193)
       6: (190, 182, 166)}   # building pads
print("palette:", COL)

OW = 4096
OH = int(OW * (MAP_Y1 - MAP_Y0) / (MAP_X1 - MAP_X0))
sub = cls_c[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1]
smask = build_mask[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1]

# ------------------------------------------------- anti-aliased class coverage
cov = []
for c in range(7):
    m = (sub == c).astype(np.float32)
    if c == 6:
        m = np.maximum(m, (smask > 0).astype(np.float32))
    u = cv2.resize(m, (OW, OH), interpolation=cv2.INTER_LINEAR)
    u = cv2.GaussianBlur(u, (0, 0), 1.5)
    cov.append(u)
tot = np.zeros((OH, OW), np.float32)
for u in cov:
    tot += u
tot = np.maximum(tot, 1e-3)

base = np.zeros((OH, OW, 3), np.float32)
for c in range(7):
    base += (cov[c] / tot)[..., None] * np.array(COL[c], np.float32)

# ------------------------------------------- low-frequency shading (ink-free)
# the plan raster is inpainted where ink was found and then blurred hard, so only
# the broad tonal differences between the plan's areas survive - no labels, no lines.
plan_crop = RGB[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1].copy()
ink_crop = ink[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1]
plan_clean = cv2.inpaint(plan_crop, ink_crop, 5, cv2.INPAINT_TELEA)
plan_clean = cv2.GaussianBlur(plan_clean, (0, 0), 14.0)
small = cv2.resize(plan_clean, (OW, OH), interpolation=cv2.INTER_AREA).astype(np.float32)
dev = np.zeros_like(small)
for c in range(7):
    wgt = (cov[c] / tot)[..., None]
    m = wgt[..., 0] > .5
    if m.any():
        dev[m] = small[m] - small[m].mean(axis=0, keepdims=True)
dev = np.clip(dev, -12.0, 12.0)
dev *= 0.5
dev[cov[6] / tot > .5] = 0.0                # no plan detail under the footprints

def noise(w, h, scale, seed):
    r = np.random.default_rng(seed)
    return cv2.resize(r.random((max(2, h // scale), max(2, w // scale))).astype(np.float32), (w, h),
                      interpolation=cv2.INTER_CUBIC)

n1, n2 = noise(OW, OH, 40, 3), noise(OW, OH, 9, 11)
out = base + dev * 0.6
out *= (0.90 + 0.18 * n1[..., None])
out += (n2[..., None] - 0.5) * 4.0

# ambient occlusion around the buildings
bm = (cov[6] / tot > .5).astype(np.uint8) * 255
bm = cv2.dilate(bm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
ao = cv2.GaussianBlur(bm, (0, 0), 11).astype(np.float32) / 255.0
out *= (1.0 - 0.34 * ao[..., None])

# gentle warm/cool variation so the ground is not flat
tint = (noise(OW, OH, 260, 7)[..., None] - 0.5) * 14.0
out += tint * np.array([1.0, .96, .86], np.float32)

out = np.clip(out, 0, 255).astype(np.uint8)

# safety net: no pixel may have all three channels above 190
mn = out.min(axis=2)
hot = mn > 188
n_hot = int(hot.sum())
if n_hot:
    sc = (188.0 / np.maximum(mn, 1.0))[..., None]
    out[hot] = np.clip(out[hot] * sc[hot], 0, 255).astype(np.uint8)
    print("highlight clamp applied to", n_hot, "px")

dst = os.path.join(WS, "su-ground2.jpg")
cv2.imwrite(dst, out[:, :, ::-1], [int(cv2.IMWRITE_JPEG_QUALITY), 90])
size = os.path.getsize(dst)

# ------------------------------------------------------------------ verification
chk = cv2.imread(dst)
mn = chk.min(axis=2)
b200 = int((mn > 200).sum())
b190 = int((mn > 190).sum())
tot_px = chk.shape[0] * chk.shape[1]
print("=== su-ground2.jpg ===")
print("size      :", chk.shape[1], "x", chk.shape[0], " bytes:", size)
print("px>200 all:", b200)
print("px>190 all:", b190, "= %.5f%%" % (100.0 * b190 / tot_px))
print("mean BGR  :", chk.reshape(-1, 3).mean(axis=0).round(1))

# preview + diagnostics
pv = cv2.resize(chk, (1400, int(1400 * chk.shape[0] / chk.shape[1])), interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(WS, "_ground_preview.png"), pv)
pal = np.array([[40, 120, 40], [60, 200, 220], [0, 160, 80], [90, 90, 90],
                [230, 200, 150], [200, 140, 200], [255, 255, 255]], np.uint8)
cv2.imwrite(os.path.join(WS, "_diag_cls_clean.png"),
            cv2.resize(pal[sub], (1400, 1400), interpolation=cv2.INTER_NEAREST))
cv2.imwrite(os.path.join(WS, "_diag_ink.png"),
            cv2.resize(1 - ink_crop, (1400, 1400), interpolation=cv2.INTER_NEAREST))
print("preview + diagnostics written")
