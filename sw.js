const CACHE_NAME = 'messes-v4';

const ASSETS_TO_CACHE = [
    './',
    './accueil.html',
    './calendrier.html',
    './intentions.html',
    './style.css',
    './config.js',
    './menu.js',
    './modal.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Réseau en priorité pour les API, cache pour les assets statiques
    const url = new URL(event.request.url);
    const isApi = url.hostname.includes('supabase') || url.hostname.includes('googleapis') || url.hostname.includes('cdn.jsdelivr');

    if (isApi) {
        // API : réseau d'abord, pas de cache
        event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    } else {
        // Assets : cache d'abord, réseau en fallback
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
    }
});
