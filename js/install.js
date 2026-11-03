// ===== Install suggestion =====
// Browsers install web apps in very different ways. Chromium hands us a native
// prompt; iOS only has Share -> Add to Home Screen; Firefox cannot install at
// all. This shows one calm card above the tab bar, opens a short guide when
// the browser has no prompt, remembers a dismissal, and adds an Install row
// to Settings. Nothing runs inside an already-installed app.

(function () {
  var CARD = "installCard";
  var DISMISS_KEY = "lektraInstallDismissedAt";
  var DONE_KEY = "lektraInstalled";
  var SNOOZE = 30 * 24 * 60 * 60 * 1000;   // one month between suggestions
  var deferred = null;                      // Chromium's saved prompt event
  var shown = false;
  var card = null;

  function byId(id) { return document.getElementById(id); }

  function standalone() {
    try {
      if (window.navigator.standalone === true) return true;
      return !!(window.matchMedia && (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches
      ));
    } catch (e) { return false; }
  }

  function installedBefore() {
    try { return localStorage.getItem(DONE_KEY) === "1"; } catch (e) { return false; }
  }

  function snoozed() {
    try {
      var t = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
      return t > 0 && Date.now() - t < SNOOZE;
    } catch (e) { return false; }
  }

  function ios() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function iosOtherBrowser() {
    return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
  }

  function firefox() {
    return /Firefox|FxiOS/i.test(navigator.userAgent);
  }

  function safariDesktop() {
    return /Safari/i.test(navigator.userAgent) &&
      !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(navigator.userAgent);
  }

  function inApp() {
    return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|TikTok/i.test(navigator.userAgent);
  }

  // What the card says on this device. The action is a verb, not a promise:
  // "Install" only when the browser really can install for us.
  function copy() {
    if (deferred) return ["Full-screen and offline.", "Install"];
    if (inApp()) return ["Open in Chrome or Safari.", "How to"];
    if (ios()) return [iosOtherBrowser()
      ? "Open in Safari first."
      : "Add it to your home screen.", "How to"];
    if (firefox()) return ["Open in Chrome or Safari.", "How to"];
    if (safariDesktop()) return ["Add it to your Dock.", "How to"];
    return ["Full-screen and offline.", "How to"];
  }

  function paint() {
    if (!card) return;
    var c = copy();
    var text = byId("installText");
    var yes = byId("installYes");
    if (text) text.textContent = c[0];
    if (yes) yes.textContent = c[1];
  }

  function hide(persist) {
    if (card) card.classList.remove("show");
    if (!persist) return;
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  function markInstalled() {
    try { localStorage.setItem(DONE_KEY, "1"); } catch (e) {}
    hide(false);
  }

  function show() {
    if (!card || shown) return;
    if (standalone() || installedBefore() || snoozed()) return;
    if (location.protocol === "file:") return;
    if (location.search.indexOf("noinstall") >= 0) return;
    var app = byId("app");
    if (app && (app.classList.contains("composing") || app.classList.contains("chatting"))) return;
    var modal = byId("modal");
    if (modal && modal.classList.contains("show")) return;
    paint();
    card.classList.add("show");
    shown = true;
  }

  // The guide is deliberately short: one screen, three actions, no pictures
  // that would need translating.
  function guideData() {
    if (inApp()) {
      return {
        intro: "This page is open inside another app. Open it in Chrome or Safari, then install it from there.",
        steps: [
          ["Open the page menu", "Tap the three dots or the share button."],
          ["Choose Open in browser", "Pick Chrome, Edge or Safari."],
          ["Install Lektra", "Use the browser menu or the install button."]
        ]
      };
    }
    if (ios()) {
      return {
        intro: iosOtherBrowser()
          ? "On iPhone and iPad, only Safari can add apps to the home screen. Open this page in Safari first."
          : "It takes a few seconds. Lektra then opens full-screen and works offline.",
        steps: [
          ["Tap Share", "The square with an arrow, in Safari's toolbar."],
          ["Add to Home Screen", "Scroll the share sheet and tap it."],
          ["Tap Add", "Lektra appears on your home screen."]
        ]
      };
    }
    if (firefox()) {
      return {
        intro: "Firefox does not install web apps. Open Lektra in Chrome, Edge or Safari to install it.",
        steps: [
          ["Copy this address", "Select the URL in the address bar."],
          ["Open it in Chrome, Edge or Safari", "Any of them can install Lektra."],
          ["Tap Install", "The app opens in its own window."]
        ]
      };
    }
    if (safariDesktop()) {
      return {
        intro: "Add Lektra to the Dock so it opens like an app.",
        steps: [
          ["Open the File menu", "In Safari's menu bar."],
          ["Choose Add to Dock", "Safari creates a Lektra app."],
          ["Open it from the Dock", "It runs full-screen and offline."]
        ]
      };
    }
    return {
      intro: "Open the browser menu and choose Install app or Add to Home screen.",
      steps: [
        ["Open the browser menu", "Tap the three dots in the top-right."],
        ["Choose Install app", "Or Add to Home screen."],
        ["Confirm", "Lektra appears with your other apps."]
      ]
    };
  }

  function guide() {
    var data = guideData();
    var html = '<h2>Install Lektra</h2>' +
      '<p class="muted" style="margin-top:1.6cqw">' + data.intro + "</p>" +
      '<div class="install-steps">';
    for (var i = 0; i < data.steps.length; i++) {
      html += '<div class="install-step"><span class="install-step-n">' + (i + 1) + "</span>" +
        "<div><strong>" + data.steps[i][0] + "</strong><span>" + data.steps[i][1] + "</span></div></div>";
    }
    html += "</div>";
    openModal(html);
    var close = byId("mCancel");
    if (close) close.textContent = "Got it";
    // The card is hidden before the guide opens, and the Settings row is gone
    // once its sheet closes, so returning focus to the opener would drop it on
    // a display:none control. Send it to the Settings button instead.
    if (!modalReturnFocus || !modalReturnFocus.offsetParent) {
      var fallback = byId("bSet");
      if (fallback) modalReturnFocus = fallback;
    }
  }

  function promptNow() {
    if (deferred) {
      var ev = deferred;
      deferred = null;
      try { ev.prompt(); } catch (e) { hide(true); guide(); return; }
      ev.userChoice.then(function (choice) {
        if (choice && choice.outcome === "accepted") markInstalled();
        else hide(true);
      }).catch(function () { hide(true); });
      return;
    }
    hide(true);
    guide();
  }

  function bind() {
    card = byId(CARD);
    if (!card) return;
    byId("installYes").addEventListener("click", promptNow);
    byId("installClose").addEventListener("click", function () { hide(true); });

    // Do not leave the suggestion floating over the composer or the AI chat.
    var app = byId("app");
    if (app && window.MutationObserver) {
      new MutationObserver(function () {
        if (!card.classList.contains("show")) return;
        if (app.classList.contains("composing") || app.classList.contains("chatting")) {
          card.classList.remove("show");
        }
      }).observe(app, { attributes: true, attributeFilter: ["class"] });
    }
  }

  // Capture the event before anything else can consume it.
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    paint();
  });

  window.addEventListener("appinstalled", function () {
    deferred = null;
    markInstalled();
    if (typeof toast === "function") toast("Lektra installed");
  });

  window.installAvailable = function () {
    return !standalone() && !installedBefore();
  };

  // Settings -> Install app, and the card's action, share this path.
  window.openInstallFlow = function () {
    if (!window.installAvailable()) {
      if (typeof toast === "function") toast("Lektra is already installed");
      return;
    }
    if (deferred) { promptNow(); return; }
    hide(true);
    guide();
  };

  bind();
  setTimeout(function () {
    show();
    // A sheet or the composer may be open at the first moment; try once more
    // before giving up for this visit.
    if (!shown) setTimeout(show, 7000);
  }, 2800);
})();
