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
   category: 위쪽 줄(상의/하의/모자/신발/양말) 분류. 같은 분류 안에서 모양(모델)을 골라요.
   kind: 부위를 나누는 방식 (아래 KINDS 참고).
   sleeveX: 옷 가로 반폭 대비 이 비율보다 바깥이면 "팔(소매)" (실제 모델을 분석해서 맞춘 값)
   shoulderY / waistY: 옷 높이 대비 이 비율보다 위면 "어깨" / "허리"
   glbWidthMul: 모델 자체가 옆으로 넓게 생성된 경우 가로(X)만 따로 줄이는 보정값(기본 1).
   ── 모자·신발·양말 전용 ──
   rotate: 불러온 모델을 앞(+Z)·위(+Y) 방향에 맞춰 돌리는 각도(도). { x, y }
   mirrorPair: 한 짝만 있는 신발 모델이면, 좌우 반전 복사본을 만들어 한 켤레로 만들어요(값 = 두 짝 사이 간격).
   displaySize: 마네킹 기준 크기 대신, 뷰어에서 가장 긴 변이 이 길이가 되도록 크게 보여줘요.
   lengthAxis: "길이 배율"이 늘리는 축(기본 y). 신발은 앞뒤 길이(z)를 늘려요.
   lazy: 처음 열 때 미리 불러오지 않고, 그 종류를 골랐을 때 불러와요(용량 절약). */
const CATEGORIES = [
  ['top', '상의'], ['bottom', '하의'], ['hat', '모자'], ['shoes', '신발'], ['socks', '양말'],
];
const GARMENT_TYPES = {
  shortSleeve: { category: 'top', label: '반팔 티셔츠', kind: 'top', glbHeightFrac: 0.42, sleeveX: 0.6, shoulderY: 0.88,
    glb: '/wardrobe-assets/Meshy_AI_Classic_White_T_Shirt_0913135306_generate.glb' },
  longSleeve: { category: 'top', label: '긴팔 티셔츠', kind: 'top', glbHeightFrac: 0.42, sleeveX: 0.6, shoulderY: 0.88,
    glb: '/wardrobe-assets/Meshy_AI_Gray_Henley_Long_Slee_0925142723_generate.glb' },
  shortPants: { category: 'bottom', label: '반바지', kind: 'bottom', glbHeightFrac: 0.22, waistY: 0.88,
    glb: '/wardrobe-assets/Meshy_AI_White_Shorts_0913135257_generate.glb' },
  longPants: { category: 'bottom', label: '긴바지', kind: 'bottom', glbHeightFrac: 0.54, glbWidthMul: 0.8, waistY: 0.9,
    glb: '/wardrobe-assets/Meshy_AI_Cream_Linen_Drawstrin_0925142806_generate.glb' },

  capBall: { category: 'hat', label: '볼캡', kind: 'hat', displaySize: 0.85, lazy: true,
    brimZ: 0.5, brimZFar: 0.82, brimY: 0.4, brimNormal: 0.5,
    glb: '/wardrobe-assets/Meshy_AI_Blue_Denim_Baseball_C_0928035117_generate.glb' },

  shoeClassic: { category: 'shoes', label: '클래식 스니커즈', kind: 'shoes', displaySize: 0.9, lazy: true,
    rotate: { y: 90 }, mirrorPair: 0.12, lengthAxis: 'z', soleY: 0.25, toeZ: 0.78, heelZ: 0.2,
    glb: '/wardrobe-assets/Meshy_AI_Adidas_White_Sneaker_0928035205_generate.glb' },
  shoeCanvas: { category: 'shoes', label: '캔버스 스니커즈', kind: 'shoes', displaySize: 0.9, lazy: true,
    lengthAxis: 'z', soleY: 0.25, toeZ: 0.78, heelZ: 0.2,
    glb: '/wardrobe-assets/Meshy_AI_Black_Vans_Sneakers_0928035238_generate.glb' },
  shoeRunning: { category: 'shoes', label: '러닝 스니커즈', kind: 'shoes', displaySize: 0.9, lazy: true,
    lengthAxis: 'z', soleY: 0.27, toeZ: 0.78, heelZ: 0.2,
    glb: '/wardrobe-assets/Meshy_AI_Cream_Skechers_Sneake_0928035311_generate.glb' },

  sockCrew: { category: 'socks', label: '골지 크루삭스', kind: 'socks', displaySize: 0.85, lazy: true,
    cuffY: 0.9, legY: 0.4, toeFrac: 0.7,
    glb: '/wardrobe-assets/Meshy_AI_White_Ribbed_Socks_0928035340_generate.glb' },
  sockAnkle3: { category: 'socks', label: '발목양말 3켤레', kind: 'socks3', displaySize: 0.9, lazy: true,
    rotate: { x: 90 }, cuffY: 0.82, toeY: 0.22,
    glb: '/wardrobe-assets/Meshy_AI_Three_Ankle_Socks_on__0928035404_generate.glb' },
};

/* 부위 나누는 방식 — 행(rows) × 열(cols) 격자로 보여줘요. 부위 키는 `${행}_${열}` 이에요.
   열의 mirror는 "좌우 대칭으로 칠하기"를 켰을 때 같이 칠해지는 짝이에요.
   좌우는 입는 사람 기준이에요(정면에서 보면 화면 오른쪽이 입는 사람의 왼쪽, +X = 왼쪽). */
const COLS_4 = [
  { key: 'LF', head: '왼쪽<br>앞', pre: '왼쪽', post: '앞', mirror: 'RF' },
  { key: 'LB', head: '왼쪽<br>뒤', pre: '왼쪽', post: '뒤', mirror: 'RB' },
  { key: 'RF', head: '오른쪽<br>앞', pre: '오른쪽', post: '앞', mirror: 'LF' },
  { key: 'RB', head: '오른쪽<br>뒤', pre: '오른쪽', post: '뒤', mirror: 'LB' },
];
const COLS_LR = [
  { key: 'L', head: '왼쪽', pre: '왼쪽', mirror: 'R' },
  { key: 'R', head: '오른쪽', pre: '오른쪽', mirror: 'L' },
];
const COLS_FOOT = [
  { key: 'L', head: '왼발', pre: '왼발', mirror: 'R' },
  { key: 'R', head: '오른발', pre: '오른발', mirror: 'L' },
];
// 3켤레 세트는 정면에서 봤을 때 왼쪽부터 1·2·3번이에요.
const COLS_3 = [
  { key: 'S1', head: '1번', pre: '1번 양말', mirror: 'S3' },
  { key: 'S2', head: '2번', pre: '2번 양말', mirror: 'S2' },
  { key: 'S3', head: '3번', pre: '3번 양말', mirror: 'S1' },
];
const KINDS = {
  top: { rows: [['shoulder', '어깨'], ['sleeve', '팔(소매)'], ['body', '몸판']], cols: COLS_4 },
  bottom: { rows: [['waist', '허리'], ['leg', '다리']], cols: COLS_4 },
  hat: { rows: [['front', '앞판'], ['back', '뒤판'], ['brim', '챙']], cols: COLS_LR },
  shoes: { rows: [['upper', '갑피'], ['toe', '앞코'], ['heel', '뒤꿈치'], ['sole', '밑창']], cols: COLS_FOOT },
  socks: { rows: [['cuff', '밴드'], ['leg', '목'], ['foot', '발'], ['toe', '발끝']], cols: COLS_FOOT },
  socks3: { rows: [['cuff', '밴드'], ['foot', '발'], ['toe', '발끝']], cols: COLS_3 },
};
// 분류마다 치수 입력칸 이름이 달라요.
const SIZE_LABELS = {
  top: ['기장 배율', '둘레 배율'], bottom: ['기장 배율', '둘레 배율'],
  hat: ['높이 배율', '둘레 배율'], shoes: ['길이 배율', '볼·높이 배율'], socks: ['길이 배율', '둘레 배율'],
};
// 분류를 바꿀 때 카메라가 처음 바라볼 방향(보기 좋은 각도).
const CATEGORY_VIEW = {
  top: new THREE.Vector3(0, 0.15, 1), bottom: new THREE.Vector3(0, 0.15, 1),
  hat: new THREE.Vector3(0.55, 0.3, 1), shoes: new THREE.Vector3(0.75, 0.7, 1), socks: new THREE.Vector3(0.3, 0.15, 1),
};

