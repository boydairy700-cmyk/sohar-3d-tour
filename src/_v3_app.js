/* =====================================================================
   جامعة صحار — الجولة الافتراضية ثلاثية الأبعاد (v3)
   مبنية على الخريطة الرسمية لجامعة صحار (su.edu.om/pdf/SU-Map-v3.pdf)
   ===================================================================== */
(function () {
'use strict';

/* ---------- 1. البيانات المدمجة ---------- */
const SU = __BLOB_CAMPUS__;
const GROUND = 'data:image/jpeg;base64,__BLOB_GROUND__';
/* الشخصيات الآن مبنية هندسياً داخل اللعبة (بلا نماذج خارجية) */
const CHM = '', CHF = '';
const ASSET = {
  bark: 'data:image/jpeg;base64,__BLOB_BARK__',
  barkN: 'data:image/jpeg;base64,__BLOB_BARKN__',
  grass: 'data:image/jpeg;base64,__BLOB_GRASS__',
  grassN: 'data:image/jpeg;base64,__BLOB_GRASSN__',
  pave: 'data:image/jpeg;base64,__BLOB_PAVE__',
  leaf0: 'data:image/png;base64,__BLOB_LEAF0__',
  leaf1: 'data:image/png;base64,__BLOB_LEAF1__',
  leaf2: 'data:image/png;base64,__BLOB_LEAF2__',
  tuft: 'data:image/png;base64,__BLOB_TUFT__'
};

const $ = s => document.querySelector(s), $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const TOUCH = matchMedia('(pointer:coarse)').matches;
const MOBILE = Math.min(innerWidth, innerHeight) < 820 || TOUCH;
let sd = 7; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;

/* معلومات المباني — من الخريطة الرسمية */
const INFO = {
  1:  { ar: 'مبنى صحم', en: 'Saham Building', code: 'A', u: 'مبنى أكاديمي وإداري — قاعات ومكاتبطلبة', ue: 'Academic & administration block' },
  2:  { ar: 'مبنى الخابورة', en: 'Al Khaboura Building', code: 'B', u: 'مبنى كليات — قاعات محاضرات ومعامل', ue: 'Faculties — lecture theatres & labs' },
  3:  { ar: 'مبنى ليوى', en: 'Liwa Building', code: 'C', u: 'مبنى كليات — قاعات محاضرات', ue: 'Faculties — lecture rooms' },
  4:  { ar: 'مبنى السويق', en: 'Suwaiq Building', code: 'E', u: 'مبنى كليات — معامل وقاعات تدريس', ue: 'Faculties — labs & classrooms' },
  5:  { ar: 'مركز مصادر التعلم', en: 'Learning Resources Centre', code: 'LRC', u: 'المكتبة وقاعات المذاكرة والدراسة الفردية', ue: 'Library, study rooms & group study halls', int: 2 },
  6:  { ar: 'مسرح مركز مصادر التعلم', en: 'LRC Theatre', code: '', u: 'قاعة عرض ومسرح مركز مصادر التعلم', ue: 'Theatre inside the LRC', int: 1 },
  7:  { ar: 'مبنى شناص', en: 'Shinas Building', code: '', u: 'مبنى خدمات الطلبة ومطعم الطلبة', ue: 'Student services & cafeteria' },
  8:  { ar: 'مبنى الرستاق', en: 'Rustaq Building', code: 'F', u: 'مبنى كليات — قاعات محاضرات', ue: 'Faculties — lecture rooms', int: 2 },
  9:  { ar: 'مبنى بركاء', en: 'Barka Building', code: 'G', u: 'مبنى كليات — قاعات محاضرات', ue: 'Faculties — lecture rooms', int: 2 },
  10: { ar: 'المسرح المفتوح', en: 'Amphitheatre', code: '', u: 'مسرح مفتوح في قلب الحرم', ue: 'Open-air amphitheatre' },
  11: { ar: 'مباني الموارد', en: 'Resources Offices', code: '', u: 'مكاتب وحدات الموارد والدعم', ue: 'Resources & support offices' },
  12: { ar: 'مركز الابتكار', en: 'Innovation Centre', code: '', u: 'مركز الابتكار والبحث والتطوير', ue: 'Innovation & R&D centre' },
  13: { ar: 'سكن الطالبات', en: 'Female Student Hostel', code: '', u: 'مبيت الطالبات فيNorthern الحرم', ue: 'Female students accommodation' },
  14: { ar: 'قاعة متعددة الاستخدامات', en: 'Multi-Purpose Hall', code: '', u: 'قاعة الفعاليات والأنشطة', ue: 'Events & multi-purpose hall' },
  15: { ar: 'مسجد الجامعة', en: 'University Mosque', code: '', u: 'مسجد الحرم الجامعي', ue: 'Campus mosque' },
  16: { ar: 'الحاضنة الزراعية', en: 'Green House', code: '', u: 'الحاضنة الزراعية', ue: 'Agricultural green house' },
  17: { ar: 'الحقل الرياضي', en: 'Football Field', code: '', u: 'ملعب كرة قدم', ue: 'Football pitch' },
  18: { ar: 'ملعب كرة القدم', en: 'Football Pitch', code: '', u: 'ملعب كرة قدم', ue: 'Football pitch' },
  19: { ar: 'ملعب كرة السلة', en: 'Basketball Field', code: '', u: 'ملعب كرة سلة', ue: 'Basketball court' },
  20: { ar: 'مبنى الخدمات', en: 'Services Building', code: '', u: 'مبنى خدمات الحرم', ue: 'Campus services building' }
};
INFO[13].u = 'مبيت الطالبات في شمال الحرم';
/* تفعيل داخلية جميع المباني: الطابقان للمباني الأكاديمية، وطابق واحد لغيرها.
   الحقول المفتوحة (17 ملعب كرة القدم، 18 ملعب، 19 سلة) بلا داخلية بطبيعتها. */
const INT_FLOORS = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 1, 7: 1, 8: 2, 9: 2, 10: 1,
  11: 1, 12: 2, 13: 2, 14: 1, 15: 1, 16: 1, 20: 1
};
Object.keys(INT_FLOORS).forEach(k => { if (!INFO[k]) return; if (!INFO[k].int) INFO[k].int = INT_FLOORS[k]; });

/* ---------- 2. اللغات ---------- */
let lang = 'ar';
const L = {
  ar: { search:'ابحث عن مبنى أو قاعة — مثل G1.05', tour:'جولة تعريفية', tourStop:'إيقاف الجولة', sched:'📅 جدول المحاضرات',
    info:'🏫 دليل المباني', qr:'🔳 رموز QR', night:'🌙 وضع الليل', day:'☀️ وضع النهار', sky:'⏱ وقت اليوم والطقس',
    theme:'🎨 نمط العرض', chr:'🧍 تغيير الشخصية', acc:'♿ مسار ميسّر', accOn:' (مفعّل)', photo:'📷 وضع التصوير',
    lang2:'🌐 English', fs:'⛶ ملء الشاشة', about:'ℹ️ عن الجولة', dir:'الخريطة', grid:'أرضي', first:'الأرضي',
    entr:'المدخل', fl:'الدور', room:'القاعة', next:'محاضرتك القادمة', after:'بعد', min:'دقيقة', go:'اذهب',
    none:'لا توجد محاضرات', course:'المادة', add:'إضافة', del:'حذف', arr:'وصلت إلى', to:'إلى', here:'وصلت', m:' م',
    pick:'اختر شخصيتك', boy:'شاب', girl:'فتاة', tap:'اضغط على أي مبنى أو أرض للانتقال إليه', drop:'انتقلت إلى',
    tourEnd:'انتهت الجولة — وقت ممتع!', exit:'خروج', inb:'داخل المبنى', plan:'مخطط تقريبي للدور',
    nightT:'الوضع الليلي', dayT:'الوضع النهاري', weather:'الطقس', clear:'صحو', haze:'غبار', dusk:'غروب',
    sunrise:'شروق', noon:'ظهر', themeT:'نمط العرض', real:'واقعي', arch:'معماري', cine:'سينمائي',
    photoT:'وضع التصوير', photoDone:'تم حفظ الصورة', guide:'دليل المباني', map:'الخريطة الرسمية',
    aboutT:'عن هذه الجولة', aboutP:'جولة افتراضية ثلاثية الأبعاد لحرم جامعة صحار، مبنية على الخريطة الرسمية للجامعة ومطابقة لأطوار المباني والأnumerرقيم الموضّحة عليها. المخططات الداخلية تقريبية، والبيانات مرجعها su.edu.om.',
    voice:'الصوت', voiceOn:'مفعّل', sens:'الحساسية', days:['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'] },
  en: { search:'Search a building or room — e.g. G1.05', tour:'Guided tour', tourStop:'Stop tour', sched:'📅 My schedule',
    info:'🏫 Building guide', qr:'🔳 QR codes', night:'🌙 Night mode', day:'☀️ Day mode', sky:'⏱ Time & weather',
    theme:'🎨 Visual style', chr:'🧍 Change character', acc:'♿ Accessible route', accOn:' (on)', photo:'📷 Photo mode',
    lang2:'🌐 العربية', fs:'⛶ Fullscreen', about:'ℹ️ About', dir:'Map', grid:'Ground', first:'Ground',
    entr:'Entrance', fl:'Floor', room:'Room', next:'Next class', after:'in', min:'min', go:'Go',
    none:'No classes yet', course:'Course', add:'Add', del:'Delete', arr:'You arrived at', to:'To', here:'Arrived', m:' m',
    pick:'Choose your character', boy:'Male', girl:'Female', tap:'Tap any building or the ground to move there', drop:'You moved to',
    tourEnd:'Tour finished — have a great day!', exit:'Exit', inb:'Inside building', plan:'Approximate floor plan',
    nightT:'Night mode', dayT:'Day mode', weather:'Weather', clear:'Clear', haze:'Dusty', dusk:'Dusk',
    sunrise:'Sunrise', noon:'Noon', themeT:'Visual style', real:'Realistic', arch:'Architectural', cine:'Cinematic',
    photoT:'Photo mode', photoDone:'Photo saved', guide:'Building guide', map:'Official plan',
    aboutT:'About this tour', aboutP:'A 3D virtual tour of Sohar University campus, built from the university official campus plan with matching building footprints and numbers. Interior layouts are approximate. Source: su.edu.om.',
    voice:'Narration', voiceOn:'on', sens:'Sensitivity', days:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] }
};
const T = k => (L[lang][k] !== undefined ? L[lang][k] : k);

/* ---------- 3. حالة عامة ---------- */
let inside = null, curFl = 0, curB = null, tg = null, route = [], lastP = { x: 0, z: 0 };
let yaw = 0, pitch = 0.32, walk = 0, amp = 0, zf = 1, mode = 'g', trans = null, aer = { x: 0, z: 120, h: 210 };
let jx = 0, jy = 0, night = false, nt = 0, acc = false, skyT = 0.33, weather = 'clear', voiceOn = true;
let theme = 'real', keys = {}, trans2 = null, cine = null, shot = false, fpsT = 0, frames = 0, charTime = null;
const look = new THREE.Vector3(), tp = new THREE.Vector3(), tl = new THREE.Vector3();

/* ---------- 4. المشهد ---------- */
const boot = $('#boot'), bar = $('#bar i'), btxt = $('.btxt');
function prog(p, t) { bar.style.width = p + '%'; if (t) btxt.textContent = t; }
prog(6, 'تحميل محرك الرسم…');

const R = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: 'high-performance' });
R.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.6 : 2));
R.setSize(innerWidth, innerHeight);
R.outputEncoding = THREE.sRGBEncoding;
R.toneMapping = THREE.ACESFilmicToneMapping;
R.toneMappingExposure = 1.0;
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.insertBefore(R.domElement, document.body.firstChild);
R.domElement.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;touch-action:none;z-index:1';

const S = new THREE.Scene();
S.fog = new THREE.Fog(new THREE.Color(0xcfe0e8).convertSRGBToLinear(), 160, 820);
const C = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.4, 2200);
C.position.set(0, 40, 210);

/* سماء متدرجة + شمس + سحاب */
const skyU = {
  uH: { value: new THREE.Color(0.94, 0.96, 0.97) },
  uM: { value: new THREE.Color(0.60, 0.78, 0.93) },
  uT: { value: new THREE.Color(0.26, 0.50, 0.82) },
  uSun: { value: new THREE.Vector3(.4, .25, -.6).normalize() },
  uTime: { value: 0 },
  uNight: { value: 0 }
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 20), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: [
    'varying vec3 v;uniform vec3 uH,uM,uT,uSun;uniform float uTime,uNight;',
    'float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.52;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.07+vec2(1.7,9.2);a*=.5;}return s;}',
    'void main(){',
    '  vec3 d=normalize(v);',
    '  float h=clamp(d.y,0.,1.);',
    '  vec3 c=mix(uH,uM,smoothstep(0.,.26,h));',
    '  c=mix(c,uT,smoothstep(.16,.9,h));',
    /* سحاب */
    '  if(h>0.002){',
    '    vec2 cp=d.xz/max(h,0.05)*1.25+vec2(uTime*0.004,uTime*0.0016);',
    '    float cl=fbm(cp*1.7);',
    '    float cov=smoothstep(0.44,0.72,cl)*smoothstep(0.0,0.075,h);',
    '    vec3 cc=mix(vec3(0.70,0.75,0.82),vec3(1.0,0.99,0.97),cl);',
    '    cc=mix(cc*0.32,cc,1.-uNight);',
    '    c=mix(c,cc,cov*0.85);',
    '  }',
    /* قرص الشمس وهالتها */
    '  float sd=max(0.,dot(d,normalize(uSun)));',
    '  c+=vec3(1.0,0.95,0.84)*pow(sd,1400.0)*2.2*(1.-uNight*0.85);',
    '  c+=vec3(1.0,0.88,0.70)*pow(sd,22.0)*0.30*(1.-uNight*0.9);',
    '  gl_FragColor=vec4(c,1.);',
    '}'
  ].join('\n')
}));
/* مهم: بدون إضافة كرة السماء إلى المشهد تظهر الخلفية سوداء تماماً */
sky.renderOrder = -10;
sky.frustumCulled = false;
sky.material.depthTest = false;
sky.material.depthWrite = false;
S.add(sky);
/* لون خلفية احتياطي في حال تعذّر رسم شيدر السماء */
const bgC = new THREE.Color();

