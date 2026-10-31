// ===== Long-press actions for a day entry =====
//
// A long press on a day card (list view or timeline) opens a compact action
// menu: Select, Edit, Move, Priority, Duplicate, Delete. The menu is
// app-level so it can sit above the day view without changing the card
// markup itself.

var DM_ICON = {
  select: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.6"/><path d="M8.2 12.2l2.6 2.6 5-5.2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l.9-4.2L16.4 4.3a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.2 19.1 4 20z"/><path d="M14.6 6.1l3.3 3.3"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15"/><path d="M13.4 6.4L19 12l-5.6 5.6"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V4"/><path d="M6 5h10.2l-1.7 3.6 1.7 3.6H6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.4" y="8.4" width="11.6" height="11.6" rx="2.6"/><path d="M15.6 5.6V5a1.6 1.6 0 0 0-1.6-1.6H5.6A1.6 1.6 0 0 0 4 5v8.4A1.6 1.6 0 0 0 5.6 15h.8"/><path d="M12 14.2h4.4M14.2 12v4.4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 6.5h15"/><path d="M9.4 6.5V4.6h5.2v1.9"/><path d="M6.6 6.5l.9 12.4a1.8 1.8 0 0 0 1.8 1.6h5.4a1.8 1.8 0 0 0 1.8-1.6l.9-12.4"/><path d="M10.2 10.2v6.6M13.8 10.2v6.6"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.6l4.4 4.4L19 7.4"/></svg>',
  day: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.6" y="5" width="16.8" height="15.4" rx="3.4"/><path d="M8 2.8v4.2M16 2.8v4.2M3.6 9.6h16.8"/></svg>'
};

var daySelMode = false;
var daySel = {};
var dmCurrent = null;

function dayEntryRef(kind, id) {
  var i;
  if (kind === "lec") {
    for (i = 0; i < state.lectures.length; i++) {
      if (state.lectures[i].id === id) return { item: state.lectures[i], list: "lectures", kind: "lec" };
    }
  } else {
    for (i = 0; i < state.events.length; i++) {
      if (state.events[i].id === id) return { item: state.events[i], list: "events", kind: "ev" };
    }
  }
  return null;
}

function dmKey(kind, id) { return kind + ":" + id; }

function dmRow(action, icon, label, sub, danger) {
  return '<button type="button" class="dm-row' + (danger ? " danger" : "") + '" data-dma="' + action + '" role="menuitem">' +
    '<span class="dm-ic">' + icon + "</span>" +
    '<span class="dm-lbl">' + label + "</span>" +
    (sub ? '<span class="dm-chev">' + DM_ICON.chev + "</span>" : "") +
    "</button>";
}

function dmBuildMenu() {
  // Mark the entry's current day / priority so the submenus read like a
  // picker instead of a plain list.
  var curDow = -1, curPrio = "";
  if (dmCurrent) {
    var cur = dmCurrent.ref.item;
    curPrio = cur.priority || "";
    if (dmCurrent.ref.list === "lectures") curDow = cur.weekday;
    else if (cur.date) curDow = new Date(cur.date + "T00:00:00").getDay();
  }

  var days = WEEK.map(function (name, i) {
    return '<button type="button" class="dm-row" data-move-day="' + i + '" role="menuitem">' +
      '<span class="dm-ic dm-dayic">' + DM_ICON.day + "</span>" +
      '<span class="dm-lbl">' + name + "</span>" +
      (i === curDow ? '<span class="dm-tick">' + DM_ICON.check + "</span>" : "") +
      "</button>";
  }).join("");
  var prios = [
    ["", "None", "dm-pnone"],
    ["low", "Low", "dm-plow"],
    ["medium", "Medium", "dm-pmedium"],
    ["high", "High", "dm-phigh"]
  ].map(function (p) {
    return '<button type="button" class="dm-row dm-prio" data-prio="' + p[0] + '" role="menuitem">' +
      '<span class="dm-ic ' + p[2] + '">' + DM_ICON.flag + "</span>" +
      '<span class="dm-lbl">' + p[1] + "</span>" +
      (p[0] === curPrio ? '<span class="dm-tick">' + DM_ICON.check + "</span>" : "") +
      "</button>";
  }).join("");

  var menu = document.createElement("div");
  menu.id = "dayMenu";
  menu.className = "dm";
  menu.innerHTML =
    '<div class="dm-scrim" data-dm-close></div>' +
    '<div class="dm-card" role="menu" aria-label="Entry actions">' +
      '<div class="dm-main">' +
        dmRow("select", DM_ICON.select, "Select") +
        dmRow("edit", DM_ICON.edit, "Edit") +
        dmRow("move", DM_ICON.move, "Move", true) +
        dmRow("priority", DM_ICON.flag, "Priority", true) +
        dmRow("duplicate", DM_ICON.copy, "Duplicate") +
        '<div class="dm-sep"></div>' +
        dmRow("delete", DM_ICON.trash, "Delete", false, true) +
      "</div>" +
      '<div class="dm-sub" data-sub="move" hidden>' +
        '<button type="button" class="dm-back" data-dm-back>' + DM_ICON.back + "<span>Move to</span></button>" +
        '<div class="dm-list">' + days + "</div>" +
      "</div>" +
      '<div class="dm-sub" data-sub="priority" hidden>' +
        '<button type="button" class="dm-back" data-dm-back>' + DM_ICON.back + "<span>Priority</span></button>" +
        '<div class="dm-list">' + prios + "</div>" +
      "</div>" +
    "</div>";
  return menu;
}