function regionKeysFor(kind){
  const k = KINDS[kind];
  return k.rows.flatMap(([row]) => k.cols.map(c => `${row}_${c.key}`));
}
function regionLabel(kind, key){
  const [row, col] = key.split('_');
  const k = KINDS[kind];
  const rowLabel = k.rows.find(r => r[0] === row)?.[1] || row;
  const c = k.cols.find(x => x.key === col);
  return c ? [c.pre, rowLabel, c.post].filter(Boolean).join(' ') : rowLabel;
}
function mirrorRegionKey(key, kind){
  const [row, col] = key.split('_');
  const c = KINDS[kind].cols.find(x => x.key === col);
  return `${row}_${c ? c.mirror : col}`;
}
// 대칭 칠하기 대상 목록 (자기 자신과 짝이 같으면 한 번만)
function mirrorTargets(key, kind, withMirror){
  const targets = [key];
  if(withMirror && state.mirror){
    const m = mirrorRegionKey(key, kind);
    if(m !== key) targets.push(m);
  }
  return targets;
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

/* 칠하기 재질 — 정점 속성 두 개로 "부분 지우기"를 지원해요.
   fillMask(0~1): 부위 채우기(원단/색)가 보이는 정도. 지우개로 문지르면 0이 되어 기본 옷감색이 드러나요.
   paint(RGBA): 브러시 자국. a = 0이면 안 보이고, 1이면 브러시 색으로 완전히 덮어요. */
const BASE_LINEAR = new THREE.Color(BASE_HEX);
function makePaintableMaterial(){
  const mat = new THREE.MeshStandardMaterial({ color: BASE_HEX, roughness: 0.85, side: THREE.DoubleSide });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uBaseColor = { value: BASE_LINEAR };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 paint;\nattribute float fillMask;\nvarying vec4 vPaint;\nvarying float vFillMask;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaint = paint;\nvFillMask = fillMask;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uBaseColor;\nvarying vec4 vPaint;\nvarying float vFillMask;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(uBaseColor, diffuseColor.rgb, clamp(vFillMask, 0.0, 1.0));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vPaint.rgb, clamp(vPaint.a, 0.0, 1.0));');
  };
  mat.customProgramCacheKey = () => 'unexposed-paintable-v2';
  return mat;
}

/* ---------- GLB 불러오기 + 부위 나누기 (타입별로 한 번만) ---------- */
function findFirstMesh(root){
  let found = null;
  root.traverse(node => { if(!found && node.isMesh && node.geometry) found = node; });
  return found;
}

// 모델 좌표를 복사해서 방향 맞추기(rotate)·한 짝 → 한 켤레(mirrorPair)를 적용해요.
function transformSource(geometry, def){
  const src = geometry.attributes.position;
  const count0 = src.count;
  let pos = new Float32Array(count0 * 3);
  for(let i = 0; i < count0; i++){ pos[i*3] = src.getX(i); pos[i*3+1] = src.getY(i); pos[i*3+2] = src.getZ(i); }
  let index;
  if(geometry.index){
    index = new Uint32Array(geometry.index.count);
    for(let i = 0; i < index.length; i++) index[i] = geometry.index.getX(i);
  } else {
    index = new Uint32Array(count0);
    for(let i = 0; i < count0; i++) index[i] = i;
  }

  const rot = def.rotate || {};
  if(rot.y){ // Y축 회전: x' = x·cos + z·sin, z' = -x·sin + z·cos
    const t = rot.y * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    for(let i = 0; i < count0; i++){
      const x = pos[i*3], z = pos[i*3+2];
      pos[i*3] = x * c + z * s; pos[i*3+2] = -x * s + z * c;
    }
  }
  if(rot.x){ // X축 회전: y' = y·cos - z·sin, z' = y·sin + z·cos
    const t = rot.x * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    for(let i = 0; i < count0; i++){
      const y = pos[i*3+1], z = pos[i*3+2];
      pos[i*3+1] = y * c - z * s; pos[i*3+2] = y * s + z * c;
    }
  }

  if(def.mirrorPair){
    let minX = Infinity, maxX = -Infinity;
    for(let i = 0; i < count0; i++){ const x = pos[i*3]; if(x < minX) minX = x; if(x > maxX) maxX = x; }
    const cx = (minX + maxX) / 2, shift = (maxX - minX) / 2 + def.mirrorPair / 2;
    const out = new Float32Array(count0 * 6);
    for(let i = 0; i < count0; i++){
      const x = pos[i*3] - cx, y = pos[i*3+1], z = pos[i*3+2];
      out[i*3] = x - shift; out[i*3+1] = y; out[i*3+2] = z;                          // 원본 = 오른발(-X)
      const j = (count0 + i) * 3;
      out[j] = -x + shift; out[j+1] = y; out[j+2] = z;                               // 반전 복사 = 왼발(+X)
    }
    const idx = new Uint32Array(index.length * 2);
    idx.set(index);
    for(let t = 0; t < index.length; t += 3){ // 반전하면 면 방향이 뒤집히니 꼭짓점 순서를 바꿔요.
      idx[index.length + t] = index[t] + count0;
      idx[index.length + t + 1] = index[t + 2] + count0;
      idx[index.length + t + 2] = index[t + 1] + count0;
    }
    pos = out; index = idx;
  }
  return { pos, index, count: pos.length / 3 };
}

