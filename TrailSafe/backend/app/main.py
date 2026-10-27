"""Main FastAPI application for TrailSafe API."""

from typing import Optional
import os
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware

from app.database import (
    add_incident_note,
    assign_responder,
    check_geofence,
    close_incident,
    create_incident,
    get_active_incident,
    get_all_incidents,
    get_analytics_summary,
    get_db_connection,
    get_geofences,
    get_incident_by_id,
    get_incident_events,
    get_open_sos_incident,
    get_responders,
    init_db,
    reset_demo_incidents,
    seed_baseline_demo_incidents,
    update_incident,
    update_responder,
)
from app.models import (
    AnalyticsResponse,
    GeofenceCheckRequest,
    GeofenceCheckResponse,
    GeofenceResponse,
    IncidentCloseRequest,
    IncidentCreate,
    IncidentEventResponse,
    IncidentNoteRequest,
    IncidentResponse,
    IncidentUpdateRequest,
    ResponderAssignRequest,
    ResponderResponse,
    ResponderUpdateRequest,
    RiskEvaluationRequest,
    RiskEvaluationResponse,
)
from app.risk_engine import compute_risk, get_explainable_factors


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to safely initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title="TrailSafe API",
    description="AI-Powered Smart Tourist Safety Monitoring & Incident Response System",
    version="0.2.0",
    lifespan=lifespan,
)

# Configure CORS for local development and private LAN demo environments
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

# Allow additional production or staging origins via CORS_ORIGINS environment variable (comma-separated)
# Disallow wildcard '*', normalize trailing slashes, and avoid duplicate entries
raw_cors_origins = os.getenv("CORS_ORIGINS", "")
if raw_cors_origins:
    for raw_origin in raw_cors_origins.split(","):
        cleaned_origin = raw_origin.strip().rstrip("/")
        if cleaned_origin and cleaned_origin != "*" and cleaned_origin not in origins:
            origins.append(cleaned_origin)

# Regex securely permits localhost, loopback, and private IPv4 ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port
ALLOWED_ORIGIN_REGEX = (
    r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict:
    """Health check endpoint to verify backend service status."""
    return {
        "status": "ok",
        "project": "TrailSafe",
    }


@app.post(
    "/api/risk/evaluate",
    response_model=RiskEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate deterministic explainable risk score",
)
def evaluate_risk_endpoint(payload: RiskEvaluationRequest) -> RiskEvaluationResponse:
    """Evaluate event parameters to produce an explainable rule-based risk score and breakdown."""
    assessment = compute_risk(
        incident_type=payload.incident_type,
        context=payload.model_dump(),
    )
    return RiskEvaluationResponse(
        incident_type=assessment.incident_type,
        risk_score=assessment.risk_score,
        severity=assessment.severity,
        contributing_factors=assessment.contributing_factors,
        recommended_action=assessment.recommended_action,
        is_emergency=assessment.is_emergency,
        model_disclaimer=assessment.model_disclaimer,
    )


@app.post(
    "/api/incidents",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new incident or return active incident",
)
def create_new_incident(
    incident_in: IncidentCreate, response: Response
) -> IncidentResponse:
    """Create a new incident in the system with server-side risk calculation.

    If the tourist already has an active (OPEN or ASSIGNED) incident of this type,
    returns the existing incident with HTTP 200 OK without inserting a duplicate.
    Otherwise, calculates the risk score and severity via compute_risk(), creates
    a new incident in SQLite, and returns HTTP 201 Created.
    """
    try:
        # Duplicate prevention check for active incidents of same type
        existing_incident = get_active_incident(incident_in.tourist_id, incident_in.incident_type)
        if existing_incident:
            response.status_code = status.HTTP_200_OK
            return IncidentResponse(**existing_incident)

        # Build genuine context dictionary from validated fields
        context: dict[str, Any] = {}
        if incident_in.distance_from_corridor_m is not None:
            context["distance_from_corridor_m"] = incident_in.distance_from_corridor_m
        if incident_in.inactivity_minutes is not None:
            context["inactivity_minutes"] = incident_in.inactivity_minutes
        if incident_in.zone_risk_level is not None:
            context["zone_risk_level"] = incident_in.zone_risk_level
        if incident_in.night_time is not None:
            context["night_time"] = incident_in.night_time
        if incident_in.is_solo is not None:
            context["is_solo"] = incident_in.is_solo
        if incident_in.in_hazard_zone is not None:
            context["in_hazard_zone"] = incident_in.in_hazard_zone
        if incident_in.battery_low is not None:
            context["battery_low"] = incident_in.battery_low
        elif incident_in.device_battery is not None:
            context["battery_low"] = incident_in.device_battery < 15

        # Compute server-side risk score and severity
        assessment = compute_risk(incident_in.incident_type, context)
        calculated_score = assessment.risk_score
        calculated_severity = assessment.severity

        # Use client risk_factors if provided, else use factors generated by the engine
        risk_factors = incident_in.risk_factors
        if not risk_factors:
            risk_factors = assessment.contributing_factors

        saved_incident = create_incident(
            tourist_id=incident_in.tourist_id,
            incident_type=incident_in.incident_type,
            severity=calculated_severity,
            risk_score=calculated_score,
            description=incident_in.description,
            latitude=incident_in.latitude,
            longitude=incident_in.longitude,
            location_name=incident_in.location_name,
            risk_factors=risk_factors,
            location_confidence=incident_in.location_confidence,
            device_battery=incident_in.device_battery,
            is_offline_submission=1 if incident_in.is_offline_submission else 0,
        )
        response.status_code = status.HTTP_201_CREATED
        return IncidentResponse(**saved_incident)
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record incident in database.",
        )


