// ===== AI chat confirmation =====
// Typing (or speaking) a plan opens a small AI conversation. The offline parser
// turns the sentence into preview cards; nothing is saved until the student taps
// "Add all" or "create" on a card. The chat itself never calls Puter.
var chatPending = [];
var chatRec = null;
var chatDidAdd = false;
var chatDidMove = false;
var chatThinkEpoch = 0;
var chatThinkTimers = [];

var CHAT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var CHAT_AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
var CHAT_AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
var CHAT_AR_KIND = {
  lecture: "محاضرة", section: "سكشن", lab: "لاب",
  quiz: "كويز", deadline: "تسليم", midterm: "ميدتيرم", final: "فاينل"
};
var CHAT_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var CHAT_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.2 12.4l3.1 3.1 6.5-6.5" fill="none" stroke="var(--app-bg)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function chatIsArabic(text) {
  return /[\u0600-\u06FF]/.test(String(text || ""));
}

function chatDateFor(pre) {
  if (pre && pre.date) {
    var p = String(pre.date).split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (!isNaN(d.getTime())) return d;
  }
  var base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (pre && pre.weekday != null) {
    var diff = (pre.weekday - base.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff);
  }
  return base;
}

function chatSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function chatShortDay(pre) {
  return CHAT_DAYS[chatDateFor(pre).getDay()];
}

function chatTimeLabel(pre) {
  return pre && pre.time ? fmtTime(pre.time) : "—";
}

function chatSubjectLabel(pre) {
  return (pre && pre.subjectName) || "Event";
}

function chatArabicTime(t) {
  if (!t) return "";
  var p = String(t).split(":"), h = parseInt(p[0], 10), m = parseInt(p[1] || "0", 10);
  if (!isFinite(h)) return "";
  var period = h < 12 ? "صباحًا" : (h < 17 ? "ظهرًا" : "مساءً");
  h = h % 12 || 12;
  return h + (m ? ":" + pad(m) : "") + " " + period;
}

function chatArabicPhrase(pre, prev, first) {
  var date = chatDateFor(pre);
  var day = CHAT_AR_DAYS[date.getDay()];
  var dateText = date.getDate() + " " + CHAT_AR_MONTHS[date.getMonth()];
  var time = chatArabicTime(pre.time);
  var kind = CHAT_AR_KIND[pre.kind] || "محاضرة";
  var head = kind + " " + chatSubjectLabel(pre);
  if (first) return head + " يوم " + day + " " + dateText + (time ? " الساعة " + time : "");
  if (prev && chatSameDate(date, chatDateFor(prev))) {
    return head + (time ? " الساعة " + time + " في نفس اليوم" : " في نفس اليوم");
  }
  return head + " يوم " + day + " " + dateText + (time ? " الساعة " + time : "");
}

function chatEnglishPhrase(pre, prev, first) {
  var date = chatDateFor(pre);
  var day = WEEK[date.getDay()];
  var dateText = MONTHS[date.getMonth()] + " " + date.getDate();
  var time = pre.time ? fmtTime(pre.time) : "";
  var kind = kindLabel(pre.kind).toLowerCase();
  var subject = chatSubjectLabel(pre);
  var head = "a " + subject + " " + kind;
  if (first) return head + " on " + day + ", " + dateText + (time ? " at " + time : "");
  if (prev && chatSameDate(date, chatDateFor(prev))) {
    return head + (time ? " at " + time + " the same day" : " the same day");
  }
  return head + " on " + day + ", " + dateText + (time ? " at " + time : "");
}

function chatJoinArabic(parts) {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + "، و" + parts[1];
  return parts.slice(0, -1).join("، ") + "، و" + parts[parts.length - 1];
}

function chatJoinEnglish(parts) {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + ", and " + parts[1];
  return parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];
}

