const CACHE_NAME  = 'messes-v8';
const SYNC_TAG    = 'sync-intentions';
const QUEUE_KEY   = 'offline-queue';

const ASSETS_TO_CACHE = [
    './',
    './accueil.html',
    './calendrier.html',
    './calendrier_semaine.html',
    './intentions.html',
    './breviaire.html',
    './bible.html',
    './style.css',
    './config.js',
    './menu.js',
    './modal.js',
    './ordo1962.js',
    './manifest.json',
    './propers_db.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
];

// ══════════════════════════════════════════════════════════
// INSTALL
// ══════════════════════════════════════════════════════════
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// ══════════════════════════════════════════════════════════
// ACTIVATE — purge anciens caches
// ══════════════════════════════════════════════════════════
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ══════════════════════════════════════════════════════════
// FETCH — stratégie par type de requête
// ══════════════════════════════════════════════════════════
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // ── Supabase : réseau, intercepter les écritures si offline ──
    if (url.hostname.includes('supabase.co')) {
        // Requêtes de lecture (GET) : réseau avec fallback cache
        if (event.request.method === 'GET') {
            event.respondWith(
                fetch(event.request.clone())
                    .then(resp => {
                        const clone = resp.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                        return resp;
                    })
                    .catch(() => caches.match(event.request)
                        .then(cached => cached || new Response(
                            JSON.stringify([]),
                            { headers: { 'Content-Type': 'application/json' } }
                        ))
                    )
            );
            return;
        }

        // Requêtes d'écriture (POST/PATCH/DELETE) : mettre en queue si offline
        if (['POST','PATCH','DELETE','PUT'].includes(event.request.method)) {
            event.respondWith(
                fetch(event.request.clone()).catch(async () => {
                    // Hors ligne : sauvegarder dans IndexedDB
                    await enqueueRequest(event.request.clone());
                    return new Response(
                        JSON.stringify({ queued: true, offline: true }),
                        { status: 202, headers: { 'Content-Type': 'application/json' } }
                    );
                })
            );
            return;
        }
    }

    // ── Google APIs : réseau pur ──
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('google.com')) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify({ items: [] }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    // ── CDN externes : cache en priorité ──
    if (url.hostname.includes('cdn.jsdelivr') ||
        url.hostname.includes('fonts.googleapis') ||
        url.hostname.includes('fonts.gstatic')) {
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request)
                    .then(resp => {
                        const toCache = resp.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, toCache));
                        return resp;
                    })
                )
        );
        return;
    }

    // ── Fichiers de l'app : réseau en priorité, cache en fallback ──
    event.respondWith(
        fetch(event.request.clone())
            .then(resp => {
                if (resp.ok) {
                    const toCache = resp.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, toCache));
                }
                return resp;
            })
            .catch(() => caches.match(event.request))
    );
});

// ══════════════════════════════════════════════════════════
// QUEUE OFFLINE — IndexedDB
// ══════════════════════════════════════════════════════════
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('offline-queue-db', 1);
        req.onupgradeneeded = e => {
            e.target.result.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        };
        req.onsuccess  = e => resolve(e.target.result);
        req.onerror    = e => reject(e.target.error);
    });
}

async function enqueueRequest(request) {
    const body = await request.text().catch(() => '');
    const db   = await openDB();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction('queue', 'readwrite');
        const store = tx.objectStore('queue');
        store.add({
            url:     request.url,
            method:  request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body,
            ts:      Date.now(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror    = e => reject(e.target.error);
    });
}

async function getQueue() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction('queue', 'readonly');
        const store = tx.objectStore('queue');
        const req   = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror   = e => reject(e.target.error);
    });
}

async function deleteFromQueue(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction('queue', 'readwrite');
        const store = tx.objectStore('queue');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror    = e => reject(e.target.error);
    });
}

// ══════════════════════════════════════════════════════════
// BACKGROUND SYNC — déclenché quand la connexion revient
// ══════════════════════════════════════════════════════════
self.addEventListener('sync', event => {
    if (event.tag === SYNC_TAG) {
        event.waitUntil(flushQueue());
    }
});

async function flushQueue() {
    const queue = await getQueue();
    if (!queue.length) return;

    let success = 0;
    let errors  = 0;

    for (const item of queue) {
        try {
            const resp = await fetch(item.url, {
                method:  item.method,
                headers: item.headers,
                body:    item.body || undefined,
            });
            if (resp.ok || resp.status === 409) {
                // 409 = déjà synchronisé, on supprime quand même
                await deleteFromQueue(item.id);
                success++;
            } else {
                errors++;
            }
        } catch (e) {
            errors++;
        }
    }

    // Notifier l'app
    const clients = await self.clients.matchAll();
    clients.forEach(client => client.postMessage({
        type:    'SYNC_COMPLETE',
        success,
        errors,
        total:   queue.length,
    }));
}

// ══════════════════════════════════════════════════════════
// MESSAGES depuis l'app
// ══════════════════════════════════════════════════════════
self.addEventListener('message', async event => {
    // Déclencher la sync manuellement (quand connexion détectée)
    if (event.data?.type === 'SYNC_NOW') {
        await flushQueue();
    }

    // Vérifier la taille de la queue
    if (event.data?.type === 'GET_QUEUE_SIZE') {
        const queue = await getQueue();
        event.source.postMessage({
            type:  'QUEUE_SIZE',
            count: queue.length,
        });
    }

    // Notifications push (code existant)
    if (event.data?.type === 'CHECK_INTENTIONS') {
        const { count, lastCount } = event.data;
        if (count > lastCount && lastCount >= 0) {
            const diff = count - lastCount;
            self.registration.showNotification('AppMesse', {
                body: `${diff} nouvelle${diff > 1 ? 's' : ''} intention${diff > 1 ? 's' : ''} reçue${diff > 1 ? 's' : ''}`,
                icon: './icons/icon-192x192.png',
                badge: './icons/icon-72x72.png',
            });
        }
    }
});
