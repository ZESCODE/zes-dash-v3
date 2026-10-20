#!/usr/bin/env python3
"""
Minimal Termux-side file server to host the control panel static files.
Serves ./index.html, styles.css, app.js on http://localhost:3000
and proxies /api/* to the dashboard if needed.

Usage:
  python3 server.py
  PORT=3000 python3 server.py

Zero deps — stdlib http.server only.
"""
import os
import http.server
import socketserver
import pathlib

PORT = int(os.environ.get("PORT", "3000"))
ROOT = pathlib.Path(__file__).parent.resolve()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache" if self.path.endswith("index.html") else "public, max-age=3600")
        super().end_headers()
    def do_GET(self):
        # SPA fallback: serve index.html for unknown non-file paths
        path = (ROOT / self.path.lstrip("/").split("?")[0].split("#")[0])
        if not path.exists():
            self.path = "/index.html"
        return super().do_GET()

print(f"[vscode-panel] serving {ROOT} on http://localhost:{PORT}")
print(f"[vscode-panel] open http://localhost:{PORT} in Android Chrome/Firefox")
with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[vscode-panel] stopped")