// A short phrase for the "move" conversation: kind + subject + day + time,
// without repeating the date. The old schedule and the proposed schedule both
// use it so the reply reads like the reference card.
function chatShortPhrase(pre, arabic) {
  var date = chatDateFor(pre);
  var day = arabic ? CHAT_AR_DAYS[date.getDay()] : WEEK[date.getDay()];
  var kind = arabic ? (CHAT_AR_KIND[pre.kind] || "محاضرة") : kindLabel(pre.kind).toLowerCase();
  var subject = chatSubjectLabel(pre);
  var time = pre.time ? (arabic ? chatArabicTime(pre.time) : fmtTime(pre.time)) : "";
  if (arabic) return kind + " " + subject + " يوم " + day + (time ? " الساعة " + time : "");
  return "a " + subject + " " + kind + " on " + day + (time ? " at " + time : "");
}

function chatExistingPre(pre, old) {
  return {
    subjectId: pre.subjectId, subjectName: pre.subjectName,
    kind: old.kind, weekday: old.weekday, time: old.time, date: old.date
  };
}

// The date stays on its own fixed line. The descriptive sentence is restored
// below it, like the original card, and stays on one line with an ellipsis.
function chatDateSummary(pre) {
  var date = chatDateFor(pre);
  return date.getDate() + " " + MONTHS[date.getMonth()].slice(0, 3);
}

function chatCardSummary(pre, arabic) {
  if (arabic) return "إضافة " + chatArabicPhrase(pre, null, true);
  return "Add " + chatEnglishPhrase(pre, null, true);
}

// Match parsed entries against weekly entries the student already has. A match
// is only a move when the proposed day or time differs. "10" or "Thursday"
// omitted by the student is filled from the existing entry, so "move it to
// Saturday" keeps the old time and "move it to 11" keeps the old day.
function chatUsedMoveIds() {
  var used = {};
  chatPending.forEach(function (item) {
    // Only a pending (not-yet-moved) card reserves the entry. After a move the
    // student can send a correction and move the same entry again.
    if (item.pre && item.pre.moveId && !item.added) used[item.pre.moveId] = true;
  });
  return used;
}

function chatPrepareEntries(entries) {
  var used = chatUsedMoveIds();
  entries.forEach(function (pre) {
    if (!pre.subjectId || !isWeekly(pre.kind)) return;
    var candidates = (state.lectures || []).filter(function (l) {
      return l.subjectId === pre.subjectId && l.kind === pre.kind && !used[l.id];
    });
    if (!candidates.length) return;
    var cand = candidates[0];
    if (pre.place) {
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].place && clean(candidates[i].place) === clean(pre.place)) {
          cand = candidates[i];
          break;
        }
      }
    }
    if (!pre.dayExplicit) pre.weekday = cand.weekday;
    if (!pre.time) pre.time = cand.time || "";
    if (!pre.place) pre.place = cand.place || "";
    if (cand.weekday === pre.weekday && (cand.time || "") === (pre.time || "")) return;
    pre.moveId = cand.id;
    pre.moveExisting = {
      id: cand.id, subjectId: cand.subjectId, kind: cand.kind,
      weekday: cand.weekday, time: cand.time || "", place: cand.place || ""
    };
    used[cand.id] = true;
  });
  return entries;
}

