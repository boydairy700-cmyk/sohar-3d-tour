# -*- coding: utf-8 -*-
"""Build 3D assets from the official Sohar University campus map (v2):
   footprints -> world polygons, realistic site texture, vegetation points."""
import json, os
import numpy as np
import cv2
import pymupdf

WS = r"C:\Users\pc i7\.minimax\sessions\mvs_6300634d1cb647159106ad0117f5e127\workspace"
doc = pymupdf.open(os.path.join(WS, "su-official-map.pdf"))
pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(1.0, 1.0))
RGB = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
BGR = cv2.cvtColor(RGB, cv2.COLOR_RGB2BGR)
H, W = RGB.shape[:2]
S = 3034.0 / 1396.0

MAP_X0, MAP_Y0, MAP_X1, MAP_Y1 = 508, 312, 2960, 2921
K = 0.20                                     # 1 world unit = 1 metre
CX, CY = (MAP_X0 + MAP_X1) / 2.0, (MAP_Y0 + MAP_Y1) / 2.0
to_world = lambda px, py: ((px - CX) * K, (py - CY) * K)

PALETTE = {
    1: ("Saham Building", "مبنى صحم", "A", 17), 2: ("Al Khaboura Building", "مبنى الخابورة", "B", 15),
    3: ("Liwa Building", "مبنى ليوى", "C", 12), 4: ("Suwaiq Building", "مبنى السويق", "E", 12),
    5: ("Learning Resources Centre", "مركز مصادر التعلم", "LRC", 16),
    6: ("LRC Theatre Building", "مسرح مركز مصادر التعلم", "", 9),
    7: ("Shinas Building", "مبنى شناص", "", 10), 8: ("Rustaq Building", "مبنى الرستاق", "F", 13),
    9: ("Barka Building", "مبنى بركاء", "G", 15), 10: ("Amphitheatre", "المسرح المفتوح", "", 5),
    11: ("Resources Offices", "مباني الموارد", "", 12), 12: ("Innovation Centre", "مركز الابتكار", "", 13),
    13: ("Female Student Hostel", "سكن الطالبات", "", 16),
    14: ("Multi-Purpose Hall", "قاعة متعددة الاستخدامات", "", 9),
    15: ("Mosque", "المسجد", "", 12), 16: ("Green House", "الحاضنة الزراعية", "", 6),
    17: ("Football Field", "الحقل الرياضي", "", 1), 18: ("Football Field (Pitch)", "ملعب كرة القدم", "", 1),
    19: ("Basketball Field", "ملعب كرة السلة", "", 1), 20: ("Services Building", "مبنى الخدمات", "", 8),
}
ANCHORS = {1: (782, 1063), 2: (782, 962), 3: (780, 872), 4: (830, 775), 5: (470, 862),
           6: (480, 940), 7: (790, 520), 8: (475, 740), 9: (350, 800), 10: (702, 770),
           11: (1063, 462), 12: (380, 1150), 13: (874, 216), 15: (620, 665),
           16: (492, 480), 17: (945, 890), 20: (385, 483)}
MANUAL = {14: (565, 925, 660, 1050), 18: (908, 686, 1000, 800), 19: (1136, 455, 1216, 510)}


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


def contour_poly(mask, min_area=500):
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
    polys = []
    for cnt in cnts[:8]:
        if cv2.contourArea(cnt) < min_area:
            continue
        ap = cv2.approxPolyDP(cnt, 0.0035 * cv2.arcLength(cnt, True), True)
        if len(ap) > 40:
            ap = cv2.approxPolyDP(cnt, 0.010 * cv2.arcLength(cnt, True), True)
        polys.append(ap.reshape(-1, 2).astype(float))
    return polys


# --- sample colours, group rows that share a colour, bind components greedily
rows = []
for row, (ax, ay) in sorted(ANCHORS.items()):
    col = sample(ax * S, ay * S)
    if col:
        rows.append({"row": row, "col": col, "anchor": (ax * S, ay * S)})
groups = {}
for r in rows:
    groups.setdefault(r["col"], []).append(r)

