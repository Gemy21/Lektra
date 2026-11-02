// ===== Appearance =====
// Painted from the settings sheet: app theme, accent, theme presets, the
// colour treatment for day cells, and the shapes used for calendar indicators.
// Saved in state.settings.

var A_ICON = {
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.4"/><path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.4 14.3A8.7 8.7 0 0 1 9.7 3.6a8.8 8.8 0 1 0 10.7 10.7z"/></svg>',
  system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="7" y="2.4" width="10" height="19.2" rx="2.8"/><path d="M10.6 18.6h2.8"/></svg>',
  themes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="currentColor" stroke="none"/></svg>',
  pie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><path d="M12 3.6v8.4h8.4"/><path d="M12 12l-5.4 5.4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
};

var IND_CLASS = { bars: "bars", pills: "pills", dots: "dots", none: "none" };
var IND_LABEL = { bars: "Bars", pills: "Pills", dots: "Dots", none: "None" };
var DAY_COLOR_LABEL = {
  fill: "Fill", corner: "Corner", stripe: "Stripe", dot: "Dot",
  top: "Top", number: "Number", badge: "Badge", none: "None"
};

function dayColorCard(k) {
  var on = state.settings.dayColor === k;
  return '<button class="dcolor ' + k + (on ? " on" : "") + '" data-day-color="' + k + '"' +
    ' aria-label="' + DAY_COLOR_LABEL[k] + ' day color" aria-pressed="' + on + '">' +
    '<span class="dcolor-prev" aria-hidden="true"><span class="dcolor-cell"><b>8</b><i></i></span></span>' +
    '<span class="dcolor-name">' + DAY_COLOR_LABEL[k] + "</span>" +
  "</button>";
}

// A striped preview for a palette. Hard colour stops keep every colour an
// equal-width band, matching the little swatches in the Indicators sheet.
function setPreview(colors) {
  var list = (colors && colors.length) ? colors : ["#5e5ce6", "#64d2ff", "#bf5af2", "#ff375f"];
  var n = list.length;
  var stops = list.map(function (c, i) {
    var a = (i * 100 / n).toFixed(2), b = ((i + 1) * 100 / n).toFixed(2);
    return c + " " + a + "% " + b + "%";
  }).join(",");
  return "linear-gradient(90deg," + stops + ")";
}

function indModeLabel() {
  var m = state.settings.indMode;
  return m === "theme" ? "Theme" : m === "single" ? "Single Color" : "Calendars";
}

function indModeDot() {
  var s = state.settings;
  if (s.indMode === "theme") return accentHex();
  if (s.indMode === "single") return s.indSingle || "#ff375f";
  var set = indSetById(s.indSet);
  return set ? setPreview(set.colors.slice(0, 4)) : "linear-gradient(135deg,#5e5ce6,#64d2ff,#bf5af2,#ff375f)";
}

function indCalRows() {
  var hidden = state.settings.hidden;
  var allOn = state.subjects.every(function (s) { return hidden.indexOf(s.id) < 0; });
  function sw(id, on, label) {
    return '<button class="sw' + (on ? " on" : "") + '" data-cal="' + id + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(label) + '"></button>';
  }
  var rows = '<div class="calrow"><span class="cdot all"><i></i></span><span class="cn">All calendars</span>' + sw("*", allOn, "All calendars") + "</div>";
  state.subjects.forEach(function (s) {
    var on = hidden.indexOf(s.id) < 0;
    rows += '<div class="calrow"><span class="ddot" style="background:' + colorOf(s.id) + '"></span><span class="cn">' + esc(s.name) + "</span>" + sw(s.id, on, s.name) + "</div>";
  });
  return rows;
}