// 서로 이어지지 않은 덩어리(신발 두 짝, 양말 세 켤레 등)를 찾아 X 순서로 번호를 매겨요.
// 반환: triPiece(삼각형별 덩어리 번호), pieces[{minX..maxZ, cx}] (큰 덩어리만, 왼쪽(-X)부터)
function findPieces(pos, index, count){
  const parent = new Int32Array(count);
  for(let i = 0; i < count; i++) parent[i] = i;
  const find = a => { while(parent[a] !== a){ parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const unite = (a, b) => { a = find(a); b = find(b); if(a !== b) parent[a] = b; };
  for(let t = 0; t < index.length; t += 3){ unite(index[t], index[t+1]); unite(index[t], index[t+2]); }

  const triCount = index.length / 3;
  const triRoot = new Int32Array(triCount);
  const stats = new Map(); // root -> { n, sx }
  for(let t = 0; t < triCount; t++){
    const a = index[t*3], r = find(a);
    triRoot[t] = r;
    const x = (pos[a*3] + pos[index[t*3+1]*3] + pos[index[t*3+2]*3]) / 3;
    let st = stats.get(r);
    if(!st){ st = { n: 0, sx: 0 }; stats.set(r, st); }
    st.n++; st.sx += x;
  }
  const big = [...stats.entries()].filter(([, st]) => st.n > triCount * 0.05)
    .map(([root, st]) => ({ root, cx: st.sx / st.n }))
    .sort((p, q) => p.cx - q.cx);
  if(!big.length){
    const all = [...stats.entries()].sort((p, q) => q[1].n - p[1].n)[0];
    big.push({ root: all[0], cx: all[1].sx / all[1].n });
  }
  const rootToPiece = new Map(big.map((b, i) => [b.root, i]));
  const pieces = big.map(b => ({ cx: b.cx, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity }));
  const triPiece = new Int32Array(triCount);
  for(let t = 0; t < triCount; t++){
    let p = rootToPiece.get(triRoot[t]);
    if(p === undefined){ // 작은 조각은 X가 가장 가까운 큰 덩어리에 붙여요.
      const x = pos[index[t*3]*3];
      let best = 0, bd = Infinity;
      pieces.forEach((pc, i) => { const d = Math.abs(pc.cx - x); if(d < bd){ bd = d; best = i; } });
      p = best;
    }
    triPiece[t] = p;
    const pc = pieces[p];
    for(let k = 0; k < 3; k++){
      const v = index[t*3+k];
      const x = pos[v*3], y = pos[v*3+1], z = pos[v*3+2];
      if(x < pc.minX) pc.minX = x; if(x > pc.maxX) pc.maxX = x;
      if(y < pc.minY) pc.minY = y; if(y > pc.maxY) pc.maxY = y;
      if(z < pc.minZ) pc.minZ = z; if(z > pc.maxZ) pc.maxZ = z;
    }
  }
  return { triPiece, pieces };
}

// 삼각형 하나하나를 부위(`${행}_${열}`)로 분류해요.
function classifyTriangles(def, pos, index, box){
  const kind = def.kind;
  const triCount = index.length / 3;
  const out = new Array(triCount);
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  const halfW = (box.max.x - box.min.x) / 2 || 1;
  const minY = box.min.y, h = (box.max.y - box.min.y) || 1;
  const minZ = box.min.z, depth = (box.max.z - box.min.z) || 1;
  const centroid = (t, axis) => (pos[index[t*3]*3+axis] + pos[index[t*3+1]*3+axis] + pos[index[t*3+2]*3+axis]) / 3;

  if(kind === 'top' || kind === 'bottom'){
    for(let t = 0; t < triCount; t++){
      const x = centroid(t, 0), y = centroid(t, 1), z = centroid(t, 2);
      const nx = (x - cx) / halfW, ny = (y - minY) / h;
      let row;
      if(kind === 'top') row = Math.abs(nx) > def.sleeveX ? 'sleeve' : (ny > def.shoulderY ? 'shoulder' : 'body');
      else row = ny > def.waistY ? 'waist' : 'leg';
      out[t] = `${row}_${(x >= cx ? 'L' : 'R') + (z >= cz ? 'F' : 'B')}`;
    }
    return out;
  }

  if(kind === 'hat'){
    // 앞판/뒤판 경계 = 모자 윗부분(정수리 쪽) 정점들의 Z 평균 — 챙 때문에 박스 중심이 앞으로 쏠려서요.
    let sz = 0, sn = 0;
    for(let i = 0; i < pos.length / 3; i++){
      if((pos[i*3+1] - minY) / h > 0.6){ sz += pos[i*3+2]; sn++; }
    }
    const splitZ = sn ? sz / sn : cz;
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
    for(let t = 0; t < triCount; t++){
      const a = index[t*3], b = index[t*3+1], c = index[t*3+2];
      e1.set(pos[b*3] - pos[a*3], pos[b*3+1] - pos[a*3+1], pos[b*3+2] - pos[a*3+2]);
      e2.set(pos[c*3] - pos[a*3], pos[c*3+1] - pos[a*3+1], pos[c*3+2] - pos[a*3+2]);
      n.crossVectors(e1, e2).normalize();
      const x = centroid(t, 0), y = centroid(t, 1), z = centroid(t, 2);
      const ny = (y - minY) / h, nz = (z - minZ) / depth;
      // 챙: 아주 앞쪽이거나, 앞쪽 아래에 있으면서 위/아래를 향한 면(평평한 판)
      const brim = nz > def.brimZFar || (nz > def.brimZ && ny < def.brimY && Math.abs(n.y) > def.brimNormal);
      const row = brim ? 'brim' : (z >= splitZ ? 'front' : 'back');
      out[t] = `${row}_${x >= cx ? 'L' : 'R'}`;
    }
    return out;
  }

  // 신발·양말: 덩어리(짝)별로 나눈 뒤, 짝 안에서의 상대 위치로 부위를 정해요.
  const { triPiece, pieces } = findPieces(pos, index, pos.length / 3);
  const colOf = p => {
    if(kind === 'socks3') return (COLS_3[Math.min(p, 2)] || COLS_3[0]).key;
    return pieces[p].cx >= cx ? 'L' : 'R';
  };
  const pny = (t, pc) => (centroid(t, 1) - pc.minY) / ((pc.maxY - pc.minY) || 1);
  const pnz = (t, pc) => (centroid(t, 2) - pc.minZ) / ((pc.maxZ - pc.minZ) || 1);

  if(kind === 'socks'){
    // 발끝: 발 부분 중에서 다리 축(목 부분의 중심)에서 가장 멀리 나간 곳
    const axis = pieces.map(() => ({ x: 0, z: 0, n: 0, maxD: 0 }));
    for(let t = 0; t < triCount; t++){
      const pc = pieces[triPiece[t]], y = pny(t, pc);
      if(y > def.legY && y <= def.cuffY){ const a = axis[triPiece[t]]; a.x += centroid(t, 0); a.z += centroid(t, 2); a.n++; }
    }
    axis.forEach((a, i) => { if(a.n){ a.x /= a.n; a.z /= a.n; } else { a.x = pieces[i].cx; a.z = cz; } });
    const dist = new Float32Array(triCount);
    for(let t = 0; t < triCount; t++){
      const a = axis[triPiece[t]];
      const d = Math.hypot(centroid(t, 0) - a.x, centroid(t, 2) - a.z);
      dist[t] = d;
      if(pny(t, pieces[triPiece[t]]) <= def.legY && d > a.maxD) a.maxD = d;
    }
    for(let t = 0; t < triCount; t++){
      const p = triPiece[t], y = pny(t, pieces[p]);
      let row;
      if(y > def.cuffY) row = 'cuff';
      else if(y > def.legY) row = 'leg';
      else row = dist[t] > def.toeFrac * axis[p].maxD ? 'toe' : 'foot';
      out[t] = `${row}_${colOf(p)}`;
    }
    return out;
  }

  for(let t = 0; t < triCount; t++){
    const p = triPiece[t], pc = pieces[p];
    const y = pny(t, pc);
    let row;
    if(kind === 'shoes'){
      const z = pnz(t, pc);
      row = y < def.soleY ? 'sole' : (z > def.toeZ ? 'toe' : (z < def.heelZ ? 'heel' : 'upper'));
    } else { // socks3
      row = y > def.cuffY ? 'cuff' : (y < def.toeY ? 'toe' : 'foot');
    }
    out[t] = `${row}_${colOf(p)}`;
  }
  return out;
}

// cache: { geometry(position/normal/uv 포함), regionIndex: {key: Uint32Array}, count, cx, cz, sphere }
function prepareGarmentCache(typeKey, geometry){
  const def = GARMENT_TYPES[typeKey];
  const { pos: srcPos, index: srcIndex, count } = transformSource(geometry, def);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(srcPos, 3));
  geo.setIndex(new THREE.BufferAttribute(srcIndex, 1));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const pos = geo.attributes.position.array;
  const nor = geo.attributes.normal.array;
  const box = geo.boundingBox;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;

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

  // 삼각형마다 부위를 정해서 부위별 인덱스 목록으로 모아요.
  const keys = regionKeysFor(def.kind);
  const buckets = {};
  keys.forEach(k => { buckets[k] = []; });
  const index = geo.index.array;
  const triRegion = classifyTriangles(def, pos, index, box);
  for(let t = 0; t < triRegion.length; t++){
    const bucket = buckets[triRegion[t]];
    if(bucket) bucket.push(index[t*3], index[t*3+1], index[t*3+2]);
  }
  const regionIndex = {};
  keys.forEach(k => { regionIndex[k] = new Uint32Array(buckets[k]); });

  return { geometry: geo, regionIndex, count, cx, cz, sphere: geo.boundingSphere.clone() };
}

const GLB_CACHE = {};   // typeKey -> prepareGarmentCache() 결과
const GLB_FAILED = {};  // typeKey -> true (불러오기 실패)
const GLB_LOADING = {}; // typeKey -> Promise (불러오는 중)
const glbLoader = new GLTFLoader();

// 한 종류의 모델을 불러와요. 이미 불러왔거나 불러오는 중이면 그걸 그대로 써요.
function loadGarmentGLB(key){
  if(GLB_CACHE[key] || GLB_FAILED[key]) return Promise.resolve();
  if(GLB_LOADING[key]) return GLB_LOADING[key];
  const def = GARMENT_TYPES[key];
  GLB_LOADING[key] = new Promise(resolve => {
    glbLoader.load(def.glb, gltf => {
      try {
        const mesh = findFirstMesh(gltf.scene);
        if(mesh && mesh.geometry) GLB_CACHE[key] = prepareGarmentCache(key, mesh.geometry);
        else GLB_FAILED[key] = true;
      } catch(err){
        console.error('모델 준비 실패:', key, err);
        GLB_FAILED[key] = true;
      }
      delete GLB_LOADING[key];
      if(state.typeKey === key) rebuildGarment();
      resolve();
    }, undefined, () => {
      GLB_FAILED[key] = true;
      delete GLB_LOADING[key];
      if(state.typeKey === key) rebuildGarment();
      resolve(); // 실패해도 다른 항목 로딩은 계속 진행해요.
    });
  });
  return GLB_LOADING[key];
}

// 상의·하의는 미리 불러와 두고, 모자·신발·양말(lazy)은 골랐을 때 불러와요.
function preloadGarmentGLBs(){
  return Promise.all(Object.entries(GARMENT_TYPES).filter(([, def]) => !def.lazy).map(([key]) => loadGarmentGLB(key)));
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
  designByType: {},             // { typeKey: { regions: {key: {fabric, color}}, paint: Float32Array, fillMask: Float32Array } }
  garmentGroup: null,
  holder: null,                 // 실제 스케일이 걸린 그룹(브러시 좌표 변환 기준)
  parts: {},                    // regionKey -> Mesh
  paintAttr: null,
  fillAttr: null,
  paintGrid: null,
  lastTappedRegion: null,
  mannequin: null, mannequinHeight: 1.65,
};

function getDesign(typeKey){
  if(!state.designByType[typeKey]) state.designByType[typeKey] = { regions: {}, paint: null, fillMask: null };
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
  lengthLabel: document.getElementById('length-label'),
  girthLabel: document.getElementById('girth-label'),
  viewBtns: document.getElementById('view-btns'),
  regionHint: document.getElementById('region-hint'),
};

/* ---------- 모달 열기/닫기 ----------
   모달이 hidden인 동안은 컨테이너 크기가 0이라 renderer/camera를 그때 만들면 화면이 깨져요.
   그래서 실제로 모달이 열릴 때 딱 한 번만 초기화해요. */
const createModal = document.getElementById('create-modal');
const createModalCloseBtn = document.getElementById('create-modal-close');
let viewerStarted = false;

function openCreateModal(){
  createModal.hidden = false;
  if(typeof refreshSubscription === 'function') refreshSubscription();
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
  if(!VIEW_DIRS[name]) return;
  setViewDir(VIEW_DIRS[name], name);
}
// dir 방향에서 바라보도록 카메라를 부드럽게 옮겨요. name이 없으면 시점 버튼 강조를 꺼요.
function setViewDir(dir, name){
  if(!camera || !controls || !dir) return;
  const dist = camera.position.distanceTo(controls.target);
  const to = controls.target.clone().add(dir.clone().normalize().multiplyScalar(dist));
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
  state.fillAttr = null;
  state.paintGrid = null;
}

function rebuildGarment(){
  if(!state.mannequin) return;
  disposeGarment();
  const def = GARMENT_TYPES[state.typeKey];
  const cache = GLB_CACHE[state.typeKey];
  if(!cache){
    if(GLB_FAILED[state.typeKey]){
      if(el.loading){ el.loading.hidden = false; el.loading.textContent = '모델을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.'; }
    } else {
      loadGarmentGLB(state.typeKey); // 다 불러오면 알아서 rebuildGarment()가 다시 불려요.
      if(el.loading){ el.loading.hidden = false; el.loading.textContent = `${def.label} 모델을 불러오는 중...`; }
    }
    renderAllUI();
    return;
  }
  if(el.loading) el.loading.hidden = true;

  const design = getDesign(state.typeKey);
  if(!design.paint || design.paint.length !== cache.count * 4) design.paint = new Float32Array(cache.count * 4);
  const paintAttr = new THREE.BufferAttribute(design.paint, 4);
  state.paintAttr = paintAttr;
  if(!design.fillMask || design.fillMask.length !== cache.count) design.fillMask = new Float32Array(cache.count).fill(1);
  const fillAttr = new THREE.BufferAttribute(design.fillMask, 1);
  state.fillAttr = fillAttr;

  const box = cache.geometry.boundingBox;
  const rawH = (box.max.y - box.min.y) || 1;
  // 옷은 마네킹 키 기준 크기로, 모자·신발·양말은 뷰어에서 보기 좋은 크기(가장 긴 변 = displaySize)로 맞춰요.
  const rawMax = Math.max(box.max.x - box.min.x, rawH, box.max.z - box.min.z) || 1;
  const baseScale = def.displaySize ? def.displaySize / rawMax : (state.mannequinHeight * def.glbHeightFrac) / rawH;
  // "길이 배율"은 lengthAxis(기본 y) 한 축, "둘레 배율"은 나머지 두 축에 걸려요.
  const lengthAxis = def.lengthAxis || 'y';
  const sx = baseScale * (lengthAxis === 'x' ? state.lengthMul : state.girthMul) * (def.glbWidthMul || 1);
  const sy = baseScale * (lengthAxis === 'y' ? state.lengthMul : state.girthMul);
  const sz = baseScale * (lengthAxis === 'z' ? state.lengthMul : state.girthMul);

  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.set(sx, sy, sz);
  holder.position.y = -box.max.y * sy;
  group.add(holder);

  const parts = {};
  Object.entries(cache.regionIndex).forEach(([key, idx]) => {
    if(!idx.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', cache.geometry.attributes.position);
    g.setAttribute('normal', cache.geometry.attributes.normal);
    g.setAttribute('uv', cache.geometry.attributes.uv);
    g.setAttribute('paint', paintAttr);
    g.setAttribute('fillMask', fillAttr);
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
  const kind = GARMENT_TYPES[state.typeKey].kind;
  const targets = mirrorTargets(key, kind, withMirror);
  targets.forEach(k => {
    restoreFillMask(k); // 지우개로 지웠던 자리도 다시 채워요.
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
  const fabricName = fabric ? FABRICS.find(f => f.id === fabric).name : '단색';
  setStatus(`${targets.map(k => regionLabel(kind, k)).join(', ')} → ${fabricName}${state.activeColor ? ' · ' + state.activeColor : ''}`);
  renderRegionGrid();
}

// 지우개로 부위를 통째로 지워요 — 채운 원단/색 + 그 부위의 브러시 자국까지 모두.
function clearRegion(key, withMirror = true){
  const cache = GLB_CACHE[state.typeKey];
  const design = getDesign(state.typeKey);
  const kind = GARMENT_TYPES[state.typeKey].kind;
  const targets = mirrorTargets(key, kind, withMirror);
  targets.forEach(k => {
    delete design.regions[k];
    applyRegionLook(k, null);
    const idx = cache && cache.regionIndex[k];
    const paint = state.paintAttr && state.paintAttr.array;
    const mask = state.fillAttr && state.fillAttr.array;
    if(!idx || !paint || !mask) return;
    for(let j = 0; j < idx.length; j++){
      const i = idx[j];
      paint[i*4+3] = 0;
      mask[i] = 1;
      if(i < dirtyMin) dirtyMin = i;
      if(i > dirtyMax) dirtyMax = i;
    }
  });
  flushPaint();
  state.lastTappedRegion = key;
  setStatus(`${targets.map(k => regionLabel(kind, k)).join(', ')} → 지웠습니다`);
  renderRegionGrid();
}

// 부위에 속한 정점들의 fillMask를 1로 되돌려요(지우개로 지운 부분을 다시 채움).
function restoreFillMask(key){
  const cache = GLB_CACHE[state.typeKey];
  const mask = state.fillAttr && state.fillAttr.array;
  if(!cache || !mask) return;
  const idx = cache.regionIndex[key];
  if(!idx) return;
  for(let j = 0; j < idx.length; j++){
    const i = idx[j];
    mask[i] = 1;
    if(i < dirtyMin) dirtyMin = i;
    if(i > dirtyMax) dirtyMax = i;
  }
  flushPaint();
}

function fillAllRegions(){
  const kind = GARMENT_TYPES[state.typeKey].kind;
  regionKeysFor(kind).forEach(k => fillRegion(k, false));
  state.lastTappedRegion = null;
  setStatus(`${GARMENT_TYPES[state.typeKey].label} 전체를 채웠습니다.`);
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
  const mask = state.fillAttr.array;
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
        // 지우개: 브러시 자국과 부위 채우기(원단/색)를 함께 지워요.
        arr[i4+3] *= (1 - t);
        mask[i] *= (1 - t);
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
  const attr = state.paintAttr, fill = state.fillAttr;
  if(!attr || dirtyMax < 0) return;
  const count = dirtyMax - dirtyMin + 1;
  if(typeof attr.clearUpdateRanges === 'function'){
    attr.clearUpdateRanges();
    attr.addUpdateRange(dirtyMin * 4, count * 4);
    if(fill){ fill.clearUpdateRanges(); fill.addUpdateRange(dirtyMin, count); }
  }
  attr.needsUpdate = true;
  if(fill) fill.needsUpdate = true;
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
  const s = stroke;
  stroke = null;
  controls.enabled = true;
  // 지우개로 "탭"만 했으면(거의 안 움직였으면) 그 부위를 통째로 지워요 — 부위 채우기와 같은 방식.
  if(state.tool === 'eraser' && s.moved <= 6 && s.region) clearRegion(s.region);
  updateQuote();
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
    stroke = { id: e.pointerId, last: null, startX: e.clientX, startY: e.clientY, moved: 0, region: hit.object.userData.region };
    _brushColor.set(state.activeColor || '#14201E');
    try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
    strokeTo(hit);
    e.preventDefault();
  }, { capture: true });

  canvas.addEventListener('pointermove', e => {
    if(stroke && e.pointerId === stroke.id){
      stroke.moved = Math.max(stroke.moved, Math.abs(e.clientX - stroke.startX) + Math.abs(e.clientY - stroke.startY));
      queuedStroke = e; // 프레임당 한 번만 처리
    }
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

function categoryOf(typeKey){ return GARMENT_TYPES[typeKey].category; }
// 분류마다 마지막으로 골랐던 모양을 기억해요(분류를 오가도 그대로).
const lastTypeByCategory = {};

function selectType(typeKey){
  const prevCategory = categoryOf(state.typeKey);
  state.typeKey = typeKey;
  lastTypeByCategory[categoryOf(typeKey)] = typeKey;
  state.lastTappedRegion = null;
  setStatus('');
  updateSizeLabels();
  rebuildGarment();
  if(prevCategory !== categoryOf(typeKey)) setViewDir(CATEGORY_VIEW[categoryOf(typeKey)], null);
}

function renderTypeRow(){
  const cat = categoryOf(state.typeKey);
  const variants = Object.entries(GARMENT_TYPES).filter(([, d]) => d.category === cat);
  el.typeRow.innerHTML = `
    <div class="category-row">
      ${CATEGORIES.map(([key, label]) => `<button class="type-chip${key === cat ? ' active' : ''}" data-category="${key}" type="button">${label}</button>`).join('')}
    </div>
    <div class="variant-row">
      <span class="variant-label">모양</span>
      ${variants.map(([key, d]) => `<button class="variant-chip${key === state.typeKey ? ' active' : ''}" data-type="${key}" type="button">${d.label}</button>`).join('')}
    </div>
  `;
  el.typeRow.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = btn.dataset.category;
      if(c === categoryOf(state.typeKey)) return;
      const first = lastTypeByCategory[c] || Object.keys(GARMENT_TYPES).find(k => GARMENT_TYPES[k].category === c);
      selectType(first);
    });
  });
  el.typeRow.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      if(btn.dataset.type !== state.typeKey) selectType(btn.dataset.type);
    });
  });
}