function chatReply(entries, text) {
  var arabic = chatIsArabic(text);
  if (!entries.length) {
    return arabic
      ? "مقدرتش ألاقي موعد في الرسالة دي. جرّب مثلاً: محاضرة Logic الخميس الساعة 9."
      : "I couldn't find a time in that. Try: Logic lecture Thursday at 9.";
  }
  var moved = entries.filter(function (pre) { return pre.moveId && pre.moveExisting; });
  if (moved.length) {
    var oldParts = moved.map(function (pre) {
      return chatShortPhrase(chatExistingPre(pre, pre.moveExisting), arabic);
    });
    var movedNew = moved.map(function (pre) { return chatShortPhrase(pre, arabic); });
    var added = entries.filter(function (pre) { return !pre.moveId; });
    var addedNew = added.map(function (pre) { return chatShortPhrase(pre, arabic); });
    if (arabic) {
      var oldAr = chatJoinArabic(oldParts);
      if (!added.length) {
        return "لاحظت عندك " + oldAr + ". هل تريد أنقل" +
          (moved.length > 1 ? "هم" : "ه") + " إلى " + chatJoinArabic(movedNew) + "؟";
      }
      return "لاحظت عندك " + oldAr + ". هل تريد أنقل " +
        chatJoinArabic(movedNew) + " وأضيف " + chatJoinArabic(addedNew) + "؟";
    }
    var oldEn = chatJoinEnglish(oldParts);
    if (!added.length) {
      return "I noticed you already have " + oldEn + ". Do you want to move " +
        (moved.length > 1 ? "them" : "it") + " to " + chatJoinEnglish(movedNew) + "?";
    }
    return "I noticed you already have " + oldEn + ". Do you want to move " +
      chatJoinEnglish(movedNew) + " and add " + chatJoinEnglish(addedNew) + "?";
  }
  var parts = entries.map(function (pre, i) {
    return arabic
      ? chatArabicPhrase(pre, entries[i - 1], i === 0)
      : chatEnglishPhrase(pre, entries[i - 1], i === 0);
  });
  return arabic
    ? "جهزت لك " + chatJoinArabic(parts) + "."
    : "I've prepared " + chatJoinEnglish(parts) + ".";
}

function chatAddMessage(role, text) {
  var list = document.getElementById("chatMessages");
  if (!list) return;
  var msg = document.createElement("div");
  msg.className = "chat-msg " + role;
  var bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.setAttribute("dir", "auto");
  bubble.textContent = text;
  msg.appendChild(bubble);
  list.appendChild(msg);
}

function chatScrollBottom() {
  var sc = document.getElementById("chatScroll");
  if (sc) sc.scrollTop = sc.scrollHeight;
}

function chatThinking() {
  var list = document.getElementById("chatMessages");
  if (!list) return null;
  var el = document.createElement("div");
  el.className = "chat-thinking";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.textContent = "Thinking...";
  list.appendChild(el);
  return el;
}

function chatReplyWithThinking(entries, text, resetDidFlags) {
  var thinking = chatThinking();
  chatScrollBottom();
  var reply = chatReply(entries, text);
  var epoch = chatThinkEpoch;
  var timer = setTimeout(function () {
    var i = chatThinkTimers.indexOf(timer);
    if (i >= 0) chatThinkTimers.splice(i, 1);
    if (epoch !== chatThinkEpoch) return;
    if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
    chatAddMessage("ai", reply);
    if (entries.length) {
      if (resetDidFlags && (chatDidAdd || chatDidMove)) { chatDidAdd = false; chatDidMove = false; }
      entries.forEach(function (pre) { chatPending.push({ key: uid(), pre: pre }); });
      chatRenderPreview();
    }
    chatScrollBottom();
  }, 3000);
  chatThinkTimers.push(timer);
}

