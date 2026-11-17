/* =====================================================================
   مكتبة الشخصية الحقيقية — جامعة صحار
   نموذج Rocketbox (Microsoft, MIT) داخل اللعبة:
     ♂ ذكر: ثوب أبيض (يُعاد تلوين خامته) + كمة مطرزة + لحية (من الخامة) + نعال
     ♀ أنثى: عباءة سوداء (إعادة تلوين) + حجاب أسود
   الأنيميشن حقيقي: idle / walk / run من كليبات Rocketbox عبر AnimationMixer
   ===================================================================== */

const RB_M_B64 = '/*RB_M*/';
const RB_F_B64 = '/*RB_F*/';
const RB_A_B64 = '/*RB_A*/';
/* مسار بديل يُستخدم أثناء التطوير فقط (عند غياب البيانات المدمجة) */
const RB_URL = window.RB_URL_OVERRIDE || {
  m: 'assets/pack/rb_male.glb',
  f: 'assets/pack/rb_female.glb',
  a: 'dl_rb_anims.glb'
};

/* ألوان الأزياء (sRGB) */
const RB_COL = {
  m: { garment: [0.93, 0.905, 0.855], shoe: [0.33, 0.24, 0.155], hair: [0.10, 0.09, 0.08] },
  f: { garment: [0.055, 0.055, 0.065], shoe: [0.035, 0.035, 0.042], hair: [0.055, 0.055, 0.065] }
};
/* السرعات الطبيعية للكليبات (م/ث) — محسوبة_offline من الـFK */
const RB_SPD = { idle: 0, walk: 1.51, run: 2.21, agree: 0 };

const RB = { ready: null, tmpl: {}, clips: null, err: null };

function rbBuf(b64) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}
function rbParse(b64) {
  return new Promise((res, rej) => {
    try { new THREE.GLTFLoader().parse(rbBuf(b64), '', res, rej); }
    catch (e) { rej(e); }
  });
}

/* ---------------------------------------------------------------------
   إعادة تلوين الملابس في الشيدر: نستبدل لون القماش بلون الثوب/العباءة
   مع الحفاظ على طيّات القماش الأصلية عبر معامل الإضاءة (vColor.g)
   --------------------------------------------------------------------- */
function rbPatch(mat, col) {
  const g = new THREE.Color(col.garment[0], col.garment[1], col.garment[2]).convertSRGBToLinear();
  const h = new THREE.Color(col.hair[0], col.hair[1], col.hair[2]).convertSRGBToLinear();
  const s = new THREE.Color(col.shoe[0], col.shoe[1], col.shoe[2]).convertSRGBToLinear();
  mat.vertexColors = true;
  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uG = { value: g };
    shader.uniforms.uH = { value: h };
    shader.uniforms.uS = { value: s };
    shader.fragmentShader = 'uniform vec3 uG;\nuniform vec3 uH;\nuniform vec3 uS;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
      'float rB=step(0.5,vColor.r);float rH=step(0.5,vColor.b);float rS=step(0.5,vColor.a);' +
      'float cf=vColor.g*2.5;vec3 oc=diffuseColor.rgb;' +
      'diffuseColor.rgb=mix(oc,uG*cf,rB);' +
      'diffuseColor.rgb=mix(diffuseColor.rgb,uH*cf,rH);' +
      'diffuseColor.rgb=mix(diffuseColor.rgb,uS*cf,rS);');
  };
  mat.needsUpdate = true;
}

/* ---------------------------------------------------------------------
   استنساخ هيكل عظمي كامل (عظام + شبكة мяг��ة) لكل لاعب
   --------------------------------------------------------------------- */