@app.get(
    "/api/incidents",
    response_model=list[IncidentResponse],
    status_code=status.HTTP_200_OK,
    summary="List all incidents with optional filtering & sorting",
)
def list_incidents(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (OPEN, ASSIGNED, CLOSED)"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)"),
    incident_type: Optional[str] = Query(None, description="Filter by type (SOS, RISKY_ZONE, ROUTE_DEVIATION, INACTIVITY)"),
    sort_by: str = Query("created_at", description="Sort field (created_at, risk_score, severity, status)"),
    sort_order: str = Query("desc", description="Sort direction (asc, desc)"),
) -> list[IncidentResponse]:
    """Retrieve all saved incidents, ordered newest first or according to query params."""
    try:
        incidents = get_all_incidents(
            status_filter=status_filter,
            severity_filter=severity,
            type_filter=incident_type,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return [IncidentResponse(**item) for item in incidents]
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incidents from database.",
        )


@app.get(
    "/api/incidents/{incident_id}",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get incident by ID",
)
def get_incident(incident_id: str) -> IncidentResponse:
    """Retrieve a single incident by its unique ID.

    Returns HTTP 404 if the incident does not exist.
    """
    try:
        incident = get_incident_by_id(incident_id)
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query incident from database.",
        )

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )

    return IncidentResponse(**incident)


@app.patch(
    "/api/incidents/{incident_id}/close",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Close an incident",
)
@app.post(
    "/api/incidents/{incident_id}/close",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Close an incident (POST fallback)",
)
def close_incident_endpoint(
    incident_id: str, payload: Optional[IncidentCloseRequest] = None
) -> IncidentResponse:
    """Safely close an incident with validated reason, release responder, and refresh updated_at."""
    reason = payload.closure_reason if payload and payload.closure_reason else "Resolved / Verified Safe"
    notes = payload.closure_notes if payload else None
    author = payload.get_author() if payload else "Authority Operator"

    try:
        updated = close_incident(
            incident_id=incident_id,
            closure_reason=reason,
            closure_notes=notes,
            author=author,
        )
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update incident in database.",
        )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )

    return IncidentResponse(**updated)


@app.patch(
    "/api/incidents/{incident_id}/assign",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign simulated responder to incident",
)
@app.post(
    "/api/incidents/{incident_id}/assign",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign simulated responder to incident (POST fallback)",
)
def assign_incident_responder(
    incident_id: str, payload: ResponderAssignRequest
) -> IncidentResponse:
    """Assign a simulated responder to an incident and update responder unit availability."""
    try:
        existing = get_incident_by_id(incident_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found",
            )
        author = payload.author or "Authority Operator"
        updated = assign_responder(
            incident_id=incident_id,
            responder_name=payload.assigned_responder,
            author=author,
        )
        return IncidentResponse(**updated)
    except HTTPException:
        raise
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign responder in database.",
        )


@app.post(
    "/api/incidents/{incident_id}/notes",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Append operator note to incident",
)
def add_note_endpoint(
    incident_id: str, payload: IncidentNoteRequest
) -> IncidentResponse:
    """Append an operator note to an incident and record an audit log event."""
    try:
        existing = get_incident_by_id(incident_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found",
            )
        updated = add_incident_note(
            incident_id=incident_id,
            note_text=payload.note,
            author=payload.author or "Authority Operator",
        )
        return IncidentResponse(**updated)
    except HTTPException:
        raise
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to append note to incident in database.",
        )


