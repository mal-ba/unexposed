// ====== create.js : 제작 스튜디오 — 치수·원단 커스텀 옷 빌더 (module script, Three.js) ======
// customize-3d.js의 마네킹 실측/핏팅 원리(어깨선 자동 탐지, 로컬 바운딩박스 기준 스케일)를
// 그대로 재사용해요. 다만 이 페이지는 GLB 옷을 불러오는 대신, 옷 자체를 절차적으로
// 생성해요 — 부위(앞/뒤/소매/옆면)마다 별도 Mesh + 별도 Material을 만들기 때문에,
// customize-3d.js의 getGarmentParts()가 하던 "재질별 부위 인식"과 같은 개념을
// 이 페이지 안에서 자체적으로 구현해요(별도 페이지라 window 전역 공유를 할 수 없어요).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ---------- 옷 종류 정의 ----------
   shortSleeve/shortPants/longPants는 Meshy AI로 생성한 실제 GLB 모델을 그대로
   불러와서 써요(glb 필드). 이 모델들은 부위별로 분리된 메쉬/재질이 없는 단일
   메쉬라서, regions를 'whole' 하나로 두고 옷 전체를 하나의 파트로 채색해요.
   glb가 없는 longSleeve는 기존처럼 절차적으로 생성해요. */
const GARMENT_TYPES = {
  shortSleeve: { label: '반팔 티셔츠', anchor: 'shoulder', sleeveFrac: 0.14, glbHeightFrac: 0.42, yOffsetFrac: 0.04,
    glb: '/wardrobe-assets/Meshy_AI_Classic_White_T_Shirt_0913135306_generate.glb',
    regions: [['whole','전체']] },
  longSleeve: { label: '긴팔 티셔츠', anchor: 'shoulder', sleeveFrac: 0.34,
    regions: [['front','앞면'],['back','뒷면'],['leftSleeve','왼쪽 소매'],['rightSleeve','오른쪽 소매'],['leftSide','왼쪽 옆면'],['rightSide','오른쪽 옆면']] },
  shortPants: { label: '반바지', anchor: 'waist', legFrac: 0.22, glbHeightFrac: 0.22, yOffsetFrac: 0.025,
    glb: '/wardrobe-assets/Meshy_AI_White_Shorts_0913135257_generate.glb',
    regions: [['whole','전체']] },
  longPants: { label: '긴바지', anchor: 'waist', legFrac: 0.46, glbHeightFrac: 0.54,
    glb: '/wardrobe-assets/Meshy_AI_White_Long_Pants_0913135302_generate.glb',
    regions: [['whole','전체']] },
};

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

