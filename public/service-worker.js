// UNEXPOSED 서비스 워커
// - 화면(HTML)·JS·CSS: "네트워크 우선" — 항상 최신 파일을 받아오고, 받은 걸 캐시에 저장해둬요.
//   네트워크가 끊겼을 때만 캐시에 저장된 걸 보여줘요. (서버의 no-cache 정책과 같은 방향)
// - 아이콘·이미지·폰트: "캐시 우선 + 뒤에서 갱신" — 캐시에 있으면 바로 보여주고, 동시에 새 버전을 받아 캐시를 갱신해요.
// - /api/ 요청, GET이 아닌 요청, 다른 사이트 요청, 3D 모델(.glb 등 큰 파일)은 캐시하지 않고 그대로 통과시켜요.
// 캐시 구조를 바꾸면 CACHE_VERSION 을 올려주세요. 예전 캐시는 activate 때 자동으로 지워져요.

const CACHE_VERSION = 'v1';
const PAGE_CACHE = `unexposed-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `unexposed-assets-${CACHE_VERSION}`;

// 설치할 때 미리 받아두는 파일 (오프라인에서도 첫 화면이 열리도록)
const PRECACHE_URLS = ['/', '/manifest.json', '/icon-192.png?v=3', '/icon-512.png?v=3'];

const ASSET_EXT_RE = /\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i;
const SKIP_EXT_RE = /\.(glb|gltf|zip)$/i;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PAGE_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(() => {}) // 미리 받기에 실패해도 설치는 계속 진행해요
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([PAGE_CACHE, ASSET_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('unexposed-') && !keep.has(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (SKIP_EXT_RE.test(url.pathname)) return;

  if (ASSET_EXT_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

// 정상 응답(같은 사이트, 200)만 캐시에 저장해요
function cacheable(res) {
  return res && res.ok && res.type === 'basic';
}

async function networkFirst(req) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(req);
    if (cacheable(res)) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // 오프라인에서 처음 가보는 페이지를 열면 홈 화면이라도 보여줘요
    if (req.mode === 'navigate') {
      const home = await cache.match('/');
      if (home) return home;
    }
    throw err;
  }
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(req);
  const update = fetch(req).then(res => {
    if (cacheable(res)) cache.put(req, res.clone());
    return res;
  });
  if (cached) {
    event.waitUntil(update.catch(() => {}));
    return cached;
  }
  return update;
}
