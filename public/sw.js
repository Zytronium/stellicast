const CACHE_NAME = 'stellicast-offline-v4';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching offline page');
        // Force fetch from network, bypass any cache
        return cache.add(new Request(OFFLINE_URL, {
          cache: 'reload',
          credentials: 'same-origin'
        }));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('SW: Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('SW: Serving offline page');
          return caches.match(OFFLINE_URL);
        })
    );
  }
});