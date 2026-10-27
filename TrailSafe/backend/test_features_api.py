"""Unit test suite verifying TrailSafe backend endpoints and database functions."""

import unittest
from app.main import (
    health_check,
    evaluate_risk_endpoint,
    list_incidents,
    get_incident,
    assign_incident_responder,
    close_incident_endpoint,
    add_note_endpoint,
    get_incident_events_endpoint,
    list_responders_endpoint,
    update_responder_endpoint,
    list_geofences_endpoint,
    check_geofence_endpoint,
    get_analytics_endpoint,
)
from app.models import (
    RiskEvaluationRequest,
    ResponderAssignRequest,
    IncidentCloseRequest,
    IncidentNoteRequest,
    ResponderUpdateRequest,
    GeofenceCheckRequest,
)
from app.database import init_db, get_all_incidents

class TestTrailSafeAPI(unittest.TestCase):
    def setUp(self):
        init_db()

    def test_health(self):
        res = health_check()
        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["project"], "TrailSafe")

    def test_preserved_incidents(self):
        incidents = list_incidents()
        self.assertGreaterEqual(len(incidents), 5)
        ids = {i.id for i in incidents}
        for expected_id in ["INC-8E0E9AFF9B", "INC-9D0B7643E0", "INC-18D797B50D", "INC-82B22CF66D", "INC-0D9F68497C"]:
            self.assertIn(expected_id, ids)

    def test_responders(self):
        responders = list_responders_endpoint()
        self.assertGreaterEqual(len(responders), 5)
        self.assertTrue(any("Unit 1" in r.name for r in responders))

    def test_geofences_and_check(self):
        geofences = list_geofences_endpoint()
        self.assertGreaterEqual(len(geofences), 4)

        # Check inside safe zone (Hazratganj)
        check_res = check_geofence_endpoint(GeofenceCheckRequest(latitude=26.8500, longitude=80.9490))
        self.assertTrue(check_res.inside_geofence)
        self.assertEqual(check_res.zone_type, "SAFE")

        # Check inside caution zone (Canal Buffer: 26.8530, 80.9620)
        caution_res = check_geofence_endpoint(GeofenceCheckRequest(latitude=26.8530, longitude=80.9620))
        self.assertTrue(caution_res.inside_geofence)
        self.assertEqual(caution_res.zone_type, "CAUTION")
        self.assertTrue(caution_res.is_hazard)

    def test_analytics(self):
        data = get_analytics_endpoint()
        self.assertGreaterEqual(data.total_incidents, 5)
        self.assertIn("OPEN", data.status_counts)
        self.assertIn("CRITICAL", data.severity_counts)
        self.assertIn("total", data.responders)

    def test_risk_evaluation(self):
        res = evaluate_risk_endpoint(
            RiskEvaluationRequest(
                tourist_id="TS-DEMO-001",
                incident_type="RISKY_ZONE",
                in_hazard_zone=True,
                night_time=True,
            )
        )
        self.assertGreaterEqual(res.risk_score, 70)
        self.assertTrue(len(res.contributing_factors) > 0)

    def test_incident_notes_and_events(self):
        incidents = list_incidents()
        inc_id = incidents[0].id

        # Add note
        note_res = add_note_endpoint(
            inc_id,
            IncidentNoteRequest(note="Direct test note", author="Automated Tester"),
        )
        self.assertEqual(note_res.id, inc_id)

        # Get events
        evts = get_incident_events_endpoint(inc_id)
        self.assertTrue(any(e.event_type == "NOTE_ADDED" for e in evts))

    def test_sos_lifecycle(self):
        from fastapi import Response
        from app.main import create_new_incident
        from app.models import IncidentCreate
        from app.database import delete_incident_by_id

        # 1. Create first SOS
        res1 = Response()
        inc1 = create_new_incident(
            IncidentCreate(
                tourist_id="TS-TEST-LIFECYCLE",
                incident_type="SOS",
                severity="CRITICAL",
                risk_score=100,
                description="Test lifecycle SOS",
            ),
            response=res1,
        )
        self.assertEqual(res1.status_code, 201)
        inc1_id = inc1.id

        # 2. Trigger SOS again while OPEN -> Duplicate prevention!
        res2 = Response()
        inc2 = create_new_incident(
            IncidentCreate(
                tourist_id="TS-TEST-LIFECYCLE",
                incident_type="SOS",
                severity="CRITICAL",
                risk_score=100,
                description="Test lifecycle SOS retry",
            ),
            response=res2,
        )
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(inc2.id, inc1_id)

        # 3. Close the incident
        closed_inc = close_incident_endpoint(
            inc1_id,
            IncidentCloseRequest(closure_reason="Test completed", author="Tester"),
        )
        self.assertEqual(closed_inc.status, "CLOSED")

        # 4. Trigger SOS again -> Genuine new incident
        res3 = Response()
        inc3 = create_new_incident(
            IncidentCreate(
                tourist_id="TS-TEST-LIFECYCLE",
                incident_type="SOS",
                severity="CRITICAL",
                risk_score=100,
                description="Test lifecycle SOS post-closure",
            ),
            response=res3,
        )
        self.assertEqual(res3.status_code, 201)
        self.assertNotEqual(inc3.id, inc1_id)

        # Clean up test tourist records
        delete_incident_by_id(inc1_id)
        delete_incident_by_id(inc3.id)

if __name__ == "__main__":
    unittest.main()
