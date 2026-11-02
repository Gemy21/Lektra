// ===== timetable photo prep, off the main thread =====
//
// Decoding and re-encoding a phone photo is the only real CPU work in the scan:
// a 12 MP shot costs a few hundred milliseconds on a laptop and can cost over a
// second on a phone. Running that on the main thread is what made the app look
// frozen while it scanned — the spinner could not even paint.
//
// The page posts { id, file } and gets back one of:
//   { id, blob }        the ready-to-send JPEG
//   { id, skip: true }  the photo is already small enough, send it as-is
//   { id, error: 1 }    couldn't read it, the page falls back
//   { id, unsupported } this browser can't do it here, the page does it itself

var MAX_PX = 1600;
var MAX_BYTES = 900 * 1024;
var QUALITY = 0.86;

self.onmessage = function (e) {
  var d = e.data || {};
  var id = d.id;
  var file = d.file;

  if (!file) { self.postMessage({ id: id, error: 1 }); return; }
  if (!/^image\//.test(file.type || "")) { self.postMessage({ id: id, skip: true }); return; }
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
    self.postMessage({ id: id, unsupported: true });
    return;
  }

  createImageBitmap(file).then(function (bmp) {
    var w = bmp.width || 1;
    var h = bmp.height || 1;
    var scale = Math.min(1, MAX_PX / Math.max(w, h));

    if (scale === 1 && file.size <= MAX_BYTES) {
      if (bmp.close) bmp.close();
      self.postMessage({ id: id, skip: true });
      return;
    }

    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    if (bmp.close) bmp.close();

    // Let the decoder do the downscale as well: it filters properly, and it
    // also happens on this thread instead of the page's.
    return createImageBitmap(file, { resizeWidth: cw, resizeHeight: ch, resizeQuality: "high" })
      .then(function (small) {
        var canvas = new OffscreenCanvas(small.width, small.height);
        canvas.getContext("2d").drawImage(small, 0, 0);
        if (small.close) small.close();
        return canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
      })
      .then(function (blob) {
        if (!blob) { self.postMessage({ id: id, error: 1 }); return; }
        self.postMessage({ id: id, blob: blob });
      });
  }).catch(function () {
    self.postMessage({ id: id, error: 1 });
  });
};
