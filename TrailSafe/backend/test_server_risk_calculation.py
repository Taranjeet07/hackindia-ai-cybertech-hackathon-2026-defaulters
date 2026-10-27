"""
Comprehensive Test Suite for TrailSafe Server-Side Risk Calculation.
Verifies all requirements:
1. SOS is always assigned 100/100 and CRITICAL by backend.
2. Client-supplied scores cannot override backend calculation (client sends 40 for SOS -> 100).
3. Risky-Zone, Route Deviation, and Inactivity receive correct scores for supplied contexts.
4. Missing context does not fabricate hazards.
5. API responses and persisted SQLite records agree.
6. Duplicate SOS prevention still works.
7. Assignment and closure workflows still work.
"""

from __future__ import annotations

import json
import sqlite3
import sys
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"


def make_request(path: str, method: str = "GET", data: dict | None = None) -> tuple[int, dict | list]:
    url = f"{BASE_URL}{path}"
    body_bytes = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        try:
            return err.code, json.loads(err.read().decode("utf-8"))
        except Exception:
            return err.code, {"error": err.reason}


def run_tests() -> int:
    print("=" * 65)
    print("TRAILSAFE SERVER-SIDE RISK CALCULATION TEST SUITE")
    print("=" * 65)

    created_ids: list[str] = []

    try:
        # Check health
        code, health = make_request("/api/health")
        assert code == 200 and health.get("status") == "ok", f"Health check failed: {health}"
        print("[PASS] 1. Backend health check: OK")

        # Clean demo state for test tourist
        make_request("/api/incidents/reset-demo?tourist_id=TS-RISK-TESTER", method="POST")

        # Test 1 & 2: SOS is always 100/100 CRITICAL; client-supplied score cannot override
        print("\n[Test 1 & 2] SOS scoring & client score override prevention")
        client_low_payload = {
            "tourist_id": "TS-RISK-TESTER",
            "incident_type": "SOS",
            "severity": "LOW",       # Client attempts to suggest LOW
            "risk_score": 40,        # Client attempts to suggest 40
            "description": "Distress beacon with client attempting lower score",
            "device_battery": 80,
        }
        code, sos_res = make_request("/api/incidents", method="POST", data=client_low_payload)
        assert code == 201, f"Expected 201, got {code}: {sos_res}"
        sos_id = sos_res["id"]
        created_ids.append(sos_id)
        assert sos_res["risk_score"] == 100, f"Expected 100 for SOS, got {sos_res['risk_score']}"
        assert sos_res["severity"] == "CRITICAL", f"Expected CRITICAL for SOS, got {sos_res['severity']}"
        print(f"  -> PASS: SOS assigned 100/100 and CRITICAL despite client sending 40/LOW! (ID: {sos_id})")

        # Test 6: Duplicate SOS prevention
        print("\n[Test 6] Duplicate SOS prevention")
        code, dup_res = make_request("/api/incidents", method="POST", data=client_low_payload)
        assert code == 200, f"Expected 200 for duplicate SOS, got {code}"
        assert dup_res["id"] == sos_id, f"Expected same incident ID {sos_id}, got {dup_res['id']}"
        print(f"  -> PASS: Duplicate SOS returned existing incident {sos_id} without duplicate insert.")

        # Test 7: Assignment and Closure workflow
        print("\n[Test 7] Assignment and closure lifecycle")
        code, assign_res = make_request(
            f"/api/incidents/{sos_id}/assign",
            method="PATCH",
            data={"assigned_responder": "Unit 1 - Hazratganj Rapid Patrol (Simulated)"}
        )
        assert code == 200, f"Expected 200 on assign, got {code}: {assign_res}"
        assert assign_res["status"] == "ASSIGNED", f"Expected ASSIGNED, got {assign_res['status']}"

        code, close_res = make_request(
            f"/api/incidents/{sos_id}/close",
            method="PATCH",
            data={"closure_reason": "Safe resolution", "closed_by": "Risk Engine Verifier"}
        )
        assert code == 200, f"Expected 200 on close, got {code}: {close_res}"
        assert close_res["status"] == "CLOSED", f"Expected CLOSED, got {close_res['status']}"
        print(f"  -> PASS: Incident {sos_id} successfully assigned and closed.")

        # Test 3: Risky-Zone with Canal + Solo traveler context
        print("\n[Test 3A] Risky-Zone with Canal hazard + Solo traveler")
        rz_payload = {
            "tourist_id": "TS-RISK-TESTER",
            "incident_type": "RISKY_ZONE",
            "description": "Simulated canal perimeter breach",
            "zone_risk_level": "EXTREME_CANAL",  # +10
            "is_solo": True,                     # +5
            "night_time": False,
        }
        code, rz_res = make_request("/api/incidents", method="POST", data=rz_payload)
        assert code == 201, f"Expected 201, got {code}: {rz_res}"
        created_ids.append(rz_res["id"])
        # Base 75 + 10 (Canal) + 5 (Solo) = 90 -> CRITICAL
        assert rz_res["risk_score"] == 90, f"Expected 90, got {rz_res['risk_score']}"
        assert rz_res["severity"] == "CRITICAL", f"Expected CRITICAL, got {rz_res['severity']}"
        print(f"  -> PASS: Risky-Zone evaluated to {rz_res['risk_score']}/100 ({rz_res['severity']})")

        # Test 3B: Route Deviation with 350m drift + nighttime
        print("\n[Test 3B] Route Deviation with 350m drift + nighttime")
        dev_payload = {
            "tourist_id": "TS-RISK-TESTER",
            "incident_type": "ROUTE_DEVIATION",
            "description": "Severe spatial drift at night",
            "distance_from_corridor_m": 350,  # +30 (>= 300)
            "night_time": True,               # +10
            "battery_low": False,
        }
        code, dev_res = make_request("/api/incidents", method="POST", data=dev_payload)
        assert code == 201, f"Expected 201, got {code}: {dev_res}"
        created_ids.append(dev_res["id"])
        # Base 40 + 30 + 10 = 80 -> HIGH
        assert dev_res["risk_score"] == 80, f"Expected 80, got {dev_res['risk_score']}"
        assert dev_res["severity"] == "HIGH", f"Expected HIGH, got {dev_res['severity']}"
        print(f"  -> PASS: Route Deviation evaluated to {dev_res['risk_score']}/100 ({dev_res['severity']})")

        # Test 3C: Inactivity with 60 minutes dwell
        print("\n[Test 3C] Inactivity with prolonged 60 min stationary dwell")
        inact_payload = {
            "tourist_id": "TS-RISK-TESTER",
            "incident_type": "INACTIVITY",
            "description": "Prolonged dwell at resting stop",
            "inactivity_minutes": 60,   # +35 (>= 60)
            "in_hazard_zone": False,
        }
        code, inact_res = make_request("/api/incidents", method="POST", data=inact_payload)
        assert code == 201, f"Expected 201, got {code}: {inact_res}"
        created_ids.append(inact_res["id"])
        # Base 30 + 35 = 65 -> MEDIUM
        assert inact_res["risk_score"] == 65, f"Expected 65, got {inact_res['risk_score']}"
        assert inact_res["severity"] == "MEDIUM", f"Expected MEDIUM, got {inact_res['severity']}"
        print(f"  -> PASS: Inactivity evaluated to {inact_res['risk_score']}/100 ({inact_res['severity']})")

        # Test 4: Missing context does not fabricate hazards
        print("\n[Test 4] Missing context does not fabricate hazards")
        plain_rz = {
            "tourist_id": "TS-RISK-TESTER-2",
            "incident_type": "RISKY_ZONE",
            "description": "Standard zone breach without extra context",
        }
        code, plain_rz_res = make_request("/api/incidents", method="POST", data=plain_rz)
        assert code == 201, f"Expected 201, got {code}: {plain_rz_res}"
        created_ids.append(plain_rz_res["id"])
        # Base score 75, HIGH severity, no canal or night modifiers added
        assert plain_rz_res["risk_score"] == 75, f"Expected 75, got {plain_rz_res['risk_score']}"
        assert plain_rz_res["severity"] == "HIGH", f"Expected HIGH, got {plain_rz_res['severity']}"
        print(f"  -> PASS: Standard Risky-Zone with no context received safe baseline 75/HIGH without fabricated hazards.")

        # Test 5: API responses and persisted SQLite records strictly agree
        print("\n[Test 5] Verify API responses match persisted SQLite records")
        conn = sqlite3.connect("backend/data/trailsafe.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        for i_id in created_ids:
            cursor.execute("SELECT id, risk_score, severity, incident_type FROM incidents WHERE id = ?;", (i_id,))
            row = cursor.fetchone()
            assert row is not None, f"Record {i_id} not found in SQLite"
            # Compare with GET API
            code, api_item = make_request(f"/api/incidents/{i_id}")
            assert code == 200, f"Failed retrieving {i_id}"
            assert api_item["risk_score"] == row["risk_score"], f"Score mismatch: {api_item['risk_score']} vs {row['risk_score']}"
            assert api_item["severity"] == row["severity"], f"Severity mismatch: {api_item['severity']} vs {row['severity']}"
        conn.close()
        print(f"  -> PASS: All {len(created_ids)} created incidents match persisted SQLite records exactly.")

        print("\n" + "=" * 65)
        print("ALL 7 SERVER-SIDE RISK CALCULATION TESTS PASSED!")
        print("=" * 65)
        return 0

    finally:
        # Clean up test records
        make_request("/api/incidents/reset-demo?tourist_id=TS-RISK-TESTER", method="POST")
        make_request("/api/incidents/reset-demo?tourist_id=TS-RISK-TESTER-2", method="POST")


if __name__ == "__main__":
    sys.exit(run_tests())
