// ===== Modal (onOk = null shows only a Close button) =====
// A sheet can set this to intercept every way of closing it (footer button,
// backdrop tap, drag down). Return false to keep the sheet open.
var modalCloseGuard = null;

// Keyboard and screen-reader handling. Dialog semantics belong on the sheet
// itself, and focus goes back to whatever opened it once the sheet is gone.
var modalReturnFocus = null;
// Safari does not focus a button when it is tapped, so activeElement is often
// <body>. Remember the control under the finger as a fallback opener.
var modalLastPointer = null;
document.addEventListener("pointerdown", function (e) {
  var t = e.target;
  if (t && t.closest) t = t.closest("button,a,input,textarea,select,[tabindex]");
  if (t) modalLastPointer = t;
}, true);

function rememberFocus() {
  var m = document.getElementById("modal");
  if (m && m.classList.contains("show")) return;   // keep the original opener
  var a = document.activeElement;
  if (!a || a === document.body) a = modalLastPointer;
  modalReturnFocus = a && a !== document.body ? a : null;
}

function prepareDialog(box) {
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  if (!box.hasAttribute("tabindex")) box.setAttribute("tabindex", "-1");
  if (!box.getAttribute("aria-label")) {
    var h = box.querySelector("h2");
    var label = h && h.textContent ? h.textContent.trim() : "";
    box.setAttribute("aria-label", label || "Dialog");
  }
  try { box.focus({ preventScroll: true }); } catch (e) { try { box.focus(); } catch (e2) {} }
}

function restoreFocus() {
  var a = modalReturnFocus;
  modalReturnFocus = null;
  if (a && a.isConnected && a.focus) {
    try { a.focus({ preventScroll: true }); } catch (e) { try { a.focus(); } catch (e2) {} }
  }
}

function resetDrag(box) {
  box.style.transform = "";
  box.style.transition = "";
}
// The nearest element between the touch and the sheet that scrolls on its own
// (a PDF's page list, a long text file). A gesture there belongs to that
// scroller: dragging up at its top is not a request to close the sheet.
function nestedScroller(target, box) {
  var el = target && target.nodeType === 1 ? target : null;
  while (el && el !== box) {
    var y = window.getComputedStyle(el).overflowY;
    if ((y === "auto" || y === "scroll") && el.scrollHeight > el.clientHeight + 2) return el;
    el = el.parentElement;
  }
  return null;
}
// slide the sheet down with the finger and dismiss it
function dragToClose(box) {
  if (box._dragBound) return;
  box._dragBound = true;
  var sy = 0, dy = 0, active = false;
  box.addEventListener("touchstart", function (e) {
    if (!e.touches.length) { active = false; return; }
    if (nestedScroller(e.target, box)) { active = false; return; }
    var scroller = box.querySelector(".fscroll");
    var top = scroller ? scroller.scrollTop : box.scrollTop;
    if (top > 0) { active = false; return; }
    sy = e.touches[0].clientY; dy = 0; active = true;
    box.style.transition = "none";
  }, { passive: true });
  box.addEventListener("touchmove", function (e) {
    if (!active || !e.touches.length) return;
    dy = e.touches[0].clientY - sy;
    if (dy > 0) box.style.transform = "translateY(" + dy + "px)";
  }, { passive: true });
  function end() {
    if (!active) return;
    active = false;
    box.style.transition = "transform .24s cubic-bezier(.2,.9,.25,1)";
    if (dy > 100) {
      box.style.transform = "translateY(110%)";
      setTimeout(function () { closeModal(); resetDrag(box); }, 200);
    } else {
      box.style.transform = "";
    }
  }
  box.addEventListener("touchend", end);
  box.addEventListener("touchcancel", end);
}

function openModal(html, onOk) {
  var box = document.getElementById("box");
  rememberFocus();
  modalCloseGuard = null;          // a new sheet never inherits a guard
  box.className = "box";
  box.removeAttribute("data-page");
  box.removeAttribute("aria-label");
  resetDrag(box);
  box.innerHTML = '<div class="handle"></div>' + html + '<div class="btns"><button id="mCancel">' + (onOk ? "Cancel" : "Close") + "</button>" + (onOk ? '<button class="ok" id="mOk">Save</button>' : "") + "</div>";
  box.scrollTop = 0;
  document.getElementById("modal").className = "show";
  document.getElementById("modal").onclick = function (e) { if (e.target === this) closeModal(); };
  document.getElementById("mCancel").onclick = closeModal;
  if (onOk) document.getElementById("mOk").onclick = function () { if (onOk() !== false) closeModal(); };
  dragToClose(box);
  prepareDialog(box);
  // Paint the status strip in this same task: the mutation observer alone
  // lands after the browser may already have sampled the old colour, which
  // showed up as a light gap above the dim for one frame.
  if (typeof syncThemeColor === "function") syncThemeColor();
}
// Full-height sheet without the default footer (caller draws its own buttons)
function openSheet(html) {
  var box = document.getElementById("box");
  rememberFocus();
  modalCloseGuard = null;          // a new sheet never inherits a guard
  box.className = "box sheet";
  box.removeAttribute("data-page");
  box.removeAttribute("aria-label");
  resetDrag(box);
  box.innerHTML = '<div class="handle"></div>' + html;
  box.scrollTop = 0;
  document.getElementById("modal").className = "show";
  document.getElementById("modal").onclick = function (e) { if (e.target === this) closeModal(); };
  dragToClose(box);
  prepareDialog(box);
  if (typeof syncThemeColor === "function") syncThemeColor();
}
function closeModal() {
  // The sheet may want to check before it is thrown away (unsaved scan results).
  if (modalCloseGuard && modalCloseGuard() === false) return;
  modalCloseGuard = null;
  // A pending AI scan must not reopen the sheet after the user closed it.
  if (typeof cancelScan === "function") cancelScan();
  // Free the blob URL backing an open file preview.
  if (typeof revokeFilePreview === "function") revokeFilePreview();
  // The rotating example in the New subject sheet stops with the sheet.
  if (typeof stopSubjectExamples === "function") stopSubjectExamples();
  var m = document.getElementById("modal");
  // The shell always contains #modal, but a close fired during teardown should
  // not throw on a page where it has already been removed.
  if (!m) return;
  m.className = "";
  var ov = m.querySelector(".box.overlay");
  if (ov) ov.remove();
  var scrim = m.querySelector(".sheet-scrim");
  if (scrim) scrim.remove();
  // Settings changes were only deferred, never dropped.
  var box = document.getElementById("box");
  if (box) box.removeAttribute("data-page");
  restoreFocus();
  if (typeof flushPendingRender === "function") flushPendingRender();
  if (typeof syncThemeColor === "function") syncThemeColor();
}

// Escape closes any open sheet. Individual sheets (search, the day menu) may
// already handle it; closing twice is harmless, and the guard still runs.
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  var m = document.getElementById("modal");
  if (m && m.classList.contains("show")) closeModal();
});
