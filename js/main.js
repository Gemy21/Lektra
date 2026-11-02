// ===== Buttons + start =====
function render() {
  // Any render satisfies a deferred one.
  pendingRender = false;
  // A long-press menu or select-mode bar belongs to the day view; drop them
  // as soon as the user navigates somewhere else.
  if (typeof closeDayMenu === "function") closeDayMenu();
  if (typeof exitDaySelection === "function" && (tab !== "cal" || !dayOpen)) exitDaySelection();
  document.getElementById("bCal").className = "round" + (tab === "cal" ? " on" : "");
  document.getElementById("bSub").className = "round" + (tab === "sub" ? " on" : "");
  document.getElementById("app").classList.toggle("day-view", tab === "cal" && !!dayOpen);
  document.getElementById("app").classList.toggle("timeline-view", tab === "cal" && !!dayOpen && currentDayView() === "notes");
  document.getElementById("app").classList.toggle("year-view", tab === "cal" && !!yearOpen && !dayOpen);
  document.getElementById("app").classList.toggle("month-view", tab === "cal" && !dayOpen && !yearOpen);
  if (tab === "cal") renderCalendar(); else renderSubjects();
}
document.getElementById("bCal").onclick = function () { tab = "cal"; dayOpen = null; yearOpen = false; render(); };
document.getElementById("bSub").onclick = function () { tab = "sub"; openId = null; render(); };
document.getElementById("bToday").onclick = openSearch;
var plansInput = document.getElementById("plans");
var composer = document.getElementById("composer");
var composerScrim = document.getElementById("composerScrim");

function openComposer() {
  document.getElementById("app").classList.add("composing");
  plansInput.placeholder = "Ask...";
  if (typeof syncThemeColor === "function") syncThemeColor();
}

function closeComposer() {
  if (typeof cancelVoice === "function") cancelVoice();
  document.getElementById("app").classList.remove("composing");
  plansInput.placeholder = "What are your plans?";
  if (document.activeElement === plansInput) plansInput.blur();
  if (typeof syncThemeColor === "function") syncThemeColor();
}

function sendPlan() {
  var text = plansInput.value.trim();
  if (!text) { closeComposer(); addLecture(today.getDay()); return; }
  plansInput.value = "";
  closeComposer();
  if (typeof openChatWithText === "function") openChatWithText(text, "✎");
  else handlePhrase(text, "✎");
}

plansInput.addEventListener("focus", openComposer);
plansInput.onkeydown = function (e) {
  if (e.key === "Escape") { closeComposer(); return; }
  if (e.key === "Enter" && this.value.trim()) { e.preventDefault(); sendPlan(); }
};
document.getElementById("composerClose").onclick = closeComposer;
composerScrim.onclick = closeComposer;
document.getElementById("attach").onclick = function () { openAttachSheet(); };
document.getElementById("planToday").onclick = sendPlan;
document.getElementById("bAdd").onclick = function () { addLecture(today.getDay()); };
document.getElementById("mic").onclick = listen;
document.getElementById("voiceStop").onclick = stopVoice;

// ===== Settings =====
var SET_ICON = {
  chev: '<svg class="mc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  globe: '<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/></svg>',
  bell: '<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  backup: '<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10"/><path d="M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/></svg>',
  paint: '<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18 3 3 0 0 0 0-6 3 3 0 0 1 0-6 3 3 0 0 0 0-6z" fill="currentColor" stroke="none"/></svg>',
  month: '<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.4" width="18" height="16.6" rx="4"/><path d="M7.8 2.6v3.4M16.2 2.6v3.4M3 9.4h18"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 17h2M11 17h2"/></svg>',
  more: '<svg class="mi" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  person: '<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9.1" r="2.6"/><path d="M6.7 18.1a6.3 6.3 0 0 1 10.6 0"/></svg>'
};

var DEV_INFO = {
  name: "Ahmed Kamal",
  role: "Developer of Lektra",
  bio: "I build Lektra with my colleague Gamal Sameh — a calendar that keeps up with real life: the plans, the classes, and the little moments worth keeping. It's offline-first, so your semester stays with you.",
  thanks: "Thanks for being here.",
  links: [
    { label: "Ahmed Kamal", handle: "@ahmedkamalrezk", url: "https://github.com/ahmedkamalrezk" },
    { label: "Gamal Sameh", handle: "@Gemy21", url: "https://github.com/Gemy21" }
  ]
};
var DEV_ICON = {
  smiley: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><circle cx="32" cy="32" r="25"/><circle cx="23" cy="27" r="2.2" fill="currentColor" stroke="none"/><circle cx="41" cy="27" r="2.2" fill="currentColor" stroke="none"/><path d="M21 39c3.5 5 7.5 7.5 11 7.5S39.5 44 43 39"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>'
};

