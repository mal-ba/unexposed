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
  const BODY = { heightMin: 120, heightMax: 210, weightMin: 30, weightMax: 200 };

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
    root: null, rootData: null, currentType: null, ready: false, failed: false,
  };
  const modelCache = {};

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
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
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
      (function loop() {
        requestAnimationFrame(loop);
        controls.update();
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
  }
  function detachModel() {
    if (view.root) view.scene.remove(view.root);
    view.root = null;
    view.rootData = null;
  }

  // 화면에서 누른 곳 아래에 있는 옷 삼각형을 찾아요.
  function hitModel(clientX, clientY) {
    if (!view.root) return null;
    const r = view.renderer.domElement.getBoundingClientRect();
    const ndc = new view.THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    view.raycaster.setFromCamera(ndc, view.camera);
    const hits = view.raycaster.intersectObjects(view.root.children, false);
    return hits.length && hits[0].object.userData.triKeys ? hits[0] : null;
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
        detachModel(); setGLVisible(false);
        loading.hidden = false; loading.textContent = '이 옷의 3D 파일을 불러오지 못해 칸으로 채웁니다.';
      }
    });
  }
  function setGLVisible(on) {
    if (view.renderer) view.renderer.domElement.hidden = !on;
    if (!on) detachModel();
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
      const pos = m.geometry.attributes.position;
      const { triNormals: tn, paintA, paintC } = m.userData;
      let touched = stroke.touched.get(m);
      if (!touched) { touched = new Map(); stroke.touched.set(m, touched); }
      let meshChanged = false;
      for (let v = 0, cnt = paintA.length; v < cnt; v++) {
        const dx = pos.getX(v) - p.x, dy = pos.getY(v) - p.y, dz = pos.getZ(v) - p.z;
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
    if (changed && !erase && !st.hasPaint) { st.hasPaint = true; renderQuote(); }
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
    view.renderer.domElement.setPointerCapture(e.pointerId);
    paintHit(h);
  }
  function onStagePointerMove(e) {
    if (!stroke || e.pointerId !== stroke.id) return;
    const h = hitModel(e.clientX, e.clientY);
    if (h) paintHit(h); else stroke.last = null;
  }
  function onStagePointerEnd(e) {
    if (!stroke || e.pointerId !== stroke.id) return;
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
    $('create-modal-close').addEventListener('click', () => { stopScanCamera(); $('create-modal').hidden = true; });
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
    $('reset-btn').addEventListener('click', () => { resetDesign(); status('이 옷을 처음 상태로 되돌렸습니다.'); renderAll(); });

    document.querySelectorAll('#create-finish-choices .calc-chip').forEach(b => b.addEventListener('click', () => {
      st.finishAmount = Number(b.dataset.finish); renderFinish(); renderQuote();
    }));
    document.querySelectorAll('#create-qty-stepper button').forEach(b => b.addEventListener('click', () => {
      st.quantity = Math.min(MAX_QTY, Math.max(1, st.quantity + Number(b.dataset.qty)));
      renderQty(); renderQuote();
    }));

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
  };

  // 테스트·점검용: 부위 나누기와 모델 준비 함수를 밖에서 볼 수 있게 해 둬요.
  window.createStudioDebug = { classify, prepareModel, MODEL_FILES, KINDS, TYPES };
})();
