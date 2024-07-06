const PRECACHE = "precache-v3"
const RUNTIME = "runtime-v3"

const PRECACHE_URLS = [
// INSERT CACHE URLS HERE
    'style.css',
    'solo/style.css',
    'solo/load_levels.js',
    'solo/index.html',
    'solo/default_levels.json',
    'service_worker.js',
    'robots.txt',
    'level/style.css',
    'level/main.js',
    'level/index.html',
    'js/sprite.js',
    'js/scoreboardmaker.js',
    'js/rtc.js',
    'js/renderer.js',
    'js/qrcode.js',
    'js/phone_coordinates.js',
    'js/objects.js',
    'js/nosleep.js',
    'js/mathutils.js',
    'js/gamestate.js',
    'js/boardrenderer.js',
    'js/boardgenerator.js',
    'js/board.js',
    'js/banner.js',
    'js/audioplayer.js',
    'join/index.html',
    'index.html',
    'impressum/index.html',
    'host/player_management.js',
    'host/main.js',
    'host/index.html',
    'host/game_setup.js',
    'host/game_management.js',
    'faq/index.html',
    'dev/index.html',
    'data-privacy/index.html',
    'contact/index.html',
    'client/index.html',
    'client/game_management.js',
    'client/credit_card.js',
    'client/connection_management.js',
    'about/index.html',
// UNTIL HERE
]

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(PRECACHE)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(self.skipWaiting())
    )
})

self.addEventListener("activate", event => {
    const currentCaches = [PRECACHE, RUNTIME]
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return cacheNames.filter(cacheName => !currentCaches.includes(cacheName))
            }).then(cachesToDelete => {
                return Promise.all(cachesToDelete.map(cacheToDelete => {
                    return caches.delete(cacheToDelete)
                }))
            }).then(() => self.clients.claim())
    )
})

self.addEventListener("fetch", event => {
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse
                }

                return caches.open(RUNTIME).then(cache => {
                    return fetch(event.request).then(response => {
                        return cache.put(event.request, response.clone()).then(() => {
                            return response
                        })
                    })
                })
            })
        )
    }
})