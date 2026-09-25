// ====== create.js : 제작 스튜디오 — 치수·원단 커스텀 옷 빌더 (module script, Three.js) ======
// Meshy AI로 만든 GLB 옷은 부위별 메쉬가 없는 "한 덩어리" 모델이에요. 그래서 불러온 뒤
// 삼각형 하나하나의 위치를 보고 부위를 직접 나눠요:
//   상의 → 어깨 / 팔(소매) / 몸판,  하의 → 허리 / 다리
//   각각을 다시 왼쪽·오른쪽(입는 사람 기준, +X = 왼쪽) × 앞·뒤(+Z = 앞)로 나눠요.
// 부위마다 별도 Mesh + 별도 Material을 쓰지만, 정점 데이터(position/normal/uv/paint)는
// 하나를 공유해요(인덱스만 부위별로 따로). 그래서 메모리를 거의 더 안 쓰고,
// 브러시로 그린 자국(paint 속성)은 부위 경계를 넘어 자연스럽게 이어져요.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ---------- 옷 종류 정의 ----------
   kind: 'top'이면 어깨/팔/몸판, 'bottom'이면 허리/다리로 나눠요.
   sleeveX: 옷 가로 반폭 대비 이 비율보다 바깥이면 "팔(소매)" (실제 모델을 분석해서 맞춘 값)
   shoulderY / waistY: 옷 높이 대비 이 비율보다 위면 "어깨" / "허리"
   glbWidthMul: 모델 자체가 옆으로 넓게 생성된 경우 가로(X)만 따로 줄이는 보정값(기본 1). */
const GARMENT_TYPES = {
  shortSleeve: { label: '반팔 티셔츠', kind: 'top', glbHeightFrac: 0.42, sleeveX: 0.6, shoulderY: 0.88,
    glb: '/wardrobe-assets/Meshy_AI_Classic_White_T_Shirt_0913135306_generate.glb' },
  longSleeve: { label: '긴팔 티셔츠', kind: 'top', glbHeightFrac: 0.42, sleeveX: 0.6, shoulderY: 0.88,
    glb: '/wardrobe-assets/Meshy_AI_Gray_Henley_Long_Slee_0925142723_generate.glb' },
  shortPants: { label: '반바지', kind: 'bottom', glbHeightFrac: 0.22, waistY: 0.88,
    glb: '/wardrobe-assets/Meshy_AI_White_Shorts_0913135257_generate.glb' },
  longPants: { label: '긴바지', kind: 'bottom', glbHeightFrac: 0.54, glbWidthMul: 0.8, waistY: 0.9,
    glb: '/wardrobe-assets/Meshy_AI_Cream_Linen_Drawstrin_0925142806_generate.glb' },
};

const REGION_ROWS = {
  top: [['shoulder', '어깨'], ['sleeve', '팔(소매)'], ['body', '몸판']],
  bottom: [['waist', '허리'], ['leg', '다리']],
};
// 좌우는 입는 사람 기준이에요(정면에서 보면 화면 오른쪽이 입는 사람의 왼쪽).
const REGION_COLS = [['LF', '왼쪽', '앞'], ['LB', '왼쪽', '뒤'], ['RF', '오른쪽', '앞'], ['RB', '오른쪽', '뒤']];

function regionKeysFor(kind){
  return REGION_ROWS[kind].flatMap(([row]) => REGION_COLS.map(([col]) => `${row}_${col}`));
}
function regionLabel(kind, key){
  const [row, col] = key.split('_');
  const rowLabel = REGION_ROWS[kind].find(r => r[0] === row)?.[1] || row;
  const c = REGION_COLS.find(x => x[0] === col);
  return c ? `${c[1]} ${rowLabel} ${c[2]}` : rowLabel;
}
function mirrorRegionKey(key){
  const [row, col] = key.split('_');
  const flipped = col[0] === 'L' ? 'R' + col[1] : 'L' + col[1];
  return `${row}_${flipped}`;
}

/* ---------- 원단 정의 (대표적인 몇 가지 — 절차적 캡처본) ---------- */
const FABRICS = [
  { id: 'cotton', name: '면', base: '#e9e2d3', draw: cottonPattern },
  { id: 'silk', name: '실크', base: '#d8c9d9', draw: silkPattern },
  { id: 'linen', name: '린넨', base: '#cdbfa0', draw: linenPattern },
  { id: 'denim', name: '데님', base: '#3b5478', draw: denimPattern },
  { id: 'knit', name: '니트', base: '#8a5a44', draw: knitPattern },
  { id: 'leather', name: '가죽', base: '#4a3327', draw: leatherPattern },
];
function cottonPattern(ctx, s){ ctx.fillStyle='#e9e2d3'; ctx.fillRect(0,0,s,s);
  for(let i=0;i<260;i++){ ctx.fillStyle=`rgba(255,255,255,${Math.random()*0.15})`; ctx.fillRect(Math.random()*s,Math.random()*s,1.5,1.5); } }
