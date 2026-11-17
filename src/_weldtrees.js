// دمج الرؤوس المكررة في نماذج الأشجار + ضغط الخامات
const fs = require('fs');
const path = require('path');
const Module = require('module');
const SHARP_PATH = require.resolve('sharp');
const _load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'sharp') return _load.call(this, SHARP_PATH, parent, isMain);
  return _load.apply(this, arguments);
};
const sharp = require('sharp');
const { NodeIO } = require('@gltf-transform/core');
const { weld, dedup, prune } = require('@gltf-transform/functions');

const WS = 'D:\\SU3D';
const kb = n => (n / 1024).toFixed(0) + 'KB';

(async () => {
  const io = new NodeIO();
  const files = ['palm_detailed.glb', 'quiver_tree_01.glb', 'quiver_tree_02.glb', 'potted_plant_02.glb',
    'potted_plant_04.glb', 'shrub_03.glb', 'modular_street_seating.glb'];
  for (const f of files) {
    const src = path.join(WS, 'assets', 'pack', f);
    if (!fs.existsSync(src)) { console.log('skip', f); continue; }
    const doc = await io.read(src);
    const root = doc.getRoot();
    const count = () => { let v = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'); v += a ? a.getCount() : 0; } return v; };
    const b = count();
    await doc.transform(weld(), dedup(), prune());
    const a = count();
    for (const t of root.listTextures()) {
      const img = Buffer.from(t.getImage());
      if (t.getMimeType() === 'image/png') {
        const out = await sharp(img).png({ palette: true, quality: 92, effort: 9, compressionLevel: 9 }).toBuffer();
        t.setImage(out); t.setMimeType('image/png');
      } else {
        const out = await sharp(img).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
        if (out.length < img.length) { t.setImage(out); t.setMimeType('image/jpeg'); }
      }
    }
    const dst = path.join(WS, 'assets', 'pack', f.replace('.glb', '_c.glb'));
    await io.write(dst, doc);
    console.log(f.padEnd(26), 'verts', String(b).padStart(7), '->', String(a).padStart(7),
      '| file', kb(fs.statSync(src).size), '->', kb(fs.statSync(dst).size));
  }
})();
