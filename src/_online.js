/* =====================================================================
   نظام اللعب الأونلاين — MQTT عبر WebSocket
   يعمل من صفحة GitHub Pages الساكنة بلا خادم خاص وبلا حساب.
   المواضيع:
     su3d/sohar/v1/state   → الحالة (حضور / موقع / دردشة)
   الرسائل:
     hi  → {id,name,uni,ch,x,z,ry,visitor}
     pos → {id,x,z,y,ry,st}
     say → {id,name,m}
     bye → {id}
   ===================================================================== */

/* =====================================================================
   1) هوية الدخول: آيدي الجامعة + الاسم + الشخصية
   ===================================================================== */
const ENTRY = (function () {
  const E = { id: '', name: '', uni: '', ch: 'f', visitor: false, done: false };
  const box = () => document.getElementById('entry');

  function pickChar(k) {
    E.ch = k;
    const m = document.getElementById('enM'), f = document.getElementById('enF');
    if (m) m.classList.toggle('on', k === 'm');
    if (f) f.classList.toggle('on', k === 'f');
    try { useChar(k); } catch (e) { }
  }
  function err(t) {
    const e = document.getElementById('enErr');
    if (e) { e.textContent = t || ''; e.style.display = t ? 'block' : 'none'; }
  }
  function enter(visitor) {
    const nm = (document.getElementById('enName').value || '').trim();
    const ui = (document.getElementById('enId').value || '').trim();
    if (nm.length < 2) { err('اكتب اسمك من فضلك'); return; }
    if (!visitor) {
      if (ui.length < 3) { err('اكتب آيدي الجامعة (3 أحرف على الأقل)'); return; }
      if (!/^[A-Za-z0-9\-\/_]{3,16}$/.test(ui)) { err('آيدي الجامعة يجب أن يكون حروفاً/أرقاماً فقط'); return; }
    }
    E.name = nm.slice(0, 24);
    E.uni = visitor ? '' : ui.slice(0, 16);
    E.visitor = !!visitor;
    E.done = true;
    err('');
    const b = box(); if (b) b.classList.add('gone');
    if (typeof ENTRY.onDone === 'function') ENTRY.onDone(E);
  }
  function show(defChar) {
    const b = box(); if (!b) return;
    b.classList.remove('gone');
    pickChar(defChar || 'f');
    const m = document.getElementById('enM'), f = document.getElementById('enF');
    if (m) m.onclick = () => pickChar('m');
    if (f) f.onclick = () => pickChar('f');
    const go = document.getElementById('enGo');
    if (go) go.onclick = () => enter(false);
    const gu = document.getElementById('enGuest');
    if (gu) gu.onclick = () => enter(true);
    const idf = document.getElementById('enId');
    const nmf = document.getElementById('enName');
    if (idf) idf.addEventListener('input', () => { if (!idf.value) idf.disabled = false; });
    if (nmf) setTimeout(() => nmf.focus(), 400);
  }
  return { E: E, show: show, pick: pickChar };
})();

/* =====================================================================
   2) فلتر المحتوى: يمنع أرقام الجوال والإيميلات وحسابات التواصل
   ===================================================================== */
