// ===== Calendar =====
function lecturesOn(dow, useFilter) {
  return state.lectures.filter(function (l) { return l.weekday === dow && (!useFilter || !filterId || l.subjectId === filterId); })
    .sort(function (a, b) { return a.time < b.time ? -1 : 1; });
}

function cellLines(date, dow) {
  var lines = [];
  var day = iso(date);
  state.events.filter(function (e) { return e.date === day && (!filterId || e.subjectId === filterId) && !indicatorHidden(e.subjectId); })
    .forEach(function (e) {
      lines.push({ color: colorOf(e.subjectId), text: subjectName(e.subjectId), cls: "" });
      lines.push({ text: kindLabel(e.kind) + (e.note ? " · " + e.note : ""), cls: "tag", color: colorOf(e.subjectId) });
    });
  var list = lecturesOn(dow, true).filter(function (l) { return !indicatorHidden(l.subjectId); });
  var done = {};
  list.forEach(function (l) {
    if (done[l.subjectId]) return;
    done[l.subjectId] = true;
    lines.push({ color: colorOf(l.subjectId), text: subjectName(l.subjectId), cls: "" });
    list.filter(function (x) { return x.subjectId === l.subjectId; }).forEach(function (x) {
      lines.push({ text: ((TAGS[x.kind] || "Lec") + " " + (x.place || "")).trim(), cls: "pl" });
    });
  });
  return lines.slice(0, 5);
}

