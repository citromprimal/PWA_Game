const CACHE_NAME = "maze-game-cache-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/description.html",
    "/styles.css",
    "/app.js",
    "/tasks.json",
    "/manifest.json",
    "/images/collectible.png",
    "/images/description.png",
    "/images/enemy.png",
    "/images/exit.png",
    "/images/exitopen.png",
    "/images/key.png",
    "/images/player.png",
    "/images/trap.png",
    "/music/backgroundmusic.mp3"
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching app assets...');
            return cache.addAll(urlsToCache);
        }).catch(error => {
            console.error('Failed to cache assets:', error);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        }).catch(error => {
            console.error('Fetch failed:', error);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});
