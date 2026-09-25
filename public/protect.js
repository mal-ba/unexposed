// UNEXPOSED 클라이언트 복제 방지
// 서버(anti-copy.js)가 모든 페이지 <head>에 자동으로 넣어줘요. 직접 추가할 필요 없어요.
// 입력칸(input/textarea/contenteditable)에서는 복사·붙여넣기·우클릭이 정상 동작해요.
(function () {
  'use strict';
  if (window.__unexposedProtected) return;
  window.__unexposedProtected = true;

  var NOTICE = '© PentaCorp. UNEXPOSED — 무단 복제·배포·AI 학습 금지';

  function isEditable(el) {
    if (!el || el.nodeType !== 1) el = el && el.parentElement;
    if (!el) return false;
    return !!el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
  }

  // 1) 텍스트 선택 · 모바일 길게 눌러 이미지 저장 · 인쇄 막기
  var style = document.createElement('style');
  style.textContent =
    'html,body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    'input,textarea,select,[contenteditable="true"]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}' +
    'img,svg,canvas,video{-webkit-user-drag:none;user-drag:none}' +
    '@media print{html,body{display:none!important}}';
  (document.head || document.documentElement).appendChild(style);

  // 2) 우클릭 메뉴 막기 (입력칸 제외)
  document.addEventListener('contextmenu', function (e) {
    if (!isEditable(e.target)) e.preventDefault();
  }, true);

  // 3) 이미지·캔버스 드래그로 끌어가기 막기
  document.addEventListener('dragstart', function (e) {
    if (!isEditable(e.target)) e.preventDefault();
  }, true);

  // 4) 복사/잘라내기: 입력칸 밖이면 원문 대신 저작권 문구만 복사되게
  function onCopy(e) {
    if (isEditable(document.activeElement) || isEditable(e.target)) return;
    e.preventDefault();
    if (e.clipboardData) e.clipboardData.setData('text/plain', NOTICE);
  }
  document.addEventListener('copy', onCopy, true);
  document.addEventListener('cut', onCopy, true);

  // 5) 개발자도구 / 소스보기 / 저장 / 인쇄 단축키 막기
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    var mod = e.ctrlKey || e.metaKey;
    if (
      k === 'f12' ||
      (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c' || k === 'k')) ||
      (e.metaKey && e.altKey && (k === 'i' || k === 'j' || k === 'c' || k === 'u')) ||
      (mod && (k === 'u' || k === 's' || k === 'p'))
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // 6) 다른 사이트가 iframe으로 감싸면 우리 사이트로 빠져나오기
  try {
    if (window.top !== window.self && window.top.location.origin !== window.location.origin) {
      window.top.location = window.location.href;
    }
  } catch (err) {
    window.top.location = window.location.href;
  }

  // 7) 개발자도구 콘솔을 연 사람에게 경고
  try {
    console.log('%c잠깐!', 'color:#D8663F;font-size:32px;font-weight:700');
    console.log('%c' + NOTICE + '\n이 사이트의 코드·디자인·3D 에셋은 저작권법으로 보호됩니다.', 'color:#0F2E2C;font-size:14px');
  } catch (err) {}
})();
