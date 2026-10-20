// ===== Modal (onOk = null shows only a Close button) =====
function resetDrag(box) {
  box.style.transform = "";
  box.style.transition = "";
}
// slide the sheet down with the finger and dismiss it
function dragToClose(box) {
  if (box._dragBound) return;
  box._dragBound = true;
  var sy = 0, dy = 0, active = false;
  box.addEventListener("touchstart", function (e) {
    if (box.scrollTop > 0 || !e.touches.length) { active = false; return; }
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
  box.className = "box";
  resetDrag(box);
  box.innerHTML = '<div class="handle"></div>' + html + '<div class="btns"><button id="mCancel">' + (onOk ? "Cancel" : "Close") + "</button>" + (onOk ? '<button class="ok" id="mOk">Save</button>' : "") + "</div>";
  document.getElementById("modal").className = "show";
  document.getElementById("modal").onclick = function (e) { if (e.target === this) closeModal(); };
  document.getElementById("mCancel").onclick = closeModal;
  if (onOk) document.getElementById("mOk").onclick = function () { if (onOk() !== false) closeModal(); };
  dragToClose(box);
}
// Full-height sheet without the default footer (caller draws its own buttons)
function openSheet(html) {
  var box = document.getElementById("box");
  box.className = "box sheet";
  resetDrag(box);
  box.innerHTML = '<div class="handle"></div>' + html;
  box.scrollTop = 0;
  document.getElementById("modal").className = "show";
  document.getElementById("modal").onclick = function (e) { if (e.target === this) closeModal(); };
  dragToClose(box);
}
function closeModal() { document.getElementById("modal").className = ""; }
