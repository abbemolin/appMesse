const CACHE_NAME = 'messes-v6';

const ASSETS_TO_CACHE = [
    './',
    './accueil.html',
    './calendrier.html',
    './calendrier_semaine.html',
    './intentions.html',
    './style.css',
    './config.js',
    './menu.js',
    './modal.js',
    './ordo1962.js',
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
// FETCH — réseau en priorité pour les fichiers de l'app
//         cache en priorité pour les CDN externes
// ==========================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // APIs distantes : réseau pur, pas de cache
    const isApi = url.hostname.includes('supabase') ||
                  url.hostname.includes('googleapis');
    if (isApi) {
        event.respondWith(
            fetch(event.request).catch(() => new Response('', { status: 503 }))
        );
        return;
    }

    // CDN externes (docx, html2canvas, supabase-js…) : cache en priorité
    const isCdn = url.hostname.includes('cdn.jsdelivr') ||
                  url.hostname.includes('fonts.googleapis') ||
                  url.hostname.includes('fonts.gstatic');
    if (isCdn) {
        event.respondWith(
            caches.match(event.request).then(cached => cached || fetch(event.request))
        );
        return;
    }

    // Fichiers de l'app : réseau en priorité, cache en fallback
    // → chaque déploiement GitHub est pris immédiatement
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Mettre à jour le cache avec la version fraîche
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// ==========================================
// NOTIFICATIONS PUSH — déclenché par l'app via postMessage
// ==========================================
self.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'CHECK_INTENTIONS') {
        const { count, lastCount } = event.data;
        if (count > lastCount && lastCount >= 0) {
            const diff = count - lastCount;
            const label = diff === 1 ? 'nouvelle intention' : 'nouvelles intentions';
            await self.registration.showNotification('Intentions de Messe', {
                body: diff + ' ' + label + ' en attente de traitement',
                icon: 'https://img.icons8.com/ios-filled/192/4f46e5/cross.png',
                badge: 'https://img.icons8.com/ios-filled/96/4f46e5/cross.png',
                tag: 'intentions-notif',
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
            for (const client of clients) {
                if (client.url.includes('intentions.html')) return client.focus();
            }
            return self.clients.openWindow('./intentions.html');
        })
    );
});
