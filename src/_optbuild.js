// ضغط الخامات: PNG -> PNG8 (بلا فقد للشفافية) و JPEG إعادة ترميز + خامات GLBs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { NodeIO } = require('@gltf-transform/core');

const WS = 'D:\\SU3D';
const OPT = path.join(WS, 'opt');
if (!fs.existsSync(OPT)) fs.mkdirSync(OPT);

const kb = n => (n / 1024).toFixed(0) + 'KB';

async function png8(src, dst) {
  const before = fs.statSync(src).size;
  const buf = await sharp(src).png({ palette: true, quality: 90, effort: 9, compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(dst, buf);
  console.log('  PNG8 ', path.basename(dst), kb(before), '->', kb(buf.length));
}

async function jpeg(src, dst, q) {
  const before = fs.statSync(src).size;
  const buf = await sharp(src).jpeg({ quality: q, mozjpeg: true, quality: q }).toBuffer();
  fs.writeFileSync(dst, buf);
  console.log('  JPEG ', path.basename(dst), kb(before), '->', kb(buf.length), 'q=' + q);
}

async function glbLite(src, dst) {
  const io = new NodeIO();
  const doc = await io.read(src);
  const root = doc.getRoot();
  let before = 0, after = 0;
  for (const t of root.listTextures()) {
    const img = Buffer.from(t.getImage());
    before += img.length;
    const mime = t.getMimeType();
    let out;
    if (mime === 'image/png') {
      out = await sharp(img).png({ palette: true, quality: 92, effort: 9, compressionLevel: 9 }).toBuffer();
      t.setImage(out);
      t.setMimeType('image/png');
    } else {
      out = await sharp(img).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
      t.setImage(out);
      t.setMimeType('image/jpeg');
    }
    after += out.length;
  }
  await io.write(dst, doc);
  const fs1 = fs.statSync(src).size, fs2 = fs.statSync(dst).size;
  console.log('  GLB  ', path.basename(dst), kb(fs1), '->', kb(fs2), '| textures', kb(before), '->', kb(after));
}

(async () => {
  console.log('== صور مستقلة ==');
  for (const f of ['leaf0.png', 'leaf1.png', 'leaf2.png']) {
    const s = path.join(WS, 'assets', f);
    if (fs.existsSync(s)) await png8(s, path.join(OPT, f));
  }
  const g = path.join(WS, 'su-ground2.jpg');
  if (fs.existsSync(g)) await jpeg(g, path.join(OPT, 'su-ground2.jpg'), 86);

  console.log('== نماذج الشخصيات ==');
  await glbLite(path.join(WS, 'assets', 'pack', 'rb_male.glb'), path.join(WS, 'assets', 'pack', 'rb_male_c.glb'));
  await glbLite(path.join(WS, 'assets', 'pack', 'rb_female.glb'), path.join(WS, 'assets', 'pack', 'rb_female_c.glb'));

  console.log('== نماذج الأشجار ==');
  for (const f of ['palm_detailed.glb', 'quiver_tree_01.glb', 'quiver_tree_02.glb', 'potted_plant_02.glb',
    'potted_plant_04.glb', 'shrub_03.glb', 'modular_street_seeting.glb', 'modular_street_seating.glb']) {
    const s = path.join(WS, 'assets', 'pack', f);
    if (fs.existsSync(s)) await glbLite(s, path.join(WS, 'assets', 'pack', f.replace('.glb', '_c.glb')));
  }
  console.log('done');
})();