function chatCardHtml(item) {
  var pre = item.pre;
  var arabic = chatIsArabic(pre.heard || "");
  var kind = arabic ? (CHAT_AR_KIND[pre.kind] || "محاضرة") : kindLabel(pre.kind);
  var summaryDate = chatDateSummary(pre);
  var summaryText = chatCardSummary(pre, arabic);
  var topline = '<span class="chat-ev-kindname">' + esc(kind) + '</span>';
  var isMove = !!pre.moveId;
  return '<div class="chat-ev' + (item.added ? " added" : "") + '">' +
    '<button type="button" class="chat-ev-create' + (isMove ? " move" : "") + '" data-chat-create="' + esc(item.key) + '">' + (isMove ? "move" : "create") + '</button>' +
    '<div class="chat-ev-main">' +
      '<div class="chat-ev-topline">' + topline + '</div>' +
      '<div class="chat-ev-subline"><span class="chat-ev-sub">' + esc(chatSubjectLabel(pre)) + '</span></div>' +
    '</div>' +
    '<div class="chat-ev-event">Event</div>' +
    '<div class="chat-ev-foot">' +
      '<div class="chat-ev-meta" dir="ltr">' +
        '<span class="chat-ev-day">' + esc(chatShortDay(pre)) + '</span>' +
        '<span class="chat-ev-dot">·</span>' +
        '<span class="chat-ev-date">' + esc(summaryDate) + '</span>' +
        '<span class="chat-ev-dot">·</span>' +
        '<span class="chat-ev-time">' + esc(chatTimeLabel(pre)) + '</span>' +
      '</div>' +
      '<div class="chat-ev-summary"' + (arabic ? ' dir="rtl"' : '') + '>' + esc(summaryText) + '</div>' +
    '</div>' +
    '<button type="button" class="chat-ev-x" data-chat-remove="' + esc(item.key) + '" aria-label="Remove">' + CHAT_X + '</button>' +
  '</div>';
}

function chatRenderPreview() {
  var box = document.getElementById("chatPreviews");
  if (!box) return;
  if (!chatPending.length) {
    box.innerHTML = "";
    box.classList.remove("show");
    return;
  }
  var remaining = chatPending.filter(function (item) { return !item.added; });
  var html = '<div class="chat-evs">' + chatPending.map(chatCardHtml).join("") + '</div>';
  var status = "";
  if (chatDidMove && chatDidAdd) status = "Updated your day";
  else if (chatDidMove) status = "Moved to your day";
  else if (chatDidAdd) status = "Added to your day";
  if (status) html += '<div class="chat-added">' + CHAT_CHECK + '<span>' + status + '</span></div>';
  var moveRemaining = remaining.filter(function (item) { return !!item.pre.moveId; });
  var addRemaining = remaining.filter(function (item) { return !item.pre.moveId; });
  var actions = [];
  if (moveRemaining.length) actions.push('<button type="button" class="chat-addall" data-chat-moveall>Move all</button>');
  if (addRemaining.length) actions.push('<button type="button" class="chat-addall" data-chat-addall>Add all ' + addRemaining.length + '</button>');
  if (actions.length) html += '<div class="chat-actions">' + actions.join("") + '</div>';
  box.innerHTML = html;
  box.classList.add("show");

  box.querySelectorAll("[data-chat-remove]").forEach(function (b) {
    b.onclick = function () { chatRemove(b.getAttribute("data-chat-remove")); };
  });
  box.querySelectorAll("[data-chat-create]").forEach(function (b) {
    b.onclick = function () { chatCreate(b.getAttribute("data-chat-create")); };
  });
  var moveAll = box.querySelector("[data-chat-moveall]");
  if (moveAll) moveAll.onclick = chatMoveAll;
  var add = box.querySelector("[data-chat-addall]");
  if (add) add.onclick = chatAddAll;
}

function chatRemove(key) {
  chatPending = chatPending.filter(function (item) { return item.key !== key; });
  chatRenderPreview();
  chatScrollBottom();
}

function chatAddAll() {
  var remaining = chatPending.filter(function (item) { return !item.added && !item.pre.moveId; });
  if (!remaining.length) return;
  chatCommit(remaining);
}

function chatMoveAll() {
  var remaining = chatPending.filter(function (item) { return !item.added && item.pre.moveId; });
  if (!remaining.length) return;
  chatCommit(remaining);
}

function chatCreate(key) {
  var item = null;
  for (var i = 0; i < chatPending.length; i++) if (chatPending[i].key === key) item = chatPending[i];
  if (!item) return;
  if (item.added) { toast(item.moved ? "Already moved" : "Already added"); return; }
  chatCommit([item]);
}