buildings, build_mask = {}, np.zeros((H, W), np.uint8)
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
            print("row %2d : no component (colour %s)" % (r["row"], col)); continue
        used.add(pick[0])
        mm = (lab == pick[0]).astype(np.uint8) * 255
        polys = contour_poly(mm)
        buildings[r["row"]] = {"polys": polys}
        build_mask |= mm
        print("row %2d colour=%-20s area=%8d d=%6.1f pts=%s" %
              (r["row"], col, pick[1], bd, [len(p) for p in polys]))

for row, (x0, y0, x1, y1) in MANUAL.items():
    X0, Y0, X1, Y1 = int(x0 * S), int(y0 * S), int(x1 * S), int(y1 * S)
    m = np.zeros((H, W), np.uint8)
    m[Y0:Y1, X0:X1] = 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    buildings[row] = {"polys": contour_poly(m, 2000)}
    build_mask |= m

# ------------------------------------------------------------------ classes
# The official plan is flat vector colour, so classify by nearest reference.
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

CLASS_RGB = {0: (112, 142, 76), 1: (170, 160, 140), 2: (84, 120, 60),
             3: (78, 80, 84), 4: (210, 192, 158), 5: (148, 138, 146),
             6: (172, 164, 148)}
print("class histogram:", np.bincount(cls[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1].ravel(), minlength=7))

tree_mask = (cls == 2).astype(np.uint8) * 255
tree_mask = cv2.morphologyEx(tree_mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, stats, cent = cv2.connectedComponentsWithStats(tree_mask, 8)
tree_pts = sorted([(float(cent[i][0]), float(cent[i][1]), float(stats[i, cv2.CC_STAT_AREA]) ** 0.5)
                   for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] >= 10], key=lambda p: -p[2])[:600]
print("tree clusters:", len(tree_pts))

