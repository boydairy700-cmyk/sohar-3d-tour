# -*- coding: utf-8 -*-
import io, sys

P = r'D:\SU3D\_online.js'
s = io.open(P, encoding='utf-8').read()
orig = s

def rep(a, b, tag):
    global s
    if a not in s:
        print('MISS', tag); sys.exit(1)
    if s.count(a) != 1:
        print('DUP', tag, s.count(a)); sys.exit(1)
    s = s.replace(a, b)
    print('ok', tag)

# 1) حدّث الاسم عند وصول 'hi' لقرين أُنشئ مسبقاً عبر 'pos'
rep(
"""    if (ST.peers[id]) {
      const k = ST.peers[id];
      if (uni !== undefined) k.uni = uni;""",
"""    if (ST.peers[id]) {
      const k = ST.peers[id];
      if (name) k.name = name;
      if (kind === 'f' || kind === 'm') k.kind = kind;
      if (uni !== undefined) k.uni = uni;""",
'peer-name')

# 2) نبضة حضور: 'hi' دوري حتى يكتشف المتأخرون الأسماء
rep(
"""  /* ---------- الاستقبال ---------- */""",
"""  let annTick = 0;
  function beat() {
    annTick++;
    publishState();
    if (annTick % 8 === 0) announce();
  }

  /* ---------- الاستقبال ---------- */""",
'beat-fn')

# 3) حدّث العدّاد فور وصول 'pos' (المشكلة الأساسية) + ردّ الهوية لقرين جديد
rep(
"""      if (o.y !== undefined) p.tgtY = o.y;
      p.ry = o.ry;
      return;
    }""",
"""      if (o.y !== undefined) p.tgtY = o.y;
      p.ry = o.ry;
      if (!known) announce();
      updCount();
      return;
    }""",
'pos-count')

# 4) استخدم beat في كل المؤقتات
rep(
"""      ST.worker.onmessage = () => { publishState(); };""",
"""      ST.worker.onmessage = () => { beat(); };""",
'worker-beat')

rep(
"""      ST.pubTimer = setInterval(() => { publishState(); }, 1200);""",
"""      ST.pubTimer = setInterval(() => { beat(); }, 1200);""",
'fallback-beat')

rep(
"""    ST.pubTimer = setInterval(() => { if (!document.hidden) publishState(); }, 3000);""",
"""    ST.pubTimer = setInterval(() => { if (!document.hidden) beat(); }, 3000);""",
'visible-beat')

# 5) أعِد الإعلان عند العودة للتبويب
rep(
"""      if (!document.hidden) { announce(); publishState(); }""",
"""      if (!document.hidden) { announce(); publishState(); }""",
'visibility-ok')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('written', len(s))