const hemi = new THREE.HemisphereLight(0xc6dcff, 0xb99a80, 0.55); S.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.1); sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 4096, MOBILE ? 1024 : 4096);
Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 600 });
sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.04; S.add(sun, sun.target);
/* ضوء ملء بارد من الجهة المقابلة: يمنع سوداءZones الظلال ويحافظ على وضوح التفاصيل */
const fillL = new THREE.DirectionalLight(0xbcd4f5, 0.42); S.add(fillL, fillL.target);
const torch = new THREE.PointLight(0xffd9a0, 0, 34, 2); S.add(torch);

/* ---------- 5. خاماتCanvas ---------- */
const lin = c => new THREE.Color(c).convertSRGBToLinear();
const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: lin(c), roughness: 0.88, metalness: 0 }, o || {}));
function ctex(w, h, fn, rx, ry) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy());
  return t;
}
function speck(g, w, h, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); } }

/* واجهة مبنى: بلاطة واحدة (عرض 4م × ارتفاع 3.4م) */
const tGlass = ctex(256, 224, (g, w, h) => {
  const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, '#f4ecda'); sk.addColorStop(1, '#d8c6a4');
  g.fillStyle = sk; g.fillRect(0, 0, w, h); speck(g, w, h, 700, .03);
  const pad = 34, ww = w - pad * 2, wh = h - 88;
  g.fillStyle = 'rgba(70,52,28,.18)'; g.fillRect(pad - 7, 26, ww + 14, wh + 12);
  const gr = g.createLinearGradient(0, 26, 0, 26 + wh); gr.addColorStop(0, '#9ad3d8'); gr.addColorStop(.42, '#2f7480'); gr.addColorStop(1, '#0e2f39');
  g.fillStyle = gr; g.fillRect(pad, 26, ww, wh);
  g.fillStyle = 'rgba(255,255,255,.20)'; g.beginPath(); g.moveTo(pad + ww * .18, 26 + wh * .92); g.lineTo(pad + ww * .30, 26 + wh * .92); g.lineTo(pad + ww * .50, 26 + wh * .12); g.lineTo(pad + ww * .38, 26 + wh * .12); g.closePath(); g.fill();
  g.strokeStyle = '#f7f2e6'; g.lineWidth = 5; g.strokeRect(pad, 26, ww, wh);
  g.fillStyle = '#f7f2e6'; g.fillRect(pad + ww / 2 - 1.5, 26, 3, wh);
  g.fillStyle = '#efe6d0'; g.fillRect(pad - 12, 26 + wh + 4, ww + 24, 9);
  g.fillStyle = '#fbf7ec'; g.fillRect(pad - 12, 14, ww + 24, 7);
});
const tArch = ctex(256, 224, (g, w, h) => {
  const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, '#f3ead4'); sk.addColorStop(1, '#d9c7a1');
  g.fillStyle = sk; g.fillRect(0, 0, w, h); speck(g, w, h, 800, .035);
  const cx = w / 2, ww = w * .42, top = 44, bot = h - 52;
  g.fillStyle = 'rgba(92,72,42,.22)'; g.fillRect(cx - ww / 2 - 7, top - 8, ww + 14, bot - top + 16);
  g.beginPath(); g.moveTo(cx - ww / 2, bot); g.lineTo(cx - ww / 2, top + ww / 2); g.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, bot); g.closePath();
  const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, '#8ecad0'); gr.addColorStop(.45, '#2b6b78'); gr.addColorStop(1, '#0d2f39');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = '#f7f2e6'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#f7f2e6'; g.fillRect(cx - 2, top + ww / 2, 4, bot - top - ww / 2);
  g.fillStyle = '#efe6d0'; g.fillRect(cx - ww / 2 - 12, bot, ww + 24, 9);
  g.fillStyle = '#fbf7ec'; g.fillRect(cx - ww / 2 - 12, 26, ww + 24, 7);
});
const tRoof = ctex(128, 128, (g, w, h) => { g.fillStyle = '#b9b09c'; g.fillRect(0, 0, w, h); speck(g, w, h, 2600, .07); g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 1; for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); } });
const tPlinth = ctex(128, 128, (g, w, h) => { g.fillStyle = '#b3a48a'; g.fillRect(0, 0, w, h); speck(g, w, h, 2200, .08); });
const mGlassWin = M(0xffffff, { map: tGlass, roughness: .18, metalness: .15 });
const mArch = M(0xffffff, { map: tArch, roughness: .82 });
const mRoof = M(0xffffff, { map: tRoof, roughness: .95 });
const mPlinth = M(0xffffff, { map: tPlinth, roughness: .95 });
const mStone = M(0xe9e0cc), mDark = M(0x2a2420), mSteel = M(0xb9c2c6, { metalness: .7, roughness: .35 });

/* ---------- 6. الأرضية من الخريطة الرسمية ---------- */
prog(18, 'رسم أرضية الحرم…');
const K = SU.k, MAPW = (SU.map[2] - SU.map[0]) * K, MAPH = (SU.map[3] - SU.map[1]) * K;
const groundMat = new THREE.MeshStandardMaterial({ map: null, roughness: .95, metalness: 0 });
const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(MAPW, MAPH), groundMat);
groundMesh.rotation.x = -Math.PI / 2; groundMesh.position.y = 0; groundMesh.receiveShadow = true;
S.add(groundMesh);

/* خامات تفصيل واقعية (تبليط فوق خريطة الحرم) */
const detG = new THREE.TextureLoader().load(ASSET.grass);
detG.wrapS = detG.wrapT = THREE.RepeatWrapping; detG.encoding = THREE.sRGBEncoding;
detG.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy());
const detS = new THREE.TextureLoader().load(ASSET.pave);
detS.wrapS = detS.wrapT = THREE.RepeatWrapping; detS.encoding = THREE.sRGBEncoding;
detS.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy());
const detN = new THREE.TextureLoader().load(ASSET.grassN);
detN.wrapS = detN.wrapT = THREE.RepeatWrapping;
detN.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy());
groundMat.onBeforeCompile = (sh) => {
  sh.uniforms.uDetG = { value: detG };
  sh.uniforms.uDetS = { value: detS };
  sh.uniforms.uDetN = { value: detN };
  sh.uniforms.uDS = { value: new THREE.Vector2(118, 126) };
  sh.uniforms.uNB = { value: 1.0 };
  sh.vertexShader = 'varying vec2 vDUv;\n' + sh.vertexShader.replace('#include <uv_vertex>',
    '#include <uv_vertex>\n  vDUv = uv;');
  sh.fragmentShader = 'varying vec2 vDUv;\nuniform sampler2D uDetG;\nuniform sampler2D uDetS;\nuniform sampler2D uDetN;\nuniform vec2 uDS;\nuniform float uNB;\n' +
    sh.fragmentShader
      .replace('#include <map_fragment>', [
        '#include <map_fragment>',
        'vec2 duv = vDUv * uDS;',
        'float gmix = smoothstep(0.010, 0.075, diffuseColor.g - (diffuseColor.r + diffuseColor.b) * 0.5);',
        'vec3 dG = texture2D(uDetG, duv).rgb;',
        'vec3 dS = texture2D(uDetS, duv).rgb;',
        'vec3 det = mix(dS, dG, gmix);',
        'float lum = dot(det, vec3(0.3333));',
        /* تباين متعدّد المقاييس يكسر تكرار النمط */
        /* تنبيه: لا تستخدم m1/m2 — three.js يعرّف m1 كـ ماكرو داخل الشيدر */
        'float gA = texture2D(uDetG, duv * 0.115 + vec2(0.37, 0.71)).g;',
        'float gB = texture2D(uDetS, duv * 0.043 + vec2(0.19, 0.53)).g;',
        'float v = 0.58 + 0.74 * lum;',
        'v *= 0.88 + 0.24 * gA;',
        'v *= 0.93 + 0.15 * gB;',
        'diffuseColor.rgb *= v;',
        /* العشب: نزرع لون تفصيل حقيقي فوق الأخضر المسطّح من الخريطة */
        'vec3 gcol = dG * (0.66 + 0.30 * gA);',
        'float gl0 = max(0.001, dot(diffuseColor.rgb, vec3(0.3333)));',
        'float gl1 = max(0.001, dot(gcol, vec3(0.3333)));',
        'vec3 gN = gcol * (gl0 / gl1);',
        'vec3 gtint = mix(vec3(1.0), diffuseColor.rgb / gl0, 0.85);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, gN * gtint, gmix * 0.62);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.60 + 0.85 * dS), 0.30 * (1.0 - gmix));'
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        'vec3 dnm = texture2D(uDetN, duv).xyz * 2.0 - 1.0;',
        'normal = normalize(normal + vec3(dnm.x, dnm.y, 0.0) * uNB * 0.60);'
      ].join('\n'));
};

/* أرضية بعيدة (صحراء) */
const desert = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), M(0xd9c9a8, { roughness: 1 }));
desert.rotation.x = -Math.PI / 2; desert.position.y = -0.35; desert.receiveShadow = true; S.add(desert);

/* ---------- 7. المباني ---------- */
prog(28, 'بناء المباني…');
const campus = new THREE.Group(); S.add(campus);
/* واجهات المباني: مجسمات معمارية ثلاثية الأبعاد (بلا صور) */
function mergeGeos(list) {
  let vc = 0, ic = 0;
  list.forEach(g => { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; });
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2);
  const idx = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic);
  let vo = 0, io = 0;
  list.forEach(g => {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    pos.set(p.array, vo * 3); nor.set(n.array, vo * 3); uv.set(u.array, vo * 2);
    if (g.index) { for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo; io += g.index.count; }
    else { for (let i = 0; i < p.count; i++) idx[io + i] = i + vo; io += p.count; }
    vo += p.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

const BLD = makeBuildings(SU, campus, {
  M: M, rnd: rnd, mergeGeos: mergeGeos, INFO: INFO,
  mRoof: mRoof, mPlinth: mPlinth, makeSign: makeSign
});
const BY = {}; BLD.forEach(b => BY[b.id] = b);

/* مولّد اللافتات */
function makeSign(ar, en) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(12,48,64,.94)'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#C99A3B'; g.lineWidth = 4; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = '#F3EAD8'; g.textAlign = 'center'; g.direction = 'rtl';
  g.font = '700 40px "IBM Plex Sans Arabic", sans-serif'; g.fillText(ar, 256, 58);
  g.fillStyle = '#C99A3B'; g.font = '600 26px "IBM Plex Sans Arabic", sans-serif'; g.fillText(en, 256, 98);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
  return m;
}

/* ---------- 8. المسجد: قبة ومئذنة ---------- */
(function mosque() {
  const b = BY[15]; if (!b) return;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(0x2a8f95, { roughness: .3, metalness: .4 }));
  dome.position.set(b.cx - 3, b.h, b.cz); dome.castShadow = true; b.g.add(dome);
  const fin = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 2.2, 8), M(0xc9a23b, { metalness: .8, roughness: .3 }));
  fin.position.set(b.cx - 3, b.h + 5.6, b.cz); b.g.add(fin);
  const mn = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.3, b.h + 8, 14), M(0xf1ead8));
  mn.position.set(b.cx + 7, (b.h + 8) / 2, b.cz + 3); mn.castShadow = true; b.g.add(mn);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.4, 14), M(0x2a8f95));
  cap.position.set(b.cx + 7, b.h + 9.7, b.cz + 3); cap.castShadow = true; b.g.add(cap);
})();

/* ---------- 9. الأشجار والنخيل والإنارة ---------- */
prog(42, 'زراعة النخيل والأشجار…');

/* دمج عدة هندسات في واحدة */


/* نسيج ورقة نخيل (شفافة) */
function frondTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  const grd = g.createLinearGradient(0, 0, 512, 0);
  grd.addColorStop(0, '#2c5420'); grd.addColorStop(.42, '#4b7f31'); grd.addColorStop(1, '#83b74f');
  const mid = 128;
  /* وريقات عريضة متداخلة تصنع ريشة كاملة */
  for (let i = 0; i < 76; i++) {
    const t = i / 76;
    const x = 24 + t * 466;
    const len = 112 * Math.sin(Math.PI * Math.min(1, t * 1.18 + .06)) * (.80 + rnd() * .34);
    for (const s of [-1, 1]) {
      g.save(); g.translate(x, mid); g.rotate(s * (.60 + rnd() * .26));
      g.fillStyle = grd; g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(len * .48, -13 * s, len, -3.2 * s);
      g.quadraticCurveTo(len * .55, 6.5 * s, 0, 0);
      g.fill(); g.restore();
    }
  }
  /* عرق الورقة */
  g.strokeStyle = '#8a5a2c'; g.lineWidth = 8; g.beginPath(); g.moveTo(12, mid); g.lineTo(500, mid); g.stroke();
  g.strokeStyle = '#a06d36'; g.lineWidth = 3; g.beginPath(); g.moveTo(12, mid); g.lineTo(500, mid); g.stroke();
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
/* قشرة جذع النخيل (حلقات) */
function palmBarkTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 64, 0);
  grd.addColorStop(0, '#6b5136'); grd.addColorStop(.42, '#a98a63'); grd.addColorStop(1, '#6f5539');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 16) {
    g.fillStyle = 'rgba(60,42,26,.34)'; g.fillRect(0, y, 64, 4);
    g.fillStyle = 'rgba(216,196,158,.20)'; g.fillRect(0, y + 5, 64, 6);
  }
  for (let i = 0; i < 120; i++) {
    g.fillStyle = 'rgba(70,50,32,.18)';
    g.fillRect(rnd() * 64, rnd() * 256, 2 + rnd() * 3, 3 + rnd() * 8);
  }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/* أشجار واقعية: جذع بلحاء حقيقي + تاج من أوراق شفافة */
const barkTex = new THREE.TextureLoader().load(ASSET.bark);
barkTex.encoding = THREE.sRGBEncoding; barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
barkTex.repeat.set(1.6, 2.4); barkTex.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy());
const barkNrm = new THREE.TextureLoader().load(ASSET.barkN);
barkNrm.wrapS = barkNrm.wrapT = THREE.RepeatWrapping; barkNrm.repeat.set(1.6, 2.4);
const mBark = new THREE.MeshStandardMaterial({ map: barkTex, normalMap: barkNrm, roughness: .95, metalness: 0 });

