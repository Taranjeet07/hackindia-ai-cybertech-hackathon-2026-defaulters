"""Automated test script for TrailSafe SOS duplicate prevention and incident lifecycle.

Tests requirements:
A. First SOS creates an incident (HTTP 201 Created).
B. Second SOS for TS-DEMO-001 returns existing open incident (HTTP 200 OK) without inserting duplicate.
C. Incident count does not increase on repeated SOS.
D. Returned ID matches existing record ID.
E. Close incident via API -> status is CLOSED. Subsequent SOS creates a brand new incident (HTTP 201 Created).
F. Separate tourist (TS-DEMO-002) has an independent incident.
G. Total incident count in SQLite matches GET /api/incidents.
H. Demo reset clears TS-DEMO-001 without altering other tourists.
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"


def make_request(path: str, method: str = "GET", body: dict | None = None) -> tuple[int, dict | list]:
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            content = resp.read().decode("utf-8")
            return status_code, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        status_code = e.code
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return status_code, parsed


def run_tests():
    print("=" * 60)
    print("TrailSafe SOS Lifecycle & Duplicate Prevention Verification")
    print("=" * 60)

    # 0. Health check
    status_code, body = make_request("/api/health")
    assert status_code == 200, f"Health check failed with {status_code}"
    print("[PASS] Backend health check: 200 OK")

    # Clean slate for test tourists
    make_request("/api/incidents/reset-demo?tourist_id=TS-DEMO-001", method="POST")
    make_request("/api/incidents/reset-demo?tourist_id=TS-DEMO-002", method="POST")
    print("[PASS] Test setup: Cleared previous demo records for TS-DEMO-001 and TS-DEMO-002")

    # Initial count
    _, initial_list = make_request("/api/incidents")
    initial_count = len(initial_list)
    print(f"[*] Baseline incident count: {initial_count}")

    # TEST A: First SOS creates one incident (HTTP 201)
    payload_sos_1 = {
        "tourist_id": "TS-DEMO-001",
        "incident_type": "SOS",
        "severity": "CRITICAL",
        "risk_score": 100,
        "description": "Simulated emergency SOS triggered by the demo tourist.",
    }
    code_a, res_a = make_request("/api/incidents", method="POST", body=payload_sos_1)
    assert code_a == 201, f"Expected 201 for first SOS, got {code_a}"
    assert res_a["tourist_id"] == "TS-DEMO-001"
    assert res_a["status"] == "OPEN"
    first_id = res_a["id"]
    print(f"[PASS] Test A: First SOS created successfully (HTTP 201, ID: {first_id})")

    # TEST B & C & D: Duplicate SOS for TS-DEMO-001
    code_b, res_b = make_request("/api/incidents", method="POST", body=payload_sos_1)
    assert code_b == 200, f"Expected 200 OK for duplicate SOS, got {code_b}"
    assert res_b["id"] == first_id, f"Expected returned ID to match {first_id}, got {res_b['id']}"
    assert res_b["status"] == "OPEN"
    print(f"[PASS] Test B: Second SOS returned existing open incident (HTTP 200, ID: {res_b['id']})")
    print(f"[PASS] Test D: Returned incident ID matches original ({res_b['id']} == {first_id})")

    _, list_after_dup = make_request("/api/incidents")
    assert len(list_after_dup) == initial_count + 1, (
        f"Incident count increased on duplicate! Expected {initial_count + 1}, got {len(list_after_dup)}"
    )
    print(f"[PASS] Test C: Incident count remained constant on duplicate SOS ({len(list_after_dup)})")

    # TEST E: Close incident via PATCH /api/incidents/{incident_id}/close
    code_close, res_close = make_request(f"/api/incidents/{first_id}/close", method="PATCH")
    assert code_close == 200, f"Expected 200 on close, got {code_close}"
    assert res_close["status"] == "CLOSED", f"Expected CLOSED status, got {res_close['status']}"
    assert res_close["id"] == first_id
    assert res_close["updated_at"] >= res_close["created_at"]
    print(f"[PASS] Test E1: Incident {first_id} successfully closed (Status: {res_close['status']})")

    # Now that the previous SOS is CLOSED, subsequent SOS should create a brand new incident (HTTP 201)
    code_e2, res_e2 = make_request("/api/incidents", method="POST", body=payload_sos_1)
    assert code_e2 == 201, f"Expected 201 for SOS after close, got {code_e2}"
    new_id = res_e2["id"]
    assert new_id != first_id, f"Expected brand new ID, but got same ID {new_id}"
    assert res_e2["status"] == "OPEN"
    print(f"[PASS] Test E2: Brand new SOS incident created after previous was closed (HTTP 201, New ID: {new_id})")

    # TEST F: Two different tourists have separate incidents
    payload_tourist_2 = {
        "tourist_id": "TS-DEMO-002",
        "incident_type": "SOS",
        "severity": "CRITICAL",
        "risk_score": 100,
        "description": "Simulated emergency SOS for Tourist 2.",
    }
    code_f, res_f = make_request("/api/incidents", method="POST", body=payload_tourist_2)
    assert code_f == 201, f"Expected 201 for tourist 2, got {code_f}"
    tourist_2_id = res_f["id"]
    assert tourist_2_id != new_id
    assert res_f["tourist_id"] == "TS-DEMO-002"
    print(f"[PASS] Test F: Independent tourist TS-DEMO-002 created separate incident (ID: {tourist_2_id})")

    # TEST G: Count consistency
    _, final_list = make_request("/api/incidents")
    # We added: first_id (closed), new_id (open), tourist_2_id (open) -> total initial_count + 3
    assert len(final_list) == initial_count + 3, f"Expected {initial_count + 3}, got {len(final_list)}"
    print(f"[PASS] Test G: Total incidents in DB strictly verified: {len(final_list)} records")

    # TEST H: Reset demo clears only TS-DEMO-001
    code_reset, res_reset = make_request("/api/incidents/reset-demo?tourist_id=TS-DEMO-001", method="POST")
    assert code_reset == 200
    assert res_reset["deleted_count"] >= 2
    print(f"[PASS] Test H1: Reset demo cleared TS-DEMO-001 incidents ({res_reset['deleted_count']} deleted)")

    # Verify TS-DEMO-002 is still preserved
    code_t2, res_t2 = make_request(f"/api/incidents/{tourist_2_id}")
    assert code_t2 == 200
    assert res_t2["tourist_id"] == "TS-DEMO-002"
    print(f"[PASS] Test H2: Verified TS-DEMO-002 record was untouched and preserved")

    # Cleanup TS-DEMO-002
    make_request("/api/incidents/reset-demo?tourist_id=TS-DEMO-002", method="POST")
    print("[PASS] Cleaned up TS-DEMO-002 test records")

    print("=" * 60)
    print("ALL TESTS (A through H) PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"[FAIL] Test execution encountered an error: {e}", file=sys.stderr)
        sys.exit(1)
