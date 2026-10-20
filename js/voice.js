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
  var m = t.match(/(?:الساعه|\bat|عند)\s*(\d{1,2})(?:[:.](\d{2}))?/) || t.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  var h = +m[1], min = m[2] ? +m[2] : 0;
  if (h > 23) return null;
  if (t.indexOf("ونص") !== -1) min = 30;
  if (t.indexOf("وربع") !== -1) min = 15;
  var pm = /مساء|بالليل|العصر|العشا|بعد الظهر|\bpm\b|p\.m/.test(t);
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
function findKind(t) {
  if (/كويز|quiz/.test(t)) return "quiz";
  if (/تسليم|ديدلاين|deadline|\bdue\b|submission|assignment|واجب/.test(t)) return "deadline";
  if (/ميد ?ت[يا]?رم|mid ?-?term/.test(t)) return "midterm";
  if (/فاينل|final|نهائي/.test(t)) return "final";
  if (/سكشن|section/.test(t)) return "section";
  if (/محاضره|lecture/.test(t)) return "lecture";
  // "lab" is a type only when it is not just the place ("in lab 2")
  var withoutPlace = t.replace(/(?:في|in|at)\s*(?:ال)?(?:لاب|\blab|معمل)\S*(?:\s*\d+)?/g, "");
  if (/لاب|\blab\b|معمل/.test(withoutPlace)) return "lab";
  return "lecture";
}

// the extra note: "quiz in the section", "project deadline" ...
function findNote(t) {
  if (/مشروع|project/.test(t)) return "Project";
  if (/سكشن|section/.test(t)) return "Section";
  if (/لاب|معمل|\blab\b/.test(t)) return "Lab";
  if (/محاضره|lecture/.test(t)) return "Lecture";
  if (/تقرير|report/.test(t)) return "Report";
  return "";
}

function handlePhrase(text, icon) {
  var t = clean(text);
  var kind = findKind(t);
  var pre = { heard: text, icon: icon, subjectId: findSubject(t), kind: kind, time: findTime(t) };
  var dow = today.getDay();
  if (isWeekly(kind)) {
    var d = findDay(t);
    if (d !== null) dow = d;
    pre.place = findPlace(digits(text));
  } else {
    var date = findDate(t) || today;
    pre.date = iso(date);
    pre.note = findNote(t);
    dow = date.getDay();
  }
  addLecture(dow, pre);
}

function setListening(on) {
  document.querySelector(".plans").className = "plans" + (on ? " rec" : "");
  document.getElementById("plans").placeholder = on ? "Listening…" : "What are your plans?";
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
  var r = new SR(), heard = "", failed = false, input = document.getElementById("plans");
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
    if (heard.trim()) handlePhrase(heard.trim());
    else toast(VOICE_ERR["no-speech"]);
  };
  rec = r;
  try { r.start(); } catch (err) { rec = null; setListening(false); toast("Could not start the microphone"); }
}
