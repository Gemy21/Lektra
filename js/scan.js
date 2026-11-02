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
var SCAN_MAX_BYTES = 900 * 1024;        // small enough already? don't re-encode it
var SCAN_QUALITY = 0.86;
var SCAN_TIMEOUT_MS = 90000;
var SCAN_MODELS = ["gpt-5.6-luna", null, "gemini-3.1-flash-lite"];  // null = Puter's default
var scanLoader = null;
var scanSeq = 0;
var scanPreviewUrl = "";
var scanTicker = null;      // ticker that keeps the elapsed clock alive
var scanStartedAt = 0;
var scanStageAt = 0;

function revokeScanPreview() {
  if (scanPreviewUrl) {
    try { URL.revokeObjectURL(scanPreviewUrl); } catch (e) {}
    scanPreviewUrl = "";
  }
}

// Called when the sheet closes: invalidate the in-flight request, stop the
// clock and free the preview image, so a late AI answer cannot pop the sheet
// back open.
function cancelScan() {
  scanSeq++;
  scanTickStop();
  revokeScanPreview();
}

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

// ===== shrink the photo (the fallback path) =====
// The worker below normally does this, off the main thread. This version is for
// browsers without workers or OffscreenCanvas: createImageBitmap() still
// decodes off the main thread, but the JPEG encode can still hiccup here.
function shrinkImage(file) {
  if (!/^image\//.test(file.type)) return Promise.resolve(file);
  if (typeof createImageBitmap !== "function") return shrinkImageLegacy(file);

  return createImageBitmap(file).then(function (bmp) {
    var w = bmp.width || 1, h = bmp.height || 1;
    var scale = Math.min(1, SCAN_MAX_PX / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));

    // Already a small, sensible JPEG: send it untouched.
    if (scale === 1 && file.size <= SCAN_MAX_BYTES) return file;

    if (typeof OffscreenCanvas === "function") {
      var off = new OffscreenCanvas(cw, ch);
      off.getContext("2d").drawImage(bmp, 0, 0, cw, ch);
      if (bmp.close) bmp.close();
      return off.convertToBlob({ type: "image/jpeg", quality: SCAN_QUALITY }).then(function (blob) {
        return blob ? new File([blob], "timetable.jpg", { type: "image/jpeg" }) : file;
      });
    }

    // No OffscreenCanvas: draw into a normal canvas, but at least the decode
    // above already happened off the main thread.
    var c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    c.getContext("2d").drawImage(bmp, 0, 0, cw, ch);
    if (bmp.close) bmp.close();
    return new Promise(function (resolve) {
      c.toBlob(function (blob) {
        resolve(blob ? new File([blob], "timetable.jpg", { type: "image/jpeg" }) : file);
      }, "image/jpeg", SCAN_QUALITY);
    });
  }).catch(function () {
    return shrinkImageLegacy(file);
  });
}

