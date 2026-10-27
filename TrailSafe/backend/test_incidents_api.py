"""Automated test suite for TrailSafe Incident API endpoints.

Tests:
1. POST /api/incidents (Create valid incident)
2. GET /api/incidents (List incidents, newest first)
3. GET /api/incidents/{id} (Retrieve by ID)
4. POST /api/incidents (Input validation: invalid types, out-of-range risk_score, empty fields)
5. GET /api/incidents/{nonexistent} (404 Not Found)
6. GET /api/health (Preserved health endpoint)
7. Test record database cleanup

Run with:
    python test_incidents_api.py
"""

from __future__ import annotations

import sys
import json
import urllib.request
import urllib.error
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"


def make_request(
    path: str, method: str = "GET", data: dict | None = None
) -> tuple[int, dict | list]:
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            content = resp.read().decode("utf-8")
            return status_code, json.loads(content)
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = {"raw": err_body}
        return exc.code, parsed


def main() -> int:
    print("=" * 65)
    print("TrailSafe Incident API Automated Verification")
    print("=" * 65)

    created_ids: list[str] = []

    try:
        # Test 1: Verify health endpoint
        print("\n[Test 1] GET /api/health")
        code, body = make_request("/api/health")
        if code != 200 or body.get("status") != "ok" or body.get("project") != "TrailSafe":
            print(f"[FAIL] Unexpected health response: code={code}, body={body}")
            return 1
        print(f"[OK] Health check passed: {body}")

        # Test 2: Create a valid synthetic incident
        print("\n[Test 2] POST /api/incidents (Create valid incident)")
        valid_payload = {
            "tourist_id": "TS-DEMO-001",
            "incident_type": "SOS",
            "severity": "CRITICAL",
            "risk_score": 92,
            "description": "Synthetic SOS distress signal triggered near Hazratganj corridor",
        }
        code, body = make_request("/api/incidents", method="POST", data=valid_payload)
        if code != 201:
            print(f"[FAIL] Expected 201 Created, got {code}: {body}")
            return 1

        inc_id = body.get("id")
        created_ids.append(inc_id)

        assert inc_id and inc_id.startswith("INC-"), f"Invalid ID format: {inc_id}"
        assert body.get("tourist_id") == "TS-DEMO-001", "Tourist ID mismatch"
        assert body.get("incident_type") == "SOS", "Incident type mismatch"
        assert body.get("severity") == "CRITICAL", "Severity mismatch"
        # Server-side calculation enforces 100/100 for SOS; client cannot lower score
        assert body.get("risk_score") == 100, f"Risk score mismatch: expected 100 for SOS, got {body.get('risk_score')}"
        assert body.get("status") == "OPEN", "Initial status must be OPEN"
        assert "created_at" in body, "Missing created_at"
        assert "updated_at" in body, "Missing updated_at"
        print(f"[OK] Incident successfully created with ID: {inc_id}")

        # Test 3: Create a second incident to test ordering
        print("\n[Test 3] POST /api/incidents (Create second incident for sorting)")
        payload_2 = {
            "tourist_id": "TS-DEMO-001",
            "incident_type": "RISKY_ZONE",
            "severity": "HIGH",
            "risk_score": 75,
            "description": "Synthetic risky-zone perimeter breach near canal trail",
        }
        code, body_2 = make_request("/api/incidents", method="POST", data=payload_2)
        if code != 201:
            print(f"[FAIL] Failed creating second incident: code={code}")
            return 1
        created_ids.append(body_2["id"])
        print(f"[OK] Second incident created with ID: {body_2['id']}")

        # Test 4: List all incidents (must return newest first)
        print("\n[Test 4] GET /api/incidents (List incidents)")
        code, body_list = make_request("/api/incidents")
        if code != 200 or not isinstance(body_list, list):
            print(f"[FAIL] Expected 200 list response, got {code}: {body_list}")
            return 1

        retrieved_ids = [item["id"] for item in body_list]
        if inc_id not in retrieved_ids or body_2["id"] not in retrieved_ids:
            print(f"[FAIL] Created incidents missing from list: {retrieved_ids}")
            return 1

        # Check newest first: body_2 was created after inc_id
        idx_1 = retrieved_ids.index(inc_id)
        idx_2 = retrieved_ids.index(body_2["id"])
        if idx_2 > idx_1:
            print(f"[FAIL] Expected newest first sorting: idx_2={idx_2}, idx_1={idx_1}")
            return 1
        print(f"[OK] List verified with {len(body_list)} items, newest first confirmed.")

        # Test 5: Retrieve single incident by ID
        print(f"\n[Test 5] GET /api/incidents/{inc_id}")
        code, body_single = make_request(f"/api/incidents/{inc_id}")
        if code != 200 or body_single.get("id") != inc_id:
            print(f"[FAIL] Failed retrieving incident by ID: {body_single}")
            return 1
        print(f"[OK] Retrieved incident by ID: {body_single['id']} (status: {body_single['status']})")

        # Test 6: 404 for nonexistent incident
        print("\n[Test 6] GET /api/incidents/NONEXISTENT-999 (Expect 404)")
        code, body_404 = make_request("/api/incidents/NONEXISTENT-999")
        if code != 404:
            print(f"[FAIL] Expected 404, got {code}: {body_404}")
            return 1
        print(f"[OK] 404 Not Found correctly returned: {body_404}")

        # Test 7: Validation - Empty tourist_id
        print("\n[Test 7] POST /api/incidents (Empty tourist_id -> 422)")
        bad_payload_1 = {**valid_payload, "tourist_id": "   "}
        code, err = make_request("/api/incidents", method="POST", data=bad_payload_1)
        if code != 422:
            print(f"[FAIL] Expected 422 for empty tourist_id, got {code}")
            return 1
        print("[OK] 422 correctly returned for empty tourist_id")

        # Test 8: Validation - Invalid incident_type
        print("\n[Test 8] POST /api/incidents (Invalid incident_type -> 422)")
        bad_payload_2 = {**valid_payload, "incident_type": "AVALANCHE"}
        code, err = make_request("/api/incidents", method="POST", data=bad_payload_2)
        if code != 422:
            print(f"[FAIL] Expected 422 for invalid incident_type, got {code}")
            return 1
        print("[OK] 422 correctly returned for invalid incident_type")

        # Test 9: Validation - Out-of-bounds risk_score (> 100)
        print("\n[Test 9] POST /api/incidents (risk_score = 150 -> 422)")
        bad_payload_3 = {**valid_payload, "risk_score": 150}
        code, err = make_request("/api/incidents", method="POST", data=bad_payload_3)
        if code != 422:
            print(f"[FAIL] Expected 422 for risk_score > 100, got {code}")
            return 1
        print("[OK] 422 correctly returned for risk_score > 100")

        # Test 10: Validation - Negative risk_score (< 0)
        print("\n[Test 10] POST /api/incidents (risk_score = -5 -> 422)")
        bad_payload_4 = {**valid_payload, "risk_score": -5}
        code, err = make_request("/api/incidents", method="POST", data=bad_payload_4)
        if code != 422:
            print(f"[FAIL] Expected 422 for risk_score < 0, got {code}")
            return 1
        print("[OK] 422 correctly returned for negative risk_score")

    finally:
        # Cleanup created test incidents from database
        print("\n[Cleanup] Removing synthetic test incident records from SQLite...")
        from app.database import delete_incident_by_id
        for tid in created_ids:
            deleted = delete_incident_by_id(tid)
            print(f"    - Cleaned up '{tid}': {deleted}")

    print("\n" + "=" * 65)
    print("Verification Result: ALL 10 TESTS PASSED (100% SUCCESS)")
    print("=" * 65)
    return 0


if __name__ == "__main__":
    sys.exit(main())
