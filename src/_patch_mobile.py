# -*- coding: utf-8 -*-
import io, sys

def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for tag, a, b in pairs:
        if a not in s:
            print('MISS', path, tag); sys.exit(1)
        if s.count(a) != 1:
            print('DUP', path, tag, s.count(a)); sys.exit(1)
        s = s.replace(a, b)
        print('ok', tag)
    io.open(path, 'w', encoding='utf-8', newline='').write(s)

# ============ 1) إصلاح خطأ التكبير بإصبعين (o[0].x) ============
patch(r'D:\SU3D\_v3_app.js', [
 ('pinch',
  """  if (ptr.size === 2) {
    const o = Array.prototype.slice.call(ptr.values()), d0 = Math.hypot(o[0].x - o[1].x, o[0].y - o[1].y);
    p.x = e.clientX; p.y = e.clientY;
    const d1 = Math.hypot(o[0].x - o[1].x, o[0].y - o[1].y);
    if (d1 > 0) zoom(d0 / d1);
    st.m += 99; return;
  }""",
  """  if (ptr.size >= 2) {
    /* Map.values() مُكرِّر وليس مصفوفة — Array.from ضرورية (وإلا o[0] = undefined) */
    const o = Array.from(ptr.values());
    if (o.length < 2) { p.x = e.clientX; p.y = e.clientY; return; }
    const d0 = Math.hypot(o[0].x - o[1].x, o[0].y - o[1].y);
    p.x = e.clientX; p.y = e.clientY;
    const d1 = Math.hypot(o[0].x - o[1].x, o[0].y - o[1].y);
    if (d1 > 0) zoom(d0 / d1);
    st.m += 99; return;
  }"""),
])

# ============ 2) نقل الخريطة إلى أعلى اليسار + تحرير عصا التحليق ============
patch(r'D:\SU3D\_v3_head.html', [
 # الخريطة: أعلى اليسار بدل أسفل اليسار
 ('mm-top',
  """#mmwrap{position:fixed;inset-inline-end:calc(10px + var(--safeR));bottom:calc(150px + var(--safeB));z-index:10;""",
  """#mmwrap{position:fixed;inset-inline-end:calc(10px + var(--safeR));top:calc(68px + var(--safeT));bottom:auto;z-index:10;"""),
 # الإخفاء: ينزلق للأعلى بدل للأسفل
 ('mm-hide',
  """#mmwrap.hidden{transform:translateY(140%);opacity:0;pointer-events:none}""",
  """#mmwrap.hidden{transform:translateY(-150%);opacity:0;pointer-events:none}"""),
 # زر القفز: يمين الشاشة فوق زر الدردشة (كان فوق عصا التحكم)
 ('jb-right',
  """#jb{position:fixed;inset-inline-end:calc(16px + var(--safeR));bottom:calc(96px + var(--safeB));z-index:12;""",
  """#jb{position:fixed;inset-inline-start:calc(16px + var(--safeL));bottom:calc(164px + var(--safeB));z-index:12;"""),
 # شاشات صغيرة: الخريطة أعلى + رسالة التنبيه لا تغطي عصا التحكم
 ('mm-narrow',
  """  #mmwrap canvas{width:104px;height:110px}
  #mmwrap{bottom:calc(132px + var(--safeB))}
  #toast{bottom:calc(132px + var(--safeB));font-size:12px}""",
  """  #mmwrap canvas{width:104px;height:110px}
  #mmwrap{top:calc(62px + var(--safeT));bottom:auto}
  #jb{bottom:calc(214px + var(--safeB))}
  #toast{bottom:calc(132px + var(--safeB));font-size:12px;
    left:calc(148px + var(--safeL));right:calc(10px + var(--safeR));transform:none;max-width:none}"""),
 # أفقي قصير
 ('mm-land',
  """  #mmwrap{bottom:calc(74px + var(--safeB))}""",
  """  #mmwrap{top:calc(56px + var(--safeT));bottom:auto}"""),
])
print('done')
