from __future__ import annotations

import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class FrontendHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        frontend_dir = Path(__file__).resolve().parent / "frontend"
        super().__init__(*args, directory=str(frontend_dir), **kwargs)


if __name__ == "__main__":
    host = os.environ.get("FRONTEND_HOST", "127.0.0.1")
    port = int(os.environ.get("FRONTEND_PORT", "5173"))
    server = ThreadingHTTPServer((host, port), FrontendHandler)
    print(f"Frontend running on http://{host}:{port}")
    server.serve_forever()
