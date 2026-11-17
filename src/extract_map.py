# -*- coding: utf-8 -*-
"""Extract real building footprints from the official Sohar University map."""
import json, os
import numpy as np
import cv2
import pymupdf

WS = r"C:\Users\pc i7\.minimax\sessions\mvs_6300634d1cb647159106ad0117f5e127\workspace"
doc = pymupdf.open(os.path.join(WS, "su-official-map.pdf"))
pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(1.0, 1.0))
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
H, W = img.shape[:2]
S = 3034.0 / 1396.0   # preview(1396) -> page px

# anchors read off the official map preview image (1396 px space)
ANCHORS = {
    1: (782, 1063), 2: (782, 962), 3: (780, 872), 4: (830, 775), 5: (470, 862),
    6: (480, 940), 7: (800, 555), 8: (475, 740), 9: (350, 800), 10: (702, 770),
    11: (1063, 462), 12: (380, 1150), 13: (860, 255), 14: (605, 990), 15: (620, 665),
    16: (492, 480), 17: (945, 890), 18: (955, 745), 19: (1175, 483), 20: (385, 483),
}
MAP_X0 = int(508)

def sample(px, py, r=7):
    x, y = int(px), int(py)
    p = img[max(0, y - r):y + r, max(0, x - r):x + r].reshape(-1, 3)
    p = p[p.sum(axis=1) < 700]
    if not len(p):
        return None
    return tuple(int(v) for v in np.median(p, axis=0))

out = {}
for row, (ax, ay) in sorted(ANCHORS.items()):
    px, py = ax * S, ay * S
    col = sample(px, py)
    if col is None:
        print("row %2d : NO SAMPLE" % row); continue
    m = (np.abs(img.astype(np.int16) - np.array(col, np.int16)).sum(axis=2) < 90).astype(np.uint8) * 255
    m[:, :MAP_X0] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m, 8)
    best, bd = None, 1e18
    for i in range(1, n):
        a = int(stats[i, cv2.CC_STAT_AREA])
        if a < 400:
            continue
        d = ((cent[i][0] - px) ** 2 + (cent[i][1] - py) ** 2) ** 0.5
        if d < bd:
            bd, best = d, i
    if best is None:
        print("row %2d col=%s : NO COMPONENT" % (row, col)); continue
    x, y, w, h = (int(stats[best, cv2.CC_STAT_LEFT]), int(stats[best, cv2.CC_STAT_TOP]),
                  int(stats[best, cv2.CC_STAT_WIDTH]), int(stats[best, cv2.CC_STAT_HEIGHT]))
    mask = (lab == best).astype(np.uint8) * 255
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
    polys = []
    for cnt in cnts[:8]:
        if cv2.contourArea(cnt) < 500:
            continue
        ap = cv2.approxPolyDP(cnt, 0.0035 * cv2.arcLength(cnt, True), True)
        if len(ap) > 44:
            ap = cv2.approxPolyDP(cnt, 0.010 * cv2.arcLength(cnt, True), True)
        pts = ap.reshape(-1, 2).astype(float)
        polys.append([[float(p[0]), float(p[1])] for p in pts])
    out[row] = {"bgr": list(col), "bbox": [x, y, w, h], "area": int(stats[best, cv2.CC_STAT_AREA]),
                "poly": polys[0] if polys else [], "polys": polys}
    print("row %2d col=%-18s area=%8d bbox=%-28s d=%6.1f pts=%s" %
          (row, col, out[row]["area"], [x, y, w, h], bd, [len(p) for p in polys]))

json.dump({"page": [W, H], "map_x0": MAP_X0, "buildings": out},
          open(os.path.join(WS, "_raw_map.json"), "w"))
print("saved _raw_map.json")
