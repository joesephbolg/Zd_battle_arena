const CACHE_NAME = "zd-battle-arena-v1";

const FILES_TO_CACHE = [
"./",
"./index.html",
"./style.css",
"./script.js",
"./manifest.json",
"./icon-192.png",
"./icon-512.png"
];

self.addEventListener("install", event => {
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => cache.addAll(FILES_TO_CACHE))
.then(() => self.skipWaiting())
);
});

self.addEventListener("activate", event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(
keys
.filter(key => key !== CACHE_NAME)
.map(key => caches.delete(key))
)
).then(() => self.clients.claim())
);
});

self.addEventListener("fetch", event => {
if (event.request.method !== "GET") return;

event.respondWith(
caches.match(event.request).then(cachedResponse => {
if (cachedResponse) return cachedResponse;

  return fetch(event.request).then(response => {
    if (
      response &&
      response.status === 200 &&
      new URL(event.request.url).origin === self.location.origin
    ) {
      const responseCopy = response.clone();

      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, responseCopy);
      });
    }

    return response;
  }).catch(() => {
    if (event.request.mode === "navigate") {
      return caches.match("./index.html");
    }

    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" }
    });
  });
})

);
});
