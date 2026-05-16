#!/usr/bin/env python3
"""
Backend startup wrapper — waits for PostgreSQL and Ollama before launching uvicorn.
"""
import os
import sys
import time


def wait_for_postgres(max_wait: int = 120, interval: int = 3) -> bool:
    """Poll PostgreSQL until it accepts connections or timeout."""
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://memorytwin:memorytwin_pass@postgres:5432/memorytwin_db",
    )
    print("⏳ Waiting for PostgreSQL...", flush=True)
    start = time.time()
    while time.time() - start < max_wait:
        try:
            import psycopg2

            parts = db_url.replace("postgresql://", "").split("@")
            user_pass = parts[0].split(":")
            host_db = parts[1].split("/")
            host_port = host_db[0].split(":")
            conn = psycopg2.connect(
                host=host_port[0],
                port=int(host_port[1]) if len(host_port) > 1 else 5432,
                dbname=host_db[1],
                user=user_pass[0],
                password=user_pass[1],
                connect_timeout=3,
            )
            conn.close()
            elapsed = round(time.time() - start, 1)
            print(f"✅ PostgreSQL ready after {elapsed}s", flush=True)
            return True
        except Exception as exc:
            print(
                f"   DB not ready ({exc.__class__.__name__}) — retrying in {interval}s...",
                flush=True,
            )
            time.sleep(interval)
    print("❌ PostgreSQL did not become ready in time", flush=True)
    return False


def wait_for_ollama(max_wait: int = 300, interval: int = 5) -> bool:
    """Poll Ollama until reachable, model is present, and a warmup inference succeeds."""
    ollama_host = os.environ.get("OLLAMA_HOST", "http://ollama:11434").rstrip("/")
    print(f"⏳ Waiting for Ollama at {ollama_host}...", flush=True)

    start = time.time()
    while time.time() - start < max_wait:
        try:
            import requests

            ping = requests.get(f"{ollama_host}/", timeout=5)
            if ping.status_code != 200:
                raise RuntimeError(f"unexpected status {ping.status_code}")

            from services.llm_service import pull_model_if_missing, validate_ai_startup

            if pull_model_if_missing() and validate_ai_startup():
                elapsed = round(time.time() - start, 1)
                print(f"✅ Ollama + Llama3 ready after {elapsed}s", flush=True)
                return True

        except Exception as exc:
            print(
                f"   Ollama not ready ({exc.__class__.__name__}) — retrying in {interval}s...",
                flush=True,
            )
            time.sleep(interval)

    print("⚠️  Ollama did not become fully ready in time — starting backend anyway", flush=True)
    return False


def start_uvicorn() -> None:
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
        "--reload",
        "--log-level",
        "info",
    ]
    print(f"🚀 Starting: {' '.join(cmd)}", flush=True)
    os.execvp(sys.executable, cmd)


if __name__ == "__main__":
    time.sleep(2)

    if not wait_for_postgres():
        print("⚠️  Starting anyway (DB may catch up)...", flush=True)

    wait_for_ollama()

    start_uvicorn()