// Build the agenda shown under the month grid by the two list layouts.
// Entries are real occurrences for the visible month: one-off events plus every
// weekly lecture/section/lab that falls on a day in that month.
function agendaItemsForMonth(y, m) {
  var dim = new Date(y, m + 1, 0).getDate();
  var out = [];
  for (var d = 1; d <= dim; d++) {
    var date = new Date(y, m, d), key = iso(date);
    state.events.forEach(function (e) {
      if (e.date !== key || (filterId && e.subjectId !== filterId) || indicatorHidden(e.subjectId)) return;
      out.push({ date: date, sid: e.subjectId, kind: e.kind, time: e.time || "", detail: e.note || "" });
    });
    lecturesOn(date.getDay(), true).forEach(function (l) {
      if (indicatorHidden(l.subjectId)) return;
      out.push({ date: date, sid: l.subjectId, kind: l.kind, time: l.time || "", detail: l.place || "" });
    });
  }
  out.sort(function (a, b) {
    if (a.date.getTime() !== b.date.getTime()) return a.date - b.date;
    var at = a.time || "99:99", bt = b.time || "99:99";
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
  return out;
}

function agendaRowHtml(it, grouped, color) {
  var title = grouped ? kindLabel(it.kind) : subjectName(it.sid);
  var meta = grouped ? it.detail : kindLabel(it.kind) + (it.detail ? " · " + it.detail : "");
  return '<button class="ma-row" data-ad="' + iso(it.date) + '">' +
    '<span class="ma-date" style="--c:' + color + '"><b>' + it.date.getDate() + "</b><i>" + SHORT[it.date.getDay()] + "</i></span>" +
    '<span class="ma-body"><b>' + esc(title) + "</b>" + (meta ? "<span>" + esc(meta) + "</span>" : "") + "</span>" +
    (it.time ? '<span class="ma-time">' + esc(fmtTime(it.time)) + "</span>" : "") +
  "</button>";
}

function agendaGroupsHtml(items) {
  var groups = [], byId = {};
  state.subjects.forEach(function (s) {
    byId[s.id] = { sid: s.id, name: s.name, color: colorOf(s.id), items: [] };
    groups.push(byId[s.id]);
  });
  items.forEach(function (it) {
    if (!byId[it.sid]) {
      byId[it.sid] = { sid: it.sid, name: subjectName(it.sid), color: colorOf(it.sid), items: [] };
      groups.push(byId[it.sid]);
    }
    byId[it.sid].items.push(it);
  });
  var html = "";
  groups.forEach(function (g) {
    if (!g.items.length) return;
    html += '<section class="ma-group">' +
      '<h3 class="ma-ghead"><i class="ma-dot" style="background:' + g.color + '"></i>' +
        '<span class="ma-name">' + esc(g.name) + '</span><span class="n">' + g.items.length + "</span></h3>" +
      g.items.map(function (it) { return agendaRowHtml(it, true, g.color); }).join("") +
    "</section>";
  });
  return html;
}

function monthAgendaHtml(y, m) {
  var items = agendaItemsForMonth(y, m);
  var html = '<section class="ma-list" aria-label="Month agenda">';
  if (!items.length) {
    var msg = filterId ? "Nothing for this filter" : "Nothing this month";
    var hint = filterId ? "Choose All to see the whole month." : "Add an entry with the + button.";
    return html + '<div class="ma-empty"><b>' + msg + "</b><span>" + hint + "</span></div></section>";
  }
  if (state.settings.monthLayout === "month-lists") {
    html += agendaGroupsHtml(items);
  } else {
    html += '<section class="ma-group">' +
      '<h3 class="ma-ghead"><i class="ma-dot" style="background:' + accentHex() + '"></i>' +
        '<span class="ma-name">Entries</span><span class="n">' + items.length + "</span></h3>" +
      items.map(function (it) { return agendaRowHtml(it, false, colorOf(it.sid)); }).join("") +
    "</section>";
  }
  return html + "</section>";
}

function bindMainSwipe(start, end) {
  clearMainSwipe();
  var main = document.getElementById("main");
  main._ms = start; main._me = end;
  main.addEventListener("touchstart", start, { passive: true });
  main.addEventListener("touchend", end);
}

function clearMainSwipe() {
  var main = document.getElementById("main");
  if (main._ms) {
    main.removeEventListener("touchstart", main._ms);
    main.removeEventListener("touchend", main._me);
    main._ms = main._me = null;
  }
}

function clearDaySwipe() {
  clearMainSwipe();
}

function renderCalendar() {
  if (dayOpen) return renderDay();
  clearDayNowTimer();
  clearDaySparkTimer();
  clearDaySwipe();
  if (yearOpen) return renderYear();
  var y = view.getFullYear(), m = view.getMonth();
  var html = '<div class="title ctitle"><button class="nz" id="prev" aria-label="Previous month"></button><h1 id="titleMonth">' + MONTHS[m] + (y !== today.getFullYear() ? "<small>" + y + "</small>" : "") + '</h1><button class="nz" id="next" aria-label="Next month"></button></div><div class="grid">';
  if (state.settings.weekdayLabels !== "hidden") {
    (state.settings.weekdayLetters === "tiny" ? TINY : SHORT).forEach(function (d) {
      html += '<div class="dw"><span>' + d + "</span></div>";
    });
  }
  var first = new Date(y, m, 1).getDay();
  var total = new Date(y, m + 1, 0).getDate();
  var cells = Math.ceil((first + total) / 7) * 7;
  var dim = total, monthStart = iso(new Date(y, m, 1)), monthEnd = iso(new Date(y, m, dim));
  function eventsInMonth(sid) {
    return state.events.filter(function (e) {
      return (!sid || e.subjectId === sid) && e.date >= monthStart && e.date <= monthEnd;
    }).length;
  }
  function lecturesInMonth(sid) {
    var count = 0;
    state.lectures.forEach(function (l) {
      if (sid && l.subjectId !== sid) return;
      for (var d = 1; d <= dim; d++) if (new Date(y, m, d).getDay() === l.weekday) count++;
    });
    return count;
  }

  for (var i = 0; i < cells; i++) {
    var n = i - first + 1;
    if (n < 1 || n > total) { html += '<div class="cell blank"></div>'; continue; }
    var isToday = y === today.getFullYear() && m === today.getMonth() && n === today.getDate();
    var lines = cellLines(new Date(y, m, n), i % 7);
    var tint = lines.length ? lines[0].color : "";       // first entry colours the whole cell
    html += '<button class="cell' + (isToday ? " today" : "") + (tint ? " has" : "") + '"' +
      (tint ? ' style="--c:' + tint + ';--ink:' + accentInk(tint) + ';--tint:' + tint + '26;--tint-soft:' + tint + '14;--tint-strong:' + tint + '3d;background:linear-gradient(0deg,' + tint + '26,' + tint + '26),var(--cell-tint)"' : "") +
      ' data-d="' + n + '"><span class="dn">' + n + "</span>";
    if (lines.length) {
      html += '<span class="evs">';
      lines.forEach(function (ln) {
        if (ln.cls === "") {
          html += '<i class="ev" style="--c:' + ln.color + ';--ink:' + accentInk(ln.color) + '">' +
            '<b style="background:' + ln.color + '"></b><span class="evt">' + esc(ln.text) + "</span></i>";
        } else {
          html += '<i class="ev ' + ln.cls + '"' + (ln.color ? ' style="color:' + ln.color + '"' : "") + ">" + esc(ln.text) + "</i>";
        }
      });
      html += "</span>";
    }
    html += "</button>";
  }
  html += "</div>";
  if (state.settings.calendarFilters !== false) {
    html += '<div class="chips"><button class="chip' + (filterId ? "" : " on") + '" data-f="">All<span class="n">' +
      (eventsInMonth(null) + lecturesInMonth(null)) + "</span></button>";
    state.subjects.forEach(function (s) {
      var c = colorOf(s.id);
      html += '<button class="chip sub' + (filterId === s.id ? " on" : "") + '" data-f="' + s.id +
        '" style="--tint:linear-gradient(0deg,' + c + '26,' + c + '26),var(--chip-tint);--on:linear-gradient(0deg,' + c + '4d,' + c + '4d),var(--chip-tint);border-color:' + c + '66">' +
        '<i style="background:' + c + '"></i>' + esc(s.name) +
        '<span class="n">' + (eventsInMonth(s.id) + lecturesInMonth(s.id)) + "</span></button>";
    });
    html += "</div>";
  }

  // away from the current month -> floating "This Month" pill that jumps back
  if (y !== today.getFullYear() || m !== today.getMonth()) {
    html += '<button class="todayBtn inflow" id="todayBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>This Month</button>';
  }
  if (state.settings.monthLayout === "month-list" || state.settings.monthLayout === "month-lists") {
    html += monthAgendaHtml(y, m);
  }

  var main = document.getElementById("main");
  main.innerHTML = html;
  document.getElementById("prev").onclick = function () { view = new Date(y, m - 1, 1); render(); };
  document.getElementById("next").onclick = function () { view = new Date(y, m + 1, 1); render(); };
  var todayBtn = document.getElementById("todayBtn");
  if (todayBtn) todayBtn.onclick = function () { view = new Date(today.getFullYear(), today.getMonth(), 1); render(); };
  document.getElementById("titleMonth").onclick = function () { yearOpen = true; render(); };
  var startX = 0;
  bindMainSwipe(function (e) { if (e.touches.length) startX = e.touches[0].clientX; }, function (e) {
    if (!e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (dx > 60) { view = new Date(y, m - 1, 1); render(); }
    if (dx < -60) { view = new Date(y, m + 1, 1); render(); }
  });
  main.querySelectorAll(".cell[data-d]").forEach(function (b) {
    b.onclick = function () { openDay(new Date(y, m, +b.getAttribute("data-d"))); };
  });
  main.querySelectorAll(".chip").forEach(function (b) {
    b.onclick = function () { filterId = b.getAttribute("data-f") || null; render(); };
  });
  main.querySelectorAll("[data-ad]").forEach(function (b) {
    b.onclick = function () {
      var p = b.getAttribute("data-ad").split("-");
      openDay(new Date(+p[0], +p[1] - 1, +p[2]));
    };
  });
}

// ===== Year screen (tap the month name) =====
var yearOpen = false;

function monthCard(y, m) {
  var first = new Date(y, m, 1).getDay();
  var dim = new Date(y, m + 1, 0).getDate();
  var cells = "";
  for (var i = 0; i < first; i++) cells += "<i></i>";
  for (var d = 1; d <= dim; d++) {
    var isToday = y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
    cells += "<i" + (isToday ? ' class="t"' : "") + ">" + d + "</i>";
  }
  var isCur = y === view.getFullYear() && m === view.getMonth();
  return '<button class="mcard' + (isCur ? " cur" : "") + '" data-m="' + m + '"><h3>' +
    MONTHS[m].slice(0, 3) + '</h3><div class="mgrid">' + cells + "</div></button>";
}

function renderYear() {
  var y = view.getFullYear();
  var html = '<div class="yhead"><h2>' + y + "</h2></div>" + '<div class="ygrid">';
  for (var m = 0; m < 12; m++) html += monthCard(y, m);
  html += "</div>";

  var main = document.getElementById("main");
  main.innerHTML = html;
  main.scrollTop = 0;

  main.querySelectorAll("[data-m]").forEach(function (b) {
    b.onclick = function () {
      view = new Date(y, +b.getAttribute("data-m"), 1);
      yearOpen = false;
      render();
    };
  });
  // swipe down to close, swipe left/right to change year
  var sx = 0, sy = 0;
  bindMainSwipe(function (e) { if (!e.touches.length) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, function (e) {
    if (!e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (dy > 70 && Math.abs(dy) > Math.abs(dx)) { yearOpen = false; render(); return; }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      view = new Date(y + (dx < 0 ? 1 : -1), view.getMonth(), 1);
      render();
    }
  });
}

// ===== Day screen (full page, opened from a calendar cell) =====
var dayOpen = null;

function fmtTime(t) {
  if (!t) return "";
  var p = String(t).split(":"), h = parseInt(p[0], 10);
  if (!isFinite(h)) return t;
  var ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + (p[1] || "00") + " " + ap;
}

function timeMinutes(t) {
  if (!t) return null;
  var p = String(t).split(":"), h = parseInt(p[0], 10), m = parseInt(p[1] || "0", 10);
  if (!isFinite(h)) return null;
  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, isFinite(m) ? m : 0));
  return h * 60 + m;
}

function fmtHour(h) {
  var ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + " " + ap;
}

function dayItems(date) {
  var key = iso(date), out = [];
  state.events.forEach(function (e) {
    if (e.date !== key) return;
    out.push({
      color: colorOf(e.subjectId), title: subjectName(e.subjectId), sid: e.subjectId,
      sub: kindLabel(e.kind) + (e.note ? " · " + e.note : ""),
      time: e.time, kind: "ev", etype: e.kind, id: e.id,
      priority: e.priority || ""
    });
  });
  lecturesOn(date.getDay(), false).forEach(function (l) {
    out.push({
      color: colorOf(l.subjectId), title: subjectName(l.subjectId), sid: l.subjectId,
      sub: kindLabel(l.kind) + (l.place ? " · " + l.place : ""),
      time: l.time, kind: "lec", etype: l.kind, id: l.id,
      priority: l.priority || ""
    });
  });
  return out.filter(dayFilterMatches).sort(function (a, b) { return (a.time || "99:99") < (b.time || "99:99") ? -1 : 1; });
}

// ===== Day filters =====
// Calendars are the user's subjects. Lists are the entry groups the app
// already understands; Reminders is the base list (it is the pill's identity)
// and the others narrow the day to one kind of entry.
var DAY_FILTER_LISTS = [
  { id: "reminders", name: "Reminders", color: "#34c759", kinds: null },
  { id: "classes", name: "Classes", color: "#0a84ff", kinds: ["lecture", "section", "lab"] },
  { id: "quiz", name: "Quizzes", color: "#ff9f0a", kinds: ["quiz"] },
  { id: "deadline", name: "Deadlines", color: "#ff3b30", kinds: ["deadline"] },
  { id: "exam", name: "Exams", color: "#bf5af2", kinds: ["midterm", "final"] }
];

function dayFilters() {
  if (!state.settings) state.settings = {};
  var f = state.settings.dayFilters;
  if (!f || typeof f !== "object") {
    f = state.settings.dayFilters = { calendars: [], lists: ["reminders"] };
  }
  if (!Array.isArray(f.calendars)) f.calendars = [];
  if (!Array.isArray(f.lists)) f.lists = ["reminders"];
  return f;
}

function dayFilterCalendars() {
  var f = dayFilters();
  return state.subjects.filter(function (s) { return f.calendars.indexOf(s.id) >= 0; });
}

function dayFilterLists() {
  var f = dayFilters();
  return DAY_FILTER_LISTS.filter(function (l) { return f.lists.indexOf(l.id) >= 0; });
}

function dayFilterKinds() {
  var kinds = [];
  dayFilterLists().forEach(function (l) {
    if (!l.kinds) return;
    l.kinds.forEach(function (k) { if (kinds.indexOf(k) < 0) kinds.push(k); });
  });
  return kinds;
}

function dayFilterMatches(it) {
  var calendars = dayFilterCalendars();
  if (calendars.length) {
    var found = false;
    for (var i = 0; i < calendars.length; i++) {
      if (calendars[i].id === it.sid) { found = true; break; }
    }
    if (!found) return false;
  }
  var kinds = dayFilterKinds();
  if (kinds.length && kinds.indexOf(it.etype) < 0) return false;
  return true;
}

function dayFilterExtraCount() {
  var lists = dayFilterLists().filter(function (l) { return l.id !== "reminders"; });
  return dayFilterCalendars().length + lists.length;
}

function dayFilterFocusText() {
  var cals = dayFilterCalendars().length;
  var lists = dayFilterLists().filter(function (l) { return l.id !== "reminders"; }).length;
  if (!cals && !lists) return "All calendars";
  var parts = [];
  if (cals) parts.push(cals + " calendar" + (cals === 1 ? "" : "s"));
  if (lists) parts.push(lists + " list" + (lists === 1 ? "" : "s"));
  return "Focusing on " + parts.join(" + ");
}

function toggleDayFilter(type, id) {
  var f = dayFilters();
  var arr = type === "calendars" ? f.calendars : f.lists;
  var i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  save();
}

function clearDayFilters() {
  if (!state.settings) state.settings = {};
  state.settings.dayFilters = { calendars: [], lists: ["reminders"] };
  save();
}

var DAY_VIEWS = ["list", "notes"];
var daySpark = 0;
var daySparkTimer = null;
var dayNowTimer = null;

// Small vector sparkles for the empty state. They cycle every few seconds.
var DAY_SPARKS = [
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 4.5c.75 5 3.35 7.6 8.35 8.35-5 .75-7.6 3.35-8.35 8.35-.75-5-3.35-7.6-8.35-8.35C6.15 12.1 8.75 9.5 9.5 4.5z"/><path d="M19.5 1.2c.3 1.9 1.2 2.8 3.1 3.1-1.9.3-2.8 1.2-3.1 3.1-.3-1.9-1.2-2.8-3.1-3.1 1.9-.3 2.8-1.2 3.1-3.1z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5c.9 6.1 4.4 9.6 10.5 10.5-6.1.9-9.6 4.4-10.5 10.5-.9-6.1-4.4-9.6-10.5-10.5C7.6 11.1 11.1 7.6 12 1.5z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.3l2.7 6.3 6.8.6-5.1 4.5 1.5 6.7-5.9-3.5-5.9 3.5 1.5-6.7-5.1-4.5 6.8-.6z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 2c.35 2.6 1.6 3.85 4.2 4.2C9.6 6.55 8.35 7.8 8 10.4 7.65 7.8 6.4 6.55 3.8 6.2 6.4 5.85 7.65 4.6 8 2z"/><path d="M17 8c.3 2.2 1.35 3.25 3.55 3.55-2.2.3-3.25 1.35-3.55 3.55-.3-2.2-1.35-3.25-3.55-3.55C15.65 11.25 16.7 10.2 17 8z"/><path d="M10.5 15.5c.22 1.6.98 2.36 2.58 2.58-1.6.22-2.36.98-2.58 2.58-.22-1.6-.98-2.36-2.58-2.58 1.6-.22 2.36-.98 2.58-2.58z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5c.55 4.8 2.85 7.1 7.65 7.65-4.8.55-7.1 2.85-7.65 7.65-.55-4.8-2.85-7.1-7.65-7.65C9.15 8.6 11.45 6.3 12 1.5z"/><path d="M12 1.5c.55 4.8 2.85 7.1 7.65 7.65-4.8.55-7.1 2.85-7.65 7.65-.55-4.8-2.85-7.1-7.65-7.65C9.15 8.6 11.45 6.3 12 1.5z" transform="rotate(45 12 12)" opacity=".55"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 3.5c.4 3.1 1.9 4.6 5 5-3.1.4-4.6 1.9-5 5-.4-3.1-1.9-4.6-5-5 3.1-.4 4.6-1.9 5-5z"/><circle cx="18" cy="6" r="1.6"/><circle cx="18.5" cy="16.5" r="1.1"/></svg>'
];

var D_ICON = {
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v15"/><path d="M5.5 12.5L12 19l6.5-6.5"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><mask id="dvListHole"><rect width="24" height="24" fill="#fff"/><rect x="6.8" y="8.4" width="10.4" height="2.3" rx="1.15" fill="#000"/><rect x="6.8" y="13.3" width="10.4" height="2.3" rx="1.15" fill="#000"/></mask></defs><rect x="3" y="3" width="18" height="18" rx="5.2" fill="currentColor" mask="url(#dvListHole)"/></svg>',
  notes: '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><mask id="dvNoteHole"><rect width="24" height="24" fill="#fff"/><rect x="12.4" y="7.4" width="6" height="2.2" rx="1.1" fill="#000"/><rect x="9.4" y="11.6" width="7.4" height="2.2" rx="1.1" fill="#000"/><rect x="5.6" y="15.8" width="6.4" height="2.2" rx="1.1" fill="#000"/></mask></defs><rect x="3" y="3" width="18" height="18" rx="5.2" fill="currentColor" mask="url(#dvNoteHole)"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.7" y="4.7" width="14.6" height="14.6" rx="4" fill="var(--t1)"/><circle cx="8.9" cy="12" r="1.25" fill="var(--app-bg)"/><circle cx="12" cy="12" r="1.25" fill="var(--app-bg)"/><circle cx="15.1" cy="12" r="1.25" fill="var(--app-bg)"/></svg>',
  remind: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="5.4" width="18" height="2.8" rx="1.4"/><rect x="5" y="10.6" width="14" height="2.8" rx="1.4"/><rect x="7.5" y="15.8" width="9" height="2.8" rx="1.4"/></svg>',
  entry: '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><mask id="dmEntryHole"><rect width="24" height="24" fill="#fff"/><path d="M12 7.2v9.6M7.2 12h9.6" stroke="#000" stroke-width="2.5" stroke-linecap="round"/></mask></defs><rect x="3" y="3" width="18" height="18" rx="5.6" fill="currentColor" mask="url(#dmEntryHole)"/></svg>',
  today: '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><mask id="dmTodayHole"><rect width="24" height="24" fill="#fff"/><circle cx="12" cy="15" r="2.3" fill="#000"/></mask></defs><rect x="3" y="4.6" width="18" height="16.4" rx="4.6" fill="currentColor" mask="url(#dmTodayHole)"/><rect x="7.2" y="2.2" width="2.3" height="4.2" rx="1.15" fill="currentColor"/><rect x="14.5" y="2.2" width="2.3" height="4.2" rx="1.15" fill="currentColor"/></svg>',
  month: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2.4" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="2.4" fill="currentColor"/><rect x="3" y="13" width="8" height="8" rx="2.4" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="2.4" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 7"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="1.8" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="1.8" fill="currentColor" stroke="none"/></svg>',
  xcircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>'
};

function clearDayNowTimer() {
  if (dayNowTimer) { clearInterval(dayNowTimer); dayNowTimer = null; }
}

function startDayNowTimer() {
  clearDayNowTimer();
  var grid = document.getElementById("dtlGrid");
  if (!grid || grid.getAttribute("data-today") !== "1") return;
  dayNowTimer = setInterval(function () {
    var g = document.getElementById("dtlGrid");
    if (!g) { clearDayNowTimer(); return; }
    var now = new Date();
    g.style.setProperty("--now-min", now.getHours() * 60 + now.getMinutes());
  }, 30000);
}

function scrollDayTimeline(isToday) {
  var tl = document.getElementById("dtlScroll");
  if (!tl) return;
  var row = tl.querySelector(".dtlrow");
  var grid = document.getElementById("dtlGrid");
  if (!row || !grid) return;
  var hourH = row.getBoundingClientRect().height;
  var topPad = parseFloat(getComputedStyle(grid).paddingTop) || 0;
  var target;
  if (isToday) {
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes();
    target = topPad + (mins / 60) * hourH - hourH * 1.5;
  } else {
    target = hourH;
  }
  tl.scrollTop = Math.max(0, target);
}

function clearDaySparkTimer() {
  if (daySparkTimer) { clearInterval(daySparkTimer); daySparkTimer = null; }
}

function startDaySparkTimer() {
  clearDaySparkTimer();
  if (!document.querySelector(".demptyemoji")) return;
  daySparkTimer = setInterval(function () {
    var el = document.querySelector(".demptyemoji");
    if (!el) { clearDaySparkTimer(); return; }
    daySpark = (daySpark + 1) % DAY_SPARKS.length;
    el.innerHTML = DAY_SPARKS[daySpark];
  }, 4200);
}

function dayAwayLabel(date) {
  var a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  var b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var diff = Math.round((a - b) / 86400000);
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return diff + " days away";
  if (diff < -1) return Math.abs(diff) + " days ago";
  return "Today";
}

function currentDayView() {
  var v = state.settings.dayView;
  return DAY_VIEWS.indexOf(v) >= 0 ? v : "list";
}

function layoutTimed(timed) {
  var clusters = [], cur = null;
  timed.forEach(function (item) {
    if (!cur || item.start >= cur.end) {
      cur = { end: item.end, items: [] };
      clusters.push(cur);
    }
    cur.items.push(item);
    if (item.end > cur.end) cur.end = item.end;
  });
  clusters.forEach(function (cluster) {
    var colEnds = [];
    cluster.items.forEach(function (item) {
      var col = 0;
      while (colEnds[col] !== undefined && colEnds[col] > item.start) col++;
      colEnds[col] = item.end;
      item.col = col;
    });
    var count = colEnds.length;
    cluster.items.forEach(function (item) { item.cols = count; });
  });
}

function timelineCardHtml(item, start, col, cols) {
  var width = 100 / cols;
  var left = col * width;
  var leftCss = col === 0 ? "0" : "calc(" + left + "% + .5cqw)";
  var widthCss = cols === 1 ? "100%" : "calc(" + width + "% - 1cqw)";
  var style = "--c:" + item.color + ";--start:" + start + ";left:" + leftCss + ";width:" + widthCss +
    ";background:" + item.color + "1f;border-color:" + item.color + "55";
  return '<div class="dtlev" style="' + style + '" data-sub="' + item.sid + '" data-entry="' + item.kind + ":" + item.id + '" data-prio="' + (item.priority || "") + '">' +
    '<span class="dtlevt">' + esc(fmtTime(item.time)) + "</span>" +
    "<b>" + esc(item.title) + "</b><i>" + esc(item.sub) + "</i>" +
    '<button class="x" data-del="' + item.kind + ":" + item.id + '" aria-label="Delete">✕</button>' +
  "</div>";
}

function timelineAllDayHtml(item) {
  return '<div class="dtlev dtlevflow" style="--c:' + item.color + ";background:" + item.color + "1f;border-color:" + item.color + '55" data-sub="' + item.sid + '">' +
    '<span class="dtlevt">All day</span>' +
    "<b>" + esc(item.title) + "</b><i>" + esc(item.sub) + "</i>" +
    '<button class="x" data-del="' + item.kind + ":" + item.id + '" aria-label="Delete">✕</button>' +
  "</div>";
}

function openDay(date) {
  yearOpen = false;
  dayOpen = date;
  if (typeof exitDaySelection === "function") exitDaySelection();
  render();
}

function renderDay() {
  clearDayNowTimer();
  clearDaySparkTimer();
  var date = dayOpen, isToday = iso(date) === iso(today);
  var items = dayItems(date);
  var view = currentDayView();

  var titleText = isToday ? "Today" : WEEK[date.getDay()];
  var html = '<div class="dhead">' +
    '<div class="dbadge"><b>' + date.getDate() + "</b><i>" + MONTHS[date.getMonth()].slice(0, 3).toUpperCase() + "</i></div>" +
    '<div class="dtitles">' +
      '<button class="dclose" id="dClose" aria-label="Close day view">' +
        "<h1>" + titleText + "</h1>" + D_ICON.down +
      "</button>" +
      "<span>" + esc(isToday ? date.getDate() + " " + MONTHS[date.getMonth()] : dayAwayLabel(date)) + "</span>" +
    "</div>" +
    '<div class="dseg" role="group" aria-label="Day view">' +
      '<button class="' + (view === "list" ? "on" : "") + '" data-dv="list" aria-label="List view" aria-pressed="' + (view === "list") + '">' + D_ICON.list + "</button>" +
      '<button class="' + (view === "notes" ? "on" : "") + '" data-dv="notes" aria-label="Notes" aria-pressed="' + (view === "notes") + '">' + D_ICON.notes + "</button>" +
    "</div>" +
    '<button class="dmore" id="dMore" aria-label="More">' + D_ICON.more + "</button>" +
    '<div class="dmenu" id="dmenu">' +
      '<button data-m="entry"><span class="dmi">' + D_ICON.entry + "</span><span>Add entry</span></button>" +
      '<button data-m="today"><span class="dmi">' + D_ICON.today + "</span><span>Jump to today</span></button>" +
      '<div class="dsep" aria-hidden="true"></div>' +
      '<button data-m="month"><span class="dmi">' + D_ICON.month + "</span><span>Back to month</span></button>" +
    "</div>" +
    "</div>";

  var extraFilters = dayFilterExtraCount();
  html += '<div class="dremrow"><button class="dremind" id="dRemind">' + D_ICON.remind +
    "Reminders" + (extraFilters ? '<span class="n">+' + extraFilters + "</span>" : "") +
    "</button></div>";

  if (view === "notes") {
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var timed = [], untimed = [];
    items.forEach(function (it) {
      var m = timeMinutes(it.time);
      if (m === null) untimed.push(it);
      else timed.push({ it: it, start: m, end: Math.min(1440, m + 60), col: 0, cols: 1 });
    });
    timed.sort(function (a, b) { return a.start - b.start; });
    layoutTimed(timed);

    if (untimed.length) {
      html += '<div class="dtlallday">' + untimed.map(function (it) { return timelineAllDayHtml(it); }).join("") + "</div>";
    }

    var hours = "";
    for (var h = 0; h < 24; h++) {
      hours += '<div class="dtlrow"><span>' + fmtHour(h) + "</span><i></i></div>";
    }
    html += '<div class="dtimeline" id="dtlScroll">' +
      '<div class="dtlgrid" id="dtlGrid" style="--now-min:' + nowMin + '"' + (isToday ? ' data-today="1"' : "") + ">" +
        hours +
        '<div class="dtlevents">' + timed.map(function (x) { return timelineCardHtml(x.it, x.start, x.col, x.cols); }).join("") + "</div>" +
        (isToday ? '<div class="dtlnow" aria-hidden="true"><b></b></div>' : "") +
      "</div>" +
    "</div>";
  } else if (!items.length) {
    html += '<div class="demptybox"><span class="demptyemoji" aria-hidden="true">' + DAY_SPARKS[daySpark] + '</span><span class="demptytext">Nothing on this day</span></div>';
  } else {
    html += '<div class="dcard">' + items.map(function (it) {
      var prio = it.priority || "";
      return '<div class="drow" data-entry="' + it.kind + ":" + it.id + '" data-sub="' + it.sid + '" data-prio="' + prio + '">' +
        '<span class="ddot" style="background:' + it.color + '"></span>' +
        '<div class="dtxt"><b>' + esc(it.title) + "</b><i>" + esc(it.sub) + "</i></div>" +
        '<span class="dtime">' + esc(fmtTime(it.time)) + "</span>" +
        '<button class="x" data-del="' + it.kind + ":" + it.id + '" aria-label="Delete">✕</button></div>';
    }).join("") + "</div>";
  }
  if (view === "list") {
    html += '<button class="add" id="addLec">+ Add entry</button>';
  }
  if (!isToday) {
    html += '<button class="todayBtn" id="todayDayBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Today</button>';
  }

  var main = document.getElementById("main");
  main.innerHTML = html;

  document.getElementById("dClose").onclick = function () { dayOpen = null; render(); };
  var remBtn = document.getElementById("dRemind");
  if (remBtn) remBtn.onclick = function (e) {
    e.stopPropagation();
    openRemindersPopover(remBtn);
  };
  var tdb = document.getElementById("todayDayBtn");
  if (tdb) tdb.onclick = function () {
    dayOpen = new Date(today);
    render();
  };
  document.getElementById("dMore").onclick = function (e) {
    e.stopPropagation();
    document.getElementById("dmenu").classList.toggle("show");
  };
  main.onclick = function () {
    var m = document.getElementById("dmenu");
    if (m) m.classList.remove("show");
  };
  main.querySelectorAll("[data-dv]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      var v = b.getAttribute("data-dv");
      if (state.settings.dayView === v) return;
      state.settings.dayView = v;
      save();
      render();
    };
  });
  main.querySelectorAll("[data-m]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      var a = b.getAttribute("data-m");
      var menu = document.getElementById("dmenu");
      if (menu) menu.classList.remove("show");
      if (a === "month") { dayOpen = null; render(); return; }
      if (a === "today") { dayOpen = new Date(today); render(); return; }
      addLecture(date.getDay(), { date: iso(date) });
    };
  });
  main.querySelectorAll("[data-del]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      var v = b.getAttribute("data-del"), id = v.slice(v.indexOf(":") + 1);
      if (v.indexOf("ev:") === 0) state.events = state.events.filter(function (x) { return x.id !== id; });
      else state.lectures = state.lectures.filter(function (x) { return x.id !== id; });
      save(); render();
    };
  });
  var addBtn = document.getElementById("addLec");
  if (addBtn) addBtn.onclick = function () { addLecture(date.getDay(), { date: iso(date) }); };
  main.querySelectorAll("[data-sub]").forEach(function (b) {
    b.onclick = function () { tab = "sub"; openId = b.getAttribute("data-sub"); render(); };
  });
  if (typeof bindDayLongPress === "function") bindDayLongPress(main);
  if (typeof syncDaySelection === "function") syncDaySelection();

  startDaySparkTimer();
  scrollDayTimeline(isToday);
  startDayNowTimer();

  // swipe down to close, swipe left/right to move between days
  var sx = 0, sy = 0;
  bindMainSwipe(function (e) { if (!e.touches.length) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, function (e) {
    if (!e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx)) {
      var scrollEl = document.getElementById("dtlScroll");
      var atTop = scrollEl ? scrollEl.scrollTop <= 0 : main.scrollTop <= 0;
      if (dy > 0 && atTop) { dayOpen = null; render(); }
      return;
    }
    if (Math.abs(dx) < 60) return;
    dayOpen = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (dx < 0 ? 1 : -1));
    render();
  });
}

