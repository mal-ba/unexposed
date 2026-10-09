// ====== survey-popup.js : 사이트에 들어오면 설문조사 참여를 부탁하는 팝업 ======
// - 한 번 방문(브라우저 탭 세션)마다 처음 들어온 페이지에서 한 번만 떠요. 페이지를 옮겨 다녀도 다시 안 떠요.
// - "다시 보지 않기"를 체크하고 닫으면 그 브라우저에서는 다시는 안 떠요 (localStorage).
// - 체크하지 않고 닫으면 다음 방문 때 다시 떠요.
// - 문구는 i18n.js 자동 번역 사전(i18n-text/*.js)에 들어 있어서 고른 언어로 바뀌어요.
(function(){
  const SURVEY_URL = 'https://naver.me/xsZVRwV0';
  const NEVER_KEY = 'unexposed-survey-hidden';   // localStorage: '1'이면 다시 보지 않기
  const SESSION_KEY = 'unexposed-survey-shown';  // sessionStorage: 이번 방문에 이미 보여줬는지

  function read(store, key){ try { return store.getItem(key); } catch(e){ return null; } }
  function write(store, key, val){ try { store.setItem(key, val); } catch(e){} }

  function show(){
    if(read(localStorage, NEVER_KEY) === '1') return;
    if(read(sessionStorage, SESSION_KEY) === '1') return;
    write(sessionStorage, SESSION_KEY, '1');

    const style = document.createElement('style');
    style.textContent = `
      .survey-overlay{ position:fixed; inset:0; z-index:10000; background:rgba(15,46,44,0.55);
        display:flex; align-items:center; justify-content:center; padding:16px; }
      .survey-box{ position:relative; width:100%; max-width:380px; background:#FBFAF6; color:#14201E;
        border-radius:18px; padding:28px 24px 20px; box-shadow:0 20px 50px rgba(0,0,0,0.3);
        font-family:inherit; text-align:center; }
      .survey-box h3{ margin:0 0 10px; font-size:19px; font-weight:600; }
      .survey-box p{ margin:0 0 20px; font-size:14px; line-height:1.6; color:#4A5654; }
      .survey-go{ display:block; width:100%; box-sizing:border-box; padding:13px; border-radius:999px;
        background:#0F2E2C; color:#FBFAF6; font-size:15px; font-weight:600; text-decoration:none; }
      .survey-go:hover{ background:#123B38; }
      .survey-foot{ display:flex; align-items:center; justify-content:space-between; margin-top:16px; font-size:13px; color:#4A5654; }
      .survey-foot label{ display:flex; align-items:center; gap:6px; cursor:pointer; }
      .survey-close{ background:none; border:none; color:#4A5654; font-size:13px; font-family:inherit;
        cursor:pointer; padding:6px 4px; text-decoration:underline; }
      .survey-x{ position:absolute; top:10px; right:12px; background:none; border:none; font-size:18px;
        color:#4A5654; cursor:pointer; padding:4px 6px; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'survey-overlay';
    overlay.innerHTML = `
      <div class="survey-box" role="dialog" aria-modal="true" aria-labelledby="survey-title">
        <button class="survey-x" type="button" aria-label="닫기">✕</button>
        <h3 id="survey-title">설문조사에 참여해 주세요</h3>
        <p>UNEXPOSED를 더 좋게 만들기 위해 설문조사를 하고 있어요. 잠깐 시간 내서 참여해 주시면 큰 힘이 돼요!</p>
        <a class="survey-go" href="${SURVEY_URL}" target="_blank" rel="noopener noreferrer">설문 참여하기</a>
        <div class="survey-foot">
          <label><input type="checkbox" class="survey-never"><span>다시 보지 않기</span></label>
          <button class="survey-close" type="button">닫기</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const neverBox = overlay.querySelector('.survey-never');
    function close(){
      if(neverBox.checked) write(localStorage, NEVER_KEY, '1');
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e){ if(e.key === 'Escape') close(); }
    overlay.querySelector('.survey-x').addEventListener('click', close);
    overlay.querySelector('.survey-close').addEventListener('click', close);
    overlay.querySelector('.survey-go').addEventListener('click', close);
    overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
  }

  // 페이지가 다 뜬 뒤 살짝 늦게 띄워서 첫 화면이 먼저 보이게 해요.
  function start(){ setTimeout(show, 800); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