function silkPattern(ctx, s){ const g=ctx.createLinearGradient(0,0,s,s); g.addColorStop(0,'#e7d9e8'); g.addColorStop(0.5,'#cdb6cf'); g.addColorStop(1,'#e7d9e8'); ctx.fillStyle=g; ctx.fillRect(0,0,s,s); }
function linenPattern(ctx, s){ ctx.fillStyle='#cdbfa0'; ctx.fillRect(0,0,s,s); ctx.strokeStyle='rgba(90,75,45,0.25)'; ctx.lineWidth=1;
  for(let i=0;i<s;i+=4){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(s,i); ctx.stroke(); } }
function denimPattern(ctx, s){ ctx.fillStyle='#3b5478'; ctx.fillRect(0,0,s,s); ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=2;
  for(let i=-s;i<s*2;i+=6){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+s,s); ctx.stroke(); } }
function knitPattern(ctx, s){ ctx.fillStyle='#8a5a44'; ctx.fillRect(0,0,s,s); ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=2;
  for(let y=0;y<s;y+=10){ ctx.beginPath(); for(let x=0;x<=s;x+=5) ctx.lineTo(x,y+Math.sin(x*0.4)*3); ctx.stroke(); } }
function leatherPattern(ctx, s){ ctx.fillStyle='#4a3327'; ctx.fillRect(0,0,s,s);
  for(let i=0;i<400;i++){ ctx.fillStyle=`rgba(0,0,0,${Math.random()*0.2})`; ctx.beginPath(); ctx.arc(Math.random()*s,Math.random()*s,Math.random()*1.5,0,7); ctx.fill(); } }

const PALETTE = ['#14201E', '#FBFAF6', '#D8663F', '#E8B04A', '#6FB8C2', '#3E7F86', '#8E6FC2', '#D97BA6', '#6B8F4E', '#3B5478'];
const BASE_HEX = '#d8d2c4';