const leafTexs = [ASSET.leaf0, ASSET.leaf1, ASSET.leaf2].map(u => {
  const t = new THREE.TextureLoader().load(u);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(4, R.capabilities.getMaxAnisotropy());
  return t;
});
const leafMats = leafTexs.map(t => new THREE.MeshStandardMaterial({
  map: t, transparent: false, alphaTest: .42, side: THREE.DoubleSide, roughness: .95, metalness: 0
}));

const trunkG = new THREE.CylinderGeometry(.13, .30, 4.4, 9, 1); trunkG.translate(0, 2.2, 0);
const crownG = (function () {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.PlaneGeometry(4.6, 4.0);
    p.rotateY(i * Math.PI / 3); p.translate(0, 0, 0);
    parts.push(p);
  }
  return mergeGeos(parts);
})();
crownG.computeVertexNormals();

const NT = SU.trees.length;
const trunkMesh = new THREE.InstancedMesh(trunkG, mBark, NT);
trunkMesh.castShadow = true; trunkMesh.receiveShadow = true;
const crownMats = [0, 1, 2].map(() => new THREE.InstancedMesh(crownG, leafMats[0], Math.ceil(NT / 3) + 8));
const crownM2 = [0, 1, 2].map(() => new THREE.InstancedMesh(crownG, leafMats[0], Math.ceil(NT / 3) + 8));
/* الأشجار الإجرائية = بديل فقط إن فشل تحميل النماذج الحقيقية */
const procTreeMeshes = [];
{
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const c1 = [0, 0, 0], c2 = [0, 0, 0];
  SU.trees.forEach((t, i) => {
    const sc = clamp(.48 + t[2] * .85, .42, 2.0);
    const k = i % 3;
    e.set(0, rnd() * 6.28, 0); q.setFromEuler(e);
    v.set(t[0], 0, t[1]); s.set(sc, sc * (0.85 + rnd() * .4), sc); m.compose(v, q, s); trunkMesh.setMatrixAt(i, m);
    const th = 3.5 * sc;
    e.set(0, rnd() * 6.28, 0); q.setFromEuler(e);
    v.set(t[0], th + 1.3 * sc, t[1]); s.set(sc * 1.05, sc * .95, sc * 1.05);
    m.compose(v, q, s); crownMats[k].setMatrixAt(c1[k]++, m);
    e.set(0, rnd() * 6.28, 0); q.setFromEuler(e);
    v.set(t[0] + (rnd() - .5) * 1.4 * sc, th + 2.6 * sc, t[1] + (rnd() - .5) * 1.4 * sc);
    s.set(sc * .72, sc * .62, sc * .72); m.compose(v, q, s); crownM2[k].setMatrixAt(c2[k]++, m);
  });
  trunkMesh.instanceMatrix.needsUpdate = true;
  [crownMats, crownM2].forEach((arr, k) => arr.forEach((im, i) => {
    im.count = (k ? c2 : c1)[i];
    im.instanceMatrix.needsUpdate = true;
    im.material = leafMats[i];
    im.castShadow = true; im.receiveShadow = false;
    procTreeMeshes.push(im);
  }));
}
/* الأشجار الإجرائية تبقى مخفية افتراضياً: نُظهرها فقط إن فشل تحميل النماذج الحقيقية */
const procTreeAll = [trunkMesh].concat(procTreeMeshes);
procTreeAll.forEach(o => { o.visible = false; });

/* النخيل الإجرائي أُزيل: استُبدل بنموذج نخيل حقيقي (innerscene — CC0) داخل initRealFlora().
   الأشجار الإجرائية أدناه تبقى كبديل إن فشل تحميل النماذج الحقيقية فقط. */

/* أعمدة إنارة */
const lampPost = new THREE.Group();
(function () {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, 5, 6), mDark); p.position.y = 2.5; p.castShadow = true; lampPost.add(p);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, .12, .12), mDark); arm.position.set(.5, 4.9, 0); lampPost.add(arm);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe9b8 })); bulb.position.set(1.0, 4.75, 0); lampPost.add(bulb);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  glow.scale.set(7, 7, 1); glow.position.set(1.0, 4.75, 0); lampPost.add(glow);
  lampPost.userData.glow = glow;
})();
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,225,160,.95)'); gr.addColorStop(.35, 'rgba(255,200,110,.35)'); gr.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
const lampInst = new THREE.InstancedMesh(lampPost.children[0].geometry, mDark, Math.max(1, SU.lamps.length));
SU.lamps.forEach((l, i) => {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  q.setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0));
  m.compose(new THREE.Vector3(l[0], 0, l[1]), q, new THREE.Vector3(1, 1, 1));
  lampInst.setMatrixAt(i, m);
});
lampInst.instanceMatrix.needsUpdate = true; lampInst.castShadow = true;
campus.add(lampInst);
const lampGlows = new THREE.Group();
SU.lamps.forEach(l => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  s.scale.set(9, 9, 1); s.position.set(l[0] + 1, 4.7, l[1]); lampGlows.add(s);
});
campus.add(lampGlows);

/*TREELIB*/

/* ---------- 10. الشخصية ---------- */
prog(56, 'تحميل الشخصيات…');
const ch = new THREE.Group(); S.add(ch);
const proc = new THREE.Group(); ch.add(proc);
const sk = M(0xc68f64), wh = M(0xfdfcf8);
(function () {   /* بديل بسيط إن فشل تحميل النموذج */
  const bd = new THREE.Mesh(new THREE.CylinderGeometry(.34, .52, 1.4, 14), wh); bd.position.y = 1.1; proc.add(bd);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.28, 14, 10), sk); hd.position.y = 2.02; proc.add(hd);
  const mk = (x, y, len, r, m) => { const p = new THREE.Group(); p.position.set(x, y, 0);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 7), m); l.position.y = -len / 2; p.add(l); proc.add(p); return p; };
  proc.userData.limbs = { aL: mk(-.46, 1.66, .8, .09, wh), aR: mk(.46, 1.66, .8, .09, wh), lL: mk(-.17, .48, .5, .08, sk), lR: mk(.17, .48, .5, .08, sk) };
  proc.traverse(o => o.castShadow = true);
  proc.visible = false;
})();

const rigs = {};
let cur = null, cRig = null, cState = '';
let cVy = 0, cAir = false, cJumpHold = 0, cFloorY = 0, cLanding = 0;

/*CHARLIB*/
/*BLDLIB*/
/*ONLINE*/

function useChar(k) {
  if (cur === k && rigs[k]) return Promise.resolve();
  const p = rigs[k] ? Promise.resolve(rigs[k]) : Promise.resolve(buildOmani(k));
  return p.then(r => {
    for (const x in rigs) {
      if (rigs[x] && rigs[x].root && rigs[x].root.parent) rigs[x].root.parent.remove(rigs[x].root);
    }
    rigs[k] = r;
    ch.add(r.root); r.root.visible = true;
    proc.visible = false;
    cur = k; cRig = r; cState = '';
    cAir = false; cVy = 0; cLanding = 0;
    try { localStorage.setItem('ch', k); } catch (e) { }
    /* أبلغ الآخرين بتغيير الشخصية */
    try { if (typeof NET !== 'undefined') NET.announceChar(k); } catch (e) { }
  });
}

/* ---------- آلة الحالات: مشي / ركض / وقوف / قفز ---------- */
/* القفز: سرعة رأسية + حركة جذر، ترجع للمشي عند الهبوط */
function charJump() {
  if (!cRig) return;
  if (cAir) return;
  if (mode !== 'g' || trans) return;
  cAir = true; cVy = 6.1; cJumpHold = 0;
}
function charUpdate(dt, speed) {
  if (!cRig) return;
  /* ---- فيزياء القفز ---- */
  if (cAir) {
    cVy -= 17.5 * dt;          /* جاذبية */
    cFloorY = inside ? curFl * FH : 0;
    ch.position.y += cVy * dt;
    if (ch.position.y <= cFloorY) {
      ch.position.y = cFloorY; cVy = 0; cAir = false;
      /* ارتداد خفيف للكاميرا عند الهبوط */
      cLanding = .16;
    }
    cJumpHold += dt;
  } else if (cLanding > 0) cLanding = Math.max(0, cLanding - dt);
  /* حركة الشخصية (مشي/جري/وقوف) */
  cState = speed < .18 ? 'idle' : (speed > 3.5 ? 'run' : 'walk');
  if (cRig.update) cRig.update(dt, speed);
}
function charCelebrate() {
  if (cRig && cRig.celebrate) cRig.celebrate();
}

/* ---------- شخصيات NPC ----------
   حُذفت كل الشخصيات الماشية (كانت بوتات وهمية تمشي بلا سبب).
   الآن لا يظهر في الحرم إلا اللاعبون الحقيقيون القادمون عبر الشبكة. */

/* ---------- 10.5 لمسات واقعية: عشب، آثار أقدام، غبار، صوت ---------- */

/* قناع العشب من خريطة الحرم (لمنع نمو العشب على الطرق والمباني) */
const grassMask = (function () {
  if (!SU.grassMask) return null;
  const s = SU.grassMask, out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) === 49 ? 1 : 0;
  return { m: out, w: SU.grassW, h: SU.grassH, c: SU.grassCell, ox: -(SU.grassW * SU.grassCell) / 2, oz: -(SU.grassH * SU.grassCell) / 2 };
})();
function isGrass(x, z) {
  if (!grassMask) return true;
  const g = grassMask;
  const i = Math.floor((x - g.ox) / g.c), j = Math.floor((z - g.oz) / g.c);
  if (i < 0 || j < 0 || i >= g.w || j >= g.h) return false;
  return g.m[j * g.w + i] === 1;
}

/* العشب والأعشاب أُزيلت: كانت خصلات مبعثرة فوق الأرض تغطي المساحات المفتوحة.
   النباتات الحقيقية (Poly Haven) في initRealFlora() هي الوحيدة في المشهد. */

/* غبار المشي — آثار الأقدام أُزيلت (كانت نقاطاً سوداء ملتصقة بالأرض) */
let stepPhase = 0;

/* غبار */
const dustPuff = (function () {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(214,196,166,.75)'); gr.addColorStop(.5, 'rgba(200,182,152,.30)'); gr.addColorStop(1, 'rgba(200,182,152,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
})();
const dustPts = (function () {
  const N = 46, pos = new Float32Array(N * 3), life = new Float32Array(N), vel = [];
  for (let i = 0; i < N; i++) { pos[i * 3 + 1] = -50; life[i] = 0; vel.push(new THREE.Vector3()); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: dustPuff, size: .55, transparent: true, depthWrite: false, sizeAttenuation: true, opacity: .8 });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 3;
  campus.add(p);
  return { p, g, life, vel, N, head: 0 };
})();
function puff(x, z, s) {
  const i = dustPts.head; dustPts.head = (dustPts.head + 1) % dustPts.N;
  const a = dustPts.g.attributes.position;
  a.setXYZ(i, x, .12, z);
  dustPts.life[i] = 1;
  dustPts.vel[i].set((Math.random() - .5) * .35, .28 + Math.random() * .3, (Math.random() - .5) * .35);
  a.needsUpdate = true;
}
function stepFx(dt, spd) {
  if (spd > .2 && !inside) {
    stepPhase += dt * spd * 1.55;
    if (stepPhase > 1) {
      stepPhase -= 1;
      puff(ch.position.x, ch.position.z, 1);
      sfxStep();
    }
  }
  /* حركة الغبار */
  const a = dustPts.g.attributes.position;
  for (let i = 0; i < dustPts.N; i++) {
    if (dustPts.life[i] <= 0) continue;
    dustPts.life[i] -= dt * .9;
    if (dustPts.life[i] <= 0) { a.setY(i, -50); continue; }
    a.setX(i, a.getX(i) + dustPts.vel[i].x * dt);
    a.setY(i, a.getY(i) + dustPts.vel[i].y * dt);
    a.setZ(i, a.getZ(i) + dustPts.vel[i].z * dt);
    dustPts.vel[i].y -= dt * .25;
  }
  a.needsUpdate = true;
}

