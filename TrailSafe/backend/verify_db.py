"""Verification script to test SQLite database connection and incidents table schema.

Run with:
    py verify_db.py
or
    python verify_db.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone

from app.database import (
    get_db_connection,
    get_db_path,
    init_db,
    verify_db_schema,
)


def main() -> int:
    print("=" * 60)
    print("TrailSafe SQLite Database Verification")
    print("=" * 60)

    # 1. Initialize database safely
    db_path = init_db()
    print(f"[OK] Database initialized at: {db_path}")

    # 2. Verify schema and table presence
    schema_result = verify_db_schema(db_path)
    if schema_result.get("status") != "ok":
        print(f"[FAIL] Schema verification failed: {schema_result.get('message')}")
        return 1

    columns = schema_result.get("columns", [])
    print(f"[OK] Table 'incidents' confirmed with {len(columns)} columns:")
    for col in columns:
        print(f"    - {col}")

    # 3. Test insert, query, and rollback/delete of a test record
    conn = get_db_connection(db_path)
    test_id = "TEST-VERIFY-001"
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO incidents (
                id, tourist_id, incident_type, severity, risk_score,
                description, status, assigned_responder, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                test_id,
                "TS-DEMO-001",
                "RISKY_ZONE",
                "HIGH",
                78,
                "Test verification canary entry",
                "OPEN",
                None,
                now_iso,
                now_iso,
            ),
        )
        conn.commit()

        # Query back
        cursor.execute("SELECT * FROM incidents WHERE id = ?", (test_id,))
        row = cursor.fetchone()
        if not row or row["id"] != test_id:
            print("[FAIL] Failed to query test incident record.")
            return 1

        print(
            f"[OK] Read/Write test successful: Verified incident '{row['id']}' "
            f"type '{row['incident_type']}' severity '{row['severity']}'"
        )

        # Clean up test canary record
        cursor.execute("DELETE FROM incidents WHERE id = ?", (test_id,))
        conn.commit()
        print("[OK] Test record cleaned up successfully.")

    except Exception as exc:
        print(f"[FAIL] Database read/write test error: {exc}")
        return 1
    finally:
        conn.close()

    print("=" * 60)
    print("Verification Result: ALL CHECKS PASSED (SQLite operational)")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
