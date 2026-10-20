// ===== Buttons + start =====
function render() {
  document.getElementById("bCal").className = "round" + (tab === "cal" ? " on" : "");
  document.getElementById("bSub").className = "round" + (tab === "sub" ? " on" : "");
  document.getElementById("app").classList.toggle("day-view", tab === "cal" && !!dayOpen);
  document.getElementById("app").classList.toggle("year-view", tab === "cal" && !!yearOpen && !dayOpen);
  if (tab === "cal") renderCalendar(); else renderSubjects();
}
document.getElementById("bCal").onclick = function () { tab = "cal"; dayOpen = null; yearOpen = false; render(); };
document.getElementById("bSub").onclick = function () { tab = "sub"; openId = null; render(); };
document.getElementById("bToday").onclick = openSearch;
document.getElementById("plans").onkeydown = function (e) {
  if (e.key === "Enter" && this.value.trim()) { handlePhrase(this.value.trim(), "✎"); this.value = ""; }
};
document.getElementById("bAdd").onclick = function () { addLecture(today.getDay()); };
document.getElementById("mic").onclick = listen;

// ===== Settings =====
var SET_ICON = {
  chev: '<svg class="mc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  globe: '<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/></svg>',
  bell: '<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  backup: '<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10"/><path d="M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/></svg>',
  more: '<svg class="mi" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>'
};

function setHead(title, back) {
  return '<div class="shead">' +
    (back ? '<button class="sback" data-set="back" aria-label="Back">' + SET_ICON.back + "</button>" : "") +
    "<h2>" + title + "</h2>" +
    (back ? "" : '<button class="sx" data-set="close" aria-label="Close">' + SET_ICON.x + "</button>") +
    "</div>";
}

function setRow(page, icon, label) {
  return '<button class="mrow" data-set="' + page + '">' + icon + "<span>" + label + "</span>" + SET_ICON.chev + "</button>";
}

var SET_PAGES = {
  main: function () {
    return setHead("Settings") +
      '<div class="menu">' +
      setRow("lang", SET_ICON.globe, "Voice language") +
      setRow("reminders", SET_ICON.bell, "Reminders") +
      setRow("backup", SET_ICON.backup, "Backup &amp; restore") +
      setRow("more", SET_ICON.more, "More") +
      "</div>" +
      '<button class="pro" data-scan>Scan a timetable photo</button>';
  },
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
      '<div class="muted" style="margin-top:3cqw">A backup is a small file you can keep anywhere. Restoring replaces what is on this device.</div>';
  },
  more: function () {
    return setHead("More", true) +
      '<div class="muted">Lektra keeps your subjects, lectures, entries and files on this device. Everything except the AI timetable photo import works offline.</div>' +
      '<label>Storage</label>' +
      '<div class="btns" style="margin-top:0"><button id="clearBtn" class="danger">Clear all data</button></div>' +
      '<div class="muted" style="margin-top:3cqw">Deleting removes every subject, lecture, entry and saved file. This cannot be undone.</div>';
  }
};

function openSettings() { settingsPage("main"); }

function settingsPage(page) {
  var box = document.getElementById("box");
  box.className = "box";
  box.innerHTML = '<div class="handle"></div>' + (SET_PAGES[page] || SET_PAGES.main)();
  box.scrollTop = 0;
  resetDrag(box);
  dragToClose(box);
  document.getElementById("modal").className = "show";
  document.getElementById("modal").onclick = function (e) { if (e.target === this) closeModal(); };

  box.querySelectorAll("[data-set]").forEach(function (b) {
    b.onclick = function () {
      var go = b.getAttribute("data-set");
      if (go === "close") { closeModal(); return; }
      settingsPage(go === "back" ? "main" : go);
    };
  });

  var scan = box.querySelector("[data-scan]");
  if (scan) scan.onclick = function () { closeModal(); scanTimetable(); };

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
      if (f) importData(f).catch(function () { toast("That file is not a Lektra backup"); });
    };
    return;
  }

  if (page === "more") {
    document.getElementById("clearBtn").onclick = function () {
      if (!confirm("Delete every subject, lecture, entry and saved file? This cannot be undone.")) return;
      clearAll().then(function () { closeModal(); tab = "cal"; openId = null; filterId = null; render(); toast("All data cleared"); });
    };
  }
}

function clearAll() {
  state = normalizeState({});
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
requestPersist();  // ask the browser to keep our data
loadStateFromDB().then(function (hadStored) {
  if (hadStored) render();  // IndexedDB is the source of truth once it loads
  initReminders();          // start the reminder ticker + catch up on anything missed
}).catch(function () { initReminders(); });
