// UNEXPOSED 복제 방지 미들웨어
// ─────────────────────────────────────────────────────────────
// 웹에 올라간 이상 "100% 복제 불가"는 기술적으로 불가능해요.
// 대신 여러 겹의 방어막으로 AI 크롤러·스크래퍼·일반 사용자의 복제를
// 최대한 귀찮고 어렵게 만드는 게 목적이에요.
//
//  1) AI 크롤러 / 스크래핑 도구 User-Agent 차단 (403)
//  2) robots.txt + X-Robots-Tag 로 AI 학습 거부 선언
//  3) 과도한 요청(사이트 통째로 긁기) 속도 제한
//  4) 소스·스키마·백업 파일(.zip, .sql, .patch 등) 외부 접근 차단
//  5) JS/CSS/3D 모델을 주소창에 직접 쳐서 열거나 다른 사이트에서 끌어다 쓰는 것 차단
//  6) 배포되는 JS를 자동 난독화(변수명 뒤섞기 + 주석 제거)
//  7) 모든 페이지에 protect.js 자동 삽입 (우클릭·드래그·개발자도구 단축키·인쇄 방지)
//  8) 다른 사이트가 iframe 으로 우리 사이트를 통째로 감싸는 것 차단
// ─────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { rateLimit } = require('express-rate-limit');

let terserMinify = null;
try {
  ({ minify: terserMinify } = require('terser'));
} catch (e) {
  console.warn('⚠️  terser가 설치돼 있지 않아 JS 난독화 없이 원본을 내려줘요. (npm i terser)');
}

// ── 1) 차단할 AI 크롤러 / 스크래핑 도구 ──────────────────────────
const BLOCKED_UA = [
  // AI 학습·검색용 크롤러
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'ClaudeBot', 'Claude-Web', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'CCBot', 'Google-Extended', 'GoogleOther', 'Google-CloudVertexBot',
  'PerplexityBot', 'Perplexity-User',
  'Bytespider', 'Amazonbot', 'Applebot-Extended',
  'meta-externalagent', 'meta-externalfetcher', 'FacebookBot',
  'cohere-ai', 'cohere-training-data-crawler', 'Diffbot', 'ImagesiftBot',
  'Omgilibot', 'Omgili', 'YouBot', 'Timpibot', 'PetalBot', 'AI2Bot', 'Ai2Bot-Dolma',
  'DuckAssistBot', 'MistralAI-User', 'Kangaroo Bot', 'Scrapy', 'img2dataset',
  'Firecrawl', 'SemrushBot-OCOB', 'webzio-extended', 'iaskspider', 'VelenPublicWebCrawler',
  // 사이트 통째 다운로드 / 스크립트 도구
  'HTTrack', 'WebCopier', 'WebZIP', 'Teleport', 'SiteSnagger', 'Offline Explorer',
  'Wget', 'curl/', 'python-requests', 'python-urllib', 'aiohttp', 'httpx',
  'Go-http-client', 'node-fetch', 'axios/', 'undici', 'okhttp', 'Java/', 'libwww-perl',
  'HeadlessChrome', 'PhantomJS', 'Puppeteer', 'Playwright', 'Selenium',
];
const BLOCKED_UA_RE = new RegExp(
  BLOCKED_UA.map(s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|'),
  'i'
);

// 서버 유지에 꼭 필요한 봇은 예외 (UptimeRobot 콜드스타트 방지, Render 헬스체크)
const ALLOWED_UA_RE = /UptimeRobot|Render\//i;

// ── 2) robots.txt ─────────────────────────────────────────────
const ROBOTS_AI_AGENTS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web', 'Claude-User',
  'Claude-SearchBot', 'anthropic-ai', 'CCBot', 'Google-Extended', 'GoogleOther',
  'PerplexityBot', 'Perplexity-User', 'Bytespider', 'Amazonbot', 'Applebot-Extended',
  'meta-externalagent', 'FacebookBot', 'cohere-ai', 'Diffbot', 'ImagesiftBot',
  'Omgilibot', 'YouBot', 'Timpibot', 'AI2Bot', 'DuckAssistBot', 'MistralAI-User',
];
const ROBOTS_TXT = [
  '# UNEXPOSED — 모든 콘텐츠·코드·디자인의 AI 학습 및 복제를 금지합니다.',
  '# Copyright (c) PentaCorp. All rights reserved.',
  '',
  ...ROBOTS_AI_AGENTS.flatMap(a => [`User-agent: ${a}`, 'Disallow: /', '']),
  'User-agent: *',
  'Disallow: /admin.html',
  'Disallow: /api/',
  'Disallow: /models/',
  'Disallow: /wardrobe-assets/',
  'Disallow: /*.js$',
  'Disallow: /*.css$',
  'Disallow: /*.glb$',
  '',
].join('\n');