# ------------------------------------------------------------ ground render
def noise(w, h, scale, seed):
    r = np.random.default_rng(seed)
    return cv2.resize(r.random((max(2, h // scale), max(2, w // scale))).astype(np.float32), (w, h),
                      interpolation=cv2.INTER_CUBIC)

OW = 3072
OH = int(OW * (MAP_Y1 - MAP_Y0) / (MAP_X1 - MAP_X0))
small = cv2.resize(RGB[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1], (OW, OH), interpolation=cv2.INTER_AREA)
scls = cv2.resize(cls[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1], (OW, OH), interpolation=cv2.INTER_NEAREST)
smask = cv2.resize(build_mask[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1], (OW, OH), interpolation=cv2.INTER_NEAREST)

base = np.zeros((OH, OW, 3), np.float32)
for c, rgb in CLASS_RGB.items():
    m = (scls == c)
    if m.any():
        base[m] = rgb
sf = small.astype(np.float32)
dev = np.zeros_like(sf)
for c in range(6):
    m = (scls == c)
    if m.any():
        dev[m] = sf[m] - sf[m].mean(axis=0, keepdims=True)
dev[smask > 0] = 0                      # hide printed map digits under buildings
dark_full = ((RGB.mean(axis=2) < 125) & (build_mask == 0) & (cls != 2)).astype(np.uint8) * 255
dark = cv2.resize(dark_full[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1], (OW, OH), interpolation=cv2.INTER_NEAREST)
dark = cv2.dilate(dark, np.ones((5, 5), np.uint8)).astype(bool)
dev[dark] = 0                          # drop stray map labels / gate captions
shade = 0.90 + 0.20 * (base.mean(axis=2, keepdims=True) / 255.0)
mixed = base * shade + dev * 0.55
n1, n2 = noise(OW, OH, 26, 3), noise(OW, OH, 6, 11)
mixed = mixed * (0.93 + 0.12 * n1[..., None]) + (n2[..., None] - 0.5) * 5.0
ao = cv2.GaussianBlur(cv2.dilate(smask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))),
                       (0, 0), 7).astype(np.float32) / 255.0
mixed *= (1.0 - 0.38 * ao[..., None])
stripes = (np.sin(np.arange(OH, dtype=np.float32)[:, None] * 0.09) * 0.5 + 0.5)
mixed *= np.where(scls == 1, 0.95 + 0.09 * stripes, 1.0).astype(np.float32)[..., None]
mixed = np.clip(mixed, 0, 255).astype(np.uint8)
cv2.imwrite(os.path.join(WS, "su-ground.jpg"), mixed, [int(cv2.IMWRITE_JPEG_QUALITY), 86])
print("ground jpg", OW, OH, os.path.getsize(os.path.join(WS, "su-ground.jpg")))

# ------------------------------------------------------------- world export
out = {"k": K, "map": [MAP_X0, MAP_Y0, MAP_X1, MAP_Y1], "buildings": [], "trees": []}
for row in sorted(buildings):
    d = buildings[row]
    en, ar, code, height = PALETTE[row]
    polys = []
    for p in d["polys"]:
        wp = [[round(to_world(q[0], q[1])[0], 2), round(to_world(q[0], q[1])[1], 2)] for q in p]
        if len(wp) >= 3:
            polys.append(wp)
    if polys:
        out["buildings"].append({"id": row, "en": en, "ar": ar, "code": code, "h": height,
                                 "polys": polys, "kind": "field" if row in (17, 18, 19) else "b"})
for tx, ty, ts in tree_pts:
    wx, wz = to_world(tx, ty)
    out["trees"].append([round(wx, 1), round(wz, 1), round(ts * K, 1)])

# main avenue: track the spine road continuously from the south entrance upwards
ave = []
prev_x = None
for py in range(MAP_Y1 - 260, MAP_Y0, -8):
    row = cls[py, MAP_X0:MAP_X1]
    idx = np.where(row == 3)[0]
    if len(idx) == 0:
        continue
    if prev_x is None:
        pick = idx[np.argmin(np.abs(idx - 330))]
    else:
        pick = idx[np.argmin(np.abs(idx - (prev_x - MAP_X0)))]
    prev_x = MAP_X0 + int(pick)
    wx, wz = to_world(prev_x, py)
    if not ave or (abs(wx - ave[-1][0]) + abs(wz - ave[-1][1])) > 5:
        ave.append([round(wx, 1), round(wz, 1)])
ave.reverse()
out["avenue"] = ave

# lamp posts along paths and roads (spaced)
lamps = []
last = None
path_px = np.argwhere(cls == 1)
road_px = np.argwhere(cls == 3)
rng2 = np.random.default_rng(3)
sel = np.vstack([path_px[rng2.choice(len(path_px), min(len(path_px), 30000), replace=False)],
                  road_px[rng2.choice(len(road_px), min(len(road_px), 12000), replace=False)]])
for py, px in sel:
    wx, wz = to_world(px, py)
    if abs(wx) < 235 and abs(wz) < 255:
        if last is None or ((wx - last[0]) ** 2 + (wz - last[1]) ** 2) ** 0.5 > 16:
            lamps.append([round(wx, 1), round(wz, 1)])
            last = (wx, wz)
out["lamps"] = lamps[:300]

# grass mask (4 m cells) so grass tufts only grow on lawns / garden strips
GC = 4.0
GW2 = int((MAP_X1 - MAP_X0) * K / GC)
GH2 = int((MAP_Y1 - MAP_Y0) * K / GC)
flags = []
for j in range(GH2):
    py = int(MAP_Y0 + (j + 0.5) * GC / K)
    for i in range(GW2):
        px = int(MAP_X0 + (i + 0.5) * GC / K)
        flags.append("1" if cls[py, px] in (0, 2) else "0")
out["grassW"], out["grassH"], out["grassCell"] = GW2, GH2, GC
out["grassMask"] = "".join(flags)
print("grass mask", GW2, "x", GH2, "cells =", out["grassMask"].count("1"), "green")

print("avenue points:", len(ave), "lamps:", len(out["lamps"]))
json.dump(out, open(os.path.join(WS, "su-campus.json"), "w"))
print("exported buildings:", len(out["buildings"]), "trees:", len(out["trees"]),
      "ids:", [b["id"] for b in out["buildings"]])

ver = cv2.resize(RGB, (1200, 1200), interpolation=cv2.INTER_AREA)
sc = 1200.0 / W
for b in out["buildings"]:
    for poly in b["polys"]:
        pts = np.array([[(x / K + CX) * sc, (y / K + CY) * sc] for x, y in poly], np.int32)
        cv2.polylines(ver, [pts], True, (255, 0, 0), 2)
cv2.imwrite(os.path.join(WS, "su-verify.png"), ver)
print("verification saved")