function rbClone(src) {
  src.updateMatrixWorld(true);          /* بدونها تكون مصفوفات العظام غير محسوبة */
  const root = new THREE.Group();       /* جذر حر: يضعه اللاعب في المشهد */
  const inner = new THREE.Group();      /* مثبّت: جذر عظام Rocketbox الأصلي */
  const srcBones = [];
  src.traverse(o => { if (o.isBone) srcBones.push(o); });
  /* جذر العظام تحت عقدة غير عظمية تحمل تدويراً (Z-up -> Y-up)|elevation وارتفاع الحوض */
  let top = null;
  srcBones.forEach(b => { if (!b.parent || !b.parent.isBone) top = b; });
  const RBONE = new THREE.Matrix4();
  if (top && top.parent) RBONE.copy(top.parent.matrixWorld);
  inner.matrix.copy(RBONE);
  inner.matrix.decompose(inner.position, inner.quaternion, inner.scale);
  root.add(inner);
  root.updateMatrixWorld(true);

  const map = new Map();
  srcBones.forEach(b => {
    const nb = new THREE.Bone();
    nb.name = b.name;
    nb.position.copy(b.position);
    nb.quaternion.copy(b.quaternion);
    nb.scale.copy(b.scale);
    map.set(b, nb);
  });
  srcBones.forEach(b => {
    const nb = map.get(b);
    const p = b.parent;
    if (p && map.has(p)) map.get(p).add(nb); else inner.add(nb);
  });
  root.updateMatrixWorld(true);

  const srcMeshes = [];
  src.traverse(o => { if (o.isSkinnedMesh) srcMeshes.push(o); });
  const invRB = new THREE.Matrix4().copy(RBONE).invert();
  srcMeshes.forEach(sm => {
    const nm = new THREE.SkinnedMesh(sm.geometry, sm.material);
    nm.name = sm.name;
    nm.castShadow = true; nm.receiveShadow = true;
    nm.frustumCulled = false;
    nm.matrix.copy(invRB).multiply(sm.matrixWorld);
    nm.matrix.decompose(nm.position, nm.quaternion, nm.scale);
    const bones = sm.skeleton.bones.map(b => map.get(b) || b);
    const inv = sm.skeleton.boneInverses.map(m => m.clone());
    inner.add(nm);
    nm.bind(new THREE.Skeleton(bones, inv), sm.bindMatrix);
  });
  root.updateMatrixWorld(true);
  return root;
}

/* ---------------------------------------------------------------------
   ظل تماس (Contact Shadow) — طبقة بيضاء-سوداء ناعمة تحت القدمين
   تمنع «طيران» الشخصية عن الأرض وتزيد واقعية المشهد
   --------------------------------------------------------------------- */