function updateSizeLabels(){
  const [lengthLabel, girthLabel] = SIZE_LABELS[categoryOf(state.typeKey)] || SIZE_LABELS.top;
  if(el.lengthLabel) el.lengthLabel.textContent = lengthLabel;
  if(el.girthLabel) el.girthLabel.textContent = girthLabel;
}

const TOOL_HINTS = {
  fill: '드래그로 회전 · 옷을 탭하면 그 부위를 채웁니다',
  brush: '옷 위를 드래그해서 그리기 · 옷 바깥을 드래그하면 회전',
  eraser: '옷을 탭하면 그 부위 전체를 지우고, 드래그하면 문지른 곳만 지웁니다 · 옷 바깥은 회전',
};
function renderToolRow(){
  el.toolRow.querySelectorAll('.tool-chip').forEach(b => b.classList.toggle('active', b.dataset.tool === state.tool));
  el.brushSizeRow.hidden = state.tool === 'fill';
  if(el.regionHint) el.regionHint.textContent = state.tool === 'eraser'
    ? '(칸을 누르면 그 부위를 지웁니다 · 좌우는 입는 사람 기준)'
    : '(칸을 누르면 지금 고른 원단·색으로 채웁니다 · 좌우는 입는 사람 기준)';
  // 3켤레 세트는 입는 사람 기준이 아니라 정면에서 본 순서예요.
  if(el.regionHint && GARMENT_TYPES[state.typeKey].kind === 'socks3')
    el.regionHint.textContent = el.regionHint.textContent.replace('좌우는 입는 사람 기준', '번호는 정면에서 볼 때 왼쪽부터');
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
  const kindDef = KINDS[def.kind];
  const design = getDesign(state.typeKey);
  const cache = GLB_CACHE[state.typeKey];
  el.regionGrid.style.gridTemplateColumns = `58px repeat(${kindDef.cols.length}, 1fr)`;
  const head = `<div></div>` + kindDef.cols.map(c => `<div class="rg-head">${c.head}</div>`).join('');
  const rows = kindDef.rows.map(([row, rowLabel]) => {
    const cells = kindDef.cols.map(c => {
      const key = `${row}_${c.key}`;
      const look = design.regions[key];
      const tapped = key === state.lastTappedRegion || (state.mirror && state.lastTappedRegion && mirrorRegionKey(state.lastTappedRegion, def.kind) === key);
      const empty = cache && !(cache.regionIndex[key] && cache.regionIndex[key].length);
      return `
        <button class="rg-cell${tapped ? ' just-tapped' : ''}" data-region="${key}" type="button" aria-label="${regionLabel(def.kind, key)}"${empty ? ' disabled' : ''}>
          <span class="dot" style="background:${lookSwatchColor(look)}"></span>
          <span class="rg-name">${empty ? '없음' : lookName(look)}</span>
        </button>`;
    }).join('');
    return `<div class="rg-row-label">${rowLabel}</div>${cells}`;
  }).join('');
  el.regionGrid.innerHTML = head + rows;
  el.regionGrid.querySelectorAll('.rg-cell').forEach(btn => {
    btn.addEventListener('click', () => {
      if(state.tool === 'eraser') clearRegion(btn.dataset.region);
      else fillRegion(btn.dataset.region);
    });
  });
  updateQuote();
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
  setStatus('브러시로 그린 자국을 모두 지웠습니다.');
  updateQuote();
});
el.resetBtn.addEventListener('click', () => {
  delete state.designByType[state.typeKey];
  state.lastTappedRegion = null;
  setStatus('이 옷을 처음 상태로 되돌렸습니다.');
  rebuildGarment();
});