/* 원단 텍스처 — 색을 고르면 원단 무늬(명암)는 살리고 색만 바꿔 입혀요. 조합별로 캐시해요. */
const TEXTURE_CACHE = new Map();
function hexToRgb255(hex){
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function getFabricTexture(fabric, colorHex){
  const key = fabric.id + '|' + (colorHex || '');
  if(TEXTURE_CACHE.has(key)) return TEXTURE_CACHE.get(key);
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  fabric.draw(ctx, S);
  if(colorHex){
    const img = ctx.getImageData(0, 0, S, S);
    const d = img.data;
    let sum = 0;
    for(let i = 0; i < d.length; i += 4) sum += 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    const mean = sum / (d.length / 4) || 1;
    const [cr, cg, cb] = hexToRgb255(colorHex);
    for(let i = 0; i < d.length; i += 4){
      const lum = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
      const k = Math.min(1.35, Math.max(0.55, 1 + (lum - mean) / 255 * 1.6));
      d[i] = Math.min(255, cr * k); d[i+1] = Math.min(255, cg * k); d[i+2] = Math.min(255, cb * k);
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  TEXTURE_CACHE.set(key, tex);
  return tex;
}

/* 브러시 자국(paint 속성, RGBA)을 원단/색 위에 덮어 그리는 재질.
   paint.a = 0이면 원래 원단색 그대로, 1이면 브러시 색으로 완전히 덮어요. */
function makePaintableMaterial(){
  const mat = new THREE.MeshStandardMaterial({ color: BASE_HEX, roughness: 0.85, side: THREE.DoubleSide });
  mat.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 paint;\nvarying vec4 vPaint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaint = paint;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vPaint;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vPaint.rgb, clamp(vPaint.a, 0.0, 1.0));');
  };
  mat.customProgramCacheKey = () => 'unexposed-paintable-v1';
  return mat;
}

/* ---------- GLB 불러오기 + 부위 나누기 (타입별로 한 번만) ---------- */
function findFirstMesh(root){
  let found = null;
  root.traverse(node => { if(!found && node.isMesh && node.geometry) found = node; });
  return found;
}

// cache: { geometry(position/normal/uv 포함), regionIndex: {key: Uint32Array}, count, cx, cz, sphere }
function prepareGarmentCache(typeKey, geometry){
  const def = GARMENT_TYPES[typeKey];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', geometry.attributes.position);
  const count = geometry.attributes.position.count;
  if(geometry.index){
    geo.setIndex(geometry.index);
  } else {
    const idx = new Uint32Array(count);
    for(let i = 0; i < count; i++) idx[i] = i;
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const pos = geo.attributes.position.array;
  const nor = geo.attributes.normal.array;
  const box = geo.boundingBox;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  const halfW = (box.max.x - box.min.x) / 2 || 1;
  const minY = box.min.y;
  const h = (box.max.y - box.min.y) || 1;

  // UV — 원래 모델에 UV가 없어서, 법선 방향 기준 박스 투영으로 만들어줘요(원단 무늬가 보이게).
  const UV_SCALE = 2.5;
  const uv = new Float32Array(count * 2);
  for(let i = 0; i < count; i++){
    const x = pos[i*3], y = pos[i*3+1], z = pos[i*3+2];
    const ax = Math.abs(nor[i*3]), ay = Math.abs(nor[i*3+1]), az = Math.abs(nor[i*3+2]);
    let u, v;
    if(az >= ax && az >= ay){ u = x; v = y; }
    else if(ax >= ay){ u = z; v = y; }
    else { u = x; v = z; }
    uv[i*2] = u * UV_SCALE; uv[i*2+1] = v * UV_SCALE;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // 삼각형 중심 위치로 부위를 분류해요.
  const keys = regionKeysFor(def.kind);
  const buckets = {};
  keys.forEach(k => { buckets[k] = []; });
  const index = geo.index.array;
  for(let t = 0; t < index.length; t += 3){
    const a = index[t], b = index[t+1], c = index[t+2];
    const x = (pos[a*3] + pos[b*3] + pos[c*3]) / 3;
    const y = (pos[a*3+1] + pos[b*3+1] + pos[c*3+1]) / 3;
    const z = (pos[a*3+2] + pos[b*3+2] + pos[c*3+2]) / 3;
    const nx = (x - cx) / halfW;
    const ny = (y - minY) / h;
    let row;
    if(def.kind === 'top'){
      row = Math.abs(nx) > def.sleeveX ? 'sleeve' : (ny > def.shoulderY ? 'shoulder' : 'body');
    } else {
      row = ny > def.waistY ? 'waist' : 'leg';
    }
    const col = (x >= cx ? 'L' : 'R') + (z >= cz ? 'F' : 'B');
    buckets[`${row}_${col}`].push(a, b, c);
  }
  const regionIndex = {};
  keys.forEach(k => { regionIndex[k] = new Uint32Array(buckets[k]); });

  return { geometry: geo, regionIndex, count, cx, cz, sphere: geo.boundingSphere.clone() };
}

const GLB_CACHE = {};   // typeKey -> prepareGarmentCache() 결과
const GLB_FAILED = {};  // typeKey -> true (불러오기 실패)
let pendingGlbType = null;
const glbLoader = new GLTFLoader();

function preloadGarmentGLBs(){
  const jobs = Object.entries(GARMENT_TYPES).map(([key, def]) => new Promise(resolve => {
    glbLoader.load(def.glb, gltf => {
      const mesh = findFirstMesh(gltf.scene);
      if(mesh && mesh.geometry) GLB_CACHE[key] = prepareGarmentCache(key, mesh.geometry);
      else GLB_FAILED[key] = true;
      if(pendingGlbType === key && state.typeKey === key){ pendingGlbType = null; rebuildGarment(); }
      resolve();
    }, undefined, () => {
      GLB_FAILED[key] = true;
      if(pendingGlbType === key && state.typeKey === key){ pendingGlbType = null; rebuildGarment(); }
      resolve(); // 실패해도 다른 항목 로딩은 계속 진행해요.
    });
  }));
  return Promise.all(jobs);
}

/* ---------- 페이지 상태 ---------- */
const state = {
  typeKey: 'shortSleeve',
  lengthMul: 1, girthMul: 1,
  tool: 'fill',                 // 'fill' | 'brush' | 'eraser'
  activeFabric: 'none',         // 'none' = 원단 무늬 없이 단색
  activeColor: '#D8663F',       // null = 원단 원래 색
  brushSize: 0.035,             // 월드 단위 반지름
  mirror: false,
  designByType: {},             // { typeKey: { regions: {key: {fabric, color}}, paint: Float32Array } }
  garmentGroup: null,
  holder: null,                 // 실제 스케일이 걸린 그룹(브러시 좌표 변환 기준)
  parts: {},                    // regionKey -> Mesh
  paintAttr: null,
  paintGrid: null,
  lastTappedRegion: null,
  mannequin: null, mannequinHeight: 1.65,
};

function getDesign(typeKey){
  if(!state.designByType[typeKey]) state.designByType[typeKey] = { regions: {}, paint: null };
  return state.designByType[typeKey];
}

const el = {
  typeRow: document.getElementById('type-row'),
  toolRow: document.getElementById('tool-row'),
  colorRow: document.getElementById('color-row'),
  brushSizeRow: document.getElementById('brush-size-row'),
  brushSize: document.getElementById('brush-size'),
  mirrorToggle: document.getElementById('mirror-toggle'),
  fabricRow: document.getElementById('fabric-row'),
  regionGrid: document.getElementById('region-grid'),
  status: document.getElementById('studio-status'),
  lengthInput: document.getElementById('length-input'),
  girthInput: document.getElementById('girth-input'),
  fillAllBtn: document.getElementById('fill-all-btn'),
  clearPaintBtn: document.getElementById('clear-paint-btn'),
  resetBtn: document.getElementById('reset-btn'),
  loading: document.getElementById('create-loading'),
  hint: document.getElementById('viewer-hint'),
  viewBtns: document.getElementById('view-btns'),
};

/* ---------- 모달 열기/닫기 ----------
   모달이 hidden인 동안은 컨테이너 크기가 0이라 renderer/camera를 그때 만들면 화면이 깨져요.
   그래서 실제로 모달이 열릴 때 딱 한 번만 초기화해요. */
const createModal = document.getElementById('create-modal');
const createModalCloseBtn = document.getElementById('create-modal-close');
let viewerStarted = false;

function openCreateModal(){
  createModal.hidden = false;
  if(!viewerStarted){
    viewerStarted = true;
    initViewer();
  } else {
    resizeViewer();
  }
}
function closeCreateModal(){
  createModal.hidden = true;
}
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
createModalCloseBtn.addEventListener('click', closeCreateModal);

let container, scene, camera, renderer, controls, resizeViewer = () => {};
const VIEW_CENTER = new THREE.Vector3(0, 1, 0);
let cameraTween = null;
let queuedStroke = null;

function initViewer(){
  container = document.getElementById('create-3d');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x123B38);
  camera = new THREE.PerspectiveCamera(42, (container.clientWidth || 1) / (container.clientHeight || 1), 0.1, 100);
  camera.position.set(0, 1.15, 2.4);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || 300, container.clientHeight || 300);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 1.3));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
  dirLight.position.set(2, 4, 3);
  scene.add(dirLight);
  const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
  backLight.position.set(-2, 2, -3);
  scene.add(backLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 0.6;
  controls.maxDistance = 8;
  controls.target.copy(VIEW_CENTER);

  state.mannequin = new THREE.Group();
  scene.add(state.mannequin);
  if(el.loading) el.loading.hidden = true;
  rebuildGarment();

  (function loop(now){
    requestAnimationFrame(loop);
    if(cameraTween){
      const t = Math.min(1, (now - cameraTween.start) / cameraTween.duration);
      const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
      camera.position.lerpVectors(cameraTween.from, cameraTween.to, e);
      if(t >= 1) cameraTween = null;
    }
    if(queuedStroke){ const ev = queuedStroke; queuedStroke = null; handleStrokeMove(ev); }
    controls.update();
    renderer.render(scene, camera);
  })(performance.now());

  resizeViewer = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if(!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', resizeViewer);
  new ResizeObserver(resizeViewer).observe(container);
  requestAnimationFrame(resizeViewer);

  setupPointerInteractions();
}

/* ---------- 시점 버튼 (앞/뒤/왼쪽/오른쪽) ---------- */
const VIEW_DIRS = {
  front: new THREE.Vector3(0, 0.15, 1),
  back: new THREE.Vector3(0, 0.15, -1),
  left: new THREE.Vector3(1, 0.15, 0),   // 입는 사람의 왼쪽 = +X
  right: new THREE.Vector3(-1, 0.15, 0),
};
function setView(name){
  if(!camera || !VIEW_DIRS[name]) return;
  const dist = camera.position.distanceTo(controls.target);
  const to = controls.target.clone().add(VIEW_DIRS[name].clone().normalize().multiplyScalar(dist));
  cameraTween = { from: camera.position.clone(), to, start: performance.now(), duration: 380 };
  el.viewBtns.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
}
el.viewBtns.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));

