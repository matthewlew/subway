// Service Worker for offline support
const CACHE_NAME = 'subway-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/src/js/app.js',
  '/src/js/dbService.js',
  '/src/js/locationService.js',
  '/src/js/mtaService.js',
  '/src/js/statsService.js',
  '/src/js/rideLogger.js',
  '/manifest.json',
  '/icons/icon-192x192.png'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network-first strategy for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone response before caching
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
  );
});

// Background sync for offline ride logging
self.addEventListener('sync', event => {
  if (event.tag === 'sync-rides') {
    event.waitUntil(syncPendingRides());
  }
});

async function syncPendingRides() {
  // This will be called when connectivity is restored
  const db = await openDB();
  const pendingRides = await db.getAll('pending-rides');

  for (const ride of pendingRides) {
    try {
      await fetch('/api/rides', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(ride)
      });
      await db.delete('pending-rides', ride.id);
    } catch (error) {
      console.error('Failed to sync ride:', error);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SubwayTrackerDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}