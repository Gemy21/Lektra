// ===== Full-screen camera =====
//
// The attach sheet's Camera card opens this instead of the native file
// picker: a live preview with a recent-shots strip, a shutter, and a small
// menu (switch camera / photo library). A captured frame goes straight into
// the existing scan flow, so the AI reads it exactly like a picked photo.

var camStream = null;
var camFacing = "environment";
var camShots = [];
var camOpen = false;
var camWatch = null;

var CAM_ICON = {
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.4 8.2h3.1l1.6-2.4h5.8l1.6 2.4h3.1a1.2 1.2 0 0 1 1.2 1.2v9a1.2 1.2 0 0 1-1.2 1.2H4.4a1.2 1.2 0 0 1-1.2-1.2v-9a1.2 1.2 0 0 1 1.2-1.2z"/><circle cx="12" cy="13.4" r="3.4"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15.5" rx="4"/><circle cx="8.3" cy="9.6" r="1.5"/><path d="M4.2 17.4l4.9-4.9 3.8 3.8 2.2-2.2 4.7 4.7"/></svg>',
  flip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.6 9.2A7.6 7.6 0 0 1 18 6.1l2 2"/><path d="M19.4 14.8A7.6 7.6 0 0 1 6 17.9l-2-2"/><path d="M20 3.8v4.3h-4.3M4 20.2v-4.3h4.3"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.2" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.8" cy="12" r="1.7"/></svg>'
};

function camNode(id) { return document.getElementById(id); }

function openCamera() {
  if (camOpen) return;
  camOpen = true;

  var ov = document.createElement("div");
  ov.id = "camView";
  ov.className = "cam no-cam";
  ov.innerHTML =
    '<div class="cam-strip" id="camStrip"></div>' +
    '<div class="cam-stage">' +
      '<video id="camVideo" playsinline autoplay muted></video>' +
      '<div class="cam-loading" id="camLoading"><span class="cam-spin"></span>Starting camera…</div>' +
      '<div class="cam-fallback" id="camFallback" hidden>' +
        '<span class="cam-fbicon">' + CAM_ICON.camera + "</span>" +
        "<b>Camera unavailable</b>" +
        "<p>Allow camera access, or pick a photo from your library instead.</p>" +
        '<div class="cam-fbbtns">' +
          '<button type="button" id="camRetry">Try again</button>' +
          '<button type="button" id="camPickFallback">Photo Library</button>' +
        "</div>" +
      "</div>" +
      '<div class="cam-controls">' +
        '<button type="button" class="cam-round" id="camBack" aria-label="Back">' + CAM_ICON.back + "</button>" +
        '<button type="button" class="cam-shutter" id="camShutter" aria-label="Take photo"><span></span></button>' +
        '<button type="button" class="cam-round cam-more" id="camMore" aria-label="More">' + CAM_ICON.dots + "</button>" +
      "</div>" +
    "</div>" +
    '<div class="cam-menu" id="camMenu" hidden>' +
      '<button type="button" id="camSwitch">' + CAM_ICON.flip + "<span>Switch camera</span></button>" +
      '<button type="button" id="camLibMenu">' + CAM_ICON.photo + "<span>Photo Library</span></button>" +
    "</div>" +
    '<div class="cam-flash" id="camFlash"></div>' +
    '<input type="file" id="camFile" accept="image/*" style="display:none">';

  document.getElementById("app").appendChild(ov);

  camRenderStrip();
  camBind();
  camStart(camFacing);
}

function camBind() {
  camNode("camBack").onclick = function () {
    closeCamera();
    if (typeof openAttachSheet === "function") openAttachSheet();
  };
  camNode("camShutter").onclick = camTake;
  camNode("camMore").onclick = function (e) {
    e.stopPropagation();
    var menu = camNode("camMenu");
    if (menu) menu.hidden = !menu.hidden;
  };
  camNode("camSwitch").onclick = function () {
    var menu = camNode("camMenu");
    if (menu) menu.hidden = true;
    camFacing = camFacing === "environment" ? "user" : "environment";
    camStart(camFacing);
  };
  camNode("camLibMenu").onclick = camPickLibrary;
  camNode("camPickFallback").onclick = camPickLibrary;
  camNode("camRetry").onclick = function () { camStart(camFacing); };
  camNode("camFile").onchange = function () {
    var f = this.files && this.files[0];
    this.value = "";
    if (!f) return;
    camRemember(URL.createObjectURL(f));
    closeCamera();
    if (typeof scanRun === "function") scanRun(f);
  };
  camNode("camView").addEventListener("click", function (e) {
    var menu = camNode("camMenu");
    if (menu && !e.target.closest("#camMore") && !e.target.closest("#camMenu")) menu.hidden = true;
  });
  document.addEventListener("keydown", camKeydown);
}

function camKeydown(e) {
  if (e.key === "Escape") {
    closeCamera();
    if (typeof openAttachSheet === "function") openAttachSheet();
  }
}

function camRenderStrip() {
  var strip = camNode("camStrip");
  if (!strip) return;
  var html = "";
  camShots.slice(-4).reverse().forEach(function (url) {
    html += '<img class="cam-thumb" src="' + url + '" alt="">';
  });
  strip.innerHTML = html;
  strip.hidden = !html;
}