let _rbShadowTex = null;
function rbShadowTex() {
  if (_rbShadowTex) return _rbShadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  rg.addColorStop(0, 'rgba(0,0,0,.72)');
  rg.addColorStop(.45, 'rgba(0,0,0,.34)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  _rbShadowTex = t;
  return t;
}
function rbContactShadow(root) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(132, 132),
    new THREE.MeshBasicMaterial({
      map: rbShadowTex(), transparent: true, opacity: .46,
      depthWrite: false, fog: true
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, .6, 0);
  m.renderOrder = 1;
  m.frustumCulled = false;
  root.add(m);
  return m;
}

/* ---------------------------------------------------------------------
   أدوات هندسية للملابس
   --------------------------------------------------------------------- */
function rbMat(c, rough, metal) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(c[0], c[1], c[2]).convertSRGBToLinear(),
    roughness: rough === undefined ? .92 : rough,
    metalness: metal === undefined ? 0 : metal
  });
}
/* ثوب/عباءة مخروطية بتجاعيد طولية */
function rbSkirt(profile, mat, seg, folds) {
  const g = new THREE.BufferGeometry();
  const rows = profile.length, cols = seg + 1;
  const pos = [], nor = [], uvs = [], idx = [];
  for (let r = 0; r < rows; r++) {
    const rr = profile[r][0], yy = profile[r][1];
    for (let c = 0; c < cols; c++) {
      const th = (c / seg) * Math.PI * 2;
      const w = folds ? (1 + folds * Math.sin(th * 7 + yy * .06) + 0.6 * folds * Math.sin(th * 3 - yy * .04)) : 1;
      const rad = rr * w;
      pos.push(Math.sin(th) * rad, yy, Math.cos(th) * rad);
      const nx = Math.sin(th), nz = Math.cos(th);
      const slope = (profile[Math.min(rows - 1, r + 1)][0] - profile[Math.max(0, r - 1)][0]) /
        Math.max(.001, (profile[Math.min(rows - 1, r + 1)][1] - profile[Math.max(0, r - 1)][1]));
      const ny = slope;
      const l = Math.hypot(nx, ny, nz);
      nor.push(nx / l, ny / l, nz / l);
      uvs.push(c / seg, r / (rows - 1));
    }
  }
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < seg; c++) {
    const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
/* قبعة/حجاب: دوران حول محور Z لترك الوجه مفتوحاً */
function rbHood(profile, mat, seg, gapHalf) {
  const g = new THREE.BufferGeometry();
  const rows = profile.length, cols = seg + 1;
  const pos = [], nor = [], uvs = [], idx = [];
  const start = gapHalf, len = Math.PI * 2 - gapHalf * 2;
  for (let r = 0; r < rows; r++) {
    const rr = profile[r][0], yy = profile[r][1];
    for (let c = 0; c < cols; c++) {
      const th = start + (c / seg) * len;
      pos.push(Math.sin(th) * rr, yy, Math.cos(th) * rr);
      const nx = Math.sin(th), nz = Math.cos(th);
      nor.push(nx, .12, nz);
      uvs.push(c / seg, r / (rows - 1));
    }
  }
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < seg; c++) {
    const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
/* ربط جسم بهندسة عظام: يحسب الموضع المحلي منDesired world matrix */
const _rbInv = new THREE.Matrix4();
function rbAttach(bone, obj) {
  if (!bone) return;
  _rbInv.copy(bone.matrixWorld).invert();
  obj.matrix.copy(_rbInv);
  obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
  bone.add(obj);
}
/* تحويل هندسة من فضاء الجذر (سم) إلى فضاء العظمة — لتلتصق الملابس بالحركة */
function rbLocalize(geo, bone) {
  const m = new THREE.Matrix4().copy(bone.matrixWorld).invert();
  geo.applyMatrix4(m);
  return geo;
}
/* ربط هندسة مبنية أصلاً في فضاء العظمة (تتبع العظمة بالكامل) */
function rbBind(bone, obj) {
  if (!bone) return obj;
  obj.matrix.identity();
  obj.position.set(0, 0, 0);
  obj.quaternion.identity();
  obj.scale.set(1, 1, 1);
  bone.add(obj);
  return obj;
}
/* ارتفاع العظمة في فضاء الجذر (سم) */
function rbBoneY(root, name) {
  const b = root.getObjectByName(name);
  if (!b) return null;
  const p = new THREE.Vector3();
  b.getWorldPosition(p);
  return p.y;
}
/* قياسات الرأس (سم، فضاء الجذر — Y للأعلى): تُحسب من رؤوس شبكة الرأس فعلياً */
function rbHeadMetrics(root) {
  const out = {
    bone: null, min: new THREE.Vector3(), max: new THREE.Vector3(), size: new THREE.Vector3(),
    center: new THREE.Vector3(), n: 0, topY: 0, botY: 0, cx: 0, cz: 0, rx: 0, rz: 0, headH: 0
  };
  const bone = root.getObjectByName('Bip01_Head');
  if (!bone) return out;
  out.bone = bone;
  const meshes = [];
  root.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  /* شبكة الرأس تحديداً (أسماؤها *_head) — أدق من قياس عظمة الرأس */
  const headMeshes = meshes.filter(o => /head/i.test((o.material && o.material.name) || ''));
  const use = headMeshes.length ? headMeshes : meshes;
  out.meshName = headMeshes.length ? headMeshes[0].material.name : '';
  const v = new THREE.Vector3();
  const px = [], py = [], pz = [];
  for (const mesh of use) {
    const pos = mesh.geometry.attributes.position;
    if (!pos) continue;
    /* رؤوس الشبكة في فضاء النموذج → فضاء الجذر (Y للأعلى) عبر مصفوفة الشبكة */
    const mw = mesh.matrixWorld;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mw);
      if (!isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z)) continue;
      px.push(v.x); py.push(v.y); pz.push(v.z);
    }
  }
  const n = px.length;
  if (!n) return out;
  out.n = n;
  const pct = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]; };
  const lo = new THREE.Vector3(pct(px, .03), pct(py, .02), pct(pz, .03));
  const hi = new THREE.Vector3(pct(px, .97), pct(py, .98), pct(pz, .97));
  out.min.copy(lo); out.max.copy(hi);
  out.size.copy(hi).sub(lo);
  out.center.copy(lo).add(hi).multiplyScalar(.5);
  out.topY = hi.y; out.botY = lo.y;
  out.headH = Math.max(1, hi.y - lo.y);
  /* الجمجمة: الرؤوس ضمن الثلث العلوي من الرأس */
  const cut = hi.y - out.headH * 0.30;
  const sx = [], sz = [];
  for (let i = 0; i < n; i++) if (py[i] >= cut) { sx.push(px[i]); sz.push(pz[i]); }
  if (sx.length > 8) {
    const x1 = pct(sx, .06), x2 = pct(sx, .94), z1 = pct(sz, .06), z2 = pct(sz, .94);
    out.cx = (x1 + x2) / 2; out.cz = (z1 + z2) / 2;
    out.rx = Math.max(1, (x2 - x1) / 2); out.rz = Math.max(1, (z2 - z1) / 2);
  } else {
    out.cx = out.center.x; out.cz = out.center.z;
    out.rx = Math.max(1, out.size.x / 2); out.rz = Math.max(1, out.size.z / 2);
  }
  /* --- head axis + radial profile (radius per height) --- */
  out.cx = (pct(px, .10) + pct(px, .90)) / 2;
  out.cz = pct(pz, .85) - 7.5;
  const bins = new Map();
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(px[i] - out.cx, pz[i] - out.cz);
    const b = Math.round(py[i]);
    const cur = bins.get(b);
    if (cur === undefined || r > cur) bins.set(b, r);
  }
  let prof = Array.from(bins.entries()).sort((a, b) => a[0] - b[0]).map(e => [e[0], e[1]]);
  /* light smoothing */
  if (prof.length > 3) {
    const sm = prof.map((p, i) => {
      const a = prof[Math.max(0, i - 1)], b = prof[i], c = prof[Math.min(prof.length - 1, i + 1)];
      return [b[0], (a[1] + b[1] * 2 + c[1]) / 4];
    });
    prof = sm;
  }
  out.prof = prof;
  /* widest point of the skull */
  let wi = 0;
  prof.forEach((p, i) => { if (p[1] > prof[wi][1]) wi = i; });
  out.wi = wi;
  out.wy = prof[wi][0]; out.wr = prof[wi][1];
  return out;
}

