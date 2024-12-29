const CACHE_NAME = "maze-game-cache-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/description.html",
    "/app.js",
    "/images/collectible.png",
    "/images/description.png",
    "/images/enemy.png",
    "/images/exit.png",
    "/images/exitopen.png",
    "/images/key.png",
    "/images/player.png",
    "/images/trap.png",
    "/music/backgroundmusic.mp3",
    "/tasks.json",
    "/styles.css"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Opened cache");
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener("activate", (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
