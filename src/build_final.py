# -*- coding: utf-8 -*-
"""Assemble the final single-file tour (v4): head + app + embedded assets."""
import base64, io, json, os, sys

WS = r"D:\SU3D"
LITE = "--lite" in sys.argv
PIX1 = ("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
        "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA"
        "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==")

head = io.open(os.path.join(WS, "_v3_head.html"), encoding="utf-8").read()
app = io.open(os.path.join(WS, "_v3_app.js"), encoding="utf-8").read()
charlib = io.open(os.path.join(WS, "_char3.js"), encoding="utf-8").read()
bldlib = io.open(os.path.join(WS, "_bldgen.js"), encoding="utf-8").read()
treelib = io.open(os.path.join(WS, "_treelib.js"), encoding="utf-8").read()
onlinelib = io.open(os.path.join(WS, "_online.js"), encoding="utf-8").read()
# ---- نماذج الشخصيات الحقيقية (Rocketbox) تُدمج base64 داخل الملف ----
# تُستخدم النسخ المضغوطة (weld + ضغط خامات) إن وُجدت
def _pick(base, optname=None):
    """اختيار النسخة المضغوطة إن وُجدت، وإلا الأصل."""
    c = os.path.join(WS, "assets", "pack", base + "_c.glb")
    if os.path.exists(c):
        return c
    if optname:
        p = os.path.join(WS, "opt", optname)
        if os.path.exists(p):
            return p
    return os.path.join(WS, "assets", "pack", base)

CHARS = {
    "/*RB_M*/": _pick("rb_male"),
    "/*RB_F*/": _pick("rb_female"),
    "/*RB_A*/": os.path.join(WS, "dl_rb_anims.glb"),
}
char_bytes = 0
for tag, p in CHARS.items():
    if os.path.exists(p):
        char_bytes += os.path.getsize(p)
        charlib = charlib.replace(tag, base64.b64encode(open(p, "rb").read()).decode())
    else:
        print("WARN: char model missing ->", p)
        charlib = charlib.replace(tag, "")
app = app.replace("/*CHARLIB*/", charlib)
app = app.replace("/*BLDLIB*/", bldlib)
app = app.replace("/*TREELIB*/", treelib)
app = app.replace("/*ONLINE*/", onlinelib)

# ---- تضمين مكتبات three.js محلياً حتى يعمل الملف بدون إنترنت ----
for dead in ("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/fflate.min.js",
             "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js"):
    head = head.replace('<script src="%s"></script>\n' % dead, "")

INLINE = {
    "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js": "_lib_three.js",
    "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js": "_lib_qrcode.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js": "_lib_gltf.js",
}
# مكتبة MQTT تُدمج محلياً أيضاً (تعمل بلا إنترنت حتى وإن تعذّر الوصول للوسيط)
MQTT_TAG = '<script src="mqtt.min.js"></script>'
if MQTT_TAG in head:
    src = io.open(os.path.join(WS, "_lib_mqtt.js"), encoding="utf-8").read()
    if "</script" in src:
        src = src.replace("</script", "<\\/script")
    head = head.replace(MQTT_TAG, "<script>\n" + src + "\n</script>")
else:
    print("WARN: mqtt tag not found")
for url, fn in INLINE.items():
    tag = '<script src="%s"></script>' % url
    if tag not in head:
        print("WARN: external tag not found ->", url)
        continue
    src = io.open(os.path.join(WS, fn), encoding="utf-8").read()
    if "</script" in src:
        src = src.replace("</script", "<\\/script")
    head = head.replace(tag, "<script>\n" + src + "\n</script>")

def b64(path):
    return base64.b64encode(open(path, "rb").read()).decode()

A = os.path.join(WS, "assets")
campus = io.open(os.path.join(WS, "su-campus.json"), encoding="utf-8").read()
ground = b64(os.path.join(WS, "opt", "su-ground2.jpg")) if os.path.exists(os.path.join(WS, "opt", "su-ground2.jpg")) else b64(os.path.join(WS, "su-ground2.jpg"))
# الشخصيات مبنية هندسياً داخل اللعبة — لا نماذج خارجية تُدمج (توفير ~4.5 م.ب)
chm = ""
chf = ""

IMGS = {
    "BARK": "bark.jpg", "BARKN": "bark_n.jpg", "GRASS": "grass.jpg",
    "GRASSN": "grass_n.jpg", "PAVE": "pave_cream.jpg",
    "LEAF0": "leaf0.png", "LEAF1": "leaf1.png", "LEAF2": "leaf2.png", "TUFT": "tuft.png",
}
FAC_KEYS = []