const CHAT_GUARD = (function () {
  const RULES = [
    { re: /[0-9٠-٩]{7,}/, why: 'رقم هاتف أو رقم طويل' },
    { re: /[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, why: 'بريد إلكتروني' },
    { re: /(^|\s)@[A-Za-z0-9_]{3,}/, why: 'معرّف حساب تواصل' },
    { re: /https?:\/\/|www\.|t\.me\/|wa\.me|whatsapp|instagram|twitter|tiktok|snapchat|telegram/i, why: 'رابط أو حساب تواصل خارجي' },
    { re: /\b(?:\+?\d[\s\-().]?){7,}\b/, why: 'رقم هاتف' }
  ];
  /* نتحقق من الأرقامSequences داخل النص العربي أيضاً */
  function bad(txt) {
    const t = String(txt || '');
    for (const r of RULES) if (r.re.test(t)) return r.why;
    /* تسلسل 6 أرقام أو أكثر بأي فواصل */
    if (/(?:\d[\s\-().]*){6,}\d/.test(t)) return 'رقم هاتف';
    /* تسلسل 4 حروف صغيرة متبوعة بأرقام = معرّف */
    if (/\b[a-z]{3,}\d{3,}\b/i.test(t)) return 'معرّف حساب';
    return null;
  }
  return { check: bad };
})();

/* =====================================================================
   3) الشبكة
   ===================================================================== */
const NET = (function () {
  const ST = {
    urls: [
      'wss://broker.hivemq.com:8884/mqtt',
      'wss://broker.emqx.io:8084/mqtt',
      'wss://test.mosquitto.org:8081/mqtt'
    ],
    url: 'wss://broker.hivemq.com:8884/mqtt',
    bi: 0,
    topic: 'su3d/sohar/v1/state',
    id: '', name: '', uni: '', visitor: false,
    client: null, ok: false, status: 'off', err: '',
    peers: {}, pubT: 0, unread: 0, group: null, maxPeers: 24
  };

  const NAMES = ['طالب', 'زائر', 'قارئ', 'باحث', 'متعلّم', 'مدرّب', 'ضيف', 'مستكشف'];
  function randName() {
    const n = NAMES[Math.floor(Math.random() * NAMES.length)];
    return n + ' ' + (10 + Math.floor(Math.random() * 90));
  }
  function mkId() {
    const r = new Uint8Array(6);
    const cr = (window.crypto || window.msCrypto);
    if (cr && cr.getRandomValues) cr.getRandomValues(r);
    else for (let i = 0; i < 6; i++) r[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(r, b => b.toString(16).padStart(2, '0')).join('');
  }
  function label() {
    if (ST.visitor) return ST.name + ' (زائر)';
    return ST.name + ' · ' + ST.uni;
  }

  /* ---------- بطاقات الأسماء وفقاعات الكلام ---------- */
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function makeSprite(text, opt) {
    opt = opt || {};
    const fs = opt.fs || 30, pad = 13, maxW = 620;
    const c = document.createElement('canvas');
    let g = c.getContext('2d');
    g.font = 'bold ' + fs + 'px Cairo, Tahoma, sans-serif';
    let w = Math.ceil(g.measureText(text).width) + pad * 2;
    const lines = [];
    if (w > maxW) {
      /* تقسيم النص إلى سطرين */
      const words = text.split(' ');
      let cur = '';
      for (const wd of words) {
        if (g.measureText(cur + ' ' + wd).width > maxW - pad * 2 && cur) { lines.push(cur); cur = wd; }
        else cur = cur ? cur + ' ' + wd : wd;
      }
      if (cur) lines.push(cur);
      c.height = fs * lines.length + pad * 2;
      g = c.getContext('2d');
      g.font = 'bold ' + fs + 'px Cairo, Tahoma, sans-serif';
      w = Math.ceil(Math.max.apply(null, lines.map(l => g.measureText(l).width))) + pad * 2;
    } else {
      c.height = fs + pad * 2;
    }
    c.width = Math.max(40, w);
    g = c.getContext('2d');
    g.font = 'bold ' + fs + 'px Cairo, Tahoma, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.direction = 'rtl';
    g.fillStyle = opt.bg || 'rgba(8,28,38,.86)';
    roundRect(g, 1, 1, c.width - 2, c.height - 2, 12); g.fill();
    g.strokeStyle = opt.br || 'rgba(255,255,255,.22)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = opt.fg || '#f0d79a';
    if (lines.length) {
      lines.forEach((l, i) => g.fillText(l, c.width / 2, pad + fs * (i + .5)));
    } else g.fillText(text, c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(c.width / 105, c.height / 105, 1);
    s.renderOrder = 999;
    return s;
  }
  const HUES = ['#f0d79a', '#9fd8ff', '#ffd0a0', '#c8f7c0', '#f2b8ff', '#ffe9a8', '#a9e6ff'];

  /* فقاعة الكلام فوق الرأس */
  const bubbles = [];
  function bubble(text, holder, y) {
    const s = makeSprite(text, { fs: 28, bg: 'rgba(12,40,54,.92)', br: 'rgba(201,154,59,.75)', fg: '#F5EEE0' });
    s.position.set(0, y, 0);
    holder.add(s);
    bubbles.push({ s: s, t: 0, life: 6.5, y0: y });
    return s;
  }
  function bubbleTick(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.t += dt;
      const k = b.t / b.life;
      b.s.position.y = b.y0 + Math.min(.35, b.t * .5);
      const o = k < .85 ? 1 : Math.max(0, 1 - (k - .85) / .15);
      b.s.material.opacity = o;
      if (b.t >= b.life) {
        if (b.s.parent) b.s.parent.remove(b.s);
        b.s.material.map.dispose(); b.s.material.dispose();
        bubbles.splice(i, 1);
      }
    }
  }

  /* ---------- الأقران ---------- */
  function peer(id, name, kind, uni, visitor) {
    if (ST.peers[id]) {
      const k = ST.peers[id];
      if (name) k.name = name;
      if (kind === 'f' || kind === 'm') k.kind = kind;
      if (uni !== undefined) k.uni = uni;
      if (visitor !== undefined) k.visitor = visitor;
      return k;
    }
    if (Object.keys(ST.peers).length >= ST.maxPeers) return null;
    const g = new THREE.Group();
    ST.group.add(g);
    const p = {
      id: id, name: name || 'طالب', uni: uni || '', visitor: !!visitor,
      kind: kind === 'f' ? 'f' : 'm',
      g: g, tx: 0, tz: 0, ry: 0, tgtY: 0, seen: Date.now(),
      rig: null, lbl: null, hue: HUES[Math.floor(Math.random() * HUES.length)],
      lblTxt: ''
    };
    ST.peers[id] = p;
    const r = buildOmani(p.kind);
    if (r && typeof r.then === 'function') {
      r.then(rr => { if (!p.rig) { p.rig = rr; g.add(rr.root); } })
        .catch(e => console.error('[peer]', e));
    } else { g.add(r.root); p.rig = r; }
    const sp = makeSprite(p.name + (p.uni ? ' · ' + p.uni : '') + (p.visitor ? ' (زائر)' : ''), { fs: 27, fg: p.hue });
    sp.position.set(0, 2.05, 0);
    g.add(sp); p.lbl = sp;
    return p;
  }
  function dropPeer(id) {
    const p = ST.peers[id]; if (!p) return;
    if (p.g.parent) p.g.parent.remove(p.g);
    delete ST.peers[id];
  }

  /* ---------- الإرسال ---------- */
  function send(o) {
    if (!ST.ok || !ST.client) return;
    try { ST.client.publish(ST.topic, JSON.stringify(o), { qos: 0, retain: false }); } catch (e) { }
  }
  function publishState() {
    if (!ST.ok || typeof ch === 'undefined' || !ch) return;
    send({
      t: 'pos', id: ST.id,
      x: +ch.position.x.toFixed(2), z: +ch.position.z.toFixed(2),
      y: +ch.position.y.toFixed(2), ry: +ch.rotation.y.toFixed(3),
      st: (typeof cState !== 'undefined' && cState) ? cState : 'idle'
    });
  }
  function announce() {
    send({
      t: 'hi', id: ST.id, name: ST.name, uni: ST.uni, visitor: ST.visitor, ch: ST.ch,
      x: (typeof ch !== 'undefined' && ch) ? ch.position.x : 0,
      z: (typeof ch !== 'undefined' && ch) ? ch.position.z : 0,
      ry: (typeof ch !== 'undefined' && ch) ? ch.rotation.y : 0
    });
  }

  let annTick = 0;
  function beat() {
    annTick++;
    publishState();
    if (annTick % 8 === 0) announce();
  }

  /* ---------- الاستقبال ---------- */
  function onMsg(topic, buf) {
    let o; try { o = JSON.parse(buf.toString()); } catch (e) { return; }
    if (!o || o.id === ST.id) return;
    if (o.t === 'bye') { dropPeer(o.id); updCount(); return; }
    if (o.t === 'say') {
      const p = ST.peers[o.id];
      chatAdd(o.name || 'طالب', o.m, false);
      if (p && p.g) bubble(o.m, p.g, 2.28);
      return;
    }
    if (o.t === 'hi') {
      const p = peer(o.id, o.name, o.ch, o.uni, o.visitor);
      if (p) {
        p.seen = Date.now();
        p.tx = o.x || 0; p.tz = o.z || 0; p.ry = o.ry || 0; p.tgtY = o.y || 0;
        p.g.position.set(p.tx, p.tgtY, p.tz); p.g.rotation.y = p.ry;
        const txt = p.name + (p.uni ? ' · ' + p.uni : '') + (p.visitor ? ' (زائر)' : '');
        if (txt !== p.lblTxt && p.lbl) {
          p.lblTxt = txt;
          const old = p.lbl;
          const sp = makeSprite(txt, { fs: 27, fg: p.hue });
          sp.position.set(0, 2.05, 0);
          p.g.add(sp); p.lbl = sp;
          if (old && old.parent) p.g.remove(old);
        }
      }
      updCount(); return;
    }
    if (o.t === 'pos') {
      const known = ST.peers[o.id];
      const p = peer(o.id, (known && known.name) || 'طالب', o.ch || (known && known.kind) || 'm',
        known ? known.uni : undefined, known ? known.visitor : undefined);
      if (!p) return;
      p.seen = Date.now();
      p.tx = o.x; p.tz = o.z;
      if (o.y !== undefined) p.tgtY = o.y;
      p.ry = o.ry;
      if (!known) announce();
      updCount();
      return;
    }
  }

  /* ---------- الدردشة ---------- */
  function chatAdd(who, txt, mine) {
    const log = document.getElementById('chatLog');
    if (!log) return;
    const d = document.createElement('div');
    d.className = 'msg' + (mine ? ' mine' : '');
    const b = document.createElement('b'); b.textContent = who;
    const s = document.createElement('span'); s.textContent = txt;
    d.appendChild(b); d.appendChild(s);
    log.appendChild(d);
    while (log.children.length > 120) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    if (!mine) {
      ST.unread++; updBadge();
      const p = document.getElementById('chat');
      if (p && p.hidden) { if (typeof toast === 'function') toast(who + ': ' + txt, 3000); }
    }
  }
  function updBadge() {
    const b = document.getElementById('chatBadge');
    if (!b) return;
    b.textContent = ST.unread > 99 ? '99+' : (ST.unread || '');
    b.style.display = ST.unread ? 'inline-block' : 'none';
  }
  function updCount() {
    const c = document.getElementById('chatCount');
    if (!c) return;
    const n = Object.keys(ST.peers).length;
    c.textContent = n ? (n + ' متصل الآن') : 'لا يوجد آخرون بعد';
  }
  function setStatus() {
    const el = document.getElementById('chatStatus');
    if (!el) return;
    const m = {
      on: 'متصل — يظهر الطلاب لحظياً',
      wait: 'جارٍ إعادة الاتصال…',
      off: 'غير متصل',
      err: 'تعذّر الاتصال: ' + (ST.err || ''),
      nolib: 'مكتبة الشبكة غير متوفرة'
    };
    el.textContent = m[ST.status] || '';
    el.className = 'st ' + ST.status;
  }

  /* ---------- التشغيل ---------- */
  function init(identity) {
    const E = (identity && identity.id !== undefined) ? identity : ENTRY.E;
    ST.id = mkId();
    ST.name = E.name || randName();
    ST.uni = E.uni || '';
    ST.visitor = !!E.visitor;
    ST.ch = E.ch || 'f';

    ST.group = new THREE.Group();
    ST.group.name = 'netpeers';
    if (typeof S !== 'undefined' && S && S.add) S.add(ST.group);

    if (typeof mqtt === 'undefined') {
      ST.status = 'nolib'; ST.err = 'مكتبة MQTT غير محمّلة';
      updCount(); setStatus(); return;
    }
    let cl = null, fails = 0, rotating = false;

    function connect() {
      if (rotating) return;
      ST.url = ST.urls[ST.bi % ST.urls.length];
      try {
        cl = mqtt.connect(ST.url, {
          clientId: 'su3d_' + ST.id + '_' + Math.floor(Math.random() * 1000),
          protocolVersion: 4, clean: true, reconnectPeriod: 5000,
          connectTimeout: 12000, keepalive: 45
        });
        ST.client = cl;
        cl.on('connect', () => {
          fails = 0; ST.ok = true; ST.status = 'on'; ST.err = '';
          cl.subscribe(ST.topic, { qos: 0 }, () => { announce(); publishState(); });
          updCount(); setStatus();
        });
        cl.on('reconnect', () => { ST.status = 'wait'; setStatus(); });
        cl.on('offline', () => { ST.ok = false; ST.status = 'off'; setStatus(); });
        cl.on('error', e => {
          ST.err = (e && e.message) ? e.message : 'خطأ اتصال';
          ST.status = 'err'; setStatus();
        });
        cl.on('close', () => {
          ST.ok = false;
          if (ST.status !== 'off') ST.status = 'wait';
          setStatus();
          if (!ST.ok && ++fails >= 2 && !rotating) {
            rotating = true;
            ST.bi++; fails = 0;
            try { if (cl) cl.end(true); } catch (_) { }
            setTimeout(() => { rotating = false; connect(); }, 2500);
          }
        });
        cl.on('message', onMsg);
      } catch (e) {
        ST.status = 'err'; ST.err = String((e && e.message) || e); setStatus();
      }
    }
    connect();

    /* --- نبض الحضور: Web Worker حتى لا تتجمّد التبويبات الخلفية --- */
    try {
      const workerSrc = "setInterval(function(){postMessage(1);},1200);";
      const wurl = URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' }));
      ST.worker = new Worker(wurl);
      ST.worker.onmessage = () => { beat(); };
      setTimeout(() => URL.revokeObjectURL(wurl), 5000);
    } catch (e) {
      if (ST.pubTimer) clearInterval(ST.pubTimer);
      ST.pubTimer = setInterval(() => { beat(); }, 1200);
    }
    /* احتياطي: مؤقّت عادي + إعادة الإعلان عند العودة للتبويب */
    if (ST.pubTimer) clearInterval(ST.pubTimer);
    ST.pubTimer = setInterval(() => { if (!document.hidden) beat(); }, 3000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { announce(); publishState(); }
    });

    /* ربط الواجهة */
    const form = document.getElementById('chatForm');
    const inp = document.getElementById('chatInput');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      if (ST.visitor) { toast('الزوار غير مسموح لهم بالكتابة في الدردشة'); return; }
      const m = (inp.value || '').trim().slice(0, 180);
      if (!m) return;
      const bad = CHAT_GUARD.check(m);
      if (bad) {
        inp.value = '';
        toast('ممنوع الإرسال — ' + bad + ' غير مسموح في الدردشة', 4200);
        const log = document.getElementById('chatLog');
        if (log) {
          const d = document.createElement('div');
          d.className = 'msg blocked';
          d.textContent = 'ممنوع الإرسال — ' + bad;
          log.appendChild(d); log.scrollTop = log.scrollHeight;
        }
        return;
      }
      inp.value = '';
      send({ t: 'say', id: ST.id, name: ST.name, m: m });
      chatAdd(ST.name, m, true);
      if (typeof ch !== 'undefined' && ch) bubble(m, ch, 2.10);
    });
    if (ST.visitor) {
      if (inp) { inp.disabled = true; inp.placeholder = 'الزوار لا يمكنهم الكتابة في الدردشة'; }
      const fb = document.getElementById('chatForm');
      if (fb) fb.classList.add('guest');
      const note = document.getElementById('chatGuestNote');
      if (note) note.style.display = 'block';
    }
    const fab = document.getElementById('chatFab');
    const panel = document.getElementById('chat');
    if (fab && panel) fab.addEventListener('click', () => {
      const was = panel.hidden;
      panel.hidden = !was;
      if (was) { ST.unread = 0; updBadge(); if (inp && !ST.visitor) inp.focus(); }
    });
    const cl2 = document.getElementById('chatClose');
    if (cl2 && panel) cl2.addEventListener('click', () => { panel.hidden = true; });
    const mb = document.getElementById('mChat');
    if (mb && panel) mb.addEventListener('click', () => {
      if (typeof menu !== 'undefined' && menu) menu.hidden = true;
      panel.hidden = false; if (inp && !ST.visitor) inp.focus();
    });
    addEventListener('beforeunload', () => {
      send({ t: 'bye', id: ST.id });
      try { if (ST.client) ST.client.end(true); } catch (e) { }
    });
    updCount(); setStatus();
  }

  /* ---------- التحديث لكل إطار ---------- */
  function tick(dt) {
    bubbleTick(dt);
    ST.pubT += dt;
    if (ST.pubT > .125) { ST.pubT = 0; publishState(); }
    if (!ST.group) return;
    const ids = Object.keys(ST.peers);
    for (const id of ids) {
      const p = ST.peers[id];
      if (Date.now() - p.seen > 180000) { dropPeer(id); updCount(); continue; }
      const g = p.g.position;
      const dx = p.tx - g.x, dz = p.tz - g.z;
      const d = Math.hypot(dx, dz);
      const k = Math.min(1, dt * 9);
      if (d > .02) { g.x += dx * k; g.z += dz * k; }
      g.y += ((p.tgtY || 0) - g.y) * Math.min(1, dt * 6);
      let a = p.ry - p.g.rotation.y;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      p.g.rotation.y += a * Math.min(1, dt * 8);
      const spd = Math.min(5.2, d / Math.max(dt, .001));
      if (p.rig && p.rig.update) p.rig.update(dt, spd);
      if (p.lbl) p.lbl.position.y = 2.05 + Math.sin(Date.now() / 600 + p.tx) * .03;
    }
  }

  function announceChar(kind) { ST.ch = kind; announce(); }

  return {
    ST: ST, init: init, tick: tick, send: send, announce: announce,
    announceChar: announceChar, updCount: updCount, bubble: bubble
  };
})();
