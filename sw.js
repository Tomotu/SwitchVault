// KILL-SWITCH SERVICE WORKER
// This unregisters itself, deletes all caches, and reloads open pages.
// Purpose: recover clients stuck on a previously cached version of the app.
// Once everyone is recovered, this can be replaced with a real caching SW.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Delete every cache this origin owns.
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));

      // Take control of all open clients.
      await self.clients.claim();

      // Unregister this service worker.
      await self.registration.unregister();

      // Force every open tab to reload from the network.
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        try { client.navigate(client.url); } catch (e) {}
      });
    })()
  );
});

// Always go straight to the network — never serve from cache.
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