/* ---------- 옷 생성/재생성 ---------- */
function disposeGarment(){
  if(!state.garmentGroup) return;
  state.mannequin.remove(state.garmentGroup);
  state.garmentGroup.traverse(n => { if(n.isMesh){ n.geometry.dispose(); n.material.dispose(); } });
  state.garmentGroup = null;
  state.holder = null;
  state.parts = {};
  state.paintAttr = null;
  state.paintGrid = null;
}

function rebuildGarment(){
  if(!state.mannequin) return;
  disposeGarment();
  const def = GARMENT_TYPES[state.typeKey];
  const cache = GLB_CACHE[state.typeKey];
  if(!cache){
    if(GLB_FAILED[state.typeKey]){
      if(el.loading){ el.loading.hidden = false; el.loading.textContent = '옷 모델을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.'; }
    } else {
      pendingGlbType = state.typeKey;
      if(el.loading){ el.loading.hidden = false; el.loading.textContent = '옷 모델을 불러오는 중...'; }
    }
    renderAllUI();
    return;
  }
  if(el.loading) el.loading.hidden = true;

  const design = getDesign(state.typeKey);
  if(!design.paint || design.paint.length !== cache.count * 4) design.paint = new Float32Array(cache.count * 4);
  const paintAttr = new THREE.BufferAttribute(design.paint, 4);
  state.paintAttr = paintAttr;

  const box = cache.geometry.boundingBox;
  const rawH = (box.max.y - box.min.y) || 1;
  const baseScale = (state.mannequinHeight * def.glbHeightFrac) / rawH;
  const scaleY = baseScale * state.lengthMul;
  const scaleXZ = baseScale * state.girthMul;

  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.set(scaleXZ * (def.glbWidthMul || 1), scaleY, scaleXZ);
  holder.position.y = -box.max.y * scaleY;
  group.add(holder);

  const parts = {};
  Object.entries(cache.regionIndex).forEach(([key, idx]) => {
    if(!idx.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', cache.geometry.attributes.position);
    g.setAttribute('normal', cache.geometry.attributes.normal);
    g.setAttribute('uv', cache.geometry.attributes.uv);
    g.setAttribute('paint', paintAttr);
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.boundingBox = box.clone();
    g.boundingSphere = cache.sphere.clone();
    const mesh = new THREE.Mesh(g, makePaintableMaterial());
    mesh.userData.region = key;
    holder.add(mesh);
    parts[key] = mesh;
  });

  state.garmentGroup = group;
  state.holder = holder;
  state.parts = parts;

  // 옷의 바운딩박스 중심을 뷰어 정가운데(VIEW_CENTER)에 맞춰요.
  group.position.set(0, 0, 0);
  group.updateMatrixWorld(true);
  const center = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
  group.position.set(VIEW_CENTER.x - center.x, VIEW_CENTER.y - center.y, VIEW_CENTER.z - center.z);
  state.mannequin.add(group);
  group.updateMatrixWorld(true);

  // 저장된 부위별 원단/색을 다시 입혀요.
  Object.entries(design.regions).forEach(([key, look]) => applyRegionLook(key, look));

  state.paintGrid = buildPaintGrid(cache, holder.scale);
  renderAllUI();
}

/* ---------- 부위 채우기 ---------- */
function applyRegionLook(key, look){
  const mesh = state.parts[key];
  if(!mesh) return;
  const mat = mesh.material;
  const fabric = look && look.fabric ? FABRICS.find(f => f.id === look.fabric) : null;
  if(fabric){
    mat.map = getFabricTexture(fabric, look.color);
    mat.color.set(0xffffff);
  } else {
    mat.map = null;
    mat.color.set((look && look.color) || BASE_HEX);
  }
  mat.needsUpdate = true;
}

function fillRegion(key, withMirror = true){
  const design = getDesign(state.typeKey);
  const fabric = state.activeFabric === 'none' ? null : state.activeFabric;
  const targets = [key];
  if(withMirror && state.mirror) targets.push(mirrorRegionKey(key));
  targets.forEach(k => {
    if(!fabric && !state.activeColor){
      delete design.regions[k]; // 단색 + 원단 원래 색 = 기본 상태로 되돌리기
      applyRegionLook(k, null);
    } else {
      const look = { fabric, color: state.activeColor };
      design.regions[k] = look;
      applyRegionLook(k, look);
    }
  });
  state.lastTappedRegion = key;
  const kind = GARMENT_TYPES[state.typeKey].kind;
  const fabricName = fabric ? FABRICS.find(f => f.id === fabric).name : '단색';
  setStatus(`${targets.map(k => regionLabel(kind, k)).join(', ')} → ${fabricName}${state.activeColor ? ' · ' + state.activeColor : ''}`);
  renderRegionGrid();
}

function fillAllRegions(){
  const kind = GARMENT_TYPES[state.typeKey].kind;
  regionKeysFor(kind).forEach(k => fillRegion(k, false));
  state.lastTappedRegion = null;
  setStatus('옷 전체를 채웠어요.');
  renderRegionGrid();
}

/* ---------- 브러시 (정점 단위로 색 칠하기) ----------
   빠른 검색을 위해 정점을 월드 크기 기준 격자에 미리 넣어둬요(옷을 다시 만들 때마다 갱신). */
const GRID_CELL = 0.04;
function gridKey(ix, iy, iz){ return (ix + 512) * 1048576 + (iy + 512) * 1024 + (iz + 512); }
function buildPaintGrid(cache, scale){
  const pos = cache.geometry.attributes.position.array;
  const map = new Map();
  const inv = 1 / GRID_CELL;
  for(let i = 0; i < cache.count; i++){
    const k = gridKey(
      Math.floor(pos[i*3] * scale.x * inv),
      Math.floor(pos[i*3+1] * scale.y * inv),
      Math.floor(pos[i*3+2] * scale.z * inv));
    let list = map.get(k);
    if(!list){ list = []; map.set(k, list); }
    list.push(i);
  }
  return map;
}

const _brushColor = new THREE.Color();
let dirtyMin = Infinity, dirtyMax = -1;

// p, n: holder 로컬 좌표(원본 모델 좌표계)
function paintDab(p, n, erase){
  const cache = GLB_CACHE[state.typeKey];
  if(!cache || !state.paintGrid || !state.holder) return;
  const pos = cache.geometry.attributes.position.array;
  const nor = cache.geometry.attributes.normal.array;
  const arr = state.paintAttr.array;
  const s = state.holder.scale;
  const r = state.brushSize, r2 = r * r, inner = r * 0.55;
  const px = p.x * s.x, py = p.y * s.y, pz = p.z * s.z;
  const inv = 1 / GRID_CELL;
  const x0 = Math.floor((px - r) * inv), x1 = Math.floor((px + r) * inv);
  const y0 = Math.floor((py - r) * inv), y1 = Math.floor((py + r) * inv);
  const z0 = Math.floor((pz - r) * inv), z1 = Math.floor((pz + r) * inv);
  const cr = _brushColor.r, cg = _brushColor.g, cb = _brushColor.b;

  for(let ix = x0; ix <= x1; ix++) for(let iy = y0; iy <= y1; iy++) for(let iz = z0; iz <= z1; iz++){
    const list = state.paintGrid.get(gridKey(ix, iy, iz));
    if(!list) continue;
    for(let j = 0; j < list.length; j++){
      const i = list[j];
      const dx = pos[i*3] * s.x - px, dy = pos[i*3+1] * s.y - py, dz = pos[i*3+2] * s.z - pz;
      const d2 = dx*dx + dy*dy + dz*dz;
      if(d2 > r2) continue;
      // 반대편 면(얇은 옷의 뒤판 등)까지 번지지 않게, 같은 방향을 보는 정점만 칠해요.
      if(nor[i*3]*n.x + nor[i*3+1]*n.y + nor[i*3+2]*n.z < 0.1) continue;
      const d = Math.sqrt(d2);
      const t = d <= inner ? 1 : 1 - (d - inner) / (r - inner);
      const i4 = i * 4;
      if(erase){
        arr[i4+3] *= (1 - t);
      } else {
        const oa = arr[i4+3];
        const k = oa <= 0.001 ? 1 : t;
        arr[i4] += (cr - arr[i4]) * k;
        arr[i4+1] += (cg - arr[i4+1]) * k;
        arr[i4+2] += (cb - arr[i4+2]) * k;
        arr[i4+3] = Math.max(oa, t);
      }
      if(i < dirtyMin) dirtyMin = i;
      if(i > dirtyMax) dirtyMax = i;
    }
  }
}

function flushPaint(){
  const attr = state.paintAttr;
  if(!attr || dirtyMax < 0) return;
  if(typeof attr.clearUpdateRanges === 'function'){
    attr.clearUpdateRanges();
    attr.addUpdateRange(dirtyMin * 4, (dirtyMax - dirtyMin + 1) * 4);
  }
  attr.needsUpdate = true;
  dirtyMin = Infinity; dirtyMax = -1;
}

function dabWithMirror(p, n, erase){
  paintDab(p, n, erase);
  if(state.mirror){
    const cx = GLB_CACHE[state.typeKey].cx;
    paintDab(new THREE.Vector3(2*cx - p.x, p.y, p.z), new THREE.Vector3(-n.x, n.y, n.z), erase);
  }
}

/* ---------- 포인터: 채우기 탭 / 브러시 드래그 / 회전 ---------- */
const raycaster = new THREE.Raycaster();
const ptrNdc = new THREE.Vector2();
let stroke = null; // { id, last: {p, n} }

function hitTest(e){
  if(!state.garmentGroup) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  ptrNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ptrNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ptrNdc, camera);
  const hits = raycaster.intersectObject(state.garmentGroup, true);
  return hits[0] || null;
}

