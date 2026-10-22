
var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
var SHORT = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
// Muted, low-glare accents that sit quietly on the dark surface.
var PALETTE = ["#e0786a","#7fb48e","#6f9fd8","#d0a55e","#a98bd4","#5fb7bd"];
// The same accents, darkened a little so they hold up against warm paper.
var LIGHT_PALETTE = ["#b85c4d","#4f8562","#3d72ad","#a3782b","#7f5fae","#2f848b"];
// The brighter accents from the original design, kept for the optional
// "Original" calendar colours.
var VIVID_PALETTE = ["#ff3b30","#34c759","#0a84ff","#ff9f0a","#bf5af2","#64d2ff"];
// The same idea for light paper: darker versions that keep coloured text legible.
var VIVID_LIGHT_PALETTE = ["#c92a1e","#1f7a38","#0a5fbf","#9a5a00","#8338b5","#00708a"];

// Default "remind me this many minutes before" per group (see js/reminders.js)
var REMIND_DEFAULT_LEAD = { classes: 10, quiz: 1440, deadline: 4320, exam: 1440 };

var STATE_KEY = "campus";

// ===== State =====
// Kept in memory (so rendering stays synchronous), mirrored to localStorage for an
// instant first paint, and stored for real in IndexedDB by db.js.
var state = { version: 2, subjects: [], lectures: [], events: [], lang: "ar", calendarColors: "quiet", reminders: null };

try {
  var saved = localStorage.getItem(STATE_KEY);
  if (saved) state = normalizeState(JSON.parse(saved));
} catch (e) {}
state = normalizeState(state);   // the built-in default needs normalising too
applyTheme();

// Make sure a state object loaded from disk/storage always has the shape the app expects.
function normalizeState(s) {
  if (!s || typeof s !== "object") s = {};
  if (!Array.isArray(s.subjects)) s.subjects = [];
  if (!Array.isArray(s.lectures)) s.lectures = [];
  if (!Array.isArray(s.events)) s.events = [];
  if (s.lang !== "en" && s.lang !== "ar") s.lang = "ar";
  if (s.theme !== "light" && s.theme !== "system") s.theme = "dark";
  if (s.calendarColors !== "original") s.calendarColors = "quiet";
  s.version = 2;
  s.subjects.forEach(function (sub) {
    if (!Array.isArray(sub.files)) sub.files = [];
  });

  // reminders: enabled flag, per-group lead times, and what we've already fired
  if (!s.reminders || typeof s.reminders !== "object") s.reminders = {};
  var r = s.reminders;
  if (typeof r.enabled !== "boolean") r.enabled = false;
  if (!r.lead || typeof r.lead !== "object") r.lead = {};
  Object.keys(REMIND_DEFAULT_LEAD).forEach(function (k) {
    if (typeof r.lead[k] !== "number" || !isFinite(r.lead[k]) || r.lead[k] < 0) {
      r.lead[k] = REMIND_DEFAULT_LEAD[k];
    }
  });
  if (!r.fired || typeof r.fired !== "object") r.fired = {};

  return s;
}

// Persist: localStorage immediately (cheap + instant), IndexedDB for the real copy.
function save() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
  if (typeof idbPut === "function") {
    idbPut("kv", state, STATE_KEY).catch(function () {});
  }
}

// Load the authoritative copy from IndexedDB at startup.
function loadStateFromDB() {
  if (typeof idbGet !== "function") return Promise.resolve(false);
  return idbGet("kv", STATE_KEY).then(function (stored) {
    if (stored) { state = normalizeState(stored); applyTheme(); return true; }
    idbPut("kv", state, STATE_KEY).catch(function () {}); // first run: migrate localStorage copy
    return false;
  }).catch(function () { return false; });
}

// Resolve the saved preference ("dark", "light" or "system") to the theme that
// should actually be painted, then keep browser chrome in sync with it.
function resolvedTheme() {
  if (state.theme === "system") {
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
  }
  return state.theme === "light" ? "light" : "dark";
}

function applyTheme() {
  var theme = resolvedTheme();
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-colors", state.calendarColors === "original" ? "original" : "quiet");
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f3f1ec" : "#161616");
  var status = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (status) status.setAttribute("content", theme === "light" ? "default" : "black-translucent");
  return theme;
}

var today = new Date();
var view = new Date(today.getFullYear(), today.getMonth(), 1);
var tab = "cal";
var openId = null;
var filterId = null;

