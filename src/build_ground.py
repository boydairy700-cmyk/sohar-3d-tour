# -*- coding: utf-8 -*-
"""High-resolution, anti-aliased campus ground texture with colours sampled from the
   real campus photography (su.edu.om virtual tour)."""
import os, sys, json
import numpy as np, cv2
from PIL import Image

sys.path.insert(0, r"C:\Users\pc i7\.minimax\sessions\mvs_6300634d1cb647159106ad0117f5e127\workspace")
os.chdir(r"C:\Users\pc i7\.minimax\sessions\mvs_6300634d1cb647159106ad0117f5e127\workspace")
import build_assets as B

WS = B.WS
MAP_X0, MAP_Y0, MAP_X1, MAP_Y1 = B.MAP_X0, B.MAP_Y0, B.MAP_X1, B.MAP_Y1

def samp(pid, cf, x0, y0, x1, y1):
    im = Image.open(os.path.join(WS, "pano", pid, "hi3", "cf%d.jpg" % cf)).convert("RGB")
    W, H = im.size
    c = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    a = np.asarray(c).reshape(-1, 3).astype(np.float32)
    return tuple(int(v) for v in np.median(a, axis=0))

LAWN = samp("node32", 0, .30, .56, .66, .70)      # manicured lawn
PATHS = samp("node33", 0, .02, .68, .28, .92)     # cream brick paving
ASPH = samp("node45", 0, .46, .62, .74, .82)      # asphalt road
PARK = samp("node5",  1, .35, .56, .78, .76)      # grey plaza tiles
DESERT = samp("node44", 0, .06, .76, .28, .94)    # sand
GARDEN = samp("node31", 1, .52, .40, .80, .54)    # shrub / garden strip
print("sampled colours:", dict(lawn=LAWN, paths=PATHS, asphalt=ASPH, parking=PARK,
                               desert=DESERT, garden=GARDEN))

OW = 4096
OH = int(OW * (MAP_Y1 - MAP_Y0) / (MAP_X1 - MAP_X0))
sub = B.cls[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1]
smask = B.build_mask[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1]

COL = {0: (104, 141, 71), 1: (214, 203, 188), 2: (93, 126, 66), 3: (109, 111, 113),
       4: (216, 190, 152), 5: (197, 198, 193), 6: (190, 182, 166)}

# anti-aliased coverage per class
cov = []
for c in range(7):
    m = (sub == c).astype(np.float32)
    if c == 6:
        m = np.maximum(m, (smask > 0).astype(np.float32))
    u = cv2.resize(m, (OW, OH), interpolation=cv2.INTER_LINEAR)
    u = cv2.GaussianBlur(u, (0, 0), 1.1)
    cov.append(u)
tot = np.zeros((OH, OW), np.float32)
for u in cov: tot += u
tot = np.maximum(tot, 1e-3)

base = np.zeros((OH, OW, 3), np.float32)
for c in range(7):
    wgt = (cov[c] / tot)[..., None]
    base += wgt * np.array(COL[c], np.float32)

# low-frequency shading from the printed plan (keeps the layout's own tonal variety)
small = cv2.resize(B.RGB[MAP_Y0:MAP_Y1, MAP_X0:MAP_X1], (OW, OH), interpolation=cv2.INTER_AREA).astype(np.float32)
dev = np.zeros_like(small)
for c in range(7):
    wgt = (cov[c] / tot)[..., None]
    m = wgt[..., 0] > .5
    if m.any():
        dev[m] = small[m] - small[m].mean(axis=0, keepdims=True)
dev *= 0.5

def noise(w, h, scale, seed):
    r = np.random.default_rng(seed)
    return cv2.resize(r.random((max(2, h // scale), max(2, w // scale))).astype(np.float32), (w, h),
                      interpolation=cv2.INTER_CUBIC)

n1, n2 = noise(OW, OH, 40, 3), noise(OW, OH, 9, 11)
out = base + dev * 0.6
out *= (0.90 + 0.18 * n1[..., None])
out += (n2[..., None] - 0.5) * 4.0

# ambient occlusion around buildings
bm = (cov[6] / tot > .5).astype(np.uint8) * 255
bm = cv2.dilate(bm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
ao = cv2.GaussianBlur(bm, (0, 0), 11).astype(np.float32) / 255.0
out *= (1.0 - 0.34 * ao[..., None])

# gentle warm/cool variation so the ground is not flat
tint = (noise(OW, OH, 260, 7)[..., None] - 0.5) * 14.0
out += tint * np.array([1.0, .96, .86], np.float32)

out = np.clip(out, 0, 255).astype(np.uint8)
cv2.imwrite(os.path.join(WS, "su-ground2.jpg"), out, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
print("ground2", OW, OH, os.path.getsize(os.path.join(WS, "su-ground2.jpg")))