function appearancePage() {
  var s = state.settings;
  var modes = [["light", "Light"], ["dark", "Dark"], ["system", "System"]].map(function (m) {
    var on = s.theme === m[0];
    return '<button data-mode="' + m[0] + '" class="' + (on ? "on" : "") + '" aria-pressed="' + on + '">' +
      A_ICON[m[0]] + "<span>" + m[1] + "</span></button>";
  }).join("");

  var accs = ACCENTS.map(function (c) {
    var on = s.accent.toLowerCase() === c.toLowerCase();
    return '<button class="acc' + (on ? " on" : "") + '" data-acc="' + c + '" aria-label="Accent colour ' + c + '">' +
      '<i style="background:' + c + '"></i>' +
    "</button>";
  }).join("");

  var inds = IND_STYLES.map(function (k) {
    var on = s.indStyle === k;
    return '<button class="ind ' + IND_CLASS[k] + (on ? " on" : "") + '" data-ind="' + k + '" aria-label="' + IND_LABEL[k] + ' indicators" aria-pressed="' + on + '"><i></i></button>';
  }).join("");
  var dayColors = DAY_COLORS.map(dayColorCard).join("");

  return setHead("Appearance", "main") +
    '<div class="sect">' +
      "<h3>App theme</h3>" +
      "<p>The app's own paint — backgrounds, buttons and accents.</p>" +
      '<div class="seg" role="group" aria-label="App theme">' + modes + "</div>" +
      '<div class="accs" role="group" aria-label="Accent colour">' + accs + "</div>" +
      '<button class="trow" id="themesRow">' +
        '<span class="tic themes">' + A_ICON.themes + "</span>" +
        '<span class="tt"><b>Themes</b><span id="themesSub">' + esc(themeName()) + "</span></span>" +
        SET_ICON.chev +
      "</button>" +
    "</div>" +
    '<div class="sect">' +
      "<h3>Day color</h3>" +
      "<p>Choose how event colours paint the day itself. Only Fill draws a frame.</p>" +
      '<div class="day-colors" role="group" aria-label="Day color">' + dayColors + "</div>" +
    "</div>" +
    '<div class="sect">' +
      "<h3>Calendar indicators</h3>" +
      "<p>How events appear inside the cells of your month calendar.</p>" +
      '<div class="inds" role="group" aria-label="Calendar indicators">' + inds + "</div>" +
      '<button class="trow" id="indRow">' +
        '<span class="tic indicators">' + A_ICON.pie + "</span>" +
        '<span class="tt"><b>Indicators</b></span>' +
        '<span class="curval" id="indPill"><i id="indPillDot" style="background:' + indModeDot() + '"></i><span id="indPillText">' + esc(indModeLabel()) + "</span></span>" +
        SET_ICON.chev +
      "</button>" +
    "</div>";
}

// ===== Indicators sheet (stacked on top of Appearance) =====
var indSetDraft = null;

function indModeCard(id, label, bg, on) {
  return '<button class="imode' + (on ? " on" : "") + '" data-imode="' + id + '" aria-pressed="' + on + '">' +
    '<span class="iswatch" style="background:' + bg + '">' +
      (on ? '<u class="icheck">' + A_ICON.check + "</u>" : "") +
    "</span>" +
    '<span class="ilabel">' + esc(label) + "</span>" +
  "</button>";
}

function indSetCard(set, custom) {
  var on = state.settings.indMode === "calendars" && state.settings.indSet === set.id;
  return '<button class="iset' + (on ? " on" : "") + '" data-iset="' + esc(set.id) + '" aria-pressed="' + on + '">' +
    '<span class="iprev" style="background:' + setPreview(set.colors) + '">' +
      (on ? '<u class="icheck">' + A_ICON.check + "</u>" : "") +
    "</span>" +
    '<span class="iname">' + esc(set.name) + "</span>" +
    (custom ? '<span class="idel" data-del-set="' + esc(set.id) + '" aria-label="Delete set">×</span>' : "") +
  "</button>";
}

function indSetEditorHTML() {
  var d = indSetDraft;
  var colors = d.colors.map(function (c, i) {
    return '<label class="iecolor" style="background:' + c + '">' +
      '<input type="color" data-set-color="' + i + '" value="' + c + '" aria-label="Set colour ' + (i + 1) + '">' +
    "</label>";
  }).join("");
  return '<div class="iset-edit" id="isetEdit">' +
    '<input class="iset-name" id="isetName" placeholder="Set name" maxlength="18" value="' + esc(d.name) + '" autocomplete="off">' +
    '<div class="iecolors">' + colors + "</div>" +
    '<div class="iepreview" style="background:' + setPreview(d.colors) + '"></div>' +
    '<div class="iefoot"><button class="iecancel" id="isetCancel">Cancel</button><button class="ieadd" id="isetAdd">Add set</button></div>' +
  "</div>";
}