function dmPanel(name) {
  var menu = document.getElementById("dayMenu");
  if (!menu) return;
  var main = menu.querySelector(".dm-main");
  if (main) main.hidden = name !== "main";
  menu.querySelectorAll(".dm-sub").forEach(function (sub) {
    sub.hidden = sub.getAttribute("data-sub") !== name;
  });
  var card = menu.querySelector(".dm-card");
  if (card) card.scrollTop = 0;
}

function openDayMenu(el) {
  if (!el) return;
  var key = el.getAttribute("data-entry");
  if (!key) return;
  var cut = key.indexOf(":");
  var kind = key.slice(0, cut), id = key.slice(cut + 1);
  var ref = dayEntryRef(kind, id);
  if (!ref) return;

  closeDayMenu();
  dmCurrent = { kind: kind, id: id, ref: ref, el: el };

  var app = document.getElementById("app");
  var menu = dmBuildMenu();
  app.appendChild(menu);

  var card = menu.querySelector(".dm-card");
  var ar = app.getBoundingClientRect();
  var r = el.getBoundingClientRect();
  var h = card.offsetHeight;
  var maxTop = Math.max(10, app.clientHeight - h - 10);
  var top = r.bottom - ar.top + 8;
  // Flip above the card when there is no room below, then clamp so a card
  // that is partly scrolled out of view can never push the menu off-screen.
  if (top > maxTop) top = r.top - ar.top - h - 8;
  top = Math.max(10, Math.min(top, maxTop));
  card.style.top = top + "px";

  menu.addEventListener("click", dmClick);
  document.addEventListener("keydown", dmKeydown);
  requestAnimationFrame(function () { menu.classList.add("show"); });
}

function dmClick(e) {
  var t = e.target;
  if (t.closest("[data-dm-close]")) { closeDayMenu(); return; }
  if (t.closest("[data-dm-back]")) { dmPanel("main"); return; }
  var day = t.closest("[data-move-day]");
  if (day) { dmMove(+day.getAttribute("data-move-day")); return; }
  var prio = t.closest("[data-prio]");
  if (prio) { dmPriority(prio.getAttribute("data-prio")); return; }
  var row = t.closest("[data-dma]");
  if (!row) return;
  var action = row.getAttribute("data-dma");
  if (action === "move" || action === "priority") { dmPanel(action); return; }
  if (action === "select") { dmSelect(); return; }
  if (action === "edit") { dmEdit(); return; }
  if (action === "duplicate") { dmDuplicate(); return; }
  if (action === "delete") { dmDelete(); return; }
}

function dmKeydown(e) {
  if (e.key === "Escape") closeDayMenu();
}

function closeDayMenu() {
  var menu = document.getElementById("dayMenu");
  if (menu) {
    menu.removeEventListener("click", dmClick);
    menu.remove();
  }
  document.removeEventListener("keydown", dmKeydown);
  dmCurrent = null;
}

function dmDuplicate() {
  if (!dmCurrent) return;
  var ref = dmCurrent.ref;
  var copy = {};
  Object.keys(ref.item).forEach(function (k) { copy[k] = ref.item[k]; });
  copy.id = uid();
  if (ref.list === "lectures") state.lectures.push(copy);
  else state.events.push(copy);
  save(); render(); closeDayMenu();
  toast("Duplicated");
}

function dmDelete() {
  if (!dmCurrent) return;
  var ref = dmCurrent.ref;
  if (ref.list === "lectures") state.lectures = state.lectures.filter(function (l) { return l.id !== ref.item.id; });
  else state.events = state.events.filter(function (e) { return e.id !== ref.item.id; });
  save(); render(); closeDayMenu();
  toast("Deleted");
}

function dmEdit() {
  if (!dmCurrent) return;
  var cur = dmCurrent;
  closeDayMenu();
  var base = dayOpen || today;
  addLecture(base.getDay(), { edit: { kind: cur.kind, id: cur.id } });
}

function dmMove(dayIndex) {
  if (!dmCurrent) return;
  var ref = dmCurrent.ref;
  if (ref.list === "lectures") {
    ref.item.weekday = dayIndex;
  } else {
    var base = dayOpen || today;
    var sunday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay());
    ref.item.date = iso(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + dayIndex));
  }
  save(); render(); closeDayMenu();
  toast("Moved to " + WEEK[dayIndex]);
}