var E_ICON = {
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M7 9h10M7 13.5h6"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3.4"/><path d="M8 3v4M16 3v4M3 10.4h18"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
};

function addLecture(dow, pre) {
  if (!state.subjects.length) { addSubject(function () { addLecture(dow, pre); }); return; }
  pre = pre || {};
  // Editing an existing day entry reuses this sheet. The snapshot keeps the
  // original values while the user re-renders the sheet (chips/day toggles).
  var editRef = null;
  if (pre.edit && typeof dayEntryRef === "function") {
    editRef = dayEntryRef(pre.edit.kind, pre.edit.id);
    if (editRef && !pre.edit.snapshot) {
      var eit = editRef.item;
      pre.edit.snapshot = {
        subjectId: eit.subjectId, kind: eit.kind, time: eit.time,
        place: eit.place, date: eit.date, note: eit.note,
        weekday: eit.weekday, list: editRef.list
      };
    }
    if (pre.edit.snapshot) {
      var sn = pre.edit.snapshot;
      if (pre.subjectId == null) pre.subjectId = sn.subjectId;
      if (pre.kind == null) pre.kind = sn.kind;
      if (pre.time == null) pre.time = sn.time;
      if (pre.place == null) pre.place = sn.place;
      if (pre.date == null) pre.date = sn.date;
      if (pre.note == null) pre.note = sn.note;
      if (dow == null) {
        dow = sn.list === "lectures" ? sn.weekday
          : (sn.date ? new Date(sn.date + "T00:00:00").getDay() : dow);
      }
    }
  }
  var subId = pre.subjectId || state.subjects[0].id;
  var kind = pre.kind || "lecture";
  var day = dow;
  var group = isWeekly(kind) ? "w" : "d";

  function kindChips() {
    return KINDS.filter(function (k) { return isWeekly(k[0]) === (group === "w"); }).map(function (k) {
      return '<button class="chip' + (k[0] === kind ? " on" : "") + '" data-k="' + k[0] + '">' + k[1] + "</button>";
    }).join("");
  }
  function subjChips() {
    return state.subjects.map(function (s) {
      return '<button class="chip' + (s.id === subId ? " on" : "") + '" data-s="' + s.id + '"><i style="background:' + colorOf(s.id) + '"></i>' + esc(s.name) + "</button>";
    }).join("") + '<button class="chip addchip" data-newsub>+ New</button>';
  }

  var html = '<div class="ehead">' +
    '<span class="eico">' + E_ICON.list + "</span>" +
    "<h2>" + (editRef ? "Edit entry" : "New entry") + "</h2>" +
    '<div class="egrp">' +
      '<button data-grp="w" class="' + (group === "w" ? "on" : "") + '" aria-label="Repeats weekly">' + E_ICON.repeat + "</button>" +
      '<button data-grp="d" class="' + (group === "d" ? "on" : "") + '" aria-label="One date">' + E_ICON.cal + "</button>" +
    "</div>" +
    '<button class="edots" id="eMore" aria-label="More">' + E_ICON.dots + "</button>" +
    '<div class="emenu" id="emenu"><button data-e="newsub">New subject</button><button data-e="close">Close</button></div>' +
    "</div>" +
    (pre.heard ? '<div class="eheard">' + esc(pre.heard) + "</div>" : "") +
    '<div class="erow">' + kindChips() + "</div>" +
    '<div class="erow">' + subjChips() + "</div>" +
    '<div class="efields">' +
      '<div id="wk"><label>Day (repeats weekly)</label><div class="days">' +
        SHORT.map(function (d, i) { return '<button class="dp' + (i === dow ? " on" : "") + '" data-day="' + i + '">' + d + "</button>"; }).join("") +
      '</div><label>Place</label><input id="fPlace" placeholder="Hall / building, e.g. Hall 3"></div>' +
      '<div id="dt"><label>Date</label><input id="fDate" type="date"><label>Note (optional)</label><input id="fNote" placeholder="e.g. Section, Lab, Project"></div>' +
      '<label>Time</label><input id="fTime" type="time">' +
    "</div>" +
    '<div class="efoot"><button class="ecancel" id="eCancel">Cancel</button>' +
      '<button class="eok" id="eOk" aria-label="Add entry">' + E_ICON.plus + "</button></div>";

  openSheet(html);
  var box = document.getElementById("box");

  function fieldVal(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function rerender() {
    addLecture(day, {
      edit: pre.edit,
      subjectId: subId, kind: kind, heard: pre.heard,
      time: fieldVal("fTime"), place: fieldVal("fPlace"), date: fieldVal("fDate"), note: fieldVal("fNote")
    });
  }

  document.getElementById("fTime").value = pre.time || (group === "w" ? "09:00" : "");
  document.getElementById("fPlace").value = pre.place || "";
  document.getElementById("fDate").value = pre.date || iso(today);
  document.getElementById("fNote").value = pre.note || "";
  document.getElementById("wk").style.display = group === "w" ? "" : "none";
  document.getElementById("dt").style.display = group === "w" ? "none" : "";

  box.querySelectorAll("[data-grp]").forEach(function (b) {
    b.onclick = function () {
      var g = b.getAttribute("data-grp");
      if (g === group) return;
      group = g;
      kind = g === "w" ? "lecture" : "quiz";
      rerender();
    };
  });
  box.querySelectorAll("[data-k]").forEach(function (b) {
    b.onclick = function () {
      if (kind === b.getAttribute("data-k")) return;
      kind = b.getAttribute("data-k");
      rerender();
    };
  });
  box.querySelectorAll("[data-s]").forEach(function (b) {
    b.onclick = function () {
      subId = b.getAttribute("data-s");
      box.querySelectorAll("[data-s]").forEach(function (o) { o.className = "chip" + (o === b ? " on" : ""); });
    };
  });
  box.querySelectorAll("[data-day]").forEach(function (b) {
    b.onclick = function () {
      day = +b.getAttribute("data-day");
      box.querySelectorAll("[data-day]").forEach(function (o) { o.className = "dp" + (o === b ? " on" : ""); });
    };
  });

  box.querySelector("[data-newsub]").onclick = function () {
    addSubject(function () {
      subId = state.subjects[state.subjects.length - 1].id;
      rerender();
    });
  };
  document.getElementById("eMore").onclick = function (e) {
    e.stopPropagation();
    document.getElementById("emenu").classList.toggle("show");
  };
  box.onclick = function () {
    var m = document.getElementById("emenu");
    if (m) m.classList.remove("show");
  };
  box.querySelectorAll("[data-e]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      if (b.getAttribute("data-e") === "close") { closeModal(); return; }
      addSubject(function () {
        subId = state.subjects[state.subjects.length - 1].id;
        rerender();
      });
    };
  });

  document.getElementById("eCancel").onclick = closeModal;
  document.getElementById("eOk").onclick = function () {
    var time = document.getElementById("fTime").value;
    var keepId = editRef ? editRef.item.id : uid();
    var keepPrio = editRef ? (editRef.item.priority || "") : "";
    var nextLecture = null, nextEvent = null;

    if (isWeekly(kind)) {
      var place = document.getElementById("fPlace").value.trim();
      if (!place) { toast("Write the place"); return; }
      nextLecture = { id: keepId, subjectId: subId, kind: kind, weekday: day, time: time, place: place };
      if (keepPrio) nextLecture.priority = keepPrio;
    } else {
      var date = document.getElementById("fDate").value;
      if (!date) { toast("Pick the date"); return; }
      nextEvent = { id: keepId, subjectId: subId, kind: kind, date: date, time: time, note: document.getElementById("fNote").value.trim() };
      if (keepPrio) nextEvent.priority = keepPrio;
    }

    // Editing can switch an entry between weekly and one-date, so drop the old
    // record first and write the new one into the right list.
    if (editRef) {
      state.lectures = state.lectures.filter(function (l) { return l.id !== keepId; });
      state.events = state.events.filter(function (e) { return e.id !== keepId; });
    }
    if (nextLecture) state.lectures.push(nextLecture);
    if (nextEvent) {
      state.events.push(nextEvent);
      var p = nextEvent.date.split("-");
      view = new Date(+p[0], +p[1] - 1, 1);
      // If we came from a day sheet, follow the entry to its new date.
      if (dayOpen) dayOpen = new Date(+p[0], +p[1] - 1, +p[2]);
    }
    save(); render(); closeModal();
    if (editRef) toast("Entry updated");
  };
}