function strokeTo(hit){
  const erase = state.tool === 'eraser';
  const p = state.holder.worldToLocal(hit.point.clone());
  const n = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
  // DoubleSide라 안쪽 면을 맞췄을 수도 있어요 — 카메라 쪽을 보도록 법선을 뒤집어줘요.
  const camLocal = state.holder.worldToLocal(camera.position.clone());
  if(n.dot(camLocal.clone().sub(p)) < 0) n.negate();
  const last = stroke && stroke.last;
  if(last){
    const s = state.holder.scale;
    const dx = (p.x - last.p.x) * s.x, dy = (p.y - last.p.y) * s.y, dz = (p.z - last.p.z) * s.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const steps = Math.min(40, Math.max(1, Math.ceil(dist / (state.brushSize * 0.35))));
    for(let k = 1; k <= steps; k++) dabWithMirror(last.p.clone().lerp(p, k / steps), n, erase);
  } else {
    dabWithMirror(p, n, erase);
  }
  if(stroke) stroke.last = { p, n };
  flushPaint();
}

function handleStrokeMove(e){
  if(!stroke) return;
  const hit = hitTest(e);
  if(!hit){ stroke.last = null; return; } // 옷 밖으로 나가면 선을 끊어요.
  strokeTo(hit);
}

function endStroke(e){
  if(!stroke || (e && e.pointerId !== stroke.id)) return;
  if(queuedStroke){ const ev = queuedStroke; queuedStroke = null; handleStrokeMove(ev); }
  stroke = null;
  controls.enabled = true;
}

