// ===== Voice + typing: say or type a sentence, the app fills the form, you confirm =====
var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
var rec = null;

function digits(text) { return text.replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }); }
function clean(text) {
  var t = digits(text.toLowerCase());
  return t.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
}
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

var DAY_WORDS = [
  ["sunday", "الاحد"], ["monday", "الاثنين", "الاتنين"], ["tuesday", "الثلاثاء", "التلات"],
  ["wednesday", "الاربعاء", "الاربع"], ["thursday", "الخميس"], ["friday", "الجمعه"], ["saturday", "السبت"]
];
var MONTH_WORDS = [
  ["january", "يناير"], ["february", "فبراير"], ["march", "مارس"], ["april", "ابريل"], ["may", "مايو"], ["june", "يونيو"],
  ["july", "يوليو"], ["august", "اغسطس"], ["september", "سبتمبر"], ["october", "اكتوبر"], ["november", "نوفمبر"], ["december", "ديسمبر"]
];

// weekday number (0 = Sunday) or null
function findDay(t) {
  for (var i = 0; i < 7; i++)
    for (var j = 0; j < DAY_WORDS[i].length; j++) if (t.indexOf(DAY_WORDS[i][j]) !== -1) return i;
  if (/بكره|بكرا|tomorrow/.test(t)) return (today.getDay() + 1) % 7;
  if (/النهارده|انهارده|today/.test(t)) return today.getDay();
  return null;
}

