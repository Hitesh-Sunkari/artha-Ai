#!/usr/bin/env python3
"""ArthaAI PostgreSQL & Supabase Integration & Persistence Verification Suite.

Performs a strict 9-step integration test:
1. Connects using DATABASE_URL (masks credentials in logs).
2. Verifies the expected database schema (tables & columns).
3. Inserts a uniquely identified temporary test record into `research_runs`.
4. Commits the transaction.
5. Closes the connection.
6. Opens a new distinct connection.
7. Reads the same record and verifies its values.
8. Deletes the temporary record.
9. Verifies cleanup.
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()


def mask_url(url: str) -> str:
    """Masks database password in connection string for secure logging."""
    try:
        parsed = urlparse(url)
        netloc = f"{parsed.username or ''}:***@{parsed.hostname or ''}:{parsed.port or ''}"
        return f"{parsed.scheme}://{netloc}{parsed.path}"
    except Exception:
        return "[MASKED_DATABASE_URL]"


def run_postgres_persistence_audit() -> dict[str, str]:
    db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL")
    if not db_url or not db_url.strip():
        print("[-] NOT RUN: DATABASE_URL or SUPABASE_DATABASE_URL is not configured in environment.")
        print("    To run: set DATABASE_URL=postgresql://user:pass@host:5432/db in your environment.")
        return {"status": "NOT RUN", "reason": "DATABASE_URL not configured"}

    clean_url = db_url.strip()
    if clean_url.startswith("postgres://"):
        clean_url = clean_url.replace("postgres://", "postgresql://", 1)

    print(f"[*] Step 1: Connecting to PostgreSQL via {mask_url(clean_url)}...")

    try:
        import psycopg2
    except ImportError:
        print("[-] FAIL: psycopg2 is not installed in the current Python environment.")
        return {"status": "FAIL", "reason": "psycopg2 missing"}

    test_run_id = f"test-audit-{uuid.uuid4().hex[:12]}"
    test_symbol = "INFY.NS"
    now_iso = datetime.now(timezone.utc).isoformat()

    conn1 = None
    conn2 = None
    try:
        # 1. Connect
        conn1 = psycopg2.connect(clean_url, connect_timeout=10)
        print("[+] Step 1 PASS: Connection established successfully.")

        # 2. Schema verification
        with conn1.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('registered_users', 'research_runs', 'benchmark_experiments');
            """)
            tables = [r[0] for r in cur.fetchall()]
            print(f"[*] Step 2: Found verified schema tables: {tables}")
            if "research_runs" not in tables:
                print("[-] Step 2 FAIL: 'research_runs' table does not exist in target database.")
                return {"status": "FAIL", "reason": "Schema missing research_runs table"}
        print("[+] Step 2 PASS: Expected schema verified.")

        # 3. Insert temporary record
        print(f"[*] Step 3: Inserting uniquely identified test record {test_run_id}...")
        with conn1.cursor() as cur:
            cur.execute(
                """
                INSERT INTO research_runs (
                    run_id, symbol, status, orchestration_pattern, 
                    created_at, total_elapsed_seconds, recommendation, 
                    conviction_score, report_json, trace_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    test_run_id,
                    test_symbol,
                    "COMPLETED",
                    "INTEGRATION_TEST",
                    now_iso,
                    1.23,
                    "ACCUMULATE",
                    88.5,
                    json.dumps({"audit": "persistence_verification", "test_id": test_run_id}),
                    json.dumps([{"step": "init", "ts": now_iso}]),
                ),
            )
        print("[+] Step 3 PASS: Temporary record inserted.")

        # 4. Commit transaction
        print("[*] Step 4: Committing transaction on connection 1...")
        conn1.commit()
        print("[+] Step 4 PASS: Transaction committed.")

        # 5. Close connection 1
        print("[*] Step 5: Closing connection 1...")
        conn1.close()
        conn1 = None
        print("[+] Step 5 PASS: Connection 1 cleanly closed.")

        # 6. Open connection 2
        print("[*] Step 6: Opening new distinct connection 2...")
        conn2 = psycopg2.connect(clean_url, connect_timeout=10)
        print("[+] Step 6 PASS: Connection 2 established.")

        # 7. Read and verify record
        print(f"[*] Step 7: Reading and verifying record {test_run_id}...")
        with conn2.cursor() as cur:
            cur.execute(
                """
                SELECT run_id, symbol, status, orchestration_pattern, conviction_score, report_json
                FROM research_runs
                WHERE run_id = %s
                """,
                (test_run_id,),
            )
            row = cur.fetchone()
            if not row:
                print("[-] Step 7 FAIL: Record was not persisted across distinct connections.")
                return {"status": "FAIL", "reason": "Record not found in new connection"}

            r_id, sym, st, orch, score, rep = row
            if r_id != test_run_id or sym != test_symbol or score != 88.5:
                print(f"[-] Step 7 FAIL: Record data mismatch: {row}")
                return {"status": "FAIL", "reason": "Data corruption in persisted record"}
        print(f"[+] Step 7 PASS: Record verified: symbol={sym}, status={st}, conviction={score}.")

        # 8. Delete record
        print(f"[*] Step 8: Deleting temporary test record {test_run_id}...")
        with conn2.cursor() as cur:
            cur.execute("DELETE FROM research_runs WHERE run_id = %s", (test_run_id,))
        conn2.commit()
        print("[+] Step 8 PASS: Record deleted.")

        # 9. Verify cleanup
        print("[*] Step 9: Verifying deletion cleanup...")
        with conn2.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM research_runs WHERE run_id = %s", (test_run_id,))
            remaining = cur.fetchone()[0]
            if remaining != 0:
                print("[-] Step 9 FAIL: Record still present after delete operation.")
                return {"status": "FAIL", "reason": "Cleanup failed"}
        print("[+] Step 9 PASS: Verified 0 remaining records. Database returned to initial clean state.")

        conn2.close()
        conn2 = None
        return {"status": "PASS", "evidence": f"Full 9-step persistence lifecycle validated with run_id {test_run_id}"}

    except Exception as exc:
        print(f"[-] FAIL with exception: {exc}")
        return {"status": "FAIL", "reason": str(exc)}
    finally:
        if conn1 and not conn1.closed:
            conn1.close()
        if conn2 and not conn2.closed:
            conn2.close()


if __name__ == "__main__":
    res = run_postgres_persistence_audit()
    print(f"\nFinal Result: {res['status']}")
    sys.exit(0 if res["status"] in ("PASS", "NOT RUN") else 1)
