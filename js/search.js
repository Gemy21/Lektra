// ===== Search =====
var SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>';

function openSearch() {
  var box = document.getElementById("box");
  box.className = "box search";
  box.innerHTML =
    '<div class="sbar">' +
      '<span class="qicon">' + SEARCH_ICON + "</span>" +
      '<input id="fQ" type="text" placeholder="Search events &amp; classes" autocomplete="off" enterkeyhint="search">' +
      '<button class="qclear" id="qClear" aria-label="Clear">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      "</button>" +
    "</div>" +
    '<div class="stabs"><button class="stab on" data-f="all">All</button><button class="stab" data-f="ev">Events</button><button class="stab" data-f="cls">Classes</button></div>' +
    '<div id="qRes"></div>';

  resetDrag(box);
  dragToClose(box);
  document.getElementById("modal").className = "show search-mode";
  document.getElementById("modal").onclick = function (e) { if (e.target === this) closeModal(); };

  var q = document.getElementById("fQ"), res = document.getElementById("qRes"), type = "all";

  function emptyState() {
    return '<div class="sempty"><span class="seicon">' + SEARCH_ICON + "</span>" +
      "<b>Search anything in your calendar</b>" +
      "<p>Try a subject, a kind (quiz, final), a place, a weekday, or a date like 2026-10-06.</p></div>";
  }

  function jump(d) { closeModal(); tab = "cal"; view = new Date(d.getFullYear(), d.getMonth(), 1); render(); openDay(d); }

  function rowHTML(r, i) {
    return '<button class="sresrow" data-r="' + i + '"><span class="ddot" style="background:' + r.color + '"></span>' +
      '<span class="dtxt"><b>' + esc(r.title) + "</b><i>" + esc(r.sub) + "</i></span>" +
      '<span class="dtime">' + esc(r.time || "") + "</span></button>";
  }

  function run() {
    var k = clean(q.value).trim();
    if (!k) { res.innerHTML = emptyState(); return; }
    var out = [];
    function hit(t) { return clean(t).indexOf(k) !== -1; }
    var base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (type === "all") {
      state.subjects.forEach(function (s) {
        if (!hit(s.name)) return;
        out.push({
          color: colorOf(s.id), title: s.name, sub: s.files.length + " file" + (s.files.length === 1 ? "" : "s"), time: "",
          go: function () { closeModal(); tab = "sub"; openId = s.id; render(); }
        });
      });
    }
    if (type !== "ev") {
      state.lectures.forEach(function (l) {
        var n = subjectName(l.subjectId);
        if (!hit(n + " " + kindLabel(l.kind) + " " + l.place + " " + WEEK[l.weekday])) return;
        out.push({
          color: colorOf(l.subjectId), title: n, time: fmtTime(l.time),
          sub: kindLabel(l.kind) + " · " + WEEK[l.weekday] + " · " + l.place,
          go: function () { jump(addDays(base, (l.weekday - base.getDay() + 7) % 7)); }
        });
      });
    }
    if (type !== "cls") {
      state.events.forEach(function (e) {
        var n = subjectName(e.subjectId), p = e.date.split("-");
        if (!hit(n + " " + kindLabel(e.kind) + " " + (e.note || "") + " " + e.date)) return;
        out.push({
          color: colorOf(e.subjectId), title: n, time: fmtTime(e.time),
          sub: kindLabel(e.kind) + " · " + e.date + (e.note ? " · " + e.note : ""),
          go: function () { jump(new Date(+p[0], +p[1] - 1, +p[2])); }
        });
      });
    }

    if (!out.length) { res.innerHTML = '<div class="empty" style="padding:8cqw 0">No results for “' + esc(q.value.trim()) + '”</div>'; return; }
    res.innerHTML = '<div class="sres">' + out.map(rowHTML).join("") + "</div>";
    res.querySelectorAll("[data-r]").forEach(function (b) {
      b.onclick = function () { out[+b.getAttribute("data-r")].go(); };
    });
  }

  q.oninput = run;
  q.onkeydown = function (e) { if (e.key === "Escape") closeModal(); };
  document.getElementById("qClear").onclick = function () {
    if (q.value) { q.value = ""; run(); q.focus(); } else closeModal();
  };
  box.querySelectorAll("[data-f]").forEach(function (b) {
    b.onclick = function () {
      type = b.getAttribute("data-f");
      box.querySelectorAll("[data-f]").forEach(function (o) { o.className = "stab" + (o === b ? " on" : ""); });
      run();
    };
  });

  run();
  q.focus();
}
