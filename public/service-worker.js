const CACHE_NAME = 'obs-gallery-remote-v43';

const APP_SHELL = [
  '/',
  '/index.html',
  '/main.css',
  '/app.js',
  '/manifest.webmanifest',

  '/js/pwa.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/dom.js',
  '/js/gallery.js',
  '/js/navigation.js',
  '/js/obs.js',
  '/js/scenes.js',
  '/js/sources.js',
  '/js/audio.js',
  '/js/output.js',
  '/js/obs-events.js',
  '/js/panel.js',
  '/js/program-monitor.js',
  '/js/services.js',
  '/js/ui.js',
  '/js/header.js',

  '/css/base.css',
  '/css/components.css',
  '/css/header.css',
  '/css/base-controls.css',
  '/css/navigation.css',
  '/css/toolbar.css',
  '/css/gallery.css',
  '/css/preview.css',
  '/css/messages.css',
  '/css/scenes.css',
  '/css/sources.css',
  '/css/audio.css',
  '/css/output.css',
  '/css/auth.css',
  '/css/pwa.css',
  '/css/program-monitor.css',
  '/css/responsive.css',

  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/logo-symbol.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );

  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Las APIs nunca deben pasar por caché.
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request);
    }),
  );
});
