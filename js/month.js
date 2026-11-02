// ===== Month Options =====
// The Month Options sheet: colour-neutral settings that control how the month
// grid itself is painted and how much information each day cell carries.

var MO_STYLE_LABELS = {
  cards: "Cards",
  frosted: "Frosted",
  soft: "Soft",
  tint: "Tint",
  minimal: "Minimal"
};

function moStyleCard(id) {
  var on = state.settings.monthStyle === id;
  return '<button class="mo-style ' + id + (on ? " on" : "") + '" data-ms="' + id + '" aria-pressed="' + on + '">' +
    '<span class="mo-prev">' +
      '<span class="mo-mini"><i></i><i></i><i></i><i></i></span>' +
    '</span>' +
    '<span class="mo-name">' + MO_STYLE_LABELS[id] + "</span>" +
  "</button>";
}

function moLayoutCard(id, label) {
  var on = state.settings.monthLayout === id;
  var isList = id === "month-list" || id === "month-lists";
  var cells = "";
  var events = [3, 9, 16, 23, 30];
  for (var i = 0; i < 35; i++) {
    var cls = [];
    if (i < 2 || i > 32) cls.push("dim");
    if (events.indexOf(i) >= 0) cls.push("e");
    cells += '<i' + (cls.length ? ' class="' + cls.join(" ") + '"' : "") + "></i>";
  }
  var week = "";
  for (var w = 0; w < 7; w++) week += "<i></i>";
  var tail;
  if (isList) {
    var groups = id === "month-lists" ? 2 : 1;
    var rows = id === "month-lists" ? 2 : 4;
    tail = '<span class="mo-phone-list" aria-hidden="true">';
    for (var g = 0; g < groups; g++) {
      if (g) tail += '<span class="mo-list-sep"></span>';
      tail += '<span class="mo-list-group"><span class="mo-list-head"></span>';
      for (var r = 0; r < rows; r++) tail += '<span class="mo-list-row"><i></i><b></b></span>';
      tail += "</span>";
    }
    tail += "</span>";
  } else {
    tail = '<span class="mo-phone-chips" aria-hidden="true"><i></i><i></i><i></i></span>';
  }
  return '<button class="mo-layout ' + id + (on ? " on" : "") + '" data-ml="' + id + '"' +
    ' aria-pressed="' + on + '">' +
    '<span class="mo-phone" aria-hidden="true">' +
      '<span class="mo-phone-head"><span class="mo-phone-title"></span><span class="mo-phone-dot"></span></span>' +
      '<span class="mo-phone-week">' + week + "</span>" +
      '<span class="mo-phone-grid">' + cells + "</span>" +
      tail +
    "</span>" +
    '<span class="mo-name">' + label + "</span>" +
  "</button>";
}

function moSeg(key, options, cls) {
  var out = '<div class="mo-seg ' + (cls || "") + '" role="group">';
  options.forEach(function (o) {
    var on = state.settings[key] === o[0];
    out += '<button class="' + (on ? "on" : "") + '" data-mo-seg="' + key + '" data-mo-val="' + o[0] + '" aria-pressed="' + on + '">' + o[1] + "</button>";
  });
  return out + "</div>";
}

function moToggleRow(key, label) {
  var on = !!state.settings[key];
  return '<div class="mo-row">' +
    '<span class="mo-label">' + label + "</span>" +
    '<button class="sw' + (on ? " on" : "") + '" data-mo-toggle="' + key + '" role="switch" aria-checked="' + on + '" aria-label="' + label + '"></button>' +
  "</div>";
}

