// ===== AI timetable import =====
//
// This is the ONE part of Lektra that needs internet. Everything else stays offline.
//
// How it works: the student picks a photo of their college timetable, we shrink it,
// hand it to Puter.js (https://puter.com) which passes it to a vision model, and we ask
// for JSON back. We then show every detected class for review - the AI never writes to
// the timetable directly, so a bad read can't silently corrupt anything.
//
// Puter needs no API key and sends us no bill, but it does ask the student to sign in to
// a free Puter account the first time. The photo is sent there to be read.

var SCAN_SCRIPT = "https://js.puter.com/v2/";
var SCAN_MAX_PX = 1600;                 // shrink big phone photos before sending
var SCAN_TIMEOUT_MS = 90000;
var SCAN_MODELS = ["gpt-5.6-luna", null, "gemini-3.1-flash-lite"];  // null = Puter's default
var scanLoader = null;

// ===== load Puter.js only when actually needed =====
function loadPuter() {
  if (typeof puter !== "undefined") return Promise.resolve();
  if (scanLoader) return scanLoader;
  scanLoader = new Promise(function (resolve, reject) {
    var s = document.createElement("script");
    s.src = SCAN_SCRIPT;
    s.onload = function () { resolve(); };
    s.onerror = function () {
      scanLoader = null;
      reject(new Error("Couldn't load the AI helper. Check your internet connection."));
    };
    document.head.appendChild(s);
  });
  return scanLoader;
}

