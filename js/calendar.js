// ===== Calendar =====
function lecturesOn(dow, useFilter) {
  return state.lectures.filter(function (l) { return l.weekday === dow && (!useFilter || !filterId || l.subjectId === filterId); })
    .sort(function (a, b) { return a.time < b.time ? -1 : 1; });
}

function cellLines(date, dow) {
  var lines = [];
  var day = iso(date);
  state.events.filter(function (e) { return e.date === day && (!filterId || e.subjectId === filterId); })
    .forEach(function (e) {
      lines.push({ color: colorOf(e.subjectId), text: subjectName(e.subjectId), cls: "" });
      lines.push({ text: kindLabel(e.kind) + (e.note ? " · " + e.note : ""), cls: "tag", color: colorOf(e.subjectId) });
    });
  var list = lecturesOn(dow, true);
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
  clearDaySwipe();
  if (yearOpen) return renderYear();
  var y = view.getFullYear(), m = view.getMonth();
  var html = '<div class="title ctitle"><button class="nz" id="prev" aria-label="Previous month"></button><h1 id="titleMonth">' + MONTHS[m] + (y !== today.getFullYear() ? "<small>" + y + "</small>" : "") + '</h1><button class="nz" id="next" aria-label="Next month"></button></div><div class="grid">';
  SHORT.forEach(function (d) { html += '<div class="dw"><span>' + d + "</span></div>"; });
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
      (tint ? ' style="--c:' + tint + ';background:linear-gradient(0deg,' + tint + '26,' + tint + '26),rgba(255,255,255,.06)"' : "") +
      ' data-d="' + n + '"><span>' + n + "</span>";
    lines.forEach(function (ln) {
      if (ln.cls === "") html += '<i class="ev" style="color:' + ln.color + '"><b style="background:' + ln.color + '"></b>' + esc(ln.text) + "</i>";
      else html += '<i class="ev ' + ln.cls + '"' + (ln.color ? ' style="color:' + ln.color + '"' : "") + ">" + esc(ln.text) + "</i>";
    });
    html += "</button>";
  }
  html += '</div><div class="chips"><button class="chip' + (filterId ? "" : " on") + '" data-f="">All<span class="n">' +
    (eventsInMonth(null) + lecturesInMonth(null)) + "</span></button>";
  state.subjects.forEach(function (s) {
    var c = colorOf(s.id);
    html += '<button class="chip sub' + (filterId === s.id ? " on" : "") + '" data-f="' + s.id +
      '" style="--tint:linear-gradient(0deg,' + c + '26,' + c + '26),rgba(255,255,255,.07);--on:linear-gradient(0deg,' + c + '4d,' + c + '4d),rgba(255,255,255,.07);border-color:' + c + '66">' +
      '<i style="background:' + c + '"></i>' + esc(s.name) +
      '<span class="n">' + (eventsInMonth(s.id) + lecturesInMonth(s.id)) + "</span></button>";
  });
  html += "</div>";

  // away from the current month -> floating "This Month" pill that jumps back
  if (y !== today.getFullYear() || m !== today.getMonth()) {
    html += '<button class="todayBtn inflow" id="todayBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>This Month</button>';
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

function dayItems(date) {
  var key = iso(date), out = [];
  state.events.forEach(function (e) {
    if (e.date !== key) return;
    out.push({
      color: colorOf(e.subjectId), title: subjectName(e.subjectId), sid: e.subjectId,
      sub: kindLabel(e.kind) + (e.note ? " · " + e.note : ""),
      time: e.time, kind: "ev", id: e.id
    });
  });
  lecturesOn(date.getDay(), false).forEach(function (l) {
    out.push({
      color: colorOf(l.subjectId), title: subjectName(l.subjectId), sid: l.subjectId,
      sub: kindLabel(l.kind) + (l.place ? " · " + l.place : ""),
      time: l.time, kind: "lec", id: l.id
    });
  });
  return out.sort(function (a, b) { return (a.time || "99:99") < (b.time || "99:99") ? -1 : 1; });
}

function openDay(date) { yearOpen = false; dayOpen = date; render(); }

function renderDay() {
  var date = dayOpen, isToday = iso(date) === iso(today);
  var items = dayItems(date);
  var html = '<div class="dhead">' +
    '<div class="dbadge"><b>' + date.getDate() + "</b><i>" + MONTHS[date.getMonth()].slice(0, 3).toUpperCase() + "</i></div>" +
    '<div class="dtitles"><h1>' + (isToday ? "Today" : WEEK[date.getDay()]) + "</h1><span>" +
      (isToday ? WEEK[date.getDay()] : date.getDate() + " " + MONTHS[date.getMonth()]) + "</span></div>" +
    '<button class="round" id="dCal" aria-label="Month view"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3.4"/><path d="M8 3v4M16 3v4M3 10.4h18"/></svg></button>' +
    '<button class="round" id="dMore" aria-label="More"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/></svg></button>' +
    '<div class="dmenu" id="dmenu"><button data-m="entry">Add entry</button><button data-m="today">Jump to today</button><button data-m="month">Back to month</button></div>' +
    "</div>";

  var daySubs = [];
  items.forEach(function (it) {
    var f = daySubs.filter(function (x) { return x.id === it.sid; })[0];
    if (f) f.n++; else daySubs.push({ id: it.sid, name: it.title, color: it.color, n: 1 });
  });
  if (daySubs.length) {
    html += '<div class="dchips">';
    daySubs.forEach(function (sb) {
      html += '<button class="dchip" data-sub="' + sb.id + '" style="background:' + sb.color + '1f;border-color:' + sb.color +
        '66;color:' + sb.color + '"><i style="background:' + sb.color + '"></i>' + esc(sb.name) +
        '<span class="n">+' + sb.n + "</span></button>";
    });
    html += "</div>";
  }

  if (items.length) {
    html += '<div class="dremrow"><button class="dremind" id="dRemind">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>' +
      'Reminders<span class="n">+' + items.length + "</span></button></div>";
  }

  html += '<div class="dcard">';
  if (!items.length) html += '<div class="dempty">Nothing on this day</div>';
  items.forEach(function (it) {
    html += '<div class="drow"><span class="ddot" style="background:' + it.color + '"></span>' +
      '<div class="dtxt"><b>' + esc(it.title) + "</b><i>" + esc(it.sub) + "</i></div>" +
      '<span class="dtime">' + esc(fmtTime(it.time)) + "</span>" +
      '<button class="x" data-del="' + it.kind + ":" + it.id + '" aria-label="Delete">✕</button></div>';
  });
  html += "</div>";
  html += '<button class="add" id="addLec">+ Add entry</button>';
  if (!isToday) {
    html += '<button class="todayBtn" id="todayDayBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Today</button>';
  }

  var main = document.getElementById("main");
  main.innerHTML = html;

  document.getElementById("dCal").onclick = function () { dayOpen = null; render(); };
  var remBtn = document.getElementById("dRemind");
  if (remBtn) remBtn.onclick = function () { settingsPage("reminders"); };
  var tdb = document.getElementById("todayDayBtn");
  if (tdb) tdb.onclick = function () {
    dayOpen = null;
    view = new Date(today.getFullYear(), today.getMonth(), 1);
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
  main.querySelectorAll("[data-m]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      var a = b.getAttribute("data-m");
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
  document.getElementById("addLec").onclick = function () { addLecture(date.getDay(), { date: iso(date) }); };
  main.querySelectorAll("[data-sub]").forEach(function (b) {
    b.onclick = function () { tab = "sub"; openId = b.getAttribute("data-sub"); render(); };
  });

  // swipe down to close, swipe left/right to move between days
  var sx = 0, sy = 0;
  bindMainSwipe(function (e) { if (!e.touches.length) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, function (e) {
    if (!e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx)) {
      if (dy > 0 && main.scrollTop <= 0) { dayOpen = null; render(); }
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
    "<h2>New entry</h2>" +
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
    if (isWeekly(kind)) {
      var place = document.getElementById("fPlace").value.trim();
      if (!place) { toast("Write the place"); return; }
      state.lectures.push({ id: uid(), subjectId: subId, kind: kind, weekday: day, time: time, place: place });
    } else {
      var date = document.getElementById("fDate").value;
      if (!date) { toast("Pick the date"); return; }
      state.events.push({ id: uid(), subjectId: subId, kind: kind, date: date, time: time, note: document.getElementById("fNote").value.trim() });
      var p = date.split("-");
      view = new Date(+p[0], +p[1] - 1, 1);
    }
    save(); render(); closeModal();
  };
}