/* ---------- 주문하기 · 장바구니 ----------
   지금 보고 있는 옷(종류·기장/둘레·부위별 원단/색·브러시 그림)을 바로 주문하거나 장바구니에 담아요.
   화면의 견적은 안내용이고, 실제 금액은 서버가 같은 규칙으로 다시 계산해요(위변조 방지).
   가격 = (기본 제작비 + 원단 등급 + 나염 + Lite/Premium − 구독 포함분) × 수량 */
const ORDER_BASE = 30000;
const FABRIC_TIER = { cotton: 0, linen: 0, silk: 20000, denim: 20000, knit: 20000, leather: 40000 };
const TIER_LABEL = { 0: '베이직', 20000: '프리미엄', 40000: '스페셜' };
const PAINT_AMOUNT = 10000;
const PREMIUM_AMOUNT = 30000;
const MAX_QTY = 10;          // 한 디자인당 최대 수량 (서버와 같아요)
const MAX_CART_ITEMS = 20;   // 장바구니 최대 디자인 수 (서버와 같아요)
const CART_KEY = 'unexposed-studio-cart';
const CART_PENDING_KEY = 'unexposed-studio-cart-pending';
const won = n => n.toLocaleString('ko-KR') + '원';
const clampQty = n => Math.min(MAX_QTY, Math.max(1, Math.floor(Number(n)) || 1));
const finishText = amount => amount ? 'Premium · 재봉사 매칭 + 완제품 배송' : 'Lite · 패턴 PDF만';
const categoryLabel = typeKey => (CATEGORIES.find(c => c[0] === GARMENT_TYPES[typeKey].category) || [, ''])[1];
const escapeHtml = str => String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const orderEl = {
  finishChoices: document.getElementById('create-finish-choices'),
  finishNote: document.getElementById('create-finish-note'),
  quote: document.getElementById('create-quote'),
  qtyStepper: document.getElementById('create-qty-stepper'),
  qtyValue: document.getElementById('create-qty-value'),
  openBtn: document.getElementById('create-order-open-btn'),
  cartAddBtn: document.getElementById('cart-add-btn'),
  cartToast: document.getElementById('cart-toast'),
  modal: document.getElementById('create-order-modal'),
  preview: document.getElementById('create-order-preview'),
  thumbs: document.getElementById('create-order-thumbs'),
  summary: document.getElementById('create-order-summary'),
  shippingSection: document.getElementById('create-order-shipping-section'),
  consent: document.getElementById('create-order-consent'),
  name: document.getElementById('create-order-name'),
  phone: document.getElementById('create-order-phone'),
  zipcode: document.getElementById('create-order-zipcode'),
  address1: document.getElementById('create-order-address1'),
  address2: document.getElementById('create-order-address2'),
  note: document.getElementById('create-order-note'),
  modalNote: document.getElementById('create-order-modal-note'),
  cancelBtn: document.getElementById('create-order-cancel-btn'),
  payBtn: document.getElementById('create-order-pay-btn'),
};
const cartEl = {
  openBtn: document.getElementById('cart-open-btn'),
  badge: document.getElementById('cart-badge'),
  modal: document.getElementById('cart-modal'),
  closeBtn: document.getElementById('cart-close-btn'),
  empty: document.getElementById('cart-empty'),
  list: document.getElementById('cart-list'),
  summary: document.getElementById('cart-summary'),
  note: document.getElementById('cart-note'),
  actions: document.getElementById('cart-actions'),
  clearBtn: document.getElementById('cart-clear-btn'),
  checkoutBtn: document.getElementById('cart-checkout-btn'),
};
let orderFinish = 0;
let orderQty = 1;
let orderMode = 'single'; // 'single' = 지금 디자인 바로 주문, 'cart' = 장바구니 전체 주문
let subscriber = null; // { plan, active, expiresAt } — 구독 중이면 재봉사 매칭·배송비가 빠져요.