function makeFabricTexture(fabric){
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  fabric.draw(c.getContext('2d'), 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/* ---------- 마네킹 실측 (customize-3d.js와 동일한 원리) ---------- */
function findMannequinMesh(root){
  let found = null;
  root.traverse(node => { if(!found && node.isMesh && node.geometry) found = node; });
  return found;
}
function getMannequinLocalBounds(root){
  const mesh = findMannequinMesh(root);
  if(!mesh) return null;
  if(!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  if(!box || !isFinite(box.min.y) || !isFinite(box.max.y)) return null;
  return { height: box.max.y - box.min.y, minY: box.min.y };
}
function findShoulderLineY(root){
  let skinnedMesh = null, staticMesh = null;
  root.traverse(node => {
    if(node.isSkinnedMesh && !skinnedMesh) skinnedMesh = node;
    if(node.isMesh && !node.isSkinnedMesh && !staticMesh) staticMesh = node;
  });
  const mesh = skinnedMesh || staticMesh;
  if(!mesh || !mesh.geometry || !mesh.geometry.attributes.position) return null;
  const posAttr = mesh.geometry.attributes.position;
  const box = mesh.geometry.boundingBox || (mesh.geometry.computeBoundingBox(), mesh.geometry.boundingBox);
  const minY = box.min.y, maxY = box.max.y, span = maxY - minY;
  if(span <= 0) return null;
  const BUCKETS = 24;
  const maxAbsXInBucket = new Array(BUCKETS).fill(0);
  for(let i = 0; i < posAttr.count; i++){
    const y = posAttr.getY(i), x = posAttr.getX(i);
    let b = Math.floor(((y - minY) / span) * BUCKETS);
    if(b < 0) b = 0; if(b >= BUCKETS) b = BUCKETS - 1;
    const ax = Math.abs(x);
    if(ax > maxAbsXInBucket[b]) maxAbsXInBucket[b] = ax;
  }
  let bestBucket = 0, bestWidth = -1;
  for(let b = 0; b < BUCKETS; b++){ if(maxAbsXInBucket[b] > bestWidth){ bestWidth = maxAbsXInBucket[b]; bestBucket = b; } }
  return minY + span * ((bestBucket + 0.5) / BUCKETS);
}

/* ---------- 실제 GLB 옷 모델 미리 불러오기 ----------
   Meshy AI가 만든 GLB들은 단일 메쉬(POSITION만 있고 NORMAL/UV/재질 없음)라서,
   불러온 뒤 법선을 계산하고 우리 쪽 MeshStandardMaterial을 새로 입혀서 써요.
   페이지 스크립트가 로드되자마자(모달을 열기 전부터) 미리 받아 두고,
   타입을 눌렀을 때는 캐시에서 바로 꺼내 쓰도록 해요. */
const GLB_CACHE = {}; // typeKey -> 원본 BufferGeometry(법선/바운딩박스 계산 완료)
let pendingGlbType = null;
const glbLoader = new GLTFLoader();

function preloadGarmentGLBs(){
  const jobs = Object.entries(GARMENT_TYPES)
    .filter(([, def]) => def.glb)
    .map(([key, def]) => new Promise(resolve => {
      glbLoader.load(def.glb, gltf => {
        const mesh = findMannequinMesh(gltf.scene);
        if(mesh && mesh.geometry){
          mesh.geometry.computeVertexNormals();
          mesh.geometry.computeBoundingBox();
          GLB_CACHE[key] = mesh.geometry;
        }
        resolve();
      }, undefined, () => resolve()); // 실패해도 다른 항목 로딩은 계속 진행해요.
    }));
  return Promise.all(jobs).then(() => {
    if(pendingGlbType && GLB_CACHE[pendingGlbType] && state.typeKey === pendingGlbType){
      pendingGlbType = null;
      rebuildGarment();
    }
  });
}
preloadGarmentGLBs();

function buildGroupFromGLB(cachedGeometry, mannequinHeight, lengthMul, girthMul, heightFrac){
  const group = new THREE.Group();
  const box = cachedGeometry.boundingBox;
  const rawH = (box.max.y - box.min.y) || 1;
  const baseScale = (mannequinHeight * heightFrac) / rawH;
  const scaleY = baseScale * lengthMul;
  const scaleXZ = baseScale * girthMul;

  const geo = cachedGeometry.clone(); // 캐시 원본은 그대로 두고, 매번 새 지오메트리로 복제해서 써요.
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(scaleXZ, scaleY, scaleXZ);
  // 옷의 맨 윗부분(어깨선 또는 허리선)이 group 원점(=anchor 라인)에 오도록 내려줘요.
  mesh.position.y = -box.max.y * scaleY;
  group.add(mesh);
  return { group, parts: { whole: mesh } };
}

/* ---------- 절차적 옷 지오메트리 ---------- */
// 각 부위는 독립된 Mesh(독립된 Material)예요 — customize-3d.js의 "재질별 부위" 개념과
// 맞춰서, 나중에 이 빌더로 만든 옷도 같은 방식(부위=재질)으로 다뤄질 수 있게 해요.
function buildTopGroup(mannequinHeight, lengthMul, girthMul, sleeveFrac){
  const group = new THREE.Group();
  const parts = {};
  const torsoH = mannequinHeight * 0.36 * lengthMul;
  const torsoW = mannequinHeight * 0.30 * girthMul;
  const torsoD = mannequinHeight * 0.16 * girthMul;
  const baseMat = () => new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.85 });

  const torsoGeo = new THREE.BoxGeometry(torsoW, torsoH, torsoD);
  const torso = new THREE.Mesh(torsoGeo, baseMat());
  torso.position.set(0, -torsoH / 2, 0);
  group.add(torso);
  // BoxGeometry 면 순서(+x,-x,+y,-y,+z,-z)의 각 4개 정점 그룹마다 별도 재질을 쓰고 싶지만,
  // 대표 데모 단계에서는 앞/뒤만 별도 메쉬로 분리하고 좌우 옆면은 얇은 패널로 덧붙여요.
  const sideW = torsoD, sideT = 0.015;
  const leftSide = new THREE.Mesh(new THREE.BoxGeometry(sideT, torsoH, sideW), baseMat());
  leftSide.position.set(-torsoW / 2, -torsoH / 2, 0);
  group.add(leftSide);
  const rightSide = new THREE.Mesh(new THREE.BoxGeometry(sideT, torsoH, sideW), baseMat());
  rightSide.position.set(torsoW / 2, -torsoH / 2, 0);
  group.add(rightSide);

  // 앞/뒤는 얇은 패널로 토르소 표면에 겹쳐서, 각각 독립적으로 채색 가능하게 해요.
  const frontPanel = new THREE.Mesh(new THREE.PlaneGeometry(torsoW * 0.98, torsoH * 0.98), baseMat());
  frontPanel.position.set(0, -torsoH / 2, torsoD / 2 + 0.002);
  group.add(frontPanel);
  const backPanel = new THREE.Mesh(new THREE.PlaneGeometry(torsoW * 0.98, torsoH * 0.98), baseMat());
  backPanel.position.set(0, -torsoH / 2, -torsoD / 2 - 0.002);
  backPanel.rotation.y = Math.PI;
  group.add(backPanel);

  const sleeveLen = mannequinHeight * sleeveFrac * lengthMul;
  const sleeveGeo = () => new THREE.CylinderGeometry(mannequinHeight * 0.05 * girthMul, mannequinHeight * 0.042 * girthMul, sleeveLen, 12, 1, true);
  const leftSleeve = new THREE.Mesh(sleeveGeo(), baseMat());
  leftSleeve.rotation.z = Math.PI / 2;
  leftSleeve.position.set(-(torsoW / 2 + sleeveLen / 2 - 0.02), -torsoH * 0.14, 0);
  group.add(leftSleeve);
  const rightSleeve = new THREE.Mesh(sleeveGeo(), baseMat());
  rightSleeve.rotation.z = -Math.PI / 2;
  rightSleeve.position.set(torsoW / 2 + sleeveLen / 2 - 0.02, -torsoH * 0.14, 0);
  group.add(rightSleeve);

  parts.front = frontPanel; parts.back = backPanel;
  parts.leftSide = leftSide; parts.rightSide = rightSide;
  parts.leftSleeve = leftSleeve; parts.rightSleeve = rightSleeve;
  return { group, parts };
}

function buildBottomGroup(mannequinHeight, lengthMul, girthMul, legFrac){
  const group = new THREE.Group();
  const parts = {};
  const legLen = mannequinHeight * legFrac * lengthMul;
  const legW = mannequinHeight * 0.14 * girthMul;
  const legD = mannequinHeight * 0.13 * girthMul;
  const gap = mannequinHeight * 0.015;
  const baseMat = () => new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.85 });

  [-1, 1].forEach(side => {
    const legX = side * (legW / 2 + gap / 2);
    const legBody = new THREE.Mesh(new THREE.BoxGeometry(legW, legLen, legD), baseMat());
    legBody.position.set(legX, -legLen / 2, 0);
    group.add(legBody);
    const outerSide = new THREE.Mesh(new THREE.BoxGeometry(0.015, legLen, legD), baseMat());
    outerSide.position.set(legX + side * legW / 2, -legLen / 2, 0);
    group.add(outerSide);
    if(side < 0) parts.leftSide = outerSide; else parts.rightSide = outerSide;
  });

  const frontPanel = new THREE.Mesh(new THREE.PlaneGeometry(legW * 2 + gap, legLen * 0.98), baseMat());
  frontPanel.position.set(0, -legLen / 2, legD / 2 + 0.002);
  group.add(frontPanel);
  const backPanel = new THREE.Mesh(new THREE.PlaneGeometry(legW * 2 + gap, legLen * 0.98), baseMat());
  backPanel.position.set(0, -legLen / 2, -legD / 2 - 0.002);
  backPanel.rotation.y = Math.PI;
  group.add(backPanel);

  parts.front = frontPanel; parts.back = backPanel;
  return { group, parts };
}