blobs = {}
for tag, fn in IMGS.items():
    p = os.path.join(A, fn)
    po = os.path.join(WS, "opt", fn)
    if os.path.exists(po):
        blobs["__BLOB_%s__" % tag] = b64(po)
    else:
        blobs["__BLOB_%s__" % tag] = b64(p) if os.path.exists(p) else ""

# ---- الأشجار والنباتات الحقيقية (نماذج مدمجة في assets/pack) ----
TREEMAP = {
    "__BLOB_TR_PALM__":    "palm_detailed",
    "__BLOB_TR_QUIVER1__": "quiver_tree_01",
    "__BLOB_TR_QUIVER2__": "quiver_tree_02",
    "__BLOB_TR_ALOE__":    "potted_plant_04",
    "__BLOB_TR_SHRUB3__":  "shrub_03",
    "__BLOB_TR_POTTED__":  "potted_plant_02",
    "__BLOB_TR_SEAT__":    "modular_street_seating",
}
tree_bytes = 0
for tag, src_id in TREEMAP.items():
    p = _pick(src_id)
    if os.path.exists(p):
        blobs[tag] = b64(p)
        tree_bytes += os.path.getsize(p)
    else:
        print("WARN: tree model missing ->", src_id)
        blobs[tag] = ""

FACCFG = {
    "1":  ["lang", 14, 3.8], "2": ["cit", 12, 3.6], "3": ["eng", 16, 4.5],
    "4":  ["eng2", 5.5, 3.2], "5": ["admin", 16, 3.4], "6": ["theatre", 10, 4.0],
    "7":  ["pink3", 14, 3.8], "8": ["cit", 12, 3.6], "9": ["eng", 16, 4.5],
    "11": ["arcade", 10, 3.6], "12": ["campus", 14, 3.6], "13": ["pink1", 12, 3.6],
    "14": ["cream", 12, 3.6], "15": ["cream", 12, 3.6], "16": ["health", 14, 3.6],
    "20": ["lang2", 12, 3.6],
}
# أبعاد صور الواجهات الحقيقية (تُحسب من الملفات) لتُربط بشكل صحيح دون قصّ
try:
    from PIL import Image
    def _asp(fn):
        p = os.path.join(A, fn)
        if not os.path.exists(p):
            return 1.75
        with Image.open(p) as im:
            w, h = im.size
        return round(float(w) / float(h), 4)
    for bid, cfg in FACCFG.items():
        cfg.append(_asp("fac_%s.jpg" % cfg[0]))
except Exception as e:
    print("aspect calc skipped:", e)
faccfg = json.dumps(FACCFG, ensure_ascii=False)

app = app.replace("__BLOB_CAMPUS__", campus)
app = app.replace("__BLOB_GROUND__", ground)
app = app.replace("'__BLOB_CHM__'", "'" + chm + "'")
app = app.replace("'__BLOB_CHF__'", "'" + chf + "'")
for tag, val in blobs.items():
    app = app.replace(tag, val)

leftover = [l[:120] for l in app.split("\n") if "__BLOB" in l]
assert not leftover, leftover[:3]

if LITE:
    app = app.replace("'" + chm + "'", "''").replace("'" + chf + "'", "''")
    for tag, val in blobs.items():
        if tag.startswith("__BLOB_FAC"): continue
        if tag.startswith("__BLOB_TR_"): app = app.replace(val, "")   # لا أشجار في النسخة الخفيفة
        else: app = app.replace(val, PIX1 if tag.endswith("N__") is False and "LEAF" not in tag and "TUFT" not in tag else "")
    out = head.replace("/*APP*/", app)
    path = os.path.join(WS, "_lite.html")
else:
    out = head.replace("/*APP*/", app)
    name = "جامعة صحار — جولة ثلاثية الأبعاد (v4).html"
    path = os.path.join(WS, name)
io.open(path, "w", encoding="utf-8", newline="\n").write(out)
if not LITE:
    io.open(os.path.join(WS, "_v4.html"), "w", encoding="utf-8", newline="\n").write(out)
    site = os.path.join(WS, "site")
    if not os.path.isdir(site): os.makedirs(site)
    io.open(os.path.join(site, "index.html"), "w", encoding="utf-8", newline="\n").write(out)
print("written", os.path.basename(path), os.path.getsize(path), "| trees raw %.2f MB" % (tree_bytes / 1048576))
