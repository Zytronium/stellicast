const CACHE_NAME = 'stellicast-offline-v6';
const OFFLINE_URL = '/offline';

const OFFLINE_ASSETS = [
  OFFLINE_URL,
  '/logo.png',
  '/stellicast_smaller.png',
  '/fonts/FallingSky.otf'
];

self.addEventListener('install', (event) => {
  console.log('SW: Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching offline assets');

        return cache.addAll(
          OFFLINE_ASSETS.map((url) =>
            new Request(url, {
              cache: 'reload',
              credentials: 'same-origin'
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('SW: Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(async () => {
          console.log('SW: Serving offline page');

          const cachedResponse = await caches.match(OFFLINE_URL);

          return cachedResponse || Response.error();
        })
    );

    return;
  }

  // Static assets
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
  );
});