/* ---------- 페이지 상태 ---------- */
const state = {
  typeKey: 'shortSleeve',
  lengthMul: 1, girthMul: 1,
  activeFabric: 'cotton',
  assignedByType: {}, // { shortSleeve: { front: 'denim', ... }, ... }
  garmentGroup: null,
  parts: {},
  mannequin: null, mannequinHeight: 1.6, mannequinMinY: 0,
};

const el = {
  typeRow: document.getElementById('type-row'),
  fabricRow: document.getElementById('fabric-row'),
  partList: document.getElementById('part-list'),
  lengthInput: document.getElementById('length-input'),
  girthInput: document.getElementById('girth-input'),
  resetBtn: document.getElementById('reset-btn'),
  loading: document.getElementById('create-loading'),
};

/* ---------- 모달 열기/닫기 ----------
   customize-3d.js의 startMannequinViewerOnce() 패턴과 동일해요: 모달이 hidden인 동안은
   컨테이너 크기가 0이라 renderer/camera를 그때 만들면 화면이 깨져요. 그래서 실제로
   모달이 열릴 때(container가 화면에 보일 때) 딱 한 번만 초기화해요. */
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

let container, scene, camera, renderer, controls, resizeViewer;

function initViewer(){
/* ---------- three.js 씬 ---------- */
container = document.getElementById('create-3d');
scene = new THREE.Scene();
scene.background = new THREE.Color(0x123B38);
camera = new THREE.PerspectiveCamera(42, (container.clientWidth || 1) / (container.clientHeight || 1), 0.1, 100);
camera.position.set(0, 1.3, 3.2);
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth || 300, container.clientHeight || 300);
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 1.3));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(2, 4, 3);
scene.add(dirLight);

controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 0.6;
controls.maxDistance = 8;
controls.target.set(0, 1, 0);

// 마네킹 모델은 더 이상 불러오지 않아요. 옷을 붙일 빈 기준 그룹만 두고,
// 위치·크기는 기본 키 165cm 기준 고정값으로 계산해요.
state.mannequin = new THREE.Group();
scene.add(state.mannequin);
state.mannequinHeight = 1.65;
state.mannequinMinY = 0;
state.shoulderY = state.mannequinMinY + state.mannequinHeight * 0.776;
state.waistY = state.mannequinMinY + state.mannequinHeight * 0.473;
if(el.loading) el.loading.hidden = true;
rebuildGarment();

(function loop(){
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
})();
resizeViewer = () => {
  const w = container.clientWidth, h = container.clientHeight;
  if(!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
};
window.addEventListener('resize', resizeViewer);
new ResizeObserver(resizeViewer).observe(container);
// 모달이 막 열린 직후엔 레이아웃이 아직 반영 안 됐을 수 있어 한 프레임 뒤에 한 번 더 맞춰요.
requestAnimationFrame(resizeViewer);

setupPointerPainting();
}

/* ---------- 옷 생성/재생성 ---------- */
function rebuildGarment(){
  if(!state.mannequin) return;
  if(state.garmentGroup){
    state.mannequin.remove(state.garmentGroup);
    state.garmentGroup.traverse(n => { if(n.isMesh){ n.geometry.dispose(); n.material.dispose(); } });
  }
  const def = GARMENT_TYPES[state.typeKey];
  let built;
  if(def.glb){
    const cachedGeo = GLB_CACHE[state.typeKey];
    if(!cachedGeo){
      // 아직 다운로드/파싱 중이면, 끝나는 대로 preloadGarmentGLBs()의 콜백이 다시 불러줘요.
      state.garmentGroup = null;
      state.parts = {};
      pendingGlbType = state.typeKey;
      if(el.loading){ el.loading.hidden = false; el.loading.textContent = '옷 모델을 불러오는 중...'; }
      return;
    }
    built = buildGroupFromGLB(cachedGeo, state.mannequinHeight, state.lengthMul, state.girthMul, def.glbHeightFrac);
  } else {
    built = def.anchor === 'shoulder'
      ? buildTopGroup(state.mannequinHeight, state.lengthMul, state.girthMul, def.sleeveFrac)
      : buildBottomGroup(state.mannequinHeight, state.lengthMul, state.girthMul, def.legFrac);
  }
  if(el.loading) el.loading.hidden = true;
  state.garmentGroup = built.group;
  state.parts = built.parts;
  const anchorY = (def.anchor === 'shoulder') ? state.shoulderY : state.waistY;
  state.garmentGroup.position.y = anchorY + (def.yOffsetFrac || 0) * state.mannequinHeight;
  state.mannequin.add(state.garmentGroup);

  // 저장된 원단 배정을 다시 칠해요.
  const saved = state.assignedByType[state.typeKey] || {};
  Object.entries(saved).forEach(([region, fabricId]) => paintPart(region, fabricId, false));

  renderTypeRow();
  renderFabricRow();
  renderPartList();
}