/* ---------------------------------------------------------------------
   بناء الملابس الإضافية
   --------------------------------------------------------------------- */
function rbMaleClothes(root, col) {
  const white = rbMat(col.garment, .93);
  const gold = rbMat([.80, .63, .30], .30, .70);
  const grp = new THREE.Group();

  /* --- Kumma (embroidered cap) fitted to the skull --- */
  const hm = rbHeadMetrics(root);
  const head = hm.bone;
  if (head && hm.n) {
    const rRim = hm.rx * 1.04;                  /* temple width */
    const rTop = rRim * 0.88;                   /* crown is a bit narrower */
    const rimY = hm.topY - hm.rx * 0.80;        /* rim above the eyebrows */
    const topY = hm.topY + hm.rx * 0.06;
    const pts = [];
    pts.push(new THREE.Vector2(rRim + 1.0, rimY - 2.4));    /* lower embroidered edge */
    pts.push(new THREE.Vector2(rRim + 0.75, rimY - 0.6));
    const N = 10;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r = (rRim + (rTop - rRim) * t) + 0.7;
      pts.push(new THREE.Vector2(r, rimY + (topY - rimY) * t));
    }
    const rT = pts[pts.length - 1].x;
    const domeH = rT * 0.40;
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * Math.PI * .5;
      pts.push(new THREE.Vector2(Math.cos(a) * rT, topY + Math.sin(a) * domeH));
    }
    const kg = new THREE.LatheGeometry(pts, 48);
    kg.rotateY(Math.PI);                        /* seam to the back */
    kg.translate(hm.cx, 0, hm.cz);
    const kum = new THREE.Mesh(kg, white);
    kum.castShadow = true; kum.receiveShadow = true;
    grp.add(kum);
    /* golden embroidered edge (geometry rotated before translation) */
    const bg = new THREE.TorusGeometry(rRim + 0.95, .38, 10, 52);
    bg.rotateX(Math.PI / 2);
    bg.translate(hm.cx, rimY - 1.0, hm.cz);
    const band = new THREE.Mesh(bg, gold);
    band.castShadow = true;
    grp.add(band);
    head.updateMatrixWorld(true);
    grp.children.forEach(m => rbLocalize(m.geometry, head));
    rbBind(head, grp);
  }

  /* --- Thobe skirt (covers the legs) --- */
  const pel = root.getObjectByName('Bip01_Pelvis');
  const top = (pel ? rbBoneY(root, 'Bip01_Pelvis') : 100) + 5;
  const bot = (root.getObjectByName('Bip01_L_Foot') ? rbBoneY(root, 'Bip01_L_Foot') : 10) + 2;
  const prof = [];
  const N2 = 12;
  for (let i = 0; i <= N2; i++) {
    const t = i / N2;
    const r = 16.6 + t * 6.2 + Math.pow(t, 5) * 2.4;
    prof.push([r, top + (bot - top) * t]);
  }
  const skirt = rbSkirt(prof, white, 40, .022);
  if (pel) { pel.updateMatrixWorld(true); rbLocalize(skirt.geometry, pel); rbBind(pel, skirt); }
  else root.add(skirt);
  return grp;
}