// `back` is true (returns to the main settings) or the page to return to.
// Sub-pages get a chevron back button. There is deliberately no close (x)
// button: the sheet is dismissed by dragging it down or tapping outside.
function setHead(title, back) {
  return '<div class="shead">' +
    (back ? '<button class="sback plain" data-set="back" data-back="' + (back === true ? "main" : back) + '" aria-label="Back">' + SET_ICON.back + "</button>" : "") +
    "<h2>" + title + "</h2>" +
    "</div>";
}

function setRow(page, icon, label) {
  return '<button class="mrow" data-set="' + page + '">' + icon + "<span>" + label + "</span>" + SET_ICON.chev + "</button>";
}

var SET_PAGES = {
  main: function () {
    return setHead("Settings") +
      '<div class="menu">' +
      setRow("appearance", SET_ICON.paint, "Appearance") +
      setRow("month", SET_ICON.month, "Month Options") +
      setRow("lang", SET_ICON.globe, "Voice language") +
      setRow("reminders", SET_ICON.bell, "Reminders") +
      setRow("backup", SET_ICON.backup, "Backup &amp; restore") +
      setRow("more", SET_ICON.more, "More") +
      "</div>" +
      '<button class="pro" data-scan>Scan a timetable photo</button>';
  },
  appearance: function () { return appearancePage(); },
  month: function () { return monthOptionsPage(); },
  filters: function () { return filterSheetHtml(); },
  lang: function () {
    return setHead("Voice language", true) +
      '<div class="chips" style="margin-top:4cqw">' +
      '<button class="chip' + (state.lang === "ar" ? " on" : "") + '" data-l="ar">العربية (مصر)</button>' +
      '<button class="chip' + (state.lang === "en" ? " on" : "") + '" data-l="en">English</button></div>' +
      '<div class="muted" style="margin-top:4cqw">Used when Lektra reads reminders out loud and in the voice assistant. The app text stays in English.</div>';
  },
  reminders: function () {
    return setHead("Reminders", true) +
      '<div class="muted" id="remStatus">' + esc(remindStatusText()) + "</div>" +
      '<div class="btns" style="margin-top:3cqw"><button id="remToggle">' + (state.reminders.enabled ? "Disable" : "Enable") + ' reminders</button><button id="remTest">Test</button></div>' +
      '<div class="muted" style="margin-top:2.5cqw">They fire while Lektra is open or recently used, and on reopen you\'re told what you missed.</div>' +
      '<label>When to remind</label>' +
      remindLeadRow("Classes (lecture / section / lab)", "classes") +
      remindLeadRow("Quizzes", "quiz") +
      remindLeadRow("Deadlines", "deadline") +
      remindLeadRow("Midterms & finals", "exam") +
      '<div class="muted" style="margin-top:2cqw">Deadlines also remind you 1 day before, and exams 1 hour before.</div>';
  },
  backup: function () {
    return setHead("Backup &amp; restore", true) +
      '<div class="muted" id="storInfo">Everything is saved on this device and works offline.</div>' +
      '<div class="btns" style="margin-top:3cqw"><button id="exportBtn">Backup</button><button id="importBtn">Restore</button></div>' +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '<div class="muted" style="margin-top:3cqw">A backup is a small schedule file you can keep anywhere. Saved lecture files stay on this device and are not included. Restoring replaces what is on this device.</div>';
  },
  more: function () {
    return setHead("More", true) +
      '<div class="muted">Lektra keeps your subjects, lectures, entries and files on this device. Everything except the AI timetable photo import works offline.</div>' +
      '<div class="sect"><h3>About</h3>' +
        '<button class="devrow" data-dev="1">' + SET_ICON.person + '<span>From the Developer</span>' + SET_ICON.chev + '</button>' +
      '</div>' +
      '<label>Storage</label>' +
      '<div class="btns" style="margin-top:0"><button id="clearBtn" class="danger">Clear all data</button></div>' +
      '<div class="muted" style="margin-top:3cqw">Deleting removes every subject, lecture, entry and saved file. This cannot be undone.</div>';
  }
};

