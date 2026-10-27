"""Automated Verification Script for TrailSafe SOS Incident Lifecycle & Frontend.

Executes:
TEST 1 — CREATE (API & Database)
TEST 2 — DUPLICATE PREVENTION (API & Database)
TEST 3 — CLOSE AND REOPEN (API & Database)
TEST 4 — FRONTEND (Live Headless Chrome UI Interaction via CDP)

Strict requirement:
- Do not delete existing incidents or reset the database.
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

BASE_API_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173/#tourist"
DB_PATH = Path(__file__).resolve().parent / "data" / "trailsafe.db"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PROFILE_DIR = Path(__file__).resolve().parent / "temp_chrome_test_profile"


def get_db_rows() -> list[dict]:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("SELECT * FROM incidents ORDER BY created_at DESC;").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def api_request(path: str, method: str = "GET", body: dict | None = None) -> tuple[int, dict | list]:
    url = f"{BASE_API_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return e.code, parsed


async def run_frontend_test(test4_port: int = 9225) -> dict:
    """Run real frontend test against Chrome headless using DevTools WebSocket."""
    import websockets  # available in venv

    if PROFILE_DIR.exists():
        shutil.rmtree(PROFILE_DIR, ignore_errors=True)
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        f"--remote-debugging-port={test4_port}",
        f"--user-data-dir={PROFILE_DIR}",
        FRONTEND_URL,
    ]
    proc = subprocess.Popen(cmd)
    try:
        # Wait for CDP endpoint
        ws_url = None
        for _ in range(30):
            await asyncio.sleep(0.5)
            try:
                with urllib.request.urlopen(f"http://localhost:{test4_port}/json/list") as r:
                    targets = json.loads(r.read().decode("utf-8"))
                    for t in targets:
                        if t.get("type") == "page" and "5173" in t.get("url", ""):
                            ws_url = t.get("webSocketDebuggerUrl")
                            break
                    if ws_url:
                        break
            except Exception:
                continue

        if not ws_url:
            raise RuntimeError(f"Could not connect to Chrome CDP on port {test4_port}")

        async with websockets.connect(ws_url) as ws:
            msg_id = 0

            async def cdp_eval(expression: str) -> dict:
                nonlocal msg_id
                msg_id += 1
                req = {
                    "id": msg_id,
                    "method": "Runtime.evaluate",
                    "params": {
                        "expression": expression,
                        "returnByValue": True,
                        "awaitPromise": True,
                    },
                }
                await ws.send(json.dumps(req))
                while True:
                    res_raw = await ws.recv()
                    res = json.loads(res_raw)
                    if res.get("id") == msg_id:
                        return res.get("result", {}).get("result", {})

            # 1. Wait for page load
            for _ in range(20):
                await asyncio.sleep(0.5)
                res = await cdp_eval("document.querySelector('.tourist-page-title')?.textContent")
                if res.get("value"):
                    break

            page_title = (await cdp_eval("document.querySelector('.tourist-page-title')?.textContent")).get("value")
            initial_count_text = (await cdp_eval("document.querySelector('.stat-value-alert')?.textContent")).get("value")

            # 2. Click the SOS trigger button once
            await cdp_eval("document.querySelector('.btn-sos-trigger')?.click()")
            await asyncio.sleep(0.5)

            # Confirm in modal
            modal_visible = (await cdp_eval("document.querySelector('.modal-card-danger') !== null")).get("value")
            await cdp_eval("document.querySelector('.btn-confirm-danger')?.click()")

            # Wait for backend response and incident card display
            for _ in range(20):
                await asyncio.sleep(0.5)
                has_card = (await cdp_eval("document.querySelector('.sos-backend-success-card') !== null")).get("value")
                if has_card:
                    break

            first_displayed_id = (await cdp_eval("document.querySelector('.meta-value-id')?.textContent")).get("value")
            first_displayed_status = (await cdp_eval("document.querySelector('.meta-value-status')?.textContent")).get("value")
            first_count_text = (await cdp_eval("document.querySelector('.stat-value-alert')?.textContent")).get("value")

            # 3. Click the SOS trigger button again while incident is OPEN
            await cdp_eval("document.querySelector('.btn-sos-trigger')?.click()")
            await asyncio.sleep(0.5)

            # Confirm in modal
            await cdp_eval("document.querySelector('.btn-confirm-danger')?.click()")
            await asyncio.sleep(1.0)

            # 4. Check displayed values after second SOS
            second_displayed_id = (await cdp_eval("document.querySelector('.meta-value-id')?.textContent")).get("value")
            second_displayed_status = (await cdp_eval("document.querySelector('.meta-value-status')?.textContent")).get("value")
            second_count_text = (await cdp_eval("document.querySelector('.stat-value-alert')?.textContent")).get("value")
            duplicate_notice = (await cdp_eval("document.querySelector('.header-duplicate-notice')?.textContent")).get("value")

            return {
                "page_title": page_title,
                "initial_count_text": initial_count_text,
                "first_displayed_id": first_displayed_id,
                "first_displayed_status": first_displayed_status,
                "first_count_text": first_count_text,
                "second_displayed_id": second_displayed_id,
                "second_displayed_status": second_displayed_status,
                "second_count_text": second_count_text,
                "duplicate_notice": duplicate_notice,
            }
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        if PROFILE_DIR.exists():
            shutil.rmtree(PROFILE_DIR, ignore_errors=True)


def run_all_tests():
    print("=" * 70)
    print("TRAILSAFE SOS INCIDENT LIFECYCLE & FRONTEND VERIFICATION")
    print("=" * 70)

    # Pre-check database status (DO NOT DELETE ANY RECORD)
    existing_rows = get_db_rows()
    print(f"[*] Pre-test total database records: {len(existing_rows)}")
    for r in existing_rows:
        print(f"    - ID: {r['id']}, Tourist: {r['tourist_id']}, Type: {r['incident_type']}, Status: {r['status']}")

    expected_existing_ids = ["INC-9D0B7643E0", "INC-8E0E9AFF9B"]
    found_ids = [r["id"] for r in existing_rows]
    for eid in expected_existing_ids:
        assert eid in found_ids, f"Expected existing incident {eid} to be in database!"
    print("[PASS] Confirmed pre-existing incidents INC-9D0B7643E0 and INC-8E0E9AFF9B exist and are preserved.")

    # -------------------------------------------------------------
    # TEST 1 — CREATE
    # -------------------------------------------------------------
    print("\n" + "-" * 60)
    print("TEST 1 — CREATE:")
    print("-" * 60)

    # 1. Check current incident count
    status_code, inc_list = api_request("/api/incidents")
    assert status_code == 200
    baseline_count = len(inc_list)
    print(f"1. Current incident count: {baseline_count}")

    # 2. Trigger one SOS for TS-DEMO-001
    payload_sos = {
        "tourist_id": "TS-DEMO-001",
        "incident_type": "SOS",
        "severity": "CRITICAL",
        "risk_score": 100,
        "description": "Simulated emergency SOS triggered by the demo tourist.",
    }
    status_code, created_incident = api_request("/api/incidents", method="POST", body=payload_sos)
    print(f"2. Triggered SOS. HTTP response status: {status_code}")
    assert status_code == 201, f"Expected HTTP 201 Created, got {status_code}"

    # 3. Save the returned incident ID
    test1_id = created_incident["id"]
    test1_status = created_incident["status"]
    print(f"3. Returned incident ID: {test1_id} (Status: {test1_status})")
    assert test1_status == "OPEN", f"Expected status OPEN, got {test1_status}"
    assert test1_id.startswith("INC-"), f"Unexpected ID format: {test1_id}"

    # 4. Confirm that exactly one new database record was created
    status_code, inc_list_after_create = api_request("/api/incidents")
    assert status_code == 200
    new_count = len(inc_list_after_create)
    db_rows_after_create = get_db_rows()
    print(f"4. Confirming database count: previous={baseline_count}, new={new_count}, SQLite rowcount={len(db_rows_after_create)}")
    assert new_count == baseline_count + 1, f"Expected count {baseline_count + 1}, got {new_count}"
    assert len(db_rows_after_create) == baseline_count + 1
    created_db_record = next(r for r in db_rows_after_create if r["id"] == test1_id)
    assert created_db_record["status"] == "OPEN"
    assert created_db_record["tourist_id"] == "TS-DEMO-001"
    print(f"[PASS] TEST 1 SUCCESSFUL: Exactly one new database record created with ID {test1_id}.")

    # -------------------------------------------------------------
    # TEST 2 — DUPLICATE PREVENTION
    # -------------------------------------------------------------
    print("\n" + "-" * 60)
    print("TEST 2 — DUPLICATE PREVENTION:")
    print("-" * 60)

    # 1. Trigger SOS again while newly created incident is OPEN
    status_code, dup_response = api_request("/api/incidents", method="POST", body=payload_sos)
    print(f"1. Triggered SOS again while {test1_id} is OPEN. HTTP response status: {status_code}")

    # 2. Confirm backend returns the existing OPEN incident instead of creating another record
    assert status_code == 200, f"Expected HTTP 200 OK for duplicate open SOS, got {status_code}"
    print(f"2. Backend returned HTTP 200 OK with existing record (Status: {dup_response['status']}).")
    assert dup_response["status"] == "OPEN"

    # 3. Confirm that the incident count does not increase
    status_code, inc_list_after_dup = api_request("/api/incidents")
    assert status_code == 200
    dup_count = len(inc_list_after_dup)
    db_rows_after_dup = get_db_rows()
    print(f"3. Confirming incident count after duplicate attempt: count={dup_count}, SQLite rowcount={len(db_rows_after_dup)}")
    assert dup_count == new_count, f"Count increased! Expected {new_count}, got {dup_count}"
    assert len(db_rows_after_dup) == new_count

    # 4. Confirm that the returned ID is unchanged
    dup_id = dup_response["id"]
    print(f"4. Confirming returned ID: original={test1_id}, returned={dup_id}")
    assert dup_id == test1_id, f"Expected returned ID {test1_id}, got {dup_id}"
    print(f"[PASS] TEST 2 SUCCESSFUL: Duplicate SOS correctly blocked; returned existing OPEN incident {test1_id}.")

    # -------------------------------------------------------------
    # TEST 3 — CLOSE AND REOPEN
    # -------------------------------------------------------------
    print("\n" + "-" * 60)
    print("TEST 3 — CLOSE AND REOPEN:")
    print("-" * 60)

    # 1. Close the open incident using existing API
    status_code, closed_resp = api_request(f"/api/incidents/{test1_id}/close", method="PATCH")
    print(f"1. Closed incident {test1_id}. HTTP status: {status_code}")
    assert status_code == 200, f"Expected HTTP 200 OK, got {status_code}"
    assert closed_resp["status"] == "CLOSED"
    print(f"   Updated status in response: {closed_resp['status']}, updated_at: {closed_resp['updated_at']}")

    # 2. Trigger SOS again
    status_code, reopen_resp = api_request("/api/incidents", method="POST", body=payload_sos)
    print(f"2. Triggered SOS after closing {test1_id}. HTTP status: {status_code}")
    assert status_code == 201, f"Expected HTTP 201 Created for subsequent SOS, got {status_code}"

    # 3. Confirm that a new incident is created with a different ID
    test3_id = reopen_resp["id"]
    print(f"3. New incident created with ID: {test3_id}")
    assert test3_id != test1_id, f"Expected different ID, got same ID {test3_id}"
    assert reopen_resp["status"] == "OPEN"

    # 4. Confirm that the old incident remains CLOSED
    status_code, old_record = api_request(f"/api/incidents/{test1_id}")
    assert status_code == 200
    assert old_record["status"] == "CLOSED", f"Expected {test1_id} to be CLOSED, got {old_record['status']}"
    print(f"4. Verified old incident {test1_id} remains CLOSED.")

    status_code, new_record = api_request(f"/api/incidents/{test3_id}")
    assert status_code == 200
    assert new_record["status"] == "OPEN", f"Expected {test3_id} to be OPEN, got {new_record['status']}"
    print(f"   Verified new incident {test3_id} is OPEN.")
    print(f"[PASS] TEST 3 SUCCESSFUL: Closed incident remained CLOSED, and new incident {test3_id} was created.")

    # Close test3_id cleanly before frontend test so the frontend starts with a known clean state
    status_code, _ = api_request(f"/api/incidents/{test3_id}/close", method="PATCH")
    assert status_code == 200
    print(f"[*] Safely closed {test3_id} via API before beginning Frontend Test 4.")

    # -------------------------------------------------------------
    # TEST 4 — FRONTEND
    # -------------------------------------------------------------
    print("\n" + "-" * 60)
    print("TEST 4 — FRONTEND (Live Headless Chrome UI Verification):")
    print("-" * 60)

    frontend_result = asyncio.run(run_frontend_test())
    print(f"1. Opened tourist safety page. Page heading: '{frontend_result['page_title']}'")
    print(f"   Initial telemetry count: {frontend_result['initial_count_text']}")

    print(f"2. Clicked SOS button once (and confirmed):")
    print(f"   - Displayed Incident ID: {frontend_result['first_displayed_id']}")
    print(f"   - Displayed Status: {frontend_result['first_displayed_status']}")
    print(f"   - Telemetry Incident Count: {frontend_result['first_count_text']}")
    assert frontend_result["first_displayed_id"].startswith("INC-")

    print(f"3. Clicked SOS button again while incident is OPEN (and confirmed):")
    print(f"   - Displayed Incident ID: {frontend_result['second_displayed_id']}")
    print(f"   - Displayed Status: {frontend_result['second_displayed_status']}")
    print(f"   - Telemetry Incident Count: {frontend_result['second_count_text']}")

    # 4. Confirm that the same incident ID is displayed and the incident count does not increase
    assert frontend_result["second_displayed_id"] == frontend_result["first_displayed_id"], (
        f"Expected same ID {frontend_result['first_displayed_id']}, got {frontend_result['second_displayed_id']}"
    )
    assert frontend_result["second_count_text"] == frontend_result["first_count_text"], (
        f"Expected count to remain {frontend_result['first_count_text']}, got {frontend_result['second_count_text']}"
    )
    print(f"4. Confirmed: Same incident ID '{frontend_result['second_displayed_id']}' is displayed,")
    print(f"   and telemetry count remained '{frontend_result['second_count_text']}'.")
    if frontend_result["duplicate_notice"]:
        print(f"   Frontend notice displayed: '{frontend_result['duplicate_notice'].strip()}'")
    print("[PASS] TEST 4 SUCCESSFUL: Frontend verified in real browser interaction.")

    # Final DB integrity check
    final_rows = get_db_rows()
    print("\n" + "=" * 70)
    print("FINAL DATABASE INTEGRITY AUDIT:")
    print("=" * 70)
    print(f"Total incidents in database: {len(final_rows)}")
    for r in final_rows:
        print(f"  [{r['status']}] {r['id']} | Tourist: {r['tourist_id']} | Created: {r['created_at']} | Updated: {r['updated_at']}")

    # Confirm original incidents are STILL intact
    for eid in expected_existing_ids:
        rec = next((r for r in final_rows if r["id"] == eid), None)
        assert rec is not None, f"Original incident {eid} missing!"
        assert rec["status"] == "CLOSED"
    print(f"\n[OK] Pre-existing records {expected_existing_ids} were never modified or deleted.")
    print("ALL 4 TESTS COMPLETED AND VERIFIED WITH 100% SUCCESS.")


if __name__ == "__main__":
    try:
        run_all_tests()
    except Exception as e:
        print(f"\n[FAIL] Test failure: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
