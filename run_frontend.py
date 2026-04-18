from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


def _npm_command() -> str:
    command = shutil.which("npm.cmd") or shutil.which("npm")
    if command is None:
        raise RuntimeError("npm is not installed or not available in PATH.")
    return command


def _run(command: list[str], cwd: Path) -> None:
    completed = subprocess.run(command, cwd=cwd)
    if completed.returncode != 0:
        raise SystemExit(completed.returncode)


def main() -> None:
    project_root = Path(__file__).resolve().parent
    frontend_dir = project_root / "frontend"
    npm = _npm_command()

    if not (frontend_dir / "node_modules").exists():
        print("Installing frontend dependencies...")
        _run([npm, "install"], frontend_dir)

    host = os.environ.get("FRONTEND_HOST", "127.0.0.1")
    port = os.environ.get("FRONTEND_PORT", "3000")

    print(f"Frontend running on http://{host}:{port}")
    _run([npm, "run", "dev", "--", "--hostname", host, "--port", port], frontend_dir)


if __name__ == "__main__":
    main()
