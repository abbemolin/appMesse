const CACHE_NAME = 'messes-v5';

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

// ==========================================
// INSTALL — mise en cache des assets
// ==========================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

// ==========================================
// ACTIVATE — purge des vieux caches
// ==========================================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

// ==========================================
// FETCH — réseau en priorité pour APIs, cache pour assets
// ==========================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isApi = url.hostname.includes('supabase') ||
                  url.hostname.includes('googleapis') ||
                  url.hostname.includes('cdn.jsdelivr');

    if (isApi) {
        event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    } else {
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
    }
});

// ==========================================
// NOTIFICATIONS PUSH — déclenché par l'app via postMessage
// ==========================================
self.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'CHECK_INTENTIONS') {
        const { count, lastCount, supabaseUrl, supabaseKey } = event.data;

        // Si le nombre d'intentions en attente a augmenté, on notifie
        if (count > lastCount && lastCount >= 0) {
            const diff = count - lastCount;
            const label = diff === 1 ? 'nouvelle intention' : 'nouvelles intentions';
            await self.registration.showNotification('Intentions de Messe', {
                body: diff + ' ' + label + ' en attente de traitement',
                icon: 'https://img.icons8.com/ios-filled/192/4f46e5/cross.png',
                badge: 'https://img.icons8.com/ios-filled/96/4f46e5/cross.png',
                tag: 'intentions-notif',   // Remplace la notif précédente
                renotify: true,
                vibrate: [200, 100, 200],
                data: { url: './intentions.html' }
            });
        }
    }
});

// Clic sur la notification : ouvrir intentions.html
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Si l'app est déjà ouverte, focus
            for (const client of clients) {
                if (client.url.includes('intentions.html')) {
                    return client.focus();
                }
            }
            // Sinon ouvrir un nouvel onglet
            return self.clients.openWindow('./intentions.html');
        })
    );
});