// 구독 상태를 서버에서 확인해요. (실제 금액 계산은 서버가 다시 해요)
async function refreshSubscription(){
  const auth = window.authState;
  if(!auth || !auth.loggedIn){ subscriber = null; updateQuote(); renderCart(); return; }
  try {
    const res = await fetch('/api/subscription');
    const data = await res.json();
    subscriber = data.subscription && data.subscription.active ? data.subscription : null;
  } catch(err){ /* 확인 실패 시 할인 없이 보여줘요 */ }
  updateQuote();
  renderCart();
}

function designHasPaint(design){
  const p = design && design.paint;
  if(!p) return false;
  for(let i = 3; i < p.length; i += 4) if(p[i] > 0.05) return true;
  return false;
}

// 디자인 하나의 "1벌 가격"을 계산해요. 지금 화면의 디자인과 장바구니 상품이 같은 규칙을 써요.
function priceParts({ regions, hasPaint, finish }){
  let fabricAmount = 0;
  const used = new Set();
  Object.values(regions || {}).forEach(look => {
    if(!look || !look.fabric) return;
    const f = FABRICS.find(x => x.id === look.fabric);
    if(f) used.add(f.name);
    fabricAmount = Math.max(fabricAmount, FABRIC_TIER[look.fabric] || 0);
  });
  const paintAmount = hasPaint ? PAINT_AMOUNT : 0;
  // 구독에는 재봉사 매칭 + 완제품 배송이 포함돼 있어서, 구독자는 그 비용을 빼고 옷 가격만 내요.
  const subDiscount = subscriber ? finish : 0;
  return {
    fabricAmount, paintAmount, hasPaint, usedFabrics: [...used],
    finishAmount: finish, subDiscount,
    unit: ORDER_BASE + fabricAmount + paintAmount + finish - subDiscount,
  };
}

function computeQuote(){
  const design = getDesign(state.typeKey);
  const p = priceParts({ regions: design.regions, hasPaint: designHasPaint(design), finish: orderFinish });
  return { ...p, qty: orderQty, total: p.unit * orderQty };
}

function quoteHtml(q){
  const def = GARMENT_TYPES[state.typeKey];
  const rows = [
    [`기본 제작비 · ${categoryLabel(state.typeKey)} ${def.label}`, won(ORDER_BASE)],
    [`원단 ${TIER_LABEL[q.fabricAmount]}${q.usedFabrics.length ? ' (' + q.usedFabrics.join(', ') + ')' : ''}`, '+' + won(q.fabricAmount)],
  ];
  if(q.hasPaint) rows.push(['브러시 그림(나염)', '+' + won(q.paintAmount)]);
  rows.push([finishText(q.finishAmount), '+' + won(q.finishAmount)]);
  if(q.subDiscount) rows.push([`구독 포함 (${subscriber.plan === 'Premium' ? '연간' : '월간'} 구독 중)`, '-' + won(q.subDiscount)]);
  if(q.qty > 1) rows.push([`1벌 가격 × ${q.qty}벌`, `${won(q.unit)} × ${q.qty}`]);
  return rows.map(([a, b]) => `<div class="q-row"><span>${a}</span><span>${b}</span></div>`).join('')
    + `<div class="q-row q-total"><span>예상 견적${q.qty > 1 ? ` (${q.qty}벌)` : ''}</span><span>${won(q.total)}</span></div>`
    + (subscriber && !q.finishAmount ? `<div class="q-sub">구독 중이라 Premium을 고르면 재봉사 매칭·배송비가 빠집니다.</div>` : '')
    + `<div class="q-sub">${sizeLabelShort(0)} ×${state.lengthMul.toFixed(2)} · ${sizeLabelShort(1)} ×${state.girthMul.toFixed(2)} · 부위 ${Object.keys(getDesign(state.typeKey).regions).length}곳 채움</div>`;
}

function sizeLabelShort(i, typeKey = state.typeKey){
  const labels = SIZE_LABELS[GARMENT_TYPES[typeKey].category] || SIZE_LABELS.top;
  return labels[i].replace(' 배율', '');
}

function updateQuote(){
  if(!orderEl.quote) return;
  orderEl.quote.innerHTML = quoteHtml(computeQuote());
}

if(orderEl.finishChoices){
  orderEl.finishChoices.querySelectorAll('.calc-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      orderEl.finishChoices.querySelectorAll('.calc-chip').forEach(c => c.classList.toggle('active', c === chip));
      orderFinish = Number(chip.dataset.finish) || 0;
      orderEl.finishNote.hidden = orderFinish !== PREMIUM_AMOUNT;
      updateQuote();
    });
  });
}

/* 수량 선택 (지금 디자인) */
function setOrderQty(n){
  orderQty = clampQty(n);
  orderEl.qtyValue.textContent = orderQty;
  const [minus, plus] = orderEl.qtyStepper.querySelectorAll('button');
  minus.disabled = orderQty <= 1;
  plus.disabled = orderQty >= MAX_QTY;
  updateQuote();
}
orderEl.qtyStepper.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => setOrderQty(orderQty + Number(btn.dataset.qty)));
});

/* ---------- 장바구니 저장소 ----------
   브라우저(localStorage)에 저장해서 새로고침해도 남아 있어요. 브러시 그림 원본은 너무 커서 저장하지 않고,
   "그림 있음" 여부 + 작은 미리보기 사진만 저장해요(견적·제작 메모에는 그걸로 충분해요). */
let cart = loadCart();

function loadCart(){
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(it => it && GARMENT_TYPES[it.typeKey]).slice(0, MAX_CART_ITEMS) : [];
  } catch(err){ return []; }
}
function saveCart(){
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch(err){
    // 용량이 모자라면 미리보기 사진을 빼고 다시 저장해요.
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart.map(it => ({ ...it, thumb: null })))); } catch(e){}
  }
}
// 장바구니 결제가 끝나면 payment-success.html이 장바구니를 비워요(CART_PENDING_KEY의 주문번호로 확인).

function cartTotals(){
  let total = 0, qty = 0, waived = 0, needsShipping = false;
  const lines = cart.map(it => {
    const p = priceParts({ regions: it.regions, hasPaint: it.hasPaint, finish: it.finish });
    total += p.unit * it.qty;
    qty += it.qty;
    waived += p.subDiscount * it.qty;
    if(it.finish === PREMIUM_AMOUNT) needsShipping = true;
    return { item: it, ...p, lineTotal: p.unit * it.qty };
  });
  return { lines, total, qty, waived, needsShipping };
}

function updateCartBadge(){
  const qty = cart.reduce((sum, it) => sum + it.qty, 0);
  cartEl.badge.textContent = qty;
  cartEl.badge.hidden = qty === 0;
}

// 3D 화면을 작은 JPEG 미리보기로 떠요 (장바구니 목록용).
function captureThumb(size = 180){
  try {
    if(!renderer || !scene || !camera) return null;
    renderer.render(scene, camera);
    const src = renderer.domElement;
    const c = document.createElement('canvas');
    const s = Math.min(src.width, src.height);
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#123B38';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, size, size);
    return c.toDataURL('image/jpeg', 0.72);
  } catch(err){ return null; }
}

function describeRegions(regions){
  const names = new Set();
  let colorOnly = 0;
  Object.values(regions || {}).forEach(look => {
    if(!look) return;
    if(look.fabric){ const f = FABRICS.find(x => x.id === look.fabric); if(f) names.add(f.name); }
    else if(look.color) colorOnly++;
  });
  const parts = [];
  if(names.size) parts.push([...names].join('·'));
  if(colorOnly) parts.push(`단색 ${colorOnly}곳`);
  return parts.length ? parts.join(' + ') : '기본 옷감색';
}