// ===== Reminders filter popover =====
function remindersPopoverHtml() {
  var rows = "";
  dayFilterLists().forEach(function (l) {
    rows += '<div class="dfp-row"><span class="dfp-ic">' + D_ICON.check +
      '</span><span class="dfp-lbl">' + esc(l.name) + "</span></div>";
  });
  dayFilterCalendars().forEach(function (s) {
    rows += '<div class="dfp-row"><span class="dfp-ic">' + D_ICON.check +
      '</span><span class="dfp-lbl">' + esc(s.name) + "</span></div>";
  });
  if (!rows) rows = '<div class="dfp-empty">No filters selected</div>';
  return '<div class="dfp-list">' + rows + "</div>" +
    '<div class="dfp-div"></div>' +
    '<button type="button" class="dfp-act" data-fpop="edit"><span class="dfp-ic">' + D_ICON.filter +
      '</span><span class="dfp-lbl">Edit Filters</span></button>' +
    '<button type="button" class="dfp-act danger" data-fpop="clear"><span class="dfp-ic">' + D_ICON.xcircle +
      '</span><span class="dfp-lbl">Clear Filter</span></button>';
}

function closeRemindersPopover() {
  var pop = document.getElementById("dfp");
  if (pop) pop.remove();
  var scrim = document.getElementById("dfpScrim");
  if (scrim) scrim.remove();
}