function renderIndicatorsSheet(ov) {
  var st = ov.scrollTop || 0;
  var s = state.settings;
  var set = indSetById(s.indSet);
  var calPreview = set ? setPreview(set.colors.slice(0, 4)) :
    "linear-gradient(90deg,#5e5ce6 0% 25%,#64d2ff 25% 50%,#bf5af2 50% 75%,#ff375f 75% 100%)";
  var modes = indModeCard("calendars", "Calendars", calPreview, s.indMode === "calendars") +
    indModeCard("theme", "Theme", accentHex(), s.indMode === "theme") +
    indModeCard("single", "Single Color", s.indSingle || "#ff375f", s.indMode === "single");

  var singleColors = ACCENTS.slice();
  if (singleColors.indexOf(s.indSingle.toLowerCase()) < 0) singleColors.push(s.indSingle);
  var singleRow = s.indMode === "single" ? '<div class="isingle">' +
    '<span class="isingle-label">Single colour</span><div class="isingle-dots">' +
    singleColors.map(function (c) {
      var on = c.toLowerCase() === (s.indSingle || "").toLowerCase();
      return '<button class="acc' + (on ? " on" : "") + '" data-single="' + esc(c) + '" aria-label="Single colour ' + esc(c) + '">' +
        '<i style="background:' + esc(c) + '"></i></button>';
    }).join("") +
    '</div></div><div class="ihint">Tap a colour to use it on every calendar.</div>' : "";

  var customCards = s.indSets.map(function (c) { return indSetCard(c, true); }).join("");
  var yours = customCards +
    '<button class="iset new" data-new-set><span class="iprev">' + A_ICON.plus + '</span><span class="iname">New Set</span></button>';
  var sets = IND_SETS.map(function (c) { return indSetCard(c, false); }).join("");

  ov.innerHTML = '<div class="handle"></div>' +
    '<div class="ovhead"><button class="sback plain" data-set="back" data-back="appearance" aria-label="Back">' + SET_ICON.back + "</button>" +
    '<h2>Indicators</h2><span class="curpill"><i style="background:' + indModeDot() + '"></i>' + esc(indModeLabel()) + "</span></div>" +
    '<div class="tsec">Modes</div><div class="imodes">' + modes + "</div>" + singleRow +
    '<div class="tsec">Yours</div><div class="isets">' + yours + "</div>" +
    (indSetDraft ? indSetEditorHTML() : "") +
    '<div class="tsec">Sets</div><div class="isets">' + sets + "</div>" +
    '<div class="tsec">Calendars</div><p class="inote">Choose which calendars show their dots, pills and blocks on the month grid.</p>' +
    '<div class="callist">' + indCalRows() + "</div>" +
    (state.subjects.length ? "" : '<div class="muted" style="margin-top:3cqw">Add a subject to give it its own indicator colour.</div>') +
    '<div class="tnote">Indicators colour the day tint, frame and calendar entries. Tap a selected set again to use the default colours.</div>';

  ov.scrollTop = st;
  bindIndicatorsSheet(ov);
}