function addCurrentToCart(){
  if(!GLB_CACHE[state.typeKey]){
    setStatus('모델을 불러온 뒤에 담을 수 있습니다.');
    return;
  }
  const design = getDesign(state.typeKey);
  const regions = JSON.parse(JSON.stringify(design.regions || {}));
  const hasPaint = designHasPaint(design);
  // 브러시 그림이 없고 나머지가 완전히 같은 디자인이면, 새로 담지 않고 수량만 늘려요.
  const sig = JSON.stringify([state.typeKey, state.lengthMul, state.girthMul, regions, orderFinish]);
  const same = !hasPaint && cart.find(it => !it.hasPaint && it.sig === sig);
  if(same){
    const before = same.qty;
    same.qty = clampQty(same.qty + orderQty);
    saveCart();
    afterCartChange(same.qty === before
      ? `같은 디자인이 이미 최대 수량(${MAX_QTY}벌)만큼 담겨 있습니다.`
      : `같은 디자인이 있어 수량을 ${same.qty}벌로 늘렸습니다.`);
    return;
  }
  if(cart.length >= MAX_CART_ITEMS){
    afterCartChange(`장바구니에는 최대 ${MAX_CART_ITEMS}개 디자인까지 담을 수 있습니다.`, false);
    return;
  }
  cart.push({
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    typeKey: state.typeKey,
    lengthMul: state.lengthMul,
    girthMul: state.girthMul,
    regions, hasPaint,
    finish: orderFinish,
    qty: orderQty,
    thumb: captureThumb(),
    sig,
    addedAt: Date.now(),
  });
  saveCart();
  afterCartChange(`${GARMENT_TYPES[state.typeKey].label} ${orderQty}벌을 장바구니에 담았습니다.`);
}

function afterCartChange(message, bump = true){
  updateCartBadge();
  renderCart();
  if(message){
    orderEl.cartToast.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" id="cart-toast-open">장바구니 보기</button>`;
    orderEl.cartToast.hidden = false;
    document.getElementById('cart-toast-open').addEventListener('click', openCart);
    clearTimeout(afterCartChange.timer);
    afterCartChange.timer = setTimeout(() => { orderEl.cartToast.hidden = true; }, 6000);
  }
  if(bump){
    cartEl.openBtn.classList.remove('bump');
    void cartEl.openBtn.offsetWidth; // 애니메이션 다시 재생
    cartEl.openBtn.classList.add('bump');
  }
}

function renderCart(){
  if(!cartEl.list) return;
  const t = cartTotals();
  const empty = cart.length === 0;
  cartEl.empty.hidden = !empty;
  cartEl.summary.hidden = empty;
  cartEl.actions.hidden = empty;
  cartEl.list.innerHTML = t.lines.map(({ item, unit, fabricAmount, hasPaint, lineTotal }) => {
    const def = GARMENT_TYPES[item.typeKey];
    const thumb = item.thumb
      ? `<img class="cart-thumb" src="${item.thumb}" alt="">`
      : `<div class="cart-thumb placeholder">미리보기 없음</div>`;
    const desc = [
      `${sizeLabelShort(0, item.typeKey)} ×${Number(item.lengthMul).toFixed(2)} · ${sizeLabelShort(1, item.typeKey)} ×${Number(item.girthMul).toFixed(2)}`,
      `원단 ${TIER_LABEL[fabricAmount]} (${describeRegions(item.regions)})${hasPaint ? ' · 나염' : ''}`,
    ].join('<br>');
    return `
      <div class="cart-item" data-id="${item.id}">
        ${thumb}
        <div class="cart-info">
          <div class="cart-title-row">
            <div class="cart-title">${escapeHtml(def.label)}<span class="cart-cat">${escapeHtml(categoryLabel(item.typeKey))}</span></div>
            <button class="cart-remove" type="button" data-act="remove">삭제</button>
          </div>
          <div class="cart-desc">${desc}</div>
          <div class="cart-finish">
            <button type="button" data-act="finish" data-finish="0" class="${item.finish ? '' : 'active'}">Lite · PDF</button>
            <button type="button" data-act="finish" data-finish="${PREMIUM_AMOUNT}" class="${item.finish ? 'active' : ''}">Premium · 완제품</button>
          </div>
          <div class="cart-bottom">
            <div class="qty-stepper sm">
              <button type="button" data-act="qty" data-qty="-1" aria-label="수량 줄이기" ${item.qty <= 1 ? 'disabled' : ''}>−</button>
              <span class="qty-value">${item.qty}</span>
              <button type="button" data-act="qty" data-qty="1" aria-label="수량 늘리기" ${item.qty >= MAX_QTY ? 'disabled' : ''}>+</button>
            </div>
            <span class="cart-unit">1벌 ${won(unit)}</span>
            <span class="cart-line-total">${won(lineTotal)}</span>
          </div>
        </div>
      </div>`;
  }).join('');
  if(!empty){
    cartEl.summary.innerHTML = cartSummaryHtml(t);
  }
  updateCartBadge();
}

function cartSummaryHtml(t){
  return `<div class="q-row"><span>상품 ${cart.length}종 · 총 ${t.qty}벌</span><span>${won(t.total + t.waived)}</span></div>`
    + (t.waived ? `<div class="q-row"><span>구독 포함 (재봉사 매칭·배송비)</span><span>-${won(t.waived)}</span></div>` : '')
    + `<div class="q-row q-total"><span>합계</span><span>${won(t.total)}</span></div>`
    + `<div class="q-sub">${t.needsShipping ? 'Premium 상품이 있어서 결제 전에 배송지를 입력합니다.' : '모두 Lite라서 배송 없이 패턴 PDF로 받습니다.'}</div>`;
}

cartEl.list.addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const row = btn.closest('.cart-item');
  const item = row && cart.find(it => it.id === row.dataset.id);
  if(!item) return;
  if(btn.dataset.act === 'remove'){
    cart = cart.filter(it => it !== item);
  } else if(btn.dataset.act === 'qty'){
    item.qty = clampQty(item.qty + Number(btn.dataset.qty));
  } else if(btn.dataset.act === 'finish'){
    item.finish = Number(btn.dataset.finish) || 0;
    item.sig = JSON.stringify([item.typeKey, item.lengthMul, item.girthMul, item.regions, item.finish]);
  }
  cartEl.note.textContent = '';
  saveCart();
  renderCart();
});

function openCart(){
  cartEl.note.textContent = '';
  refreshSubscription(); // 구독 할인까지 반영해서 다시 그려요.
  renderCart();
  cartEl.modal.hidden = false;
}
function closeCart(){ cartEl.modal.hidden = true; }
cartEl.openBtn.addEventListener('click', openCart);
cartEl.closeBtn.addEventListener('click', closeCart);
cartEl.modal.addEventListener('click', e => { if(e.target === cartEl.modal) closeCart(); });
cartEl.clearBtn.addEventListener('click', () => {
  if(!confirm('장바구니를 모두 비울까요?')) return;
  cart = [];
  saveCart();
  renderCart();
});
orderEl.cartAddBtn.addEventListener('click', addCurrentToCart);

/* ---------- 주문 확인 + 배송지 ---------- */
const shippingInputs = () => [orderEl.name, orderEl.phone, orderEl.zipcode, orderEl.address1, orderEl.address2, orderEl.note];

function updateShippingLock(){
  const unlocked = orderEl.consent.checked;
  shippingInputs().forEach(i => { i.disabled = !unlocked; });
}
function updatePayBtn(){
  if(orderEl.shippingSection.hidden){ orderEl.payBtn.disabled = false; return; }
  const filled = orderEl.name.value.trim() && orderEl.phone.value.trim()
    && orderEl.zipcode.value.trim() && orderEl.address1.value.trim();
  orderEl.payBtn.disabled = !(filled && orderEl.consent.checked);
}
[orderEl.name, orderEl.phone, orderEl.zipcode, orderEl.address1].forEach(i => i.addEventListener('input', updatePayBtn));
orderEl.consent.addEventListener('change', () => { updateShippingLock(); updatePayBtn(); });

// 프로필에 저장해둔 배송지가 있으면 자동으로 채워요(직접 수정 가능).
function prefillShipping(){
  const p = window.userProfile;
  if(!p || !p.shippingConsent) return;
  if(!orderEl.name.value) orderEl.name.value = p.name || '';
  if(!orderEl.phone.value) orderEl.phone.value = p.phone || '';
  if(!orderEl.zipcode.value) orderEl.zipcode.value = p.zipcode || '';
  if(!orderEl.address1.value) orderEl.address1.value = p.address1 || '';
  if(!orderEl.address2.value) orderEl.address2.value = p.address2 || '';
  orderEl.consent.checked = true;
}

// 주문 확인창에 보여줄 3D 화면 캡처 (보여주기용, 서버에는 안 보내요)
function captureDesignSnapshot(){
  try {
    if(!renderer || !scene || !camera) return null;
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  } catch(err){ return null; }
}

