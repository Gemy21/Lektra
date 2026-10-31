
var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
var SHORT = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
var TINY = ["S","M","T","W","T","F","S"];
var PALETTE = ["#ff3b30","#34c759","#0a84ff","#ff9f0a","#bf5af2","#64d2ff"];

// ===== Appearance =====
// Accent dots shown under the Light / Dark / System switch.
var ACCENTS = ["#0a84ff","#34c759","#bf5af2","#64d2ff","#5e5ce6","#ff375f"];

// Theme presets. `bg` tints the app paint, `mode` is the paint the theme was
// designed for, and `accent` is the colour of the dot / selected controls.
var THEMES = [
  { id: "classic", name: "Classic", accent: "#0a84ff", bg: "#141416", mode: null },
  { id: "solarized",  name: "Solarized",       accent: "#0a84ff", bg: "#fbf3e1", mode: "light", group: "light" },
  { id: "rose",       name: "Rosé",            accent: "#ff6b81", bg: "#fff4f5", mode: "light", group: "light" },
  { id: "matcha",     name: "Matcha",          accent: "#34c759", bg: "#f2faf1", mode: "light", group: "light" },
  { id: "lavender",   name: "Lavender",        accent: "#bf5af2", bg: "#f7f2ff", mode: "light", group: "light" },
  { id: "ocean",      name: "Ocean",           accent: "#0a84ff", bg: "#eef7ff", mode: "light", group: "light" },
  { id: "peach",      name: "Peach",           accent: "#ff9f0a", bg: "#fff5ec", mode: "light", group: "light" },
  { id: "candy",      name: "Candy",           accent: "#ff4d8d", bg: "#fff1f7", mode: "light", group: "light" },
  { id: "sakura",     name: "Sakura",          accent: "#ff375f", bg: "#ffeef3", mode: "light", group: "light" },
  { id: "skye",       name: "Skye",            accent: "#3ea6ff", bg: "#edf5ff", mode: "light", group: "light" },
  { id: "niks",       name: "Niks",            accent: "#a06bff", bg: "#f6f0ff", mode: "light", group: "light" },
  { id: "strawberry", name: "Strawberry Milk", accent: "#ff6fa5", bg: "#fff0f4", mode: "light", group: "light" },
  { id: "cotton",     name: "Cotton Candy",    accent: "#e86bff", bg: "#fdf1fb", mode: "light", group: "light" },
  { id: "seafoam",    name: "Seafoam",         accent: "#2bc4a0", bg: "#edfaf5", mode: "light", group: "light" },
  { id: "melody",     name: "Melody",          accent: "#7d7aff", bg: "#f4f1ff", mode: "light", group: "light" },
  { id: "honey",      name: "Honey",           accent: "#f5a524", bg: "#fff8e6", mode: "light", group: "light" },
  { id: "cloud",      name: "Cloud",           accent: "#7b93b0", bg: "#f2f6fb", mode: "light", group: "light" },
  { id: "newsprint",  name: "Newsprint",       accent: "#5b5b5b", bg: "#faf8f1", mode: "light", group: "light" },
  { id: "fog",        name: "Fog",             accent: "#8a8a92", bg: "#f5f5f6", mode: "light", group: "light" },
  { id: "pewter",     name: "Pewter",          accent: "#6f7280", bg: "#f1f1f3", mode: "light", group: "light" },
  { id: "terminal",   name: "Terminal",        accent: "#34c759", bg: "#070d08", mode: "dark", group: "dark" },
  { id: "dracula",    name: "Dracula",         accent: "#bd93f9", bg: "#12101b", mode: "dark", group: "dark" },
  { id: "nord",       name: "Nord",            accent: "#88c0d0", bg: "#0e1519", mode: "dark", group: "dark" },
  { id: "midnight",   name: "Midnight",        accent: "#3b82f6", bg: "#090f20", mode: "dark", group: "dark" },
  { id: "cobalt",     name: "Cobalt",          accent: "#3d6bff", bg: "#081027", mode: "dark", group: "dark" },
  { id: "synthwave",  name: "Synthwave",       accent: "#ff4fa3", bg: "#160c1d", mode: "dark", group: "dark" },
  { id: "ember",      name: "Ember",           accent: "#ff8a3d", bg: "#17100a", mode: "dark", group: "dark" },
  { id: "forest",     name: "Forest",          accent: "#4ade80", bg: "#08130d", mode: "dark", group: "dark" },
  { id: "flamingo",   name: "Flamingo",        accent: "#ff7eb6", bg: "#1b0d13", mode: "dark", group: "dark" },
  { id: "cherry",     name: "Cherry",          accent: "#ff5a5f", bg: "#190a0c", mode: "dark", group: "dark" },
  { id: "aurora",     name: "Aurora",          accent: "#2dd4bf", bg: "#071518", mode: "dark", group: "dark" },
  { id: "sapphire",   name: "Sapphire",        accent: "#4f8cff", bg: "#081023", mode: "dark", group: "dark" },
  { id: "stardust",   name: "Stardust",        accent: "#ff8fd6", bg: "#150d1b", mode: "dark", group: "dark" },
  { id: "blueprint",  name: "Blueprint",       accent: "#4aa3ff", bg: "#09121d", mode: "dark", group: "dark" },
  { id: "espresso",   name: "Espresso",        accent: "#d6a25f", bg: "#140f0a", mode: "dark", group: "dark" },
  { id: "neonnoir",   name: "Neon Noir",       accent: "#ff3bd4", bg: "#110813", mode: "dark", group: "dark" },
  { id: "deepsea",    name: "Deep Sea",        accent: "#22d3ee", bg: "#06141b", mode: "dark", group: "dark" },
  { id: "golden",     name: "Golden Hour",     accent: "#fbbf24", bg: "#181106", mode: "dark", group: "dark" },
  { id: "obsidian",   name: "Obsidian",        accent: "#e5e5ea", bg: "#050506", mode: "dark", group: "dark" },
  { id: "quiet",      name: "Quiet",           accent: "#ffffff", bg: "#000000", mode: "dark", group: "dark" },
  { id: "graphite",   name: "Graphite",        accent: "#c9a227", bg: "#101011", mode: "dark", group: "dark" },
  { id: "slate",      name: "Slate",           accent: "#8ea0b5", bg: "#0f1216", mode: "dark", group: "dark" },
  { id: "wine",       name: "Wine",            accent: "#b03a5b", bg: "#1a0a10", mode: "dark", group: "dark" },
  { id: "lime",       name: "Cyber Lime",      accent: "#a3e635", bg: "#0b1205", mode: "dark", group: "dark" }
];

