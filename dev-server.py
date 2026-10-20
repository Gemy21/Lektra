"""Local dev server for Lektra.

Why this exists instead of `python -m http.server`: that one sends no
Cache-Control header, so Chrome applies *heuristic* caching to app.js/style.css
and keeps serving your old files after you edit them. Chasing that phantom bug
wastes a surprising amount of time.

This sends Cache-Control: no-store, so every reload is the real file.
GitHub Pages is the real host; this is only for local work.
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)
    ThreadingHTTPServer.allow_reuse_address = True
    with ThreadingHTTPServer(("", port), Handler) as httpd:
        print(f"Serving {root}")
        print(f"Open http://localhost:{port}   (Ctrl+C to stop)   [no-store: never cached]")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
