// ====== makeup.js : 메인 페이지의 독립된 "메이크업" 구역 전용 스크립트 (module script, Three.js) ======
// 체형 스캔(마네킹)과는 완전히 별개의 흐름이에요.
// STEP 1: 얼굴 사진을 찍거나 올려요 → STEP 2: 그 사진을 3D 얼굴 모델(makeup-face.glb)에
// 입혀서 보여주고, 메이크업 소품(makeup-props.js)이나 업로드된 메이크업 아이템으로 꾸며요.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MAKEUP_PROP_DEFS, recolorProp, FACE_PATCH_ANGLES, FACE_PATCH_Y, HAIR_BAND_ANGLES, HAIR_BAND_Y } from '/makeup-props.js';
import { SEG_CATEGORY, analyzePhotoBySegments, sampleAverageColorFromPhoto } from '/segment-utils.js';

/* ==========================================================================
   STEP 1 : 얼굴 스캔 — 정면 → 왼쪽 옆모습 → 오른쪽 옆모습 → 뒷모습, 4단계로 찍어요.
   정면·좌·우 사진은 얼굴에, 4장 전부는 머리카락(옆·뒤통수까지)에 쓰여요.
   ========================================================================== */
const SCAN_STAGES = [
  { key: 'front', label: '정면', instruction: '정면을 카메라로 봐주세요. 이 사진으로 얼굴이랑 앞머리를 만들어요.', required: true },
  { key: 'left', label: '왼쪽 옆모습', instruction: '고개를 오른쪽으로 돌려서, 얼굴 왼쪽이 보이게 찍어주세요.', required: false },
  { key: 'right', label: '오른쪽 옆모습', instruction: '고개를 왼쪽으로 돌려서, 얼굴 오른쪽이 보이게 찍어주세요.', required: false },
  { key: 'back', label: '뒷모습', instruction: '뒤돌아서 뒤통수가 보이게 찍어주세요 (다른 사람이 찍어줘도 좋아요).', required: false },
];

const scanStepEl = document.getElementById('makeup-scan-step');
const threeDStepEl = document.getElementById('makeup-3d-step');
const scanVideo = document.getElementById('makeup-scan-video');
const scanCanvas = document.getElementById('makeup-scan-canvas');
const scanStartBtn = document.getElementById('makeup-scan-start-btn');
const scanCaptureBtn = document.getElementById('makeup-scan-capture-btn');
const scanFileInput = document.getElementById('makeup-scan-file-input');
const scanPhotoSlot = document.getElementById('makeup-scan-photo-slot');
const scanNextBtn = document.getElementById('makeup-scan-next-btn');
const scanSkipBtn = document.getElementById('makeup-scan-skip-btn');
const scanConfirmBtn = document.getElementById('makeup-scan-confirm-btn');
const scanStageCounter = document.getElementById('makeup-scan-stage-counter');
const scanStageInstruction = document.getElementById('makeup-scan-stage-instruction');
const scanStageDots = document.getElementById('makeup-scan-stage-dots');
const rescanBtn = document.getElementById('makeup-rescan-btn');

let scanStream = null;
let currentStageIndex = 0;
const capturedPhotos = {}; // { front: dataUrl, left: dataUrl, right: dataUrl, back: dataUrl }
const stageStatus = {}; // { front: 'done'|'skipped', ... }