// Month options: the shapes used for events and the way the month sheet paints.
var IND_STYLES = ["bars", "pills", "dots", "none"];
var MONTH_STYLES = ["cards", "frosted", "soft", "tint", "minimal"];
var MONTH_LAYOUTS = ["compact", "fullscreen", "month-list", "month-lists"];
var WD_LABELS = ["chips", "plain", "hidden"];
var WD_LETTERS = ["short", "tiny"];
var CONTROL_SIZES = ["small", "medium", "large"];
var DAY_POSITIONS = ["left", "center", "right"];
// Appearance → Day color: how a subject colour paints the day cell.
// Fill is the only style that draws a frame; the rest use fills, bars or marks.
var DAY_COLORS = ["fill", "corner", "stripe", "dot", "top", "number", "badge", "none"];

// ===== Indicator colours =====
// "Calendars" assigns a colour to each calendar (from the selected set, or the
// original palette when no set is picked). "Theme" uses the current accent and
// "Single Color" paints every calendar with one chosen colour.
var IND_MODES = ["calendars", "theme", "single"];

// Palettes shown in the Indicators sheet. Each calendar takes the next colour
// in the set, wrapping around when there are more calendars than colours.
var IND_SETS = [
  { id: "rainbow",  name: "Rainbow",      colors: ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#5e5ce6", "#bf5af2"] },
  { id: "pastel",   name: "Pastel",       colors: ["#ffb3c7", "#ffd6a5", "#fff3b0", "#caffbf", "#9bf6ff", "#bdb2ff", "#ffc6ff"] },
  { id: "jewel",    name: "Jewel",        colors: ["#a4133c", "#1d7a5a", "#2e5c8a", "#6b3fa0", "#c9a227", "#b5651d", "#d1495b"] },
  { id: "earth",    name: "Earth",        colors: ["#6b4226", "#a47551", "#c9a227", "#7a8450", "#a4b494", "#b08968", "#d9c5a0"] },
  { id: "ocean",    name: "Ocean",        colors: ["#003f5c", "#2f4b7c", "#008a9a", "#4ecdc4", "#a8e6cf"] },
  { id: "sunset",   name: "Sunset",       colors: ["#ff6b6b", "#ff9f43", "#ffd166", "#ff7eb6", "#9b5de5"] },
  { id: "candy",    name: "Candy",        colors: ["#ff9ff3", "#ffc2e2", "#a8dadc", "#cdb4db", "#fff3b0"] },
  { id: "neon",     name: "Neon",         colors: ["#39ff14", "#ff00ff", "#00ffff", "#ffff00", "#ff6600"] },
  { id: "forest",   name: "Forest",       colors: ["#1b4332", "#2d6a4f", "#40916c", "#74c69d", "#b7e4c7"] },
  { id: "berry",    name: "Berry",        colors: ["#7b1e3a", "#c9184a", "#ff758f"] },
  { id: "inkcoral", name: "Ink & Coral",  colors: ["#1d3557", "#ff6b6b"] },
  { id: "navygold", name: "Navy & Gold",  colors: ["#1d3557", "#e9c46a"] },
  { id: "plummint", name: "Plum & Mint",  colors: ["#6a4c93", "#4ecdc4"] },
  { id: "slatesky", name: "Slate & Sky",  colors: ["#5c677d", "#7fb3ff"] }
];

// Set by applyTheme so indicator colours can follow the effective accent
// (Quiet, for example, is white-on-black in dark mode).
var EFFECTIVE_ACCENT = "#0a84ff";

function accentHex() {
  return /^#[0-9a-f]{6}$/i.test(EFFECTIVE_ACCENT) ? EFFECTIVE_ACCENT : "#0a84ff";
}

function indSetById(id) {
  for (var i = 0; i < IND_SETS.length; i++) if (IND_SETS[i].id === id) return IND_SETS[i];
  var list = state.settings && Array.isArray(state.settings.indSets) ? state.settings.indSets : [];
  for (var j = 0; j < list.length; j++) if (list[j].id === id) return list[j];
  return null;
}

function indicatorColorAt(i) {
  var s = state.settings || {};
  if (s.indMode === "theme") return accentHex();
  if (s.indMode === "single") return s.indSingle || "#ff375f";
  var set = indSetById(s.indSet);
  if (set && set.colors && set.colors.length) return set.colors[i % set.colors.length];
  return PALETTE[i % PALETTE.length];
}

function themeById(id) {
  if (id === "classic") return THEMES[0];
  for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
  var c = state.settings.custom;
  for (var j = 0; j < c.length; j++) if (c[j].id === id) return c[j];
  return null;
}

function themeName() {
  var p = themeById(state.settings.preset);
  if (!p) return "Custom";
  return p.id === "classic" ? "Default" : p.name;
}

// Name shown in the gallery pill (Classic instead of the row's "Default").
function presetLabel() {
  var p = themeById(state.settings.preset);
  if (!p) return "Custom";
  return p.name;
}

function currentMode() {
  var t = state.settings.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

// Ink colour for text/icons sitting on an accent-coloured surface.
function accentInk(hex) {
  var h = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return "#fff";
  var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? "#111114" : "#fff";
}

// iOS shows the page/body background in the status-bar strip above the web
// layer. When a sheet or the composer is open the page behind it is dimmed, so
// match that strip to the dimmed colour instead of leaving a bright band.
function parseCssColor(c) {
  c = String(c || "").trim();
  if (c.charAt(0) === "#") {
    var h = c.slice(1);
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (h.length === 6 || h.length === 8) {
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
        h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
      ];
    }
  }
  var m = c.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    var p = m[1].split(",").map(function (x) { return parseFloat(x); });
    if (p.length >= 3) return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return [0, 0, 0, 0];
}

function blendCssColor(fg, bg) {
  var f = parseCssColor(fg), b = parseCssColor(bg);
  var a = f[3] + b[3] * (1 - f[3]);
  if (!a) return "#000000";
  var r = Math.round((f[0] * f[3] + b[0] * b[3] * (1 - f[3])) / a);
  var g = Math.round((f[1] * f[3] + b[1] * b[3] * (1 - f[3])) / a);
  var bl = Math.round((f[2] * f[3] + b[2] * b[3] * (1 - f[3])) / a);
  function hex(n) { return ("0" + Math.max(0, Math.min(255, n)).toString(16)).slice(-2); }
  return "#" + hex(r) + hex(g) + hex(bl);
}

function syncThemeColor() {
  var root = document.documentElement;
  var appBg = getComputedStyle(root).getPropertyValue("--app-bg").trim() || "#161616";
  var modal = document.getElementById("modal");
  var app = document.getElementById("app");
  var color = appBg;
  if (modal && modal.classList.contains("show")) {
    color = blendCssColor(getComputedStyle(modal).backgroundColor, appBg);
  } else if (app && app.classList.contains("chatting")) {
    var chat = document.getElementById("chat");
    if (chat) color = blendCssColor(getComputedStyle(chat).backgroundColor, appBg);
  } else if (app && app.classList.contains("composing")) {
    var scrim = document.getElementById("composerScrim");
    if (scrim) color = blendCssColor(getComputedStyle(scrim).backgroundColor, appBg);
  }
  // The strip above the web layer samples the page background; the meta tag
  // covers browsers that use theme-color instead. Setting both keeps the
  // status bar flush with the app in light, dark and custom themes.
  root.style.setProperty("--status-bg", color);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}

function applyTheme() {
  var root = document.documentElement;
  var s = state.settings;
  var mode = currentMode();
  var p = themeById(s.preset);
  var quiet = !!p && p.id === "quiet";
  // Quiet is black-and-white in either mode: white-on-black in dark,
  // black-on-white in light.
  var accent = quiet ? (mode === "light" ? "#111114" : "#ffffff") : s.accent;
  EFFECTIVE_ACCENT = accent;
  var appBg = quiet ? (mode === "light" ? "#ffffff" : "#000000") :
    ((p && p.mode === mode && p.bg) ? p.bg : (mode === "light" ? "#f5f5f7" : "#161616"));
  root.setAttribute("data-theme", mode);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-ink", accentInk(accent));
  root.style.setProperty("--accent-soft", accent + "24");
  root.style.setProperty("--app-bg", appBg);
  var app = document.getElementById("app");
  if (app) {
    app.setAttribute("data-ind", s.indStyle || "bars");
    app.setAttribute("data-quiet", quiet ? "1" : "0");
    app.setAttribute("data-month-style", s.monthStyle || "cards");
    app.setAttribute("data-month-layout", s.monthLayout || "compact");
    app.setAttribute("data-wdlabels", s.weekdayLabels || "chips");
    app.setAttribute("data-wdletters", s.weekdayLetters || "short");
    app.setAttribute("data-evsize", s.eventTextSize || "medium");
    app.setAttribute("data-dn-size", s.dayNumSize || "medium");
    app.setAttribute("data-dn-pos", s.dayNumPosition || "left");
    app.setAttribute("data-day-color", s.dayColor || "fill");
  }
  syncThemeColor();
  var cs = document.querySelector('meta[name="color-scheme"]');
  if (cs) cs.setAttribute("content", mode);
  if (typeof refreshAppearance === "function") refreshAppearance();
  if (typeof refreshIndicatorsSheet === "function") refreshIndicatorsSheet();
  if (typeof refreshMonthOptions === "function") refreshMonthOptions();
}

if (window.matchMedia) {
  var darkQuery = window.matchMedia("(prefers-color-scheme: light)");
  var onScheme = function () { if (state.settings.theme === "system") applyTheme(); };
  if (darkQuery.addEventListener) darkQuery.addEventListener("change", onScheme);
  else if (darkQuery.addListener) darkQuery.addListener(onScheme);
}

// Default "remind me this many minutes before" per group (see js/reminders.js)
var REMIND_DEFAULT_LEAD = { classes: 10, quiz: 1440, deadline: 4320, exam: 1440 };

var STATE_KEY = "campus";

// ===== State =====
// Kept in memory (so rendering stays synchronous), mirrored to localStorage for an
// instant first paint, and stored for real in IndexedDB by db.js.
var state = { version: 2, subjects: [], lectures: [], events: [], lang: "ar", reminders: null };

try {
  var saved = localStorage.getItem(STATE_KEY);
  if (saved) state = normalizeState(JSON.parse(saved));
} catch (e) {}
state = normalizeState(state);   // the built-in default needs normalising too
applyTheme();                    // paint the saved theme before the first render

// Keep the Safari status bar in step with sheets opening and closing.
if (window.MutationObserver) {
  var modalWatch = document.getElementById("modal");
  if (modalWatch) {
    new MutationObserver(syncThemeColor).observe(modalWatch, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }
}

// Make sure a state object loaded from disk/storage always has the shape the app expects.
function normalizeState(s) {
  if (!s || typeof s !== "object") s = {};
  if (!Array.isArray(s.subjects)) s.subjects = [];
  if (!Array.isArray(s.lectures)) s.lectures = [];
  if (!Array.isArray(s.events)) s.events = [];
  // A hand-edited or damaged backup should not crash the first render.
  s.subjects = s.subjects.filter(function (sub) { return sub && typeof sub === "object"; });
  s.lectures = s.lectures.filter(function (l) { return l && typeof l === "object"; });
  s.events = s.events.filter(function (e) { return e && typeof e === "object"; });
  if (s.lang !== "en" && s.lang !== "ar") s.lang = "ar";
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

  // appearance: paint mode, accent, preset and calendar indicator settings
  if (!s.settings || typeof s.settings !== "object") s.settings = {};
  var a = s.settings;
  if (a.theme !== "light" && a.theme !== "dark" && a.theme !== "system") a.theme = "system";
  if (typeof a.accent !== "string" || !/^#[0-9a-f]{6}$/i.test(a.accent)) a.accent = ACCENTS[0];
  if (typeof a.preset !== "string") a.preset = "classic";
  // An empty preset with the default blue accent is just Classic.
  if (a.preset === "" && a.accent.toLowerCase() === THEMES[0].accent.toLowerCase()) a.preset = "classic";
  // Older builds called the four event shapes rounded / pill / block / mosaic.
  if (a.indStyle === "rounded") a.indStyle = "bars";
  else if (a.indStyle === "pill") a.indStyle = "pills";
  else if (a.indStyle === "block") a.indStyle = "bars";
  else if (a.indStyle === "mosaic") a.indStyle = "dots";
  if (IND_STYLES.indexOf(a.indStyle) < 0) a.indStyle = "bars";

  // Month options. Defaults keep the calendar looking like it did before these
  // controls existed: cards, compact, chips, short labels, bars, medium text.
  if (MONTH_STYLES.indexOf(a.monthStyle) < 0) a.monthStyle = "cards";
  if (MONTH_LAYOUTS.indexOf(a.monthLayout) < 0) a.monthLayout = "compact";
  if (WD_LABELS.indexOf(a.weekdayLabels) < 0) a.weekdayLabels = "chips";
  if (WD_LETTERS.indexOf(a.weekdayLetters) < 0) a.weekdayLetters = "short";
  if (CONTROL_SIZES.indexOf(a.eventTextSize) < 0) a.eventTextSize = "medium";
  if (CONTROL_SIZES.indexOf(a.dayNumSize) < 0) a.dayNumSize = "medium";
  if (DAY_POSITIONS.indexOf(a.dayNumPosition) < 0) a.dayNumPosition = "left";
  if (DAY_COLORS.indexOf(a.dayColor) < 0) a.dayColor = "fill";
  if (typeof a.calendarFilters !== "boolean") a.calendarFilters = true;
  // Drop the photo-memory toggles from older saved states; the section was removed.
  delete a.photosOnDays;
  delete a.photoShow;
  // The day-shape experiment was replaced by the Day color picker, and the
  // old frame toggle is now part of the Fill style.
  delete a.dayShape;
  delete a.dayFrame;
  if (!Array.isArray(a.hidden)) a.hidden = [];
  if (!Array.isArray(a.custom)) a.custom = [];
  a.custom = a.custom.filter(function (c) {
    return c && typeof c.id === "string" && typeof c.name === "string" &&
      typeof c.accent === "string" && /^#[0-9a-f]{6}$/i.test(c.accent);
  });

  // indicator colour mode: per-calendar set, the theme accent, or one colour
  if (IND_MODES.indexOf(a.indMode) < 0) a.indMode = "calendars";
  if (typeof a.indSet !== "string") a.indSet = "";
  if (typeof a.indSingle !== "string" || !/^#[0-9a-f]{6}$/i.test(a.indSingle)) a.indSingle = "#ff375f";
  a.indSingle = a.indSingle.toLowerCase();
  if (!Array.isArray(a.indSets)) a.indSets = [];
  a.indSets = a.indSets.filter(function (c) {
    return c && typeof c.id === "string" && typeof c.name === "string" && Array.isArray(c.colors);
  }).map(function (c) {
    c.name = String(c.name).slice(0, 18);
    c.colors = c.colors.filter(function (col) {
      return typeof col === "string" && /^#[0-9a-f]{6}$/i.test(col);
    }).map(function (col) { return col.toLowerCase(); }).slice(0, 12);
    return c;
  }).filter(function (c) { return c.colors.length > 0; });
  var knownSet = a.indSet === "";
  if (!knownSet) {
    for (var si = 0; si < IND_SETS.length && !knownSet; si++) if (IND_SETS[si].id === a.indSet) knownSet = true;
    for (var sj = 0; sj < a.indSets.length && !knownSet; sj++) if (a.indSets[sj].id === a.indSet) knownSet = true;
  }
  if (!knownSet) a.indSet = "";

  // Day view: list / notes, plus an optional note for each day.
  if (a.dayView !== "list" && a.dayView !== "notes") a.dayView = "list";
  if (!a.dayNotes || typeof a.dayNotes !== "object") a.dayNotes = {};

  // Day filters: the calendars (subjects) and lists focused in the day view.
  // A fresh state starts with the Reminders list selected. A cleared filter is
  // stored as an empty list, so only add the default when the object is absent.
  if (!a.dayFilters || typeof a.dayFilters !== "object") {
    a.dayFilters = { calendars: [], lists: ["reminders"] };
  }
  if (!Array.isArray(a.dayFilters.calendars)) a.dayFilters.calendars = [];
  if (!Array.isArray(a.dayFilters.lists)) a.dayFilters.lists = ["reminders"];
  var knownCalendars = {};
  s.subjects.forEach(function (sub) { knownCalendars[sub.id] = true; });
  a.hidden = a.hidden.filter(function (id) {
    return typeof id === "string" && knownCalendars[id];
  });
  a.dayFilters.calendars = a.dayFilters.calendars.filter(function (id) {
    return typeof id === "string" && knownCalendars[id];
  });
  a.dayFilters.lists = a.dayFilters.lists.filter(function (id) {
    return typeof id === "string";
  });

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
    if (stored) { state = normalizeState(stored); return true; }
    idbPut("kv", state, STATE_KEY).catch(function () {}); // first run: migrate localStorage copy
    return false;
  }).catch(function () { return false; });
}

var today = new Date();
var view = new Date(today.getFullYear(), today.getMonth(), 1);
var tab = "cal";
var openId = null;
var filterId = null;

// The app can stay open (or installed) across midnight. Move "today" and the
// current-month view forward instead of keeping yesterday's date until reload.
function refreshToday() {
  var now = new Date();
  if (iso(now) === iso(today)) return false;
  var wasToday = typeof dayOpen !== "undefined" && !!dayOpen && iso(dayOpen) === iso(today);
  var wasCurrentMonth = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();
  today = now;
  if (wasCurrentMonth) view = new Date(now.getFullYear(), now.getMonth(), 1);
  if (wasToday) dayOpen = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return true;
}

function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
var toastTimer = null;
function toast(msg) {
  var t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.className = ""; }, 2500);
}
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
  for (var i = 0; i < state.subjects.length; i++) if (state.subjects[i].id === id) return indicatorColorAt(i);
  // Unknown calendars still follow the global Theme / Single Color choice.
  if (state.settings && state.settings.indMode === "theme") return accentHex();
  if (state.settings && state.settings.indMode === "single") return state.settings.indSingle || "#ff375f";
  return "#888";
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
function swallowClicks(ms, after) {
  // After a completed hold the pointer release still produces a click - swallow it
  // so the row underneath (open the folder, delete again) never sees it.
  var h = function (e) { e.stopPropagation(); e.preventDefault(); };
  document.addEventListener("click", h, true);
  setTimeout(function () {
    document.removeEventListener("click", h, true);
    if (after) after();
  }, ms || 500);
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
    // Keep the click from the release swallowed, then allow a future hold.
    swallowClicks(500, function () { confirmed = false; });
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