function developerSheetHtml() {
  var links = DEV_INFO.links || [];
  var linksHtml = links.length
    ? '<div class="dev-links-label">Find us on GitHub</div>' +
      '<div class="dev-links">' +
      links.map(function (link) {
        return '<a class="dev-link" href="' + esc(link.url) + '" target="_blank" rel="noopener">' +
          DEV_ICON.github +
          '<span>' + esc(link.label) + '</span>' +
          '<span class="dev-handle">' + esc(link.handle) + '</span>' +
          '</a>';
      }).join("") +
      '</div>'
    : '';
  return '<div class="handle"></div>' +
    '<button class="dev-close" data-dev-close aria-label="Close">' + SET_ICON.x + '</button>' +
    '<div class="dev-avatar">' + DEV_ICON.smiley + '</div>' +
    '<h2 class="dev-name">Hi, I’m ' + esc(DEV_INFO.name) + '</h2>' +
    '<p class="dev-role">' + esc(DEV_INFO.role) + '</p>' +
    '<p class="dev-bio">' + esc(DEV_INFO.bio) + '</p>' +
    linksHtml +
    '<p class="dev-thanks">' + esc(DEV_INFO.thanks) + '</p>';
}

function openDeveloperSheet() {
  var m = document.getElementById("modal");
  m.className = "show";
  if (typeof removeThemesSheet === "function") removeThemesSheet();
  if (typeof removeIndicatorsSheet === "function") removeIndicatorsSheet();
  removeDeveloperSheet();

  var scrim = document.createElement("div");
  scrim.className = "sheet-scrim dev-scrim";
  scrim.onclick = dismissDeveloperSheet;

  var ov = document.createElement("div");
  ov.className = "box overlay devsheet";
  ov.id = "devSheet";
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-label", "From the Developer");
  ov.innerHTML = developerSheetHtml();

  m.appendChild(scrim);
  m.appendChild(ov);
  resetDrag(ov);
  bindOverlayDrag(ov, dismissDeveloperSheet);
  m.onclick = function (e) { if (e.target === this) dismissDeveloperSheet(); };
  var close = ov.querySelector("[data-dev-close]");
  if (close) close.onclick = dismissDeveloperSheet;
  ov.scrollTop = 0;
}

function dismissDeveloperSheet() {
  var m = document.getElementById("modal");
  var ov = m.querySelector("#devSheet");
  if (!ov || ov._closing) return;
  ov._closing = true;
  ov.style.transition = "transform .22s cubic-bezier(.2,.9,.25,1)";
  ov.style.transform = "translateY(110%)";
  var scrim = m.querySelector(".dev-scrim");
  if (scrim) { scrim.style.transition = "opacity .18s"; scrim.style.opacity = "0"; }
  setTimeout(function () {
    if (m.querySelector("#devSheet") !== ov) return;
    removeDeveloperSheet();
    m.onclick = function (e) { if (e.target === this) closeModal(); };
  }, 200);
}

function removeDeveloperSheet() {
  var m = document.getElementById("modal");
  var ov = m.querySelector("#devSheet");
  if (ov) ov.remove();
  var scrim = m.querySelector(".dev-scrim");
  if (scrim) scrim.remove();
}

function openSettings() { settingsPage("main"); }