/* ---------- مؤثرات صوتية (مركّبة، بلا ملفات) ---------- */
let AC = null, sfxOn = false;
/* أجواء محيطية: هسيس رياح خفيف + زقزقة عصافير متفرقة */
let amb = null, ambTimer = 0;
function ambStart() {
  if (!AC || amb) return;
  try {
    const dur = 6, n = (AC.sampleRate * dur) | 0, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = last * .94 + w * .06; d[i] = last * 3.4; }
    const fade = (AC.sampleRate * .35) | 0;
    for (let i = 0; i < fade; i++) { d[i] *= i / fade; d[n - 1 - i] *= i / fade; }
    const src = AC.createBufferSource(); src.buffer = b; src.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 430; f.Q.value = .6;
    const g = AC.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(.032, AC.currentTime + 2.2);
    const lfo = AC.createOscillator(); lfo.frequency.value = .06;
    const lg = AC.createGain(); lg.gain.value = 190;
    lfo.connect(lg); lg.connect(f.frequency);
    src.connect(f); f.connect(g); g.connect(AC.destination);
    src.start(); lfo.start();
    amb = { src: src, g: g, lfo: lfo };
    ambBirds();
  } catch (e) { }
}
function ambStop() {
  if (!amb) return;
  try {
    amb.g.gain.cancelScheduledValues(AC.currentTime);
    amb.g.gain.setValueAtTime(amb.g.gain.value, AC.currentTime);
    amb.g.gain.linearRampToValueAtTime(0, AC.currentTime + .5);
    amb.src.stop(AC.currentTime + .6); amb.lfo.stop(AC.currentTime + .6);
  } catch (e) { }
  amb = null; clearTimeout(ambTimer); ambTimer = 0;
}
function ambBirds() {
  clearTimeout(ambTimer);
  ambTimer = setTimeout(() => {
    if (!sfxOn || !AC) return;
    try {
      const o = AC.createOscillator(); o.type = 'sine';
      const base = 1750 + Math.random() * 1500;
      const t0 = AC.currentTime;
      o.frequency.setValueAtTime(base, t0);
      o.frequency.exponentialRampToValueAtTime(base * (1.18 + Math.random() * .5), t0 + .06);
      o.frequency.exponentialRampToValueAtTime(base * .82, t0 + .15);
      const g = AC.createGain();
      g.gain.setValueAtTime(.0001, t0);
      g.gain.exponentialRampToValueAtTime(.026, t0 + .018);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + .22);
      o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + .3);
      if (Math.random() < .5) setTimeout(() => ambBirds(), 110 + Math.random() * 170);
    } catch (e) { }
    ambBirds();
  }, 2400 + Math.random() * 6200);
}
function audioInit() {
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
  if (AC && sfxOn) ambStart();
}
function noiseBuf(dur) {
  const n = AC.sampleRate * dur, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  return b;
}
function sfxStep() {
  if (!sfxOn || !AC) return;
  try {
    const s = AC.createBufferSource(); s.buffer = noiseBuf(.16);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900 + Math.random() * 500;
    const g = AC.createGain(); g.gain.value = .05;
    s.connect(f); f.connect(g); g.connect(AC.destination); s.start();
  } catch (e) { }
}
function sfxClick() {
  if (!sfxOn || !AC) return;
  try {
    const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = 660;
    const g = AC.createGain(); g.gain.setValueAtTime(.0001, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.05, AC.currentTime + .01);
    g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + .22);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + .25);
  } catch (e) { }
}
function sfxToggle(v) {
  sfxOn = v; audioInit();
  if (AC && AC.state === 'suspended') AC.resume();
  if (v) ambStart(); else ambStop();
  try { localStorage.setItem('sfx', v ? '1' : '0'); } catch (e) { }
}
try { if (localStorage.getItem('sfx') === '1') { sfxOn = true; } } catch (e) { }
/* تشغيل الأجواء عند أول تفاعل (سياسة المتصفح: لا تشغيل تلقائي) */
(function () {
  const kick = () => {
    if (!sfxOn) return;
    audioInit();
    if (AC && AC.state === 'suspended') AC.resume();
    ambStart();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, kick, { once: true, passive: true }));
})();


ch.position.set(0, 0, 170);
const col = [];   // عوائق
BLD.forEach(b => { if (b.kind === 'field') return; b.polys.forEach(p => col.push([b.minX, b.maxX, b.minZ, b.maxZ])); });
function hit(x, z, m) {
  m = m || .6;
  const list = inside ? inside.cols[curFl] : col;
  for (const b of list) if (x > b[0] - m && x < b[1] + m && z > b[2] - m && z < b[3] + m) return true;
  return false;
}
function free(x, z) {
  if (!hit(x, z, 1.2)) return [x, z];
  for (let r = 2; r < 60; r += 2) for (let k = 0; k < 16; k++) {
    const a = k / 16 * 6.283, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
    if (!hit(px, pz, 1.2) && Math.abs(px) < 250 && Math.abs(pz) < 270) return [px, pz];
  }
  return [x, z];
}
function move(dx, dz) {
  const p = ch.position;
  if (!hit(p.x + dx, p.z, .6)) p.x += dx;
  if (!hit(p.x, p.z + dz, .6)) p.z += dz;
  p.x = clamp(p.x, -250, 250); p.z = clamp(p.z, -275, 275);
}
const camD = () => (inside ? 4.2 : MOBILE ? 12 : 7.5) * zf;
function camPose(to, P, L) {
  if (to === 'a') { P.set(aer.x, aer.h, aer.z + aer.h * .58); L.set(aer.x, 0, aer.z); }
  else { const p = ch.position, d = camD(), c = Math.cos(pitch);
    P.set(p.x + Math.sin(yaw) * c * d, p.y + 1.62 + Math.sin(pitch) * d, p.z + Math.cos(yaw) * c * d);
    L.set(p.x, p.y + 1.45, p.z); }
}
function go(to) {
  trans = { to, t: 0, fp: C.position.clone(), fl: look.clone() };
  if (to === 'a') { aer.x = ch.position.x; aer.z = ch.position.z; aer.h = Math.max(aer.h, 190); }
  $('#vw').textContent = to === 'a' ? (lang === 'ar' ? '🔽 نزول' : '🔽 Drop') : (lang === 'ar' ? '🛰 منظر' : '🛰 Aerial');
  try { $('#jb').style.opacity = to === 'a' ? '.25' : '1'; } catch (e) { }
}
$('#vw').onclick = () => { if (!trans) go(mode === 'a' ? 'g' : 'a'); };
/* زر القفز (جوال) */
(function () {
  const b = $('#jb');
  if (!b) return;
  const go2 = e => { e.preventDefault(); e.stopPropagation(); charJump(); b.classList.add('up'); setTimeout(() => b.classList.remove('up'), 160); };
  b.addEventListener('pointerdown', go2);
  b.addEventListener('touchstart', go2, { passive: false });
  b.addEventListener('click', e => e.preventDefault());
})();
function zoom(f) { if (mode === 'a' || (trans && trans.to === 'a')) aer.h = clamp(aer.h * f, 25, 460); else zf = clamp(zf * f, .55, 2.4); }
function dropAt(x, z) {
  if (trans) return;
  if (inside) exitB(false);
  const f = free(x, z); ch.position.set(f[0], 0, f[1]); ch.rotation.y = 0;
  yaw = Math.atan2(f[0], f[1]); pitch = .32;
  if (tg) plan();
  go('g'); toast(T('drop') + ' ' + spotName(x, z));
}
function spotName(x, z) {
  let best = null, bd = 1e9;
  BLD.forEach(b => { const d = Math.hypot(b.cx - x, b.cz - z); if (d < bd) { bd = d; best = b; } });
  return best && bd < 60 ? (lang === 'ar' ? best.ar : best.en) : '';
}

/* ---------- 12. ملصقات المباني ---------- */
const lb = BLD.filter(b => b.kind !== 'field').map(b => {
  const el = document.createElement('button'); el.className = 'lbl';
  el.innerHTML = '<b>' + (b.code || b.id) + '</b> ' + (lang === 'ar' ? b.ar : b.en);
  el.onclick = e => { e.stopPropagation(); dropAt(b.cx, b.cz); };
  $('#lbls').appendChild(el);
  return { b, el };
});
function updLabels() {
  const on = mode === 'a' && !trans && !shot;
  const v = new THREE.Vector3();
  for (const l of lb) {
    if (!on) { l.el.style.display = 'none'; continue; }
    v.set(l.b.cx, l.b.h + 4, l.b.cz).project(C);
    if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { l.el.style.display = 'none'; continue; }
    l.el.style.display = 'block';
    l.el.style.transform = 'translate(-50%,-50%) translate(' + ((v.x + 1) / 2 * innerWidth) + 'px,' + ((1 - v.y) / 2 * innerHeight) + 'px)';
  }
}

/* ---------- 13. البحث ---------- */
const inp = $('#q'), res = $('#res');
const norm = s => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
const BN = b => lang === 'en' ? b.en : b.ar;
function results(q) {
  q = norm(q); const out = [];
  const m = q.toUpperCase().replace(/\s+/g, '').match(/^([A-Z]{1,3})-?(\d)[.\-]?(\d{1,2})$/);
  if (m) {
    const b = BLD.find(x => x.code === m[1]);
    if (b && b.info.int) {
      const rm = pad2(+m[3]);
      out.push({ n: m[1] + m[2] + '.' + rm, s: (lang === 'ar' ? b.ar : b.en) + ' — ' + T('fl') + ' ' + m[2], x: b.entrance.x, z: b.entrance.z, room: { b, fl: +m[2], n: +m[3] } });
    }
  }
  const lq = q.toLowerCase();
  BLD.forEach(b => {
    if (!lq || b.ar.includes(q) || b.en.toLowerCase().includes(lq) || (b.code && b.code.toLowerCase() === lq))
      out.push({ n: (b.code ? '[' + b.code + '] ' : '') + BN(b), s: lang === 'ar' ? b.en : b.ar, x: b.cx, z: b.cz, b: b });
  });
  return out;
}
const pad2 = n => String(n).padStart(2, '0');
function renderRes() {
  res.innerHTML = '';
  const r = results(inp.value).slice(0, 8);
  r.forEach(i => {
    const b = document.createElement('button');
    b.innerHTML = '<b>' + i.n + '</b><span>' + i.s + '</span>';
    b.onclick = () => choose(i); res.appendChild(b);
  });
  res.hidden = !r.length;
}
inp.addEventListener('input', renderRes);
inp.addEventListener('focus', renderRes);
inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const r = results(inp.value); if (r[0]) choose(r[0]); } });
function choose(i) {
  res.hidden = true; inp.blur();
  let t = { n: i.n, x: i.x, z: i.z, bk: null, fl: null, rm: null };
  if (i.room) { enterB(i.room.b); t.bk = i.room.b.id; t.fl = i.room.fl; }
  else if (i.b) { if (i.b.info.int) enterB(i.b); }
  tg = t; plan();
  $('#hud').hidden = false; $('#tn').textContent = T('to') + ' ' + tg.n;
  if (mode === 'a' && !trans) go('g');
}
$('#x').onclick = () => { tg = null; route = []; dots.count = 0; bc.visible = false; $('#hud').hidden = true; };

