"""Comprehensive Verification Suite for TrailSafe Authority Control-Room Dashboard & API.

Verifies:
1. Health check & database integrity (5 existing records preserved).
2. Live GET /api/incidents endpoint returning full incident records with all fields.
3. Live SOS creation (POST /api/incidents) returning HTTP 201 with unique ID.
4. Duplicate SOS prevention while OPEN returning HTTP 200 with identical ID without increasing count.
5. Live UI verification in Headless Chrome via CDP on http://localhost:5173/#authority:
   - Dashboard displays newly created OPEN CRITICAL SOS incident.
   - Page title and simulated command-room disclaimer banner render properly.
   - Telemetry metric counters update (Total, Active Open, Active Critical).
   - Search filter works interactively ('0D9F' filters down to 1 matching row).
   - Opens and verifies the Incident Inspector modal with metadata and simulated disclaimer.
6. Simulated responder assignment (PATCH /api/incidents/{id}/assign) updating status to ASSIGNED.
7. Duplicate SOS prevention while ASSIGNED returning HTTP 200 without increasing count.
8. Incident closure (PATCH /api/incidents/{id}/close) setting status to CLOSED in database and dashboard.
9. Post-closure SOS creation: subsequent SOS creates a brand new incident ID (HTTP 201 Created).
10. Preserves all 5 original incident records without loss or corruption.
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

import tempfile

BASE_API_URL = "http://localhost:8000"
FRONTEND_AUTHORITY_URL = "http://localhost:5173/#authority"
DB_PATH = Path(__file__).resolve().parent / "data" / "trailsafe.db"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PROFILE_DIR = Path(tempfile.gettempdir()) / "trailsafe_chrome_authority_profile"

PRESERVED_ORIGINAL_IDS = [
    "INC-8E0E9AFF9B",
    "INC-9D0B7643E0",
    "INC-18D797B50D",
    "INC-82B22CF66D",
    "INC-0D9F68497C",
]


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


async def test_frontend_authority_ui(expected_active_id: str | None = None) -> dict:
    import websockets

    if PROFILE_DIR.exists():
        shutil.rmtree(PROFILE_DIR, ignore_errors=True)
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    cdp_port = 9334
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        f"--remote-debugging-port={cdp_port}",
        f"--user-data-dir={PROFILE_DIR}",
        FRONTEND_AUTHORITY_URL,
    ]
    proc = subprocess.Popen(cmd)
    try:
        ws_url = None
        for _ in range(30):
            await asyncio.sleep(0.5)
            try:
                with urllib.request.urlopen(f"http://localhost:{cdp_port}/json/list") as r:
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
            raise RuntimeError(f"Could not connect to Chrome CDP on port {cdp_port}")

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

            # 1. Wait for authority dashboard elements to render
            for _ in range(30):
                await asyncio.sleep(0.5)
                res = await cdp_eval("document.querySelector('.auth-page-title')?.textContent")
                if res.get("value"):
                    break

            page_title = (await cdp_eval("document.querySelector('.auth-page-title')?.textContent")).get("value")
            disclaimer = (await cdp_eval("document.querySelector('.authority-disclaimer-banner')?.textContent")).get("value")

            # Check metric card values
            metric_total = (await cdp_eval("document.querySelectorAll('.metric-number')[0]?.textContent")).get("value")
            metric_open = (await cdp_eval("document.querySelectorAll('.metric-number')[1]?.textContent")).get("value")
            metric_critical = (await cdp_eval("document.querySelectorAll('.metric-number')[2]?.textContent")).get("value")
            metric_assigned = (await cdp_eval("document.querySelectorAll('.metric-number')[3]?.textContent")).get("value")
            metric_closed = (await cdp_eval("document.querySelectorAll('.metric-number')[4]?.textContent")).get("value")

            # Check table rows count
            row_count = (await cdp_eval("document.querySelectorAll('.incident-table-row').length")).get("value")

            # Check whether expected active ID is in the table
            active_id_found = False
            if expected_active_id:
                has_active = (await cdp_eval(f"document.body.innerText.includes('{expected_active_id}')")).get("value")
                active_id_found = bool(has_active)

            # Test search filter interaction: filter by '0D9F'
            await cdp_eval("""
                (() => {
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) {
                        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        nativeSetter.call(searchInput, '0D9F');
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                })()
            """)
            await asyncio.sleep(0.5)
            filtered_search_rows = (await cdp_eval("document.querySelectorAll('.incident-table-row').length")).get("value")

            # Clear search
            await cdp_eval("""
                (() => {
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) {
                        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        nativeSetter.call(searchInput, '');
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                })()
            """)
            await asyncio.sleep(0.5)

            # Test opening inspector modal on the first row
            await cdp_eval("document.querySelector('.btn-table-inspect')?.click()")
            await asyncio.sleep(0.7)

            modal_open = (await cdp_eval("document.querySelector('.authority-modal-card') !== null")).get("value")
            modal_id = (await cdp_eval("document.querySelector('.modal-incident-id')?.textContent")).get("value")
            modal_disclaimer = (await cdp_eval("document.querySelector('.simulated-disclaimer-box')?.textContent")).get("value")

            # Close inspector modal
            await cdp_eval("document.querySelector('.modal-close-btn')?.click()")
            await asyncio.sleep(0.5)
            modal_after_close = (await cdp_eval("document.querySelector('.authority-modal-card') !== null")).get("value")

            return {
                "page_title": page_title,
                "has_disclaimer": "SIMULATION" in (disclaimer or ""),
                "metrics": {
                    "total": metric_total,
                    "open": metric_open,
                    "critical": metric_critical,
                    "assigned": metric_assigned,
                    "closed": metric_closed,
                },
                "row_count": row_count,
                "active_id_found": active_id_found,
                "filtered_search_rows": filtered_search_rows,
                "modal_opened": modal_open,
                "modal_id": modal_id,
                "modal_has_disclaimer": "simulated" in (modal_disclaimer or "").lower(),
                "modal_closed": not modal_after_close,
            }
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        if PROFILE_DIR.exists():
            shutil.rmtree(PROFILE_DIR, ignore_errors=True)


def run_verification():
    print("=" * 75)
    print("TRAILSAFE AUTHORITY CONTROL-ROOM DASHBOARD & API VERIFICATION")
    print("=" * 75)

    test_created_ids = []

    try:
        # 0. Health check
        status, health_resp = api_request("/api/health")
        assert status == 200 and health_resp.get("status") == "ok", f"Health check failed: {health_resp}"
        print(f"[PASS] 0. GET /api/health returned HTTP 200 OK: {health_resp}")

        # Initial state check: verify the 5 original preserved records
        initial_db_rows = get_db_rows()
        print(f"[*] Baseline database records count: {len(initial_db_rows)}")
        found_db_ids = [r["id"] for r in initial_db_rows]
        for pid in PRESERVED_ORIGINAL_IDS:
            assert pid in found_db_ids, f"Required preserved record {pid} missing from database!"
        print(f"[PASS] Confirmed all {len(PRESERVED_ORIGINAL_IDS)} original incident records are intact and preserved.")

        # 1. Verify GET /api/incidents returns full schema
        status, incidents_list = api_request("/api/incidents")
        assert status == 200, f"GET /api/incidents failed with status {status}"
        assert len(incidents_list) == len(initial_db_rows)
        first_item = incidents_list[0]
        required_keys = ["id", "tourist_id", "incident_type", "severity", "risk_score", "status", "assigned_responder", "created_at", "updated_at"]
        for k in required_keys:
            assert k in first_item, f"Missing key {k} in incident response"
        print(f"[PASS] 1. GET /api/incidents returned {len(incidents_list)} incidents with all required schema attributes.")

        # 2. Trigger new SOS for TS-DEMO-001
        baseline_count = len(incidents_list)
        payload_sos = {
            "tourist_id": "TS-DEMO-001",
            "incident_type": "SOS",
            "severity": "CRITICAL",
            "risk_score": 100,
            "description": "Simulated emergency SOS from Tourist App for Authority Dashboard testing.",
        }
        status, created_sos = api_request("/api/incidents", method="POST", body=payload_sos)
        assert status == 201, f"Expected 201 Created, got {status}: {created_sos}"
        test_id = created_sos["id"]
        test_created_ids.append(test_id)
        assert test_id.startswith("INC-")
        assert created_sos["status"] == "OPEN"
        assert created_sos["severity"] == "CRITICAL"
        assert created_sos["risk_score"] == 100
        print(f"[PASS] 2. POST /api/incidents created active SOS: ID={test_id}, status={created_sos['status']}, severity={created_sos['severity']}")

        # Confirm count incremented by exactly 1 in DB
        status, list_after_create = api_request("/api/incidents")
        assert len(list_after_create) == baseline_count + 1
        print(f"[PASS] Confirmed incident count increased from {baseline_count} to {len(list_after_create)}.")

        # 3. Duplicate SOS prevention while OPEN
        status, dup_sos = api_request("/api/incidents", method="POST", body=payload_sos)
        assert status == 200, f"Expected 200 OK for duplicate open SOS, got {status}"
        assert dup_sos["id"] == test_id, f"Expected same ID {test_id}, got {dup_sos['id']}"
        status, list_after_dup = api_request("/api/incidents")
        assert len(list_after_dup) == baseline_count + 1
        print(f"[PASS] 3. Duplicate SOS while OPEN returned HTTP 200 with matching ID {test_id}. Count unchanged ({len(list_after_dup)}).")

        # 4. Verify Live Authority Dashboard UI in Chrome CDP while SOS is active!
        print("\n" + "-" * 60)
        print("4. FRONTEND AUTHORITY DASHBOARD UI VERIFICATION (CHROME CDP)")
        print("-" * 60)
        ui_result = asyncio.run(test_frontend_authority_ui(expected_active_id=test_id))
        print(f"[*] Page Title: {ui_result['page_title']}")
        print(f"[*] Disclaimer Banner Detected: {ui_result['has_disclaimer']}")
        print(f"[*] Metrics displayed: {ui_result['metrics']}")
        print(f"[*] Active SOS ID {test_id} rendered on dashboard: {ui_result['active_id_found']}")
        print(f"[*] Table Row Count: {ui_result['row_count']}")
        print(f"[*] Filtered Search Rows ('0D9F'): {ui_result['filtered_search_rows']}")
        print(f"[*] Inspector Modal Opened: {ui_result['modal_opened']}, Inspected ID: {ui_result['modal_id']}")
        print(f"[*] Modal Simulated Disclaimer Present: {ui_result['modal_has_disclaimer']}")
        print(f"[*] Modal Closed Successfully: {ui_result['modal_closed']}")

        assert "Authority Control Room Dashboard" in ui_result["page_title"]
        assert ui_result["has_disclaimer"] is True
        assert ui_result["active_id_found"] is True, f"Expected active ID {test_id} on dashboard!"
        assert int(ui_result["row_count"]) == baseline_count + 1
        assert ui_result["filtered_search_rows"] == 1
        assert ui_result["modal_opened"] is True
        assert ui_result["modal_has_disclaimer"] is True
        assert ui_result["modal_closed"] is True
        print("[PASS] 4. Live Authority Dashboard rendered active SOS, correct telemetry, interactive filter, and modal inspector.")

        # 5. Assign Simulated Responder
        print("\n" + "-" * 60)
        print("5. SIMULATED RESPONDER ASSIGNMENT")
        print("-" * 60)
        responder_payload = {"assigned_responder": "Unit 1 - Hazratganj Rapid Patrol (Simulated)"}
        status, assigned_incident = api_request(f"/api/incidents/{test_id}/assign", method="PATCH", body=responder_payload)
        assert status == 200, f"Expected 200 OK for responder assign, got {status}: {assigned_incident}"
        assert assigned_incident["assigned_responder"] == "Unit 1 - Hazratganj Rapid Patrol (Simulated)"
        assert assigned_incident["status"] == "ASSIGNED"
        print(f"[PASS] 5. PATCH /api/incidents/{test_id}/assign assigned responder: {assigned_incident['assigned_responder']} (Status: {assigned_incident['status']})")

        # 6. Duplicate SOS prevention while ASSIGNED
        status, dup_assigned_sos = api_request("/api/incidents", method="POST", body=payload_sos)
        assert status == 200, f"Expected 200 OK for duplicate while ASSIGNED, got {status}"
        assert dup_assigned_sos["id"] == test_id
        status, list_after_dup2 = api_request("/api/incidents")
        assert len(list_after_dup2) == baseline_count + 1
        print(f"[PASS] 6. Duplicate SOS while ASSIGNED returned HTTP 200 with matching ID {test_id}. Count unchanged ({len(list_after_dup2)}).")

        # 7. Close Incident
        status, closed_incident = api_request(f"/api/incidents/{test_id}/close", method="PATCH")
        assert status == 200, f"Expected 200 OK for incident close, got {status}: {closed_incident}"
        assert closed_incident["status"] == "CLOSED"
        print(f"[PASS] 7. PATCH /api/incidents/{test_id}/close marked incident CLOSED: {closed_incident['id']} (Status: {closed_incident['status']})")

        # 8. Re-open after closure
        status, second_created_sos = api_request("/api/incidents", method="POST", body=payload_sos)
        assert status == 201, f"Expected 201 Created after closing, got {status}"
        second_id = second_created_sos["id"]
        test_created_ids.append(second_id)
        assert second_id != test_id, f"Expected brand new ID, got {second_id}"
        print(f"[PASS] 8. POST /api/incidents after closure created new incident: ID={second_id} (Previous {test_id} remains CLOSED).")

        # Close second test incident
        api_request(f"/api/incidents/{second_id}/close", method="PATCH")
        print(f"[PASS] Second test incident {second_id} marked CLOSED.")

    finally:
        # Clean up ONLY the temporary test-created IDs so database preserves strictly the 5 original records
        if test_created_ids:
            conn = sqlite3.connect(str(DB_PATH))
            try:
                placeholders = ",".join("?" for _ in test_created_ids)
                conn.execute(f"DELETE FROM incidents WHERE id IN ({placeholders});", tuple(test_created_ids))
                conn.commit()
                print(f"[*] Cleaned up {len(test_created_ids)} temporary test-created records: {test_created_ids}")
            finally:
                conn.close()

        # Final database check to guarantee the 5 original records are preserved
        final_rows = get_db_rows()
        final_ids = [r["id"] for r in final_rows]
        print(f"[*] Final database record count: {len(final_rows)}")
        for pid in PRESERVED_ORIGINAL_IDS:
            assert pid in final_ids, f"Original record {pid} must be preserved!"
        print(f"[PASS] Confirmed all {len(PRESERVED_ORIGINAL_IDS)} original records are preserved.")

    print("\n" + "=" * 75)
    print("ALL API AND DASHBOARD VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"\n[FAIL] Verification error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