function shrinkImageLegacy(file) {
  return new Promise(function (resolve) {
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
        }, "image/jpeg", SCAN_QUALITY);
      } catch (e) { URL.revokeObjectURL(url); resolve(file); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ===== hand the photo work to a worker =====
// Encoding the JPEG alone blocks the page for ~130 ms on a laptop and several
// times that on a phone, which is the part that made scanning feel frozen. The
// worker below keeps the spinner and the clock moving; if it is unavailable the
// code above does the same job here instead.
var scanWorker = null;
var scanWorkerBroken = false;
var scanWorkerSeq = 0;
var scanWorkerJobs = {};

function scanWorkerAnswer(d) {
  var job = scanWorkerJobs[d.id];
  if (!job) return;                     // cancelled, or already answered
  delete scanWorkerJobs[d.id];
  clearTimeout(job.timer);
  if (d.blob) {
    job.resolve(new File([d.blob], "timetable.jpg", { type: "image/jpeg" }));
    return;
  }
  if (d.skip) { job.resolve(job.file); return; }
  shrinkImage(job.file).then(job.resolve);   // error / unsupported
}

function scanWorkerStop() {
  var pending = scanWorkerJobs;
  scanWorkerJobs = {};
  try { if (scanWorker) scanWorker.terminate(); } catch (e) {}
  scanWorker = null;
  return pending;
}

function scanWorkerStart() {
  if (scanWorker) return scanWorker;
  if (scanWorkerBroken || typeof Worker !== "function") { scanWorkerBroken = true; return null; }
  try {
    scanWorker = new Worker("js/scan-worker.js");
  } catch (e) {
    scanWorkerBroken = true;
    scanWorker = null;
    return null;
  }
  scanWorker.onmessage = function (e) { scanWorkerAnswer(e.data || {}); };
  scanWorker.onerror = function () {
    // Don't retry a broken worker on every scan: finish what is pending here
    // and use the main-thread path from now on.
    scanWorkerBroken = true;
    var pending = scanWorkerStop();
    Object.keys(pending).forEach(function (k) {
      var job = pending[k];
      clearTimeout(job.timer);
      shrinkImage(job.file).then(job.resolve);
    });
  };
  return scanWorker;
}

function scanPrepTimetable(file) {
  if (!/^image\//.test(file.type)) return shrinkImage(file);
  var w = scanWorkerStart();
  if (!w) return shrinkImage(file);
  return new Promise(function (resolve) {
    var id = ++scanWorkerSeq;
    var job = { file: file, resolve: resolve, timer: null };
    scanWorkerJobs[id] = job;
    // Watchdog: a worker that hangs must not leave the card spinning forever.
    job.timer = setTimeout(function () {
      if (!scanWorkerJobs[id]) return;
      delete scanWorkerJobs[id];
      scanWorkerBroken = true;
      try { scanWorker.terminate(); } catch (e) {}
      scanWorker = null;
      shrinkImage(file).then(resolve);
    }, 15000);
    try {
      w.postMessage({ id: id, file: file });
    } catch (e) {
      delete scanWorkerJobs[id];
      clearTimeout(job.timer);
      scanWorkerBroken = true;
      shrinkImage(file).then(resolve);
    }
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
// onStage is optional: it is called with the attempt number so the loading card
// can say "trying a different model" instead of looking stuck on one line.
function scanAsk(file, onStage) {
  var prompt = scanPrompt();
  var i = 0;

  function attempt() {
    if (i >= SCAN_MODELS.length) {
      return Promise.reject(new Error("The AI didn't return anything usable. Try again, or add the classes by hand."));
    }
    var model = SCAN_MODELS[i++];
    if (onStage) { try { onStage(i); } catch (e) {} }
    var timer = null;
    var guard = new Promise(function (_, rej) {
      timer = setTimeout(function () { rej(new Error("The AI took too long to answer. Try again.")); }, SCAN_TIMEOUT_MS);
    });
    var call;
    try {
      call = model === null ? puter.ai.chat(prompt, file) : puter.ai.chat(prompt, file, { model: model });
    } catch (e) {
      clearTimeout(timer);
      return Promise.reject(e);
    }

    return Promise.race([call, guard]).then(function (resp) {
      clearTimeout(timer);
      var parsed = extractJson(responseText(resp));
      if (parsed) return parsed;
      return attempt();                      // unreadable answer -> try the next model
    }).catch(function (e) {
      clearTimeout(timer);
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
var ATTACH_PHOTO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15.5" rx="4"/><circle cx="8.3" cy="9.6" r="1.5"/><path d="M4.2 17.4l4.9-4.9 3.8 3.8 2.2-2.2 4.7 4.7"/><path d="M18.5 2.2v4M16.5 4.2h4"/></svg>';
var ATTACH_CAMERA_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.4 8.2h3.1l1.6-2.4h5.8l1.6 2.4h3.1a1.2 1.2 0 0 1 1.2 1.2v9a1.2 1.2 0 0 1-1.2 1.2H4.4a1.2 1.2 0 0 1-1.2-1.2v-9a1.2 1.2 0 0 1 1.2-1.2z"/><circle cx="12" cy="13.4" r="3.4"/><path d="M18.5 2.2v4M16.5 4.2h4"/></svg>';

// Photo picker sheet used by the composer's paperclip. Two big choices, then
// the existing scan flow takes over once a photo is picked.
function openAttachSheet() {
  openModal(
    '<div class="attach-grid">' +
      '<button type="button" class="attach-card" id="attachLibrary">' +
        '<span class="attach-icon">' + ATTACH_PHOTO_ICON + '</span>' +
        '<span class="attach-name">Photo Library</span>' +
        '<span class="attach-sub">A screenshot or a photo</span>' +
      '</button>' +
      '<button type="button" class="attach-card" id="attachCamera">' +
        '<span class="attach-icon">' + ATTACH_CAMERA_ICON + '</span>' +
        '<span class="attach-name">Camera</span>' +
        '<span class="attach-sub">Shoot the whole table</span>' +
      '</button>' +
    '</div>' +
    '<div class="attach-note">Lektra reads the dates and times out of the picture.</div>' +
    '<input type="file" id="attachLibraryFile" accept="image/*" style="display:none">',
    null
  );
  var box = document.getElementById("box");
  box.classList.add("attachsheet");
  var handle = box.querySelector(".handle");
  if (handle) handle.remove();
  var btns = box.querySelector(".btns");
  if (btns) btns.remove();

  document.getElementById("attachLibrary").onclick = function () {
    document.getElementById("attachLibraryFile").click();
  };
  document.getElementById("attachCamera").onclick = function () {
    closeModal();
    if (typeof openCamera === "function") openCamera();
  };
  document.getElementById("attachLibraryFile").onchange = function () {
    var f = this.files && this.files[0];
    if (!f) return;
    // Hand straight over to the progress card: closing first would flash the
    // picker away and back again.
    scanRun(f);
  };
}

// Every way into the scan (Settings, the Subjects tab, and the two retry
// buttons in the scan flow) opens the same picker the composer's paperclip
// uses, so there is one place to choose a photo from.
function scanTimetable() {
  openAttachSheet();
}

// ===== the loading card =====
// Two frames: one rAF can still land in the same paint as the tap, so wait for
// the next one to guarantee the card is on screen before the work begins. The
// timeout matters too: rAF is paused while the tab is in the background, and a
// scan must not sit still because someone switched apps for a second.
function nextPaint() {
  return new Promise(function (resolve) {
    var done = false;
    function finish() { if (!done) { done = true; resolve(); } }
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () {
        requestAnimationFrame(finish);
      });
    }
    setTimeout(finish, 120);
  });
}

function scanElapsed(ms) {
  var s = Math.max(0, Math.floor(ms / 1000));
  if (s < 1) return "";
  if (s < 60) return s + "s";
  return Math.floor(s / 60) + ":" + pad(s % 60);
}

// The clock is not decoration: it is the difference between "the app is doing
// something" and "the app has frozen". It ticks whether or not a stage changes.
function scanTickStop() {
  if (scanTicker) { clearInterval(scanTicker); scanTicker = null; }
}

function scanTickStart() {
  scanTickStop();
  scanStartedAt = Date.now();
  scanStageAt = scanStartedAt;
  scanTicker = setInterval(function () {
    var clock = document.getElementById("scanClock");
    if (!clock) { scanTickStop(); return; }   // card was replaced or closed
    clock.textContent = scanElapsed(Date.now() - scanStartedAt);
    var msg = document.getElementById("scanMsg");
    if (msg && Date.now() - scanStageAt > 18000) {
      msg.textContent = "Still working — big timetables take a moment…";
      scanStageAt = Date.now();
    }
  }, 500);
}

// Move the bar and the status line together, so progress and words never
// disagree about which step is running.
function scanStage(pct, label) {
  var fill = document.getElementById("scanFill");
  var msg = document.getElementById("scanMsg");
  var track = fill ? fill.parentElement : null;
  if (fill) fill.style.width = pct + "%";
  if (track) track.setAttribute("aria-valuenow", String(pct));
  if (msg && label) msg.textContent = label;
  scanStageAt = Date.now();
}

function scanSignedIn() {
  try {
    return !!(typeof puter !== "undefined" && puter.auth &&
      typeof puter.auth.isSignedIn === "function" && puter.auth.isSignedIn());
  } catch (e) { return false; }
}

function scanReadLabel(attempt) {
  if (attempt > 1) return "Trying a different model…";
  return scanSignedIn() ? "Asking the AI to read it…" : "Waiting for you to sign in to Puter…";
}

function scanFileMeta(file) {
  var parts = [];
  var kb = file && file.size ? Math.round(file.size / 1024) : 0;
  if (kb >= 1024) parts.push((kb / 1024).toFixed(1) + " MB");
  else if (kb > 0) parts.push(kb + " KB");
  var type = ((file && file.type) || "").replace("image/", "").toUpperCase();
  if (type) parts.push(type);
  return parts.join(" · ");
}

// The progress card, in the same floating shape as the photo picker, so
// choosing a photo turns into progress instead of swapping sheets.
function scanBusyOpen(file) {
  openModal(
    '<div class="scan-ring" aria-hidden="true"></div>' +
    '<h2>Reading your timetable</h2>' +
    '<div class="scan-now"><span id="scanMsg" aria-live="polite">Preparing the photo…</span><b class="scan-clock" id="scanClock"></b></div>' +
    '<div class="scan-track" role="progressbar" aria-label="Scan progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="scan-fill" id="scanFill"></i></div>' +
    '<div class="scan-photo"><img id="scanPrev" alt=""><div class="i"><b>Your photo</b><span id="scanMeta"></span></div></div>' +
    '<button type="button" class="scan-cancel" id="scanCancel">Cancel</button>',
    null
  );
  var box = document.getElementById("box");
  box.className = "box scanbusy";
  var handle = box.querySelector(".handle");
  if (handle) handle.remove();
  var btns = box.querySelector(".btns");
  if (btns) btns.remove();
  document.getElementById("scanCancel").onclick = closeModal;

  var meta = document.getElementById("scanMeta");
  if (meta) meta.textContent = scanFileMeta(file);
  try {
    scanPreviewUrl = URL.createObjectURL(file);
    document.getElementById("scanPrev").src = scanPreviewUrl;
  } catch (e) {}
}

// The scan is a short pipeline, not one blocking call: prepare -> send -> read
// -> check. Each step repaints the card and yields, so the clock and the bar
// keep moving however long the network takes.
function scanRun(file) {
  cancelScan();
  var run = scanSeq;

  scanBusyOpen(file);
  scanTickStart();
  scanStage(6, "Preparing the photo…");

  // The AI helper is a network download, so start it now and let it overlap the
  // image work instead of making the student wait for one, then the other.
  var sdk = loadPuter();
  sdk.catch(function () {});          // re-reported below; keeps it "handled"

  nextPaint()
    .then(function () {
      if (run !== scanSeq) return null;
      return scanPrepTimetable(file);
    })
    .then(function (small) {
      if (run !== scanSeq) return null;
      scanStage(38, typeof puter === "undefined" ? "Loading the AI helper…" : "Sending the photo…");
      return sdk.then(function () { return small; });
    })
    .then(function (small) {
      if (run !== scanSeq) return null;
      scanStage(64, scanReadLabel(1));
      return scanAsk(small, function (attempt) {
        if (run !== scanSeq) return;
        scanStage(64, scanReadLabel(attempt));
      });
    })
    .then(function (raw) {
      if (run !== scanSeq) return;
      scanStage(94, "Checking the classes…");
      var entries = normalizeScan(raw);
      return nextPaint().then(function () {
        if (run !== scanSeq) return;
        scanTickStop();
        revokeScanPreview();
        if (!entries.length) {
          scanFail("I couldn't find any classes in that photo. Try a straighter, clearer shot with the whole table in frame.");
          return;
        }
        scanReview(entries);
      });
    })
    .catch(function (e) {
      if (run !== scanSeq) return;
      scanTickStop();
      revokeScanPreview();
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

// ===== don't lose a scan by accident =====
// The detected classes live only inside the review sheet until Save, so every
// way out of it (Close button, backdrop tap, drag down) asks first. The warning
// is a layer on top: the sheet and everything typed into it stay untouched.
function removeScanWarn() {
  var w = document.querySelector(".scan-warn");
  if (w) w.remove();
}

function askBeforeDiscardScan() {
  if (document.querySelector(".scan-warn")) return false;   // already asking
  var modal = document.getElementById("modal");
  if (!modal) return true;

  var wrap = document.createElement("div");
  wrap.className = "scan-warn";
  wrap.innerHTML =
    '<div class="scan-warn-card" role="alertdialog" aria-modal="true" aria-labelledby="scanWarnTitle">' +
      '<b id="scanWarnTitle">Discard these classes?</b>' +
      '<p>They have not been saved yet. If you close now the scan is gone and you will have to read the photo again.</p>' +
      '<div class="scan-warn-btns">' +
        '<button type="button" id="scanWarnStay">Keep editing</button>' +
        '<button type="button" class="danger" id="scanWarnGo">Discard</button>' +
      '</div>' +
    '</div>';
  modal.appendChild(wrap);

  wrap.onclick = function (e) { if (e.target === wrap) removeScanWarn(); };
  document.getElementById("scanWarnStay").onclick = removeScanWarn;
  document.getElementById("scanWarnGo").onclick = function () {
    removeScanWarn();
    modalCloseGuard = null;        // they chose to leave: don't ask twice
    closeModal();
  };
  return false;                    // keep the review sheet open for now
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

  // Nothing is saved yet: every way out of this sheet asks first.
  modalCloseGuard = askBeforeDiscardScan;

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
  // Saving is the finish line, not a discard: don't ask on the way out.
  modalCloseGuard = null;
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