function chatCommit(items) {
  items = items.filter(function (item) { return !item.added; });
  if (!items.length) return;
  if (!state.subjects.length) {
    toast("Add a subject first");
    if (typeof addSubject === "function") addSubject(function () { chatCommit(items); });
    return;
  }
  var fallback = state.subjects[0].id;
  function subjectFor(pre) {
    for (var i = 0; i < state.subjects.length; i++) if (state.subjects[i].id === pre.subjectId) return pre.subjectId;
    // The card can name a subject the student has not created yet ("سكشن الـ AI"
    // or "Physics"). Create it on commit instead of silently filing the entry
    // under the first subject, which would contradict the card.
    var wanted = String(pre.subjectName || "").trim();
    if (wanted) {
      var key = wanted.toLowerCase();
      for (var j = 0; j < state.subjects.length; j++) {
        if (String(state.subjects[j].name || "").trim().toLowerCase() === key) return state.subjects[j].id;
      }
      var created = { id: uid(), name: wanted, files: [] };
      state.subjects.push(created);
      return created.id;
    }
    return fallback;
  }
  items.forEach(function (item) {
    var pre = item.pre;
    if (pre.moveId && isWeekly(pre.kind)) {
      var existing = null;
      for (var i = 0; i < state.lectures.length; i++) {
        if (state.lectures[i].id === pre.moveId) { existing = state.lectures[i]; break; }
      }
      if (existing) {
        existing.weekday = pre.weekday != null ? pre.weekday : existing.weekday;
        existing.time = pre.time || existing.time || "";
        if (pre.place) existing.place = pre.place;
        item.moved = true;
        chatDidMove = true;
        item.added = true;
        return;
      }
    }
    var subjectId = subjectFor(pre);
    if (isWeekly(pre.kind)) {
      state.lectures.push({
        id: uid(), subjectId: subjectId, kind: pre.kind,
        weekday: pre.weekday != null ? pre.weekday : today.getDay(),
        time: pre.time || "", place: pre.place || ""
      });
    } else {
      state.events.push({
        id: uid(), subjectId: subjectId, kind: pre.kind,
        date: pre.date || iso(today), time: pre.time || "", note: pre.note || ""
      });
    }
    item.moved = false;
    chatDidAdd = true;
    item.added = true;
  });
  save();
  render();
  chatRenderPreview();
  chatScrollBottom();
}

function chatReset() {
  var messages = document.getElementById("chatMessages");
  var previews = document.getElementById("chatPreviews");
  var input = document.getElementById("chatInput");
  chatThinkEpoch++;
  chatThinkTimers.forEach(function (timer) { clearTimeout(timer); });
  chatThinkTimers = [];
  if (messages) messages.innerHTML = "";
  if (previews) { previews.innerHTML = ""; previews.classList.remove("show"); }
  if (input) { input.value = ""; input.placeholder = "Message..."; input.style.height = ""; }
  chatPending = [];
  chatDidAdd = false;
  chatDidMove = false;
}

// The chat box is a textarea: a long message wraps onto new lines and the bar
// grows with it, instead of the text scrolling out of sight behind the caret.
function chatGrowInput() {
  var input = document.getElementById("chatInput");
  if (!input) return;
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
}

function openChatScreen() {
  if (typeof closeComposer === "function") closeComposer();
  var app = document.getElementById("app");
  if (app) app.classList.add("chatting");
  var chat = document.getElementById("chat");
  if (chat) chat.setAttribute("aria-hidden", "false");
  if (typeof syncThemeColor === "function") syncThemeColor();
}

function closeChatScreen() {
  chatCancelVoice();
  var app = document.getElementById("app");
  if (app) app.classList.remove("chatting");
  var chat = document.getElementById("chat");
  if (chat) chat.setAttribute("aria-hidden", "true");
  chatReset();
  var input = document.getElementById("chatInput");
  if (input && document.activeElement === input) input.blur();
  if (typeof syncThemeColor === "function") syncThemeColor();
}