@app.get(
    "/api/incidents/{incident_id}/events",
    response_model=list[IncidentEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Get incident audit events timeline",
)
def get_incident_events_endpoint(incident_id: str) -> list[IncidentEventResponse]:
    """Retrieve chronological audit lifecycle events for an incident."""
    try:
        existing = get_incident_by_id(incident_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found",
            )
        events = get_incident_events(incident_id)
        return [IncidentEventResponse(**evt) for evt in events]
    except HTTPException:
        raise
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incident audit events from database.",
        )


@app.patch(
    "/api/incidents/{incident_id}",
    response_model=IncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update incident status and/or responder",
)
def update_incident_endpoint(
    incident_id: str, payload: IncidentUpdateRequest
) -> IncidentResponse:
    """Update incident status and/or assigned simulated responder."""
    try:
        existing = get_incident_by_id(incident_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found",
            )
        updated = update_incident(
            incident_id=incident_id,
            status=payload.status,
            assigned_responder=payload.assigned_responder,
            author=payload.author or "Authority Operator",
        )
        return IncidentResponse(**updated)
    except HTTPException:
        raise
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update incident in database.",
        )


@app.get(
    "/api/responders",
    response_model=list[ResponderResponse],
    status_code=status.HTTP_200_OK,
    summary="List all simulated responders",
)
def list_responders_endpoint() -> list[ResponderResponse]:
    """Retrieve all simulated emergency responders and their real-time telemetry."""
    try:
        responders = get_responders()
        return [ResponderResponse(**r) for r in responders]
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve responders from database.",
        )


@app.patch(
    "/api/responders/{responder_id}",
    response_model=ResponderResponse,
    status_code=status.HTTP_200_OK,
    summary="Update simulated responder status or coordinates",
)
def update_responder_endpoint(
    responder_id: str, payload: ResponderUpdateRequest
) -> ResponderResponse:
    """Update simulated responder availability, coordinates, or incident assignment."""
    try:
        updated = update_responder(
            responder_id=responder_id,
            status=payload.status,
            current_incident_id=payload.current_incident_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Responder not found",
            )
        return ResponderResponse(**updated)
    except HTTPException:
        raise
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update responder in database.",
        )


@app.get(
    "/api/geofences",
    response_model=list[GeofenceResponse],
    status_code=status.HTTP_200_OK,
    summary="List active geofences",
)
def list_geofences_endpoint() -> list[GeofenceResponse]:
    """Retrieve all designated safe, caution, and restricted tourist safety geofences."""
    try:
        geofences = get_geofences()
        return [GeofenceResponse(**g) for g in geofences]
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve geofences from database.",
        )


@app.post(
    "/api/geofences/check",
    response_model=GeofenceCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Check coordinate against geofence boundaries",
)
def check_geofence_endpoint(payload: GeofenceCheckRequest) -> GeofenceCheckResponse:
    """Test traveler coordinates for geofence containment, hazard warnings, and safety advisories."""
    try:
        result = check_geofence(payload.latitude, payload.longitude)
        return GeofenceCheckResponse(**result)
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to evaluate geofence in database.",
        )


@app.get(
    "/api/analytics",
    response_model=AnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated control room analytics",
)
def get_analytics_endpoint() -> AnalyticsResponse:
    """Calculate and return live aggregate metrics from the database."""
    try:
        summary = get_analytics_summary()
        return AnalyticsResponse(**summary)
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute analytics from database.",
        )


@app.post(
    "/api/incidents/reset-demo",
    status_code=status.HTTP_200_OK,
    summary="Reset demo incidents",
)
def reset_demo_endpoint(tourist_id: str = "TS-DEMO-001") -> dict[str, object]:
    """Safely reset all incidents created for the demo tourist."""
    try:
        deleted_count = reset_demo_incidents(tourist_id=tourist_id)
        return {
            "status": "ok",
            "tourist_id": tourist_id,
            "deleted_count": deleted_count,
            "message": f"Successfully cleared {deleted_count} demo incident(s) for {tourist_id}.",
        }
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset demo incidents in database.",
        )


@app.post(
    "/api/incidents/seed-demo",
    status_code=status.HTTP_200_OK,
    summary="Seed baseline demo incidents",
)
def seed_demo_endpoint(force: bool = False) -> dict[str, object]:
    """Seed baseline synthetic demo incidents if the table is empty or if forced."""
    try:
        conn = get_db_connection()
        try:
            seeded_count = seed_baseline_demo_incidents(conn, force=force)
            return {
                "status": "ok",
                "seeded_count": seeded_count,
                "message": f"Successfully seeded {seeded_count} baseline demo incident(s).",
            }
        finally:
            conn.close()
    except sqlite3.Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to seed baseline demo incidents in database.",
        )


if __name__ == "__main__":
    import uvicorn

    server_port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=server_port, reload=False)