function openRemindersPopover(anchor) {
  closeRemindersPopover();
  var screen = document.getElementById("screen");
  if (!screen || !anchor) return;

  var scrim = document.createElement("div");
  scrim.className = "dfp-scrim";
  scrim.id = "dfpScrim";
  scrim.onclick = closeRemindersPopover;
  screen.appendChild(scrim);

  var pop = document.createElement("div");
  pop.className = "dfp";
  pop.id = "dfp";
  pop.setAttribute("role", "menu");
  pop.innerHTML = remindersPopoverHtml();
  screen.appendChild(pop);

  var sr = screen.getBoundingClientRect();
  var ar = anchor.getBoundingClientRect();
  var app = document.getElementById("app");
  var cqw = app ? app.getBoundingClientRect().width / 100 : 4.3;
  var top = ar.bottom - sr.top + cqw * 0.9;
  var right = Math.max(cqw * 3, sr.right - ar.right);
  var maxTop = sr.height - pop.offsetHeight - cqw * 3;
  pop.style.top = Math.max(cqw * 2, Math.min(top, maxTop)) + "px";
  pop.style.right = right + "px";

  var edit = pop.querySelector('[data-fpop="edit"]');
  if (edit) edit.onclick = function (e) {
    e.stopPropagation();
    closeRemindersPopover();
    settingsPage("filters");
  };
  var clear = pop.querySelector('[data-fpop="clear"]');
  if (clear) clear.onclick = function (e) {
    e.stopPropagation();
    clearDayFilters();
    closeRemindersPopover();
    render();
  };
}

