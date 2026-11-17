/* =====================================================================
   مولّد المباني ثلاثية الأبعاد — مجسمات معمارية عمانية بلا صور
   يُستدعى من _v3_app.js:  makeBuildings(SU, campus, ctx)
   ===================================================================== */
function makeBuildings(SU, campus, ctx) {
  const { M, rnd, mergeGeos, INFO, mRoof, mPlinth, makeSign } = ctx;

  /* ---------------- خامات العمارة ---------------- */
  const mWall = M(0xe6d9bd, { roughness: .95 });
  const mWall2 = M(0xd6c39f, { roughness: .95 });
  const mTrim = M(0xf6efe0, { roughness: .9 });
  const mStone = M(0xbcae90, { roughness: .96 });
  const mGlass = new THREE.MeshStandardMaterial({ color: 0x102c36, roughness: .12, metalness: .72 });
  const mDeep = M(0x241e19, { roughness: .99 });
  const mWood = M(0x53341d, { roughness: .72 });
  const mGold = M(0xc99a3b, { roughness: .4, metalness: .6 });

  /* شبكة مشربية زخرفية */
  const mashTex = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.strokeStyle = '#f2e7cf'; g.lineWidth = 10;
    for (let i = -128; i < 256; i += 34) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); }
    g.strokeStyle = '#c6a468'; g.lineWidth = 4;
    for (let i = -128; i < 256; i += 34) { g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  })();
  const mMash = new THREE.MeshStandardMaterial({ map: mashTex, alphaTest: .5, side: THREE.DoubleSide, roughness: .93 });

  const BLD = SU.buildings.map(function (b) {
    const info = (typeof INFO !== 'undefined' && INFO[b.id]) || {};
    const g = new THREE.Group(); campus.add(g);
    const polys = b.polys.map(p => p.map(q => [q[0], q[1]]));
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, cx = 0, cz = 0, n = 0;
    polys.forEach(p => p.forEach(q => { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minZ = Math.min(minZ, q[1]); maxZ = Math.max(maxZ, q[1]); cx += q[0]; cz += q[1]; n++; }));
    cx /= n; cz /= n;
    const h = b.h || 12;
    const modern = (b.id === 5 || b.id === 11 || b.id === 4 || b.id === 2);
    const eps = 0.02 * (1 + ((b.id * 5) % 7));

    /* مجمّعات الهندسة لكل خامة (تُدمج لاحقاً لتقليل نداءات الرسم) */
    const G = { wall: [], trim: [], stone: [], glass: [], deep: [], wood: [], mash: [], gold: [] };
    const put = function (key, geo, x, y, z, ry) { if (ry) geo.rotateY(ry); geo.translate(x, y, z); G[key].push(geo); };

    /* --- استخراج الحواف واتجاهها --- */
    const edges = [];
    polys.forEach(function (poly) {
      if (poly.length < 3) return;
      const mx0 = poly.reduce((s, p) => s + p[0], 0) / poly.length;
      const mz0 = poly.reduce((s, p) => s + p[1], 0) / poly.length;
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length];
        const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz);
        if (L < 0.8) continue;
        const ux = dx / L, uz = dz / L;
        const px = -uz, pz = ux;                       /* عمودي على الحاف */
        const mxx = (A[0] + B[0]) / 2, mzz = (A[1] + B[1]) / 2;
        const sgn = (px * (mxx - mx0) + pz * (mzz - mz0) < 0) ? -1 : 1;
        edges.push({ A: A, B: B, L: L, ux: ux, uz: uz, px: px, pz: pz, sgn: sgn });
      }
    });
    if (!edges.length) edges.push({ A: [cx - 4, cz - 4], B: [cx + 4, cz - 4], L: 8, ux: 1, uz: 0, px: 0, pz: 1, sgn: 1 });

    /* --- الحاف الأمامي: الأقرب إلى مركز الحرم --- */
    let front = edges[0], bestDot = -2;
    const cl = Math.hypot(cx, cz) || 1;
    edges.forEach(function (e) {
      const d = (e.px * e.sgn * (-cx) + e.pz * e.sgn * (-cz)) / cl;
      if (d > bestDot) { bestDot = d; front = e; }
    });

    /* --- واجهة الحافة --- */
    edges.forEach(function (e) {
      const A = e.A, B = e.B, L = e.L, ux = e.ux, uz = e.uz, px = e.px, pz = e.pz, sgn = e.sgn;
      const ry = Math.atan2(-uz, ux);
      const rot = ry + (sgn < 0 ? Math.PI : 0);
      const putE = function (key, geo, t, o, y) {
        const bx = A[0] + (B[0] - A[0]) * t + px * sgn * o;
        const bz = A[1] + (B[1] - A[1]) * t + pz * sgn * o;
        put(key, geo, bx, y, bz, rot);
      };
      const putM = function (key, geo, dm, o, y) { putE(key, geo, .5 + dm / L, o, y); };

      /* الجدار + القاعدة + الإفريز */
      putE('wall', new THREE.BoxGeometry(L, h, .58), .5, 0, h / 2);
      putE('stone', new THREE.BoxGeometry(L + .10, 1.15, .86), .5, 0, .57);
      putE('trim', new THREE.BoxGeometry(L + .14, .24, .70), .5, 0, h * .40);
      putE('trim', new THREE.BoxGeometry(L + .55, .62, .98), .5, 0, h - .31);
      /* سور السطح */
      putE('stone', new THREE.BoxGeometry(L + .30, 1.05, .62), .5, 0, h + .50);

      /* شرافات (أسنان) على السور */
      if (!modern && h > 9.5) {
        const nc = Math.max(2, Math.round(L / 1.35));
        for (let i = 0; i < nc; i++) putE('trim', new THREE.BoxGeometry(.60, .70, .74), (i + .5) / nc, 0, h + 1.30);
      }

      /* --- النوافذ --- */
      const rows = modern ? Math.max(1, Math.min(4, Math.round(h / 3.3))) : (h > 14 ? 3 : h > 8.5 ? 2 : 1);
      const bayW = modern ? 3.2 : 4.35;
      const nWin = Math.max(1, Math.floor((L - 2.2) / bayW));
      const isFront = (e === front);
      for (let r = 0; r < rows; r++) {
        const wy = modern ? (1.85 + r * 3.05) : (2.75 + r * ((h - 4.6) / Math.max(1, rows)));
        if (wy + 1.7 > h - .9) continue;
        for (let i = 0; i < nWin; i++) {
          const t = (i + .5) / nWin;
          if (isFront && r === 0 && Math.abs(t - .5) * L < (Math.min(6.4, Math.max(4.2, L * .34)) / 2 + 1.7)) continue;
          if (modern) {
            putE('glass', new THREE.BoxGeometry(bayW * .80, 1.95, .10), t, .32, wy);
            putE('trim', new THREE.BoxGeometry(bayW * .88, .16, .46), t, .26, wy + 1.12);
            putE('trim', new THREE.BoxGeometry(bayW * .88, .16, .46), t, .26, wy - 1.12);
          } else {
            putE('deep', new THREE.BoxGeometry(1.90, 2.80, .10), t, .29, wy);
            putE('trim', new THREE.BoxGeometry(1.66, 2.56, .10), t, .34, wy);
            putE('glass', new THREE.BoxGeometry(1.36, 2.26, .10), t, .39, wy);
            putE('trim', new THREE.BoxGeometry(.12, 2.26, .13), t, .43, wy);
            /* مظلة النافذة */
            putE('trim', new THREE.BoxGeometry(2.35, .24, .58), t, .36, wy + 1.50);
            /* قوس فوق النافذة */
            const arc = new THREE.CylinderGeometry(.80, .80, .30, 10, 1, true, 0, Math.PI);
            arc.rotateX(Math.PI / 2); putE('trim', arc, t, .34, wy + 1.52);
          }
        }
      }

      /* --- شريط النوافذ الصغيرة أعلى المبنى (كما في الصورة المرجعية) --- */
      if (!modern && h > 8) {
        const ns = Math.max(3, Math.round(L / 1.9));
        for (let i = 0; i < ns; i++) {
          const t = (i + .5) / ns;
          if (isFront && Math.abs(t - .5) * L < 2.6) continue;
          putE('trim', new THREE.BoxGeometry(.60, .70, .09), t, .31, h - 1.62);
          putE('deep', new THREE.BoxGeometry(.42, .52, .12), t, .35, h - 1.62);
        }
      }

      /* --- المدخل الرئيسي --- */
      if (isFront) {
        const pw = Math.min(6.4, Math.max(4.2, L * .34));
        const ph = Math.min(Math.max(4.6, h - 4.4), 7.0);
        /* تجويف */
        putM('deep', new THREE.BoxGeometry(pw + 1.5, ph + 1.2, .12), 0, .31, (ph + 1.2) / 2);
        /* إطار بارز */
        putM('trim', new THREE.BoxGeometry(pw + 1.25, .34, .60), 0, .42, ph + 1.05);
        /* قوس المدخل */
        putM('trim', new THREE.TorusGeometry(pw / 2, .30, 8, 24, Math.PI), 0, .46, ph);
        /* عمودان جانبيان */
        putM('trim', new THREE.BoxGeometry(.42, ph + .6, .62), -(pw / 2 + .55), .40, (ph + .6) / 2);
        putM('trim', new THREE.BoxGeometry(.42, ph + .6, .62), (pw / 2 + .55), .40, (ph + .6) / 2);
        /* بابان خشبيان */
        putM('wood', new THREE.BoxGeometry(pw / 2 - .16, ph * .60, .13), -pw / 4, .43, ph * .30);
        putM('wood', new THREE.BoxGeometry(pw / 2 - .16, ph * .60, .13), pw / 4, .43, ph * .30);
        putM('gold', new THREE.BoxGeometry(.10, ph * .52, .16), 0, .49, ph * .30);
        /* مظلة المدخل */
        putM('trim', new THREE.BoxGeometry(pw + 3.2, .42, 3.1), 0, 1.35, ph + 1.70);
        putM('stone', new THREE.BoxGeometry(pw + 2.4, .22, 2.4), 0, 1.35, ph + 1.48);
        /* مشربية على الجانبين */
        [-1, 1].forEach(function (sd) {
          const dm = sd * (pw / 2 + 2.3);
          putM('trim', new THREE.BoxGeometry(2.25, 3.10, .12), dm, .32, ph * .58);
          const mg = new THREE.PlaneGeometry(1.85, 2.70);
          putM('mash', mg, dm, .40, ph * .58);
        });
      }
    });

    /* --- السطح والبلاطة --- */
    polys.forEach(function (poly) {
      if (poly.length < 3) return;
      const shape = new THREE.Shape();
      shape.moveTo(poly[0][0], -poly[0][1]);
      for (let i = 1; i < poly.length; i++) shape.lineTo(poly[i][0], -poly[i][1]);
      shape.closePath();
      const rg = new THREE.ShapeGeometry(shape, 6); rg.rotateX(-Math.PI / 2);
      const ruv = rg.attributes.uv;
      for (let k = 0; k < ruv.count; k++) ruv.setXY(k, ruv.getX(k) / 11, ruv.getY(k) / 11);
      const roof = new THREE.Mesh(rg, mRoof); roof.position.y = h + eps * .5; roof.receiveShadow = true; g.add(roof);
      const pg = new THREE.ShapeGeometry(shape, 6); pg.rotateX(-Math.PI / 2);
      const puv = pg.attributes.uv;
      for (let k = 0; k < puv.count; k++) puv.setXY(k, puv.getX(k) / 9, puv.getY(k) / 9);
      const pl = new THREE.Mesh(pg, mPlinth); pl.position.y = 0.09 + eps * .5; pl.receiveShadow = true; g.add(pl);
    });

    /* --- دمج الهندسات --- */
    const mats = { wall: mWall, trim: mTrim, stone: mStone, glass: mGlass, deep: mDeep, wood: mWood, mash: mMash, gold: mGold };
    Object.keys(G).forEach(function (k) {
      if (!G[k].length) return;
      const geo = mergeGeos(G[k]);
      const mesh = new THREE.Mesh(geo, mats[k]);
      /* الجدران فقط ترسم ظلالاً — الزخارف الصغيرة مكلفة في خريطة الظل */
      mesh.castShadow = (k === 'wall' || k === 'stone');
      mesh.receiveShadow = true;
      mesh.userData.bid = b.id;
      g.add(mesh);
    });

    /* --- وحدات تكييف على السطح --- */
    const w = maxX - minX, d = maxZ - minZ;
    const nAC = Math.min(5, Math.max(1, Math.round(w * d / 1100)));
    for (let i = 0; i < nAC; i++) {
      const ax = minX + 4 + (i + .5) * (w - 8) / nAC + (rnd() - .5) * 3;
      const az = minZ + 4 + rnd() * Math.max(2, d - 8);
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 1.6), mats.stone);
      ac.position.set(ax, h + 1.35, az); ac.castShadow = true; g.add(ac);
    }

    /* --- المدخل واللافتة --- */
    const doorW = Math.min(6, Math.max(3, w * .18));
    const dirX = cx > 0 ? -1 : 1, dirZ = cz > 0 ? -1 : 1;
    const ez = clamp(cz + dirZ * (d / 2 + .6), minZ, maxZ);
    const ex = clamp(cx + dirX * (w / 2 + .6), minX, maxX);
    const entrance = new THREE.Group(); entrance.position.set(ex, 0, ez);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(doorW, Math.min(4.2, h * .62)), M(0x1c4b57, { roughness: .12, metalness: .6 }));
    gl.position.set(0, Math.min(2.1, h * .31), 0);
    gl.userData.doorId = b.id;          /* نقرة على الباب = دخول المبنى */
    entrance.add(gl);
    entrance.rotation.y = dirZ > 0 ? 0 : Math.PI;
    g.add(entrance);
    const sign = makeSign((info.ar || b.en) + (info.code ? ' (' + info.code + ')' : ''), info.en || b.en);
    sign.position.set(ex, Math.min(h - .9, 5.4), ez + dirZ * .35);
    sign.rotation.y = dirZ > 0 ? 0 : Math.PI;
    g.add(sign);

    return {
      id: b.id, info: info, g: g, polys: polys, minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ,
      cx: cx, cz: cz, w: w, d: d, h: h, en: b.en, ar: info.ar || b.en, code: info.code || '',
      kind: b.kind, entrance: { x: ex, z: ez }, group: g, modern: modern
    };
  });

  return BLD;
}