// a real date for quiz / deadline / midterm, or null
function monthPattern(name) {
  // wrap plain English month names in word boundaries so "may" can't match "maybe"
  return /^[a-z]+$/.test(name) ? "\\b" + name + "\\b" : name;
}
function findDate(t) {
  var base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (var mo = 0; mo < 12; mo++) {
    for (var w = 0; w < 2; w++) {
      var name = MONTH_WORDS[mo][w];
      var pat = monthPattern(name);
      var m = t.match(new RegExp("(\\d{1,2})\\s*(?:من|of)?\\s*" + pat)) || t.match(new RegExp(pat + "\\s*(\\d{1,2})"));
      if (m) {
        var d = new Date(base.getFullYear(), mo, +m[1]);
        if (d < base) d = new Date(base.getFullYear() + 1, mo, +m[1]);
        return d;
      }
    }
  }
  var s = t.match(/(\d{1,2})\/(\d{1,2})/);
  if (s) {
    var d2 = new Date(base.getFullYear(), +s[2] - 1, +s[1]);
    if (d2 < base) d2 = new Date(base.getFullYear() + 1, +s[2] - 1, +s[1]);
    return d2;
  }
  if (/بعد بكره|بعد بكرا|day after tomorrow/.test(t)) return addDays(base, 2);
  if (/بكره|بكرا|tomorrow/.test(t)) return addDays(base, 1);
  if (/النهارده|انهارده|today/.test(t)) return base;
  var wd = findDay(t);
  if (wd !== null) {
    var diff = (wd - base.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // "Saturday" said on a Saturday means next Saturday
    return addDays(base, diff);
  }
  return null;
}

function findTime(t) {
  var m = t.match(/(?:الساعه|\bat|عند)\s*(\d{1,2})(?:[:.](\d{2}))?/) ||
    t.match(/(\d{1,2})[:.](\d{2})/) ||
    t.match(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(?:am|pm|a\.m|p\.m|صباحا|الصبح|مساء|بالليل|العصر|الضهر|الظهر|ظهر)/);
  if (!m) return null;
  var h = +m[1], min = m[2] ? +m[2] : 0;
  if (h > 23) return null;
  // "10 ونص" / "10 و نص" belongs to the time immediately before it. Looking
  // for "ونص" anywhere in the sentence used to put "ونص" into the subject and
  // could also change an explicit 10:15 into 10:30.
  if (!m[2]) {
    var rest = t.slice(m.index + m[0].length);
    var half = rest.match(/^\s*(?:و\s*)?(نص|ربع)(?=\s|$|[،,.!?؛])/);
    if (half) min = half[1] === "نص" ? 30 : 15;
  }
  var pm = /مساء|بالليل|العصر|العشا|بعد الظهر|الضهر|الظهر|ظهر|\bpm\b|p\.m/.test(t);
  var am = /صباحا|الصبح|\bam\b|a\.m/.test(t);
  if (pm && h < 12) h += 12;
  else if (!am && h >= 1 && h <= 6) h += 12; // a lecture at 3 means 3 PM
  return pad(h) + ":" + pad(min);
}

function findSubject(t) {
  var best = null;
  state.subjects.forEach(function (s) {
    var name = clean(s.name).trim();
    if (name && t.indexOf(name) !== -1 && (!best || name.length > clean(best.name).length)) best = s;
  });
  return best ? best.id : null;
}

function findPlace(raw) {
  var words = "(?:ال)?(?:قاعه|قاعة|مدرج|معمل|لاب|مبني|مبنى|hall|room|lab|building)";
  var m = raw.match(new RegExp("(?:في|in|at)\\s*(" + words + "\\s*.*)", "i")) || raw.match(new RegExp("(" + words + "\\s*.*)", "i"));
  if (!m) return "";
  return m[1].split(/\s(?:يوم|الساعه|الساعة|at|on)\s/i)[0].trim();
}

// what kind of entry is it? quiz / deadline / midterm / final are dated, the rest repeat weekly
function explicitKind(t) {
  if (/كويز|quiz/.test(t)) return "quiz";
  if (/تسليم|ديدلاين|deadline|\bdue\b|submission|assignment|واجب/.test(t)) return "deadline";
  if (/ميد ?ت[يا]?رم|mid ?-?term/.test(t)) return "midterm";
  if (/فاينل|final|نهائي/.test(t)) return "final";
  if (/سكشن|section/.test(t)) return "section";
  if (/محاضره|lecture/.test(t)) return "lecture";
  // "lab" is a type only when it is not just the place ("in lab 2")
  var withoutPlace = t.replace(/(?:في|in|at)\s*(?:ال)?(?:لاب|\blab|معمل)\S*(?:\s*\d+)?/g, "");
  if (/لاب|\blab\b|معمل/.test(withoutPlace)) return "lab";
  return null;
}
function findKind(t) { return explicitKind(t) || "lecture"; }

// the extra note: "quiz in the section", "project deadline" ...
function findNote(t) {
  if (/مشروع|project/.test(t)) return "Project";
  if (/سكشن|section/.test(t)) return "Section";
  if (/لاب|معمل|\blab\b/.test(t)) return "Lab";
  if (/محاضره|lecture/.test(t)) return "Lecture";
  if (/تقرير|report/.test(t)) return "Report";
  return "";
}

function prettySubject(name) {
  name = String(name || "").trim();
  if (!name) return "";
  return /^[a-z]/.test(name) ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

// The offline parser used to understand one entry per sentence. A chat message
// can describe several: "lecture Logic Thursday 9 and section Logic 12:30".
// Pull a readable subject out of the words around the kind when the student has
// not created that subject yet, so the preview can still show it.
function guessSubjectName(raw, kind) {
  var s = String(raw || "").replace(/[\u064B-\u0652\u0640]/g, "").trim();
  if (!s) return "";
  var kindRe = /(?:محاضره|محاضرة|lecture|سكشن|section|لاب|lab|معمل|كويز|quiz|ميدتيرم|midterm|فاينل|final|تسليم|ديدلاين|deadline|واجب|assignment)/i;
  var m = s.match(kindRe);
  var rest = m ? s.slice(m.index + m[0].length) : s;
  rest = rest.replace(/^[\s:،,.\-]+/, "");
  // No \b after the Arabic alternatives: JavaScript treats Arabic letters as
  // non-word characters, so a \b between "الساعة" and a space never matches.
  // That bug left "الساعة 10 ونص" inside the subject name.
  var stop = /\s+(?:يوم|الساعه|الساعة|at|on|in|from|في|ونص|و\s*نص|وربع|و\s*ربع|الاحد|الاثنين|الاتنين|الثلاثاء|التلات|الاربعاء|الاربع|الخميس|الجمعه|السبت|sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?=\s|$|[،,.!?؛])/i;
  var cut = rest.split(stop)[0].replace(/\s+/g, " ").trim();
  var junk = /^(?:عندي|عند|لدي|في|من|على|يوم|الساعه|الساعة|ساعه|ساعة|اليوم|today|tomorrow|بكره|بكرا|الصبح|مساء|الضهر|الظهر|ظهر|ونص|نص|وربع|ربع|و|ال|am|pm|the|a|an|my|i|have|there|is|الاحد|الاثنين|الاتنين|الثلاثاء|التلات|الاربعاء|الاربع|الخميس|الجمعه|السبت|sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i;
  function usable(w) {
    return w && !junk.test(w) && !/^\d{1,2}(?::\d{2})?$/.test(w);
  }
  var words = cut.split(" ").filter(usable);
  cut = words.slice(0, 3).join(" ").replace(/[.,;:!?،؛]+$/, "").trim();
  if (!cut && m && m.index > 0) {
    var before = s.slice(0, m.index).replace(/\s+/g, " ").trim();
    var bw = before.split(" ").filter(usable);
    cut = bw.slice(-3).join(" ").replace(/[.,;:!?،؛]+$/, "").trim();
  }
  // "سكشن الـ AI" → the section label is AI, not a subject called "ال AI".
  cut = cut.replace(/^ال[ـ\s-]*(?=[A-Za-z])/i, "").trim();
  cut = cut.replace(/\s+(?:و\s*)?(?:نص|ربع)$/i, "").trim();
  if (!/[A-Za-z\u0600-\u06FF]/.test(cut)) cut = "";
  if (cut.length > 40) cut = cut.slice(0, 40).trim();
  return cut;
}

// Split a chat sentence on conjunctions, but only when "و" is a conjunction.
// Attached Arabic words such as "واجب" must survive intact.
function splitPhrase(text) {
  var raw = digits(String(text || "")).trim();
  if (!raw) return [];
  // A standalone "و" before نص/ربع is part of the time ("10 و نص"), not a
  // conjunction. Splitting it used to drop the half-hour and add "ونص" to the
  // subject of the next card.
  var parts = raw.split(/\s*(?:[,;،؛]|\n+|\s+and\s+|\s+then\s+|\s+ثم\s+|\s+و\s+(?!(?:نص|ربع|الا|إلا)(?=\s|$|[،,.!?؛]))|\s+و(?=(?:سكشن|محاضره|محاضرة|لاب|معمل|كويز|quiz|lecture|section|lab|ميد|midterm|فاينل|final|تسليم|ديدلاين|deadline|واجب|assignment|\d)))\s*/i);
  return parts.map(function (p) { return p.trim(); }).filter(Boolean);
}

// Return every entry a sentence describes. The first card keeps the full day
// and date; later cards inherit them, which is how "and the section at 12:30"
// works in normal speech.
function parsePhrase(text, icon) {
  var rawText = digits(String(text || ""));
  var full = clean(rawText);
  var fallbackDay = findDay(full);
  var fallbackDate = findDate(full);
  var segments = splitPhrase(rawText);
  if (!segments.length) segments = [rawText];
  var out = [], lastDow = null, lastDate = null, lastKind = null, lastSubjectId = null, lastSubjectName = "";

  segments.forEach(function (seg, idx) {
    var raw = digits(seg).trim();
    var t = clean(seg);
    var kx = explicitKind(t);
    var time = findTime(t);
    var subjectId = findSubject(t);
    var place = findPlace(raw);
    var note = findNote(t);
    var day = findDay(t);
    var date = findDate(t);

    // A segment with no entry signal is filler. At the start it may just be a
    // day ("Thursday"): keep it as a default entry. Later it can refine the
    // previous card instead of creating a duplicate.
    if (!kx && !time && !subjectId && !place && !note) {
      if (idx > 0) {
        if (out.length) {
          var prev = out[out.length - 1];
          if (day !== null && prev.weekday != null) { prev.weekday = day; lastDow = day; }
          if (date && prev.date) { prev.date = iso(date); lastDate = date; }
        }
        return;
      }
      if (day === null && date === null) return;
    }

    // "and in Hall 3" / "with a note" belongs to the card above, not a new one.
    if (idx > 0 && !kx && !time && !subjectId && out.length) {
      var last = out[out.length - 1];
      if (place && !note) {
        if (last.weekday != null) last.place = place;
        return;
      }
      if (note && !place) {
        if (last.date) last.note = note;
        return;
      }
    }

    var kind = kx || lastKind || "lecture";
    // "سكشن الـ AI" means the AI section, so keep AI as the subject. It used
    // to be forced back to the previous subject ("Logic") and the card showed
    // "سكشن" above "Logic" even though the student said "الـ AI".
    var dow = day;
    if (dow === null) dow = lastDow !== null ? lastDow : fallbackDay;
    if (dow === null) dow = today.getDay();
    var dayExplicit = day !== null || fallbackDay !== null;
    var dateObj = date || lastDate || fallbackDate || today;
    var guessed = guessSubjectName(raw, kx || kind);
    // "section in Hall 3" describes the place, not a subject called "Hall".
    if (guessed && /^(?:ال)?(?:قاعه|قاعة|مدرج|معمل|لاب|مبني|مبنى|hall|room|lab|building)(?:\s|$)/i.test(guessed)) guessed = "";
    var subId = subjectId;
    var subName;
    if (subId) {
      subName = prettySubject(subjectName(subId));
    } else if (guessed) {
      // "سكشن الـ AI" / "سكشن AI" names the section's subject even when that
      // subject was not created yet. Do not fall back to the previous subject.
      subName = prettySubject(guessed);
    } else if (idx > 0 && lastSubjectName) {
      // "and the section at 12:30" belongs to the subject above.
      subName = lastSubjectName;
      if (lastSubjectId) subId = lastSubjectId;
    } else {
      subName = lastSubjectName;
      if (!subId && lastSubjectId) subId = lastSubjectId;
    }

    if (isWeekly(kind)) {
      out.push({
        heard: text, icon: icon, subjectId: subId, subjectName: subName,
        kind: kind, time: time || "", place: place || "", weekday: dow,
        dayExplicit: dayExplicit, timeExplicit: !!time
      });
      lastDow = dow;
    } else {
      out.push({
        heard: text, icon: icon, subjectId: subId, subjectName: subName,
        kind: kind, time: time || "", date: iso(dateObj), note: note || "",
        dayExplicit: dayExplicit, timeExplicit: !!time
      });
      lastDate = dateObj;
      lastDow = dateObj.getDay();
    }
    lastKind = kind;
    if (subId) lastSubjectId = subId;
    if (subName) lastSubjectName = subName;
  });

  return out;
}

function handlePhrase(text, icon) {
  if (typeof openChatWithText === "function") { openChatWithText(text, icon); return; }
  var entries = parsePhrase(text, icon);
  if (!entries.length) { addLecture(today.getDay()); return; }
  var pre = entries[0];
  var dow = pre.weekday != null ? pre.weekday : new Date(pre.date + "T00:00:00").getDay();
  addLecture(dow, pre);
}

var voiceTimer = null, voiceStart = 0, voiceKeepFocus = false;
var voiceMicBtn = document.getElementById("mic");
if (voiceMicBtn) voiceMicBtn.addEventListener("pointerdown", function () {
  voiceKeepFocus = document.activeElement === document.getElementById("plans");
});
function voiceClock(ms) {
  var total = Math.max(0, Math.floor(ms / 1000));
  var min = Math.floor(total / 60), sec = total % 60;
  return min + ":" + (sec < 10 ? "0" : "") + sec;
}
function stopVoiceClock() {
  if (voiceTimer) { clearInterval(voiceTimer); voiceTimer = null; }
}
function startVoiceClock() {
  stopVoiceClock();
  voiceStart = Date.now();
  var el = document.getElementById("voiceTime");
  if (el) el.textContent = "0:00";
  voiceTimer = setInterval(function () {
    var t = document.getElementById("voiceTime");
    if (t) t.textContent = voiceClock(Date.now() - voiceStart);
  }, 250);
}
function setListening(on) {
  var box = document.querySelector(".plans");
  if (box) box.classList.toggle("rec", on);
  var input = document.getElementById("plans");
  var composing = document.getElementById("app").classList.contains("composing");
  if (input) input.placeholder = on ? "Listening…" : (composing ? "Ask..." : "What are your plans?");
  var panel = document.getElementById("voiceListen");
  if (panel) panel.setAttribute("aria-hidden", on ? "false" : "true");
  if (on) {
    if (voiceKeepFocus && input) {
      try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    }
    voiceKeepFocus = false;
    startVoiceClock();
  } else {
    voiceKeepFocus = false;
    stopVoiceClock();
    var time = document.getElementById("voiceTime");
    if (time) time.textContent = "0:00";
  }
}
function stopVoice() {
  if (rec) {
    try { rec.stop(); }
    catch (e) { rec = null; setListening(false); }
  } else setListening(false);
}

function cancelVoice() {
  if (rec) {
    rec.onend = null;
    rec.onerror = null;
    try { rec.stop(); } catch (e) {}
  }
  rec = null;
  setListening(false);
}

var VOICE_ERR = {
  "not-allowed": "Microphone is blocked — allow it in your browser settings",
  "service-not-allowed": "Voice is blocked here — open the link in Chrome or Safari (on iPhone turn on Dictation in Settings › Keyboard)",
  "no-speech": "I didn’t hear anything — tap the mic and start speaking right away",
  "audio-capture": "No microphone found",
  "network": "Voice needs an internet connection",
  "language-not-supported": "This voice language isn’t supported on your phone"
};

function listen() {
  if (rec) { rec.stop(); return; }
  if (!SR) { toast("Voice isn’t supported here — type your plan instead"); return; }
  if (!state.subjects.length) { addSubject(null); toast("Add a subject first, then tap the mic"); return; }
  if (!document.getElementById("app").classList.contains("composing") && typeof openComposer === "function") openComposer();
  var input = document.getElementById("plans");
  if (voiceKeepFocus && input) {
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  }
  var r = new SR(), heard = "", failed = false;
  r.lang = state.lang === "en" ? "en-US" : "ar-EG";
  r.continuous = false; r.interimResults = true; r.maxAlternatives = 1;
  r.onstart = function () { setListening(true); };
  r.onresult = function (e) {
    var t = "";
    for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    heard = t; input.value = t;
  };
  r.onerror = function (e) {
    if (e.error === "aborted") return;
    failed = true; toast(VOICE_ERR[e.error] || "Voice error: " + e.error);
  };
  r.onend = function () {
    rec = null; setListening(false); input.value = "";
    if (failed) return;
    if (heard.trim()) {
      if (typeof closeComposer === "function") closeComposer();
      handlePhrase(heard.trim());
    } else toast(VOICE_ERR["no-speech"]);
  };
  rec = r;
  try { r.start(); } catch (err) { rec = null; setListening(false); toast("Could not start the microphone"); }
}