function paintPart(region, fabricId, remember = true){
  const mesh = state.parts[region];
  if(!mesh) return;
  const fabric = FABRICS.find(f => f.id === fabricId);
  if(!fabric) return;
  mesh.material.map = makeFabricTexture(fabric);
  mesh.material.color.set(0xffffff);
  mesh.material.needsUpdate = true;
  if(remember){
    if(!state.assignedByType[state.typeKey]) state.assignedByType[state.typeKey] = {};
    state.assignedByType[state.typeKey][region] = fabricId;
    renderPartList();
  }
}

function resetCurrentGarment(){
  Object.values(state.parts).forEach(mesh => { mesh.material.map = null; mesh.material.color.set(0xd8d2c4); mesh.material.needsUpdate = true; });
  delete state.assignedByType[state.typeKey];
  renderPartList();
}

/* ---------- UI 렌더 ---------- */
function renderTypeRow(){
  el.typeRow.innerHTML = Object.entries(GARMENT_TYPES).map(([key, d]) => `
    <button class="type-chip${key === state.typeKey ? ' active' : ''}" data-type="${key}" type="button">${d.label}</button>
  `).join('');
  el.typeRow.querySelectorAll('.type-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.typeKey = btn.dataset.type;
      rebuildGarment();
    });
  });
}

function renderFabricRow(){
  el.fabricRow.innerHTML = FABRICS.map(f => `
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

function renderPartList(){
  const def = GARMENT_TYPES[state.typeKey];
  const saved = state.assignedByType[state.typeKey] || {};
  el.partList.innerHTML = def.regions.map(([region, label]) => {
    const fabric = FABRICS.find(f => f.id === saved[region]);
    return `
      <button class="part-row" data-region="${region}" type="button">
        <span>${label}</span>
        <span class="part-fabric">${fabric ? fabric.name : '미지정'} <span class="dot" style="background-color:${fabric ? fabric.base : '#e5e0d5'}"></span></span>
      </button>
    `;
  }).join('');
  el.partList.querySelectorAll('.part-row').forEach(btn => {
    btn.addEventListener('click', () => {
      paintPart(btn.dataset.region, state.activeFabric);
      el.partList.querySelectorAll('.part-row').forEach(b => b.classList.remove('just-tapped'));
      btn.classList.add('just-tapped');
    });
  });
}

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
el.resetBtn.addEventListener('click', resetCurrentGarment);

/* ---------- 초기 UI 렌더 (마네킹 로딩과 무관하게 바로 보이게) ---------- */
renderTypeRow();
renderFabricRow();
renderPartList();

/* ---------- 3D 모델을 직접 탭해서 채색 ---------- */
function setupPointerPainting(){
  const raycaster = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let pointerDownPos = null;

  renderer.domElement.addEventListener('pointerdown', e => { pointerDownPos = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', e => {
    if(!pointerDownPos) return;
    const moved = Math.abs(e.clientX - pointerDownPos.x) + Math.abs(e.clientY - pointerDownPos.y);
    pointerDownPos = null;
    if(moved > 6 || !state.garmentGroup) return; // 드래그(회전)였으면 채색하지 않아요.
    const rect = renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ptr, camera);
    const hits = raycaster.intersectObject(state.garmentGroup, true);
    if(!hits.length) return;
    const hitMesh = hits[0].object;
    const region = Object.entries(state.parts).find(([, mesh]) => mesh === hitMesh)?.[0];
    if(!region) return;
    paintPart(region, state.activeFabric);
    el.partList.querySelectorAll('.part-row').forEach(b => b.classList.toggle('just-tapped', b.dataset.region === region));
  });
}
