// ===== Reminders =====
// In-app notifications for classes and deadlines.
//
// IMPORTANT: a web app cannot wake itself up. This fires reminders while Lektra is
// open (or recently used), and on reopen it catches you up on anything you missed.
// Nothing is scheduled in the OS, so a fully-closed app stays silent by design.

var REMIND_TICK_MS = 30000;                    // how often to check
var REMIND_GRACE_MS = 5 * 60 * 1000;           // a reminder still counts as "on time" for 5 min
var REMIND_CATCHUP_MS = 48 * 60 * 60 * 1000;   // look back this far for missed reminders
var REMIND_STALE_MS = 3 * 60 * 60 * 1000;      // don't nag about things that ended over 3h ago
var REMIND_KEEP_MS = 7 * 24 * 60 * 60 * 1000;  // how long to remember what we already fired

var remindTimer = null;

// Never assume the reminders bucket exists (old saved data, first run, etc).
function ensureReminders() {
  if (!state.reminders || typeof state.reminders !== "object") {
    state.reminders = { enabled: false, lead: {}, fired: {} };
  }
  if (!state.reminders.lead || typeof state.reminders.lead !== "object") state.reminders.lead = {};
  if (!state.reminders.fired || typeof state.reminders.fired !== "object") state.reminders.fired = {};
  return state.reminders;
}

// ===== support / permission =====
function notifySupported() { return typeof Notification !== "undefined"; }
function notifyPermission() { return notifySupported() ? Notification.permission : "unsupported"; }

function remindStatusText() {
  if (!notifySupported()) {
    return "This browser can't show notifications. On iPhone install the app first (iOS 16.4+), then open it from the home screen.";
  }
  var p = Notification.permission;
  if (p === "granted") return state.reminders.enabled ? "On." : "Allowed, but reminders are off.";
  if (p === "denied") return "Blocked. Allow notifications for this site in your browser settings, then try again.";
  return "Not enabled yet.";
}

// ===== how long before each kind of entry =====
function leadsFor(kind) {
  var L = ensureReminders().lead;
  var out;
  if (isWeekly(kind)) out = [L.classes];
  else if (kind === "quiz") out = [L.quiz];
  else if (kind === "deadline") out = [L.deadline, 1440];   // deadline: your setting + 1 day before
  else out = [L.exam, 60];                                  // exams: your setting + 1 hour before
  return out
    .filter(function (m) { return typeof m === "number" && isFinite(m) && m >= 0; })
    .filter(function (m, i, a) { return a.indexOf(m) === i; })
    .sort(function (a, b) { return b - a; });
}

// ===== when things actually happen =====
function eventWhen(e) {
  var p = String(e.date).split("-");
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  if (e.time) { var t = String(e.time).split(":"); d.setHours(+t[0] || 0, +t[1] || 0, 0, 0); }
  else d.setHours(9, 0, 0, 0);   // no time given: assume 09:00
  return d;
}

function lectureWhenOn(l, day) {
  var d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  var t = String(l.time || "09:00").split(":");
  d.setHours(+t[0] || 0, +t[1] || 0, 0, 0);
  return d;
}

// walk every occurrence (dated entry, or a weekly class landing on its weekday) in a window
function eachOccurrence(from, to, cb) {
  state.events.forEach(function (e) {
    var w = eventWhen(e);
    if (w >= from && w <= to) cb(e, e.kind, w);
  });

  var day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  day.setDate(day.getDate() - 1);
  var end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
  while (day <= end) {
    var dow = day.getDay();
    for (var i = 0; i < state.lectures.length; i++) {
      var l = state.lectures[i];
      if (l.weekday !== dow) continue;
      var w2 = lectureWhenOn(l, day);
      if (w2 >= from && w2 <= to) cb(l, l.kind, w2);
    }
    day.setDate(day.getDate() + 1);
  }
}

// The longest lead time configured. A reminder fires *before* its occurrence, so when
// looking for reminders inside a window we must also look at occurrences that happen
// after it - up to this much later.
function maxLeadMs() {
  var max = 0;
  ["lecture", "section", "lab", "quiz", "deadline", "midterm", "final"].forEach(function (k) {
    leadsFor(k).forEach(function (m) { if (m * 60000 > max) max = m * 60000; });
  });
  return max;
}

// every reminder that should fire inside [from, to]
function collectReminders(from, to) {
  var out = [];
  var occTo = new Date(to.getTime() + maxLeadMs());
  eachOccurrence(from, occTo, function (entry, kind, when) {
    leadsFor(kind).forEach(function (lead) {
      var at = new Date(when.getTime() - lead * 60000);
      if (at >= from && at <= to) {
        out.push({ key: entry.id + "@" + when.getTime() + "@" + lead, at: at, when: when, entry: entry, kind: kind, lead: lead });
      }
    });
  });
  return out.sort(function (a, b) { return a.at - b.at; });
}

// ===== wording =====
function fmtClock(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }

function leadWords(lead) {
  if (lead === 0) return "now";
  if (lead < 60) return "in " + lead + " min";
  if (lead < 1440) { var h = Math.round(lead / 60); return "in " + h + " hour" + (h > 1 ? "s" : ""); }
  var d = Math.round(lead / 1440);
  return "in " + d + " day" + (d > 1 ? "s" : "");
}