/* ---------- 14. المباني الداخلية ---------- */
const FH = 3.6, WT = .2, WH = 3.2, CW = 1.3, STL = 6, DW = 1.2, RW = 4.4;
const INT = {};
const tTile = ctex(128, 128, (g, w, h) => { g.fillStyle = '#ece6d7'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9ae95'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); });
const tWood = ctex(128, 128, (g, w, h) => { g.fillStyle = '#cfae84'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(90,60,30,.12)'; g.fillRect(0, i * 32, w, 2); } });
function layoutInt(L, D) {
  const hl = L / 2, hd = D / 2, rooms = [], walls = [], frs = [];
  [[1, [[-hl, -CW], [CW, hl]]], [-1, [[-hl, hl - STL]]]].forEach(rr => {
    const s = rr[0];
    rr[1].forEach(ab => {
      const n = Math.max(1, Math.round((ab[1] - ab[0]) / RW)), w = (ab[1] - ab[0]) / n;
      for (let k = 0; k < n; k++) rooms.push({ s, x0: ab[0] + k * w, x1: ab[0] + (k + 1) * w });
      for (let k = 0; k <= n; k++) walls.push({ x0: ab[0] + k * w - WT / 2, x1: ab[0] + k * w + WT / 2, z0: Math.min(s * CW, s * hd), z1: Math.max(s * CW, s * hd) });
    });
  });
  const P = rooms.filter(r => r.s > 0).sort((a, b) => a.x0 - b.x0), N = rooms.filter(r => r.s < 0).sort((a, b) => a.x0 - b.x0);
  P.forEach((r, i) => r.num = 2 * i + 1); N.forEach((r, i) => r.num = 2 * i + 2);
  rooms.forEach(r => {
    const zc = r.s * CW; r.dc = (r.x0 + r.x1) / 2; r.dw = Math.min(DW, r.x1 - r.x0 - .6); r.lx = r.dc; r.lz = r.s * (CW + hd) / 2;
    walls.push({ x0: r.x0, x1: r.dc - r.dw / 2, z0: zc - WT / 2, z1: zc + WT / 2 }, { x0: r.dc + r.dw / 2, x1: r.x1, z0: zc - WT / 2, z1: zc + WT / 2 },
      { x0: r.dc - r.dw / 2, x1: r.dc + r.dw / 2, z0: zc - WT / 2, z1: zc + WT / 2, y0: 2.3, lintel: 1 });
    frs.push({ x0: r.x0, x1: r.x1, z0: Math.min(zc, r.s * hd), z1: Math.max(zc, r.s * hd), k: 'room' });
  });
  frs.push({ x0: -hl, x1: hl, z0: -CW, z1: CW, k: 'corr' }, { x0: -CW, x1: CW, z0: CW, z1: hd, k: 'lobby' }, { x0: hl - STL, x1: hl, z0: -hd, z1: -CW, k: 'stair' });
  const perim = fl => {
    const a = [], zb = hd;
    if (fl === 0) a.push({ x0: -hl, x1: -DW / 2, z0: zb - WT / 2, z1: zb + WT / 2 }, { x0: DW / 2, x1: hl, z0: zb - WT / 2, z1: zb + WT / 2 }, { x0: -DW / 2, x1: DW / 2, z0: zb - WT / 2, z1: zb + WT / 2, y0: 2.3, lintel: 1 });
    else a.push({ x0: -hl, x1: hl, z0: zb - WT / 2, z1: zb + WT / 2 });
    a.push({ x0: -hl, x1: hl, z0: -hd - WT / 2, z1: -hd + WT / 2 }, { x0: -hl - WT / 2, x1: -hl + WT / 2, z0: -hd, z1: hd }, { x0: hl - WT / 2, x1: hl + WT / 2, z0: -hd, z1: hd });
    return a;
  };
  return { rooms, walls, frs, perim, hl, hd };
}
const mWI = M(0xf1ecdf, { roughness: .95 }), mDesk = M(0x9a7a55, { roughness: .6 });
function plate(t, w, h, dir) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#0E3B4F'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = '#C99A3B'; g.lineWidth = 5; g.strokeRect(5, 5, 246, 86);
  g.fillStyle = '#f1e8d4'; g.font = '700 40px "IBM Plex Sans Arabic", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = dir || 'ltr';
  g.fillText(t, 128, 50);
  const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }));
}
function makeInt(b) {
  const L = Math.max(16, b.w - 6), D = Math.max(10, b.d - 5);
  const lay = layoutInt(L, D), I = { b, hl: lay.hl, hd: lay.hd, rooms: lay.rooms, cols: [], floors: [], nf: b.info.int || 2, rmap: {} };
  I.grp = new THREE.Group(); I.grp.position.set(b.cx, 0, b.cz); I.grp.visible = false; S.add(I.grp);
  for (let fl = 0; fl < I.nf; fl++) {
    const fg = new THREE.Group(); fg.visible = false; I.grp.add(fg); I.floors.push(fg);
    const y = fl * FH, cl = []; I.cols.push(cl);
    const addW = w => {
      const y0 = w.y0 || 0, y1 = w.y1 || WH;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.x1 - w.x0, y1 - y0, w.z1 - w.z0), mWI);
      m.position.set((w.x0 + w.x1) / 2, y + (y0 + y1) / 2, (w.z0 + w.z1) / 2);
      m.castShadow = m.receiveShadow = true; fg.add(m);
      if (!w.lintel) cl.push([(w.x0 + w.x1) / 2 - (w.x1 - w.x0) / 2 - .3, (w.x0 + w.x1) / 2 + (w.x1 - w.x0) / 2 + .3, (w.z0 + w.z1) / 2 - (w.z1 - w.z0) / 2 - .3, (w.z0 + w.z1) / 2 + (w.z1 - w.z0) / 2 + .3]);
    };
    lay.walls.concat(lay.perim(fl)).forEach(addW);
    lay.frs.forEach(f => {
      const tx = f.k === 'corr' ? tTile : f.k === 'room' ? tWood : tTile;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(f.x1 - f.x0, f.z1 - f.z0), M(0xffffff, { map: tx, roughness: .85 }));
      m.rotation.x = -Math.PI / 2; m.position.set((f.x0 + f.x1) / 2, y + .02, (f.z0 + f.z1) / 2); m.receiveShadow = true; fg.add(m);
    });
    lay.rooms.forEach(r => {
      const nm = (b.code || b.id) + fl + '.' + pad2(r.num);
      I.rmap[fl + '.' + pad2(r.num)] = { ...r, fl, nm };
      const p = plate(nm, .95, .36, 'ltr');
      p.position.set(r.dc, y + 2.55, r.s * (CW - .11)); p.rotation.y = r.s > 0 ? Math.PI : 0; fg.add(p);
      if (r.x1 - r.x0 >= 3) for (const xx of [r.x0 + .8, r.x1 - .8]) for (const dz of [2.4, 5.2]) {
        const dk = new THREE.Mesh(new THREE.BoxGeometry(1, .05, .6), mDesk); dk.position.set(xx, y + .75, r.s * (CW + dz)); dk.castShadow = true; fg.add(dk);
      }
    });
    const sp = plate(b.ar, 2.8, .7, 'rtl'); sp.position.set(0, y + 2.7, lay.hd - .11); sp.rotation.y = Math.PI; fg.add(sp);
    const st = plate('Stairs', 1.7, .45, 'ltr'); st.position.set(lay.hl - STL + .1, y + 2.45, -(CW + lay.hd) / 2); st.rotation.y = Math.PI / 2; fg.add(st);
  }
  I.stair = [lay.hl - STL / 2, -(CW + lay.hd) / 2];
  /* جدران المبنى الداخلية تُحسب بإحداثيات محلية — نحوّلها إلى إحداثيات العالم
     وإلا اخترق اللاعب الجدران أو خرج من المبنى أثناء التجوّل */
  I.cols.forEach(arr => arr.forEach(c => { c[0] += b.cx; c[1] += b.cx; c[2] += b.cz; c[3] += b.cz; }));
  return I;
}
BLD.forEach(b => { if (b.info.int) { try { INT[b.id] = makeInt(b); } catch (e) { __showErr('داخل المبنى: ' + e.message); } } });
let ibKey = '';
function enterB(b) {
  const I = INT[b.id]; if (!I || inside === I) return;
  if (inside) exitB(true);
  inside = I; curB = b; I.grp.visible = true; curFl = 0;
  /* نخفي هيكل المبنى الخارجي حتى يرى اللاعب داخلاً بحرية */
  if (b.g) b.g.visible = false;
  /* نقف في بهو المبنى الداخلي وننظر نحو الممر (اتجاه -z) */
  const hd = I.hd || 6;
  ch.position.set(b.cx, 0, b.cz + Math.max(2.0, hd - 2.4));
  ch.rotation.y = Math.PI; yaw = 0; pitch = .08;
  setFloor(0);
  toast((lang === 'ar' ? 'دخلت ' : 'Inside ') + BN(b) + (b.code ? ' (' + b.code + ')' : ''), 3000);
  updIBar(true);
}
function exitB(keep) {
  const I = inside; if (!I) return;
  const b = I.b;
  inside = null; I.grp.visible = false; curB = null;
  if (b.g) b.g.visible = true;
  /* نخرج من المدخل الحقيقي لا من منتصف المبنى */
  const e = (b.entrance) || { x: b.cx, z: b.cz };
  let ox = e.x - b.cx, oz = e.z - b.cz;
  const L = Math.hypot(ox, oz) || 1; ox /= L; oz /= L;
  const f = free(e.x + ox * 2.8, e.z + oz * 2.8);
  ch.position.set(f[0], 0, f[1]);
  ch.rotation.y = 0; yaw = 0; pitch = .14;
  cAir = false; cVy = 0;
  if (!keep && tg && tg.bk) { tg = null; $('#hud').hidden = true; }
  navGrid(); if (tg) plan(); ibKey = '';
}
function setFloor(fl) {
  if (!inside) return;
  curFl = fl; ch.position.y = fl * FH;
  cAir = false; cVy = 0;
  inside.floors.forEach((f, i) => f.visible = i === fl);
  if (tg && tg.bk === inside.b.id) planIn();
  ibKey = ''; updIBar(true);
}
const ibar = document.createElement('div'); ibar.id = 'ibar'; ibar.className = 'p';
ibar.style.cssText = 'position:fixed;top:calc(120px + var(--safeT));left:50%;transform:translateX(-50%);z-index:12;display:none;gap:6px;padding:7px 9px;align-items:center;flex-wrap:wrap;max-width:94vw';
document.body.appendChild(ibar);
ibar.addEventListener('click', e => {
  const f = e.target.closest('[data-f]'), x = e.target.closest('[data-x]');
  if (f) setFloor(+f.dataset.f); else if (x) exitB(false);
});
function updIBar(force) {
  if (inside) {
    const key = 'in|' + inside.b.id + '|' + curFl + '|' + lang;
    if (key !== ibKey || force) {
      ibKey = key;
      let h = '<b style="font-size:12px;margin-inline-end:6px">' + BN(inside.b) + '</b>';
      for (let f = 0; f < inside.nf; f++) h += '<button class="p" data-f="' + f + '" style="min-height:34px;padding:5px 10px;font-size:12px;border-radius:10px;' + (f === curFl ? 'background:var(--gold);color:#12222b' : '') + '">' + T('fl') + ' ' + (f === 0 ? T('first') : f) + '</button>';
      h += '<button class="p" data-x="1" style="min-height:34px;padding:5px 10px;font-size:12px;border-radius:10px">' + T('exit') + '</button>';
      ibar.innerHTML = h; ibar.style.display = 'flex';
    }
    return;
  }
  ibar.style.display = 'none'; ibKey = '';
}

/* ---------- 14.1 الدخول للمباني: زر عند المدخل + نقرة على الباب ---------- */
let nearDoor = null;
const doorBar = document.createElement('div'); doorBar.id = 'doorbar'; doorBar.className = 'p';
doorBar.style.cssText = 'position:fixed;bottom:calc(104px + var(--safeB));left:50%;transform:translateX(-50%);z-index:13;display:none;gap:9px;align-items:center;padding:9px 12px;max-width:92vw;white-space:nowrap';
document.body.appendChild(doorBar);
doorBar.addEventListener('click', e => {
  if (!e.target.closest('[data-enter]')) return;
  const b = BY[doorBar.dataset.b];
  if (b && INT[b.id]) enterB(b);
});
function updDoorBar() {
  if (inside) { doorBar.style.display = 'none'; nearDoor = null; return; }
  const p = ch.position;
  let best = null, bd = 1e9;
  for (const b of BLD) {
    if (b.kind === 'field' || !b.entrance || !b.info || !b.info.int || !INT[b.id]) continue;
    const d = Math.hypot(b.entrance.x - p.x, b.entrance.z - p.z);
    if (d < bd) { bd = d; best = b; }
  }
  if (best && bd < 6) {
    nearDoor = best;
    const key = 'd' + best.id + lang;
    if (doorBar.dataset.key !== key) {
      doorBar.dataset.key = key; doorBar.dataset.b = best.id;
      doorBar.innerHTML = '<span style="font-size:12.5px">' + (lang === 'ar' ? 'ادخل إلى' : 'Enter') + ' ' + BN(best) + '</span>' +
        '<button class="p" data-enter="1" style="min-height:36px;padding:6px 14px;font-size:13px;border-radius:11px;background:var(--gold);color:#12222b;font-weight:700">' + (lang === 'ar' ? 'ادخل' : 'Enter') + '</button>';
    }
    doorBar.style.display = 'flex';
  } else { nearDoor = null; doorBar.style.display = 'none'; doorBar.dataset.key = ''; }
}

/* ---------- 15. المسار والوصول ---------- */
const bc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 46, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xc99a3b, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
bc.visible = false; S.add(bc);
const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(.55, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe0a82e, toneMapped: false }), 600);
dots.count = 0; dots.frustumCulled = false; S.add(dots);
let X0 = -260, Z0 = -280, CS = 4, GW = 132, GH = 140, bl = new Uint8Array(GW * GH), bl2;
function navGrid() {
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = X0 + i * CS + 2, z = Z0 + j * CS + 2;
    bl[j * GW + i] = (Math.abs(x) > 250 || z < -272 || z > 272 || hit(x, z, 2)) ? 1 : 0;
  }
  bl2 = new Uint8Array(bl);
  if (acc) {
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x = X0 + i * CS + 2, z = Z0 + j * CS + 2;
      if (hit(x, z, 4)) bl2[j * GW + i] = 1;
    }
  }
}
navGrid();
const cell = (x, z) => [clamp(((x - X0) / CS) | 0, 0, GW - 1), clamp(((z - Z0) / CS) | 0, 0, GH - 1)];
const wc = c => [X0 + (c % GW) * CS + 2, Z0 + ((c / GW) | 0) * CS + 2];
function nf(i, j) {
  if (i >= 0 && j >= 0 && i < GW && j < GH && !bl[j * GW + i]) return [i, j];
  for (let r = 1; r < 10; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
    if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
    const ni = i + a, nj = j + b;
    if (ni >= 0 && nj >= 0 && ni < GW && nj < GH && !bl[nj * GW + ni]) return [ni, nj];
  }
  return [i, j];
}
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
function plan() {
  if (!tg) return;
  if (inside && tg.bk === inside.b.id) { planIn(); return; }
  const grid = acc && bl2 ? bl2 : bl;
  const p = ch.position;
  const si = nf(...cell(p.x, p.z)), ti = nf(...cell(tg.x, tg.z));
  const par = new Int32Array(GW * GH).fill(-1), s0 = si[1] * GW + si[0], T2 = ti[1] * GW + ti[0];
  const q = [s0]; par[s0] = s0;
  for (let h = 0; h < q.length && par[T2] < 0; h++) {
    const c = q[h], ci = c % GW, cj = (c / GW) | 0;
    for (let d = 0; d < 8; d++) {
      const ni = ci + DX[d], nj = cj + DY[d];
      if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
      const n = nj * GW + ni;
      if (par[n] >= 0 || grid[n]) continue;
      if (d > 3 && (grid[cj * GW + ni] || grid[nj * GW + ci])) continue;
      par[n] = c; q.push(n);
    }
  }
  const pts = [];
  if (par[T2] >= 0) { for (let c = T2; c !== par[c]; c = par[c]) pts.push(wc(c)); pts.reverse(); }
  const all = [[p.x, p.z]].concat(pts, [[tg.x, tg.z]]);
  route = [all[0]];
  let i = 0;
  while (i < all.length - 1) { let j = all.length - 1; while (j > i + 1 && !los(all[i], all[j])) j--; route.push(all[j]); i = j; }
  drawDots();
}
function los(a, b) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
  for (let k = 1; k < n; k++) { const t = k / n; if (hit(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 1.4)) return false; }
  return true;
}
function planIn() {
  const I = inside; if (!I || !tg) return;
  const l = { x: ch.position.x - I.b.cx, z: ch.position.z - I.b.cz };
  const P = [[l.x, l.z]];
  const r0 = roomAtL(I, l);
  if (r0) P.push([r0.dc, r0.s * CW], [r0.dc, 0]); else P.push([l.x, 0]);
  if (tg.fl !== curFl) P.push([I.stair[0], 0], I.stair);
  else { const r = I.rmap[tg.fl + '.' + pad2(tg.rm)]; if (r) P.push([r.dc, 0], [r.dc, r.s * CW], [r.lx, r.lz]); }
  route = P.map(q => [q[0] + I.b.cx, q[1] + I.b.cz]);
  drawDots();
}
function roomAtL(I, l) {
  for (const r of I.rooms) {
    const zz = l.z;
    if (l.x > r.x0 - 1 && l.x < r.x1 + 1 && (r.s > 0 ? (zz > CW && zz < I.hd) : (zz < -CW && zz > -I.hd))) return r;
  }
  return null;
}
function drawDots() {
  const y = (inside ? curFl * FH : 0) + .12;
  let n = 0; const mt = new THREE.Matrix4();
  for (let k = 0; k < route.length - 1 && n < 590; k++) {
    const a = route[k], b = route[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let d = 0; d < L && n < 590; d += (inside ? 1.6 : 2.6)) {
      mt.makeScale(inside ? 1 : 2, 1, inside ? 1 : 2);
      mt.setPosition(a[0] + (b[0] - a[0]) * d / L, y, a[1] + (b[1] - a[1]) * d / L);
      dots.setMatrixAt(n++, mt);
    }
  }
  dots.count = n; dots.instanceMatrix.needsUpdate = true;
  lastP = { x: ch.position.x, z: ch.position.z };
}
function guide() {
  const p = ch.position;
  let k = route.findIndex((r, i) => i > 0 && Math.hypot(r[0] - p.x, r[1] - p.z) > 3);
  if (k < 0) k = route.length - 1;
  if (k < 0) return { nx: tg.x, nz: tg.z, L: Math.hypot(tg.x - p.x, tg.z - p.z) };
  let L = Math.hypot(route[k][0] - p.x, route[k][1] - p.z);
  for (let i = k; i < route.length - 1; i++) L += Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
  return { nx: route[k][0], nz: route[k][1], L };
}

