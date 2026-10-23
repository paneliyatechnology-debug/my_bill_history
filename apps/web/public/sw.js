// Indian Billing & Accounting SaaS - Production Service Worker
// Version: 1.0.0
const CACHE_NAME = "billing-saas-static-v1";

const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico"
];

// Install: Cache static app shell and offline fallback page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strict Security & Safe Caching Behavior
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. STRICT SECURITY GUARD:
  // NEVER cache authenticated API requests, tenant data, or non-GET requests.
  // Financial data, ledger transactions, and invoices must NEVER be stored in service worker cache.
  if (url.pathname.startsWith("/api/") || request.method !== "GET") {
    // Network-only, bypass cache entirely
    return;
  }

  // 2. Navigation Requests (Page loads): Network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const fallback = await cache.match("/offline.html");
        return fallback || new Response("Offline", { status: 503, statusText: "Service Unavailable" });
      })
    );
    return;
  }

  // 3. Static Static Assets (icons, manifest, static css/js chunks)
  if (
    url.pathname.startsWith("/_next/static/") ||
    PRECACHE_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached and update in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(request);
      })
    );
    return;
  }

  // Default: Let browser handle network request natively without interception
  return;
});