function dmPriority(level) {
  if (!dmCurrent) return;
  var item = dmCurrent.ref.item;
  if (level) item.priority = level;
  else delete item.priority;
  save(); render(); closeDayMenu();
  toast(level ? "Priority: " + level : "Priority cleared");
}

// ===== Multi-select =====
function dmSelect() {
  if (!dmCurrent) return;
  daySelMode = true;
  daySel[dmKey(dmCurrent.kind, dmCurrent.id)] = true;
  closeDayMenu();
  syncDaySelection();
}

function dmSelBar() {
  var bar = document.getElementById("daySelBar");
  if (bar) return bar;
  bar = document.createElement("div");
  bar.id = "daySelBar";
  bar.className = "dselbar";
  bar.innerHTML =
    '<span class="dselcount"></span>' +
    '<button type="button" class="dseldel">Delete</button>' +
    '<button type="button" class="dseldone">Done</button>';
  document.getElementById("app").appendChild(bar);
  bar.querySelector(".dseldel").onclick = dmDeleteSelected;
  bar.querySelector(".dseldone").onclick = exitDaySelection;
  requestAnimationFrame(function () { bar.classList.add("show"); });
  return bar;
}

function syncDaySelection() {
  var main = document.getElementById("main");
  if (!daySelMode) {
    var old = document.getElementById("daySelBar");
    if (old) old.remove();
    if (main) main.querySelectorAll("[data-entry]").forEach(function (el) { el.classList.remove("sel"); });
    daySel = {};
    return;
  }
  if (main) {
    main.querySelectorAll("[data-entry]").forEach(function (el) {
      el.classList.toggle("sel", !!daySel[el.getAttribute("data-entry")]);
    });
  }
  var count = Object.keys(daySel).length;
  if (!count) { exitDaySelection(); return; }
  var bar = dmSelBar();
  var label = bar.querySelector(".dselcount");
  if (label) label.textContent = count + " selected";
}

function dmDeleteSelected() {
  var keys = Object.keys(daySel);
  keys.forEach(function (key) {
    var cut = key.indexOf(":");
    var kind = key.slice(0, cut), id = key.slice(cut + 1);
    if (kind === "lec") state.lectures = state.lectures.filter(function (l) { return l.id !== id; });
    else state.events = state.events.filter(function (e) { return e.id !== id; });
  });
  exitDaySelection();
  save(); render();
  toast(keys.length > 1 ? keys.length + " entries deleted" : "Deleted");
}

function exitDaySelection() {
  daySelMode = false;
  daySel = {};
  var bar = document.getElementById("daySelBar");
  if (bar) bar.remove();
  var main = document.getElementById("main");
  if (main) main.querySelectorAll("[data-entry]").forEach(function (el) { el.classList.remove("sel"); });
}

// ===== Long press =====
function bindDayLongPress(root) {
  if (!root) return;
  root.querySelectorAll("[data-entry]").forEach(function (el) {
    if (el._lpBound) return;
    el._lpBound = true;
    var timer = null, sx = 0, sy = 0, moved = false;

    function cancel() {
      if (timer) { clearTimeout(timer); timer = null; }
    }
    function start(e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest("[data-del]")) return;
      var t = e.touches && e.touches[0] ? e.touches[0] : e;
      sx = t.clientX; sy = t.clientY; moved = false;
      cancel();
      timer = setTimeout(function () {
        timer = null;
        if (moved) return;
        el._lpUntil = Date.now() + 800;
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) {} }
        if (daySelMode) {
          var k = el.getAttribute("data-entry");
          if (daySel[k]) delete daySel[k]; else daySel[k] = true;
          syncDaySelection();
          return;
        }
        openDayMenu(el);
      }, 500);
    }
    function move(e) {
      if (!timer) return;
      var t = e.touches && e.touches[0] ? e.touches[0] : e;
      if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) { moved = true; cancel(); }
    }
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", cancel);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("pointerleave", cancel);
    el.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      if (Date.now() < (el._lpUntil || 0)) return;
      openDayMenu(el);
    });
  });
}

// In select mode a tap toggles the entry instead of opening its subject.
// Capture phase so the day view's own click handlers never see it.
(function () {
  var main = document.getElementById("main");
  if (!main) return;
  main.addEventListener("click", function (e) {
    var row = e.target.closest ? e.target.closest("[data-entry]") : null;
    if (row && row._lpUntil && Date.now() < row._lpUntil) {
      e.preventDefault(); e.stopPropagation();
      return;
    }
    if (!daySelMode || !row) return;
    e.preventDefault(); e.stopPropagation();
    var k = row.getAttribute("data-entry");
    if (daySel[k]) delete daySel[k]; else daySel[k] = true;
    syncDaySelection();
  }, true);
})();
