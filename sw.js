// 旅遊記帳本 Service Worker
const CACHE_NAME = 'travel-expense-v6.6';

// Install: 不預快取任何東西，避免外部資源失敗
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate: 清掉舊快取，立即接管
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

// Fetch: 只處理 GET 同源請求
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 跳過非 GET、非同源、Firebase、Google 服務
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) return;

  // HTML / navigate 請求：network first, cache fallback
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // 成功就快取一份
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // 其他靜態資源：cache first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      });
    })
  );
});