function stopScanStream(){
  if(scanStream){
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
}

function currentStage(){ return SCAN_STAGES[currentStageIndex]; }

function renderStageDots(){
  scanStageDots.querySelectorAll('.stage-dot').forEach(dot => {
    const key = dot.dataset.stage;
    dot.classList.toggle('stage-done', stageStatus[key] === 'done');
    dot.classList.toggle('stage-skipped', stageStatus[key] === 'skipped');
    dot.classList.toggle('stage-current', key === currentStage().key);
  });
}

function renderStageUI(){
  const stage = currentStage();
  scanStageCounter.textContent = `${currentStageIndex + 1}/${SCAN_STAGES.length}`;
  scanStageInstruction.textContent = stage.instruction;
  scanSkipBtn.hidden = stage.required;

  // 이 단계 사진이 이미 있으면 미리보기를 보여주고, 없으면 빈 상태로.
  if(capturedPhotos[stage.key]){
    scanPhotoSlot.innerHTML = '';
    const img = document.createElement('img');
    img.src = capturedPhotos[stage.key];
    scanPhotoSlot.appendChild(img);
    scanNextBtn.disabled = false;
  } else {
    scanPhotoSlot.innerHTML = '<span class="scan-photo-placeholder">촬영하거나 업로드한 사진이 여기에 표시돼요</span>';
    scanNextBtn.disabled = true;
  }

  scanStartBtn.hidden = false;
  scanStartBtn.textContent = capturedPhotos[stage.key] ? '다시 촬영' : '카메라 켜기';
  scanCaptureBtn.hidden = true;
  scanNextBtn.textContent = currentStageIndex === SCAN_STAGES.length - 1 ? '완료' : '다음 각도로 →';

  const doneCount = Object.keys(stageStatus).length;
  scanConfirmBtn.disabled = !(stageStatus.front === 'done'); // 정면만 있으면 바로 만들 수 있게 해요.
  renderStageDots();
}

function savePhotoForCurrentStage(dataUrl){
  const stage = currentStage();
  capturedPhotos[stage.key] = dataUrl;
  stageStatus[stage.key] = 'done';
  renderStageUI();
}

scanStartBtn.addEventListener('click', async () => {
  try{
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    scanVideo.srcObject = scanStream;
    scanStartBtn.hidden = true;
    scanCaptureBtn.hidden = false;
  } catch(err){
    alert('카메라를 켤 수 없어요. 파일 업로드를 이용해주세요.');
  }
});

scanCaptureBtn.addEventListener('click', () => {
  scanCanvas.width = scanVideo.videoWidth;
  scanCanvas.height = scanVideo.videoHeight;
  scanCanvas.getContext('2d').drawImage(scanVideo, 0, 0);
  savePhotoForCurrentStage(scanCanvas.toDataURL('image/jpeg', 0.92));
  stopScanStream();
});

scanFileInput.addEventListener('change', () => {
  const file = scanFileInput.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => savePhotoForCurrentStage(reader.result);
  reader.readAsDataURL(file);
  scanFileInput.value = '';
});

function goToNextStage(){
  stopScanStream();
  if(currentStageIndex < SCAN_STAGES.length - 1){
    currentStageIndex++;
    renderStageUI();
  }
}

scanNextBtn.addEventListener('click', goToNextStage);
scanSkipBtn.addEventListener('click', () => {
  const stage = currentStage();
  if(!capturedPhotos[stage.key]) stageStatus[stage.key] = 'skipped';
  goToNextStage();
});

scanStageDots.querySelectorAll('.stage-dot').forEach((dot, i) => {
  dot.addEventListener('click', () => {
    stopScanStream();
    currentStageIndex = i;
    renderStageUI();
  });
});

scanConfirmBtn.addEventListener('click', () => {
  if(!capturedPhotos.front) return;
  stopScanStream();
  scanStepEl.hidden = true;
  threeDStepEl.hidden = false;
  threeDStepEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  startOrUpdateViewer();
  // 찍은 사진들을 AI로 분석해서, 각도에 맞게 얼굴/머리카락을 입혀줘요.
  applyAllPhotosAI({ ...capturedPhotos });
});

rescanBtn.addEventListener('click', () => {
  threeDStepEl.hidden = true;
  scanStepEl.hidden = false;
  currentStageIndex = 0;
  renderStageUI();
  scanStepEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

renderStageUI();

// ---------- 머리카락·얼굴 AI 인식 (공용 segment-utils.js 사용) ----------
// 혹시 이 모델을 못 불러오면(네트워크 문제 등) 자동으로 예전 방식(사진 위쪽 색 평균)으로 대체해요.
function analyzePhotoSegments(dataUrl){
  return analyzePhotoBySegments(dataUrl, {
    hairCutout: [SEG_CATEGORY.HAIR],
    faceCutout: [SEG_CATEGORY.BODY_SKIN, SEG_CATEGORY.FACE_SKIN], // 얼굴 패치에는 얼굴 피부 + 목/몸 피부까지 살짝 포함해서, 턱선에서 뚝 끊기지 않게 해요.
  });
}
const sampleHairColorFromPhoto = dataUrl => sampleAverageColorFromPhoto(dataUrl, 0.22);

let pendingPhotosApply = null; // 얼굴 모델이 아직 안 불러와졌을 때, 분석 결과를 잠시 담아둬요.
let activeFacePatches = []; // 정면/좌/우 얼굴 패치들
let activeHairBandPatches = []; // 정면/좌/우/뒤 머리카락 밴드 패치들

// STEP 2 진입 시 자동으로 호출돼요: 찍은 사진들(최대 4장)을 각각 AI로 분석해서,
// 각도에 맞는 얼굴 패치·머리카락 밴드를 만들어요.
async function applyAllPhotosAI(photos){
  if(statusEl) statusEl.textContent = '사진에서 얼굴과 머리카락을 인식하는 중이에요... (사진이 많으면 조금 걸려요)';

  const faceCutouts = {}; // { front: canvas, left: canvas, right: canvas }
  const hairCutouts = {}; // { front: canvas, left: canvas, right: canvas, back: canvas }
  let anyFaceFound = false;

  for(const stage of SCAN_STAGES){
    const dataUrl = photos[stage.key];
    if(!dataUrl) continue;
    try{
      const segments = await analyzePhotoSegments(dataUrl);
      if(segments.faceCutout){ faceCutouts[stage.key] = segments.faceCutout; anyFaceFound = true; }
      if(segments.hairCutout) hairCutouts[stage.key] = segments.hairCutout;
    } catch(err){
      console.error(`${stage.label} 사진 AI 인식 실패:`, err);
    }
  }

  applyPhotosToScene({ faceCutouts, hairCutouts, frontDataUrl: photos.front });

  if(anyFaceFound){
    if(statusEl) statusEl.textContent = '사진 속 얼굴·머리카락을 3D에 입혔어요! 각도별로 잘 안 맞으면 소품처럼 슬라이더로 미세조정할 수 있어요.';
  } else if(statusEl){
    statusEl.textContent = '얼굴 인식에는 실패했어요. 조명이 밝은 정면 사진으로 다시 시도해보세요.';
  }
}

// 얼굴 모델이 아직 없으면 대기했다가, 준비되면 실제로 씬에 붙여요.
function applyPhotosToScene(payload){
  if(!faceModel){
    pendingPhotosApply = payload;
    return;
  }
  const { faceCutouts, hairCutouts, frontDataUrl } = payload;

  // 기존에 붙어있던 패치들은 지우고 새로 붙여요 (다시 스캔했을 때 중복 방지).
  activeFacePatches.forEach(disposeProjectedLayer);
  activeHairBandPatches.forEach(disposeProjectedLayer);
  activeFacePatches = [];
  activeHairBandPatches = [];

  // 예전에는 사진을 얼굴 앞에 떠 있는 원통 곡면에 붙여서, 코·입술처럼 튀어나온 부분이랑 안 맞았어요.
  // 이제는 같은 각도·높이 기준으로 사진을 "프로젝터처럼" 실제 3D 얼굴 표면에 직접 비춰서 입혀요.
  let layerIndex = 0;
  FACE_PATCH_ANGLES.forEach(angle => {
    const cutout = faceCutouts[angle.key];
    if(!cutout) return;
    const layers = createProjectedLayers({
      cutoutCanvas: cutout,
      thetaCenter: angle.thetaCenter,
      thetaWidth: angle.thetaWidth,
      yTop: FACE_PATCH_Y.yTop,
      yBottom: FACE_PATCH_Y.yBottom,
      radius: FACE_PATCH_Y.radius,
      layerIndex: layerIndex++,
    });
    activeFacePatches.push(...layers);
  });

  HAIR_BAND_ANGLES.forEach(angle => {
    const cutout = hairCutouts[angle.key];
    if(!cutout) return;
    const layers = createProjectedLayers({
      cutoutCanvas: cutout,
      thetaCenter: angle.thetaCenter,
      thetaWidth: angle.thetaWidth,
      yTop: HAIR_BAND_Y.yTop,
      yBottom: HAIR_BAND_Y.yBottom,
      radius: HAIR_BAND_Y.radius,
      layerIndex: layerIndex++,
    });
    activeHairBandPatches.push(...layers);
  });

  // 정수리 캡(작은 단색 돔)은 정면 사진에서 뽑은 머리색으로 자동으로 씌워줘요.
  if(frontDataUrl){
    sampleHairColorFromPhoto(frontDataUrl).then(hex => {
      if(hex) applyHairCrown(hex);
    });
  }
}

/* ---------- 사진을 3D 얼굴 표면에 직접 비춰 입히기 (프로젝션 매핑) ----------
   원리: 얼굴 메시의 정점마다 "이 정점이 사진의 어느 픽셀에 해당하는지"(UV)를 계산해서,
   메시와 똑같은 모양의 레이어에 사진을 텍스처로 입혀요. 그래서 코·입술·광대 굴곡을 그대로 따라가요.
   UV 계산은 예전 원통 패치와 똑같은 기준(thetaCenter/thetaWidth/yTop/yBottom/radius)을 써서,
   정면에서 봤을 때 위치는 예전이랑 똑같이 맞아요. */
let faceBaseMeshes = [];           // glb에서 불러온 원본 얼굴 메시들 (소품/패치 제외)
const faceMeshDataCache = new Map(); // mesh → { pos, index } (faceModel 좌표계 기준)

function getFaceMeshData(mesh){
  if(faceMeshDataCache.has(mesh)) return faceMeshDataCache.get(mesh);
  faceModel.updateMatrixWorld(true);
  const rel = new THREE.Matrix4().copy(faceModel.matrixWorld).invert().multiply(mesh.matrixWorld);
  const geo = mesh.geometry;
  const P = geo.attributes.position;
  const pos = new Float32Array(P.count * 3);
  const v = new THREE.Vector3();
  for(let i = 0; i < P.count; i++){
    v.fromBufferAttribute(P, i).applyMatrix4(rel); // 양자화(normalized int16)된 좌표도 여기서 풀려요
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
  }
  let index;
  if(geo.index){ index = geo.index.array; }
  else { index = new Uint32Array(P.count); for(let i = 0; i < P.count; i++) index[i] = i; }
  const data = { pos, index };
  faceMeshDataCache.set(mesh, data);
  return data;
}

function createProjectedLayers({ cutoutCanvas, thetaCenter, thetaWidth, yTop, yBottom, radius, layerIndex = 0 }){
  const texture = new THREE.CanvasTexture(cutoutCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

  const cosC = Math.cos(thetaCenter), sinC = Math.sin(thetaCenter);
  const half = thetaWidth / 2;
  const height = yTop - yBottom;
  // 사진 찍은 방향에서 "보이는" 정점에만 입혀요 (뒤통수·코 밑 가려진 곳 제외).
  // 이 glb는 법선/면 방향이 뒤죽박죽이라 법선 대신, 사진 방향으로 본 깊이 지도(z-buffer)로 판단해요.
  const GRID = 160;
  const DEPTH_EPS = 0.04;
  const layers = [];

  faceBaseMeshes.forEach(mesh => {
    const { pos, index } = getFaceMeshData(mesh);
    const count = pos.length / 3;
    const uv = new Float32Array(count * 2);
    const inside = new Uint8Array(count);

    for(let i = 0; i < count; i++){
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      // 사진을 찍은 방향에서 봤을 때의 가로 위치 → 예전 원통 패치와 같은 각도로 바꿔서 u를 구해요.
      const t = (x * cosC - z * sinC) / radius;
      if(t <= -1 || t >= 1) continue;
      const u = (Math.asin(t) + half) / thetaWidth;
      const vv = (y - yBottom) / height;
      if(u < 0 || u > 1 || vv < 0 || vv > 1) continue;
      uv[i * 2] = u; uv[i * 2 + 1] = vv;
      inside[i] = 1;
    }

    // 1) 칸마다 사진 방향으로 가장 앞에 있는 깊이를 기록해요.
    const cellOf = new Int32Array(count).fill(-1);
    const depthOf = new Float32Array(count);
    const maxDepth = new Float32Array(GRID * GRID).fill(-Infinity);
    for(let i = 0; i < count; i++){
      if(!inside[i]) continue;
      const cx = Math.min(GRID - 1, Math.floor(uv[i * 2] * GRID));
      const cy = Math.min(GRID - 1, Math.floor(uv[i * 2 + 1] * GRID));
      const cell = cy * GRID + cx;
      const d = pos[i * 3] * sinC + pos[i * 3 + 2] * cosC;
      cellOf[i] = cell; depthOf[i] = d;
      if(d > maxDepth[cell]) maxDepth[cell] = d;
    }
    // 2) 옆 칸까지 같이 봐서(3x3), 정점이 듬성한 칸에서 뒤쪽 면이 새어 나오지 않게 해요.
    const nearMax = new Float32Array(GRID * GRID).fill(-Infinity);
    for(let cy = 0; cy < GRID; cy++){
      for(let cx = 0; cx < GRID; cx++){
        let m = -Infinity;
        for(let oy = -1; oy <= 1; oy++){
          const yy = cy + oy; if(yy < 0 || yy >= GRID) continue;
          for(let ox = -1; ox <= 1; ox++){
            const xx = cx + ox; if(xx < 0 || xx >= GRID) continue;
            const d = maxDepth[yy * GRID + xx]; if(d > m) m = d;
          }
        }
        nearMax[cy * GRID + cx] = m;
      }
    }
    for(let i = 0; i < count; i++){
      if(inside[i] && depthOf[i] < nearMax[cellOf[i]] - DEPTH_EPS) inside[i] = 0;
    }

    const kept = [];
    for(let f = 0; f < index.length; f += 3){
      const a = index[f], b = index[f + 1], c = index[f + 2];
      if(inside[a] && inside[b] && inside[c]) kept.push(a, b, c);
    }
    if(!kept.length) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', mesh.geometry.attributes.position);
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(kept), 1));

    // 사진에 이미 실제 조명(음영)이 들어있어서, 조명 계산 없이 사진 색 그대로 보여줘요.
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide, // 이 glb는 면 방향이 섞여 있어서 양면으로 그려야 구멍이 안 나요.
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -(layerIndex + 1) * 2, // 레이어끼리 겹쳐도 깜빡이지 않게 조금씩 앞으로
    });
    const layer = new THREE.Mesh(geo, mat);
    layer.name = 'projectedPhotoLayer';
    layer.renderOrder = layerIndex + 1;
    mesh.add(layer); // 원본 메시의 자식이라 위치·회전·크기를 그대로 따라가요.
    layers.push(layer);
  });

  if(!layers.length) texture.dispose();
  return layers;
}