/* ---------- 10.3 عناصر واقعية: مقاعد ولوحات وسيارات ---------- */
(function () {
  const wood = M(0x8a5f38, { roughness: .9 });
  const metal = M(0x4a4f56, { roughness: .55, metalness: .55 });

  /* الشجيرات والكرات الزهرية أُزيلت: مجسمات بلا فائدة تشوّه المشهد.
     الشجيرات الحقيقية من Poly Haven تُزرع في initRealFlora() */
  const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), vv = new THREE.Vector3(), ss = new THREE.Vector3();
  /* المقاعد والسلال الإجرائية أُزيلت: كانت تُوضع بزوايا عشوائية بعيداً عن الممر.
     المقاعد الحقيقية (Poly Haven — modular_street_seating) تُزرع محاذيةً للممرات
     داخل initRealFlora(). */

  /* لوحات إرشاد أمام المباني */
  function signTex(txt, sub) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#0E3B4F'; x.fillRect(0, 0, 256, 128);
    x.strokeStyle = '#d9b45a'; x.lineWidth = 6; x.strokeRect(8, 8, 240, 112);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 44px Tahoma, Arial'; x.fillText(txt, 128, 52);
    x.font = '20px Tahoma, Arial'; x.fillStyle = '#cfe3ea'; x.fillText(sub || '', 128, 92);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  BLD.forEach(b => {
    if (b.kind === 'field') return;
    const info = INFO[b.id] || {};
    const txt = (info.code || info.en || '').slice(0, 6);
    const sub = (info.ar || '').slice(0, 22);
    const t = signTex(txt, sub);
    const mat = new THREE.MeshStandardMaterial({ map: t, roughness: .8, metalness: 0 });
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.1, 8), metal); post.position.y = 1.05; post.castShadow = true; g.add(post);
    const pan = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .75), mat);
    pan.position.y = 2.0; pan.castShadow = true; g.add(pan);
    const pan2 = pan.clone(); pan2.rotation.y = Math.PI; g.add(pan2);
    /* اللوحة عند المدخل الحقيقي: أمامه على امتداد اتجاه الخارج */
    const e = b.entrance;
    let ox = e.x - b.cx, oz = e.z - b.cz;
    const L = Math.hypot(ox, oz) || 1; ox /= L; oz /= L;
    let px = e.x + ox * 3.4, pz = e.z + oz * 3.4;
    if (hit(px, pz, 1.2)) { px = e.x + ox * 2.3; pz = e.z + oz * 2.3; }
    g.position.set(px, 0, pz); g.rotation.y = Math.atan2(ox, oz);
    campus.add(g);
  });

  /* السيارات أُزيلت: مجسمات مركونة عشوائياً تشوّه المشهد ولا تطابق الخريطة الرسمية.
     المواقف تُركت فارغة كما هي في خريطة الحرم. */
})();

/* ---------- 16. الخريطة المصغرة ---------- */
const mm = $('#mm'), mg = mm.getContext('2d');
const MMX = x => (x + 260) / 520 * mm.width, MMZ = z => (z + 280) / 560 * mm.height;
function drawMM() {
  mg.clearRect(0, 0, mm.width, mm.height);
  if (groundTex.image) mg.drawImage(groundTex.image, 0, 0, mm.width, mm.height);
  else { mg.fillStyle = '#243b47'; mg.fillRect(0, 0, mm.width, mm.height); }
  if (route.length > 1) {
    mg.strokeStyle = '#f0b429'; mg.lineWidth = 3; mg.beginPath();
    route.forEach((r, i) => i ? mg.lineTo(MMX(r[0]), MMZ(r[1])) : mg.moveTo(MMX(r[0]), MMZ(r[1])));
    mg.stroke();
  }
  if (tg) { mg.strokeStyle = '#ff5a5a'; mg.lineWidth = 3; mg.beginPath(); mg.arc(MMX(tg.x), MMZ(tg.z), 7, 0, 7); mg.stroke(); }
  const p = ch.position, a = Math.atan2(Math.cos(ch.rotation.y), Math.sin(ch.rotation.y));
  mg.save(); mg.translate(MMX(p.x), MMZ(p.z)); mg.rotate(a);
  mg.fillStyle = '#0E3B4F'; mg.strokeStyle = '#fff'; mg.lineWidth = 1.6;
  mg.beginPath(); mg.moveTo(9, 0); mg.lineTo(-6, -6); mg.lineTo(-6, 6); mg.closePath(); mg.fill(); mg.stroke(); mg.restore();
}
mm.addEventListener('click', e => {
  const r = mm.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * 520 - 260, z = (e.clientY - r.top) / r.height * 560 - 280;
  dropAt(x, z);
});

/* ---------- 17. اللمس والماوس ---------- */
const cv = R.domElement, ptr = new Map();
cv.style.touchAction = 'none';
let st = { x: 0, y: 0, t: 0, m: 0 };
cv.addEventListener('pointerdown', e => {
  ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); cv.setPointerCapture(e.pointerId);
  st = { x: e.clientX, y: e.clientY, t: performance.now(), m: 0 };
  res.hidden = true; if (document.activeElement) document.activeElement.blur();
});
cv.addEventListener('pointermove', e => {
  const p = ptr.get(e.pointerId); if (!p || trans) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  if (ptr.size >= 2) {
    /* Map.values() مُكرِّر وليس مصفوفة — Array.from ضرورية (وإلا o[0] = undefined) */
    const o = Array.from(ptr.values());
    if (o.length < 2) { p.x = e.clientX; p.y = e.clientY; return; }
    const d0 = Math.hypot(o[0].x - o[1].x, o[0].y - o[1].y);
    p.x = e.clientX; p.y = e.clientY;
    const d1 = Math.hypot(o[0].x - o[1].x, o[0].y - o[1].y);
    if (d1 > 0) zoom(d0 / d1);
    st.m += 99; return;
  }
  p.x = e.clientX; p.y = e.clientY; st.m += Math.abs(dx) + Math.abs(dy);
  if (mode === 'a') { const k = 2 * aer.h * .554 / innerHeight; aer.x = clamp(aer.x - dx * k, -240, 240); aer.z = clamp(aer.z - dy * k * 1.15, -260, 260); }
  else { yaw -= dx * .006; pitch = clamp(pitch + dy * .005, .02, inside ? .30 : 1.12); }
});
const up = e => {
  ptr.delete(e.pointerId);
  if (shot) { if (e.type === 'pointerup' && st.m < 10) capture(); return; }
  if (e.type === 'pointerup' && st.m < 10 && performance.now() - st.t < 450 && ptr.size === 0 && !trans) {
    if (mode === 'a') tapGround(e.clientX, e.clientY);
    else if (!tapBuilding(e.clientX, e.clientY)) { /* لا شيء */ }
  }
};
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.12 : .89); }, { passive: false });
const rc = new THREE.Raycaster(), gp = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function tapGround(x, y) {
  rc.setFromCamera({ x: x / innerWidth * 2 - 1, y: -(y / innerHeight) * 2 + 1 }, C);
  const pt = new THREE.Vector3();
  if (rc.ray.intersectPlane(gp, pt)) {
    /* أقرب مبنى */
    let best = null, bd = 1e9;
    BLD.forEach(b => { if (b.kind === 'field') return; const d = Math.hypot(b.cx - pt.x, b.cz - pt.z); if (d < bd) { bd = d; best = b; } });
    if (best && bd < Math.max(best.w, best.d) * .7) { choose({ n: BN(best), s: best.en, x: best.cx, z: best.cz, b: best }); return; }
    dropAt(pt.x, pt.z);
  }
}
/* النقر على مبنى يفتح بطاقته */
function tapBuilding(x, y) {
  rc.setFromCamera({ x: x / innerWidth * 2 - 1, y: -(y / innerHeight) * 2 + 1 }, C);
  const hits = rc.intersectObjects(campus.children, true);
  for (const h of hits) {
    const u = h.object.userData || {};
    /* نقرة على باب المبنى = دخول مباشر */
    if (u.doorId != null && BY[u.doorId]) {
      const db = BY[u.doorId];
      if (db.info && db.info.int && INT[db.id]) { enterB(db); return true; }
    }
    const id = u.bid;
    if (id != null && BY[id]) { openBuilding(BY[id]); return true; }
  }
  return false;
}
function openBuilding(b) {
  const info = b.info || {};
  sfxClick();
  const ttl = lang === 'en' ? (info.en || b.en) : (info.ar || b.en);
  const sub = lang === 'en' ? (info.ue || '') : (info.u || '');
  openSheet('<h3>' + ttl + (info.code ? ' (' + info.code + ')' : '') + '<button class="xbtn" data-close="1">✕</button></h3>' +
    '<p>' + sub + '</p>' +
    '<div class="row"><button class="chip" id="bGo">' + (lang === 'en' ? 'Take me there' : 'اذهب إليه') + '</button>' +
    '<button class="chip" id="bInfo">' + (lang === 'en' ? 'All buildings' : 'دليل المباني') + '</button></div>');
  const g = $('#bGo'); if (g) g.onclick = () => { closeSheet(); choose({ n: BN(b), s: b.en, x: b.cx, z: b.cz, b: b }); };
  const i2 = $('#bInfo'); if (i2) i2.onclick = () => { closeSheet(); showGuide(); };
}

/* عصا التحكم */
const pad = $('#pad'), knob = $('#knob'); let pid = null;
if (TOUCH) pad.classList.add('on');
function jm(e) {
  const r = pad.getBoundingClientRect(), R2 = r.width / 2;
  let dx = e.clientX - (r.left + R2), dy = e.clientY - (r.top + R2);
  const l = Math.hypot(dx, dy); if (l > R2) { dx *= R2 / l; dy *= R2 / l; }
  jx = dx / R2; jy = -dy / R2; knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
}
pad.addEventListener('pointerdown', e => { pid = e.pointerId; pad.setPointerCapture(pid); jm(e); });
pad.addEventListener('pointermove', e => { if (e.pointerId === pid) jm(e); });
['pointerup', 'pointercancel'].forEach(n => pad.addEventListener(n, () => { pid = null; jx = jy = 0; knob.style.transform = ''; }));

/* ---------- 18. واجهة القوائم ---------- */
const menu = $('#menu'), panel = $('#panel'), sheet = $('#sheet');
$('#mn').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
document.addEventListener('click', e => { if (!menu.contains(e.target) && !e.target.closest('#mn')) menu.hidden = true; });
function openSheet(html) { sheet.innerHTML = html; panel.hidden = false; panel.classList.add('open'); }
function closeSheet() { panel.hidden = true; panel.classList.remove('open'); }
panel.addEventListener('click', e => { if (e.target === panel) closeSheet(); });
const act = (id, fn) => $(id).onclick = () => { menu.hidden = true; fn(); };
let tt;
function toast(t, ms) {
  const o = $('#toast'); o.textContent = t; o.style.opacity = 1; clearTimeout(tt);
  tt = setTimeout(() => o.style.opacity = 0, ms || 3400);
}
function buzz(ms) { if (navigator.vibrate) try { navigator.vibrate(ms || 12); } catch (e) { } }

/* شريط الجوال */
$$('#dock button').forEach(b => b.onclick = () => {
  const d = b.dataset.d;
  if (d === 'map') { $('#mmwrap').classList.toggle('hidden'); }
  else if (d === 'search') { $('#q').focus(); $('#q').select(); }
  else if (d === 'tour') { tour.on ? stopTour() : startTour(); }
  else if (d === 'view') { if (!trans) go(mode === 'a' ? 'g' : 'a'); }
  else if (d === 'menu') { menu.hidden = !menu.hidden; }
  $$('#dock button').forEach(x => x.classList.toggle('on', x.dataset.d === d));
});