// ===== Edit Filters sheet =====
function filterSheetRow(type, id, name, color, on) {
  var attr = type === "cal" ? "data-fcal" : "data-flst";
  return '<button type="button" class="frow' + (on ? " on" : "") + '" ' + attr + '="' + esc(id) + '">' +
    '<span class="fd" style="background:' + color + '"></span>' +
    '<span class="fn">' + esc(name) + "</span>" +
    '<span class="fcheck' + (on ? " on" : "") + '" aria-hidden="true">' + (on ? D_ICON.check : "") + "</span>" +
  "</button>";
}

function filterSheetHtml() {
  var f = dayFilters();
  var calRows = "";
  if (state.subjects.length) {
    state.subjects.forEach(function (s) {
      calRows += filterSheetRow("cal", s.id, s.name, colorOf(s.id), f.calendars.indexOf(s.id) >= 0);
    });
  } else {
    calRows = '<div class="fempty">No calendars yet. Add a subject to focus on it here.</div>';
  }
  var listRows = DAY_FILTER_LISTS.map(function (l) {
    return filterSheetRow("lst", l.id, l.name, l.color, f.lists.indexOf(l.id) >= 0);
  }).join("");

  return '<div class="fhead"><div class="ft"><h2>Edit Filters</h2><p>' + esc(dayFilterFocusText()) + "</p></div>" +
    '<button type="button" class="sx fclose" data-set="close" aria-label="Close">' + D_ICON.x + "</button></div>" +
    '<div class="fscroll">' +
      '<div class="fsec"><h3>Calendars</h3>' + calRows + "</div>" +
      '<div class="fsec"><h3>Lists</h3>' + listRows + "</div>" +
    "</div>" +
    '<div class="ffooter"><button type="button" class="fclear" data-fclear="1">Clear Filter</button></div>';
}