// ===== shrink the photo (cheaper, faster, more reliable) =====
function shrinkImage(file) {
  return new Promise(function (resolve) {
    if (!/^image\//.test(file.type)) { resolve(file); return; }
    var url;
    try { url = URL.createObjectURL(file); } catch (e) { resolve(file); return; }
    var img = new Image();
    img.onload = function () {
      try {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, SCAN_MAX_PX / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], "timetable.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      } catch (e) { URL.revokeObjectURL(url); resolve(file); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ===== what we ask the model for =====
function scanPrompt() {
  return [
    "Read this photo of a university timetable (it may be English, Arabic, or both).",
    "Return JSON only - no explanation, no markdown fences.",
    'Shape: {"subjects":[{"name":"SUBJECT","entries":[{"kind":"lecture","day":"sunday","start":"09:00","end":"10:30","place":"Hall 3"}]}]}',
    "Rules:",
    "- day must be one of: sunday, monday, tuesday, wednesday, thursday, friday, saturday.",
    "- start and end must be 24-hour HH:MM (Arabic 2 => 14:00).",
    "- kind must be exactly one of: lecture, section, lab.",
    "- Keep subject names exactly as written. Do not translate, shorten or invent them.",
    "- Use an empty string for anything you cannot read.",
    "- Never invent classes. If this is not a timetable, return {\"subjects\":[]}."
  ].join("\n");
}

// ===== reading the model's answer (shapes vary by vendor) =====
function responseText(resp) {
  if (resp == null) return "";
  if (typeof resp === "string") return resp;
  if (typeof resp.text === "string") return resp.text;
  if (typeof resp.content === "string") return resp.content;
  if (resp.message) {
    var c = resp.message.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return c.map(function (p) { return typeof p === "string" ? p : (p && p.text) || ""; }).join("");
    }
  }
  if (Array.isArray(resp)) {
    return resp.map(function (p) { return typeof p === "string" ? p : (p && p.text) || ""; }).join("");
  }
  try { return String(resp); } catch (e) { return ""; }
}

function extractJson(text) {
  var s = String(text == null ? "" : text);
  s = s.replace(/```(?:json)?/gi, " ");
  var a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  var slice = s.slice(a, b + 1);
  try { return JSON.parse(slice); } catch (e) {}
  try { return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1")); } catch (e) {}
  return null;
}

// ===== normalising what came back =====
// NOTE: named SCAN_DAYS, not DAY_WORDS - voice.js already owns a DAY_WORDS (an
// array of day-name synonyms) and a second `var DAY_WORDS` here would silently
// overwrite it, crashing the offline parser on every sentence with a weekday.
var SCAN_DAYS = {
  "sunday": 0, "sun": 0, "الاحد": 0, "احد": 0,
  "monday": 1, "mon": 1, "الاثنين": 1, "اثنين": 1, "الاتنين": 1,
  "tuesday": 2, "tue": 2, "tues": 2, "الثلاثاء": 2, "ثلاثاء": 2, "التلات": 2, "الثلاث": 2,
  "wednesday": 3, "wed": 3, "الاربعاء": 3, "اربعاء": 3, "الاربع": 3,
  "thursday": 4, "thu": 4, "thur": 4, "thurs": 4, "الخميس": 4, "خميس": 4,
  "friday": 5, "fri": 5, "الجمعه": 5, "جمعه": 5,
  "saturday": 6, "sat": 6, "السبت": 6, "سبت": 6
};

function dayIndex(v) {
  if (typeof v === "number" && v >= 0 && v <= 6) return v;
  var s = String(v == null ? "" : v).toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")   // Arabic diacritics + tatweel
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[.،,\u060C\s]/g, "")
    .trim();
  if (Object.prototype.hasOwnProperty.call(SCAN_DAYS, s)) return SCAN_DAYS[s];
  if (s.indexOf("ال") === 0 && Object.prototype.hasOwnProperty.call(SCAN_DAYS, s.slice(2))) return SCAN_DAYS[s.slice(2)];
  return -1;
}

function normDigits(s) {
  return s
    .replace(/[\u0660-\u0669]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48); })
    .replace(/[\u06F0-\u06F9]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48); });
}

function normTime(v) {
  var s = normDigits(String(v == null ? "" : v).toLowerCase()).trim();
  if (!s) return "";
  var isPm = /(pm|p\.m|\u0645)/.test(s);      // م = PM
  var isAm = /(am|a\.m|\u0635)/.test(s);      // ص = AM
  var m = s.match(/(\d{1,2})\s*[:.\u066B\u066C]?\s*(\d{1,2})?/);
  if (!m) return "";
  var h = parseInt(m[1], 10);
  var mi = m[2] ? parseInt(m[2], 10) : 0;
  if (!isFinite(h)) return "";
  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  if (h > 23 || mi > 59) return "";
  return pad(h) + ":" + pad(mi);
}

function normKind(v) {
  var s = String(v == null ? "" : v).toLowerCase();
  if (/lab|معمل|لاب|مختبر/.test(s)) return "lab";
  if (/section|sec\b|سكشن|تطبيق|عملي|تمرين/.test(s)) return "section";
  return "lecture";
}

// Turn whatever the model produced into a flat, clean list we can show for review.
function normalizeScan(raw) {
  var out = [];
  var groups = raw && (raw.subjects || raw.entries || raw.classes);
  if (!Array.isArray(groups)) return out;

  groups.forEach(function (grp) {
    if (!grp) return;
    var name = String(grp.name || grp.subject || grp.title || "").trim();
    var entries = grp.entries || grp.classes || grp.lessons || [];
    if (!Array.isArray(entries)) entries = [];
    if (!name) return;

    entries.forEach(function (e) {
      if (!e) return;
      var day = dayIndex(e.day != null ? e.day : e.weekday);
      if (day < 0) return;
      out.push({
        subject: name,
        kind: normKind(e.kind || e.type),
        day: day,
        time: normTime(e.start || e.time || e.from),
        place: String(e.place || e.room || e.hall || e.location || "").trim()
      });
    });
  });

  return out.sort(function (a, b) {
    return a.day - b.day || String(a.time).localeCompare(String(b.time)) || a.subject.localeCompare(b.subject);
  });
}

// ===== asking the model =====
function scanAsk(file) {
  var prompt = scanPrompt();
  var i = 0;

  function attempt() {
    if (i >= SCAN_MODELS.length) {
      return Promise.reject(new Error("The AI didn't return anything usable. Try again, or add the classes by hand."));
    }
    var model = SCAN_MODELS[i++];
    var guard = new Promise(function (_, rej) {
      setTimeout(function () { rej(new Error("The AI took too long to answer. Try again.")); }, SCAN_TIMEOUT_MS);
    });
    var call = model === null ? puter.ai.chat(prompt, file) : puter.ai.chat(prompt, file, { model: model });

    return Promise.race([call, guard]).then(function (resp) {
      var parsed = extractJson(responseText(resp));
      if (parsed) return parsed;
      return attempt();                      // unreadable answer -> try the next model
    }).catch(function (e) {
      var m = String((e && e.message) || e).toLowerCase();
      if (/auth|sign|permission|denied|cancel|too long/.test(m)) {
        throw new Error(/too long/.test(m)
          ? "The AI took too long to answer. Try again."
          : "Puter sign-in was cancelled or blocked. Allow pop-ups and try again.");
      }
      return attempt();
    });
  }

  return attempt();
}

// ===== the flow =====
function scanTimetable() {
  openModal(
    '<h2>Scan a timetable</h2>' +
    '<div class="muted">Pick a photo of your college timetable. The AI reads it, then shows you every class it found so you can check them before saving.</div>' +
    '<input type="file" id="scanFile" accept="image/*" style="display:none">' +
    '<div class="btns" style="margin-top:12px"><button class="ok" id="scanPick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Choose photo</button></div>' +
    '<div class="muted" style="margin-top:3cqw">This is the only part of Lektra that needs internet. The photo is read by <b>Puter</b>, which asks you to sign in free the first time. Nothing else ever leaves your device.</div>',
    null
  );
  document.getElementById("scanPick").onclick = function () { document.getElementById("scanFile").click(); };
  document.getElementById("scanFile").onchange = function () {
    var f = this.files && this.files[0];
    if (f) scanRun(f);
  };
}

function scanRun(file) {
  openModal(
    '<h2>Reading your timetable…</h2>' +
    '<div class="muted" id="scanMsg">Preparing the photo…</div>' +
    '<img id="scanPrev" alt="" style="width:100%;border-radius:14px;margin-top:12px;display:block">',
    null
  );
  var prev = document.getElementById("scanPrev");
  var msg = document.getElementById("scanMsg");
  try { prev.src = URL.createObjectURL(file); } catch (e) {}

  shrinkImage(file)
    .then(function (small) {
      msg.textContent = "Asking the AI to read it…";
      return loadPuter().then(function () {
        if (puter.auth && typeof puter.auth.isSignedIn === "function" && !puter.auth.isSignedIn()) {
          msg.textContent = "Waiting for you to sign in to Puter…";
        }
        return scanAsk(small);
      });
    })
    .then(function (raw) {
      var entries = normalizeScan(raw);
      if (!entries.length) {
        scanFail("I couldn't find any classes in that photo. Try a straighter, clearer shot with the whole table in frame.");
        return;
      }
      scanReview(entries);
    })
    .catch(function (e) {
      scanFail(e && e.message ? e.message : "Something went wrong.");
    });
}

function scanFail(message) {
  openModal(
    "<h2>Couldn't read that</h2><div class=\"muted\">" + esc(message) + "</div>" +
    '<div class="btns" style="margin-top:12px"><button class="ok" id="scanRetry">Try again</button></div>',
    null
  );
  document.getElementById("scanRetry").onclick = scanTimetable;
}

// ===== review before anything is saved =====
function scanReview(entries) {
  var html = '<h2>Check what I found</h2><div class="muted">' + entries.length + " class" +
    (entries.length > 1 ? "es" : "") + " detected. Uncheck anything wrong, fix the details, then save.</div><div id=\"scanList\">";

  entries.forEach(function (e, n) {
    html += '<div class="srow"><div class="shead"><input type="checkbox" class="pick" checked>' +
      '<span class="sidx">' + (n + 1) + "</span>" +
      '<input class="sname" value="' + esc(e.subject) + '" placeholder="Subject"></div>' +
      '<div class="sbody">' +
      '<span class="flab">Type</span><div class="kseg">' +
      ["lecture", "section", "lab"].map(function (k) {
        return '<button type="button" data-k="' + k + '"' + (e.kind === k ? ' class="on"' : "") + ">" + kindLabel(k) + "</button>";
      }).join("") + "</div>" +
      '<span class="flab">Day</span><div class="days">' +
      SHORT.map(function (d, idx) {
        return '<button type="button" class="dp' + (e.day === idx ? " on" : "") + '" data-d="' + idx + '">' + d + "</button>";
      }).join("") + "</div>" +
      '<div class="sline"><div><span class="flab">Time</span>' +
      '<input class="stime" type="time" value="' + esc(e.time) + '"></div>' +
      '<div><span class="flab">Place</span>' +
      '<input class="splace" value="' + esc(e.place) + '" placeholder="Hall 3"></div></div>' +
      "</div></div>";
  });

  html += "</div>" +
    '<div class="btns" style="margin-top:12px"><button class="ok" id="scanSave">Save classes</button></div>' +
    '<div class="btns" style="margin-top:8px"><button id="scanAgain">Try another photo</button></div>';

  openModal(html, null);
  document.getElementById("scanSave").onclick = saveScan;
  document.getElementById("scanAgain").onclick = scanTimetable;

  // Type / Day act as radio groups; unchecking dims the card so it reads as skipped
  Array.prototype.forEach.call(document.querySelectorAll(".srow"), function (row) {
    row.querySelector(".pick").onclick = function () { row.classList.toggle("off", !this.checked); };
    [".kseg", ".days"].forEach(function (sel) {
      var group = row.querySelector(sel);
      Array.prototype.forEach.call(group.children, function (b) {
        b.onclick = function () {
          Array.prototype.forEach.call(group.children, function (o) { o.classList.remove("on"); });
          b.classList.add("on");
        };
      });
    });
  });
}

function saveScan() {
  var added = 0, newSubjects = 0;

  Array.prototype.forEach.call(document.querySelectorAll(".srow"), function (row) {
    var pick = row.querySelector(".pick");
    if (!pick || !pick.checked) return;
    var name = row.querySelector(".sname").value.trim();
    if (!name) return;

    var kbtn = row.querySelector(".kseg .on");
    var dbtn = row.querySelector(".days .on");
    var kind = kbtn ? kbtn.getAttribute("data-k") : "lecture";
    var day = dbtn ? parseInt(dbtn.getAttribute("data-d"), 10) : 0;
    var time = row.querySelector(".stime").value || "";
    var place = row.querySelector(".splace").value.trim() || "TBA";

    var sub = state.subjects.filter(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })[0];
    if (!sub) {
      sub = { id: uid(), name: name, files: [] };
      state.subjects.push(sub);
      newSubjects++;
    }

    var already = state.lectures.some(function (l) {
      return l.subjectId === sub.id && l.kind === kind && l.weekday === day && (l.time || "") === time;
    });
    if (already) return;

    state.lectures.push({ id: uid(), subjectId: sub.id, kind: kind, weekday: day, time: time, place: place });
    added++;
  });

  save(); render(); closeModal();
  if (!added) { toast("Nothing new to add"); return; }
  toast("Added " + added + " class" + (added > 1 ? "es" : "") +
    (newSubjects ? " · " + newSubjects + " new subject" + (newSubjects > 1 ? "s" : "") : ""));
}