function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
function toast(msg) { var t = document.getElementById("toast"); t.textContent = msg; t.className = "show"; setTimeout(function () { t.className = ""; }, 2500); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function pad(n) { return (n < 10 ? "0" : "") + n; }
function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

function fmtSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function colorOf(id) {
  var light = document.documentElement.getAttribute("data-theme") === "light";
  var palette = light ? LIGHT_PALETTE : PALETTE;
  for (var i = 0; i < state.subjects.length; i++) if (state.subjects[i].id === id) return palette[i % palette.length];
  return light ? "#8a8780" : "#888";
}

// The calendar can optionally use the brighter colours from the original design.
// Everything outside the calendar keeps the quieter current palette.
function originalCalendarColors() {
  return state.calendarColors === "original";
}

function calendarColorOf(id) {
  var light = document.documentElement.getAttribute("data-theme") === "light";
  var palette = light ? LIGHT_PALETTE : PALETTE;
  if (originalCalendarColors()) palette = light ? VIVID_LIGHT_PALETTE : VIVID_PALETTE;
  for (var i = 0; i < state.subjects.length; i++) if (state.subjects[i].id === id) return palette[i % palette.length];
  return light ? "#8a8780" : "#888";
}

// Folder icon for subject rows and search results - same stroke style as the
// app's other icons (mic, search, camera). Used in two files, defined once.
var FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';

// ===== hold-to-confirm =====
// The ✕ on subjects and files is destructive and used to fire on a single tap.
// Now it asks for a press-and-hold instead: a red fill sweeps across the button
// for `ms`, releasing early (or dragging away) rolls it back, and only finishing
// the hold deletes. Tap does nothing but hint. Keyboard: hold Enter / Space.
// Pattern after dqnamo's hold-to-confirm experiment.
function swallowClicks(ms) {
  // After a completed hold the pointer release still produces a click - swallow it
  // so the row underneath (open the folder, delete again) never sees it.
  var h = function (e) { e.stopPropagation(); e.preventDefault(); };
  document.addEventListener("click", h, true);
  setTimeout(function () { document.removeEventListener("click", h, true); }, ms || 500);
}

function holdToConfirm(btn, ms, onConfirm) {
  var timer = null, holding = false, confirmed = false;
  btn.style.setProperty("--hold-ms", ms + "ms");

  function start(e) {
    if (holding || confirmed) return;
    if (e && e.button !== 0) return;
    if (e && e.pointerId != null && btn.setPointerCapture) {
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}   // keep receiving moves outside
    }
    holding = true;
    btn.classList.add("holding");
    timer = setTimeout(complete, ms);
  }
  function complete() {
    timer = null;
    holding = false;
    confirmed = true;
    btn.classList.remove("holding");
    swallowClicks();
    onConfirm(btn);
  }
  function cancel() {
    if (!holding) return;
    holding = false;
    if (timer) { clearTimeout(timer); timer = null; }
    btn.classList.remove("holding");
  }

  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointermove", function (e) {
    if (!holding) return;
    var r = btn.getBoundingClientRect();                       // finger drifted off the button
    if (e.clientX < r.left - 8 || e.clientX > r.right + 8 || e.clientY < r.top - 8 || e.clientY > r.bottom + 8) cancel();
  });
  btn.addEventListener("pointerup", cancel);
  btn.addEventListener("pointercancel", cancel);
  btn.addEventListener("lostpointercapture", cancel);
  btn.addEventListener("blur", cancel);
  btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });   // no long-press menu mid-hold
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!confirmed) toast("Hold to delete");                    // released early: teach the gesture
    confirmed = false;
  });
  btn.addEventListener("keydown", function (e) {
    if (e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    start(null);
  });
  btn.addEventListener("keyup", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cancel(); }
  });
}
function subjectName(id) {
  for (var i = 0; i < state.subjects.length; i++) if (state.subjects[i].id === id) return state.subjects[i].name;
  return "?";
}

// ===== Entry types =====
var KINDS = [["lecture", "Lecture"], ["section", "Section"], ["lab", "Lab"], ["quiz", "Quiz"], ["deadline", "Deadline"], ["midterm", "Midterm"], ["final", "Final"]];
var TAGS = { lecture: "Lec", section: "Sec", lab: "Lab" };
function isWeekly(kind) { return kind === "lecture" || kind === "section" || kind === "lab"; }
function kindLabel(kind) {
  for (var i = 0; i < KINDS.length; i++) if (KINDS[i][0] === kind) return KINDS[i][1];
  return "Lecture";
}