// ── 4) 외부에 절대 노출되면 안 되는 파일 ────────────────────────
const FORBIDDEN_EXT = new Set(['.zip', '.patch', '.diff', '.sql', '.md', '.map', '.bak', '.env', '.log', '.txt']);
const FORBIDDEN_PREFIXES = ['/files/', '/.git', '/.env'];
const FORBIDDEN_FILES = new Set(['/root-index.html', '/public-index.html', '/create-cta-snippet.html']);

// ── 5) 직접 열기 / 외부 사이트 핫링크 차단 대상 ──────────────────
const PROTECTED_ASSET_EXT = new Set(['.js', '.mjs', '.css', '.glb', '.gltf', '.json']);
const HOTLINK_EXT = new Set(['.js', '.mjs', '.css', '.glb', '.gltf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.json']);

// ── 7) 모든 HTML에 끼워넣을 보호 태그 ────────────────────────────
const HEAD_INJECT =
  '<meta name="robots" content="noai, noimageai">' +
  '<meta name="copyright" content="PentaCorp. All rights reserved.">' +
  '<script src="/protect.js"></script>';

function injectProtection(html) {
  if (typeof html !== 'string' || html.includes('/protect.js')) return html;
  const i = html.search(/<\/head>/i);
  if (i === -1) return html; // 조각(fragment) HTML은 그대로
  return html.slice(0, i) + HEAD_INJECT + html.slice(i);
}

function blockedPage(res, status = 403) {
  res.status(status).type('text/plain; charset=utf-8')
    .send('403 Forbidden — 이 리소스는 직접 접근하거나 복제할 수 없어요. © PentaCorp. UNEXPOSED');
}

// ── 6) JS 난독화 캐시 ──────────────────────────────────────────
const minCache = new Map(); // filePath -> { mtimeMs, code }

async function getMinifiedJs(filePath) {
  const stat = await fs.promises.stat(filePath);
  const cached = minCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.code;

  const src = await fs.promises.readFile(filePath, 'utf8');
  let code = src;
  if (terserMinify && process.env.DISABLE_JS_OBFUSCATION !== '1') {
    const isModule = /^\s*(import|export)\s/m.test(src);
    try {
      const out = await terserMinify(src, {
        module: isModule,
        compress: false, // 동작이 바뀌지 않도록 압축 최적화는 끄고, 이름 뒤섞기만
        mangle: true,
        format: { comments: false },
      });
      if (out && out.code) code = out.code;
    } catch (e) {
      console.warn(`[anti-copy] ${path.basename(filePath)} 난독화 실패 → 원본으로 내려줘요:`, e.message);
    }
  }
  code = `/* © PentaCorp. UNEXPOSED — 무단 복제·배포·AI 학습 금지 */\n${code}`;
  minCache.set(filePath, { mtimeMs: stat.mtimeMs, code });
  return code;
}

function safePublicPath(publicDir, reqPath) {
  let decoded;
  try { decoded = decodeURIComponent(reqPath); } catch { return null; }
  const full = path.normalize(path.join(publicDir, decoded));
  if (!full.startsWith(publicDir + path.sep)) return null;
  return full;
}

/**
 * server.js 에서 compression/json/cookieParser 바로 다음,
 * 그리고 app.get('/') 보다 "앞"에서 호출하세요.
 */
