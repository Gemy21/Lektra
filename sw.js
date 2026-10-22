// ===== Lektra service worker: makes the app installable + fully offline =====
// Bump CACHE when you ship changes so phones pick up the new version.
var CACHE = "lektra-v40";

var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/db.js",
  "./js/state.js",
  "./js/modal.js",
  "./js/calendar.js",
  "./js/subjects.js",
  "./js/search.js",
  "./js/voice.js",
  "./js/reminders.js",
  "./js/scan.js",
  "./js/main.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./assets/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // Fetch with cache:"reload" so the browser's HTTP cache can't hand us an old
      // copy. With a plain addAll(), a stale file can get baked into the NEW cache
      // version name and then be served forever.
      return Promise.all(ASSETS.map(function (url) {
        return fetch(new Request(url, { cache: "reload" })).then(function (res) {
          if (!res || !res.ok) throw new Error("Failed to cache " + url);
          return c.put(url, res);
        });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(self.registration.scope) === 0 && "focus" in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        // cache same-origin successes so the app shell keeps working offline
        if (res && res.status === 200 && (res.type === "basic" || res.type === "default")) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // offline navigation fallback
        if (req.mode === "navigate") {
          return caches.match("./index.html").then(function (page) {
            return page || caches.match("./");
          });
        }
        return Response.error();
      });
    })
  );
});
