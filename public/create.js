/* create.js — 제작 스튜디오 (create.html 팝업을 index.html이 불러온 뒤 실행돼요)
   - 먼저 바디 스캔(사진 + 키 필수·몸무게 선택)을 받고, 그 체형을 기준으로 옷을 만들어요.
     키·몸무게는 주문에 함께 실려 재봉사에게 전달돼요.
   - 옷 종류 → 3D 모델(/models/*.glb)을 보여주고, 모델을 누르면 그 부위를 채워요.
   - 3D 모델이 없거나 불러오지 못하면 부위 칸(2D) 방식으로 보여줘요.
   - 장바구니에 여러 디자인을 담아 한 번에 주문하거나, 한 벌씩 바로 주문해요.
   - 서버(server.js)의 STUDIO_TYPES / STUDIO_KINDS / STUDIO_FABRICS 와 같은 구조로 보내요.
   - 금액 표시는 참고용이에요. 실제 결제 금액은 서버가 1벌 가격 × 수량으로 다시 계산해요. */
(function () {
  'use strict';

  /* ---------- 서버와 맞추는 옷·원단 정의 (server.js 의 값과 같아야 해요) ---------- */
  const TYPES = {
    shortSleeve: { label: '반팔 티셔츠', kind: 'top' },
    longSleeve: { label: '긴팔 티셔츠', kind: 'top' },
    shortPants: { label: '반바지', kind: 'bottom' },
    longPants: { label: '긴바지', kind: 'bottom' },
    capBall: { label: '볼캡', kind: 'hat' },
    shoeClassic: { label: '클래식 스니커즈', kind: 'shoes' },
    shoeCanvas: { label: '캔버스 스니커즈', kind: 'shoes' },
    shoeRunning: { label: '러닝 스니커즈', kind: 'shoes' },
    sockCrew: { label: '골지 크루삭스', kind: 'socks' },
    sockAnkle3: { label: '발목양말 3켤레', kind: 'socks3' },
  };
  const COLS4 = { LF: ['왼쪽', '앞'], LB: ['왼쪽', '뒤'], RF: ['오른쪽', '앞'], RB: ['오른쪽', '뒤'] };
  const KINDS = {
    top: { rows: { shoulder: '어깨', sleeve: '팔(소매)', body: '몸판' }, cols: COLS4, size: ['기장', '둘레'] },
    bottom: { rows: { waist: '허리', leg: '다리' }, cols: COLS4, size: ['기장', '둘레'] },
    hat: { rows: { front: '앞판', back: '뒤판', brim: '챙' }, cols: { L: ['왼쪽', ''], R: ['오른쪽', ''] }, size: ['높이', '둘레'] },
    shoes: { rows: { upper: '갑피', toe: '앞코', heel: '뒤꿈치', sole: '밑창' }, cols: { L: ['왼발', ''], R: ['오른발', ''] }, size: ['길이', '볼·높이'] },
    socks: { rows: { cuff: '밴드', leg: '목', foot: '발', toe: '발끝' }, cols: { L: ['왼발', ''], R: ['오른발', ''] }, size: ['길이', '둘레'] },
    socks3: { rows: { cuff: '밴드', foot: '발', toe: '발끝' }, cols: { S1: ['1번 양말', ''], S2: ['2번 양말', ''], S3: ['3번 양말', ''] }, size: ['길이', '둘레'] },
  };
  const FABRICS = {
    cotton: { name: '면', amount: 0 }, linen: { name: '린넨', amount: 0 },
    silk: { name: '실크', amount: 20000 }, denim: { name: '데님', amount: 20000 }, knit: { name: '니트', amount: 20000 },
    leather: { name: '가죽', amount: 40000 },
  };
  const TIER = { 0: '베이직', 20000: '프리미엄', 40000: '스페셜' };
  const PAINT_AMOUNT = 10000;
  const FINISH_PREMIUM = 30000;
  const MAX_QTY = 10;
  const MAX_CART = 20;
  const CART_KEY = 'unexposed_studio_cart';
  const PALETTE = ['#0F2E2C', '#3E7F86', '#6FB8C2', '#D8663F', '#F5F2EA', '#14201E', '#A98863', '#FBFAF6'];
  const DEFAULT_FABRIC_COLOR = '#D9D4C7'; // 아직 안 채운 부위의 기본 옷감색
  // 바디 스캔 입력 범위 (키는 3D 꾸미기와 같은 범위, server.js 의 STUDIO_BODY 와 같아야 해요)
  const BODY = { heightMin: 30, heightMax: 250, weightMin: 3, weightMax: 300 };

  /* ---------- 옷 종류 → 3D 모델 파일 (public/models/ 에 원래 이름 그대로 두세요) ---------- */
  const MODEL_BASE = '/models/';
  const MODEL_FILES = {
    shortSleeve: 'Meshy_AI_Classic_White_T_Shirt_0913135306_generate.glb',
    longSleeve: 'Meshy_AI_Gray_Henley_Long_Slee_0925142723_generate.glb',
    shortPants: 'Meshy_AI_White_Shorts_0913135257_generate.glb',
    longPants: 'Meshy_AI_White_Long_Pants_0913135302_generate.glb',
    capBall: 'Meshy_AI_Blue_Denim_Baseball_C_0928035117_generate.glb',
    shoeClassic: 'Meshy_AI_Adidas_White_Sneaker_0928035205_generate.glb',
    shoeCanvas: 'Meshy_AI_Black_Vans_Sneakers_0928035238_generate.glb',
    shoeRunning: 'Meshy_AI_Cream_Skechers_Sneake_0928035311_generate.glb',
    sockCrew: 'Meshy_AI_White_Ribbed_Socks_0928035340_generate.glb',
    sockAnkle3: 'Meshy_AI_Three_Ankle_Socks_on__0928035404_generate.glb',
  };

  /* ---------- 화면 상태 ---------- */
  const st = {
    typeKey: 'shortSleeve', lengthMul: 1, girthMul: 1, regions: {},
    fabric: 'cotton', color: PALETTE[0], tool: 'fill', mirror: false,
    hasPaint: false, finishAmount: 0, quantity: 1, brush: 0.035,
    body: null, // { heightCm, weightKg|null } — 바디 스캔을 마쳐야 채워져요
  };
  let scanStream = null;
  let scanFacing = 'user';     // 'user'(앞 카메라) | 'environment'(뒤 카메라)
  let scanCountdown = null;    // 타이머 촬영 중이면 setInterval id
  // 옷을 만들려면 몸을 네 방향에서 봐야 해서, 앞·뒤·왼쪽·오른쪽 사진을 모두 받아요.
  const SCAN_VIEWS = [
    { key: 'front', label: '앞모습' },
    { key: 'back', label: '뒷모습' },
    { key: 'left', label: '왼쪽 옆모습' },
    { key: 'right', label: '오른쪽 옆모습' },
  ];
  const scanPhotos = { front: null, back: null, left: null, right: null };
  let scanActiveView = 'front';
  let memCart = [];
  let cart = loadCart();
  let pending = null; // 주문 확인 모달에 올라간 주문 { mode: 'single'|'cart', items }
  let toastTimer = null;

  const $ = id => document.getElementById(id);
  const won = n => `${Number(n).toLocaleString('ko-KR')}원`;
  const kindOf = key => KINDS[TYPES[key].kind];
  const loggedIn = () => !!(window.authState && window.authState.loggedIn);

  /* ---------- 스타일 (create.html 클래스용) ---------- */
  const CSS = `
  .wizard-box{max-width:760px;width:100%;max-height:92vh;overflow-y:auto;padding:26px 22px;position:relative;background:var(--paper);border-radius:18px}
  .wizard-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}
  .wizard-step{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--star-dark);font-weight:600}
  .wizard-header-actions{display:flex;align-items:center;gap:8px}
  .wizard-close{width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:var(--paper);cursor:pointer;font-size:14px}
  .cart-open-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--mist);border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--ink)}
  .cart-badge{background:var(--coral);color:#fff;border-radius:999px;font-size:11px;padding:1px 7px;min-width:18px;text-align:center}
  .cart-badge[hidden]{display:none}
  .type-row{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
  .type-chip,.tool-chip,.fabric-chip,.calc-chip{padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--paper);font-size:12.5px;cursor:pointer;font-family:inherit;color:var(--ink)}
  .type-chip.active,.tool-chip.active,.fabric-chip.active,.calc-chip.active{background:var(--deep);color:var(--paper);border-color:var(--deep)}
  .viewer-box{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--mist);margin:10px 0}
  #create-3d{position:relative;height:340px;background:#fbfaf6;border-radius:8px;overflow:hidden}
  #create-3d .stage-gl{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none}
  #create-3d .stage-gl[hidden]{display:none}
  #create-3d .stage-gl.painting{cursor:crosshair}
  .view-btns{display:none}
  .viewer-hint{font-size:12px;color:var(--ink-soft);margin-top:8px;text-align:center}
  .tool-row{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
  .section-label{font-size:13px;font-weight:700;margin:14px 0 6px}
  .section-label .hint{font-weight:400;color:var(--ink-soft);font-size:12px}
  .color-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .swatch-btn{width:26px;height:26px;border-radius:50%;border:2px solid var(--paper);box-shadow:0 0 0 1px var(--line);cursor:pointer;padding:0}
  .swatch-btn.active{box-shadow:0 0 0 2px var(--deep)}
  .color-row input[type=color]{width:30px;height:30px;padding:0;border:none;background:none;cursor:pointer}
  .brush-size-row{display:flex;align-items:center;gap:10px;font-size:12.5px;margin-top:8px}
  .brush-size-row[hidden]{display:none}
  #create-order-thumbs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
  #create-order-thumbs[hidden]{display:none}
  #create-order-thumbs figure{margin:0;text-align:center;font-size:11px;color:var(--ink-soft)}
  #create-order-thumbs img{display:block;width:64px;height:72px;object-fit:contain;background:#fbfaf6;border:1px solid var(--line);border-radius:8px}
  .mirror-toggle{display:flex;gap:8px;align-items:center;font-size:13px;margin-top:10px}
  .size-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
  .size-grid label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--ink-soft)}
  .size-grid input{padding:9px 10px;border-radius:8px;border:1px solid var(--line);font-family:inherit;background:var(--paper);color:var(--ink)}
  .fabric-row{display:flex;gap:6px;flex-wrap:wrap}
  .region-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
  .region-tile{min-height:52px;border-radius:10px;border:1px dashed var(--line);background:var(--paper);font-size:12px;cursor:pointer;padding:6px;font-family:inherit;color:var(--ink);text-align:left}
  .region-tile.filled{border-style:solid;border-color:rgba(0,0,0,.15)}
  .region-tile small{display:block;font-size:11px;opacity:.85}
  .studio-status{font-size:12.5px;color:var(--star-dark);min-height:18px;margin-top:6px}
  .reset-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .studio-order{margin-top:18px;border-top:1px dashed var(--line);padding-top:14px}
  .studio-order-desc{font-size:12.5px;color:var(--ink-soft);margin-bottom:10px}
  .calc-choices{display:flex;gap:6px;flex-wrap:wrap}
  .studio-order-note{font-size:12.5px;color:var(--ink-soft);margin-top:8px}
  .studio-order-note[hidden]{display:none}
  .qty-row{display:flex;align-items:center;gap:10px;margin:10px 0;font-size:13px;flex-wrap:wrap}
  .qty-stepper{display:flex;align-items:center;gap:6px}
  .qty-stepper button{width:30px;height:30px;border-radius:8px;border:1px solid var(--line);background:var(--paper);cursor:pointer;font-size:16px}
  .qty-value{min-width:24px;text-align:center;font-weight:700}
  .qty-hint{font-size:12px;color:var(--ink-soft)}
  .studio-quote{font-size:13px;background:var(--mist);border-radius:10px;padding:10px 12px;margin:8px 0;line-height:1.7}
  .studio-order-btns,.studio-order-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .studio-order-btns .btn,.studio-order-actions .btn{flex:1;justify-content:center}
  .studio-tryon-btn{width:100%;justify-content:center;margin-top:10px}
  .tryon-box{max-width:560px;width:100%;max-height:92vh;overflow-y:auto}
  .tryon-stage{position:relative;height:min(460px,58vh);background:#fbfaf6;border:1px solid var(--line);border-radius:12px;overflow:hidden;touch-action:none}
  .tryon-stage canvas{display:block;width:100%;height:100%}
  .tryon-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:16px;font-size:13px;color:var(--ink-soft)}
  .tryon-loading[hidden]{display:none}
  .tryon-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0 2px}
  .tryon-hint{font-size:12px;color:var(--ink-soft)}
  .cart-toast{font-size:12.5px;color:var(--star-dark);margin-top:8px}
  .cart-toast[hidden]{display:none}
  .cart-box{max-width:560px;width:100%;max-height:90vh;overflow-y:auto}
  .cart-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  .cart-empty{font-size:13px;color:var(--ink-soft)}
  .cart-item{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;background:var(--paper)}
  .cart-item-head{display:flex;justify-content:space-between;gap:8px;font-weight:600;font-size:14px}
  .cart-item-head button{border:none;background:none;color:var(--ink-soft);cursor:pointer;font-size:12px;font-family:inherit}
  .cart-item-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
  .order-shipping-fields{display:flex;flex-direction:column;gap:8px;margin-top:8px}
  .order-shipping-fields label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--ink-soft)}
  .order-shipping-fields input{padding:9px 10px;border-radius:8px;border:1px solid var(--line);font-family:inherit;background:var(--paper);color:var(--ink)}
  .wizard-steps{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .wizard-step{opacity:.45}
  .wizard-step.active{opacity:1}
  .wizard-step-arrow{color:var(--ink-soft);font-size:12px}
  .wizard-panel[hidden]{display:none}
  .create-scan-wrap{display:grid;grid-template-columns:1fr;gap:16px}
  @media(min-width:640px){.create-scan-wrap{grid-template-columns:1fr 1fr}}
  .create-scan-camera video{width:100%;aspect-ratio:3/4;object-fit:cover;background:var(--mist);border:1px solid var(--line);border-radius:8px;display:block}
  .create-scan-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .create-scan-actions .btn{padding:10px 16px;font-size:13px}
  .create-scan-upload{display:inline-flex;align-items:center;padding:10px 16px;font-size:13px;font-weight:600;border:1px solid var(--line);border-radius:8px;cursor:pointer;background:var(--paper)}
  .create-scan-hint{font-size:12px;color:var(--ink-soft);margin-top:8px}
  .create-scan-views{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .create-scan-photo{position:relative;aspect-ratio:3/4;border:1px dashed var(--line);border-radius:8px;display:flex;align-items:center;justify-content:center;text-align:center;font:inherit;font-size:11.5px;color:var(--ink-soft);padding:4px;overflow:hidden;background:var(--paper);cursor:pointer}
  .create-scan-photo.active{border:2px solid var(--star-dark)}
  .create-scan-photo.filled{border-style:solid}
  .create-scan-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
  .create-scan-photo .create-scan-view-label{display:none;position:absolute;left:0;right:0;bottom:0;padding:2px 0;font-size:10.5px;font-weight:600;background:rgba(0,0,0,.55);color:#fff}
  .create-scan-photo.filled .create-scan-photo-empty{display:none}
  .create-scan-photo.filled .create-scan-view-label{display:block}
  .create-scan-count{font-size:12px;color:var(--ink-soft);margin-top:6px}
  .create-scan-timer{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink-soft);margin-top:8px;cursor:pointer}
  .create-body-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
  .create-body-fields label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--ink-soft)}
  .create-body-fields input{padding:9px 10px;border-radius:8px;border:1px solid var(--line);font-family:inherit;background:var(--paper);color:var(--ink);font-size:14px}
  .create-body-fields input[aria-invalid=true]{border-color:var(--coral)}
  .create-body-fields .req{color:var(--coral);font-size:11px;font-weight:700;margin-left:4px}
  .create-body-fields .opt{font-size:11px;margin-left:4px}
  .create-body-note{font-size:12px;color:var(--ink-soft);margin-top:8px}
  .create-body-error{font-size:12.5px;color:var(--coral);min-height:18px;margin-top:4px}
  .create-scan-next{width:100%;justify-content:center;margin-top:4px}
  .create-scan-next:disabled{opacity:.4;cursor:not-allowed}
  .create-body-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:12px}
  .create-body-bar button{border:none;background:none;padding:0;font:inherit;font-size:12.5px;color:var(--star-dark);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
  `;

  function injectStyle() {
    if ($('create-studio-style')) return;
    const s = document.createElement('style');
    s.id = 'create-studio-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- 장바구니 저장 (브라우저에 저장, 저장 실패 시 화면 안에서만 유지) ---------- */
  function loadCart() {
    try {
      const v = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(v) ? v : memCart;
    } catch (e) { return memCart; }
  }
  function saveCart(list) {
    cart = list;
    memCart = list;
    try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch (e) { /* 저장 못 해도 화면에서는 계속 써요 */ }
  }

  /* ---------- 금액 (참고용 견적) ---------- */
  function estimate(studio, finishAmount) {
    let fabric = 0;
    for (const v of Object.values(studio.regions)) {
      const f = v && FABRICS[v.fabric];
      if (f) fabric = Math.max(fabric, f.amount);
    }
    const paint = studio.hasPaint ? PAINT_AMOUNT : 0;
    return { fabric, paint, finish: finishAmount, unit: fabric + paint + finishAmount };
  }

  // withViews: 장바구니·주문에 담을 때만 칠한 옷 이미지를 함께 찍어요. (견적 계산 때는 안 찍어요)
  function snapshot(withViews) {
    const paintViews = withViews ? captureDesignViews() : null;
    return {
      ...(paintViews ? { paintViews } : {}),
      typeKey: st.typeKey,
      lengthMul: st.lengthMul,
      girthMul: st.girthMul,
      regions: JSON.parse(JSON.stringify(st.regions)),
      hasPaint: st.hasPaint,
      body: st.body ? { ...st.body } : null,
    };
  }

  /* ---------- 바디 스캔 (STEP 1) ---------- */
  function readBody() {
    const hRaw = $('create-height-input').value.trim();
    const wRaw = $('create-weight-input').value.trim();
    const h = Number(hRaw);
    const w = Number(wRaw);
    const heightOk = hRaw !== '' && isFinite(h) && h >= BODY.heightMin && h <= BODY.heightMax;
    const weightOk = wRaw === '' || (isFinite(w) && w >= BODY.weightMin && w <= BODY.weightMax);
    let error = '';
    if (hRaw !== '' && !heightOk) error = `키는 ${BODY.heightMin}~${BODY.heightMax}cm 사이로 입력해주세요.`;
    else if (!weightOk) error = `몸무게는 ${BODY.weightMin}~${BODY.weightMax}kg 사이로 입력하거나 비워두세요.`;
    return {
      ok: heightOk && weightOk,
      heightOk, weightOk, error,
      body: { heightCm: Math.round(h * 10) / 10, weightKg: wRaw === '' ? null : Math.round(w * 10) / 10 },
    };
  }
  function refreshScanNext() {
    const r = readBody();
    $('create-scan-next-btn').disabled = !r.ok || scanMissingViews().length > 0;
    $('create-height-input').setAttribute('aria-invalid', String($('create-height-input').value.trim() !== '' && !r.heightOk));
    $('create-weight-input').setAttribute('aria-invalid', String(!r.weightOk));
    $('create-body-error').textContent = r.error;
  }
  function bodyText(body) {
    return body.weightKg != null
      ? `기준 체형 · 키 ${body.heightCm}cm · 몸무게 ${body.weightKg}kg`
      : `기준 체형 · 키 ${body.heightCm}cm`;
  }
  function stopScanCamera() {
    cancelScanCountdown();
    if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
    const v = $('create-scan-video');
    if (v) v.srcObject = null;
    $('create-scan-capture-btn').hidden = true;
    $('create-scan-flip-btn').hidden = true;
    $('create-scan-start-btn').hidden = false;
  }
  function cancelScanCountdown() {
    if (scanCountdown) { clearInterval(scanCountdown); scanCountdown = null; }
    const btn = $('create-scan-capture-btn');
    if (btn) btn.textContent = '사진 촬영';
  }
  function viewLabel(key) {
    return (SCAN_VIEWS.find(v => v.key === key) || SCAN_VIEWS[0]).label;
  }
  function scanMissingViews() {
    return SCAN_VIEWS.filter(v => !scanPhotos[v.key]).map(v => v.key);
  }
  function scanSlot(key) {
    return $('create-scan-views').querySelector(`[data-view="${key}"]`);
  }
  function setActiveView(key) {
    scanActiveView = key;
    SCAN_VIEWS.forEach(v => scanSlot(v.key).classList.toggle('active', v.key === key));
  }
  function renderScanCount() {
    const missing = scanMissingViews();
    const done = SCAN_VIEWS.length - missing.length;
    $('create-scan-count').textContent = `사진 ${done} / ${SCAN_VIEWS.length}`
      + (missing.length ? ` · 남은 사진: ${missing.map(viewLabel).join(', ')}` : ' · 모두 준비됐어요');
  }
  // 사진을 넣으면 다음으로 비어 있는 방향을 자동으로 골라줘요.
  function afterScanPhoto(doneKey, how) {
    const missing = scanMissingViews();
    if (missing.length) {
      setActiveView(missing[0]);
      $('create-scan-hint').textContent = `${viewLabel(doneKey)} 사진을 ${how}했습니다. 이제 ${viewLabel(missing[0])} 사진을 ${how}해주세요.`;
    } else {
      $('create-scan-hint').textContent = `사진 4장이 모두 준비됐습니다. 키를 입력하고 다음으로 넘어가세요. 바꾸고 싶은 사진은 눌러서 다시 ${how}하면 됩니다.`;
    }
    renderScanCount();
    refreshScanNext();
  }
  function setScanPhoto(key, dataUrl) {
    scanPhotos[key] = dataUrl;
    const slot = scanSlot(key);
    const old = slot.querySelector('img');
    if (old) old.remove();
    if (dataUrl) {
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = viewLabel(key);
      slot.insertBefore(img, slot.firstChild);
    }
    slot.classList.toggle('filled', !!dataUrl);
  }
  // 큰 사진도 서버 저장 한도(장당 약 300KB) 안에 들어가도록 긴 변 960px JPEG로 줄여요.
  function shrinkImage(source, w, h) {
    const max = 960;
    const scale = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
    let q = 0.82;
    let out = c.toDataURL('image/jpeg', q);
    while (out.length > 380000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
    return out;
  }
  async function startScanCamera() {
    try {
      if (scanStream) scanStream.getTracks().forEach(t => t.stop());
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: scanFacing }, audio: false });
      $('create-scan-video').srcObject = scanStream;
      $('create-scan-start-btn').hidden = true;
      $('create-scan-capture-btn').hidden = false;
      $('create-scan-flip-btn').hidden = false;
      $('create-scan-hint').textContent = `${viewLabel(scanActiveView)}이 보이게 서서 몸 전체가 화면에 들어오게 한 다음 "사진 촬영"을 눌러주세요.`;
    } catch (e) {
      stopScanCamera();
      $('create-scan-hint').textContent = '카메라를 사용할 수 없습니다. 업로드 버튼으로 진행해주세요.';
    }
  }
  function captureScanPhoto() {
    const v = $('create-scan-video');
    if (!scanStream || !v.videoWidth) return;
    const key = scanActiveView;
    setScanPhoto(key, shrinkImage(v, v.videoWidth, v.videoHeight));
    afterScanPhoto(key, '촬영');
  }
  // 3D 꾸미기와 같은 규칙: 로그인 + 신체 데이터 수집에 동의한 경우에만 사진·키를 서버에 저장해요.
  // 몸무게는 동의 문구(사진·키 정보)에 없어서 스캔 기록에는 저장하지 않고, 주문할 때만 함께 보내요.
  async function saveScanIfConsented(body) {
    if (!loggedIn() || window.bodyDataConsentGranted !== true) return;
    const photos = {};
    SCAN_VIEWS.forEach(v => { if (scanPhotos[v.key] && scanPhotos[v.key].length < 380000) photos[v.key] = scanPhotos[v.key]; });
    try {
      await fetch('/api/scan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heightCm: body.heightCm,
          photoThumbnail: photos.front || null,
          photos,
        }),
      });
    } catch (e) { /* 저장에 실패해도 스튜디오는 그대로 써요 */ }
  }
  function showCreateStep(step) {
    $('create-scan-panel').hidden = step !== 1;
    $('create-studio-panel').hidden = step !== 2;
    $('create-step-indicator-1').classList.toggle('active', step === 1);
    $('create-step-indicator-2').classList.toggle('active', step === 2);
    if (step === 2) {
      stopScanCamera();
      $('create-body-summary').textContent = bodyText(st.body);
      status('옷을 고르고 부위를 채워보세요.');
      showModelFor(st.typeKey);
    } else {
      refreshScanNext();
    }
    const box = $('create-modal').querySelector('.wizard-box');
    if (box) box.scrollTop = 0;
  }
  function bindScan() {
    $('create-scan-start-btn').addEventListener('click', startScanCamera);
    $('create-scan-flip-btn').addEventListener('click', () => {
      cancelScanCountdown();
      scanFacing = scanFacing === 'user' ? 'environment' : 'user';
      startScanCamera();
    });
    $('create-scan-capture-btn').addEventListener('click', () => {
      if (!scanStream) return;
      if (scanCountdown) { cancelScanCountdown(); return; } // 타이머 도중 다시 누르면 취소
      if (!$('create-scan-timer-input').checked) { captureScanPhoto(); return; }
      let left = 10;
      const btn = $('create-scan-capture-btn');
      btn.textContent = `${left}초 뒤 촬영 (취소)`;
      scanCountdown = setInterval(() => {
        left -= 1;
        if (left > 0) { btn.textContent = `${left}초 뒤 촬영 (취소)`; return; }
        cancelScanCountdown();
        captureScanPhoto();
      }, 1000);
    });
    SCAN_VIEWS.forEach(v => scanSlot(v.key).addEventListener('click', () => {
      cancelScanCountdown();
      setActiveView(v.key);
      $('create-scan-hint').textContent = `${v.label} 사진을 촬영하거나 업로드해주세요.`;
    }));
    $('create-scan-file-input').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const key = scanActiveView;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setScanPhoto(key, shrinkImage(img, img.naturalWidth, img.naturalHeight));
        URL.revokeObjectURL(url);
        afterScanPhoto(key, '업로드');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        $('create-scan-hint').textContent = '사진 파일을 읽지 못했습니다. 다른 사진으로 다시 시도해주세요.';
      };
      img.src = url;
    });
    $('create-height-input').addEventListener('input', refreshScanNext);
    $('create-weight-input').addEventListener('input', refreshScanNext);
    $('create-scan-next-btn').addEventListener('click', () => {
      const r = readBody();
      if (!r.ok) {
        if (!r.heightOk && !r.error) $('create-body-error').textContent = '키를 입력해주세요. (필수)';
        return;
      }
      const missing = scanMissingViews();
      if (missing.length) {
        $('create-body-error').textContent = `${missing.map(viewLabel).join(', ')} 사진이 필요합니다.`;
        return;
      }
      st.body = r.body;
      saveScanIfConsented(st.body);
      showCreateStep(2);
    });
    $('create-rescan-btn').addEventListener('click', () => showCreateStep(1));
  }

  /* ---------- 부위 이름·채우기 ---------- */
  function regionLabel(kind, key) {
    const [r, c] = key.split('_');
    const [side, face] = kind.cols[c];
    return `${side}${face ? ' ' + face : ''} · ${kind.rows[r]}`;
  }
  function regionKeys(kind) {
    const keys = [];
    for (const r of Object.keys(kind.rows)) for (const c of Object.keys(kind.cols)) keys.push(`${r}_${c}`);
    return keys;
  }
  function mirrorKey(key) {
    const [r, c] = key.split('_');
    const map = { LF: 'RF', RF: 'LF', LB: 'RB', RB: 'LB', L: 'R', R: 'L' };
    return map[c] ? `${r}_${map[c]}` : null;
  }
  function setRegion(key, fill) {
    if (fill) st.regions[key] = fill; else delete st.regions[key];
  }
  function onRegionTap(key) {
    const kind = kindOf(st.typeKey);
    if (!kind.cols[key.split('_')[1]] || !kind.rows[key.split('_')[0]]) return;
    if (st.tool === 'brush') { status('브러시는 위의 3D 옷 위를 드래그해서 칠합니다.'); return; }
    const m = st.mirror ? mirrorKey(key) : null;
    const useMirror = !!(m && kind.cols[m.split('_')[1]]);
    if (st.tool === 'eraser') {
      setRegion(key, null);
      if (useMirror) setRegion(m, null);
      status(`${regionLabel(kind, key)} 지웠습니다.`);
    } else {
      const fill = { fabric: st.fabric, color: st.color };
      setRegion(key, fill);
      if (useMirror) setRegion(m, { ...fill });
      status([regionLabel(kind, key), ' → ', FABRICS[st.fabric].name, useMirror ? ' (좌우 대칭)' : '']);
    }
    renderRegions();
    renderQuote();
  }

  // 배열로 주면 조각마다 따로 글자 덩어리로 넣어요. (i18n.js 가 부위 이름·원단 이름을 각각 통째로 번역할 수 있게)
  function status(msg) {
    const el = $('studio-status');
    if (!el) return;
    if (Array.isArray(msg)) el.replaceChildren(...msg.filter(Boolean).map(t => document.createTextNode(t)));
    else el.textContent = msg;
  }
  function toast(msg) {
    const el = $('cart-toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* ---------- 부위 자동 나누기 (모델 모양으로 추정 — 어긋나면 알려주세요) ----------
     nx: 가로 중심 기준 -1(왼쪽 끝)~1(오른쪽 끝), ny: 바닥 0 ~ 위 1, nz: 앞(+) ~ 뒤(-) */
  function classify(typeKey, nx, ny, nz, ctx) {
    const kindName = TYPES[typeKey].kind;
    const side = nx < 0 ? 'L' : 'R';
    const face = nz >= 0 ? 'F' : 'B';
    if (kindName === 'top') {
      const isLong = typeKey === 'longSleeve';
      const sleeve = Math.abs(nx) > 0.55 && (ny > 0.45 || isLong);
      const row = sleeve ? 'sleeve' : (ny > 0.82 ? 'shoulder' : 'body');
      return `${row}_${side}${face}`;
    }
    if (kindName === 'bottom') {
      return `${ny > 0.82 ? 'waist' : 'leg'}_${side}${face}`;
    }
    if (kindName === 'hat') {
      const row = nz > 0.6 ? 'brim' : (nz >= 0 ? 'front' : 'back');
      return `${row}_${nx < 0 ? 'L' : 'R'}`;
    }
    if (kindName === 'shoes') {
      const along = ctx.longAxisX ? nx : nz;
      const across = ctx.longAxisX ? nz : nx;
      const row = ny < 0.15 ? 'sole' : along > 0.4 ? 'toe' : along < -0.4 ? 'heel' : 'upper';
      return `${row}_${across < 0 ? 'L' : 'R'}`;
    }
    if (kindName === 'socks') {
      const row = ny > 0.85 ? 'cuff' : ny > 0.5 ? 'leg' : ny > 0.25 ? 'foot' : 'toe';
      return `${row}_${nx < 0 ? 'L' : 'R'}`;
    }
    // socks3: 양말 3켤레가 가로로 나란히
    const row = nz > 0.45 ? 'cuff' : nz < -0.45 ? 'toe' : 'foot';
    const col = nx < -0.33 ? 'S1' : nx > 0.33 ? 'S3' : 'S2';
    return `${row}_${col}`;
  }

  /* ---------- 3D (three.js: index.html 의 importmap 으로 불러와요) ---------- */
  const view = {
    THREE: null, GLTFLoader: null, OrbitControls: null,
    renderer: null, scene: null, camera: null, controls: null, raycaster: null,
    root: null, rootData: null, currentType: null, ready: false, failed: false, needsRender: true,
  };
  const modelCache = {};
  const modelFailed = {}; // 3D 파일을 불러오지 못한 옷 종류
  // 화면이 바뀔 때만 다시 그려요. (가만히 있을 때도 매 프레임 그리면 휴대폰이 뜨거워지고 느려져요)
  function requestRender() { view.needsRender = true; }
  // 휴대폰은 화면 픽셀이 많아서 2배로 그리면 버거워요. 1.5배면 눈으로는 차이가 거의 없어요.
  function screenPixelRatio() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1);
  }

  async function ensure3D() {
    if (view.ready) return true;
    if (view.failed) return false;
    try {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      view.THREE = THREE; view.GLTFLoader = GLTFLoader; view.OrbitControls = OrbitControls;

      const stage = $('create-3d');
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(screenPixelRatio());
      renderer.setClearColor(0xfbfaf6, 1);
      renderer.domElement.className = 'stage-gl';
      stage.insertBefore(renderer.domElement, stage.firstChild);

      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const key = new THREE.DirectionalLight(0xffffff, 1.0);
      key.position.set(2, 4, 3);
      scene.add(key);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
      camera.position.set(0, 0.6, 5.2);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 2.2;
      controls.maxDistance = 9;
      controls.addEventListener('change', requestRender);

      Object.assign(view, { renderer, scene, camera, controls, raycaster: new THREE.Raycaster(), ready: true });
      resizeView();
      window.addEventListener('resize', resizeView);
      renderer.domElement.addEventListener('pointerdown', onGLPointerDown);
      renderer.domElement.addEventListener('pointerup', onGLPointerUp);
      // OrbitControls 보다 먼저 받아서, 옷 위에서 칠할 때는 돌리기를 잠깐 꺼요.
      stage.addEventListener('pointerdown', onStagePointerDown, true);
      renderer.domElement.addEventListener('pointermove', onStagePointerMove);
      renderer.domElement.addEventListener('pointerup', onStagePointerEnd);
      renderer.domElement.addEventListener('pointercancel', onStagePointerEnd);
      renderer.domElement.addEventListener('webglcontextrestored', requestRender);
      (function loop() {
        requestAnimationFrame(loop);
        flushStroke();
        controls.update();
        if (!view.needsRender) return;
        view.needsRender = false;
        renderer.render(scene, camera);
      })();
      renderTools();
      return true;
    } catch (e) {
      view.failed = true;
      console.warn('3D 뷰어를 시작하지 못했습니다:', e);
      return false;
    }
  }

  function resizeView() {
    if (!view.renderer) return;
    const stage = $('create-3d');
    const w = stage.clientWidth || 600;
    const h = stage.clientHeight || 340;
    view.renderer.setSize(w, h, false);
    view.camera.aspect = w / h;
    view.camera.updateProjectionMatrix();
    requestRender();
  }

  // 모델 파일을 읽고, 모든 삼각형에 부위 이름을 붙여요.
  function prepareModel(THREE, gltfScene, typeKey) {
    gltfScene.updateMatrixWorld(true);
    const meshes = [];
    gltfScene.traverse(o => { if (o.isMesh) meshes.push(o); });
    const root = new THREE.Group();
    const box = new THREE.Box3();
    for (const m of meshes) {
      const g = m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      const flat = g.index ? g.toNonIndexed() : g;
      m.geometry = flat;
      m.position.set(0, 0, 0);
      m.quaternion.identity();
      m.scale.set(1, 1, 1);
      m.updateMatrix();
      m.updateMatrixWorld(true);
      flat.computeBoundingBox();
      box.union(flat.boundingBox);
      root.add(m);
    }
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const halfW = Math.max(size.x / 2, 1e-6), halfD = Math.max(size.z / 2, 1e-6), H = Math.max(size.y, 1e-6);
    const ctx = { longAxisX: size.x >= size.z };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    mat.onBeforeCompile = addBrushShader;
    for (const m of meshes) {
      const pos = m.geometry.attributes.position;
      const triCount = pos.count / 3;
      const keys = new Array(triCount);
      const colors = new Float32Array(pos.count * 3);
      const triNormals = new Float32Array(triCount * 3);
      for (let t = 0; t < triCount; t++) {
        const a = t * 3;
        const ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a);
        const bx = pos.getX(a + 1), by = pos.getY(a + 1), bz = pos.getZ(a + 1);
        const qx = pos.getX(a + 2), qy = pos.getY(a + 2), qz = pos.getZ(a + 2);
        const cx = (ax + bx + qx) / 3, cy = (ay + by + qy) / 3, cz = (az + bz + qz) / 3;
        keys[t] = classify(typeKey, (cx - center.x) / halfW, (cy - box.min.y) / H, (cz - center.z) / halfD, ctx);
        // 브러시가 옷 반대편(뒷면)까지 번지지 않도록 면 방향을 기억해요.
        const ux = bx - ax, uy = by - ay, uz = bz - az, vx = qx - ax, vy = qy - ay, vz = qz - az;
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1;
        triNormals[a] = nx / len; triNormals[a + 1] = ny / len; triNormals[a + 2] = nz / len;
      }
      m.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      m.material = mat;
      m.userData.triKeys = keys;
      m.userData.colors = colors;
      m.userData.triNormals = triNormals;
      // 브러시 자국: 꼭짓점마다 덮은 정도(0~1, 붓 가장자리로 갈수록 옅음)와 그 정도를 곱한 색을 둬요.
      const paintA = new Float32Array(pos.count);
      const paintC = new Float32Array(pos.count * 3);
      m.geometry.setAttribute('paintAlpha', new THREE.BufferAttribute(paintA, 1));
      m.geometry.setAttribute('paintColor', new THREE.BufferAttribute(paintC, 3));
      m.userData.paintA = paintA;
      m.userData.paintC = paintC;
      m.userData.grid = buildGrid(m.geometry);
    }
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    return { root, meshes, scale: 2.0 / maxDim, center };
  }

  function loadGLB(file, typeKey) {
    const { GLTFLoader, THREE } = view;
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(MODEL_BASE + file, gltf => {
        try { resolve(prepareModel(THREE, gltf.scene, typeKey)); } catch (e) { reject(e); }
      }, undefined, reject);
    });
  }

  /* 브러시 자국 그리기: 꼭짓점의 '덮은 정도'를 면 안에서 이어 붙인 뒤, 그 값이 절반쯤 되는 곳을
     테두리로 삼아 화면 픽셀 단위로 매끄럽게 잘라요. 옷 삼각형 모양이 테두리에 비치지 않아요. */
  function addBrushShader(shader) {
    shader.vertexShader = shader.vertexShader
      .replace('#include <color_pars_vertex>', `#include <color_pars_vertex>
        attribute float paintAlpha;
        attribute vec3 paintColor;
        varying float vPaintAlpha;
        varying vec3 vPaintColor;`)
      .replace('#include <color_vertex>', `#include <color_vertex>
        vPaintAlpha = paintAlpha;
        vPaintColor = paintColor;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <color_pars_fragment>', `#include <color_pars_fragment>
        varying float vPaintAlpha;
        varying vec3 vPaintColor;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vPaintAlpha > 0.001) {
          float edge = fwidth(vPaintAlpha) * 0.8 + 0.03;
          float k = smoothstep(0.42 - edge, 0.42 + edge, vPaintAlpha);
          diffuseColor.rgb = mix(diffuseColor.rgb, vPaintColor / vPaintAlpha, k);
        }`);
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  // 지금 채워진 색으로 모델의 부위 색을 다시 칠해요.
  function paintModel() {
    if (!view.rootData) return;
    const defaultRgb = hexToRgb(DEFAULT_FABRIC_COLOR);
    for (const m of view.rootData.meshes) {
      const { triKeys: keys, colors } = m.userData;
      for (let t = 0; t < keys.length; t++) {
        const fill = st.regions[keys[t]];
        const rgb = fill ? hexToRgb(fill.color) : defaultRgb;
        for (let k = 0; k < 3; k++) {
          const i = (t * 3 + k) * 3;
          colors[i] = rgb[0]; colors[i + 1] = rgb[1]; colors[i + 2] = rgb[2];
        }
      }
      m.geometry.attributes.color.needsUpdate = true;
    }
    requestRender();
  }

  /* ---------- 빠른 찾기용 격자 ----------
     옷 하나에 꼭짓점이 수십만 개라, 붓을 찍거나 누른 곳을 찾을 때마다 전부 훑으면 휴대폰이 버벅여요.
     모델을 불러올 때 공간을 작은 칸으로 나눠 칸마다 들어 있는 꼭짓점·삼각형 번호를 적어 두고,
     필요한 칸만 살펴봐요. (counting sort 로 칸 순서대로 이어 붙여서 배열 두 개로 둬요) */
  const GRID_RES = 40;
  function buildGrid(geometry) {
    const attr = geometry.attributes.position;
    const n = attr.count;
    let P = attr.array;
    if (attr.isInterleavedBufferAttribute || attr.normalized || attr.itemSize !== 3) {
      P = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) { P[v * 3] = attr.getX(v); P[v * 3 + 1] = attr.getY(v); P[v * 3 + 2] = attr.getZ(v); }
    }
    const bb = geometry.boundingBox;
    const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
    const cell = Math.max(sx, sy, sz, 1e-6) / GRID_RES;
    const pad = cell * 1e-3;
    const ox = bb.min.x - pad, oy = bb.min.y - pad, oz = bb.min.z - pad;
    const nx = Math.max(1, Math.ceil((sx + 2 * pad) / cell));
    const ny = Math.max(1, Math.ceil((sy + 2 * pad) / cell));
    const nz = Math.max(1, Math.ceil((sz + 2 * pad) / cell));
    const inv = 1 / cell;
    const cells = nx * ny * nz;
    const ci = (x, X) => { const i = Math.floor(x); return i < 0 ? 0 : i >= X ? X - 1 : i; };
    // 꼭짓점: 칸 하나에만 들어가요.
    const vCell = new Int32Array(n);
    const vStart = new Int32Array(cells + 1);
    for (let v = 0; v < n; v++) {
      const c = ci((P[v * 3] - ox) * inv, nx) + nx * (ci((P[v * 3 + 1] - oy) * inv, ny) + ny * ci((P[v * 3 + 2] - oz) * inv, nz));
      vCell[v] = c; vStart[c + 1]++;
    }
    for (let c = 0; c < cells; c++) vStart[c + 1] += vStart[c];
    const vList = new Int32Array(n);
    const fill = vStart.slice(0, cells);
    for (let v = 0; v < n; v++) vList[fill[vCell[v]]++] = v;
    // 삼각형: 삼각형을 감싸는 상자가 걸치는 칸마다 들어가요.
    const triCount = (n / 3) | 0;
    const tStart = new Int32Array(cells + 1);
    const forTriCells = (t, fn) => {
      const a = t * 9;
      const x0 = Math.min(P[a], P[a + 3], P[a + 6]), x1 = Math.max(P[a], P[a + 3], P[a + 6]);
      const y0 = Math.min(P[a + 1], P[a + 4], P[a + 7]), y1 = Math.max(P[a + 1], P[a + 4], P[a + 7]);
      const z0 = Math.min(P[a + 2], P[a + 5], P[a + 8]), z1 = Math.max(P[a + 2], P[a + 5], P[a + 8]);
      const ix0 = ci((x0 - ox) * inv - 1e-4, nx), ix1 = ci((x1 - ox) * inv + 1e-4, nx);
      const iy0 = ci((y0 - oy) * inv - 1e-4, ny), iy1 = ci((y1 - oy) * inv + 1e-4, ny);
      const iz0 = ci((z0 - oz) * inv - 1e-4, nz), iz1 = ci((z1 - oz) * inv + 1e-4, nz);
      for (let iz = iz0; iz <= iz1; iz++) for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) fn(ix + nx * (iy + ny * iz));
    };
    for (let t = 0; t < triCount; t++) forTriCells(t, c => { tStart[c + 1]++; });
    for (let c = 0; c < cells; c++) tStart[c + 1] += tStart[c];
    const tList = new Int32Array(tStart[cells]);
    const tFill = tStart.slice(0, cells);
    for (let t = 0; t < triCount; t++) forTriCells(t, c => { tList[tFill[c]++] = t; });
    return { P, ox, oy, oz, cell, inv, nx, ny, nz, vStart, vList, tStart, tList };
  }

  // 격자를 따라 광선이 지나가는 칸만 살펴서 가장 가까운 삼각형을 찾아요. (모델 좌표, 양면 모두 맞음)
  function rayGrid(g, o, d) {
    const { P, ox, oy, oz, cell, nx, ny, nz, tStart, tList } = g;
    // 격자 상자와 만나는 구간
    let t0 = 0, t1 = Infinity;
    const lo = [ox, oy, oz], dims = [nx, ny, nz], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
    for (let k = 0; k < 3; k++) {
      const hi = lo[k] + dims[k] * cell;
      if (Math.abs(dd[k]) < 1e-12) { if (oo[k] < lo[k] || oo[k] > hi) return null; continue; }
      let a = (lo[k] - oo[k]) / dd[k], b = (hi - oo[k]) / dd[k];
      if (a > b) { const tmp = a; a = b; b = tmp; }
      if (a > t0) t0 = a;
      if (b < t1) t1 = b;
      if (t0 > t1) return null;
    }
    const idx = [0, 0, 0], step = [0, 0, 0], tMax = [Infinity, Infinity, Infinity], tDelta = [Infinity, Infinity, Infinity];
    for (let k = 0; k < 3; k++) {
      const x = (oo[k] + dd[k] * t0 - lo[k]) / cell;
      idx[k] = Math.min(dims[k] - 1, Math.max(0, Math.floor(x)));
      if (dd[k] > 1e-12) { step[k] = 1; tMax[k] = (lo[k] + (idx[k] + 1) * cell - oo[k]) / dd[k]; tDelta[k] = cell / dd[k]; }
      else if (dd[k] < -1e-12) { step[k] = -1; tMax[k] = (lo[k] + idx[k] * cell - oo[k]) / dd[k]; tDelta[k] = -cell / dd[k]; }
    }
    let best = Infinity, bestT = -1;
    for (;;) {
      const c = idx[0] + nx * (idx[1] + ny * idx[2]);
      for (let k = tStart[c], end = tStart[c + 1]; k < end; k++) {
        const t = tList[k], a = t * 9;
        const e1x = P[a + 3] - P[a], e1y = P[a + 4] - P[a + 1], e1z = P[a + 5] - P[a + 2];
        const e2x = P[a + 6] - P[a], e2y = P[a + 7] - P[a + 1], e2z = P[a + 8] - P[a + 2];
        const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-14) continue;
        const id = 1 / det;
        const sx = o.x - P[a], sy = o.y - P[a + 1], sz = o.z - P[a + 2];
        const u = (sx * px + sy * py + sz * pz) * id;
        if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const w = (d.x * qx + d.y * qy + d.z * qz) * id;
        if (w < 0 || u + w > 1) continue;
        const dist = (e2x * qx + e2y * qy + e2z * qz) * id;
        if (dist > 1e-9 && dist < best) { best = dist; bestT = t; }
      }
      const k = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
      // 지금 칸을 벗어나기 전에 맞았다면 그보다 가까운 삼각형은 더 없어요.
      if (best <= tMax[k] || tMax[k] > t1) break;
      idx[k] += step[k];
      if (idx[k] < 0 || idx[k] >= dims[k]) break;
      tMax[k] += tDelta[k];
    }
    return bestT < 0 ? null : { t: best, tri: bestT };
  }

  // 지금 보고 있지 않고 칠한 자국도 없는 옷은 메모리에서 내려요. (다시 고르면 새로 불러와요)
  // 여러 옷을 계속 열어 두면 휴대폰 브라우저가 메모리가 모자라 페이지를 닫아 버려요.
  function evictUnusedModels(keep) {
    for (const key of Object.keys(modelCache)) {
      const p = modelCache[key];
      if (p === keep || p.meshes.some(m => m.userData.paintA.some(a => a > 0))) continue;
      for (const m of p.meshes) { m.geometry.dispose(); m.userData.grid = null; }
      if (p.meshes[0]) p.meshes[0].material.dispose();
      if (p.tryonMaterial) p.tryonMaterial.dispose();
      delete modelCache[key];
    }
  }

  function attachModel(prepared) {
    if (view.root) view.scene.remove(view.root);
    view.root = prepared.root;
    view.rootData = prepared;
    const s = prepared.scale;
    view.root.scale.setScalar(s);
    view.root.position.set(-prepared.center.x * s, -prepared.center.y * s, -prepared.center.z * s);
    view.scene.add(view.root);
    paintModel();
    evictUnusedModels(prepared);
  }
  function detachModel() {
    if (view.root) view.scene.remove(view.root);
    view.root = null;
    view.rootData = null;
    requestRender();
  }

  // 화면에서 누른 곳 아래에 있는 옷 삼각형을 찾아요.
  function hitModel(clientX, clientY) {
    if (!view.root) return null;
    const r = view.renderer.domElement.getBoundingClientRect();
    const ndc = new view.THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    view.raycaster.setFromCamera(ndc, view.camera);
    const THREE = view.THREE;
    const ray = view.raycaster.ray;
    let best = null;
    for (const m of view.root.children) {
      const { grid, triKeys, triNormals } = m.userData;
      if (!grid || !triKeys) continue;
      const local = ray.clone().applyMatrix4(new THREE.Matrix4().copy(m.matrixWorld).invert());
      const r = rayGrid(grid, local.origin, local.direction);
      if (!r) continue;
      const point = local.at(r.t, new THREE.Vector3()).applyMatrix4(m.matrixWorld);
      const distance = point.distanceTo(ray.origin);
      if (best && best.distance <= distance) continue;
      const j = r.tri * 3;
      best = { object: m, point, distance, faceIndex: r.tri, face: { normal: new THREE.Vector3(triNormals[j], triNormals[j + 1], triNormals[j + 2]) } };
    }
    return best;
  }
  // 모델 위에서 눌린 삼각형의 부위 이름을 찾아요.
  function pickRegion(clientX, clientY) {
    const h = hitModel(clientX, clientY);
    return h ? h.object.userData.triKeys[h.faceIndex] : null;
  }

  let downAt = null;
  function onGLPointerDown(e) { downAt = { x: e.clientX, y: e.clientY }; }
  function onGLPointerUp(e) {
    if (!downAt || st.tool !== 'fill') { downAt = null; return; }
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return; // 돌리기(드래그)였으면 채우지 않아요
    const key = pickRegion(e.clientX, e.clientY);
    if (key) onRegionTap(key);
    else status('옷 부분을 눌러야 채워집니다.');
  }

  // 3D 모델이 없을 때는 빈 칸 배경만 보여줘요.
  function showModelFor(typeKey) {
    view.currentType = typeKey;
    const file = MODEL_FILES[typeKey];
    const loading = $('create-loading');
    if (!file) {
      detachModel(); setGLVisible(false); loading.hidden = true;
      return;
    }
    ensure3D().then(async ok => {
      if (!ok) { detachModel(); setGLVisible(false); loading.hidden = false; loading.textContent = '3D를 쓸 수 없어 칸으로 채웁니다.'; return; }
      setGLVisible(true);
      if (modelCache[typeKey]) { if (view.currentType === typeKey) attachModel(modelCache[typeKey]); return; }
      loading.hidden = false; loading.textContent = '3D 옷을 불러오는 중...';
      try {
        const prepared = await loadGLB(file, typeKey);
        modelCache[typeKey] = prepared;
        if (view.currentType === typeKey) attachModel(prepared);
        loading.hidden = true;
      } catch (e) {
        console.warn('모델을 불러오지 못했습니다:', file, e);
        modelFailed[typeKey] = true;
        detachModel(); setGLVisible(false);
        loading.hidden = false; loading.textContent = '이 옷의 3D 파일을 불러오지 못해 칸으로 채웁니다.';
      }
    });
  }
  function setGLVisible(on) {
    if (view.renderer) view.renderer.domElement.hidden = !on;
    if (!on) detachModel();
    requestRender();
  }
  function applyToolToStage() {
    const painting = st.tool === 'brush' || st.tool === 'eraser';
    if (view.renderer) view.renderer.domElement.classList.toggle('painting', painting);
  }

  /* ---------- 브러시: 3D 옷 표면에 바로 칠해요 ----------
     붓 가운데는 진하고 가장자리로 갈수록 옅은 '덮은 정도'를 꼭짓점마다 쌓아요. (테두리는 addBrushShader 가 매끄럽게 잘라요)
     한 번 긋는 동안 같은 자리에 여러 번 찍혀도 진해지지 않도록, 긋기 전 값을 기억해 두고
     그 위에 이번 획에서 가장 진했던 만큼만 덮어요. 색은 덮은 정도를 곱한 값으로 둬서 겹쳐 칠해도 자연스럽게 섞여요. */
  let stroke = null; // { id, last: 직전에 칠한 점(모델 좌표), touched: Map(mesh → Map(꼭짓점 → 긋기 전 값)) }
  const rgbCache = {};
  const rgbOf = hex => rgbCache[hex] || (rgbCache[hex] = hexToRgb(hex));
  const BRUSH_REACH = 1.9; // 옅은 가장자리까지 포함한 붓 반경 (보이는 굵기는 이것의 절반쯤)
  const smooth01 = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const brushStrength = d => smooth01(1 - d);

  // 모델 좌표 p 둘레 radius 안, 법선 n 과 같은 쪽을 향한 면의 꼭짓점을 칠하거나 지워요.
  function stampPaint(p, n, radius, erase) {
    const r2 = radius * radius;
    const brush = rgbOf(st.color);
    let changed = false;
    for (const m of view.rootData.meshes) {
      const { triNormals: tn, paintA, paintC, grid } = m.userData;
      const { P, ox, oy, oz, inv, nx, ny, nz, vStart, vList } = grid;
      let touched = stroke.touched.get(m);
      if (!touched) { touched = new Map(); stroke.touched.set(m, touched); }
      let meshChanged = false;
      // 붓 둘레가 걸치는 칸의 꼭짓점만 살펴요.
      const ix0 = Math.max(0, Math.floor((p.x - radius - ox) * inv)), ix1 = Math.min(nx - 1, Math.floor((p.x + radius - ox) * inv));
      const iy0 = Math.max(0, Math.floor((p.y - radius - oy) * inv)), iy1 = Math.min(ny - 1, Math.floor((p.y + radius - oy) * inv));
      const iz0 = Math.max(0, Math.floor((p.z - radius - oz) * inv)), iz1 = Math.min(nz - 1, Math.floor((p.z + radius - oz) * inv));
      for (let iz = iz0; iz <= iz1; iz++) for (let iy = iy0; iy <= iy1; iy++) {
       const row = nx * (iy + ny * iz);
       for (let k = vStart[row + ix0], kEnd = vStart[row + ix1 + 1]; k < kEnd; k++) {
        const v = vList[k];
        const dx = P[v * 3] - p.x, dy = P[v * 3 + 1] - p.y, dz = P[v * 3 + 2] - p.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= r2) continue;
        const j = ((v / 3) | 0) * 3;
        if (tn[j] * n.x + tn[j + 1] * n.y + tn[j + 2] * n.z < 0.2) continue;
        const s = brushStrength(Math.sqrt(d2) / radius);
        const i = v * 3;
        let prev = touched.get(v);
        if (!prev) { prev = { a: paintA[v], r: paintC[i], g: paintC[i + 1], b: paintC[i + 2], s: 0 }; touched.set(v, prev); }
        if (s <= prev.s) continue;
        prev.s = s;
        if (erase && prev.a <= 0) continue;
        if (erase) {
          const keep = 1 - s;
          paintA[v] = prev.a * keep;
          paintC[i] = prev.r * keep; paintC[i + 1] = prev.g * keep; paintC[i + 2] = prev.b * keep;
        } else {
          // 덮은 정도는 부드럽게 쌓고, 다른 색 위에 칠할 때 색 바뀜은 붓 테두리 근처에서 또렷하게 바꿔요.
          // (색까지 부드럽게 섞으면 두 색이 만나는 곳이 뭉개져 보여요)
          const a = prev.a + s * (1 - prev.a);
          const w = 1 - (1 - smooth01((s - 0.2) / 0.4)) * Math.min(1, prev.a / 0.42);
          const pa = prev.a || 1;
          paintA[v] = a;
          paintC[i] = (prev.r / pa + (brush[0] - prev.r / pa) * w) * a;
          paintC[i + 1] = (prev.g / pa + (brush[1] - prev.g / pa) * w) * a;
          paintC[i + 2] = (prev.b / pa + (brush[2] - prev.b / pa) * w) * a;
        }
        if (paintA[v] < 0.01) { paintA[v] = 0; paintC[i] = paintC[i + 1] = paintC[i + 2] = 0; }
        meshChanged = true;
       }
      }
      if (meshChanged) {
        m.geometry.attributes.paintAlpha.needsUpdate = true;
        m.geometry.attributes.paintColor.needsUpdate = true;
        changed = true;
      }
    }
    return changed;
  }

  // 누른 곳(과 좌우 대칭 자리)을 칠하고, 빠르게 그어도 끊기지 않도록 직전 점과 사이를 메워요.
  function paintHit(h) {
    const THREE = view.THREE;
    const p = h.object.worldToLocal(h.point.clone());
    const n = h.face.normal;
    const radius = st.brush * 2 * BRUSH_REACH / view.rootData.scale;
    const erase = st.tool === 'eraser';
    const from = stroke.last || p;
    const steps = Math.max(1, Math.ceil(from.distanceTo(p) / (radius * 0.25)));
    const cx = view.rootData.center.x;
    let changed = false;
    for (let s = 1; s <= steps; s++) {
      const q = new THREE.Vector3().lerpVectors(from, p, s / steps);
      if (stampPaint(q, n, radius, erase)) changed = true;
      if (st.mirror && stampPaint({ x: 2 * cx - q.x, y: q.y, z: q.z }, { x: -n.x, y: n.y, z: n.z }, radius, erase)) changed = true;
    }
    stroke.last = p;
    if (changed) requestRender();
    if (changed && !erase && !st.hasPaint) { st.hasPaint = true; renderQuote(); }
  }

  /* ---------- 내가 만든 옷 내려받기 (.glb) ----------
     부위 색과 브러시 자국을 꼭짓점 색(COLOR_0)으로 구워 넣어서, 다른 3D 프로그램에서도 화면과 같은 색으로 보여요.
     브러시 테두리는 화면(addBrushShader)과 같은 기준으로 자르고, 같은 꼭짓점은 합쳐서 파일 크기를 줄여요. */
  function canExportDesign() { return !!view.rootData; }
  async function exportDesignGlb() {
    if (!view.rootData) throw new Error('not-ready');
    const THREE = view.THREE;
    const [{ GLTFExporter }, { mergeVertices }] = await Promise.all([
      import('three/addons/exporters/GLTFExporter.js'),
      import('three/addons/utils/BufferGeometryUtils.js'),
    ]);
    const label = TYPES[st.typeKey].label;
    const group = new THREE.Group();
    group.name = label;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    for (const m of view.rootData.meshes) {
      const { colors, paintA, paintC } = m.userData;
      const baked = new Float32Array(colors.length);
      for (let v = 0; v < paintA.length; v++) {
        const a = paintA[v];
        const k = a > 0 ? smooth01((a - 0.34) / 0.16) : 0;
        for (let c = 0; c < 3; c++) {
          const i = v * 3 + c;
          baked[i] = k ? colors[i] + (paintC[i] / a - colors[i]) * k : colors[i];
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', m.geometry.attributes.position.clone());
      g.setAttribute('color', new THREE.BufferAttribute(baked, 3));
      const mesh = new THREE.Mesh(mergeVertices(g), mat);
      mesh.name = label;
      group.add(mesh);
    }
    const glb = await new GLTFExporter().parseAsync(group, { binary: true });
    const url = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `UNEXPOSED-${st.typeKey}.glb`; // 파일 이름에 한글이 있으면 'download'로 바뀌는 브라우저가 있어서 영어로 써요.
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return label;
  }
  // 스튜디오 버튼·커뮤니티 3D 창(community-glb.js)이 같이 써요. 결과는 상태 문구로 알려줘요.
  async function downloadDesignGlb() {
    if (!canExportDesign()) { status('3D 옷이 아직 준비되지 않았습니다. 3D 옷이 보일 때 다시 눌러주세요.'); return false; }
    const btn = $('export-glb-btn');
    if (btn) btn.disabled = true;
    status('3D 파일을 만드는 중...');
    try {
      const label = await exportDesignGlb();
      status([label, ' 3D 파일(.glb)을 내려받았습니다.']);
      return true;
    } catch (e) {
      console.warn('3D 파일을 만들지 못했습니다:', e);
      status('3D 파일을 만들지 못했습니다.');
      return false;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /* ---------- 주문용 그림 이미지: 칠한 옷을 앞·뒤·왼쪽·오른쪽에서 찍어요 ---------- */
  // 왼쪽(-x)·오른쪽(+x)은 부위 이름의 왼쪽·오른쪽과 같은 방향이에요. (server.js 의 DESIGN_PHOTO_VIEWS 와 같아야 해요)
  const DESIGN_VIEWS = [
    { key: 'front', label: '앞', dir: [0, 0, 1] },
    { key: 'back', label: '뒤', dir: [0, 0, -1] },
    { key: 'left', label: '왼쪽', dir: [-1, 0, 0] },
    { key: 'right', label: '오른쪽', dir: [1, 0, 0] },
  ];
  const SHOT_W = 420, SHOT_H = 480;
  let shot = null; // { renderer, camera } — 화면 3D와 따로 쓰는 작은 촬영용 렌더러
  function captureDesignViews() {
    if (!st.hasPaint || !view.root) return null;
    try {
      const THREE = view.THREE;
      if (!shot) {
        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.setSize(SHOT_W, SHOT_H, false);
        renderer.setClearColor(0xfbfaf6, 1);
        shot = { renderer, camera: new THREE.PerspectiveCamera(32, SHOT_W / SHOT_H, 0.05, 100) };
      }
      const { renderer, camera } = shot;
      const box = new THREE.Box3().setFromObject(view.root);
      const size = new THREE.Vector3(); box.getSize(size);
      const center = new THREE.Vector3(); box.getCenter(center);
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const tanH = tanV * camera.aspect;
      const out = {};
      for (const v of DESIGN_VIEWS) {
        const sideways = v.dir[0] !== 0;
        const halfW = (sideways ? size.z : size.x) / 2, depth = (sideways ? size.x : size.z) / 2;
        const dist = Math.max(size.y / 2 / tanV, halfW / tanH) * 1.12 + depth;
        camera.position.set(center.x + v.dir[0] * dist, center.y + v.dir[1] * dist, center.z + v.dir[2] * dist);
        camera.lookAt(center);
        renderer.render(view.scene, camera);
        out[v.key] = renderer.domElement.toDataURL('image/jpeg', 0.85);
      }
      return out;
    } catch (e) {
      console.warn('그림 이미지를 만들지 못했습니다:', e);
      return null;
    }
  }

  function anyPaint() {
    for (const prepared of Object.values(modelCache)) {
      for (const m of prepared.meshes) if (m.userData.paintA.some(a => a > 0.42)) return true;
    }
    return false;
  }

  // 옷 위를 누르면 칠하고, 옷 바깥을 누르면 평소처럼 돌려볼 수 있어요.
  function onStagePointerDown(e) {
    if (st.tool !== 'brush' && st.tool !== 'eraser') return;
    if (!view.rootData || stroke) return;
    const h = hitModel(e.clientX, e.clientY);
    view.controls.enabled = !h;
    if (!h) return;
    stroke = { id: e.pointerId, last: null, touched: new Map() };
    pendingMove = null;
    view.renderer.domElement.setPointerCapture(e.pointerId);
    paintHit(h);
  }
  // 휴대폰은 1초에 터치 신호를 60~120번 보내요. 올 때마다 칠하면 계산이 밀려 늦게 칠해지니,
  // 가장 최근 위치만 기억했다가 화면을 그리기 직전에 한 번만 칠해요. (사이는 paintHit 이 메워요)
  let pendingMove = null;
  function onStagePointerMove(e) {
    if (!stroke || e.pointerId !== stroke.id) return;
    pendingMove = { x: e.clientX, y: e.clientY };
  }
  function flushStroke() {
    if (!pendingMove) return;
    const { x, y } = pendingMove;
    pendingMove = null;
    if (!stroke || !view.rootData) return;
    const h = hitModel(x, y);
    if (h) paintHit(h); else stroke.last = null;
  }
  function onStagePointerEnd(e) {
    if (!stroke || e.pointerId !== stroke.id) return;
    flushStroke();
    stroke = null;
    view.controls.enabled = true;
    if (st.tool === 'eraser' && st.hasPaint && !anyPaint()) { st.hasPaint = false; renderQuote(); }
  }

  function clearPaint() {
    for (const prepared of Object.values(modelCache)) {
      for (const m of prepared.meshes) {
        m.userData.paintA.fill(0);
        m.userData.paintC.fill(0);
        m.geometry.attributes.paintAlpha.needsUpdate = true;
        m.geometry.attributes.paintColor.needsUpdate = true;
      }
    }
    st.hasPaint = false;
    paintModel();
  }

  /* ---------- 화면 그리기 ---------- */
  function renderTypes() {
    document.querySelectorAll('#type-row .type-chip').forEach(b => b.classList.toggle('active', b.dataset.type === st.typeKey));
  }
  function renderSizes() {
    const kind = kindOf(st.typeKey);
    $('length-label').textContent = `${kind.size[0]} 배율`;
    $('girth-label').textContent = `${kind.size[1]} 배율`;
    $('length-input').value = st.lengthMul;
    $('girth-input').value = st.girthMul;
  }
  function renderFabrics() {
    document.querySelectorAll('#fabric-row .fabric-chip').forEach(b => b.classList.toggle('active', b.dataset.fabric === st.fabric));
  }
  function renderColors() {
    document.querySelectorAll('#color-row .swatch-btn').forEach(b => b.classList.toggle('active', b.dataset.color.toLowerCase() === st.color.toLowerCase()));
    const picker = $('color-row').querySelector('input[type=color]');
    if (picker) picker.value = st.color;
  }
  function renderTools() {
    document.querySelectorAll('#tool-row .tool-chip').forEach(b => b.classList.toggle('active', b.dataset.tool === st.tool));
    $('brush-size-row').hidden = st.tool !== 'brush';
    $('mirror-toggle').checked = st.mirror;
    const has3D = !!(view.renderer && !view.failed && MODEL_FILES[st.typeKey]);
    let hint;
    if (st.tool === 'brush') hint = has3D ? '옷 위를 드래그하면 그 자리에 바로 칠해집니다 · 옷 바깥을 드래그하면 돌려볼 수 있습니다' : '브러시는 3D 옷 위에서만 쓸 수 있습니다';
    else if (st.tool === 'eraser') hint = has3D ? '옷 위를 드래그하면 브러시 자국이 지워지고, 아래 부위 칸을 누르면 그 부위 색이 지워집니다' : '아래 부위 칸을 누르면 그 부위 색이 지워집니다';
    else hint = has3D ? '드래그해서 돌려볼 수 있고, 옷을 누르면 그 부위가 채워집니다' : '아래 부위 칸을 누르면 지금 고른 원단·색으로 채워집니다';
    $('viewer-hint').textContent = hint;
    applyToolToStage();
  }
  function renderRegions() {
    const kind = kindOf(st.typeKey);
    $('region-grid').innerHTML = '';
    for (const key of regionKeys(kind)) {
      const fill = st.regions[key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'region-tile' + (fill ? ' filled' : '');
      b.dataset.key = key;
      if (fill) {
        b.style.background = fill.color;
        b.style.color = isDark(fill.color) ? '#FBFAF6' : '#14201E';
        b.innerHTML = `${regionLabel(kind, key)}<small>${FABRICS[fill.fabric].name} · ${fill.color}</small>`;
      } else {
        b.textContent = regionLabel(kind, key);
      }
      $('region-grid').appendChild(b);
    }
    paintModel();
  }
  function isDark(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
  }
  function renderFinish() {
    document.querySelectorAll('#create-finish-choices .calc-chip').forEach(b => {
      b.classList.toggle('active', Number(b.dataset.finish) === st.finishAmount);
    });
    $('create-finish-note').hidden = st.finishAmount !== FINISH_PREMIUM;
  }
  function renderQty() {
    $('create-qty-value').textContent = String(st.quantity);
  }
  function renderQuote() {
    const e = estimate(snapshot(), st.finishAmount);
    const lines = [
      `원단: ${TIER[e.fabric]}${e.fabric ? ' · +' + won(e.fabric) : ''}`,
      `브러시 그림: ${e.paint ? '+' + won(e.paint) : '없음'}`,
      `옵션: ${st.finishAmount === FINISH_PREMIUM ? 'Premium · +' + won(FINISH_PREMIUM) : 'Lite · 패턴 PDF만'}`,
      `1벌 추가 금액 ${won(e.unit)} × ${st.quantity}벌 = ${won(e.unit * st.quantity)}`,
    ];
    $('create-quote').innerHTML = lines.join('<br>') +
      '<br><span style="font-size:11.5px;color:var(--ink-soft)">결제 금액은 주문 확정 때 서버가 1벌 가격 × 수량으로 다시 계산합니다.</span>';
  }
  function renderAll() {
    renderTypes(); renderSizes(); renderFabrics(); renderColors(); renderTools();
    renderRegions(); renderFinish(); renderQty(); renderQuote(); renderBadge();
  }

  /* ---------- 옷 종류·치수·원단·색 바꾸기 ---------- */
  function resetDesign() {
    st.regions = {};
    st.lengthMul = 1;
    st.girthMul = 1;
    clearPaint();
  }
  function chooseType(key) {
    if (st.typeKey !== key) resetDesign();
    st.typeKey = key;
    st.tool = 'fill';
    status(`${TYPES[key].label} 선택 · 옷이나 부위 칸을 누르면 채워집니다`);
    showModelFor(key);
    renderAll();
  }
  function clampNum(v, lo, hi) {
    const n = Number(v);
    if (!isFinite(n)) return 1;
    return Math.min(hi, Math.max(lo, n));
  }

  /* ---------- 처음 화면 만들기 ---------- */
  function buildStatic() {
    const typeRow = $('type-row');
    typeRow.innerHTML = '';
    for (const [key, t] of Object.entries(TYPES)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'type-chip'; b.dataset.type = key; b.textContent = t.label;
      b.addEventListener('click', () => chooseType(key));
      typeRow.appendChild(b);
    }
    const fabricRow = $('fabric-row');
    fabricRow.innerHTML = '';
    for (const [key, f] of Object.entries(FABRICS)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'fabric-chip'; b.dataset.fabric = key;
      b.textContent = f.amount ? `${f.name} (+${f.amount.toLocaleString('ko-KR')}원)` : f.name;
      b.addEventListener('click', () => { st.fabric = key; status(`${f.name} 원단 선택`); renderFabrics(); });
      fabricRow.appendChild(b);
    }
    const colorRow = $('color-row');
    colorRow.innerHTML = '';
    for (const hex of PALETTE) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch-btn'; b.dataset.color = hex; b.style.background = hex;
      b.addEventListener('click', () => { st.color = hex; renderColors(); });
      colorRow.appendChild(b);
    }
    const picker = document.createElement('input');
    picker.type = 'color'; picker.value = st.color; picker.title = '직접 고르기';
    picker.addEventListener('input', () => { st.color = picker.value; renderColors(); });
    colorRow.appendChild(picker);
  }

  function bindEvents() {
    $('create-modal-close').addEventListener('click', () => { stopScanCamera(); closeTryon(); $('create-modal').hidden = true; });
    $('cart-open-btn').addEventListener('click', () => { renderCart(); $('cart-modal').hidden = false; });
    $('cart-close-btn').addEventListener('click', () => { $('cart-modal').hidden = true; });
    $('create-order-cancel-btn').addEventListener('click', () => { $('create-order-modal').hidden = true; pending = null; });

    document.querySelectorAll('#tool-row .tool-chip').forEach(b => b.addEventListener('click', () => {
      st.tool = b.dataset.tool; renderTools();
    }));
    $('brush-size').addEventListener('input', e => { st.brush = Number(e.target.value); });
    $('mirror-toggle').addEventListener('change', e => { st.mirror = e.target.checked; renderTools(); });

    $('length-input').addEventListener('change', e => { st.lengthMul = clampNum(e.target.value, 0.6, 1.6); renderSizes(); renderQuote(); });
    $('girth-input').addEventListener('change', e => { st.girthMul = clampNum(e.target.value, 0.7, 1.5); renderSizes(); renderQuote(); });

    $('region-grid').addEventListener('click', e => {
      const b = e.target.closest('.region-tile');
      if (b) onRegionTap(b.dataset.key);
    });
    $('fill-all-btn').addEventListener('click', () => {
      const kind = kindOf(st.typeKey);
      for (const key of regionKeys(kind)) setRegion(key, { fabric: st.fabric, color: st.color });
      status('전체를 채웠습니다.');
      renderRegions(); renderQuote();
    });
    $('clear-paint-btn').addEventListener('click', () => { clearPaint(); status('브러시 자국을 지웠습니다.'); renderQuote(); });
    $('export-glb-btn').addEventListener('click', downloadDesignGlb);
    $('reset-btn').addEventListener('click', () => { resetDesign(); status('이 옷을 처음 상태로 되돌렸습니다.'); renderAll(); });

    document.querySelectorAll('#create-finish-choices .calc-chip').forEach(b => b.addEventListener('click', () => {
      st.finishAmount = Number(b.dataset.finish); renderFinish(); renderQuote();
    }));
    document.querySelectorAll('#create-qty-stepper button').forEach(b => b.addEventListener('click', () => {
      st.quantity = Math.min(MAX_QTY, Math.max(1, st.quantity + Number(b.dataset.qty)));
      renderQty(); renderQuote();
    }));

    $('create-tryon-btn').addEventListener('click', openTryon);
    $('tryon-close-btn').addEventListener('click', closeTryon);
    $('tryon-back-btn').addEventListener('click', closeTryon);
    $('tryon-order-btn').addEventListener('click', () => { closeTryon(); $('create-order-open-btn').click(); });
    $('tryon-view-btn').addEventListener('click', () => { tryon.closeView = !tryon.closeView; frameTryon(); });
    $('tryon-spin-btn').addEventListener('click', e => {
      tryon.controls.autoRotate = !tryon.controls.autoRotate;
      e.currentTarget.classList.toggle('active', tryon.controls.autoRotate);
    });

    $('cart-add-btn').addEventListener('click', addToCart);
    $('create-order-open-btn').addEventListener('click', () => {
      openOrder('single', [{ label: TYPES[st.typeKey].label, studio: snapshot(true), finishAmount: st.finishAmount, quantity: st.quantity }]);
    });
    $('cart-clear-btn').addEventListener('click', () => { saveCart([]); renderCart(); renderBadge(); });
    $('cart-checkout-btn').addEventListener('click', () => openOrder('cart', cart));
    $('create-order-pay-btn').addEventListener('click', pay);

    ['create-order-consent', 'create-order-name', 'create-order-phone', 'create-order-zipcode', 'create-order-address1']
      .forEach(id => $(id).addEventListener(id === 'create-order-consent' ? 'change' : 'input', refreshPayButton));

    $('cart-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const idx = Number(btn.closest('.cart-item').dataset.idx);
      const list = cart.slice();
      const item = list[idx];
      if (!item) return;
      if (btn.dataset.act === 'remove') list.splice(idx, 1);
      if (btn.dataset.act === 'qty') item.quantity = Math.min(MAX_QTY, Math.max(1, item.quantity + Number(btn.dataset.delta)));
      if (btn.dataset.act === 'finish') item.finishAmount = Number(btn.dataset.finish);
      saveCart(list);
      renderCart(); renderBadge();
    });
  }

  /* ---------- 장바구니 ---------- */
  function renderBadge() {
    const b = $('cart-badge');
    if (!b) return;
    b.hidden = cart.length === 0;
    b.textContent = String(cart.length);
  }
  function addToCart() {
    if (cart.length >= MAX_CART) { toast(`장바구니에는 최대 ${MAX_CART}개 디자인까지 담을 수 있습니다.`); return; }
    const list = cart.slice();
    list.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: TYPES[st.typeKey].label,
      studio: snapshot(true),
      finishAmount: st.finishAmount,
      quantity: st.quantity,
    });
    saveCart(list);
    renderBadge();
    toast('장바구니에 담았습니다.');
  }
  function renderCart() {
    const list = $('cart-list');
    list.innerHTML = '';
    cart.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.dataset.idx = String(idx);
      div.innerHTML = `
        <div class="cart-item-head"><span>${idx + 1}. ${item.label}</span><button type="button" data-act="remove">삭제</button></div>
        <div class="cart-item-controls">
          <span class="qty-hint">수량</span>
          <div class="qty-stepper">
            <button type="button" data-act="qty" data-delta="-1">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button type="button" data-act="qty" data-delta="1">+</button>
          </div>
          <button type="button" class="calc-chip ${item.finishAmount === 0 ? 'active' : ''}" data-act="finish" data-finish="0">Lite</button>
          <button type="button" class="calc-chip ${item.finishAmount === FINISH_PREMIUM ? 'active' : ''}" data-act="finish" data-finish="${FINISH_PREMIUM}">Premium</button>
        </div>`;
      list.appendChild(div);
    });
    const hasItems = cart.length > 0;
    $('cart-empty').hidden = hasItems;
    $('cart-actions').hidden = !hasItems;
    const summary = $('cart-summary');
    summary.hidden = !hasItems;
    if (hasItems) {
      const totalQty = cart.reduce((a, i) => a + i.quantity, 0);
      const est = cart.reduce((a, i) => a + estimate(i.studio, i.finishAmount).unit * i.quantity, 0);
      summary.innerHTML = `총 ${cart.length}종 · ${totalQty}벌<br>추가 금액 합계(참고) ${won(est)}`;
      $('cart-note').textContent = '결제 금액은 주문 확정 때 서버가 1벌 가격 × 총 수량으로 계산합니다.';
    } else {
      $('cart-note').textContent = '';
    }
  }

  /* ---------- 마네킹에 입혀보기: 지금 꾸민 옷을 체형 키에 맞춘 마네킹에 입혀서 결제 전에 확인해요 ----------
     옷은 스튜디오 3D 모델의 지오메트리·재질을 그대로 같이 써서, 칠한 색·브러시 그림이 그대로 보여요.
     mannequin.glb는 관절이 있는 T포즈 모델이라, 실제로 그려지는 자세(스킨 적용 후)의 정점으로 몸 치수를 재요. */
  const MANNEQUIN_URL = '/models/mannequin.glb?v=4';
  const ARM_DOWN = 1.15; // 팔 내리는 각도 (라디안, 약 66도)
  const tryon = {
    renderer: null, scene: null, camera: null, controls: null,
    mannequin: null, points: null, heightM: 0, joints: null, armAngle: 0, garment: null, focus: null,
    loading: null, failed: false, raf: 0, closeView: true, needsRender: true,
  };

  // 마네킹 정점을 월드 좌표(m 단위)로 뽑아요. 스킨(관절) 변형까지 적용해서 화면에 보이는 그대로 재요.
  function mannequinPoints(root) {
    const THREE = view.THREE;
    root.updateMatrixWorld(true);
    const out = [];
    const v = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      if (o.isSkinnedMesh) o.skeleton.update();
      const pos = o.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 20000));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i);
        if (o.isSkinnedMesh) o.applyBoneTransform(i, v);
        v.applyMatrix4(o.matrixWorld);
        out.push(v.x, v.y, v.z);
      }
    });
    return new Float32Array(out);
  }

  function boundsOf(pts) {
    const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (let i = 0; i < pts.length; i += 3) {
      const x = pts[i], y = pts[i + 1], z = pts[i + 2];
      if (x < b.minX) b.minX = x; if (x > b.maxX) b.maxX = x;
      if (y < b.minY) b.minY = y; if (y > b.maxY) b.maxY = y;
      if (z < b.minZ) b.minZ = z; if (z > b.maxZ) b.maxZ = z;
    }
    return b;
  }

  // y0~y1 높이, |x - cx| < xLimit 안에 있는 점들의 범위를 재요. (T포즈 팔을 빼고 몸통·다리만 재려고 써요)
  function bandBounds(pts, y0, y1, xLimit, cx) {
    const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, n: 0 };
    for (let i = 0; i < pts.length; i += 3) {
      const x = pts[i], y = pts[i + 1], z = pts[i + 2];
      if (y < y0 || y > y1 || Math.abs(x - (cx || 0)) > xLimit) continue;
      if (x < b.minX) b.minX = x; if (x > b.maxX) b.maxX = x;
      if (z < b.minZ) b.minZ = z; if (z > b.maxZ) b.maxZ = z;
      b.n++;
    }
    return b.n ? b : null;
  }

  // 좌우로 가장 넓게 퍼지는 높이(= 어깨선, 소매가 벌어지는 곳)를 찾아요. customize-3d.js 의 findShoulderLineY 와 같은 방식이에요.
  function shoulderLineY(pts, b) {
    const BUCKETS = 24, span = b.maxY - b.minY, cx = (b.minX + b.maxX) / 2;
    if (span <= 0) return b.maxY;
    const widest = new Array(BUCKETS).fill(0);
    for (let i = 0; i < pts.length; i += 3) {
      const k = Math.min(BUCKETS - 1, Math.max(0, Math.floor(((pts[i + 1] - b.minY) / span) * BUCKETS)));
      widest[k] = Math.max(widest[k], Math.abs(pts[i] - cx));
    }
    let best = 0;
    for (let k = 1; k < BUCKETS; k++) if (widest[k] > widest[best]) best = k;
    return b.minY + span * ((best + 0.5) / BUCKETS);
  }

  // 모자 챙·신발 앞코처럼 낮게 뻗은 쪽을 앞(+z)으로 돌리는 각도를 구해요.
  function frontYaw(pts, b) {
    const alongX = (b.maxX - b.minX) > (b.maxZ - b.minZ);
    const lo = alongX ? b.minX : b.minZ, hi = alongX ? b.maxX : b.maxZ, quarter = (hi - lo) / 4;
    let topLo = -Infinity, topHi = -Infinity;
    for (let i = 0; i < pts.length; i += 3) {
      const a = alongX ? pts[i] : pts[i + 2];
      if (a < lo + quarter) topLo = Math.max(topLo, pts[i + 1]);
      else if (a > hi - quarter) topHi = Math.max(topHi, pts[i + 1]);
    }
    const frontIsLow = topLo < topHi; // 낮은 끝이 앞이에요
    if (alongX) return frontIsLow ? Math.PI / 2 : -Math.PI / 2;
    return frontIsLow ? Math.PI : 0;
  }

  // 스튜디오 모델의 정점을 (발밑 가운데 = 원점, 앞 = +z) 기준으로 옮긴 점 목록과 범위를 만들어요.
  function garmentFrame(rd, kind) {
    const raw = [];
    for (const m of rd.meshes) {
      const pos = m.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 15000));
      for (let i = 0; i < pos.count; i += step) raw.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    const rawPts = new Float32Array(raw);
    const rb = boundsOf(rawPts);
    const yaw = (kind === 'hat' || kind === 'shoes') ? frontYaw(rawPts, rb) : 0;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const cx = (rb.minX + rb.maxX) / 2, cz = (rb.minZ + rb.maxZ) / 2;
    const pts = new Float32Array(rawPts.length);
    for (let i = 0; i < rawPts.length; i += 3) {
      const x = rawPts[i] - cx, z = rawPts[i + 2] - cz;
      pts[i] = x * cos + z * sin;
      pts[i + 1] = rawPts[i + 1] - rb.minY;
      pts[i + 2] = -x * sin + z * cos;
    }
    return { pts, b: boundsOf(pts), yaw, offset: [-cx, -rb.minY, -cz] };
  }

  // 옷 메쉬를 새로 만들어요. 지오메트리(칠한 색·브러시 자국)는 스튜디오 모델과 같이 쓰고,
  // 옷 모델에는 법선이 없어서 재질만 면 단위 음영(flatShading)으로 바꾼 복사본을 써요. 그래야 조명에 입체감이 생겨요.
  function garmentObject(rd, frame) {
    const THREE = view.THREE;
    if (!rd.tryonMaterial) {
      rd.tryonMaterial = rd.meshes[0].material.clone();
      rd.tryonMaterial.onBeforeCompile = addBrushShader;
      rd.tryonMaterial.flatShading = true;
    }
    const inner = new THREE.Group();
    inner.position.set(frame.offset[0], frame.offset[1], frame.offset[2]);
    for (const m of rd.meshes) inner.add(new THREE.Mesh(m.geometry, rd.tryonMaterial));
    const turn = new THREE.Group();
    turn.rotation.y = frame.yaw;
    turn.add(inner);
    const holder = new THREE.Group();
    holder.add(turn);
    return holder;
  }

  // 옷 종류별로 마네킹 위 위치·크기를 정해요. 몸은 키 H 기준 비율과 실측 치수로 재요.
  function fitGarment(kind, rd) {
    const pts = tryon.points, B = boundsOf(pts), H = B.maxY - B.minY;
    const frame = garmentFrame(rd, kind);
    const gb = frame.b, gw = gb.maxX - gb.minX, gh = gb.maxY - gb.minY, gd = gb.maxZ - gb.minZ;
    const obj = garmentObject(rd, frame);
    const torso = H * 0.2; // 이 폭 안쪽만 몸통·다리로 봐요 (T포즈 팔 빼기)
    const copies = [];
    let s = 1, sx, sy, sz, x = 0, y = 0, z = 0;
    // 옷이 몸에 묻히지 않도록, 옷 높이를 여러 칸으로 나눠 칸마다 몸 치수와 옷 치수를 비교하고
    // 가장 모자란 칸에 맞춰 가로·앞뒤를 넓혀요. (맨 위·아래 칸은 옷 끝이 얇아서 빼요)
    // 칸마다 몸과 옷의 앞뒤 중심도 기억해 두었다가, 평균적으로 가장 잘 겹치는 앞뒤 위치(z)를 구해요.
    const cover = (base, ys, bottom, xLimit, yCut) => {
      let needX = base, needZ = base;
      const N = 10, mids = [];
      for (let k = 1; k < N - 1; k++) {
        const g0 = (gh * k) / N, g1 = (gh * (k + 1)) / N;
        if (bottom + g0 * ys > yCut) break;
        const body = bandBounds(pts, bottom + g0 * ys, bottom + g1 * ys, xLimit);
        const gBand = bandBounds(frame.pts, g0, g1, Infinity);
        if (!body || !gBand || body.n < 20 || gBand.n < 20) continue;
        needX = Math.max(needX, (body.maxX - body.minX) * 1.06 / Math.max(gBand.maxX - gBand.minX, 1e-6));
        needZ = Math.max(needZ, (body.maxZ - body.minZ) * 1.2 / Math.max(gBand.maxZ - gBand.minZ, 1e-6));
        mids.push([(body.minZ + body.maxZ) / 2, (gBand.minZ + gBand.maxZ) / 2]);
      }
      const fx = Math.min(needX, base * 3), fz = Math.min(needZ, base * 6) * st.girthMul;
      const zAt = mids.length ? mids.reduce((a, [b, g]) => a + b - g * fz, 0) / mids.length : 0;
      return [fx * st.girthMul, fz, zAt];
    };
    if (kind === 'top') {
      const bodyShoulder = shoulderLineY(pts, B);
      // 옷 모델은 소매를 내린 모양이라 길이(어깨~엉덩이)로 크기를 정하고, 몸통 둘레는 cover 가 맞춰요.
      s = (H * 0.38) / Math.max(gh, 1e-6);
      sy = s * st.lengthMul;
      y = bodyShoulder + H * 0.055 - gh * sy; // 옷 목둘레(맨 위)를 어깨선 살짝 위에 (기장 배율은 아래로 늘어나요)
      // 어깨 위(목)는 빼고, 좌우는 어깨 폭(키의 13%) 안쪽만 재서 T포즈 팔을 빼요.
      [sx, sz, z] = cover(s, sy, y, H * 0.13, bodyShoulder - H * 0.03);
      // 긴팔은 팔이 소매 속으로 들어가도록, 어깨 관절에서 소매 끝(옷에서 가장 바깥 점)을 향하는 각도로 팔을 내려요.
      // (반팔은 소매가 짧아서 기본 각도가 더 자연스러워요)
      let cuffX = 0, cuffY = 0;
      for (let i = 0; i < frame.pts.length; i += 3) {
        const ax = Math.abs(frame.pts[i]);
        if (ax > cuffX) { cuffX = ax; cuffY = frame.pts[i + 1]; }
      }
      const J = tryon.joints;
      const dx = cuffX * sx - J.shX, dy = J.shY - (y + cuffY * sy);
      if (st.typeKey === 'longSleeve' && dx > 0) tryon.armAngle = Math.min(1.3, Math.max(0.2, Math.atan2(dy, dx)));
      tryon.focus = { y0: bodyShoulder - H * 0.4, y1: bodyShoulder + H * 0.14 };
    } else if (kind === 'bottom') {
      const waist = B.minY + H * 0.57;
      const length = st.typeKey === 'longPants' ? H * 0.54 : H * 0.26;
      s = length / Math.max(gh, 1e-6);
      sy = s * st.lengthMul;
      y = waist - gh * sy; // 허리단 = 허리선
      [sx, sz, z] = cover(s, sy, y, torso * 1.3, waist);
      tryon.focus = { y0: waist - length * st.lengthMul - H * 0.05, y1: waist + H * 0.1 };
    } else if (kind === 'hat') {
      const head = bandBounds(pts, B.maxY - H * 0.1, B.maxY, H * 0.15) || { minX: -0.08, maxX: 0.08, minZ: -0.1, maxZ: 0.1 };
      s = (head.maxX - head.minX) * 1.22 / Math.max(gw, 1e-6); // 모자 너비(챙 제외 좌우) = 머리 폭 + 여유
      sx = sz = s * st.girthMul; sy = s * st.lengthMul;
      y = B.maxY + H * 0.025 - gh * sy; // 모자 꼭대기를 정수리 살짝 위에
      z = head.minZ - H * 0.012 - gb.minZ * sz; // 모자 뒤쪽을 뒤통수에 맞춰요
      tryon.focus = { y0: B.maxY - H * 0.22, y1: B.maxY + H * 0.06 };
    } else {
      // 신발·양말: 발 위치(좌우 두 발)를 재서 맞춰요.
      const footTop = B.minY + H * 0.05;
      const feet = bandBounds(pts, B.minY, footTop, H * 0.3);
      let lSum = 0, lN = 0, rSum = 0, rN = 0;
      for (let i = 0; i < pts.length; i += 3) {
        if (pts[i + 1] > footTop || Math.abs(pts[i]) > H * 0.3) continue;
        if (pts[i] < 0) { lSum += pts[i]; lN++; } else { rSum += pts[i]; rN++; }
      }
      const lx = lN ? lSum / lN : -H * 0.06, rx = rN ? rSum / rN : H * 0.06;
      const footZ = feet ? (feet.minZ + feet.maxZ) / 2 : 0;
      const gMidZ = (gb.minZ + gb.maxZ) / 2;
      if (kind === 'shoes') {
        const footLen = feet ? feet.maxZ - feet.minZ : H * 0.16;
        s = footLen * 1.1 / Math.max(gd, 1e-6);
        // 가로가 길이의 3/4보다 넓으면 두 짝이 같이 있는 모델, 아니면 한 짝이라 두 발에 하나씩 신겨요.
        // 발이 신발 옆으로 삐져나오지 않게 발 폭(두 짝이면 두 발 전체 폭)에 맞춰 가로를 넓히고, 높이는 발목까지 덮어요.
        const pair = gw / Math.max(gd, 1e-6) > 0.75;
        const oneFoot = bandBounds(pts, B.minY, footTop, H * 0.12, rx);
        const footW = pair ? (feet ? feet.maxX - feet.minX : H * 0.2) : (oneFoot ? oneFoot.maxX - oneFoot.minX : H * 0.06);
        if (pair) x = (lx + rx) / 2;
        else copies.push(lx, rx);
        sx = Math.max(s, footW * 1.12 / Math.max(gw, 1e-6)) * st.girthMul;
        sy = Math.max(s, H * 0.065 / Math.max(gh, 1e-6)) * st.girthMul;
        sz = s * st.lengthMul;
        z = footZ - gMidZ * sz;
      } else if (kind === 'socks3') {
        // 3켤레 세트는 신은 모양이 아니라서, 발 앞 바닥에 펼쳐서 보여줘요.
        s = H * 0.32 / Math.max(gw, gd, 1e-6);
        sx = sy = sz = s;
        z = (feet ? feet.maxZ : 0) + H * 0.04 - gb.minZ * sz;
      } else {
        s = H * 0.24 / Math.max(gh, 1e-6);
        sx = sz = s * st.girthMul; sy = s * st.lengthMul;
        x = (lx + rx) / 2;
        z = footZ - gMidZ * sz;
      }
      y = B.minY; // 밑창·발바닥 = 바닥
      tryon.focus = { y0: B.minY - H * 0.02, y1: B.minY + H * 0.32 };
    }
    const group = new view.THREE.Group();
    const place = (o, px, mirror) => {
      o.scale.set(sx * (mirror ? -1 : 1), sy, sz);
      o.position.set(px, y, z);
      group.add(o);
    };
    if (copies.length) {
      // 한 짝만 있는 신발은 오른발에 그대로, 왼발에는 좌우를 뒤집어서 신겨요.
      place(obj, copies[1], false);
      place(garmentObject(rd, frame), copies[0], true);
    } else {
      place(obj, x, false);
    }
    return group;
  }

  function setupTryonScene() {
    if (tryon.renderer) return;
    const { THREE, OrbitControls } = view;
    const stage = $('tryon-stage');
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(screenPixelRatio());
    renderer.setClearColor(0xfbfaf6, 1);
    renderer.domElement.addEventListener('webglcontextrestored', () => { tryon.needsRender = true; });
    stage.insertBefore(renderer.domElement, stage.firstChild);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(2, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.45);
    rim.position.set(-2, 2, -3);
    scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.6, 48), new THREE.MeshBasicMaterial({ color: 0xece7dc }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    scene.add(floor);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 50);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 0.4;
    controls.maxDistance = 8;
    controls.autoRotateSpeed = 2.4;
    // 돌리거나 자동 회전할 때만 다시 그려요.
    controls.addEventListener('change', () => { tryon.needsRender = true; });
    Object.assign(tryon, { renderer, scene, camera, controls });
    window.addEventListener('resize', () => { if (!$('tryon-modal').hidden) resizeTryon(); });
  }

  function resizeTryon() {
    const stage = $('tryon-stage');
    const w = stage.clientWidth || 480, h = stage.clientHeight || 420;
    tryon.renderer.setSize(w, h, false);
    tryon.camera.aspect = w / h;
    tryon.camera.updateProjectionMatrix();
    tryon.needsRender = true;
  }

  // 팔을 angle(라디안)만큼 아래로 내려요. 0이면 원래 T포즈로 돌아가요.
  // 옷 모델은 팔을 내린 모양이라, 보여줄 때는 팔을 내려야 소매와 잘 맞아요. (치수는 T포즈에서 재요)
  function setArmPose(root, angle) {
    const THREE = view.THREE;
    for (const [name, childName] of [['LeftArm', 'LeftForeArm'], ['RightArm', 'RightForeArm']]) {
      const arm = root.getObjectByName(name), fore = root.getObjectByName(childName);
      if (!arm || !fore) continue;
      if (!arm.userData.restQ) arm.userData.restQ = arm.quaternion.clone();
      arm.quaternion.copy(arm.userData.restQ);
      if (!angle) continue;
      root.updateMatrixWorld(true);
      const a = arm.getWorldPosition(new THREE.Vector3()), f = fore.getWorldPosition(new THREE.Vector3());
      const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), f.x > a.x ? -angle : angle);
      const parentQ = arm.parent.getWorldQuaternion(new THREE.Quaternion());
      const armQ = arm.getWorldQuaternion(new THREE.Quaternion());
      arm.quaternion.copy(parentQ.invert().multiply(turn).multiply(armQ));
    }
    root.updateMatrixWorld(true);
  }

  // 마네킹을 체형 키(m)에 맞추고, 몸무게가 있으면 키 대비 몸무게(BMI)만큼 몸통 굵기를 살짝 바꿔요.
  function sizeMannequin() {
    const m = tryon.mannequin;
    m.position.set(0, 0, 0);
    m.scale.set(1, 1, 1);
    setArmPose(m, 0);
    const b0 = boundsOf(mannequinPoints(m));
    const H0 = Math.max(b0.maxY - b0.minY, 1e-6);
    const heightM = (st.body && st.body.heightCm ? st.body.heightCm : 165) / 100;
    const k = heightM / H0;
    let girth = 1;
    if (st.body && st.body.weightKg) {
      const bmi = st.body.weightKg / (heightM * heightM);
      girth = Math.min(1.3, Math.max(0.85, Math.sqrt(bmi / 21.5)));
    }
    m.scale.set(k * girth, k, k * girth);
    m.position.set(-((b0.minX + b0.maxX) / 2) * k * girth, -b0.minY * k, -((b0.minZ + b0.maxZ) / 2) * k * girth);
    tryon.points = mannequinPoints(m);
    tryon.heightM = heightM;
    // T포즈에서 어깨 관절과 손목 위치를 재 둬요. (소매 각도·길이를 팔에 맞출 때 써요)
    m.updateMatrixWorld(true);
    const at = name => { const o = m.getObjectByName(name); return o ? o.getWorldPosition(new view.THREE.Vector3()) : null; };
    const arm = at('RightArm') || at('LeftArm'), hand = at('RightHand') || at('LeftHand');
    tryon.joints = arm && hand
      ? { shX: Math.abs(arm.x), shY: arm.y, len: Math.abs(hand.x - arm.x) }
      : { shX: heightM * 0.11, shY: heightM * 0.8, len: heightM * 0.33 };
  }

  // 크기를 1로 되돌린 상태에서 팔을 내린 뒤 다시 크기를 적용해요. (늘린 상태에서 돌리면 각도가 틀어져요)
  function poseMannequin(angle) {
    const m = tryon.mannequin;
    const scale = m.scale.clone();
    m.scale.set(1, 1, 1);
    setArmPose(m, angle);
    m.scale.copy(scale);
    m.updateMatrixWorld(true);
  }

  function loadMannequin() {
    if (tryon.mannequin) return Promise.resolve(true);
    if (!tryon.loading) {
      tryon.loading = new Promise(resolve => {
        new view.GLTFLoader().load(MANNEQUIN_URL, gltf => {
          const root = gltf.scene;
          const skin = new view.THREE.MeshStandardMaterial({ color: 0xa9aeb0, roughness: 0.75, metalness: 0 });
          root.traverse(o => { if (o.isMesh) { o.material = skin; o.frustumCulled = false; } });
          tryon.mannequin = root;
          tryon.scene.add(root);
          resolve(true);
        }, undefined, err => {
          console.warn('마네킹을 불러오지 못했습니다:', err);
          tryon.loading = null;
          resolve(false);
        });
      });
    }
    return tryon.loading;
  }

  // 카메라를 전신 또는 옷 가까이에 맞춰요.
  function frameTryon() {
    const H = tryon.heightM || 1.65;
    const f = tryon.closeView && tryon.focus ? tryon.focus : { y0: -H * 0.02, y1: H * 1.04 };
    const span = Math.max(f.y1 - f.y0, 0.2);
    const vFov = view.THREE.MathUtils.degToRad(tryon.camera.fov);
    const dist = (span * 0.62) / Math.tan(vFov / 2) + 0.15;
    const cy = (f.y0 + f.y1) / 2;
    tryon.controls.target.set(0, cy, 0);
    tryon.camera.position.set(dist * 0.42, cy + span * 0.08, dist);
    tryon.controls.maxDistance = Math.max(8, dist * 2);
    tryon.controls.update();
    tryon.needsRender = true;
    $('tryon-view-btn').textContent = tryon.closeView ? '전신 보기' : '옷 가까이 보기';
  }

  function tryonLoop() {
    tryon.raf = requestAnimationFrame(tryonLoop);
    tryon.controls.update();
    if (!tryon.needsRender) return;
    tryon.needsRender = false;
    tryon.renderer.render(tryon.scene, tryon.camera);
  }
  function stopTryonLoop() {
    if (tryon.raf) cancelAnimationFrame(tryon.raf);
    tryon.raf = 0;
  }

  function tryonSummary() {
    const kind = TYPES[st.typeKey].kind;
    const parts = [`${TYPES[st.typeKey].label}`];
    if (st.body) parts.push(bodyText(st.body).replace('기준 체형 · ', '마네킹 체형 · '));
    else parts.push('마네킹 체형 · 키 165cm (바디 스캔 전 기본값)');
    const [lName, gName] = KINDS[kind].size;
    if (st.lengthMul !== 1 || st.girthMul !== 1) parts.push(`${lName} ×${st.lengthMul} · ${gName} ×${st.girthMul}`);
    if (kind === 'socks3') parts.push('3켤레 세트는 발 앞에 펼쳐서 보여드려요.');
    $('tryon-summary').innerHTML = parts.join('<br>');
  }

  async function openTryon() {
    if (!view.rootData || view.rootData !== modelCache[st.typeKey]) {
      toast(MODEL_FILES[st.typeKey] && !view.failed && !modelFailed[st.typeKey]
        ? '3D 옷을 불러오는 중입니다. 잠시 후 다시 눌러주세요.'
        : '이 옷은 3D 모델을 쓸 수 없어 마네킹에 입혀볼 수 없습니다.');
      return;
    }
    const loading = $('tryon-loading');
    $('tryon-modal').hidden = false;
    tryonSummary();
    setupTryonScene();
    resizeTryon();
    loading.hidden = false;
    loading.textContent = '마네킹을 불러오는 중...';
    if (!(await loadMannequin())) {
      loading.textContent = '마네킹을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      return;
    }
    if ($('tryon-modal').hidden) return; // 불러오는 사이에 닫았으면 그만둬요
    sizeMannequin();
    if (tryon.garment) tryon.scene.remove(tryon.garment);
    tryon.armAngle = ARM_DOWN;
    tryon.garment = fitGarment(TYPES[st.typeKey].kind, view.rootData);
    poseMannequin(tryon.armAngle);
    tryon.scene.add(tryon.garment);
    tryon.closeView = false;
    tryon.controls.autoRotate = false;
    $('tryon-spin-btn').classList.remove('active');
    frameTryon();
    loading.hidden = true;
    tryon.needsRender = true;
    stopTryonLoop();
    tryonLoop();
  }
  function closeTryon() {
    $('tryon-modal').hidden = true;
    stopTryonLoop();
    if (tryon.garment && tryon.scene) { tryon.scene.remove(tryon.garment); tryon.garment = null; }
  }

  /* ---------- 주문 확인 · 결제 ---------- */
  function openOrder(mode, items) {
    if (!loggedIn()) {
      toast('유료 주문은 Google 계정으로 로그인한 뒤 할 수 있습니다. 왼쪽 상단 메뉴에서 로그인해주세요.');
      const menu = document.getElementById('menu-toggle-btn');
      if (menu) menu.click();
      return;
    }
    if (!items.length) { toast('담긴 디자인이 없습니다.'); return; }
    pending = {
      mode,
      items: items.map(i => ({
        label: i.label,
        studio: i.studio && i.studio.body ? i.studio : { ...i.studio, body: st.body ? { ...st.body } : null },
        finishAmount: i.finishAmount,
        quantity: i.quantity,
      })),
    };
    const totalQty = pending.items.reduce((a, i) => a + i.quantity, 0);
    $('create-order-summary').innerHTML =
      pending.items.map((i, n) => `${n + 1}. ${i.label} ×${i.quantity} · ${i.finishAmount ? 'Premium' : 'Lite'}`).join('<br>') +
      (st.body ? `<br>${bodyText(st.body)}` : '') +
      `<br><b>총 ${pending.items.length}종 · ${totalQty}벌</b>` +
      '<br><span style="font-size:12px;color:var(--ink-soft)">결제 금액은 주문 확정 때 서버가 계산해 결제 창에 보여줍니다.</span>';
    // 브러시로 그린 디자인은 주문과 함께 보낼 그림 이미지를 미리 보여줘요.
    const thumbs = $('create-order-thumbs');
    const label = (v, n) => `${pending.items.length > 1 ? `${n + 1}번 ` : ''}${v.label}`;
    thumbs.innerHTML = pending.items.map((i, n) => DESIGN_VIEWS
      .filter(v => i.studio.paintViews && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(i.studio.paintViews[v.key] || ''))
      .map(v => `<figure><img src="${i.studio.paintViews[v.key]}" alt="${label(v, n)} 그림">${label(v, n)}</figure>`).join('')).join('');
    thumbs.hidden = !thumbs.innerHTML;
    $('create-order-shipping-section').hidden = !pending.items.some(i => i.finishAmount === FINISH_PREMIUM);
    $('create-order-modal-note').textContent = '';
    $('create-order-modal').hidden = false;
    refreshPayButton();
  }
  function readShipping() {
    return {
      name: $('create-order-name').value.trim(),
      phone: $('create-order-phone').value.trim(),
      zipcode: $('create-order-zipcode').value.trim(),
      address1: $('create-order-address1').value.trim(),
      address2: $('create-order-address2').value.trim(),
      note: $('create-order-note').value.trim(),
    };
  }
  function needsShipping() {
    return !!pending && pending.items.some(i => i.finishAmount === FINISH_PREMIUM);
  }
  function refreshPayButton() {
    const btn = $('create-order-pay-btn');
    if (!pending) { btn.disabled = true; return; }
    if (!needsShipping()) { btn.disabled = false; return; }
    const s = readShipping();
    btn.disabled = !($('create-order-consent').checked && s.name && s.phone && s.zipcode && s.address1);
  }
  async function pay() {
    if (!pending) return;
    const btn = $('create-order-pay-btn');
    const note = $('create-order-modal-note');
    const ship = needsShipping() ? readShipping() : null;
    // 재봉사가 체형을 보고 만들 수 있게, 1단계에서 찍은 사진 4장을 주문에 함께 보내요.
    const missing = scanMissingViews();
    if (missing.length) {
      note.textContent = `주문하려면 체형 사진 4장이 필요합니다. 제작 스튜디오 1단계(바디 스캔)에서 ${missing.map(viewLabel).join(', ')} 사진을 등록해주세요.`;
      return;
    }
    const bodyPhotos = { ...scanPhotos };
    btn.disabled = true;
    btn.textContent = '주문 처리 중...';
    note.textContent = '';
    try {
      const isCart = pending.mode === 'cart';
      const first = pending.items[0];
      const url = isCart ? '/api/orders/create-cart-order' : '/api/orders/create-order';
      const body = isCart
        ? { items: pending.items.map(i => ({ studio: i.studio, quantity: i.quantity, finishAmount: i.finishAmount })), bodyPhotos }
        : { designMode: 'studio', studio: first.studio, quantity: first.quantity, finishAmount: first.finishAmount, finishLabel: first.finishAmount ? 'Premium' : 'Lite', bodyPhotos };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || '주문을 만들지 못했습니다.');

      if (data.needsShipping && ship) {
        const r2 = await fetch(`/api/orders/${encodeURIComponent(data.orderId)}/shipping`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipping: ship, consent: true }),
        });
        const d2 = await r2.json().catch(() => ({}));
        if (!r2.ok || !d2.ok) throw new Error(d2.error || '배송지를 저장하지 못했습니다.');
      }

      const w = window.open(data.buyUrl, '_blank', 'noopener');
      note.innerHTML = w
        ? '결제 창을 열었습니다. 결제가 끝나면 주문이 확인됩니다.'
        : `팝업이 막혔습니다. <a href="${data.buyUrl}" target="_blank" rel="noopener">여기</a>를 눌러 결제해주세요.`;
      if (isCart) { saveCart([]); renderCart(); renderBadge(); }
    } catch (err) {
      note.textContent = err.message || '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } finally {
      btn.textContent = '결제하기';
      refreshPayButton();
    }
  }

  /* ---------- 시작 ---------- */
  injectStyle();
  buildStatic();
  bindEvents();
  bindScan();
  renderAll();
  renderCart();
  renderBadge();

  // index.html 이 불러온 뒤 버튼으로 팝업을 열어요.
  // 체형을 아직 안 받았으면 바디 스캔(STEP 1)부터, 받았으면 바로 옷 만들기(STEP 2)로 열어요.
  window.openCreateStudio = function () {
    $('create-modal').hidden = false;
    showCreateStep(st.body ? 2 : 1);
    requestRender();
  };

  // 커뮤니티 3D 창(community-glb.js)에서 '내가 만든 옷' 내려받기에 써요. 스튜디오 2단계(옷 만들기)가 열려 있을 때만 보여줘요.
  window.createStudioDesignGlb = {
    available: () => !$('create-modal').hidden && !$('create-studio-panel').hidden,
    ready: canExportDesign,
    label: () => TYPES[st.typeKey].label,
    download: downloadDesignGlb,
  };

  // 테스트·점검용: 부위 나누기와 모델 준비 함수를 밖에서 볼 수 있게 해 둬요.
  window.createStudioDebug = { classify, prepareModel, MODEL_FILES, KINDS, TYPES };
})();