function reminderText(r) {
  var when = leadWords(r.lead);
  if (isWeekly(r.kind)) {
    return {
      title: subjectName(r.entry.subjectId) + " " + when,
      body: kindLabel(r.kind) + " at " + fmtClock(r.when) + (r.entry.place ? " · 📍 " + r.entry.place : "")
    };
  }
  return {
    title: kindLabel(r.kind) + " " + when,
    body: subjectName(r.entry.subjectId) + " · " + r.when.getDate() + " " + MONTHS[r.when.getMonth()] +
      " at " + fmtClock(r.when) + (r.entry.note ? " · " + r.entry.note : "")
  };
}

// ===== showing them =====
function nativeNotify(title, opts) {
  try { new Notification(title, opts); } catch (e) {}
}

function showReminder(title, body, tag, data) {
  var opts = { body: body, tag: tag, data: data || {}, icon: "assets/icon-192.png", renotify: true };
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      return navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg && reg.showNotification) return reg.showNotification(title, opts);
        nativeNotify(title, opts);
      }).catch(function () { nativeNotify(title, opts); });
    }
    nativeNotify(title, opts);
  } catch (e) { nativeNotify(title, opts); }
  return Promise.resolve();
}

// ===== remembering what already fired =====
function pruneFired() {
  var f = ensureReminders().fired;
  var cutoff = Date.now() - REMIND_KEEP_MS;
  Object.keys(f).forEach(function (k) { if (f[k] < cutoff) delete f[k]; });
}

function markFired(key) {
  var r = ensureReminders();
  r.fired[key] = Date.now();
  pruneFired();
  save();
}

// ===== the checks =====
function remindersReady() {
  return ensureReminders().enabled === true && notifyPermission() === "granted";
}

function checkReminders() {
  if (!remindersReady()) return;
  var now = new Date();
  var from = new Date(now.getTime() - REMIND_GRACE_MS);
  var to = new Date(now.getTime() + REMIND_TICK_MS + 2000);
  var fired = ensureReminders().fired;
  collectReminders(from, to).forEach(function (r) {
    if (fired[r.key]) return;
    var t = reminderText(r);
    showReminder(t.title, t.body, r.key, { key: r.key });
    markFired(r.key);
  });
}

// anything that came due while the app was closed
function catchUpReminders() {
  if (!remindersReady()) return;
  var now = new Date();
  var fired = ensureReminders().fired;
  var missed = collectReminders(
    new Date(now.getTime() - REMIND_CATCHUP_MS),
    new Date(now.getTime() - REMIND_GRACE_MS)
  ).filter(function (r) {
    return !fired[r.key] && r.when.getTime() > now.getTime() - REMIND_STALE_MS;
  });
  if (!missed.length) return;

  var names = missed.slice(0, 3).map(function (r) { return reminderText(r).title; });
  var extra = missed.length > names.length ? " +" + (missed.length - names.length) + " more" : "";
  showReminder(missed.length + " reminder" + (missed.length > 1 ? "s" : "") + " you missed",
    names.join(" · ") + extra, "lektra-catchup", { catchup: true });
  missed.forEach(function (r) { markFired(r.key); });
  toast(missed.length + " missed reminder" + (missed.length > 1 ? "s" : ""));
}

// ===== enable / disable =====
function enableReminders() {
  if (!notifySupported()) { toast("This browser can't show notifications"); return Promise.resolve(false); }
  if (Notification.permission === "denied") {
    toast("Notifications are blocked in your browser settings");
    return Promise.resolve(false);
  }
  var ask = Notification.permission === "granted"
    ? Promise.resolve("granted")
    : Notification.requestPermission();
  return ask.then(function (p) {
    if (p !== "granted") { toast("Not allowed — reminders stay off"); return false; }
    ensureReminders().enabled = true; save();
    toast("Reminders on ✓");
    checkReminders();
    return true;
  }).catch(function () { return false; });
}

function disableReminders() {
  ensureReminders().enabled = false; save();
  toast("Reminders off");
}

// ===== lifecycle =====
function startReminders() {
  if (remindTimer) return;
  remindTimer = setInterval(checkReminders, REMIND_TICK_MS);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") { catchUpReminders(); checkReminders(); }
  });
}

function initReminders() {
  pruneFired();
  startReminders();
  catchUpReminders();
  checkReminders();
}

// ===== settings row =====
function remindLeadRow(label, key) {
  var mins = ensureReminders().lead[key];
  var unit = 1, val = mins;
  if (mins >= 1440 && mins % 1440 === 0) { unit = 1440; val = mins / 1440; }
  else if (mins >= 60 && mins % 60 === 0) { unit = 60; val = mins / 60; }
  function opt(v, t) { return '<option value="' + v + '"' + (unit === v ? " selected" : "") + ">" + t + "</option>"; }
  return '<div class="lead"><span>' + esc(label) + '</span>' +
    '<input type="number" min="0" step="1" inputmode="numeric" data-lead-num="' + key + '" value="' + val + '">' +
    '<select data-lead-unit="' + key + '">' + opt(1, "min") + opt(60, "hours") + opt(1440, "days") + "</select></div>";
}