function setupPointerInteractions(){
  let tapStart = null;
  const canvas = renderer.domElement;

  // capture 단계에서 먼저 받아야 OrbitControls보다 앞서 회전을 막을 수 있어요.
  container.addEventListener('pointerdown', e => {
    if(state.tool === 'fill'){
      tapStart = { x: e.clientX, y: e.clientY };
      return;
    }
    if(stroke) return; // 두 번째 손가락은 무시
    const hit = hitTest(e);
    if(!hit) return;   // 옷 밖을 누르면 평소처럼 회전
    controls.enabled = false;
    stroke = { id: e.pointerId, last: null };
    _brushColor.set(state.activeColor || '#14201E');
    try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
    strokeTo(hit);
    e.preventDefault();
  }, { capture: true });

  canvas.addEventListener('pointermove', e => {
    if(stroke && e.pointerId === stroke.id) queuedStroke = e; // 프레임당 한 번만 처리
  });
  window.addEventListener('pointerup', endStroke);
  window.addEventListener('pointercancel', endStroke);

  canvas.addEventListener('pointerup', e => {
    if(state.tool !== 'fill' || !tapStart) return;
    const moved = Math.abs(e.clientX - tapStart.x) + Math.abs(e.clientY - tapStart.y);
    tapStart = null;
    if(moved > 6) return; // 드래그(회전)였으면 채우지 않아요.
    const hit = hitTest(e);
    const region = hit && hit.object.userData.region;
    if(region) fillRegion(region);
  });
}

