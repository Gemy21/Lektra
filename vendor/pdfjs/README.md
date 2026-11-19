# PDF.js (vendored)

`pdf.min.js` and `pdf.worker.min.js` are the **legacy UMD** build of
[PDF.js](https://github.com/mozilla/pdf.js) **3.11.174**, downloaded from
`https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/`.

The app uses them for exactly one thing: drawing the pages of a stored PDF onto
`<canvas>` in the file preview sheet (`openFilePreview` in `js/subjects.js`).
Safari on iOS renders a PDF inside an `<iframe>` as a single page that cannot be
scrolled, so the blob is handed to PDF.js instead.

- Loaded lazily, the first time a PDF is previewed.
- Cached by the service worker (`sw.js`, `MEDIA`), so previews work offline.
- The worker script is registered from `pdf.worker.min.js` next to this file.

Licensed under the Apache License, Version 2.0 (the header in each file).

## Updating

Drop the new build in a new folder (for example `pdfjs-4.x`) and point
`PDFJS_URL` / `PDFJS_WORKER` in `js/subjects.js` plus the two `MEDIA` entries in
`sw.js` at it. Keeping the version in the path is what makes the files safe to
cache forever; do not overwrite them in place.