function camRemember(url) {
  camShots.push(url);
  while (camShots.length > 5) {
    var old = camShots.shift();
    try { URL.revokeObjectURL(old); } catch (e) {}
  }
  camRenderStrip();
}

function camPickLibrary() {
  var input = camNode("camFile");
  if (input) input.click();
}

function camStart(facing, retried) {
  camStop();
  var video = camNode("camVideo");
  var fb = camNode("camFallback");
  var load = camNode("camLoading");
  var view = camNode("camView");
  if (!video || !view) return;

  if (fb) fb.hidden = true;
  if (load) load.hidden = false;
  view.classList.add("no-cam");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    camFail();
    return;
  }

  var constraints = {
    audio: false,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  };

  function ready() {
    var box = camNode("camView");
    if (!box) return;
    if (camWatch) { clearTimeout(camWatch); camWatch = null; }
    box.classList.remove("no-cam");
    var spin = camNode("camLoading");
    if (spin) spin.hidden = true;
  }
  video.onplaying = ready;
  video.onloadeddata = ready;

  function retryOrFail() {
    if (!camNode("camView")) return;
    if (!retried) {
      setTimeout(function () { camStart(facing, true); }, 450);
      return;
    }
    camFail();
  }

  // The camera can take a moment to be released after a reload or a switch;
  // give it one more try before showing the unavailable card.
  if (camWatch) clearTimeout(camWatch);
  camWatch = setTimeout(function () {
    camWatch = null;
    var v = camNode("camVideo");
    if (!v || v.readyState >= 2) return;
    retryOrFail();
  }, 6000);

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    if (!camNode("camView")) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
    camStream = stream;
    video.srcObject = stream;
    var play = video.play();
    if (play && play.catch) play.catch(function () {});
    if (fb) fb.hidden = true;
    if (video.readyState >= 2) ready();
  }).catch(function (err) {
    if (window.console) console.warn("camera start failed: " + ((err && err.name) || "") + " " + ((err && err.message) || ""));
    retryOrFail();
  });
}

function camFail() {
  var fb = camNode("camFallback");
  var load = camNode("camLoading");
  var view = camNode("camView");
  var video = camNode("camVideo");
  if (video) { try { video.srcObject = null; } catch (e) {} }
  if (load) load.hidden = true;
  if (fb) fb.hidden = false;
  if (view) view.classList.add("no-cam");
}

function camStop() {
  if (camWatch) { clearTimeout(camWatch); camWatch = null; }
  if (camStream) {
    camStream.getTracks().forEach(function (t) { t.stop(); });
    camStream = null;
  }
  var video = camNode("camVideo");
  if (video) {
    try { video.pause(); video.srcObject = null; } catch (e) {}
  }
}

function closeCamera() {
  camStop();
  var ov = camNode("camView");
  if (ov) ov.remove();
  document.removeEventListener("keydown", camKeydown);
  camOpen = false;
}

// Draw the current video frame onto a canvas. Returns false when the frame
// came back blank (some WebKit builds hand back empty pixels for accelerated
// video), so the caller can try ImageCapture instead.
function camDraw(video, canvas, ctx) {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  try {
    var probe = document.createElement("canvas");
    probe.width = 32; probe.height = 32;
    var pctx = probe.getContext("2d");
    pctx.drawImage(video, 0, 0, 32, 32);
    var data = pctx.getImageData(0, 0, 32, 32).data;
    for (var i = 0; i < data.length; i += 4) {
      if (data[i] || data[i + 1] || data[i + 2]) return true;
    }
    return false;
  } catch (e) {
    return true; // can't probe, trust the draw
  }
}

function camTake() {
  var video = camNode("camVideo");
  if (!video || !video.videoWidth || video.readyState < 2) return;

  var max = 1600;
  var w = video.videoWidth, h = video.videoHeight;
  var scale = Math.min(1, max / Math.max(w, h));
  var canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var flash = camNode("camFlash");
  if (flash) {
    flash.classList.remove("on");
    void flash.offsetWidth;
    flash.classList.add("on");
  }

  function deliver(blob) {
    if (!blob) return;
    var file = new File([blob], "camera-" + Date.now() + ".jpg", { type: "image/jpeg" });
    camRemember(URL.createObjectURL(blob));
    setTimeout(function () {
      closeCamera();
      if (typeof scanRun === "function") scanRun(file);
    }, 140);
  }

  var painted = camDraw(video, canvas, ctx);
  if (painted) {
    canvas.toBlob(deliver, "image/jpeg", 0.92);
    return;
  }

  // Blank readback: ask the track for a still frame instead.
  var track = camStream && camStream.getVideoTracks ? camStream.getVideoTracks()[0] : null;
  if (track && typeof window.ImageCapture === "function") {
    new window.ImageCapture(track).grabFrame().then(function (bitmap) {
      var c2 = document.createElement("canvas");
      c2.width = canvas.width;
      c2.height = canvas.height;
      var x2 = c2.getContext("2d");
      x2.drawImage(bitmap, 0, 0, c2.width, c2.height);
      if (bitmap.close) bitmap.close();
      c2.toBlob(deliver, "image/jpeg", 0.92);
    }).catch(function () {
      canvas.toBlob(deliver, "image/jpeg", 0.92);
    });
    return;
  }
  canvas.toBlob(deliver, "image/jpeg", 0.92);
}