/* ---------- UI 렌더 ---------- */
function setStatus(text){ if(el.status) el.status.textContent = text || ''; }

function renderAllUI(){
  renderTypeRow();
  renderToolRow();
  renderColorRow();
  renderFabricRow();
  renderRegionGrid();
}

function renderTypeRow(){
  el.typeRow.innerHTML = Object.entries(GARMENT_TYPES).map(([key, d]) => `
    <button class="type-chip${key === state.typeKey ? ' active' : ''}" data-type="${key}" type="button">${d.label}</button>
  `).join('');
  el.typeRow.querySelectorAll('.type-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.typeKey = btn.dataset.type;
      state.lastTappedRegion = null;
      setStatus('');
      rebuildGarment();
    });
  });
}

const TOOL_HINTS = {
  fill: '드래그로 회전 · 옷을 탭하면 그 부위를 채워요',
  brush: '옷 위를 드래그해서 그리기 · 옷 바깥을 드래그하면 회전',
  eraser: '옷 위를 드래그해서 브러시 자국 지우기 · 옷 바깥은 회전',
};
function renderToolRow(){
  el.toolRow.querySelectorAll('.tool-chip').forEach(b => b.classList.toggle('active', b.dataset.tool === state.tool));
  el.brushSizeRow.hidden = state.tool === 'fill';
  if(el.hint) el.hint.textContent = TOOL_HINTS[state.tool];
}
el.toolRow.querySelectorAll('.tool-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    state.tool = btn.dataset.tool;
    // 브러시는 반드시 색이 있어야 해서, "원단 원래 색"이 골라져 있으면 기본 잉크색으로 바꿔요.
    if(state.tool === 'brush' && !state.activeColor) state.activeColor = '#14201E';
    renderToolRow();
    renderColorRow();
  });
});

