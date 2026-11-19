// ===== Lektra service worker: makes the app installable + fully offline =====
//
// Every build gets its own cache name AND its own versioned code URLs
// (?v=<version>). That makes an update atomic: the new HTML, CSS and JS are
// fetched together into one cache, and the GitHub Pages CDN can never slip an
// old file into a new build. `tools/bump-version.py` keeps BUILD, APP_BUILD,
// index.html and version.json in sync, so this is one command, not a checklist.
var BUILD = "2.2";                 // keep in sync with APP_BUILD (js/main.js)
var CACHE = "lektra-" + BUILD;
var V = "?v=" + BUILD;

// Localhost is for editing: serve the network first so a changed file appears
// on a plain reload without bumping the build, and fall back to the cache when
// the dev server is off. Production stays cache-first (instant, works offline).
var DEV = self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname === "[::1]";

// The worker's own scope is the app root, even when the site lives under
// github.io/<repo>/. Every cache key is absolute so nothing depends on how the
// browser resolved a relative URL.
var SCOPE = self.registration && self.registration.scope
  ? self.registration.scope
  : self.location.href.replace(/[^/]*$/, "");

function abs(path) { return new URL(path, SCOPE).href; }

var SHELL = abs("index.html");
var VERSIONED_SHELL = SHELL + V;

// Code is required: if any of it fails, the new build must not install (the
// old, working version stays in charge).
var CODE = [
  "./css/style.css",
  "./js/db.js",
  "./js/state.js",
  "./js/appearance.js",
  "./js/month.js",
  "./js/modal.js",
  "./js/calendar.js",
  "./js/daymenu.js",
  "./js/subjects.js",
  "./js/search.js",
  "./js/voice.js",
  "./js/chat.js",
  "./js/reminders.js",
  "./js/scan.js",
  "./js/scan-worker.js",
  "./js/camera.js",
  "./js/install.js",
  "./js/main.js"
].map(abs).map(function (url) { return url + V; });

// Pictures and the font are not code. If one of them fails to cache the app is
// still usable, so a cosmetic 404 must never block a whole update.
var MEDIA = [
  "./manifest.json",
  "./assets/fonts/nunito-latin.woff2",
  "./assets/icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./assets/apple-touch-icon.png"
].map(abs);

function fetchFresh(url, tries) {
  return fetch(new Request(url, { cache: "reload", credentials: "same-origin" }))
    .then(function (res) {
      if (!res || !res.ok) throw new Error("Failed to cache " + url);
      return res;
    })
    .catch(function (err) {
      if (tries <= 1) throw err;
      return new Promise(function (resolve) { setTimeout(resolve, 300); })
        .then(function () { return fetchFresh(url, tries - 1); });
    });
}

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // The shell is stored under the versioned key it was fetched from, and
      // under the clean navigation keys the browser will ask for.
      return fetchFresh(VERSIONED_SHELL, 3).then(function (res) {
        return Promise.all([
          c.put(VERSIONED_SHELL, res.clone()),
          c.put(SHELL, res.clone()),
          c.put(SCOPE, res.clone())
        ]);
      }).then(function () {
        return Promise.all(CODE.map(function (url) {
          return fetchFresh(url, 3).then(function (res) { return c.put(url, res); });
        }));
      }).then(function () {
        return Promise.all(MEDIA.map(function (url) {
          return fetchFresh(url, 2)
            .then(function (res) { return c.put(url, res); })
            .catch(function () { /* optional asset */ });
        }));
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        // Only this app's old caches. github.io is a shared origin: other
        // projects under the same account keep their own Cache Storage.
        if (k !== CACHE && k.indexOf("lektra-") === 0) return caches.delete(k);
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

  // The update probe is always live. It carries a unique query from the page,
  // so neither the CDN nor this cache can answer with an old build.
  if (url.pathname.slice(-13) === "/version.json") {
    e.respondWith(
      fetch(req, { cache: "no-store" }).catch(function () {
        return new Response('{"build":""}', { headers: { "Content-Type": "application/json" } });
      })
    );
    return;
  }

  // Dev server: network-first, so editing a file and reloading just works.
  if (DEV) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok && (res.type === "basic" || res.type === "default")) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match(SHELL); });
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    var asked = url.searchParams.get("v");
    // An explicit different build (the page's last-resort escape from a stuck
    // cache) goes to the network first. Everything else uses the atomic shell:
    // HTML, CSS and JS are always the same build, even offline.
    if (asked && asked !== BUILD) {
      e.respondWith(
        // Do not store this response: it belongs to a different build, and
        // mixing its HTML with this cache's versioned CSS/JS would break the
        // atomic build offline. The proper cache is filled by the new worker.
        fetch(req.url, { cache: "reload", credentials: "same-origin" }).catch(function () {
          return caches.match(SHELL).then(function (hit) { return hit || caches.match(SCOPE); });
        })
      );
      return;
    }

    e.respondWith(
      caches.match(SHELL).then(function (hit) {
        return hit || caches.match(SCOPE);
      }).then(function (hit) {
        if (hit) return hit;
        // No shell in this cache yet (first run): fetch and remember it.
        return fetch(req).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(SHELL, copy); });
          }
          return res;
        }).catch(function () {
          return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        });
      })
    );
    return;
  }

  // Versioned code is immutable, so cache-first is both instant and safe. Any
  // other same-origin GET is cached after its first successful fetch.
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && (res.type === "basic" || res.type === "default")) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return Response.error();
      });
    })
  );
});