function rbFemaleClothes(root, col) {
  const black = rbMat(col.garment, .88);
  const grp = new THREE.Group();

  /* --- Hijab: spherical shell framing the face, draping to the shoulders --- */
  const hm = rbHeadMetrics(root);
  const head = hm.bone;
  if (head && hm.n) {
    const chinY = hm.topY - hm.headH * 0.78;
    const ry = Math.max(6, (hm.topY - chinY) / 2);
    const cy = (hm.topY + chinY) / 2;
    const rxS = hm.rx * 1.34;
    const rzS = hm.rx * 1.62;
    const gap = .38;                            /* half angle of the face opening */
    const hg = new THREE.SphereGeometry(1, 52, 32, Math.PI / 2 + gap, Math.PI * 2 - gap * 2, 0, Math.PI * .93);
    hg.scale(rxS, ry, rzS);
    hg.translate(hm.cx, cy, hm.cz + 1.0);
    const hood = new THREE.Mesh(hg, black);
    hood.castShadow = true; hood.receiveShadow = true;
    grp.add(hood);
    head.updateMatrixWorld(true);
    grp.children.forEach(m => rbLocalize(m.geometry, head));
    rbBind(head, grp);
  }

  /* --- Long black abaya --- */
  const pel = root.getObjectByName('Bip01_Pelvis');
  const top = (pel ? rbBoneY(root, 'Bip01_Pelvis') : 95) + 5;
  const bot = (root.getObjectByName('Bip01_L_Foot') ? rbBoneY(root, 'Bip01_L_Foot') : 9) + 1.5;
  const prof = [];
  const N2 = 12;
  for (let i = 0; i <= N2; i++) {
    const t = i / N2;
    const r = 15.4 + t * 7.4 + Math.pow(t, 5) * 2.6;
    prof.push([r, top + (bot - top) * t]);
  }
  const abaya = rbSkirt(prof, black, 40, .03);
  if (pel) { pel.updateMatrixWorld(true); rbLocalize(abaya.geometry, pel); rbBind(pel, abaya); }
  else root.add(abaya);
  return grp;
}

