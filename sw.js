const CACHE_NAME = 'messes-v1';

// Liste des fichiers à mettre en cache pour le mode hors-ligne
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './intentions.html',
    './planification.html',
    './style.css',
    './config.js',
    './menu.js',
    './manifest.json'
];

// Installation : on met les fichiers en cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activation : on nettoie les anciens caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// Fetch : on répond avec le cache si disponible, sinon on va sur le réseau
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
