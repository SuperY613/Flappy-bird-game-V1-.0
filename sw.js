// Service worker minimal caching for the demo
const CACHE_NAME = 'flappy999-v1';
const FILES_TO_CACHE = ['/', '/index.html', '/client-game.js', '/manifest.json', '/icons/icon-192.svg', '/icons/icon-512.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))); self.skipWaiting(); });
self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