function openChatWithText(text, icon) {
  text = String(text || "").trim();
  if (!text) return;
  chatCancelVoice();
  chatReset();
  openChatScreen();
  chatAddMessage("user", text);
  var entries = [];
  try {
    entries = (typeof parsePhrase === "function" ? parsePhrase(text, icon) : []) || [];
  } catch (e) { entries = []; }
  entries = chatPrepareEntries(entries);
  chatReplyWithThinking(entries, text, false);
}

function sendChatMessage(text) {
  text = String(text != null ? text : (document.getElementById("chatInput") || {}).value || "").trim();
  if (!text) return;
  var input = document.getElementById("chatInput");
  if (input) { input.value = ""; input.style.height = ""; }
  chatAddMessage("user", text);
  var entries = [];
  try {
    entries = (typeof parsePhrase === "function" ? parsePhrase(text) : []) || [];
  } catch (e) { entries = []; }
  entries = chatPrepareEntries(entries);
  chatReplyWithThinking(entries, text, true);
}

function chatSetListening(on) {
  var mic = document.getElementById("chatMic");
  if (mic) mic.classList.toggle("listening", on);
  var input = document.getElementById("chatInput");
  if (input) input.placeholder = on ? "Listening…" : "Message...";
}

function chatCancelVoice() {
  if (chatRec) {
    chatRec.onend = null;
    chatRec.onerror = null;
    try { chatRec.stop(); } catch (e) {}
  }
  chatRec = null;
  chatSetListening(false);
}

function listenChat() {
  if (chatRec) { chatRec.stop(); return; }
  if (!SR) { toast("Voice isn’t supported here — type your plan instead"); return; }
  var r = new SR(), heard = "", failed = false;
  r.lang = state.lang === "en" ? "en-US" : "ar-EG";
  r.continuous = false; r.interimResults = true; r.maxAlternatives = 1;
  r.onstart = function () { chatSetListening(true); };
  r.onresult = function (e) {
    var t = "";
    for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    heard = t;
    var input = document.getElementById("chatInput");
    if (input) { input.value = t; chatGrowInput(); }
  };
  r.onerror = function (e) {
    if (e.error === "aborted") return;
    failed = true;
    toast(VOICE_ERR[e.error] || "Voice error: " + e.error);
  };
  r.onend = function () {
    chatRec = null;
    chatSetListening(false);
    var input = document.getElementById("chatInput");
    if (input) { input.value = ""; input.style.height = ""; }
    if (failed) return;
    if (heard.trim()) sendChatMessage(heard.trim());
    else toast(VOICE_ERR["no-speech"]);
  };
  chatRec = r;
  try { r.start(); } catch (err) {
    chatRec = null;
    chatSetListening(false);
    toast("Could not start the microphone");
  }
}

var chatCloseBtn = document.getElementById("chatClose");
if (chatCloseBtn) chatCloseBtn.onclick = closeChatScreen;
var chatInputEl = document.getElementById("chatInput");
if (chatInputEl) {
  chatInputEl.addEventListener("input", chatGrowInput);
  chatInputEl.onkeydown = function (e) {
    if (e.key === "Escape") { closeChatScreen(); return; }
    // Enter sends; Shift+Enter inserts a line break.
    if (e.key === "Enter" && !e.shiftKey && this.value.trim()) { e.preventDefault(); sendChatMessage(); }
  };
}
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  var app = document.getElementById("app");
  if (!app || !app.classList.contains("chatting")) return;
  var modal = document.getElementById("modal");
  if (modal && modal.classList.contains("show")) return;
  e.preventDefault();
  closeChatScreen();
}, true);
var chatMicBtn = document.getElementById("chatMic");
if (chatMicBtn) chatMicBtn.onclick = listenChat;