function applyAntiCopy(app, { publicDir }) {
  publicDir = path.resolve(publicDir);

  // 모든 응답 공통 헤더
  app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noai, noimageai');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.removeHeader('X-Powered-By');
    next();
  });

  // robots.txt (봇도 읽을 수 있어야 하므로 차단보다 먼저)
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain; charset=utf-8').send(ROBOTS_TXT);
  });

  // 1) AI 크롤러 / 스크래퍼 차단
  app.use((req, res, next) => {
    const ua = req.get('user-agent') || '';
    if (ALLOWED_UA_RE.test(ua)) return next();
    if (BLOCKED_UA_RE.test(ua)) return blockedPage(res);
    next();
  });

  // 3) 속도 제한 — 사이트를 통째로 긁어가는 요청 폭주 차단
  app.use(rateLimit({
    windowMs: 60 * 1000,
    limit: 300, // IP당 1분에 300요청 (일반 사용자는 한 페이지에 30~50요청 정도)
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: req => ALLOWED_UA_RE.test(req.get('user-agent') || ''),
    handler: (req, res) => res.status(429).type('text/plain; charset=utf-8')
      .send('요청이 너무 많아요. 잠시 후 다시 시도해주세요.'),
  }));

  // 4) 민감/백업 파일 차단 + 5) 직접 열기·핫링크 차단
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api/')) return next();

    const p = req.path.toLowerCase();
    const ext = path.extname(p);

    if (FORBIDDEN_EXT.has(ext) && p !== '/robots.txt') return blockedPage(res, 404);
    if (FORBIDDEN_FILES.has(p)) return blockedPage(res, 404);
    if (FORBIDDEN_PREFIXES.some(pre => p.startsWith(pre))) return blockedPage(res, 404);

    const dest = req.get('sec-fetch-dest');  // 브라우저가 붙여주는 "무슨 용도로 요청했는지"
    const site = req.get('sec-fetch-site');  // same-origin / same-site / cross-site / none

    // 주소창에 /customize.js 같은 걸 직접 쳐서 소스 보기 → 차단
    // (manifest.json 은 브라우저가 dest=manifest 로 요청하므로 영향 없음)
    if (PROTECTED_ASSET_EXT.has(ext) && dest === 'document') return blockedPage(res);

    // 다른 사이트에서 우리 JS/CSS/3D모델/이미지를 끌어다 쓰는 것 차단
    if (HOTLINK_EXT.has(ext) && site === 'cross-site') return blockedPage(res);

    next();
  });

  // 6) JS 난독화해서 내려주기
  app.get(/\.m?js$/i, async (req, res, next) => {
    const filePath = safePublicPath(publicDir, req.path);
    if (!filePath) return next();
    try {
      const code = await getMinifiedJs(filePath);
      res.type('application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      if (path.basename(filePath) === 'service-worker.js') res.setHeader('Service-Worker-Allowed', '/');
      res.send(code);
    } catch (e) {
      if (e.code === 'ENOENT') return next();
      next(e);
    }
  });

  // 7) HTML 응답마다 protect.js 자동 삽입 (res.send 로 나가는 HTML)
  app.use((req, res, next) => {
    const originalSend = res.send.bind(res);
    res.send = body => {
      const type = String(res.get('Content-Type') || '');
      if (typeof body === 'string' && (type === '' || type.includes('text/html'))) {
        body = injectProtection(body);
      }
      return originalSend(body);
    };
    next();
  });

  // 정적 .html 파일도 express.static 대신 여기서 읽어서 삽입 후 내려줘요.
  // (/ 와 /admin.html 은 server.js 의 기존 라우트가 처리 → 위의 res.send 래핑으로 삽입됨)
  app.get(/\.html$/i, async (req, res, next) => {
    if (req.path === '/index.html') return res.redirect(301, '/'); // 치환 안 된 원본 노출 방지
    if (req.path === '/admin.html') return next();
    const filePath = safePublicPath(publicDir, req.path);
    if (!filePath) return next();
    try {
      const html = await fs.promises.readFile(filePath, 'utf8');
      res.type('text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(html);
    } catch (e) {
      if (e.code === 'ENOENT') return next();
      next(e);
    }
  });
}

module.exports = { applyAntiCopy };