function disposeProjectedLayer(layer){
  if(layer.parent) layer.parent.remove(layer);
  // position은 원본 얼굴 메시와 공유 중이라, 원본 GPU 버퍼가 같이 지워지지 않게 먼저 떼어내요.
  layer.geometry.deleteAttribute('position');
  layer.geometry.dispose();
  if(layer.material.map) layer.material.map.dispose();
  layer.material.dispose();
}

// 정수리 캡을 특정 색으로 추가/교체해요.
function applyHairCrown(hex){
  const card = document.getElementById('makeup-prop-card-hair');
  if(!card) return;
  const colorInput = card.querySelector('.makeup-prop-color');
  colorInput.value = hex;
  if(activeProps['hair']){
    faceModel.remove(activeProps['hair'].object3d);
    delete activeProps['hair'];
  }
  toggleProp('hair');
}

/* ==========================================================================
   STEP 2 : 3D 얼굴 뷰어 — 사진 속 얼굴/머리카락을 AI로 오려서 앞면에 입혀요.
   ========================================================================== */
const loadingEl = document.getElementById('landing-makeup-loading');
const hintEl = document.getElementById('landing-makeup-hint');

let scene, camera, renderer, controls;
let faceModel = null;
let faceDefaultHeight = 0;
let viewerStarted = false;

