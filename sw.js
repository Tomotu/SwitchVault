const CACHE = 'switchvault-v8';
const ASSETS = [
  '/SwitchVault/',
  '/SwitchVault/index.html',
  '/SwitchVault/queue.html',
  '/SwitchVault/production.html',
  '/SwitchVault/done.html',
  '/SwitchVault/stats.html',
  '/SwitchVault/data.js',
  '/SwitchVault/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        // Force all open tabs to reload so stale cached pages are evicted.
        clients.forEach(c => {
          try { c.navigate(c.url); } catch(e) {}
        });
      })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const isHTML = e.request.mode === 'navigate' ||
                 e.request.destination === 'document' ||
                 (e.request.headers.get('accept') || '').includes('text/html');

  // Network-first for HTML so users always get the latest app.
  if (isHTML) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request)
          .then(r => r || caches.match('/SwitchVault/index.html')))
    );
    return;
  }

  // Stale-while-revalidate for all other assets.
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => null);
        return cached || networkFetch;
      })
    )
  );
});