function rbInit() {
  if (RB.ready) return RB.ready;
  RB.ready = (async () => {
    const loader = new THREE.GLTFLoader();
    const load = (b64, url) => {
      if (b64 && b64.length > 1000) {
        return new Promise((res, rej) => {
          try { loader.parse(rbBuf(b64), '', res, rej); } catch (e) { rej(e); }
        });
      }
      return new Promise((res, rej) => { loader.load(url, res, undefined, rej); });
    };
    const [gm, gf, ga] = await Promise.all([
      load(RB_M_B64, RB_URL.m), load(RB_F_B64, RB_URL.f), load(RB_A_B64, RB_URL.a)
    ]);
    /* رقع الخامات */
    const patch = (gltf, tag) => {
      gltf.scene.traverse(o => {
        if (!o.isMesh || !o.material) return;
        const n = o.material.name || '';
        /* دقة أعلى للخامات عند النظر المائل */
        const mx = (typeof R !== 'undefined' && R.capabilities) ? Math.min(8, R.capabilities.getMaxAnisotropy()) : 4;
        for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
          const t = o.material[k];
          if (t && t.isTexture) { t.anisotropy = mx; t.needsUpdate = true; }
        }
        if (/opacity/.test(n)) return;
        if (/body|head/.test(n)) rbPatch(o.material, RB_COL[tag]);
      });
    };
    patch(gm, 'm'); patch(gf, 'f');
    RB.tmpl.m = gm.scene; RB.tmpl.f = gf.scene;
    RB.clips = {};
    (ga.animations || []).forEach(c => { RB.clips[c.name.toLowerCase()] = c; });
    return RB;
  })().catch(e => { RB.err = e; console.error('char init', e); throw e; });
  return RB.ready;
}

/* ---------------------------------------------------------------------
   بناء شخصية جاهزة
   --------------------------------------------------------------------- */
function buildOmani(kind) {
  const tag = (kind === 'f') ? 'f' : 'm';
  return rbInit().then(() => {
    const root = rbClone(RB.tmpl[tag]);
    if (tag === 'm') rbMaleClothes(root, RB_COL.m); else rbFemaleClothes(root, RB_COL.f);
    rbContactShadow(root);
    root.scale.setScalar(.01);                 /* النموذج بوحدة السنتيمتر */

    const mixer = new THREE.AnimationMixer(root);
    const acts = {};
    const clip = (n) => RB.clips[n];
    const mk = (n, loop) => {
      const c = clip(n); if (!c) return null;
      const a = mixer.clipAction(c);
      a.setLoop(loop === false ? THREE.LoopOnce : THREE.LoopRepeat, loop === false ? 1 : Infinity);
      a.clampWhenFinished = true;
      acts[n] = a; return a;
    };
    mk('idle'); mk('walk'); mk('run');
    const agree = mk('agree', false);
    if (agree) agree.setEffectiveWeight(0);

    let state = 'idle', act = acts.idle, cel = 0;
    if (act) { act.setEffectiveWeight(1); act.play(); }

    const rig = {
      root: root, kind: tag, mixer: mixer,
      celebrate: function () {
        cel = 1.8;
        if (agree) { agree.reset(); agree.setEffectiveWeight(1); agree.play(); }
        if (act) act.setEffectiveWeight(0);
        act = agree; state = 'agree';
      },
      update: function (dt, speed) {
        cel = Math.max(0, cel - dt);
        const sp = Math.max(0, speed || 0);
        let want = sp < .22 ? 'idle' : (sp > 3.4 ? 'run' : 'walk');
        if (cel > 0) want = 'agree';
        if (want !== state) {
          state = want;
          const na = acts[want];
          if (na) {
            if (act && act !== na) act.fadeOut(.22);
            na.reset(); na.setEffectiveWeight(1); na.fadeIn(.22); na.play();
            act = na;
          }
        }
        if (act) {
          const nat = RB_SPD[want] || 0;
          if (nat > .01 && want !== 'agree') {
            let r = sp / nat;
            r = Math.max(.55, Math.min(2.4, r));
            act.setEffectiveTimeScale(r);
          } else act.setEffectiveTimeScale(1);
        }
        mixer.update(dt);
      }
    };
    return rig;
  });
}

/* تحميل مسبق (يُستدعى أثناء شاشة الإقلاع) */
function charPreload() { return rbInit(); }