function initViewer(){
  const container = document.getElementById('landing-makeup-3d');
  if(!container){
    if(loadingEl) loadingEl.textContent = '3D 뷰어를 불러올 수 없어요.';
    return;
  }
  const width = container.clientWidth || 300;
  const height = container.clientHeight || 420;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0, 2.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 1.3));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
  dirLight.position.set(2, 4, 3);
  scene.add(dirLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 0.3;
  controls.maxDistance = 10;
  controls.target.set(0, 0, 0);

  const loader = new GLTFLoader();
  loader.load(
    '/models/makeup-face.glb',
    gltf => {
      faceModel = gltf.scene;
      faceBaseMeshes = [];
      faceModel.traverse(o => { if(o.isMesh) faceBaseMeshes.push(o); });
      scene.add(faceModel);

      const box0 = new THREE.Box3().setFromObject(faceModel);
      faceDefaultHeight = box0.max.y - box0.min.y;
      const center = box0.getCenter(new THREE.Vector3());
      faceModel.position.sub(center);

      // .scan-avatar-loading은 CSS에서 display:flex라 hidden만으로는 안 사라져요 → 직접 숨겨요.
      if(loadingEl){ loadingEl.hidden = true; loadingEl.style.display = 'none'; }
      if(hintEl) hintEl.hidden = false;

      if(pendingPhotosApply){
        applyPhotosToScene(pendingPhotosApply);
        pendingPhotosApply = null;
      }
      renderMakeupPropsPanel();
    },
    undefined,
    err => {
      console.error('메이크업 얼굴 모델 로드 실패:', err);
      if(loadingEl) loadingEl.textContent = '3D 얼굴 모델을 아직 못 찾았어요. /models/makeup-face.glb 파일을 올려주세요.';
    }
  );

  (function renderLoop(){
    requestAnimationFrame(renderLoop);
    if(controls) controls.update();
    if(renderer && scene && camera) renderer.render(scene, camera);
  })();

  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    if(!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

function startOrUpdateViewer(){
  if(!viewerStarted){
    viewerStarted = true;
    initViewer();
    loadMakeupWardrobe();
  }
  // 얼굴/머리카락 반영은 applyHairFromPhotoAI()가 별도로 처리해요 (AI 인식 결과를 기다려야 해서).
}

/* ==========================================================================
   메이크업 소품(코드로 만든 오브젝트)으로 꾸미기 — makeup-props.js
   ========================================================================== */
const propsGridEl = document.getElementById('makeup-props-grid');
const activeProps = {}; // { propId: { object3d } }

function propCardHTML(def){
  return `
    <div class="makeup-prop-card" id="makeup-prop-card-${def.id}">
      <div class="makeup-prop-card-head">
        <span class="makeup-prop-card-label">${def.label}</span>
        <input type="color" class="makeup-prop-color" data-prop-id="${def.id}" value="${def.defaultColor}">
      </div>
      <button type="button" class="btn btn-ghost-dark makeup-prop-toggle-btn" data-prop-id="${def.id}">추가하기</button>
      ${def.id === 'hair' ? '' : `<div class="makeup-prop-fine-tune" data-prop-id="${def.id}" hidden>
        <label>좌우 <input type="range" class="prop-x" data-prop-id="${def.id}" min="-0.25" max="0.25" step="0.005" value="0"></label>
        <label>위아래 <input type="range" class="prop-y" data-prop-id="${def.id}" min="-0.25" max="0.25" step="0.005" value="0"></label>
        <label>앞뒤 <input type="range" class="prop-z" data-prop-id="${def.id}" min="-0.15" max="0.15" step="0.005" value="0"></label>
        <label>크기 <input type="range" class="prop-scale" data-prop-id="${def.id}" min="0.3" max="2.5" step="0.01" value="1"></label>
      </div>`}
    </div>`;
}

function renderMakeupPropsPanel(){
  if(!propsGridEl) return;
  propsGridEl.innerHTML = MAKEUP_PROP_DEFS.map(propCardHTML).join('');

  propsGridEl.querySelectorAll('.makeup-prop-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleProp(btn.dataset.propId));
  });
  propsGridEl.querySelectorAll('.makeup-prop-color').forEach(input => {
    input.addEventListener('input', () => {
      const active = activeProps[input.dataset.propId];
      if(active) recolorProp(active.object3d, input.value);
    });
  });
  propsGridEl.querySelectorAll('.prop-x, .prop-y, .prop-z, .prop-scale').forEach(input => {
    input.addEventListener('input', () => updatePropTransform(input.dataset.propId));
  });
}

function updatePropTransform(propId){
  const active = activeProps[propId];
  if(!active) return;
  const def = MAKEUP_PROP_DEFS.find(d => d.id === propId);
  const card = document.getElementById(`makeup-prop-card-${propId}`);
  if(!card.querySelector('.prop-x')) return; // 머리카락처럼 조정 슬라이더가 없는 소품
  const dx = parseFloat(card.querySelector('.prop-x').value);
  const dy = parseFloat(card.querySelector('.prop-y').value);
  const dz = parseFloat(card.querySelector('.prop-z').value);
  const s = parseFloat(card.querySelector('.prop-scale').value);
  active.object3d.position.set(def.position[0] + dx, def.position[1] + dy, def.position[2] + dz);
  active.object3d.scale.set(s, s, s);
}

function toggleProp(propId){
  const def = MAKEUP_PROP_DEFS.find(d => d.id === propId);
  const card = document.getElementById(`makeup-prop-card-${propId}`);
  const toggleBtn = card.querySelector('.makeup-prop-toggle-btn');
  const fineTune = card.querySelector('.makeup-prop-fine-tune');
  const colorInput = card.querySelector('.makeup-prop-color');

  if(activeProps[propId]){
    // 이미 추가돼 있으면 빼요.
    faceModel.remove(activeProps[propId].object3d);
    delete activeProps[propId];
    toggleBtn.textContent = '추가하기';
    if(fineTune) fineTune.hidden = true;
    return;
  }
  if(!faceModel){
    alert('얼굴 모델을 아직 불러오는 중이에요. 잠시만 기다려주세요.');
    return;
  }
  // 정수리 캡(머리카락)은 이제 사진으로 오려낸 밴드 패치들이 옆/뒤를 덮어주기 때문에,
  // 작은 단색 캡만 만들면 돼요 (색은 정면 사진에서 자동으로 뽑혀서 colorInput에 이미 들어있어요).
  const object3d = def.create(colorInput.value);
  object3d.position.set(def.position[0], def.position[1], def.position[2]);
  faceModel.add(object3d);
  activeProps[propId] = { object3d };
  toggleBtn.textContent = '빼기';
  if(fineTune) fineTune.hidden = false;
}

/* ==========================================================================
   업로드된 메이크업 아이템(.glb) 입혀보기 — 소품과는 별개로, 옷장에 올라온 아이템이에요.
   ========================================================================== */
let currentItem = null;
const fitControls = document.getElementById('landing-makeup-fit-controls');
const statusEl = document.getElementById('landing-makeup-status');
const xInput = document.getElementById('landing-makeup-x');
const yInput = document.getElementById('landing-makeup-y');
const zInput = document.getElementById('landing-makeup-z');
const scaleInput = document.getElementById('landing-makeup-scale');
const colorInput = document.getElementById('landing-makeup-color');
const colorResetBtn = document.getElementById('landing-makeup-color-reset-btn');
const removeBtn = document.getElementById('landing-makeup-remove-btn');

function updateItemTransform(){
  if(!currentItem) return;
  currentItem.position.set(parseFloat(xInput.value), parseFloat(yInput.value), parseFloat(zInput.value));
  const s = parseFloat(scaleInput.value);
  currentItem.scale.set(s, s, s);
}

function applyItemColor(hexColor){
  if(!currentItem) return;
  currentItem.traverse(node => {
    if(node.isMesh && node.material){
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(mat => {
        if(mat.color){
          mat.color.set(hexColor);
          mat.needsUpdate = true;
        }
      });
    }
  });
}

function wearItemFromUrl(url, label){
  if(!faceModel){
    statusEl.textContent = '먼저 얼굴 모델이 다 불러와질 때까지 잠시 기다려주세요.';
    return;
  }
  statusEl.textContent = `${label || '메이크업'}을(를) 불러오는 중...`;
  const loader = new GLTFLoader();
  loader.load(
    url,
    gltf => {
      if(currentItem) faceModel.remove(currentItem);
      currentItem = gltf.scene;
      currentItem.scale.set(1, 1, 1);
      currentItem.position.set(0, 0, 0);
      faceModel.add(currentItem);

      const itemBox = new THREE.Box3().setFromObject(currentItem);
      const itemHeight = itemBox.max.y - itemBox.min.y;
      let autoScale = 1;
      if(itemHeight > 0 && faceDefaultHeight > 0){
        autoScale = faceDefaultHeight / itemHeight;
        autoScale = Math.min(Math.max(autoScale, 0.02), 5);
      }

      xInput.value = 0;
      yInput.value = 0;
      zInput.value = 0;
      scaleInput.value = autoScale.toFixed(2);
      colorInput.value = '#ffffff';
      updateItemTransform();
      fitControls.hidden = false;
      statusEl.textContent = `${label || '메이크업'}을(를) 적용했어요! 크기·위치·색상을 슬라이더로 맞춰보세요.`;
      fitControls.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    undefined,
    () => {
      statusEl.textContent = '메이크업 파일을 불러오지 못했어요. .glb 파일이 맞는지 확인해주세요.';
    }
  );
}

if(xInput && yInput && zInput && scaleInput){
  [xInput, yInput, zInput, scaleInput].forEach(el => el.addEventListener('input', updateItemTransform));
}
if(colorInput){
  colorInput.addEventListener('input', () => applyItemColor(colorInput.value));
}
if(colorResetBtn){
  colorResetBtn.addEventListener('click', () => {
    colorInput.value = '#ffffff';
    applyItemColor('#ffffff');
  });
}
if(removeBtn){
  removeBtn.addEventListener('click', () => {
    if(currentItem){
      faceModel.remove(currentItem);
      currentItem = null;
    }
    fitControls.hidden = true;
    statusEl.textContent = '';
  });
}

const resultsEl = document.getElementById('landing-makeup-results');

function cardHTML(item){
  const thumb = item.thumbnailUrl
    ? `<img src="${item.thumbnailUrl}" alt="${item.name}">`
    : `<span>메이크업</span>`;
  const wearable = !!item.glbUrl;
  const officialBadge = item.isOfficial ? `<span class="wardrobe-official-badge">공식</span>` : '';
  return `
    <div class="wardrobe-card">
      <div class="wardrobe-card-thumb">${thumb}${officialBadge}</div>
      <div class="wardrobe-card-name">${item.name}</div>
      <div class="wardrobe-card-meta">메이크업${item.color ? ' · ' + item.color : ''}</div>
      <button type="button" data-item-id="${item.id}" ${wearable ? '' : 'disabled'}>
        ${wearable ? '입혀보기' : '3D 모델 준비 중'}
      </button>
    </div>`;
}

function wireWearButtons(items){
  resultsEl.querySelectorAll('button[data-item-id]').forEach(btn => {
    const item = items.find(it => it.id === btn.dataset.itemId);
    if(!item || !item.glbUrl) return;
    btn.addEventListener('click', () => wearItemFromUrl(item.glbUrl, item.name));
  });
}

let wardrobeLoaded = false;
async function loadMakeupWardrobe(){
  wardrobeLoaded = true;
  resultsEl.innerHTML = '<p class="wardrobe-hint">불러오는 중...</p>';
  try{
    const res = await fetch('/api/wardrobe?category=makeup');
    const data = await res.json();
    if(!data.items || data.items.length === 0){
      resultsEl.innerHTML = '<p class="wardrobe-hint">아직 등록된 메이크업 아이템이 없어요. 3D 디자인 팝업의 "내 아이템 올리기"에서 첫 메이크업을 올려보세요.</p>';
      return;
    }
    resultsEl.innerHTML = data.items.map(it => cardHTML(it)).join('');
    wireWearButtons(data.items);
  } catch(err){
    resultsEl.innerHTML = '<p class="wardrobe-hint">메이크업 아이템을 불러오지 못했어요.</p>';
  }
}

// 3D 디자인 팝업에서 새 메이크업 아이템을 올렸을 때, 이 구역의 목록도 새로고침할 수 있게 열어둬요.
window.refreshMakeupWardrobe = function(){
  wardrobeLoaded = false;
  if(viewerStarted) loadMakeupWardrobe();
};

// 팝업(메이크업 모달)을 닫을 때 index.html이 호출해요: 켜져 있던 카메라를 끄고 버튼 상태를 원래대로 돌려요.
window.stopMakeupCamera = function(){
  stopScanStream();
  scanVideo.srcObject = null;
  if(!scanStepEl.hidden) renderStageUI();
};