function monthOptionsPage() {
  return setHead("Month Options", "main") +
    '<div class="mo">' +
      '<div class="mo-sec">' +
        "<h3>Style</h3>" +
        '<div class="mo-styles">' +
          MONTH_STYLES.map(moStyleCard).join("") +
        "</div>" +
      "</div>" +

      '<div class="mo-sec">' +
        "<h3>Layout</h3>" +
        '<div class="mo-layouts">' +
          moLayoutCard("compact", "Compact") +
          moLayoutCard("fullscreen", "Fullscreen") +
          moLayoutCard("month-list", "Month + List") +
          moLayoutCard("month-lists", "Month + Lists") +
        "</div>" +
      "</div>" +

      '<div class="mo-sec">' +
        "<h3>Weekday labels</h3>" +
        moSeg("weekdayLabels", [["chips", "Chips"], ["plain", "Plain"], ["hidden", "Hidden"]]) +
        '<h4 class="mo-sub">Letters</h4>' +
        moSeg("weekdayLetters", [["short", "Short (MON)"], ["tiny", "Tiny (M)"]], "two") +
      "</div>" +

      '<div class="mo-sec">' +
        "<h3>Events</h3>" +
        moSeg("indStyle", [["bars", "Bars"], ["pills", "Pills"], ["dots", "Dots"], ["none", "None"]], "four") +
        '<h4 class="mo-sub">Text size</h4>' +
        moSeg("eventTextSize", [["small", "Small"], ["medium", "Medium"], ["large", "Large"]]) +
      "</div>" +

      '<div class="mo-sec">' +
        "<h3>Day numbers</h3>" +
        '<h4 class="mo-sub">Size</h4>' +
        moSeg("dayNumSize", [["small", "Small"], ["medium", "Medium"], ["large", "Large"]]) +
        '<h4 class="mo-sub">Position</h4>' +
        moSeg("dayNumPosition", [["left", "Left"], ["center", "Centered"], ["right", "Right"]]) +
      "</div>" +

      '<div class="mo-sec">' +
        "<h3>General</h3>" +
        moToggleRow("calendarFilters", "Calendar Filters") +
      "</div>" +
    "</div>";
}

// Settings whose value is baked into the calendar's markup rather than exposed
// as a CSS variable. Everything else here is just a data attribute on #app, so
// applyTheme alone repaints it with no rebuild.
var MO_BAKED_IN_MARKUP = { weekdayLabels: 1, weekdayLetters: 1, calendarFilters: 1 };

function bindMonthOptions(box) {
  if (!box) return;

  box.querySelectorAll("[data-ms]").forEach(function (b) {
    b.onclick = function () {
      var k = b.getAttribute("data-ms");
      if (state.settings.monthStyle === k) return;
      state.settings.monthStyle = k;
      save(); applyTheme();
    };
  });

  box.querySelectorAll("[data-ml]").forEach(function (b) {
    b.onclick = function () {
      var k = b.getAttribute("data-ml");
      if (state.settings.monthLayout === k) return;
      state.settings.monthLayout = k;
      save(); applyTheme();
      requestRender();   // the layout changes the calendar's structure
    };
  });

  box.querySelectorAll("[data-mo-seg]").forEach(function (b) {
    b.onclick = function () {
      var key = b.getAttribute("data-mo-seg");
      var val = b.getAttribute("data-mo-val");
      if (state.settings[key] === val) return;
      state.settings[key] = val;
      save(); applyTheme();
      if (MO_BAKED_IN_MARKUP[key]) requestRender();
    };
  });

  box.querySelectorAll("[data-mo-toggle]").forEach(function (b) {
    b.onclick = function () {
      var key = b.getAttribute("data-mo-toggle");
      state.settings[key] = !state.settings[key];
      // A hidden filter bar must never leave an invisible filter applied.
      if (key === "calendarFilters" && !state.settings.calendarFilters) filterId = null;
      save(); applyTheme();
      if (MO_BAKED_IN_MARKUP[key]) requestRender();
    };
  });
}

// Called by applyTheme so an open Month Options sheet immediately reflects a
// value changed by the Appearance row (the two share the event-style setting).
function refreshMonthOptions(box) {
  box = box || document.getElementById("box");
  if (!box || box.getAttribute("data-page") !== "month") return;
  var s = state.settings;

  box.querySelectorAll("[data-ms]").forEach(function (b) {
    var on = b.getAttribute("data-ms") === s.monthStyle;
    b.className = "mo-style " + b.getAttribute("data-ms") + (on ? " on" : "");
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });

  box.querySelectorAll("[data-ml]").forEach(function (b) {
    var on = b.getAttribute("data-ml") === s.monthLayout;
    b.className = "mo-layout " + b.getAttribute("data-ml") + (on ? " on" : "");
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });

  box.querySelectorAll("[data-mo-seg]").forEach(function (b) {
    var on = s[b.getAttribute("data-mo-seg")] === b.getAttribute("data-mo-val");
    b.className = on ? "on" : "";
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });

  box.querySelectorAll("[data-mo-toggle]").forEach(function (b) {
    var on = !!s[b.getAttribute("data-mo-toggle")];
    b.className = "sw" + (on ? " on" : "");
    b.setAttribute("aria-checked", on ? "true" : "false");
  });
}
