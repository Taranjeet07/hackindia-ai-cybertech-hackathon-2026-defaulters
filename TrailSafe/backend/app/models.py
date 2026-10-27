"""Pydantic models and request validation for TrailSafe incident API."""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator

IncidentType = Literal["SOS", "RISKY_ZONE", "ROUTE_DEVIATION", "INACTIVITY"]
SeverityLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
IncidentStatus = Literal["OPEN", "ASSIGNED", "CLOSED"]


class IncidentCreate(BaseModel):
    """Schema for creating a new incident."""

    tourist_id: str = Field(
        ...,
        min_length=1,
        description="Synthetic tourist identifier (e.g., TS-DEMO-001)",
    )
    incident_type: IncidentType = Field(
        ...,
        description="Incident classification: SOS, RISKY_ZONE, ROUTE_DEVIATION, or INACTIVITY",
    )
    severity: Optional[SeverityLevel] = Field(
        None,
        description="Optional severity rating; auto-calculated by risk engine if omitted",
    )
    risk_score: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description="Optional client score; validated and recalculated server-side by compute_risk()",
    )
    description: str = Field(
        ...,
        min_length=1,
        description="Human-readable explanation of the incident",
    )
    latitude: Optional[float] = Field(
        None,
        description="Optional recorded/demo latitude",
    )
    longitude: Optional[float] = Field(
        None,
        description="Optional recorded/demo longitude",
    )
    location_name: Optional[str] = Field(
        None,
        description="Optional human-readable location anchor name",
    )
    risk_factors: Optional[list[str]] = Field(
        None,
        description="Optional explainable contributing risk factors",
    )
    location_confidence: Optional[float] = Field(
        None,
        description="Optional GPS accuracy/confidence radius in meters",
    )
    device_battery: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description="Optional device battery percentage (0-100)",
    )
    is_offline_submission: Optional[int] = Field(
        0,
        description="Flag indicating if transmission was queued offline",
    )
    distance_from_corridor_m: Optional[float] = Field(
        None,
        description="Optional distance in meters from designated tourist corridor",
    )
    inactivity_minutes: Optional[float] = Field(
        None,
        description="Optional stationary dwell duration in minutes",
    )
    zone_risk_level: Optional[str] = Field(
        None,
        description="Optional hazard classification of breached zone (e.g., CANAL, EXTREME)",
    )
    night_time: Optional[bool] = Field(
        None,
        description="Optional flag indicating nighttime or low visibility",
    )
    battery_low: Optional[bool] = Field(
        None,
        description="Optional flag indicating low client battery (<15%)",
    )
    is_solo: Optional[bool] = Field(
        None,
        description="Optional flag indicating unaccompanied solo traveler",
    )
    in_hazard_zone: Optional[bool] = Field(
        None,
        description="Optional flag indicating proximity to high-risk perimeter",
    )

    @field_validator("tourist_id", "description")
    @classmethod
    def validate_non_empty_stripped(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be empty or only whitespace.")
        return stripped


class IncidentResponse(BaseModel):
    """Schema for returning incident details."""

    id: str = Field(..., description="Unique incident identifier")
    tourist_id: str = Field(..., description="Synthetic tourist identifier")
    incident_type: str = Field(..., description="Incident type")
    severity: str = Field(..., description="Severity level")
    risk_score: int = Field(..., description="Risk score (0-100)")
    description: str = Field(..., description="Incident description")
    status: str = Field(..., description="Workflow status (OPEN, ASSIGNED, CLOSED)")
    assigned_responder: Optional[str] = Field(
        None, description="Optional simulated responder name"
    )
    created_at: str = Field(..., description="ISO 8601 creation timestamp")
    updated_at: str = Field(..., description="ISO 8601 last update timestamp")
    latitude: Optional[float] = Field(
        None, description="Recorded/demo latitude if available"
    )
    longitude: Optional[float] = Field(
        None, description="Recorded/demo longitude if available"
    )
    location_name: Optional[str] = Field(
        None, description="Location anchor or landmark name"
    )
    risk_factors: Optional[list[str]] = Field(
        None, description="Explainable contributing risk factors"
    )
    closure_reason: Optional[str] = Field(
        None, description="Explanation provided when incident is closed"
    )
    closure_notes: Optional[str] = Field(
        None, description="Optional closing debrief notes"
    )
    notes: Optional[str] = Field(
        None, description="Operator working log notes"
    )
    location_confidence: Optional[float] = Field(
        None, description="GPS accuracy in meters"
    )
    device_battery: Optional[int] = Field(
        None, description="Battery level at report time"
    )
    is_offline_submission: Optional[int] = Field(
        0, description="Whether incident originated from offline queue"
    )


class ResponderAssignRequest(BaseModel):
    """Schema for assigning a simulated responder to an incident."""

    assigned_responder: str = Field(
        ...,
        min_length=1,
        description="Simulated responder callsign or unit name",
    )
    author: Optional[str] = Field(
        "Authority Operator",
        description="Author or operator responsible for the assignment",
    )

    @field_validator("assigned_responder")
    @classmethod
    def validate_non_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Responder name cannot be empty.")
        return stripped


class IncidentUpdateRequest(BaseModel):
    """Schema for updating incident status and/or responder."""

    status: Optional[IncidentStatus] = Field(None, description="Updated status")
    assigned_responder: Optional[str] = Field(
        None, description="Updated simulated responder"
    )
    author: Optional[str] = Field(
        "Authority Operator", description="Operator performing the update"
    )


class IncidentCloseRequest(BaseModel):
    """Schema for closing an incident with validated reason and notes."""

    closure_reason: Optional[str] = Field(
        "Resolved / Verified Safe",
        description="Predefined or custom closure reason",
    )
    closure_notes: Optional[str] = Field(
        None,
        description="Optional operator closure notes",
    )
    author: Optional[str] = Field(
        None,
        description="Operator closing the incident",
    )
    closed_by: Optional[str] = Field(
        None,
        description="Alias for author for backwards compatibility with frontend",
    )

    def get_author(self) -> str:
        """Resolve effective closure author, prioritizing author then closed_by."""
        return self.author or self.closed_by or "Authority Operator"


class IncidentNoteRequest(BaseModel):
    """Schema for adding an operator note to an incident."""

    note: str = Field(
        ...,
        min_length=1,
        description="Operator note content to append",
    )
    author: Optional[str] = Field(
        "Authority Operator",
        description="Operator or responder adding the note",
    )

    @field_validator("note")
    @classmethod
    def validate_non_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Note cannot be empty.")
        return stripped


class IncidentEventResponse(BaseModel):
    """Schema for returning chronological incident audit event."""

    id: str
    incident_id: str
    event_type: str
    actor: str
    notes: Optional[str] = None
    created_at: str


class ResponderResponse(BaseModel):
    """Schema for simulated responder details."""

    id: str
    name: str
    role: str
    status: str
    current_incident_id: Optional[str] = None
    latitude: float
    longitude: float
    contact_number: str
    is_simulated: int = 1
    updated_at: str


class ResponderUpdateRequest(BaseModel):
    """Schema for updating responder status, coordinates, or assignment."""

    status: Optional[Literal["AVAILABLE", "ASSIGNED", "OFF_DUTY"]] = None
    current_incident_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class GeofenceResponse(BaseModel):
    """Schema for geofence perimeter definitions."""

    id: str
    name: str
    zone_type: str
    latitude: float
    longitude: float
    radius_meters: float
    risk_weight: int
    description: str
    advisory_message: str
    is_active: int = 1


class GeofenceCheckRequest(BaseModel):
    """Schema for testing coordinates against geofence perimeters."""

    latitude: float
    longitude: float


class GeofenceCheckResponse(BaseModel):
    """Output schema for geofence containment testing."""

    inside_geofence: bool
    geofence_id: Optional[str] = None
    geofence_name: Optional[str] = None
    zone_type: str
    risk_weight: int
    distance_to_center_m: float
    advisory_message: str
    is_hazard: bool


class AnalyticsResponse(BaseModel):
    """Schema for control room aggregate metrics."""

    total_incidents: int
    status_counts: dict[str, int]
    severity_counts: dict[str, int]
    type_counts: dict[str, int]
    avg_risk_score: float
    responders: dict[str, int]
    active_geofences_count: int


class RiskEvaluationRequest(BaseModel):
    """Request schema for evaluating deterministic explainable risk."""

    tourist_id: str = Field("TS-DEMO-001", description="Tourist identifier")
    incident_type: IncidentType = Field(..., description="Event classification")
    distance_from_corridor_m: Optional[float] = Field(
        None, description="Distance in meters from designated tourist corridor"
    )
    inactivity_minutes: Optional[float] = Field(
        None, description="Duration in minutes of detected stationary dwell"
    )
    zone_risk_level: Optional[str] = Field(
        None, description="Hazard level of breached geofence zone"
    )
    night_time: Optional[bool] = Field(
        False, description="Whether excursion is during evening/night hours"
    )
    battery_low: Optional[bool] = Field(
        False, description="Whether device battery is below safety threshold"
    )
    is_solo: Optional[bool] = Field(
        False, description="Whether tourist is an unaccompanied solo traveler"
    )
    in_hazard_zone: Optional[bool] = Field(
        False, description="Whether location is adjacent to high-risk perimeter"
    )
    location_name: Optional[str] = Field(
        None, description="Simulated waypoint location name"
    )
    latitude: Optional[float] = Field(
        None, description="Synthetic demo latitude"
    )
    longitude: Optional[float] = Field(
        None, description="Synthetic demo longitude"
    )


class RiskEvaluationResponse(BaseModel):
    """Explainable risk evaluation output."""

    incident_type: str
    risk_score: int
    severity: str
    contributing_factors: list[str]
    recommended_action: str
    is_emergency: bool
    model_disclaimer: str