function renderColorRow(){
  const showFabricDefault = state.tool === 'fill';
  const isCustom = state.activeColor && !PALETTE.includes(state.activeColor);
  el.colorRow.innerHTML = `
    ${showFabricDefault ? `<button class="color-swatch fabric-default${!state.activeColor ? ' active' : ''}" data-color="" type="button">원단 원래 색</button>` : ''}
    ${PALETTE.map(c => `<button class="color-swatch${c === state.activeColor ? ' active' : ''}" data-color="${c}" type="button" style="background:${c}" aria-label="${c}"></button>`).join('')}
    <label class="color-custom${isCustom ? ' active' : ''}" title="직접 고르기"${isCustom ? ` style="background:${state.activeColor}"` : ''}>
      <input type="color" id="color-input" value="${state.activeColor || '#D8663F'}">
    </label>
  `;
  el.colorRow.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeColor = btn.dataset.color || null;
      renderColorRow();
    });
  });
  const input = el.colorRow.querySelector('#color-input');
  input.addEventListener('input', () => {
    state.activeColor = input.value.toUpperCase();
    const label = input.parentElement;
    label.style.background = input.value;
    label.classList.add('active');
    el.colorRow.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
  });
}

function renderFabricRow(){
  el.fabricRow.innerHTML = `
    <button class="fabric-swatch${state.activeFabric === 'none' ? ' active' : ''}" data-fabric="none" type="button">
      <span class="swatch-chip plain"></span>
      <span class="swatch-label">단색</span>
    </button>
  ` + FABRICS.map(f => `
    <button class="fabric-swatch${f.id === state.activeFabric ? ' active' : ''}" data-fabric="${f.id}" type="button">
      <span class="swatch-chip" style="background-color:${f.base}"></span>
      <span class="swatch-label">${f.name}</span>
    </button>
  `).join('');
  el.fabricRow.querySelectorAll('.fabric-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeFabric = btn.dataset.fabric;
      renderFabricRow();
    });
  });
}

function lookSwatchColor(look){
  if(!look) return '#e5e0d5';
  if(look.color) return look.color;
  const f = FABRICS.find(x => x.id === look.fabric);
  return f ? f.base : '#e5e0d5';
}
function lookName(look){
  if(!look) return '미지정';
  const f = look.fabric ? FABRICS.find(x => x.id === look.fabric) : null;
  return f ? f.name : '단색';
}

function renderRegionGrid(){
  const def = GARMENT_TYPES[state.typeKey];
  const design = getDesign(state.typeKey);
  const head = `<div></div>` + REGION_COLS.map(([, side, face]) => `<div class="rg-head">${side}<br>${face}</div>`).join('');
  const rows = REGION_ROWS[def.kind].map(([row, rowLabel]) => {
    const cells = REGION_COLS.map(([col]) => {
      const key = `${row}_${col}`;
      const look = design.regions[key];
      const tapped = key === state.lastTappedRegion || (state.mirror && state.lastTappedRegion && mirrorRegionKey(state.lastTappedRegion) === key);
      return `
        <button class="rg-cell${tapped ? ' just-tapped' : ''}" data-region="${key}" type="button" aria-label="${regionLabel(def.kind, key)}">
          <span class="dot" style="background:${lookSwatchColor(look)}"></span>
          <span class="rg-name">${lookName(look)}</span>
        </button>`;
    }).join('');
    return `<div class="rg-row-label">${rowLabel}</div>${cells}`;
  }).join('');
  el.regionGrid.innerHTML = head + rows;
  el.regionGrid.querySelectorAll('.rg-cell').forEach(btn => {
    btn.addEventListener('click', () => fillRegion(btn.dataset.region));
  });
}

/* ---------- 입력 ---------- */
function clampNumberInput(input, fallback, min, max){
  const v = parseFloat(input.value);
  if(!isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}
el.lengthInput.addEventListener('change', () => {
  state.lengthMul = clampNumberInput(el.lengthInput, 1, 0.6, 1.6);
  el.lengthInput.value = state.lengthMul;
  rebuildGarment();
});
el.girthInput.addEventListener('change', () => {
  state.girthMul = clampNumberInput(el.girthInput, 1, 0.7, 1.5);
  el.girthInput.value = state.girthMul;
  rebuildGarment();
});
el.brushSize.addEventListener('input', () => {
  state.brushSize = parseFloat(el.brushSize.value) || 0.035;
});
el.mirrorToggle.addEventListener('change', () => {
  state.mirror = el.mirrorToggle.checked;
  renderRegionGrid();
});
el.fillAllBtn.addEventListener('click', fillAllRegions);
el.clearPaintBtn.addEventListener('click', () => {
  const design = getDesign(state.typeKey);
  if(design.paint) design.paint.fill(0);
  if(state.paintAttr){
    if(typeof state.paintAttr.clearUpdateRanges === 'function') state.paintAttr.clearUpdateRanges();
    state.paintAttr.needsUpdate = true;
  }
  setStatus('브러시로 그린 자국을 모두 지웠어요.');
});
el.resetBtn.addEventListener('click', () => {
  delete state.designByType[state.typeKey];
  state.lastTappedRegion = null;
  setStatus('이 옷을 처음 상태로 되돌렸어요.');
  rebuildGarment();
});

/* ---------- 시작 ---------- */
preloadGarmentGLBs();
renderAllUI();
