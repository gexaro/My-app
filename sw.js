
/* =========================================
   EXPIRY MANAGER
   Offline Service Worker
   Version 1.0
========================================= */

const CACHE_NAME = "expiry-manager-v11";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./db.js",
  "./expiry.js",
  "./app.js",
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

            if (cacheName !== CACHE_NAME) {
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

          const cachedPage = await caches.match(request);

          if (cachedPage) {
            return cachedPage;
          }

          return caches.match("./index.html");

        })

    );

    return;

  }


  // الملفات الثابتة: Cache First
  event.respondWith(

    caches.match(request)

      .then(async function(cachedResponse) {

        if (cachedResponse) {
          return cachedResponse;
        }

        const networkResponse = await fetch(request);

        if (networkResponse && networkResponse.ok) {

          const copy = networkResponse.clone();

          const cache = await caches.open(CACHE_NAME);

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