function bindIndicatorsSheet(ov) {
  var back = ov.querySelector('[data-set="back"]');
  if (back) back.onclick = function () { dismissIndicators(); };

  ov.querySelectorAll("[data-imode]").forEach(function (b) {
    b.onclick = function () {
      var id = b.getAttribute("data-imode");
      if (state.settings.indMode === id) return;
      state.settings.indMode = id;
      indSetDraft = null;
      save(); requestRender(); renderIndicatorsSheet(ov); refreshAppearance();
    };
  });

  ov.querySelectorAll("[data-iset]").forEach(function (b) {
    b.onclick = function (e) {
      if (e.target.closest && e.target.closest("[data-del-set]")) return;
      var id = b.getAttribute("data-iset");
      var already = state.settings.indMode === "calendars" && state.settings.indSet === id;
      state.settings.indMode = "calendars";
      // Tapping the selected set again clears it, restoring the original
      // per-calendar palette.
      state.settings.indSet = already ? "" : id;
      indSetDraft = null;
      save(); requestRender(); renderIndicatorsSheet(ov); refreshAppearance();
    };
  });

  ov.querySelectorAll("[data-del-set]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      var id = b.getAttribute("data-del-set");
      var set = indSetById(id);
      if (!set || !confirm("Delete “" + set.name + "”?")) return;
      state.settings.indSets = state.settings.indSets.filter(function (c) { return c.id !== id; });
      if (state.settings.indSet === id) state.settings.indSet = "";
      save(); requestRender(); renderIndicatorsSheet(ov); refreshAppearance();
    };
  });

  var nt = ov.querySelector("[data-new-set]");
  if (nt) nt.onclick = function () {
    var base = indSetById(state.settings.indSet);
    var colors = (base ? base.colors : PALETTE).slice(0, 6);
    while (colors.length < 6) colors.push(PALETTE[colors.length % PALETTE.length]);
    indSetDraft = { name: "", colors: colors };
    renderIndicatorsSheet(ov);
    var inp = ov.querySelector("#isetName");
    if (inp) inp.focus();
  };

  if (indSetDraft) {
    var name = ov.querySelector("#isetName");
    if (name) name.oninput = function () { if (indSetDraft) indSetDraft.name = this.value; };
    ov.querySelectorAll("[data-set-color]").forEach(function (inp) {
      inp.oninput = function () {
        if (!indSetDraft) return;
        var i = +inp.getAttribute("data-set-color");
        if (!(i >= 0 && i < indSetDraft.colors.length)) return;
        indSetDraft.colors[i] = inp.value;
        var lab = inp.closest(".iecolor");
        if (lab) lab.style.background = inp.value;
        var prev = ov.querySelector(".iepreview");
        if (prev) prev.style.background = setPreview(indSetDraft.colors);
      };
    });
    var cancel = ov.querySelector("#isetCancel");
    if (cancel) cancel.onclick = function () { indSetDraft = null; renderIndicatorsSheet(ov); };
    var add = ov.querySelector("#isetAdd");
    if (add) add.onclick = function () {
      if (!indSetDraft) return;
      var cols = indSetDraft.colors.filter(function (c) { return /^#[0-9a-f]{6}$/i.test(c); });
      if (!cols.length) return;
      var id = "s" + uid();
      var nm = (indSetDraft.name || "").trim().slice(0, 18) || "My Set";
      state.settings.indSets.push({ id: id, name: nm, colors: cols.slice(0, 12) });
      state.settings.indMode = "calendars";
      state.settings.indSet = id;
      indSetDraft = null;
      save(); requestRender(); renderIndicatorsSheet(ov); refreshAppearance();
      toast("Set added");
    };
  }

  ov.querySelectorAll("[data-single]").forEach(function (b) {
    b.onclick = function () {
      var c = b.getAttribute("data-single");
      if (state.settings.indSingle.toLowerCase() === c.toLowerCase()) return;
      state.settings.indSingle = c;
      state.settings.indMode = "single";
      save(); requestRender(); renderIndicatorsSheet(ov); refreshAppearance();
    };
  });

  ov.querySelectorAll("[data-cal]").forEach(function (b) {
    b.onclick = function () {
      var id = b.getAttribute("data-cal");
      if (id === "*") {
        var allOn = state.subjects.every(function (s) { return state.settings.hidden.indexOf(s.id) < 0; });
        state.settings.hidden = allOn ? state.subjects.map(function (s) { return s.id; }) : [];
      } else {
        var i = state.settings.hidden.indexOf(id);
        if (i >= 0) state.settings.hidden.splice(i, 1);
        else state.settings.hidden.push(id);
      }
      save(); requestRender(); renderIndicatorsSheet(ov); refreshAppearance();
    };
  });
}

function refreshIndicatorsSheet() {
  var ov = document.getElementById("indsSheet");
  if (ov && !ov._closing) renderIndicatorsSheet(ov);
}

function openIndicatorsSheet() {
  var m = document.getElementById("modal");
  m.className = "show";
  if (typeof removeThemesSheet === "function") removeThemesSheet();
  removeIndicatorsSheet();
  indSetDraft = null;

  var scrim = document.createElement("div");
  scrim.className = "sheet-scrim inds-scrim";
  scrim.onclick = dismissIndicators;

  var ov = document.createElement("div");
  ov.className = "box overlay indsheet";
  ov.id = "indsSheet";
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-label", "Indicators");

  m.appendChild(scrim);
  m.appendChild(ov);
  resetDrag(ov);
  renderIndicatorsSheet(ov);
  bindOverlayDrag(ov, dismissIndicators);
  m.onclick = function (e) { if (e.target === this) dismissIndicators(); };
  ov.scrollTop = 0;
}

function dismissIndicators() {
  var m = document.getElementById("modal");
  var ov = m.querySelector("#indsSheet");
  if (!ov || ov._closing) return;
  ov._closing = true;
  ov.style.transition = "transform .22s cubic-bezier(.2,.9,.25,1)";
  ov.style.transform = "translateY(110%)";
  var scrim = m.querySelector(".inds-scrim");
  if (scrim) { scrim.style.transition = "opacity .18s"; scrim.style.opacity = "0"; }
  setTimeout(function () {
    if (m.querySelector("#indsSheet") !== ov) return;   // a newer sheet is open
    removeIndicatorsSheet();
    m.onclick = function (e) { if (e.target === this) closeModal(); };
    refreshAppearance();
  }, 200);
}

function removeIndicatorsSheet() {
  var m = document.getElementById("modal");
  var ov = m.querySelector("#indsSheet");
  if (ov) ov.remove();
  var scrim = m.querySelector(".inds-scrim");
  if (scrim) scrim.remove();
  indSetDraft = null;
}

function bindAppearancePage(page, box) {
  if (page === "appearance") {
    box.querySelectorAll("[data-mode]").forEach(function (b) {
      b.onclick = function () {
        var m = b.getAttribute("data-mode");
        if (state.settings.theme === m) return;
        state.settings.theme = m;
        save(); applyTheme(); requestRender();
      };
    });
    box.querySelectorAll("[data-acc]").forEach(function (b) {
      b.onclick = function () {
        var c = b.getAttribute("data-acc");
        if (state.settings.accent.toLowerCase() === c.toLowerCase()) return;
        state.settings.accent = c;
        var p = themeById(state.settings.preset);
        if (p && p.accent.toLowerCase() === c.toLowerCase()) {
          // keep the matching preset
        } else if (c.toLowerCase() === THEMES[0].accent.toLowerCase()) {
          state.settings.preset = "classic";
        } else {
          state.settings.preset = "";
        }
        save(); applyTheme(); requestRender();
      };
    });
    box.querySelectorAll("[data-ind]").forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-ind");
        if (state.settings.indStyle === k) return;
        state.settings.indStyle = k;
        save(); applyTheme(); requestRender();
      };
    });
    box.querySelectorAll("[data-day-color]").forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-day-color");
        if (state.settings.dayColor === k) return;
        state.settings.dayColor = k;
        save(); applyTheme(); requestRender();
      };
    });
    var themesRow = box.querySelector("#themesRow");
    if (themesRow) themesRow.onclick = openThemesSheet;
    var indRow = box.querySelector("#indRow");
    if (indRow) indRow.onclick = openIndicatorsSheet;
    return;
  }
}

