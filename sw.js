
/* =========================================
   EXPIRY MANAGER
   Offline Service Worker
   Version 1.0
========================================= */

const CACHE_NAME = "expiry-manager-v33";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./db.js",
  "./expiry.js",
  "./app.js",
  "./navigation.js",
  "./settings.js",
  "./manifest.json"
];


/* =========================================
   1. Install
========================================= */

self.addEventListener("install", function(event) {

  event.waitUntil(

    caches.open(CACHE_NAME)

      .then(function(cache) {
        return cache.addAll(APP_FILES);
      })

      .then(function() {
        return self.skipWaiting();
      })

  );

});


/* =========================================
   2. Activate
========================================= */

self.addEventListener("activate", function(event) {

  event.waitUntil(

    caches.keys()

      .then(function(cacheNames) {

        return Promise.all(

          cacheNames.map(function(cacheName) {

if (
  cacheName.startsWith("expiry-manager-") &&
  cacheName !== CACHE_NAME
) {
  return caches.delete(cacheName);
}
          })

        );

      })

      .then(function() {
        return self.clients.claim();
      })

  );

});


/* =========================================
   3. Fetch
========================================= */

self.addEventListener("fetch", function(event) {

  const request = event.request;

  // التعامل مع صفحات التطبيق فقط
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // عدم تخزين طلبات المواقع الخارجية
  if (url.origin !== self.location.origin) {
    return;
  }

  // طلب فتح التطبيق أو التنقل بين الصفحات
  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request)

        .then(function(response) {

          if (response && response.ok) {

            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(request, copy);
              });

          }

          return response;

        })

        .catch(async function() {

const cache = await caches.open(CACHE_NAME);
const cachedPage = await cache.match(request);

if (cachedPage) {
  return cachedPage;
}

return cache.match("./index.html");
        })

    );

    return;

  }


  // الملفات الثابتة: Cache First
  event.respondWith(

caches.open(CACHE_NAME)

  .then(async function(cache) {

    const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        const networkResponse = await fetch(request);

        if (networkResponse && networkResponse.ok) {

          const copy = networkResponse.clone();



          await cache.put(request, copy);

        }

        return networkResponse;

      })

      .catch(function() {

        return new Response(
          "المحتوى غير متاح دون اتصال",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );

      })

  );

});
