"""Explainable Rule-Based Risk Engine for TrailSafe.

Provides deterministic, auditable, and transparent risk scoring for tourist safety events.
NOTE: This is a deterministic rule-based demonstration engine for the hackathon evaluation.
It is NOT presented as a scientifically validated statistical or predictive model.
"""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

SeverityLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
IncidentType = Literal["SOS", "RISKY_ZONE", "ROUTE_DEVIATION", "INACTIVITY"]


class RiskAssessment(BaseModel):
    """Detailed explainable assessment output for an evaluated safety event."""

    incident_type: IncidentType
    risk_score: int = Field(..., ge=0, le=100)
    severity: SeverityLevel
    contributing_factors: list[str]
    recommended_action: str
    is_emergency: bool
    model_disclaimer: str = (
        "Deterministic rule-based scoring engine for demonstration and hackathon evaluation. "
        "Not a scientifically validated prediction model. All coordinates and responses are simulated."
    )


def compute_risk(
    incident_type: IncidentType,
    context: dict[str, Any] | None = None,
) -> RiskAssessment:
    """Compute an explainable, deterministic risk score and breakdown based on event parameters.

    Rules:
    - SOS: Hard emergency override. Score is fixed at 100 with CRITICAL severity.
    - RISKY_ZONE: Geofence breach into restricted/unmonitored perimeter. Base 75, max 95.
    - ROUTE_DEVIATION: Path departure from designated tourist corridor. Base 40, max 85.
    - INACTIVITY: Sensor stationary state during active excursion. Base 30, max 80.
    """
    ctx = context or {}
    factors: list[str] = []

    if incident_type == "SOS":
        factors.append("Direct manual SOS distress trigger activated by tourist.")
        factors.append("Emergency priority override applied: assigned maximum risk weight (100/100).")
        factors.append("Autonomous rapid dispatch escalation triggered for emergency response.")

        return RiskAssessment(
            incident_type="SOS",
            risk_score=100,
            severity="CRITICAL",
            contributing_factors=factors,
            recommended_action="Immediate dispatch of nearest simulated rapid patrol unit and emergency supervisor escalation.",
            is_emergency=True,
        )

    if incident_type == "RISKY_ZONE":
        score = 75
        factors.append("Synthetic geofence boundary breach into restricted/unmonitored hazard perimeter.")

        zone_risk = str(ctx.get("zone_risk_level", "HIGH")).upper()
        if "CANAL" in zone_risk or "WATER" in zone_risk or "EXTREME" in zone_risk:
            score += 10
            factors.append("Hazard zone taxonomy: unmonitored canal waterbody edge (+10 risk).")
        else:
            factors.append("Hazard zone taxonomy: unmonitored heritage construction buffer.")

        if ctx.get("night_time"):
            score += 10
            factors.append("Temporal risk factor: low-visibility night-time excursion (+10 risk).")

        if ctx.get("is_solo"):
            score += 5
            factors.append("Vulnerability factor: unaccompanied solo traveler profile (+5 risk).")

        # Cap risky zone at 95 (only SOS is 100)
        score = min(score, 95)
        severity: SeverityLevel = "CRITICAL" if score >= 90 else "HIGH" if score >= 70 else "MEDIUM"

        return RiskAssessment(
            incident_type="RISKY_ZONE",
            risk_score=score,
            severity=severity,
            contributing_factors=factors,
            recommended_action="Broadcast immediate audible hazard warning to mobile device and alert heritage ranger.",
            is_emergency=False,
        )

    if incident_type == "ROUTE_DEVIATION":
        score = 40
        distance = float(ctx.get("distance_from_corridor_m", 140))
        factors.append(f"Trajectory drifted {distance:.0f}m beyond planned tourist corridor boundary.")

        if distance >= 300:
            score += 30
            factors.append("Severe spatial drift: deviation exceeds 300 meters (+30 risk).")
        elif distance >= 150:
            score += 20
            factors.append("Moderate spatial drift: deviation exceeds 150 meters (+20 risk).")
        else:
            score += 10
            factors.append("Minor spatial drift: departure from approved waypoint trail (+10 risk).")

        if ctx.get("night_time"):
            score += 10
            factors.append("Temporal factor: evening corridor departure with reduced lighting (+10 risk).")

        if ctx.get("battery_low"):
            score += 10
            factors.append("Hardware vulnerability: client device battery below 15% (+10 risk).")

        score = min(score, 85)
        severity: SeverityLevel = "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW"

        return RiskAssessment(
            incident_type="ROUTE_DEVIATION",
            risk_score=score,
            severity=severity,
            contributing_factors=factors,
            recommended_action="Transmit automated path re-centering guidance and map waypoint advisory.",
            is_emergency=False,
        )

    if incident_type == "INACTIVITY":
        score = 30
        minutes = float(ctx.get("inactivity_minutes", 45))
        factors.append(f"Stationary dwell state detected: {minutes:.0f} minutes without movement during active trip.")

        if minutes >= 60:
            score += 35
            factors.append("Prolonged immobility threshold reached (>60 min stationary) (+35 risk).")
        elif minutes >= 30:
            score += 20
            factors.append("Extended stationary dwell exceeding expected stop duration (+20 risk).")
        else:
            score += 10
            factors.append("Unscheduled stationary pause during active segment (+10 risk).")

        if ctx.get("in_hazard_zone"):
            score += 15
            factors.append("Proximity factor: dwell location is adjacent to an unlit perimeter (+15 risk).")

        score = min(score, 80)
        severity: SeverityLevel = "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW"

        return RiskAssessment(
            incident_type="INACTIVITY",
            risk_score=score,
            severity=severity,
            contributing_factors=factors,
            recommended_action="Trigger synthetic mobile liveness check and prepare operator welfare call.",
            is_emergency=False,
        )

    # Fallback default
    return RiskAssessment(
        incident_type="INACTIVITY",
        risk_score=25,
        severity="LOW",
        contributing_factors=["Standard baseline telemetry monitoring."],
        recommended_action="Continue background telemetry monitoring.",
        is_emergency=False,
    )


def get_explainable_factors(
    incident_type: str,
    risk_score: int,
    severity: str,
    description: str = "",
) -> list[str]:
    """Derive explainable risk factors for existing incidents where breakdown was not stored."""
    factors = []
    t = incident_type.upper()

    if t == "SOS":
        factors.append("Emergency distress signal manually confirmed by tourist.")
        factors.append("Maximum priority weighting: life-safety override assigned (score = 100).")
        factors.append("Direct protocol escalation requiring immediate simulated responder unit.")
    elif t == "RISKY_ZONE":
        factors.append("Geofence boundary breach into restricted or unmonitored hazard perimeter.")
        if risk_score >= 80:
            factors.append(f"Elevated risk threshold calculated ({risk_score}/100) based on hazard severity.")
        factors.append("Proximity to unmonitored canal or construction zone triggered alert.")
    elif t == "ROUTE_DEVIATION":
        factors.append("Path departure detected beyond authorized tourist corridor boundary.")
        if risk_score >= 60:
            factors.append(f"Significant lateral corridor departure score ({risk_score}/100).")
        factors.append("Automated navigation advisory recommended to re-center tourist trajectory.")
    elif t == "INACTIVITY":
        factors.append("Extended stationary sensor reading detected during active excursion.")
        factors.append(f"Stationary dwell duration accumulated risk score of {risk_score}/100.")
        factors.append("Autonomous liveness verification check initiated.")
    else:
        factors.append(f"Standard incident evaluation: type={incident_type}, severity={severity}.")

    if description:
        factors.append(f"Recorded note: {description}")

    return factors
