/* ---------- 11. نباتات وأشجار حقيقية (Poly Haven CC0 + نخيل innerscene CC0) ----------
   ملاحظات:
   - كل نموذج مدمج حسب الخامة في assets/pack/<id>.glb => عدة مجسمات بخامات مختلفة.
   - نستخدم InstancedMesh لكل جزء حتى يبقى عدد نداءات الرسم منخفضاً رغم مئات النسخ.
   - أماكن الوضع مأخوذة من مواضع الأشجار الرسمية في الخريطة (SU.trees) ومن محاور الممرات
     (SU.avenue) ومن مداخل المباني الحقيقية (b.entrance) — لا مواضع عشوائية.
------------------------------------------------------------------------------- */
const FLORA = [
  { k: 'palm',    b: '__BLOB_TR_PALM__',    h: 9.4,  kind: 'tree'  },
  { k: 'quiver1', b: '__BLOB_TR_QUIVER1__', h: 5.2,  kind: 'tree'  },
  { k: 'quiver2', b: '__BLOB_TR_QUIVER2__', h: 4.6,  kind: 'tree'  },
  { k: 'aloe',    b: '__BLOB_TR_ALOE__',    h: 1.45, kind: 'shrub' },
  { k: 'shrub3',  b: '__BLOB_TR_SHRUB3__',  h: 1.05, kind: 'shrub' },
  { k: 'potted',  b: '__BLOB_TR_POTTED__',  h: 1.40, kind: 'pot'   },
  { k: 'seat',    b: '__BLOB_TR_SEAT__',    h: .92,  kind: 'bench' }
];

function b64ToBuf(b64) {
  const s = atob(b64); const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u.buffer;
}
const _gltfL = new THREE.GLTFLoader();
function loadFLORA(b64) {
  return new Promise(res => {
    if (!b64 || b64.length < 64) return res(null);
    try {
      _gltfL.parse(b64ToBuf(b64), '', g => res(g), e => { console.warn('[flora]', e); res(null); });
    } catch (e) { console.warn('[flora]', e); res(null); }
  });
}

/* يوحّد القياس: الارتفاع المطلوب + القاعدة على الأرض، ويحوّل كل جزء إلى خامة مستقلة */
function prepFLORA(gltf, targetH) {
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const h = Math.max(.05, box.max.y - box.min.y);
  const w = Math.max(.05, box.max.x - box.min.x, box.max.z - box.min.z);
  let s = targetH / h;
  if (w * s > targetH * 1.55) s = targetH * 1.55 / w;   /* لا نُضخّم العرض أكثر من اللازم */
  const parts = [];
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    o.updateWorldMatrix(true, false);
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);            /* ندمج تحويلات العُقد في الهندسة */
    const m = o.material.clone();
    if (m.alphaTest > 0 || m.transparent) {
      m.side = THREE.DoubleSide; m.transparent = false; m.alphaTest = Math.max(m.alphaTest, .32); m.depthWrite = true;
    }
    if (m.map) { m.map.encoding = THREE.sRGBEncoding; m.map.anisotropy = Math.min(4, R.capabilities.getMaxAnisotropy()); }
    if (m.normalMap) m.normalScale.set(.8, .8);
    m.roughness = .95; m.metalness = 0; m.needsUpdate = true;
    parts.push({ g: g, m: m });
  });
  return { parts: parts, s: s, minY: box.min.y };
}

/* يزرع قائمة مواضع كنماذج مثالة (InstancedMesh) */
function spawnFLORA(proto, list) {
  if (!proto || !list.length) return 0;
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(),
        V = new THREE.Vector3(), S = new THREE.Vector3();
  proto.parts.forEach(p => {
    const im = new THREE.InstancedMesh(p.g, p.m, list.length);
    list.forEach((pl, i) => {
      E.set(0, pl.ry || 0, 0); Q.setFromEuler(E);
      const sc = proto.s * (pl.mul || 1);
      V.set(pl.x, -proto.minY * sc, pl.z);
      S.setScalar(sc);
      M4.compose(V, Q, S);
      im.setMatrixAt(i, M4);
    });
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    if (im.computeBoundingSphere) { try { im.computeBoundingSphere(); } catch (e) { im.frustumCulled = false; } }
    campus.add(im);
  });
  return list.length;
}

/* اتجاه الممر عند نقطة معيّنة — الممر خط متصل فنأخذ فرق الجارتين */
function avFrame(i) {
  const A = SU.avenue;
  const p = A[Math.max(0, Math.min(A.length - 1, i))];
  const q = A[Math.max(0, Math.min(A.length - 1, i + 1))];
  const r = A[Math.max(0, Math.min(A.length - 1, i - 1))];
  let dx = q[0] - r[0], dz = q[1] - r[1];
  const L = Math.hypot(dx, dz);
  if (L < .001) { dx = 1; dz = 0; } else { dx /= L; dz /= L; }
  /* العمود على الممر (يسار السير) */
  return { x: p[0], z: p[1], dx: dx, dz: dz, nx: -dz, nz: dx };
}

