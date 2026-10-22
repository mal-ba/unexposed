/* community-glb.js : 3D 꾸미기·제작 스튜디오의 "커뮤니티 3D" 버튼.
   커뮤니티에 올라온 3D 파일(.glb) 목록을 팝업으로 보여주고 내려받게 해요.
   스튜디오 HTML 조각은 처음 열 때 동적으로 끼워 넣어서, 버튼 클릭은 document에서 위임으로 받아요. */
(function () {
  if (window.openCommunityGlbModal) return;

  function t(key, fallback) {
    const v = window.i18nText ? window.i18nText(key) : '';
    return v && v !== key ? v : fallback;
  }
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // 같은 사이트 주소라 download 속성의 이름이 그대로 저장 파일 이름이 돼요.
  function fileName(title) {
    return (String(title || '').replace(/[\\/:*?"<>|\x00-\x1F]/g, '_').trim().slice(0, 80) || 'model') + '.glb';
  }

  const style = document.createElement('style');
  style.textContent = `
  .community-3d-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--mist);border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--ink)}
  .community-3d-btn:hover{background:var(--paper)}
  @media(max-width:420px){.community-3d-btn span{display:none}}
  #community-glb-modal{z-index:260}
  #community-glb-modal .modal-box{max-width:520px;max-height:86vh;overflow-y:auto;padding:24px 22px;text-align:left}
  .cglb-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
  .cglb-desc{font-size:13px;color:var(--ink-soft);margin:0 0 14px}
  .cglb-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  @media(min-width:520px){.cglb-list{grid-template-columns:repeat(3,1fr)}}
  .cglb-card{border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;background:var(--paper)}
  .cglb-thumb{width:100%;aspect-ratio:1;object-fit:cover;background:var(--mist);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--ink-soft)}
  .cglb-body{padding:8px 10px 10px;display:flex;flex-direction:column;gap:4px;flex:1}
  .cglb-title{font-size:12.5px;font-weight:700;line-height:1.35;word-break:break-word}
  .cglb-author{font-size:11px;color:var(--ink-soft);flex:1}
  .cglb-dl{display:block;text-align:center;border-radius:999px;background:var(--deep,#0F2E2C);color:#fff;font-size:11.5px;font-weight:600;padding:6px 8px;text-decoration:none;margin-top:4px}
  .cglb-dl:hover{opacity:.9}
  .cglb-note{font-size:13px;color:var(--ink-soft);text-align:center;padding:24px 0}
  .cglb-mine{border:1px solid var(--line);border-radius:12px;background:var(--mist);padding:12px 14px;margin:0 0 16px}
  .cglb-mine[hidden]{display:none}
  .cglb-mine-title{font-size:13.5px;font-weight:700;margin:0 0 4px}
  .cglb-mine-desc{font-size:12px;color:var(--ink-soft);margin:0 0 10px}
  .cglb-mine .cglb-dl{display:inline-block;border:none;cursor:pointer;font-family:inherit;padding:7px 14px;margin:0}
  .cglb-mine .cglb-dl:disabled{opacity:.5;cursor:default}
  .cglb-mine-note{font-size:12px;color:var(--ink-soft);margin:8px 0 0}
  `;
  document.head.appendChild(style);

  let modal = null;
  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'community-glb-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="modal-box">
        <div class="cglb-head">
          <h3 class="serif" style="font-size:19px;margin:0;">${esc(t('community3dModalTitle', '커뮤니티 3D 작품 내려받기'))}</h3>
          <button class="wizard-close" type="button" data-cglb-close aria-label="닫기">✕</button>
        </div>
        <div class="cglb-mine" id="cglb-mine" hidden>
          <p class="cglb-mine-title">내가 만든 옷</p>
          <p class="cglb-mine-desc">제작 스튜디오에서 지금 만들고 있는 옷을 3D 파일(.glb)로 내려받습니다. 부위 색과 브러시 그림이 그대로 들어갑니다.</p>
          <button class="cglb-dl" type="button" data-cglb-mine>내 옷 3D 파일 내려받기 (.glb)</button>
          <p class="cglb-mine-note" id="cglb-mine-note" hidden></p>
        </div>
        <p class="cglb-desc">${esc(t('community3dModalDesc', '커뮤니티에 올라온 3D 파일(.glb)을 내려받을 수 있습니다.'))}</p>
        <div class="cglb-list" id="cglb-list"></div>
        <p class="cglb-note" id="cglb-note"></p>
      </div>`;
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('[data-cglb-close]')) modal.hidden = true;
      if (e.target.closest('[data-cglb-mine]')) downloadMine();
    });
    document.body.appendChild(modal);
    return modal;
  }

  async function loadList() {
    const list = modal.querySelector('#cglb-list');
    const note = modal.querySelector('#cglb-note');
    list.innerHTML = '';
    note.hidden = false;
    note.textContent = t('community3dLoading', '불러오는 중…');
    try {
      const res = await fetch('/api/community/posts?glb=1');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      const posts = (data.posts || []).filter(p => p.glbUrl);
      if (!posts.length) {
        note.textContent = t('community3dEmpty', '아직 올라온 3D 작품이 없습니다.');
        return;
      }
      note.hidden = true;
      const dlLabel = esc(t('community3dDownload', 'GLB 다운로드'));
      list.innerHTML = posts.map(p => `
        <div class="cglb-card">
          ${p.imageUrl ? `<img class="cglb-thumb" src="${esc(p.imageUrl)}" alt="${esc(p.title)}" loading="lazy">` : '<div class="cglb-thumb">3D</div>'}
          <div class="cglb-body">
            <div class="cglb-title">${esc(p.title)}</div>
            <div class="cglb-author">${esc(p.authorName || t('communityAnonymous', '익명'))}</div>
            <a class="cglb-dl" href="/api/community/posts/${encodeURIComponent(p.id)}/download" download="${esc(fileName(p.title))}">${dlLabel}</a>
          </div>
        </div>`).join('');
    } catch (err) {
      note.textContent = t('community3dLoadError', '목록을 불러오지 못했습니다.');
    }
  }

  // 제작 스튜디오(create.js)가 열려 있으면, 지금 만들고 있는 옷을 바로 내려받는 칸을 맨 위에 보여줘요.
  function renderMine() {
    const studio = window.createStudioDesignGlb;
    const box = modal.querySelector('#cglb-mine');
    const note = modal.querySelector('#cglb-mine-note');
    box.hidden = !(studio && studio.available());
    note.hidden = true;
    if (box.hidden) return;
    const ready = studio.ready();
    modal.querySelector('[data-cglb-mine]').disabled = !ready;
    if (!ready) { note.hidden = false; note.textContent = '3D 옷이 아직 준비되지 않았습니다. 3D 옷이 보일 때 다시 눌러주세요.'; }
  }
  async function downloadMine() {
    const studio = window.createStudioDesignGlb;
    if (!studio) return;
    const btn = modal.querySelector('[data-cglb-mine]');
    const note = modal.querySelector('#cglb-mine-note');
    btn.disabled = true;
    note.hidden = false;
    note.textContent = '3D 파일을 만드는 중...';
    const ok = await studio.download();
    btn.disabled = false;
    if (ok) {
      note.replaceChildren(document.createTextNode(studio.label()), document.createTextNode(' 3D 파일(.glb)을 내려받았습니다.'));
    } else {
      note.textContent = '3D 파일을 만들지 못했습니다.';
    }
  }

  window.openCommunityGlbModal = function () {
    ensureModal().hidden = false;
    renderMine();
    loadList();
  };

  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-community-glb]')) window.openCommunityGlbModal();
  });
})();
