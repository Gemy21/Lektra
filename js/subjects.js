// ===== Subjects (folders) =====
function addSubject(after) {
  openModal('<h2>New subject</h2><label>Name</label><input id="fName" placeholder="e.g. Data Structures">', function () {
    var name = document.getElementById("fName").value.trim();
    if (!name) return false;
    var s = { id: uid(), name: name, files: [] };
    state.subjects.push(s); save(); render();
    if (after) setTimeout(after, 0);
  });
}

function renderSubjects() {
  var main = document.getElementById("main");
  if (typeof clearDaySwipe === "function") clearDaySwipe();
  main.ontouchstart = null; main.ontouchend = null;
  var cur = state.subjects.filter(function (s) { return s.id === openId; })[0];
  if (cur) { renderFolder(main, cur); return; }
  var html = '<div class="title"><h1>Subjects</h1></div>';
  if (!state.subjects.length) html += '<div class="empty">No subjects yet</div>';
  state.subjects.forEach(function (s) {
    html += '<div class="row folder" data-id="' + s.id + '"><span class="fico">' + FOLDER_ICON + '</span><div class="i"><b>' + esc(s.name) + "</b><div>" + s.files.length + ' files</div></div><button class="x" data-del="' + s.id + '">✕</button></div>';
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
      if (filterId === id) filterId = null;
      save(); render();
      if (typeof deleteFilesOf === "function") deleteFilesOf(id).catch(function () {});
    });
  });
  document.getElementById("addSub").onclick = function () { addSubject(null); };
  document.getElementById("scanSub").onclick = scanTimetable;
}

function renderFolder(main, s) {
  var total = 0;
  s.files.forEach(function (f) { total += f.size || 0; });
  var html = '<button class="back" id="back">‹ All subjects</button><div class="title" style="margin-top:0"><h1 style="font-size:30px">' + esc(s.name) + "</h1></div>";
  if (!s.files.length) html += '<div class="empty">No files yet</div>';
  s.files.forEach(function (f, i) {
    html += '<div class="row file" data-open="' + i + '"><span style="font-size:20px">📄</span><div class="i">' + esc(f.name) +
      "<div>On this device ✓" + (f.size ? " · " + fmtSize(f.size) : "") + '</div></div><button class="x" data-i="' + i + '">✕</button></div>';
  });
  html += '<button class="add" id="pick">+ Add lecture files</button><input type="file" id="file" multiple style="display:none">';
  if (s.files.length) html += '<div class="muted" style="margin-top:3cqw">' + s.files.length + " file" + (s.files.length > 1 ? "s" : "") + (total ? " · " + fmtSize(total) : "") + "</div>";
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
    r.onclick = function () { openStoredFile(s.files[+r.getAttribute("data-open")].id); };
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
    if (!files.length) return;
    toast("Saving " + files.length + " file" + (files.length > 1 ? "s" : "") + "…");
    Promise.all(files.map(function (file) {
      return putFile(s.id, file).then(function (rec) {
        s.files.push({ id: rec.id, name: rec.name, size: rec.size, type: rec.type });
      }).catch(function () { toast("Could not save " + file.name); });
    })).then(function () { save(); render(); toast("Saved on this device ✓"); });
  };
}
