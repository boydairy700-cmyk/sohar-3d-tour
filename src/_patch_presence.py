# -*- coding: utf-8 -*-
"""Keep online presence alive even when the tab is in the background."""
import io

P = r"D:\SU3D\_online.js"
s = io.open(P, encoding="utf-8").read()

# 1) publish position on a timer (rAF pauses in hidden tabs)
OLD = """    connect();
"""
NEW = """    connect();

    /* إرسال الموقع بمؤقّت مستقل عن حلقة الرسم (تبويب الخلفية يوقف الرسم) */
    if (ST.pubTimer) clearInterval(ST.pubTimer);
    ST.pubTimer = setInterval(() => { publishState(); }, 1200);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { announce(); publishState(); }
    });
"""
assert OLD in s
s = s.replace(OLD, NEW, 1)

# 2) do not drop peers too early
s = s.replace("if (Date.now() - p.seen > 22000) { dropPeer(id); updCount(); continue; }",
              "if (Date.now() - p.seen > 75000) { dropPeer(id); updCount(); continue; }")

# 3) refresh the peer timestamp when a 'hi' arrives
OLD_HI = """    if (o.t === 'hi') {
      const p = peer(o.id, o.name, o.ch, o.uni, o.visitor);
      if (p) {
        p.tx = o.x || 0; p.tz = o.z || 0; p.ry = o.ry || 0; p.tgtY = o.y || 0;"""
NEW_HI = """    if (o.t === 'hi') {
      const p = peer(o.id, o.name, o.ch, o.uni, o.visitor);
      if (p) {
        p.seen = Date.now();
        p.tx = o.x || 0; p.tz = o.z || 0; p.ry = o.ry || 0; p.tgtY = o.y || 0;"""
assert OLD_HI in s
s = s.replace(OLD_HI, NEW_HI)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