function settingsPage(page) {
  var box = document.getElementById("box");
  box.className = "box" + (page === "filters" ? " filtersheet" : "");
  box.setAttribute("data-page", page);
  box.innerHTML = '<div class="handle"></div>' + (SET_PAGES[page] || SET_PAGES.main)();
  box.scrollTop = 0;
  resetDrag(box);
  dragToClose(box);
  document.getElementById("modal").className = "show" + (page === "filters" ? " filter-mode" : "");
  document.getElementById("modal").onclick = function (e) { if (e.target === this) closeModal(); };

  box.querySelectorAll("[data-set]").forEach(function (b) {
    b.onclick = function () {
      var go = b.getAttribute("data-set");
      if (go === "close") { closeModal(); return; }
      if (go === "back") { settingsPage(b.getAttribute("data-back") || "main"); return; }
      settingsPage(go);
    };
  });

  var scan = box.querySelector("[data-scan]");
  if (scan) scan.onclick = function () { closeModal(); scanTimetable(); };

  var dev = box.querySelector("[data-dev]");
  if (dev) dev.onclick = openDeveloperSheet;

  if (page === "filters") {
    bindFilterSheet(box);
    return;
  }

  if (page === "appearance") {
    bindAppearancePage(page, box);
    return;
  }

  if (page === "month") {
    bindMonthOptions(box);
    return;
  }

  if (page === "lang") {
    box.querySelectorAll("[data-l]").forEach(function (b) {
      b.onclick = function () {
        state.lang = b.getAttribute("data-l"); save();
        box.querySelectorAll("[data-l]").forEach(function (o) { o.className = "chip" + (o === b ? " on" : ""); });
      };
    });
    return;
  }

  if (page === "reminders") {
    var refreshRemStatus = function () {
      document.getElementById("remStatus").textContent = remindStatusText();
      document.getElementById("remToggle").textContent = (state.reminders.enabled ? "Disable" : "Enable") + " reminders";
    };
    document.getElementById("remToggle").onclick = function () {
      var p = state.reminders.enabled ? Promise.resolve(disableReminders()).then(function () { return false; })
        : enableReminders();
      p.then(function () { refreshRemStatus(); });
    };
    document.getElementById("remTest").onclick = function () {
      if (notifyPermission() !== "granted") { toast("Enable reminders first"); return; }
      showReminder("Lektra test", "That's how a reminder will look.", "lektra-test", {});
    };
    box.querySelectorAll("[data-lead-num]").forEach(function (input) {
      input.onchange = function () { saveLead(input.getAttribute("data-lead-num")); };
    });
    box.querySelectorAll("[data-lead-unit]").forEach(function (sel) {
      sel.onchange = function () { saveLead(sel.getAttribute("data-lead-unit")); };
    });
    return;
  }

  if (page === "backup") {
    var info = document.getElementById("storInfo");
    Promise.all([
      typeof countFiles === "function" ? countFiles() : Promise.resolve(0),
      typeof storageInfo === "function" ? storageInfo() : Promise.resolve({ supported: false })
    ]).then(function (r) {
      var n = r[0], st = r[1];
      var txt = n + " file" + (n === 1 ? "" : "s") + " stored offline.";
      if (st.supported && st.usage) txt += " Using about " + fmtSize(st.usage) + ".";
      txt += " Everything is saved on this device and works offline.";
      info.textContent = txt;
    }).catch(function () {});
    document.getElementById("exportBtn").onclick = exportData;
    var impFile = document.getElementById("importFile");
    document.getElementById("importBtn").onclick = function () { impFile.click(); };
    impFile.onchange = function () {
      var f = impFile.files[0];
      impFile.value = "";   // allow picking the same backup again after a failure
      if (f) importData(f).then(function () { closeModal(); }).catch(function () {
        toast("That file is not a Lektra backup");
      });
    };
    return;
  }

  if (page === "more") {
    document.getElementById("clearBtn").onclick = function () {
      if (!confirm("Delete every subject, lecture, entry and saved file? This cannot be undone.")) return;
      clearAll().then(function () {
        closeModal();
        tab = "cal";
        view = new Date(today.getFullYear(), today.getMonth(), 1);
        dayOpen = null;
        yearOpen = false;
        openId = null;
        filterId = null;
        render();
        toast("All data cleared");
      });
    };
  }
}

function clearAll() {
  state = normalizeState({});
  applyTheme();
  if (typeof cancelSave === "function") cancelSave();   // don't resurrect the mirror
  try { localStorage.removeItem(STATE_KEY); } catch (e) {}
  var jobs = [idbPut("kv", state, STATE_KEY).catch(function () {})];
  if (typeof idbAll === "function") {
    jobs.push(idbAll("files").then(function (all) {
      return Promise.all(all.map(function (r) { return idbDel("files", r.id); }));
    }).catch(function () {}));
  }
  return Promise.all(jobs);
}

function saveLead(key) {
  var num = document.querySelector('[data-lead-num="' + key + '"]');
  var unit = document.querySelector('[data-lead-unit="' + key + '"]');
  if (!num || !unit) return;
  var v = parseInt(num.value, 10);
  if (!isFinite(v) || v < 0) v = 0;
  state.reminders.lead[key] = v * parseInt(unit.value, 10);
  save();
}

document.getElementById("bSet").onclick = openSettings;

// ===== Service worker (install + offline) =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}

// ===== Boot =====
render();          // instant paint from the localStorage mirror
setInterval(function () { if (refreshToday()) render(); }, 60000);
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && refreshToday()) render();
});
requestPersist();  // ask the browser to keep our data
loadStateFromDB().then(function (hadStored) {
  applyTheme();              // the stored copy may carry another theme
  if (hadStored) render();  // IndexedDB is the source of truth once it loads
  initReminders();          // start the reminder ticker + catch up on anything missed
}).catch(function () { initReminders(); });