// Keep the open Appearance page in sync when the paint changes from anywhere
// (segmented control, accent dots, theme gallery, or the system switching).
function refreshAppearance() {
  var box = document.getElementById("box");
  if (!box || box.getAttribute("data-page") !== "appearance") return;
  box.querySelectorAll("[data-mode]").forEach(function (b) {
    var on = b.getAttribute("data-mode") === state.settings.theme;
    b.className = on ? "on" : "";
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  box.querySelectorAll("[data-acc]").forEach(function (b) {
    var on = b.getAttribute("data-acc").toLowerCase() === state.settings.accent.toLowerCase();
    b.className = "acc" + (on ? " on" : "");
  });
  box.querySelectorAll("[data-ind]").forEach(function (b) {
    var on = b.getAttribute("data-ind") === state.settings.indStyle;
    b.className = "ind " + IND_CLASS[b.getAttribute("data-ind")] + (on ? " on" : "");
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  box.querySelectorAll("[data-day-color]").forEach(function (b) {
    var key = b.getAttribute("data-day-color");
    var on = key === state.settings.dayColor;
    b.className = "dcolor " + key + (on ? " on" : "");
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  var sub = box.querySelector("#themesSub");
  if (sub) sub.textContent = themeName();
  var indPillText = box.querySelector("#indPillText");
  if (indPillText) indPillText.textContent = indModeLabel();
  var indPillDot = box.querySelector("#indPillDot");
  if (indPillDot) indPillDot.style.background = indModeDot();
}

// ===== Theme gallery (sheet on top of the Appearance sheet) =====
var themeDraft = null;

function previewDark(p) { return p.id === "classic" || p.mode === "dark"; }

function themeCard(p) {
  var on = state.settings.preset === p.id;
  var bg = p.bg || (previewDark(p) ? "#141416" : "#ffffff");
  var ink = accentInk(p.accent);
  return '<button class="tcard' + (previewDark(p) ? " dk" : "") + (on ? " on" : "") + '" data-theme="' + esc(p.id) + '" aria-pressed="' + on + '">' +
    '<span class="tprev" style="background:' + bg + (on ? ";border-color:" + p.accent : "") + '">' +
      (on ? '<u style="background:' + p.accent + ';color:' + ink + '">' + A_ICON.check + "</u>" : "") +
      '<b></b><b></b><i style="background:' + p.accent + '"></i>' +
    "</span>" +
    '<span class="tname">' + esc(p.name) + "</span>" +
    (p.isCustom ? '<span class="tdel" data-del-theme="' + esc(p.id) + '" aria-label="Delete theme">×</span>' : "") +
  "</button>";
}

function themeEditorHTML() {
  var dots = ACCENTS.map(function (c) {
    var on = themeDraft.accent.toLowerCase() === c.toLowerCase();
    return '<button class="acc' + (on ? " on" : "") + '" data-new-acc="' + c + '" aria-label="Accent ' + c + '"><i style="background:' + c + '"></i></button>';
  }).join("");
  return '<div class="tnew" id="tnew">' +
    '<input id="tnewName" placeholder="Theme name" maxlength="18" value="' + esc(themeDraft.name) + '" autocomplete="off">' +
    '<div class="accs taccs">' + dots + "</div>" +
    '<div class="tnewfoot"><button class="tnewcancel" id="tnewCancel">Cancel</button><button class="tnewadd" id="tnewAdd">Add theme</button></div>' +
  "</div>";
}

function renderThemesSheet(ov) {
  var st = ov.scrollTop || 0;
  var custom = state.settings.custom.map(function (c) {
    return themeCard({ id: c.id, name: c.name, accent: c.accent, bg: c.bg, mode: c.mode, isCustom: true });
  }).join("");
  var yours = themeCard(THEMES[0]) + custom +
    '<button class="tcard new" data-new-theme><span class="tprev">' + A_ICON.plus + '</span><span class="tname">New Theme</span></button>';
  var light = THEMES.filter(function (p) { return p.group === "light"; }).map(themeCard).join("");
  var dark = THEMES.filter(function (p) { return p.group === "dark"; }).map(themeCard).join("");

  ov.innerHTML = '<div class="handle"></div>' +
    '<div class="ovhead"><button class="sback plain" data-set="back" data-back="appearance" aria-label="Back">' + SET_ICON.back + "</button>" +
    '<h2>Themes</h2><span class="curpill"><i></i>' + esc(presetLabel()) + "</span></div>" +
    '<div class="tsec">Yours</div><div class="tgrid">' + yours + "</div>" +
    (themeDraft ? themeEditorHTML() : "") +
    '<div class="tsec">Light</div><div class="tgrid">' + light + "</div>" +
    '<div class="tsec">Dark</div><div class="tgrid">' + dark + "</div>" +
    '<div class="tnote">Themes change the app paint, accent and selected controls.</div>';

  ov.scrollTop = st;
  bindThemesSheet(ov);
}

function bindThemesSheet(ov) {
  var back = ov.querySelector('[data-set="back"]');
  if (back) back.onclick = function () { dismissThemes(); };

  ov.querySelectorAll("[data-theme]").forEach(function (b) {
    b.onclick = function (e) {
      if (e.target.closest && e.target.closest("[data-del-theme]")) return;
      selectTheme(b.getAttribute("data-theme"));
      renderThemesSheet(ov);
    };
  });

  ov.querySelectorAll("[data-del-theme]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      var id = b.getAttribute("data-del-theme");
      var p = themeById(id);
      if (!p || !confirm("Delete “" + p.name + "”?")) return;
      state.settings.custom = state.settings.custom.filter(function (c) { return c.id !== id; });
      if (state.settings.preset === id) {
        state.settings.preset = "classic";
        state.settings.accent = THEMES[0].accent;
      }
      save(); applyTheme(); renderThemesSheet(ov); refreshAppearance();
    };
  });

  var nt = ov.querySelector("[data-new-theme]");
  if (nt) nt.onclick = function () {
    themeDraft = { name: "", accent: state.settings.accent };
    renderThemesSheet(ov);
    var inp = ov.querySelector("#tnewName");
    if (inp) inp.focus();
  };

  if (!themeDraft) return;

  var name = ov.querySelector("#tnewName");
  if (name) name.oninput = function () { if (themeDraft) themeDraft.name = this.value; };

  ov.querySelectorAll("[data-new-acc]").forEach(function (b) {
    b.onclick = function () {
      if (!themeDraft) return;
      themeDraft.accent = b.getAttribute("data-new-acc");
      ov.querySelectorAll("[data-new-acc]").forEach(function (o) { o.className = "acc" + (o === b ? " on" : ""); });
    };
  });

  var cancel = ov.querySelector("#tnewCancel");
  if (cancel) cancel.onclick = function () { themeDraft = null; renderThemesSheet(ov); };

  var add = ov.querySelector("#tnewAdd");
  if (add) add.onclick = function () {
    if (!themeDraft) return;
    var mode = currentMode();
    var id = "c" + uid();
    state.settings.custom.push({
      id: id,
      name: (themeDraft.name || "").trim() || "My Theme",
      accent: themeDraft.accent,
      mode: mode,
      bg: mode === "light" ? "#ffffff" : "#141416"
    });
    themeDraft = null;
    selectTheme(id);
    renderThemesSheet(ov);
    toast("Theme added");
  };
}

function selectTheme(id) {
  var p = themeById(id);
  if (!p) return;
  // Re-tapping the theme that is already active is a no-op: rebuilding the
  // whole gallery (44+ cards) for it was pure jank.
  if (state.settings.preset === id) return;
  state.settings.preset = id;
  state.settings.accent = p.accent;
  if (p.mode) state.settings.theme = p.mode;
  save(); applyTheme(); requestRender();
}

function openThemesSheet() {
  var m = document.getElementById("modal");
  m.className = "show";
  if (typeof removeIndicatorsSheet === "function") removeIndicatorsSheet();
  removeThemesSheet();
  themeDraft = null;

  var scrim = document.createElement("div");
  scrim.className = "sheet-scrim themes-scrim";
  scrim.onclick = dismissThemes;

  var ov = document.createElement("div");
  ov.className = "box overlay themes";
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-label", "Themes");

  m.appendChild(scrim);
  m.appendChild(ov);
  resetDrag(ov);
  renderThemesSheet(ov);
  bindOverlayDrag(ov, dismissThemes);
  m.onclick = function (e) { if (e.target === this) dismissThemes(); };
  ov.scrollTop = 0;
}

function dismissThemes() {
  var m = document.getElementById("modal");
  var ov = m.querySelector(".box.overlay.themes");
  if (!ov || ov._closing) return;
  ov._closing = true;
  ov.style.transition = "transform .22s cubic-bezier(.2,.9,.25,1)";
  ov.style.transform = "translateY(110%)";
  var scrim = m.querySelector(".themes-scrim");
  if (scrim) { scrim.style.transition = "opacity .18s"; scrim.style.opacity = "0"; }
  setTimeout(function () {
    if (m.querySelector(".box.overlay.themes") !== ov) return;   // a newer sheet is open
    removeThemesSheet();
    m.onclick = function (e) { if (e.target === this) closeModal(); };
    refreshAppearance();
  }, 200);
}

function removeThemesSheet() {
  var m = document.getElementById("modal");
  var ov = m.querySelector(".box.overlay.themes");
  if (ov) ov.remove();
  var scrim = m.querySelector(".themes-scrim");
  if (scrim) scrim.remove();
  themeDraft = null;
}

function bindOverlayDrag(ov, dismiss) {
  if (ov._dragBound) return;
  ov._dragBound = true;
  var sy = 0, dy = 0, active = false;
  ov.addEventListener("touchstart", function (e) {
    if (ov.scrollTop > 0 || !e.touches.length) { active = false; return; }
    sy = e.touches[0].clientY; dy = 0; active = true;
    ov.style.transition = "none";
  }, { passive: true });
  ov.addEventListener("touchmove", function (e) {
    if (!active || !e.touches.length) return;
    dy = e.touches[0].clientY - sy;
    if (dy > 0) ov.style.transform = "translateY(" + dy + "px)";
  }, { passive: true });
  function end() {
    if (!active) return;
    active = false;
    if (dy > 100) { (dismiss || dismissThemes)(); return; }
    ov.style.transition = "transform .24s cubic-bezier(.2,.9,.25,1)";
    ov.style.transform = "";
  }
  ov.addEventListener("touchend", end);
  ov.addEventListener("touchcancel", end);
}

function indicatorHidden(id) {
  return state.settings.hidden.indexOf(id) >= 0;
}