/* ---------- 19. الجولة التعريفية ---------- */
const TOURS = [
  { id: 1, ar: 'مبنى صحم', en: 'Saham Building', t: 'أحد أبرز مباني الحرم، ويطل على المدخل الرئيسي حيث تستقبل الجامعة الزائرين.', te: 'One of the campus landmarks overlooking the main gate where visitors are received.' },
  { id: 5, ar: 'مركز مصادر التعلم', en: 'Learning Resources Centre', t: 'مركز مصادر التعلم: المكتبة العامة وقاعات المذاكرة والدراسة الفردية في قلب الحرم.', te: 'The Learning Resources Centre: the library, study rooms and group study halls at the heart of campus.' },
  { id: 2, ar: 'مبنى الخابورة', en: 'Al Khaboura Building', t: 'مبنى الخابورة: قاعات محاضرات ومعامل ومقرات الكليات.', te: 'Al Khaboura Building: lecture theatres, laboratories and faculty offices.' },
  { id: 9, ar: 'مبنى بركاء', en: 'Barka Building', t: 'مبنى بركاء: قاعات المحاضرات الرئيسية لطلبة البكالوريوس.', te: 'Barka Building: the main undergraduate lecture halls.' },
  { id: 4, ar: 'مبنى السويق', en: 'Suwaiq Building', t: 'مبنى السويق: معامل وقاعات تدريس عملية للطلبة.', te: 'Suwaiq Building: practical laboratories and teaching classrooms.' },
  { id: 15, ar: 'مسجد الجامعة', en: 'University Mosque', t: 'مسجد الحرم الجامعي، بُني حديثاً ويطل على المساحات الخضراء.', te: 'The campus mosque, recently built and overlooking the green spaces.' },
  { id: 12, ar: 'مركز الابتكار', en: 'Innovation Centre', t: 'مركز الابتكار: بيئة للبحث والتطوير والمشاريع الطلابية.', te: 'The Innovation Centre: a home for research, development and student projects.' },
  { id: 10, ar: 'المسرح المفتوح', en: 'Amphitheatre', t: 'المسرح المفتوح: فضاء للفعاليات والأنشطة الطلابية.', te: 'The open-air amphitheatre: a venue for events and student activities.' }
];
const tour = { on: false, i: 0, wait: 0, arrived: false };
function startTour() {
  if (inside) exitB(false);
  clearTarget(); ch.position.set(0, 0, 165); ch.rotation.y = 0; yaw = 0;
  tour.on = true; tour.i = 0; tour.arrived = false; tour.wait = 0;
  if (mode === 'a') go('g');
  tourNext(); applyLang();
}
function stopTour() { tour.on = false; clearTarget(); $('#cine').hidden = true; applyLang(); }
function clearTarget() { tg = null; route = []; dots.count = 0; bc.visible = false; $('#hud').hidden = true; }
function tourNext() {
  const t = TOURS[tour.i], b = BY[t.id]; if (!b) return;
  tg = { n: BN(b), x: b.cx, z: b.cz }; plan();
  $('#hud').hidden = false; $('#tn').textContent = T('to') + ' ' + tg.n;
  bc.position.set(b.cx, 24, b.cz); bc.visible = true;
  $('#cine').hidden = false;
  $('#cineT').textContent = (lang === 'ar' ? t.ar : t.en);
  $('#cineP').textContent = (lang === 'ar' ? t.t : t.te);
  speak((lang === 'ar' ? t.ar + '. ' + t.t : t.en + '. ' + t.te));
}
function speak(t) {
  if (!voiceOn || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang === 'ar' ? 'ar-OM' : 'en-US'; u.rate = 1; u.pitch = 1;
    const vs = speechSynthesis.getVoices();
    const v = vs.find(x => x.lang && x.lang.toLowerCase().startsWith(lang === 'ar' ? 'ar' : 'en'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) { }
}

/* ---------- 20. الجدول ---------- */
let sch = [];
try { sch = JSON.parse(localStorage.getItem('sch') || '[]'); } catch (e) { }
const saveS = () => { try { localStorage.setItem('sch', JSON.stringify(sch)); } catch (e) { } };
const tmin = l => l.d * 1440 + (+l.t.slice(0, 2)) * 60 + (+l.t.slice(3, 5));
function showSched() {
  openSheet('<h3>' + T('sched') + '<button class="xbtn" data-close="1">✕</button></h3>' +
    '<div class="row"><input id="sc" placeholder="' + T('course') + '"><input id="sr" placeholder="' + (lang === 'ar' ? 'القاعة مثل G1.05' : 'Room e.g. G1.05') + '" size="12"></div>' +
    '<div class="row"><select id="sd">' + T('days').map((d, i) => '<option value="' + i + '">' + d + '</option>').join('') + '</select>' +
    '<input id="st" type="time" value="09:00"><button class="chip on" id="sa">' + T('add') + '</button></div><div id="sl"></div>');
  const draw = () => {
    $('#sl').innerHTML = sch.length ? sch.slice().sort((a, b) => tmin(a) - tmin(b)).map(l =>
      '<div class="lec"><span><b>' + l.c + '</b> — ' + l.r + '<br>' + T('days')[l.d] + ' ' + l.t + '</span>' +
      '<span><button class="chip" data-g="' + l.r + '">' + T('go') + '</button> <button class="chip" data-x="' + sch.indexOf(l) + '">' + T('del') + '</button></span></div>').join('')
      : '<p>' + T('none') + '</p>';
    $('#sl').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { closeSheet(); const r = results(b.dataset.g)[0]; if (r) choose(r); });
    $('#sl').querySelectorAll('[data-x]').forEach(b => b.onclick = () => { sch.splice(+b.dataset.x, 1); saveS(); draw(); nextBanner(); });
  };
  $('#sa').onclick = () => {
    const c = $('#sc').value.trim(), r = $('#sr').value.trim(); if (!c || !r) return;
    sch.push({ c, r, d: +$('#sd').value, t: $('#st').value || '09:00' }); saveS();
    $('#sc').value = ''; $('#sr').value = ''; draw(); nextBanner();
  };
  draw();
}
function nextBanner() {
  const n = new Date(), now = n.getDay() * 1440 + n.getHours() * 60 + n.getMinutes();
  let best = null, bd = 1e9;
  sch.forEach(l => { const d = (tmin(l) - now + 10080) % 10080; if (d < bd) { bd = d; best = l; } });
  const el = $('#nx');
  if (best && bd <= 180) {
    $('#nt2').textContent = T('next') + ': ' + best.c + ' — ' + best.r + ' ' + T('after') + ' ' + bd + ' ' + T('min');
    el.hidden = false;
    $('#ng').onclick = () => { const r = results(best.r)[0]; if (r) choose(r); };
  } else el.hidden = true;
}

/* ---------- 21. رموز QR ---------- */
function showQR() {
  if (typeof qrcode === 'undefined') { toast('QR: offline'); return; }
  const base = location.href.split('#')[0];
  let h = '<h3>' + (lang === 'ar' ? 'رموز QR للمباني' : 'Building QR codes') + '<button class="xbtn" data-close="1">✕</button></h3><div class="qg">';
  BLD.filter(b => b.kind !== 'field').forEach(b => {
    const q = qrcode(0, 'M'); q.addData(base + '#at-' + b.id); q.make();
    h += '<figure><img src="' + q.createDataURL(4, 2) + '" alt="' + b.id + '" width="112"><figcaption><b>' + (b.code || b.id) + '</b> ' + BN(b) + '</figcaption></figure>';
  });
  openSheet(h + '</div>');
}
function handleHash() {
  const m = /^#at-(\d+)$/.exec(location.hash);
  if (m) { const b = BY[+m[1]]; if (b) dropAt(b.cx, b.cz); }
}

/* ---------- 22. دليل المباني ---------- */
function showGuide() {
  let h = '<h3>' + T('guide') + '<button class="xbtn" data-close="1">✕</button></h3><p style="font-size:12px">' +
    (lang === 'ar' ? 'أرقام المباني والأكواد مطابقة للخريطة الرسمية لجامعة صحار.' : 'Building numbers and codes follow the official Sohar University campus plan.') + '</p><div class="grid2">';
  BLD.forEach(b => {
    h += '<div class="card" data-goto="' + b.id + '" style="cursor:pointer"><b>' + (b.code ? '[' + b.code + '] ' : '') + BN(b) + '</b>' +
      '<span>' + (lang === 'ar' ? b.info.u || '' : b.info.ue || '') + '</span><br><span style="opacity:.6">#' + b.id + ' · ' + b.h + 'm</span></div>';
  });
  h += '</div>';
  openSheet(h);
  sheet.querySelectorAll('[data-goto]').forEach(el => el.onclick = () => {
    const b = BY[+el.dataset.goto]; closeSheet(); dropAt(b.cx, b.cz);
    setTimeout(() => { tg = { n: BN(b), x: b.cx, z: b.cz }; plan(); $('#hud').hidden = false; $('#tn').textContent = T('to') + ' ' + tg.n; }, 200);
  });
}

/* ---------- 23. السماء والطقس والوقت ---------- */
const dayC = [[.94, .96, .97], [.60, .78, .93], [.26, .50, .82]];
const ngC = [[.10, .14, .24], [.04, .07, .17], [.015, .025, .08]];
const mix = (a, b, t) => a + (b - a) * t;
const stars = (() => {
  const p = [];
  for (let i = 0; i < 700; i++) { const a = Math.random() * 6.283, e = Math.random() * 1.3 + .1, r = 1200; p.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const s = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false }));
  S.add(s); return s;
})();
const dust = (() => {
  const p = [], n = 900;
  for (let i = 0; i < n; i++) p.push((Math.random() - .5) * 700, Math.random() * 60, (Math.random() - .5) * 700);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color: 0xe8d6b0, size: 1.1, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: false });
  const s = new THREE.Points(g, m); S.add(s); return s;
})();
function lerpSky() {
  const t = nt;
  ['uH', 'uM', 'uT'].forEach(k => {
    const i = k === 'uH' ? 0 : k === 'uM' ? 1 : 2;
    skyU[k].value.setRGB(mix(dayC[i][0], ngC[i][0], t), mix(dayC[i][1], ngC[i][1], t), mix(dayC[i][2], ngC[i][2], t));
  });
}
function sunPos() {
  const a = (skyT - .25) * Math.PI * 2;
  const el = Math.sin(a) * .92 + .08;
  const az = Math.cos(a);
  return { x: az * 120, y: el * 160 + 12, z: el * 40 + 60 };
}
function applySky() {
  const sp = sunPos();
  skyU.uSun.value.set(sp.x, sp.y, sp.z).normalize();
  skyU.uNight.value = nt;
  bgC.setRGB(skyU.uM.value.r, skyU.uM.value.g, skyU.uM.value.b);
  S.background = bgC;
  sun.position.set(ch.position.x + sp.x, sp.y, ch.position.z + sp.z);
  sun.target.position.set(ch.position.x, 0, ch.position.z);
  const dusk = Math.max(0, 1 - Math.abs(skyT - .28) * 7) + Math.max(0, 1 - Math.abs(skyT - .78) * 7);
  sun.color.setHSL(lerp(.11, .06, clamp(dusk, 0, 1)), lerp(.35, .85, clamp(dusk, 0, 1)), lerp(.72, .55, clamp(dusk, 0, 1)));
  sun.intensity = lerp(1.5, 3.1, clamp(skyT * 2, 0, 1)) * (1 - nt);
  hemi.intensity = lerp(.34, .92, clamp(skyT * 2, 0, 1)) * (1 - nt * .8) + nt * .2;
  fillL.intensity = lerp(.28, .46, clamp(skyT * 2, 0, 1)) * (1 - nt * .9);
  fillL.position.set(ch.position.x - sp.x * .8, sp.y * .5 + 34, ch.position.z - sp.z * .8);
  fillL.target.position.set(ch.position.x, 0, ch.position.z);
  S.fog.color.setHex(nt > .5 ? 0x0a1224 : 0xcfe0e8).convertSRGBToLinear();
  dust.material.opacity = weather === 'haze' ? .35 : 0;
  dust.visible = weather === 'haze';
  stars.material.opacity = nt;
  torch.intensity = nt * 1.7;
  lampGlows.children.forEach(s => s.material.opacity = nt * .85);
  R.toneMappingExposure = lerp(1.0, .88, nt);
}
function showSky() {
  openSheet('<h3>' + T('sky') + '<button class="xbtn" data-close="1">✕</button></h3>' +
    '<div class="row"><label>' + T('sky') + '</label><input id="sl" type="range" min="0" max="1" step="0.01" value="' + skyT + '"></div>' +
    '<div class="row"><span style="font-size:12px;min-width:80px">' + T('weather') + '</span>' +
    '<button class="chip' + (weather === 'clear' ? ' on' : '') + '" data-w="clear">' + T('clear') + '</button>' +
    '<button class="chip' + (weather === 'haze' ? ' on' : '') + '" data-w="haze">' + T('haze') + '</button>' +
    '<button class="chip' + (night ? ' on' : '') + '" data-w="night">' + T('nightT') + '</button></div>' +
    '<div class="row"><span style="font-size:12px;min-width:80px">' + T('voice') + '</span>' +
    '<button class="chip' + (voiceOn ? ' on' : '') + '" data-v="1">' + T('voiceOn') + '</button></div>' +
    '<div class="row"><span style="font-size:12px;min-width:80px">' + T('themeT') + '</span>' +
    '<button class="chip' + (theme === 'real' ? ' on' : '') + '" data-th="real">' + T('real') + '</button>' +
    '<button class="chip' + (theme === 'arch' ? ' on' : '') + '" data-th="arch">' + T('arch') + '</button>' +
    '<button class="chip' + (theme === 'cine' ? ' on' : '') + '" data-th="cine">' + T('cine') + '</button></div>');
  $('#sl').oninput = e => { skyT = +e.target.value; applySky(); };
  sheet.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
    const w = b.dataset.w;
    if (w === 'night') { night = !night; applySky(); }
    else { weather = w; applySky(); }
    showSky();
  });
  sheet.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { voiceOn = !voiceOn; showSky(); });
  sheet.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { setTheme(b.dataset.th); showSky(); });
}
function setTheme(t) {
  theme = t;
  document.documentElement.setAttribute('data-theme', t === 'arch' ? 'light' : 'dark');
  document.documentElement.setAttribute('data-cine', t === 'cine' ? '1' : '0');
  if (t === 'arch') {
    mArch.color.set(0xffffff); mArch.map = tArch;
    mGlassWin.roughness = .5; mGlassWin.metalness = .05;
    R.toneMappingExposure = 1.0;
  } else if (t === 'real') {
    mGlassWin.roughness = .18; mGlassWin.metalness = .15; R.toneMappingExposure = 0.92;
  } else {
    mGlassWin.roughness = .12; mGlassWin.metalness = .25; R.toneMappingExposure = .92;
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  toast(T('themeT') + ': ' + T(theme), 2200);
}

/* ---------- 24. وضع التصوير ---------- */
function photoMode() {
  shot = !shot;
  document.body.classList.toggle('shot', shot);
  $$('#top,#dock,#hud,#menu,#mmwrap,#lbls,#hint,#toast,#ibar,#cine,#chat,#chatFab').forEach(e => e.style.display = shot ? 'none' : '');
  if (shot) toast('📷 ' + T('photoT') + ' — انقر لالتقاط صورة', 4000);
}
function capture() {
  try {
    R.render(S, C);
    const a = document.createElement('a');
    a.download = 'sohar-university-3d-' + Date.now() + '.png';
    a.href = R.domElement.toDataURL('image/png');
    a.click();
    toast(T('photoDone'), 2500);
  } catch (e) { toast('تعذّر الحفظ'); }
}

/* ---------- 25. اللغة والسمة ---------- */
function applyLang() {
  const d = document.documentElement;
  d.lang = lang; d.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $('#q').placeholder = T('search');
  $('#mTour').textContent = (tour.on ? '⏹ ' : '🧭 ') + T(tour.on ? 'tourStop' : 'tour');
  $('#mSched').textContent = T('sched'); $('#mInfo').textContent = T('info'); $('#mQr').textContent = T('qr');
  $('#mNight').textContent = T(night ? 'day' : 'night'); $('#mSky').textContent = T('sky');
  $('#mTheme').textContent = T('theme'); $('#mChar').textContent = T('chr');
  $('#mSfx').textContent = (sfxOn ? '🔊 ' : '🔇 ') + (lang === 'en' ? 'Sounds' : 'أصوات الجولة');
  $('#mAcc').textContent = T('acc') + (acc ? T('accOn') : ''); $('#mPhoto').textContent = T('photo');
  $('#mLang').textContent = T('lang2'); $('#fs').textContent = T('fs'); $('#mAbout').textContent = T('about');
  $('#pickT').textContent = T('pick');
  $('#pickM').innerHTML = '<span class="avatar">🧑‍🎓</span>' + T('boy');
  $('#pickF').innerHTML = '<span class="avatar">👩‍🎓</span>' + T('girl');
  $('#hint').textContent = lang === 'ar' ? 'اسحب للنظر · قرّب بإصبعين · اضغط على الأرض للانتقال' : 'Drag to look · Pinch to zoom · Tap the ground to move';
  lb.forEach(l => l.el.innerHTML = '<b>' + (l.b.code || l.b.id) + '</b> ' + (lang === 'ar' ? l.b.ar : l.b.en));
  if (tg) $('#tn').textContent = T('to') + ' ' + tg.n;
  nextBanner();
}
$('#mLang').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; applyLang(); };
$('#mNight').onclick = () => { night = !night; applySky(); applyLang(); };
$('#mSky').onclick = showSky;
$('#mTheme').onclick = showSky;
$('#mChar').onclick = () => { $('#pick').hidden = false; };
$('#mSfx').onclick = () => { sfxToggle(!sfxOn); applyLang(); toast(sfxOn ? (lang === 'en' ? 'Sounds on' : 'الأصوات مفعّلة') : (lang === 'en' ? 'Sounds off' : 'الأصوات مطفأة'), 1800); };
$('#mAcc').onclick = () => { acc = !acc; navGrid(); if (tg) plan(); applyLang(); toast(T('acc') + (acc ? ' ✓' : ''), 2200); };
$('#mPhoto').onclick = photoMode;
$('#mInfo').onclick = showGuide;
$('#mQr').onclick = showQR;
$('#mSched').onclick = showSched;
$('#mTour').onclick = () => tour.on ? stopTour() : startTour();
$('#mAbout').onclick = () => openSheet('<h3>' + T('aboutT') + '<button class="xbtn" data-close="1">✕</button></h3><p>' + T('aboutP') + '</p>' +
  '<p style="font-size:11.5px;opacity:.7">© ' + new Date().getFullYear() + ' — Sohar University 3D Tour · Source: su.edu.om/pdf/SU-Map-v3.pdf</p>');