function requireLogin(){
  const auth = window.authState;
  if(!auth || !auth.loggedIn){
    alert('주문하려면 먼저 왼쪽 상단 메뉴에서 Google 로그인을 해주세요.');
    return false;
  }
  return true;
}

/* 결제는 PenWorldwide 구매 버튼으로 해요.
   1) 주문을 기록하고 구매 페이지를 새 창으로 열어요.
   2) 완제품 배송(Premium) 주문만, 결제를 마친 뒤 배송지를 입력해요. */
let pendingOrder = null; // { orderId, stage: 'shipping' | 'done' }

function finishOrderModal(msg){
  pendingOrder = { ...(pendingOrder || {}), stage: 'done' };
  orderEl.shippingSection.hidden = true;
  orderEl.modalNote.textContent = msg;
  orderEl.payBtn.textContent = '닫기';
  orderEl.payBtn.disabled = false;
}

function showOrderModal({ summaryHtml, needsShipping, snapshot, thumbsHtml }){
  orderEl.summary.innerHTML = summaryHtml;
  orderEl.preview.hidden = !snapshot;
  if(snapshot) orderEl.preview.src = snapshot;
  orderEl.thumbs.hidden = !thumbsHtml;
  orderEl.thumbs.innerHTML = thumbsHtml || '';
  orderEl.shippingSection.hidden = !needsShipping;
  if(needsShipping) prefillShipping();
  updateShippingLock();
  orderEl.modalNote.textContent = '';
  pendingOrder = null;
  orderEl.payBtn.textContent = '구매 페이지 열기';
  updatePayBtn();
  orderEl.modal.hidden = false;
}

// 바로 주문하기 — 지금 화면의 디자인 × 수량
orderEl.openBtn.addEventListener('click', async () => {
  if(!requireLogin()) return;
  if(!GLB_CACHE[state.typeKey]){
    setStatus('모델을 불러온 뒤에 주문할 수 있습니다.');
    return;
  }
  await refreshSubscription();
  orderMode = 'single';
  const q = computeQuote();
  showOrderModal({
    summaryHtml: quoteHtml(q),
    needsShipping: q.finishAmount === PREMIUM_AMOUNT,
    snapshot: captureDesignSnapshot(),
  });
});

// 장바구니 전체 주문하기
cartEl.checkoutBtn.addEventListener('click', async () => {
  if(!cart.length) return;
  if(!requireLogin()) return;
  await refreshSubscription();
  orderMode = 'cart';
  const t = cartTotals();
  const listHtml = t.lines.map(({ item, unit, lineTotal }) =>
    `<div class="q-row"><span>${escapeHtml(GARMENT_TYPES[item.typeKey].label)} · ${item.finish ? 'Premium' : 'Lite'} · ${won(unit)} × ${item.qty}</span><span>${won(lineTotal)}</span></div>`
  ).join('');
  const thumbsHtml = cart.map(it => `<div class="thumb-wrap">${it.thumb
    ? `<img src="${it.thumb}" alt="">` : '<div class="cart-thumb placeholder"></div>'}<span class="thumb-qty">×${it.qty}</span></div>`).join('');
  showOrderModal({
    summaryHtml: listHtml + cartSummaryHtml(t),
    needsShipping: t.needsShipping,
    snapshot: null,
    thumbsHtml,
  });
});

orderEl.cancelBtn.addEventListener('click', () => { orderEl.modal.hidden = true; });
orderEl.modal.addEventListener('click', e => { if(e.target === orderEl.modal) orderEl.modal.hidden = true; });

function shippingPayload(needsShipping){
  return needsShipping ? {
    name: orderEl.name.value.trim(),
    phone: orderEl.phone.value.trim(),
    zipcode: orderEl.zipcode.value.trim(),
    address1: orderEl.address1.value.trim(),
    address2: orderEl.address2.value.trim(),
    note: orderEl.note.value.trim(),
  } : null;
}

function buildOrderRequest(){
  if(orderMode === 'cart'){
    const needsShipping = cartTotals().needsShipping;
    return {
      url: '/api/orders/create-cart-order',
      body: {
        items: cart.map(it => ({
          studio: { typeKey: it.typeKey, lengthMul: it.lengthMul, girthMul: it.girthMul, regions: it.regions, hasPaint: !!it.hasPaint },
          finishAmount: it.finish,
          quantity: it.qty,
        })),
        consent: needsShipping ? orderEl.consent.checked : false,
        shipping: shippingPayload(needsShipping),
      },
    };
  }
  const q = computeQuote();
  const needsShipping = q.finishAmount === PREMIUM_AMOUNT;
  const design = getDesign(state.typeKey);
  return {
    url: '/api/orders/create-order',
    body: {
      designMode: 'studio',
      finishAmount: q.finishAmount,
      finishLabel: q.finishAmount ? 'Premium · 재봉사 매칭 + 완제품 배송 · +30,000원' : 'Lite · 패턴 PDF만 · +0원',
      quantity: orderQty,
      studio: {
        typeKey: state.typeKey,
        lengthMul: state.lengthMul,
        girthMul: state.girthMul,
        regions: design.regions,
        hasPaint: q.hasPaint,
      },
      consent: needsShipping ? orderEl.consent.checked : false,
      shipping: shippingPayload(needsShipping),
    },
  };
}

orderEl.payBtn.addEventListener('click', async () => {
  if(pendingOrder && pendingOrder.stage === 'done'){
    orderEl.modal.hidden = true;
    return;
  }
  orderEl.payBtn.disabled = true;

  // 2단계: 결제 후 배송지 저장 (완제품 배송 주문만)
  if(pendingOrder && pendingOrder.stage === 'shipping'){
    orderEl.payBtn.textContent = '배송지 저장 중...';
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(pendingOrder.orderId)}/shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: orderEl.consent.checked, shipping: shippingPayload(true) }),
      });
      const data = await res.json();
      if(!data.ok){
        orderEl.modalNote.textContent = data.error || '배송지 저장에 실패했습니다.';
        orderEl.payBtn.textContent = '배송지 저장';
        updatePayBtn();
        return;
      }
      finishOrderModal('배송지가 저장되었습니다. 결제가 확인되면 제작을 시작할게요.');
    } catch(err){
      orderEl.modalNote.textContent = '배송지 저장 중 오류가 발생했습니다.';
      orderEl.payBtn.textContent = '배송지 저장';
      updatePayBtn();
    }
    return;
  }

  // 1단계: 주문 기록 → 구매 페이지 열기 (팝업 차단을 피하려고 먼저 빈 창을 열어둬요)
  const buyWin = window.open('about:blank', '_blank');
  orderEl.payBtn.textContent = '주문 생성 중...';
  try {
    const { url, body } = buildOrderRequest();
    body.consent = false;   // 배송지는 결제 후에 받아요
    body.shipping = null;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const order = await res.json();
    if(!order.ok){
      if(buyWin) buyWin.close();
      orderEl.modalNote.textContent = order.error || '주문 생성에 실패했습니다.';
      orderEl.payBtn.textContent = '구매 페이지 열기';
      updatePayBtn();
      return;
    }
    if(buyWin) buyWin.location.href = order.buyUrl;
    const linkNote = buyWin ? '' : ` 새 창이 막혔다면 구매 페이지(${order.buyUrl})를 직접 열어주세요.`;
    // 장바구니 주문은 기록이 끝났으니 장바구니를 비워요.
    if(orderMode === 'cart'){
      cart = [];
      saveCart();
      renderCart();
    }
    pendingOrder = { orderId: order.orderId, stage: order.needsShipping ? 'shipping' : 'done' };
    if(order.needsShipping){
      orderEl.shippingSection.hidden = false;
      prefillShipping();
      updateShippingLock();
      orderEl.payBtn.textContent = '배송지 저장';
      orderEl.modalNote.textContent = `주문번호 ${order.orderId} · 구매 페이지에서 결제를 마친 뒤 배송지를 입력해주세요.${linkNote}`;
      updatePayBtn();
    } else {
      finishOrderModal(`주문이 접수되었어요 (${won(order.amount)}). 구매 페이지에서 결제를 마치면 제작을 시작합니다.${linkNote}`);
    }
  } catch(err){
    if(buyWin) buyWin.close();
    orderEl.modalNote.textContent = '주문 생성 중 오류가 발생했습니다.';
    orderEl.payBtn.textContent = '구매 페이지 열기';
    updatePayBtn();
  }
});

/* ---------- 시작 ---------- */
preloadGarmentGLBs();
updateSizeLabels();
renderAllUI();
setOrderQty(1);
renderCart();
