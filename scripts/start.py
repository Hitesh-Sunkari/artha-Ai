"""ArthaAI — Unified Development and Production Process Runner.

Starts the FastAPI multi-agent backend and institutional React frontend.

Usage:
    # Single-Port Production Mode (serves React SPA + API on port 8000)
    python scripts/start.py

    # Dual-Process Development Mode (uvicorn on port 8000 + Vite dev server on port 5173)
    python scripts/start.py --dev
"""

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="ArthaAI Process Runner")
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Run Vite in live development mode (port 5173) with hot module reloading alongside uvicorn (port 8000)",
    )
    parser.add_argument("--port", type=int, default=8000, help="Backend port (default: 8000)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host binding (default: 127.0.0.1)")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    frontend_dir = repo_root / "frontend"
    frontend_dist = frontend_dir / "dist"

    print("=" * 70)
    print(" ArthaAI — Institutional Multi-Agent Quantitative Research Workstation")
    print("=" * 70)

    if not args.dev:
        if not frontend_dist.exists() or not (frontend_dist / "index.html").exists():
            print("\n[Build] Frontend production build not found. Compiling React SPA...")
            subprocess.run(["npm", "run", "build"], cwd=str(frontend_dir), check=True, shell=True)
            print("[Build] ✓ Frontend compiled successfully into frontend/dist/\n")

        print(f"[ArthaAI] Launching Unified Server at: http://{args.host}:{args.port}/")
        print("  -> Web Terminal: http://127.0.0.1:8000/")
        print("  -> API OpenAPI Docs: http://127.0.0.1:8000/docs")
        print("  -> Health Check: http://127.0.0.1:8000/health")
        print("  -> Readiness Probe: http://127.0.0.1:8000/ready\n")

        cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "arthaai.api.research_api:app",
            "--host",
            args.host,
            "--port",
            str(args.port),
        ]
        subprocess.run(cmd, cwd=str(repo_root))
    else:
        print("[Dev Mode] Launching backend (port 8000) and Vite dev server (port 5173)...")
        backend_proc = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "arthaai.api.research_api:app",
                "--host",
                args.host,
                "--port",
                str(args.port),
                "--reload",
            ],
            cwd=str(repo_root),
        )

        vite_proc = subprocess.Popen(["npm", "run", "dev"], cwd=str(frontend_dir), shell=True)

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[ArthaAI] Shutting down development processes...")
            backend_proc.terminate()
            vite_proc.terminate()


if __name__ == "__main__":
    main()
