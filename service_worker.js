const PRECACHE = "precache-v1"
const RUNTIME = "runtime"

const PRECACHE_URLS = [
// INSERT CACHE URLS HERE
    'style.css',
    'service_worker.js',
    'scripts/__pycache__/build_service_worker.cpython-39.pyc',
    'scripts/compress_assets.py',
    'scripts/build_service_worker.py',
    'scripts/build.py',
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
    'join/index.html',
    'index.html',
    'impressum/index.html',
    'host/player_management.js',
    'host/main.js',
    'host/index.html',
    'host/game_setup.js',
    'host/game_management.js',
    'faq/index.html',
    'data-privacy/index.html',
    'contact/index.html',
    'client/index.html',
    'client/game_management.js',
    'client/credit_card.js',
    'client/connection_management.js',
    'assets/zoom-icon.svg',
    'assets/scoreboard-header.png',
    'assets/pics/multigolf-in-action.jpg',
    'assets/pics/demo-img.jpg',
    'assets/pics/demo-img-transparent.png',
    'assets/old/old_logo.svg',
    'assets/old/old_logo.png',
    'assets/old/old_background.svg',
    'assets/objects/wall.svg',
    'assets/objects/start.svg',
    'assets/objects/lava.svg',
    'assets/objects/hole.svg',
    'assets/objects/grid2.svg',
    'assets/objects/grid.svg',
    'assets/objects/gravity-box.svg',
    'assets/objects/eraser.svg',
    'assets/objects/duellHole2.svg',
    'assets/objects/duellHole1.svg',
    'assets/objects/credit-card.svg',
    'assets/objects/big_grid.svg',
    'assets/objects/balls/yellow.svg',
    'assets/objects/balls/white.svg',
    'assets/objects/balls/violet.svg',
    'assets/objects/balls/red.svg',
    'assets/objects/balls/pink.svg',
    'assets/objects/balls/orange.svg',
    'assets/objects/balls/light_blue.svg',
    'assets/objects/balls/cyan.svg',
    'assets/objects/balls/blue.svg',
    'assets/logo/pride_logo.svg',
    'assets/logo/logo64.png',
    'assets/logo/logo512.png',
    'assets/logo/logo32.png',
    'assets/logo/logo256.png',
    'assets/logo/logo192.png',
    'assets/logo/logo16.png',
    'assets/logo/logo128.png',
    'assets/logo/logo1024.png',
    'assets/logo/logo.svg',
    'assets/logo/logo.png',
    'assets/logo/favicon.ico',
    'assets/gifs/qr-loading.gif',
    'assets/gifs/place-start.gif',
    'assets/gifs/place-end.gif',
    'assets/gifs/building.gif',
    'assets/gifs/background.gif',
    'assets/compressed/zoom-icon.png',
    'assets/compressed/old/old_logo.png',
    'assets/compressed/old/old_background.png',
    'assets/compressed/objects/wall.png',
    'assets/compressed/objects/start.png',
    'assets/compressed/objects/lava.png',
    'assets/compressed/objects/hole.png',
    'assets/compressed/objects/grid.png',
    'assets/compressed/objects/gravity-box.png',
    'assets/compressed/objects/eraser.png',
    'assets/compressed/objects/duellHole2.png',
    'assets/compressed/objects/duellHole1.png',
    'assets/compressed/objects/balls/yellow.png',
    'assets/compressed/objects/balls/white.png',
    'assets/compressed/objects/balls/violet.png',
    'assets/compressed/objects/balls/red.png',
    'assets/compressed/objects/balls/pink.png',
    'assets/compressed/objects/balls/orange.png',
    'assets/compressed/objects/balls/light_blue.png',
    'assets/compressed/objects/balls/cyan.png',
    'assets/compressed/objects/balls/blue.png',
    'assets/compressed/logo/logo.png',
    'assets/compressed/background.png',
    'assets/background.svg',
    'assets/background-test.svg',
    'assets/background-pixelated.png',
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