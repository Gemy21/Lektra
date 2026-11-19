// ===== Subjects (folders) =====
// The New subject sheet has a single dashed box, shaped like the day's
// "Nothing on this day" placeholder. It is the name field: while it is empty it
// shows sample subject names in turn, each with an icon that belongs to that
// subject, so the box reads as a real example instead of a hint. Typing takes
// over; deleting the text brings the examples back.
var SUBJECT_EXAMPLES = [
  { name: "Data Structures", icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="2.3"/><circle cx="6" cy="12.9" r="2.3"/><circle cx="18" cy="12.9" r="2.3"/><circle cx="6" cy="20.4" r="1.9"/><path d="M10.9 6.6 7.1 11M13.1 6.6l3.8 4.4M6 15.2v3.3"/></svg>' },
  { name: "Linear Algebra", icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.4 3.4H4.8v17.2h2.6M16.6 3.4h2.6v17.2h-2.6"/><path d="M9.2 8.2h5.6M9.2 12h5.6M9.2 15.8h5.6"/></svg>' },
  { name: "Organic Chemistry", icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.4 3.2h5.2M10.4 3.2v5.1L5.5 17.4A2.6 2.6 0 0 0 7.8 21.4h8.4a2.6 2.6 0 0 0 2.3-4L13.6 8.3V3.2"/><path d="M7.6 15.4h8.8"/></svg>' },
  { name: "Microeconomics", icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.2 3.6v16.8h16.2"/><path d="M8.2 20.4v-5.2M12.6 20.4v-9M17 20.4v-6.6"/></svg>' },
  { name: "Operating Systems", icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.2" y="4.2" width="17.6" height="15.6" rx="3"/><path d="M7.6 9.6l3 2.4-3 2.4M12.8 15.2h4"/></svg>' },
  { name: "Discrete Math", icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5.2" cy="18" r="2.2"/><circle cx="12" cy="4.8" r="2.2"/><circle cx="18.8" cy="13.4" r="2.2"/><path d="M6.6 16.2 10.7 6.8M13.6 6.6l3.7 5.1M7.4 18.6l9.2-4.4"/></svg>' },
  { name: "Computer Networks", icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.3 2.4 3.5 5.3 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.3-3.5-8.6S9.7 5.8 12 3.4z"/></svg>' },
  { name: "Machine Learning", icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2.6"/><path d="M10.2 3.2v3.8M13.8 3.2v3.8M10.2 17v3.8M13.8 17v3.8M3.2 10.2h3.8M3.2 13.8h3.8M17 10.2h3.8M17 13.8h3.8"/></svg>' }
];
// Shown once the user writes a name of their own: the icon stays subject-like
// instead of keeping the icon of whichever example happened to be on screen.
var SUBJECT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.2 4.6A2.6 2.6 0 0 1 7.8 2h10.7v15.4H7.8a2.6 2.6 0 0 0-2.6 2.6V4.6z"/><path d="M5.2 20a2.6 2.6 0 0 1 2.6-2.6h10.7V22H7.8A2.6 2.6 0 0 1 5.2 20z"/></svg>';
var SUBJECT_EXAMPLE_MS = 2600;
var subjectExampleTimer = null;

// One timer for the sheet: starting a new rotation always drops the old one,
// so reopening the sheet can never stack two intervals on the same box.
function stopSubjectExamples() {
  if (subjectExampleTimer) {
    clearInterval(subjectExampleTimer);
    subjectExampleTimer = null;
  }
}

function addSubject(after) {
  openModal(
    '<h2>New subject</h2>' +
    '<div class="demptybox subex" id="subExample">' +
      '<span class="demptyemoji" id="subExampleIcon" aria-hidden="true">' + SUBJECT_EXAMPLES[0].icon + '</span>' +
      '<input id="fName" placeholder="' + esc(SUBJECT_EXAMPLES[0].name) + '" autocomplete="off" autocapitalize="words" aria-label="Subject name">' +
    '</div>',
    function () {
      var name = document.getElementById("fName").value.trim();
      if (!name) return false;
      stopSubjectExamples();
      var s = { id: uid(), name: name, files: [] };
      state.subjects.push(s); save(); render();
      if (after) setTimeout(after, 0);
    });

  var input = document.getElementById("fName");
  var boxEl = document.getElementById("subExample");
  var iconEl = document.getElementById("subExampleIcon");
  if (!input || !boxEl || !iconEl) return;

  var i = 0;
  function paintIcon() {
    iconEl.innerHTML = input.value.trim() ? SUBJECT_ICON : SUBJECT_EXAMPLES[i].icon;
  }
  function show(n) {
    i = ((n % SUBJECT_EXAMPLES.length) + SUBJECT_EXAMPLES.length) % SUBJECT_EXAMPLES.length;
    if (input.value.trim()) return;
    input.placeholder = SUBJECT_EXAMPLES[i].name;
    paintIcon();
  }
  function startExamples() {
    stopSubjectExamples();
    if (input.value.trim()) return;
    subjectExampleTimer = setInterval(function () {
      // Closing the sheet by any route (button, backdrop, drag) leaves the box
      // markup inside #box but takes the sheet off screen; the rotation must die
      // with it instead of running for the rest of the session.
      var m = document.getElementById("modal");
      if (!m || !m.classList.contains("show")) { stopSubjectExamples(); return; }
      if (input.value.trim()) { stopSubjectExamples(); return; }
      show(i + 1);
    }, SUBJECT_EXAMPLE_MS);
  }

  // Writing a name stops the rotation; clearing the field brings it back.
  input.addEventListener("input", function () {
    paintIcon();
    if (input.value.trim()) stopSubjectExamples();
    else startExamples();
  });
  // The whole dashed box is the field, so tapping its padding focuses the input.
  boxEl.addEventListener("click", function (e) {
    if (e.target === input) return;
    try { input.focus({ preventScroll: true }); } catch (err) { input.focus(); }
  });

  startExamples();
}

function renderSubjects() {
  var main = document.getElementById("main");
  if (typeof clearDaySwipe === "function") clearDaySwipe();
  main.ontouchstart = null; main.ontouchend = null;
  clearFolderThumbs();
  var cur = state.subjects.filter(function (s) { return s.id === openId; })[0];
  if (cur) { renderFolder(main, cur); return; }
  var html = '<div class="title"><h1>Subjects</h1></div>';
  if (!state.subjects.length) html += '<div class="empty">No subjects yet</div>';
  state.subjects.forEach(function (s) {
    html += '<div class="row folder" data-id="' + s.id + '"><span class="fico">' + FOLDER_ICON + '</span><div class="i"><b>' + esc(s.name) + "</b><div>" + s.files.length + ' files</div></div><button class="x" data-del="' + s.id + '" aria-label="Delete subject">✕</button></div>';
  });
  html += '<button class="add" id="addSub">+ Add subject</button>';
  html += '<button class="add scan" id="scanSub"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Scan a timetable photo</button>';
  main.innerHTML = html;
  main.querySelectorAll(".folder").forEach(function (r) { r.onclick = function () { openId = r.getAttribute("data-id"); render(); }; });
  main.querySelectorAll("[data-del]").forEach(function (b) {
    holdToConfirm(b, 800, function () {
      var id = b.getAttribute("data-del");
      state.subjects = state.subjects.filter(function (s) { return s.id !== id; });
      state.lectures = state.lectures.filter(function (l) { return l.subjectId !== id; });
      state.events = state.events.filter(function (e) { return e.subjectId !== id; });
      if (state.settings) {
        if (Array.isArray(state.settings.hidden)) {
          state.settings.hidden = state.settings.hidden.filter(function (x) { return x !== id; });
        }
        if (state.settings.dayFilters && Array.isArray(state.settings.dayFilters.calendars)) {
          state.settings.dayFilters.calendars = state.settings.dayFilters.calendars.filter(function (x) { return x !== id; });
        }
      }
      if (filterId === id) filterId = null;
      save(); render();
      if (typeof deleteFilesOf === "function") deleteFilesOf(id).catch(function () {});
    });
  });
  document.getElementById("addSub").onclick = function () { addSubject(null); };
  document.getElementById("scanSub").onclick = scanTimetable;
}

// ===== File previews =====
// A picked file is copied into IndexedDB by putFile (the File is structured
// cloned, not referenced), so the subject folder keeps working after the
// original is deleted from the device. These helpers add a small thumbnail in
// the row and a preview sheet, both read from that local copy.

var folderThumbUrls = [];

function clearFolderThumbs() {
  folderThumbUrls.forEach(function (u) {
    try { URL.revokeObjectURL(u); } catch (e) {}
  });
  folderThumbUrls = [];
}

function isImageFile(name, type) {
  return /^image\//.test(type || "") || /\.(png|jpe?g|gif|webp|avif|svg|bmp|heic|heif)$/i.test(name || "");
}

// A short badge that fits the 10cqw tile: PDF, DOC, PPT, IMG, FILE...
function fileTag(name, type) {
  if (/^image\//.test(type || "")) return "IMG";
  if (type === "application/pdf") return "PDF";
  var n = String(name || "");
  var dot = n.lastIndexOf(".");
  var ext = dot > 0 ? n.slice(dot + 1) : "";
  if (/^(png|jpe?g|gif|webp|avif|svg|bmp|heic|heif)$/i.test(ext)) return "IMG";
  if (/^pdf$/i.test(ext)) return "PDF";
  ext = ext.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (ext || "FILE").slice(0, 4);
}

// Decode an image off the main render path and keep only a small copy, so a
// folder of 20 photos does not hold 20 full-size images in memory when listed.
function makeFileThumb(blob, name, type) {
  return new Promise(function (resolve) {
    if (!blob || !window.Image || !document.createElement || !isImageFile(name || blob.name, type || blob.type)) {
      resolve(null);
      return;
    }
    var url;
    try { url = URL.createObjectURL(blob); } catch (e) { resolve(null); return; }
    var img = new Image();
    var done = false;
    function finish(thumb) {
      if (done) return;
      done = true;
      try { URL.revokeObjectURL(url); } catch (e) {}
      resolve(thumb || null);
    }
    img.onload = function () {
      try {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h) { finish(null); return; }
        var scale = Math.min(1, 320 / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        // WebP keeps transparency; JPEG is the fallback for browsers without it.
        if (c.toBlob) {
          c.toBlob(function (b) {
            if (b) { finish(b); return; }
            c.toBlob(function (b2) { finish(b2); }, "image/jpeg", 0.82);
          }, "image/webp", 0.85);
        } else {
          finish(null);
        }
      } catch (e) { finish(null); }
    };
    img.onerror = function () { finish(null); };
    img.src = url;
  });
}

function paintFolderThumb(slot, blob) {
  if (!slot || !blob) return;
  var url = URL.createObjectURL(blob);
  folderThumbUrls.push(url);
  var img = new Image();
  img.className = "fthumbimg";
  img.alt = "";
  img.onload = function () { slot.classList.add("has"); };
  img.src = url;
  slot.appendChild(img);
}

// Fill the tiles after the rows are on screen: one read of the store, then a
// thumbnail per image. Records saved before thumbnails existed get one now.
function loadFolderThumbs(main, s) {
  if (!s.files.length) return;
  idbAll("files").then(function (all) {
    var byId = {};
    (all || []).forEach(function (r) { if (r && r.id) byId[r.id] = r; });
    s.files.forEach(function (f) {
      var rec = byId[f.id];
      if (!rec) return;
      var slot = main.querySelector('[data-thumb="' + f.id + '"]');
      if (!slot) return;
      if (rec.thumb) { paintFolderThumb(slot, rec.thumb); return; }
      if (!isImageFile(rec.name, rec.type)) return;
      makeFileThumb(rec.blob, rec.name, rec.type).then(function (thumb) {
        if (!thumb) return;
        if (typeof setFileThumb === "function") setFileThumb(rec.id, thumb).catch(function () {});
        var live = main.querySelector('[data-thumb="' + rec.id + '"]');
        if (live) paintFolderThumb(live, thumb);
      });
    });
  }).catch(function () {});
}

var filePreviewUrl = "";

function revokeFilePreview() {
  if (!filePreviewUrl) return;
  try { URL.revokeObjectURL(filePreviewUrl); } catch (e) {}
  filePreviewUrl = "";
}

// Tap a row: preview the copy that lives in Lektra. Older builds downloaded the
// file straight away; now the common case (a photo or a PDF) is visible without
// leaving the app, and "Open file" is still there for everything else.
function openFilePreview(id) {
  getFile(id).then(function (rec) {
    if (!rec || !rec.blob) { toast("File not found"); return; }
    revokeFilePreview();
    var url = URL.createObjectURL(rec.blob);
    filePreviewUrl = url;
    var name = rec.name || "File";
    var type = rec.type || "";
    var isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
    var isText = /^text\//.test(type) || /\.(txt|md|csv|json|log)$/i.test(name);
    var view;

    function noPreview() {
      return '<div class="pvnone"><span class="fthumb pvtag"><span class="ftag">' + fileTag(name, type) +
        '</span></span><span>No preview for this file type.<br>Open it to view the document.</span></div>';
    }

    function show() {
      openModal(
        '<h2 class="pvtitle">' + esc(name) + "</h2>" +
        '<div class="pvbox' + (isPdf ? " pdf" : "") + '">' + view + "</div>" +
        '<div class="pvmeta">' + (rec.size ? fmtSize(rec.size) + " · " : "") + "Saved in Lektra ✓</div>" +
        '<button class="add" id="pvOpen" type="button">Open file</button>'
      );
      var openBtn = document.getElementById("pvOpen");
      if (openBtn) openBtn.onclick = function () { openStoredFile(rec.id); };
    }

    if (isImageFile(name, type)) {
      view = '<img class="pvimg" src="' + url + '" alt="">';
      show();
      return;
    }
    if (isPdf) {
      view = '<iframe class="pvframe" src="' + url + '#toolbar=0&navpanes=0&view=FitH" title="' +
        esc(name) + '"></iframe>';
      show();
      return;
    }
    if (isText && rec.blob.text) {
      rec.blob.text().then(function (t) {
        view = '<pre class="pvtext">' + esc(String(t || "").slice(0, 20000)) + "</pre>";
        show();
      }).catch(function () { view = noPreview(); show(); });
      return;
    }
    view = noPreview();
    show();
  }).catch(function () { toast("Could not open that file"); });
}

function renderFolder(main, s) {
  var total = 0;
  s.files.forEach(function (f) { total += f.size || 0; });
  var html = '<button class="back" id="back">‹ All subjects</button><div class="title" style="margin-top:0"><h1 style="font-size:30px">' + esc(s.name) + "</h1></div>";
  if (!s.files.length) html += '<div class="empty">No files yet</div>';
  s.files.forEach(function (f, i) {
    html += '<div class="row file" data-open="' + i + '">' +
      '<span class="fthumb" data-thumb="' + esc(f.id) + '"><span class="ftag">' + fileTag(f.name, f.type) + "</span></span>" +
      '<div class="i">' + esc(f.name) +
      "<div>Copied into Lektra ✓" + (f.size ? " · " + fmtSize(f.size) : "") + '</div></div>' +
      '<button class="x" data-i="' + i + '" aria-label="Delete file">✕</button></div>';
  });
  html += '<button class="add" id="pick">+ Add lecture files</button><input type="file" id="file" multiple style="display:none">';
  if (s.files.length) html += '<div class="muted" style="margin-top:3cqw">' + s.files.length + " file" + (s.files.length > 1 ? "s" : "") + (total ? " · " + fmtSize(total) : "") + " · the originals can be deleted</div>";
  main.innerHTML = html;
  main.scrollTop = 0;
  document.getElementById("back").onclick = function () { openId = null; render(); };

  // pull the page down to go back to the folder list
  var sy = 0, sx = 0;
  bindMainSwipe(function (e) { if (!e.touches.length) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, function (e) {
    if (!e.changedTouches.length) return;
    var dy = e.changedTouches[0].clientY - sy, dx = e.changedTouches[0].clientX - sx;
    if (dy > 70 && Math.abs(dy) > Math.abs(dx) && main.scrollTop <= 0) { openId = null; render(); }
  });

  main.querySelectorAll("[data-open]").forEach(function (r) {
    r.onclick = function () { openFilePreview(s.files[+r.getAttribute("data-open")].id); };
  });
  main.querySelectorAll("[data-i]").forEach(function (b) {
    holdToConfirm(b, 800, function () {
      var f = s.files.splice(+b.getAttribute("data-i"), 1)[0];
      save(); render();
      if (f && f.id) deleteFile(f.id).catch(function () {});
    });
  });

  var input = document.getElementById("file");
  document.getElementById("pick").onclick = function () { input.click(); };
  input.onchange = function () {
    var files = Array.prototype.slice.call(input.files);
    input.value = "";   // picking the same file again should fire change
    if (!files.length) return;
    var saved = 0, failed = 0;
    toast("Copying " + files.length + " file" + (files.length > 1 ? "s" : "") + "…");
    Promise.all(files.map(function (file) {
      // The thumbnail is best-effort: a file we cannot decode still gets saved.
      return makeFileThumb(file).then(function (thumb) {
        return putFile(s.id, file, thumb);
      }).then(function (rec) {
        s.files.push({ id: rec.id, name: rec.name, size: rec.size, type: rec.type });
        saved++;
      }).catch(function () {
        failed++;
        toast("Could not save " + file.name);
      });
    })).then(function () {
      save(); render();
      if (saved) toast(failed ? "Copied " + saved + " of " + files.length + " files" : "Copied into Lektra ✓");
    });
  };

  loadFolderThumbs(main, s);
}
