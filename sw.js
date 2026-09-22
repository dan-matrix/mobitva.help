const CACHE_NAME = 'mobitva-shell-v1';

const SHELL_ASSETS = [
    '/style.css',
    '/js/common.js',
    '/js/db.js',
    '/js/statico.js',
    '/manifest.json',
    '/img/books.png',
    '/img/icon-192.png',
    '/img/icon-512.png',
    '/offline.html'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)).catch(() => { })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // Навигация по страницам: сначала сеть, при обрыве связи — офлайн-заглушка
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match('/offline.html'))
        );
        return;
    }

    // Статика (css/js/картинки/шрифты): сначала кэш, иначе сеть, с фоновым обновлением кэша
    const url = new URL(req.url);
    const isShellAsset = url.origin === location.origin && SHELL_ASSETS.includes(url.pathname);
    if (isShellAsset) {
        event.respondWith(
            caches.match(req).then(cached => {
                const networkFetch = fetch(req).then(res => {
                    if (res && res.ok) {
                        caches.open(CACHE_NAME).then(cache => cache.put(req, res.clone()));
                    }
                    return res;
                }).catch(() => cached);
                return cached || networkFetch;
            })
        );
    }
});
