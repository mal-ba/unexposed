// ====== site-footer.js : index.html에 없는 다른 페이지들에 동일한 footer
// (문의하기 / 버그 제보하기 / 언어 버튼)를 붙여주는 공용 스크립트예요.
// side-menu.html을 불러오는 menu-loader.js와 같은 방식이에요.
(function(){
  const mount = document.getElementById('footer-mount');
  if(!mount) return;

  async function init(){
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '/site-footer.css';
    document.head.appendChild(cssLink);

    const html = await (await fetch('/site-footer.html')).text();
    mount.outerHTML = html;

    // 언어 스위처가 이미 우측 하단에 떠 있었다면, 방금 생긴 footer 자리로 옮겨요.
    if(window.i18nRelocate) window.i18nRelocate();
    if(window.i18nApply) window.i18nApply();

    /* ---------- 문의 챗봇 (처음 누를 때만 불러옴) ---------- */
    let supportBundleLoaded = false;
    let supportBundleLoading = null;
    function loadSupportBundle(){
      if(supportBundleLoaded) return Promise.resolve();
      if(supportBundleLoading) return supportBundleLoading;
      supportBundleLoading = (async () => {
        const supportCss = document.createElement('link');
        supportCss.rel = 'stylesheet';
        supportCss.href = '/support-panel.css';
        document.head.appendChild(supportCss);

        const supportHtml = await (await fetch('/support-panel.html')).text();
        const supportMount = document.getElementById('support-mount');
        if(supportMount) supportMount.outerHTML = supportHtml;

        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/support-chat.js';
          s.onload = resolve;
          s.onerror = reject;
          document.body.appendChild(s);
        });
        supportBundleLoaded = true;
      })();
      return supportBundleLoading;
    }

    const contactFab = document.getElementById('contact-fab');
    if(contactFab){
      contactFab.addEventListener('click', async () => {
        await loadSupportBundle();
        if(typeof window.openSupportPanel === 'function') window.openSupportPanel();
      });
    }

    /* ---------- 버그 제보 ---------- */
    const bugreportFab = document.getElementById('bugreport-fab');
    const bugreportModal = document.getElementById('bugreport-modal');
    const bugreportCloseBtn = document.getElementById('bugreport-close-btn');
    const bugreportForm = document.getElementById('bugreport-form');
    const bugreportInput = document.getElementById('bugreport-desc-input');
    const bugreportSubmitBtn = document.getElementById('bugreport-submit-btn');
    const bugreportNote = document.getElementById('bugreport-note');

    if(bugreportFab && bugreportModal){
      bugreportFab.addEventListener('click', () => {
        bugreportNote.textContent = '';
        bugreportInput.value = '';
        bugreportModal.hidden = false;
        bugreportInput.focus();
      });
      bugreportCloseBtn.addEventListener('click', () => { bugreportModal.hidden = true; });
      bugreportModal.addEventListener('click', e => { if(e.target === bugreportModal) bugreportModal.hidden = true; });

      bugreportForm.addEventListener('submit', async e => {
        e.preventDefault();
        const description = bugreportInput.value.trim();
        if(!description) return;
        bugreportSubmitBtn.disabled = true;
        bugreportSubmitBtn.textContent = '보내는 중...';
        try{
          const res = await fetch('/api/bug-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, pageUrl: location.href }),
          });
          const data = await res.json();
          if(data.ok){
            bugreportNote.textContent = '제보 감사합니다! 확인 후 처리하겠습니다.';
            bugreportInput.value = '';
            setTimeout(() => { bugreportModal.hidden = true; }, 1200);
          } else {
            bugreportNote.textContent = data.error || '전송에 실패했습니다.';
          }
        } catch(err){
          bugreportNote.textContent = '전송 중 오류가 발생했습니다.';
        } finally {
          bugreportSubmitBtn.disabled = false;
          bugreportSubmitBtn.textContent = '제보하기';
        }
      });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