$('#fs').onclick = () => {
  const e = document.documentElement, f = e.requestFullscreen || e.webkitRequestFullscreen;
  if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(e);
  else if (f) f.call(e).catch(() => toast(T('fs')));
  else toast(lang === 'ar' ? 'على الآيفون: شارك ثم أضف إلى الشاشة الرئيسية' : 'On iPhone: Share → Add to Home Screen');
};
document.addEventListener('click', e => { const x = e.target.closest('[data-close]'); if (x) closeSheet(); });
$('#pickM').onclick = () => pickChar('m'); $('#pickF').onclick = () => pickChar('f');

/* ---------- 26. حلقة الرسم ---------- */
let last = performance.now();
let tickErrCount = 0;
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min((now - last) / 1000, .05); last = now;
  try {
  let ix = 0, iy = 0;
  if (mode === 'g' && !trans) {
    ix = jx + ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
    iy = jy + ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0);
  }
  const ap = autoDir(); if (ap) { ix = ap.ix; iy = ap.iy; }
  const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
  const m = Math.min(l, 1);
  if (m > .08) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const mx = fx * iy + rx * ix, mz = fz * iy + rz * ix, s = 5.2 * m * dt;
    move(mx * s, mz * s);
    let d = Math.atan2(mx, mz) - ch.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    ch.rotation.y += d * Math.min(1, dt * 10);
    walk += dt * 7.5 * m; amp += (1 - amp) * Math.min(1, dt * 10);
  } else amp += (0 - amp) * Math.min(1, dt * 10);
  const spd = 5.2 * m;
  if (cRig) charUpdate(dt, spd);
  else {
    const L = proc.userData.limbs, sw = Math.sin(walk) * amp;
    L.aL.rotation.x = sw * .7; L.aR.rotation.x = -sw * .7; L.lL.rotation.x = -sw * .6; L.lR.rotation.x = sw * .6;
  }
  /* أثر الأقدام والغبار */
  stepFx(dt, spd);
  /* اللاعبون الآخرون (أونلاين) */
  try { NET.tick(dt); } catch (e) { if (++tickErrCount <= 6) console.error('[NET]', e); }
  /* الكاميرا */
  if (trans) {
    trans.t += dt / 1.4; const e = ease(Math.min(trans.t, 1));
    camPose(trans.to, tp, tl); C.position.lerpVectors(trans.fp, tp, e); look.lerpVectors(trans.fl, tl, e);
    if (trans.t >= 1) { mode = trans.to; trans = null; if (tg) plan(); }
  } else { camPose(mode, C.position, look); }
  C.lookAt(look); sky.position.copy(C.position); stars.position.copy(C.position);
  /* الظل يتبع الكاميرا ويكبر في المنظر الجوي */
  const aerial = mode === 'a';
  const fx = aerial ? aer.x : ch.position.x, fz = aerial ? aer.z : ch.position.z;
  const sp = sunPos();
  const sz = aerial ? clamp(aer.h * 1.05, 130, 520) : 95;
  const k = sz / 115;
  sun.target.position.set(fx, 0, fz);
  sun.position.set(fx + sp.x * k, sp.y * k, fz + sp.z * k);
  sun.shadow.camera.left = -sz; sun.shadow.camera.right = sz; sun.shadow.camera.top = sz; sun.shadow.camera.bottom = -sz;
  sun.shadow.camera.far = 900 * k; sun.shadow.camera.updateProjectionMatrix();
  /* الضباب يخف في المنظر الجوي */
  S.fog.near = 120 + aer.h * 1.6; S.fog.far = 620 + aer.h * 6.5;
  torch.position.set(ch.position.x, 3, ch.position.z);
  /* السماء/الليل */
  skyU.uTime.value += dt;
  nt += ((night ? 1 : 0) - nt) * Math.min(1, dt * 3.2);
  lerpSky(); applySky();
  /* القبة */
  if (tour.on && tour.arrived) {
    tour.wait -= dt;
    if (tour.wait <= 0) {
      tour.arrived = false; tour.i++;
      if (tour.i >= TOURS.length) { toast(T('tourEnd'), 5000); stopTour(); } else tourNext();
    }
  }
  updLabels();
  if (frames % 5 === 0) drawMM();
  if (frames % 20 === 0) updIBar();
  if (frames % 5 === 0) updDoorBar();
  if (inside && tg && tg.bk === inside.b.id && tg.fl !== curFl) {
    const st2 = inside.stair;
    if (Math.hypot(ch.position.x - (inside.b.cx + st2[0]), ch.position.z - (inside.b.cz + st2[1])) < 5) setFloor(tg.fl);
  }
  if (tg) {
    const p = ch.position;
    if (Math.hypot(p.x - lastP.x, p.z - lastP.z) > 6) plan();
    const g = guide(), dd = Math.hypot(tg.x - p.x, tg.z - p.z);
    $('#arr').style.transform = 'rotate(' + ((Math.atan2(g.nx - p.x, -(g.nz - p.z)) + (mode === 'a' ? 0 : yaw)) * 180 / Math.PI) + 'deg)';
    $('#td').textContent = dd < 4 ? T('here') : Math.round(g.L) + T('m');
    if (dd < 4 && mode === 'g' && !trans) arrive();
  }
  if (weather === 'haze') {
    const p = dust.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - dt * 1.6; if (y < 0) y = 60;
      p.setY(i, y); let x = p.getX(i) + dt * 2.4; if (x > 350) x = -350; p.setX(i, x);
    }
    p.needsUpdate = true; dust.position.set(ch.position.x, 0, ch.position.z);
  }
  frames++; fpsT += dt;
  if (fpsT > 1) { if (fpsEl.on) fpsEl.textContent = Math.round(frames / fpsT) + ' fps'; frames = 0; fpsT = 0; }
  } catch (e) { if (++tickErrCount <= 6) console.error('[frame]', e); }
  R.render(S, C);
}
const fpsEl = $('#fps');
addEventListener('keydown', e => {
  if (e.target.tagName !== 'INPUT') {
    keys[e.code] = 1;
    /* Space = قفز ، V = تبديل المنظر ، E = دخول/خروج المبنى */
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) charJump(); }
    else if (e.code === 'KeyV') { e.preventDefault(); if (!trans) go(mode === 'a' ? 'g' : 'a'); }
    else if (e.code === 'KeyE') {
      e.preventDefault();
      if (!e.repeat) { if (inside) exitB(false); else if (nearDoor) enterB(nearDoor); }
    }
  }
});
addEventListener('keyup', e => keys[e.code] = 0);
addEventListener('resize', () => { R.setSize(innerWidth, innerHeight); C.aspect = innerWidth / innerHeight; C.updateProjectionMatrix(); });
addEventListener('hashchange', handleHash);
function autoDir() {
  if (!tour.on || mode !== 'g' || trans || !tg || tour.arrived) return null;
  if (Math.hypot(jx, jy) > .2 || keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD) { stopTour(); return null; }
  const p = ch.position, g = guide(), dx = g.nx - p.x, dz = g.nz - p.z, d = Math.hypot(dx, dz) || 1;
  let e = Math.atan2(-dx, -dz) - yaw; e = Math.atan2(Math.sin(e), Math.cos(e)); yaw += e * .05;
  const ux = dx / d, uz = dz / d;
  return { ix: (ux * Math.cos(yaw) + uz * -Math.sin(yaw)) * .75, iy: (ux * -Math.sin(yaw) + uz * -Math.cos(yaw)) * .75 };
}
function arrive() {
  if (tour.on) { if (!tour.arrived) { tour.arrived = true; tour.wait = 7; const t = TOURS[tour.i]; toast(lang === 'ar' ? t.t : t.te, 6500); speak(lang === 'ar' ? t.t : t.te); } return; }
  const t = tg; toast(T('arr') + ' ' + t.n); clearTarget();
}

/* ---------- 27. الإقلاع ---------- */
prog(46, 'تحميل نسيج الأرضية…');
const groundTex = new THREE.TextureLoader().load(GROUND, t => {
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy());
  groundMat.map = t; groundMat.needsUpdate = true;
  prog(64, 'تجهيز الإضاءة…');
  makeEnv();
  finish();
});
function makeEnv() {
  try {
    const pm = new THREE.PMREMGenerator(R);
    pm.compileEquirectangularShader();
    const es = new THREE.Scene();
    const sk2 = new THREE.Mesh(sky.geometry, sky.material);
    es.add(sk2);
    const env = pm.fromScene(es, 0.04).texture;
    S.environment = env;
    pm.dispose();
  } catch (e) { /* بيئة اختيارية */ }
}
async function finish() {
  prog(88, 'توليد المشهد…');
  applySky(); applyLang();
  const q = location.search;
  if (/aerial/.test(q)) { mode = 'a'; trans = null; aer.x = 10; aer.z = 40; aer.h = 340; }
  const zp = /[?&]z=([\d.]+)/.exec(q); if (zp) zf = clamp(parseFloat(zp[1]), .12, 2.4);
  const xp = /[?&]x=(-?[\d.]+)/.exec(q); if (xp) yaw = parseFloat(xp[1]);
  const pp = /[?&]p=(-?[\d.]+)/.exec(q); if (pp) pitch = parseFloat(pp[1]);
  const atp = /[?&]at=([\d.]+)/.exec(q); if (atp) charTime = parseFloat(atp[1]);
  const pxp = /[?&]px=(-?[\d.]+)/.exec(q), pzp = /[?&]pz=(-?[\d.]+)/.exec(q);
  if (pxp && pzp) { const f = free(parseFloat(pxp[1]), parseFloat(pzp[1])); ch.position.set(f[0], 0, f[1]); }
  if (/night/.test(q)) { night = true; nt = 1; }
  if (/haze/.test(q)) { weather = 'haze'; }
  let c = null; try { c = localStorage.getItem('ch'); } catch (e) { }
  const chp = /[?&]ch=([mf])/.exec(q);
  if (chp) c = chp[1];
  /* الشخصية الأنثى هي الافتراضية */
  if (c !== 'm' && c !== 'f') c = 'f';
  if (c === 'm' || c === 'f') {
    $('#pick').hidden = true;
    useChar(c).then(() => { try { localStorage.setItem('ch', c); } catch (e) { } })
      .catch(e => { proc.visible = true; console.error(e); });
  } else $('#pick').hidden = false;
  const inp2 = /[?&]in=(\d+)/.exec(q);
  if (inp2) { const b = BY[+inp2[1]]; if (b) { dropAt(b.cx, b.cz + 60); setTimeout(() => { if (b.info.int) enterB(b); }, 900); } }
  /* زراعة النباتات والأشجار الحقيقية قبل إنهاء شاشة التحميل */
  try {
    prog(92, 'زراعة النخيل والأشجار…');
    await initRealFlora();
  } catch (e) { console.error('[flora]', e); }
  /* تحميل نماذج الشخصيات الحقيقية مسبقاً */
  try {
    prog(95, 'تحميل نماذج الشخصيات…');
    await charPreload();
  } catch (e) { console.error('[char]', e); }
  setTimeout(() => { prog(100, 'جاهز'); boot.classList.add('gone'); }, 420);
  setTimeout(() => { if (!location.hash) toast(T('tap'), 5000); }, 900);
  nextBanner();
  /* شاشة الدخول: آيدي الجامعة + الاسم + الشخصية، ثم تشغيل الشبكة */
  ENTRY.onDone = function (id) { try { NET.init(id); } catch (e) { console.error('[NET]', e); } };
  setTimeout(function () { try { ENTRY.show(c); } catch (e) { console.error('[ENTRY]', e); NET.init(ENTRY.E); } }, 520);
  requestAnimationFrame(tick);
}
function pickChar(k) {
  $('#pick').hidden = true;
  useChar(k).catch(e => { console.error(e); proc.visible = true; toast('تعذّر تحميل الشخصية'); });
  setTimeout(() => { if (location.hash) handleHash(); }, 300);
}
$('#pick').hidden = false;
})();
