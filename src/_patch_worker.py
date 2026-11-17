# -*- coding: utf-8 -*-
"""Heartbeat via Web Worker so background tabs keep publishing their presence."""
import io

P = r"D:\SU3D\_online.js"
s = io.open(P, encoding="utf-8").read()

OLD = """    /* إرسال الموقع بمؤقّت مستقل عن حلقة الرسم (تبويب الخلفية يوقف الرسم) */
    if (ST.pubTimer) clearInterval(ST.pubTimer);
    ST.pubTimer = setInterval(() => { publishState(); }, 1200);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { announce(); publishState(); }
    });
"""
NEW = """    /* --- نبض الحضور: Web Worker حتى لا تتجمّد التبويبات الخلفية --- */
    try {
      const workerSrc = "setInterval(function(){postMessage(1);},1200);";
      const wurl = URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' }));
      ST.worker = new Worker(wurl);
      ST.worker.onmessage = () => { publishState(); };
      setTimeout(() => URL.revokeObjectURL(wurl), 5000);
    } catch (e) {
      if (ST.pubTimer) clearInterval(ST.pubTimer);
      ST.pubTimer = setInterval(() => { publishState(); }, 1200);
    }
    /* احتياطي: مؤقّت عادي + إعادة الإعلان عند العودة للتبويب */
    if (ST.pubTimer) clearInterval(ST.pubTimer);
    ST.pubTimer = setInterval(() => { if (!document.hidden) publishState(); }, 3000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { announce(); publishState(); }
    });
"""
assert OLD in s
s = s.replace(OLD, NEW)

# tolerate slower heartbeats from players whose tab is in the background
s = s.replace("if (Date.now() - p.seen > 75000) { dropPeer(id); updCount(); continue; }",
              "if (Date.now() - p.seen > 180000) { dropPeer(id); updCount(); continue; }")

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