/* ---------- التوزيع في الحرم ---------- */
async function initRealFlora() {
  const models = {};
  await Promise.all(FLORA.map(async d => {
    const g = await loadFLORA(d.b);
    if (g) models[d.k] = prepFLORA(g, d.h);
  }));
  const has = k => !!models[k];
  let placed = 0;

  /* الأشجار الإجرائية: بديل فقط — نُظهرها إن لم يُحمَّل أي نموذج حقيقي */
  const loadedCount = Object.keys(models).length;
  if (typeof procTreeAll !== 'undefined') procTreeAll.forEach(o => { o.visible = (loadedCount === 0); });
  if (!loadedCount) console.warn('[flora] no real models loaded — falling back to procedural trees');

  /* 1) النخيل على جانبي الممرات — يحاذي اتجاه الممر */
  if (has('palm')) {
    const list = [];
    for (let i = 0; i < SU.avenue.length; i += 3) {
      const f = avFrame(i);
      const side = (i % 6 === 0) ? 1 : -1;
      const off = 5.2 + rnd() * 1.6;
      const x = f.x + f.nx * off * side, z = f.z + f.nz * off * side;
      if (hit(x, z, 2.2)) continue;
      list.push({ x: x, z: z, ry: Math.atan2(f.dx, f.dz) + (rnd() - .5) * .35, mul: .82 + rnd() * .40 });
    }
    placed += spawnFLORA(models.palm, list);
  }

  /* 2) الأشجار عند مواضع الخريطة الرسمية — نخلة في جزء منها وشجر صحراوي في الباقي */
  if (has('quiver1') || has('quiver2') || has('palm')) {
    const list = [], listQ = [];
    SU.trees.forEach((t, i) => {
      const x = t[0], z = t[1];
      if (hit(x, z, 2.0)) return;
      const ry = rnd() * 6.283;
      const mul = .78 + rnd() * .48;
      if (has('palm') && i % 5 === 0) list.push({ x: x, z: z, ry: ry, mul: mul * .82 });
      else if (has('quiver1') && i % 2 === 0) listQ.push({ x: x, z: z, ry: ry, mul: mul });
      else if (has('quiver2')) listQ.push({ x: x, z: z, ry: ry, mul: mul });
    });
    placed += spawnFLORA(models.quiver1 || models.quiver2, listQ);
    placed += spawnFLORA(models.palm, list);
  }

  /* 3) شجيرات وصبار حول الأشجار وحول أطراف المباني */
  const shrubKinds = ['aloe', 'shrub3'].filter(has);
  if (shrubKinds.length) {
    const pools = shrubKinds.map(() => []);
    let ns = 0;
    for (let i = 0; i < 300 && ns < 110; i++) {
      const t = SU.trees[Math.floor(rnd() * SU.trees.length)];
      if (!t) continue;
      const a = rnd() * 6.28, d = 2.2 + rnd() * 4.4;
      const x = t[0] + Math.cos(a) * d, z = t[1] + Math.sin(a) * d;
      if (hit(x, z, 1.4)) continue;
      pools[ns % pools.length].push({ x: x, z: z, ry: rnd() * 6.283, mul: .72 + rnd() * .62 });
      ns++;
    }
    /* على أطراف المباني */
    for (let i = 0; i < 140 && ns < 170; i++) {
      const b = BLD[Math.floor(rnd() * BLD.length)];
      if (!b || b.kind === 'field') continue;
      const a = rnd() * 6.28, d = 13 + rnd() * 8;
      const x = b.cx + Math.cos(a) * d, z = b.cz + Math.sin(a) * d;
      if (hit(x, z, 1.5)) continue;
      pools[ns % pools.length].push({ x: x, z: z, ry: rnd() * 6.283, mul: .7 + rnd() * .55 });
      ns++;
    }
    pools.forEach((pool, i) => { placed += spawnFLORA(models[shrubKinds[i]], pool); });
  }

  /* 4) نباتات في أحواض عند مداخل المباني الحقيقية */
  if (has('potted')) {
    const list = [];
    BLD.forEach(b => {
      if (b.kind === 'field' || !b.entrance) return;
      const e = b.entrance;
      let ox = e.x - b.cx, oz = e.z - b.cz;
      const L = Math.hypot(ox, oz) || 1; ox /= L; oz /= L;
      /* الحوض بجانب المدخل لا أمامه */
      const px = e.x + ox * 2.2 + (-oz) * 2.4, pz = e.z + oz * 2.2 + (ox) * 2.4;
      if (hit(px, pz, 1.2)) return;
      list.push({ x: px, z: pz, ry: Math.atan2(ox, oz), mul: .92 + rnd() * .3 });
    });
    placed += spawnFLORA(models.potted, list);
  }

  /* 5) مقاعد حقيقية على جوانب الممرات — محاذاة للمحور */
  if (has('seat')) {
    const list = [];
    for (let i = 0; i < SU.avenue.length && list.length < 44; i += 2) {
      const f = avFrame(i);
      const side = (i % 4 === 0) ? 1 : -1;
      const off = 4.4 + rnd() * 1.4;
      const x = f.x + f.nx * off * side, z = f.z + f.nz * off * side;
      if (hit(x, z, 1.7)) continue;
      /* المقعد يواجه الممر */
      list.push({ x: x, z: z, ry: Math.atan2(f.nx * side, f.nz * side) + Math.PI / 2, mul: 1 });
    }
    placed += spawnFLORA(models.seat, list);
  }

  console.log('[flora] planted', placed, 'instances');
  return placed;
}
