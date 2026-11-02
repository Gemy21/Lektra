// ===== Local database (IndexedDB) =====
// Everything lives on the device: app data in the "kv" store, real file bytes in "files".
// No network, no Google Drive, works fully offline.

var DB_NAME = "lektra";
var DB_VERSION = 2;
var dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve, reject) {
    if (!window.indexedDB) { reject(new Error("IndexedDB not supported")); return; }
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "id" });
      // v2: the result of each scanned timetable, keyed by the photo's fingerprint.
      if (!db.objectStoreNames.contains("scans")) db.createObjectStore("scans", { keyPath: "key" });
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var t = db.transaction(store, mode);
      var req = fn(t.objectStore(store));
      t.oncomplete = function () { resolve(req ? req.result : undefined); };
      t.onerror = function () { reject(t.error); };
      t.onabort = function () { reject(t.error); };
    });
  });
}

function idbGet(store, key) { return tx(store, "readonly", function (s) { return s.get(key); }); }
function idbPut(store, value, key) { return tx(store, "readwrite", function (s) { return s.put(value, key); }); }
function idbDel(store, key) { return tx(store, "readwrite", function (s) { return s.delete(key); }); }
function idbAll(store) { return tx(store, "readonly", function (s) { return s.getAll(); }); }

// ===== Files =====

// Save a picked File into the local database. Returns the stored record.
function putFile(subjectId, file) {
  var rec = {
    id: uid(),
    subjectId: subjectId,
    name: file.name,
    type: file.type || "",
    size: file.size || 0,
    added: Date.now(),
    blob: file
  };
  return idbPut("files", rec).then(function () { return rec; });
}

function getFile(id) { return idbGet("files", id); }

function deleteFile(id) {
  if (id) return idbDel("files", id);
  return Promise.resolve();
}

function deleteFilesOf(subjectId) {
  return idbAll("files").then(function (all) {
    return Promise.all(all.filter(function (r) { return r.subjectId === subjectId; })
      .map(function (r) { return idbDel("files", r.id); }));
  });
}

function countFiles() { return idbAll("files").then(function (all) { return all.length; }); }

// Download a stored file.
function openStoredFile(id) {
  return getFile(id).then(function (rec) {
    if (!rec || !rec.blob) { toast("File not found"); return; }
    var url = URL.createObjectURL(rec.blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = rec.name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.parentNode.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }).catch(function () { toast("Could not open that file"); });
}

// ===== Scanned timetables =====
// The photo itself isn't stored - the fingerprint identifies it, so a re-upload
// of the same bytes can show the classes we read last time without spending an
// AI call. Records: { key, at, entries, name, size }.

function getScan(key) { return idbGet("scans", key); }
function putScan(rec) { return idbPut("scans", rec); }
function allScans() { return idbAll("scans"); }
function deleteScan(key) { return idbDel("scans", key); }

// ===== Data safety =====

// Ask the browser not to evict our data when storage gets tight.
function requestPersist() {
  if (navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
    navigator.storage.persisted().then(function (already) {
      if (!already) return navigator.storage.persist();
    }).catch(function () {});
  }
}

function storageInfo() {
  var out = { usage: 0, quota: 0, supported: !!(navigator.storage && navigator.storage.estimate) };
  if (!out.supported) return Promise.resolve(out);
  return navigator.storage.estimate().then(function (e) {
    out.usage = e.usage || 0;
    out.quota = e.quota || 0;
    return out;
  });
}

// ===== Backup (schedule data as JSON) =====

function exportData() {
  var data = { app: "lektra", version: 2, exported: new Date().toISOString(), state: state };
  var text = JSON.stringify(data, null, 2);
  var url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  var a = document.createElement("a");
  a.href = url;
  a.download = "lektra-backup-" + iso(new Date()) + ".json";
  document.body.appendChild(a);
  a.click();
  a.parentNode.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}

// The JSON backup carries file names and sizes, not the file bytes themselves.
// Keep only metadata whose blob still exists on this device, so a backup restored
// on another phone does not show files that cannot be opened.
function reconcileFiles() {
  if (typeof idbAll !== "function") return Promise.resolve();
  return idbAll("files").then(function (all) {
    var have = {};
    (all || []).forEach(function (r) { if (r && r.id) have[r.id] = true; });
    state.subjects.forEach(function (sub) {
      sub.files = (sub.files || []).filter(function (f) { return f && f.id && have[f.id]; });
    });
  }).catch(function () {});
}

function importData(file) {
  return file.text().then(function (text) {
    var parsed = JSON.parse(text);
    var s = parsed && parsed.state ? parsed.state : parsed;
    if (!s || !Array.isArray(s.subjects)) throw new Error("Not a Lektra backup");
    state = normalizeState(s);
    return reconcileFiles().then(function () {
      save();
      if (typeof applyTheme === "function") applyTheme();
      // A restored file should not leave the app on an old day or a dead filter.
      if (typeof tab !== "undefined") tab = "cal";
      if (typeof view !== "undefined" && typeof today !== "undefined") {
        view = new Date(today.getFullYear(), today.getMonth(), 1);
      }
      if (typeof dayOpen !== "undefined") dayOpen = null;
      if (typeof yearOpen !== "undefined") yearOpen = false;
      if (typeof openId !== "undefined") openId = null;
      if (typeof filterId !== "undefined") filterId = null;
      render();
      toast("Data restored");
    });
  });
}