function refreshFilterSheet(box) {
  var f = dayFilters();
  box.querySelectorAll("[data-fcal]").forEach(function (b) {
    var on = f.calendars.indexOf(b.getAttribute("data-fcal")) >= 0;
    b.classList.toggle("on", on);
    var c = b.querySelector(".fcheck");
    if (c) { c.classList.toggle("on", on); c.innerHTML = on ? D_ICON.check : ""; }
  });
  box.querySelectorAll("[data-flst]").forEach(function (b) {
    var on = f.lists.indexOf(b.getAttribute("data-flst")) >= 0;
    b.classList.toggle("on", on);
    var c = b.querySelector(".fcheck");
    if (c) { c.classList.toggle("on", on); c.innerHTML = on ? D_ICON.check : ""; }
  });
  var sub = box.querySelector(".fhead p");
  if (sub) sub.textContent = dayFilterFocusText();
  render();
}

function bindFilterSheet(box) {
  box.querySelectorAll("[data-fcal]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      toggleDayFilter("calendars", b.getAttribute("data-fcal"));
      refreshFilterSheet(box);
    };
  });
  box.querySelectorAll("[data-flst]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      toggleDayFilter("lists", b.getAttribute("data-flst"));
      refreshFilterSheet(box);
    };
  });
  var clear = box.querySelector("[data-fclear]");
  if (clear) clear.onclick = function (e) {
    e.stopPropagation();
    clearDayFilters();
    closeModal();
    render();
  };
}
