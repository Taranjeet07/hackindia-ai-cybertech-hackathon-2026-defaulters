"""SQLite Database module for TrailSafe backend.

Initializes and manages SQLite database connections and table schemas
using Python's standard library sqlite3 module.
"""

from __future__ import annotations

import json
import math
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.risk_engine import get_explainable_factors

# Predictable backend data directory: backend/data/
DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DEFAULT_DB_FILE = "trailsafe.db"


def get_data_dir() -> Path:
    """Return the data directory path, creating it if it doesn't exist."""
    env_dir = os.getenv("TRAILSAFE_DATA_DIR")
    data_dir = Path(env_dir) if env_dir else DEFAULT_DATA_DIR
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_db_path() -> Path:
    """Return the absolute path to the SQLite database file."""
    env_db = os.getenv("TRAILSAFE_DB_PATH")
    if env_db:
        db_path = Path(env_db)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return db_path
    return get_data_dir() / DEFAULT_DB_FILE


def get_db_connection(db_path: Path | None = None) -> sqlite3.Connection:
    """Create and return a configured SQLite connection."""
    target_path = db_path or get_db_path()
    conn = sqlite3.connect(str(target_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


INCIDENTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    tourist_id TEXT NOT NULL,
    incident_type TEXT NOT NULL CHECK (
        incident_type IN ('SOS', 'RISKY_ZONE', 'ROUTE_DEVIATION', 'INACTIVITY')
    ),
    severity TEXT NOT NULL CHECK (
        severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    ),
    risk_score INTEGER NOT NULL CHECK (
        risk_score >= 0 AND risk_score <= 100
    ),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN', 'ASSIGNED', 'CLOSED')
    ),
    assigned_responder TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_tourist_id ON incidents (tourist_id);

CREATE TABLE IF NOT EXISTS responders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'OFF_DUTY')),
    current_incident_id TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    contact_number TEXT NOT NULL,
    is_simulated INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS geofences (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('SAFE', 'CAUTION', 'RESTRICTED')),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters REAL NOT NULL,
    risk_weight INTEGER NOT NULL,
    description TEXT NOT NULL,
    advisory_message TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS incident_events (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN ('CREATED', 'ASSIGNED', 'REASSIGNED', 'NOTE_ADDED', 'STATUS_CHANGE', 'CLOSED')
    ),
    actor TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_incident_id ON incident_events (incident_id);
"""


def ensure_extra_columns(conn: sqlite3.Connection) -> None:
    """Safely add optional coordinate, audit, and risk factor columns without modifying existing rows."""
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(incidents);")
    existing_cols = {row["name"] for row in cursor.fetchall()}
    for col_name, col_type in [
        ("latitude", "REAL"),
        ("longitude", "REAL"),
        ("location_name", "TEXT"),
        ("risk_factors", "TEXT"),
        ("closure_reason", "TEXT"),
        ("closure_notes", "TEXT"),
        ("notes", "TEXT"),
        ("location_confidence", "REAL"),
        ("device_battery", "INTEGER"),
        ("is_offline_submission", "INTEGER DEFAULT 0"),
    ]:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE incidents ADD COLUMN {col_name} {col_type};")
    conn.commit()


def seed_reference_data(conn: sqlite3.Connection) -> None:
    """Seed initial simulated responders, geofences, and backfill audit events if empty."""
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Seed simulated responders
    cursor.execute("SELECT COUNT(*) FROM responders;")
    if cursor.fetchone()[0] == 0:
        responders = [
            ("RESP-001", "Unit 1 - Hazratganj Rapid Patrol (Simulated)", "Rapid Patrol", "AVAILABLE", None, 26.8530, 80.9480, "+91 98765 43210 (SIMULATED)", 1, now_iso),
            ("RESP-002", "Unit 2 - Heritage Zone Ranger (Simulated)", "Trail Ranger", "AVAILABLE", None, 26.8685, 80.9140, "+91 98765 43211 (SIMULATED)", 1, now_iso),
            ("RESP-003", "Unit 3 - Riverfront Safety Team (Simulated)", "Waterfront Safety", "AVAILABLE", None, 26.8520, 80.9610, "+91 98765 43212 (SIMULATED)", 1, now_iso),
            ("RESP-004", "Unit 4 - Medical First Responder (Simulated)", "Emergency Paramedic", "AVAILABLE", None, 26.8600, 80.9280, "+91 98765 43213 (SIMULATED)", 1, now_iso),
            ("RESP-005", "Unit 5 - Drone Reconnaissance Team (Simulated)", "Aerial Recon", "AVAILABLE", None, 26.8400, 80.9700, "+91 98765 43214 (SIMULATED)", 1, now_iso),
        ]
        cursor.executemany(
            """
            INSERT INTO responders (
                id, name, role, status, current_incident_id, latitude, longitude,
                contact_number, is_simulated, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            responders,
        )

    # 2. Seed geofence perimeters
    cursor.execute("SELECT COUNT(*) FROM geofences;")
    if cursor.fetchone()[0] == 0:
        geofences = [
            (
                "GEO-01",
                "Hazratganj Safe Corridor & Tourist Hub",
                "SAFE",
                26.8500,
                80.9490,
                450.0,
                0,
                "Designated tourist promenade with active CCTV and high public security presence.",
                "You are within the verified safe tourist corridor. High footfall and active assistance available.",
                1,
            ),
            (
                "GEO-02",
                "Bara Imambara Heritage Sanctuary",
                "SAFE",
                26.8693,
                80.9127,
                400.0,
                0,
                "Protected monument area with designated heritage walking trails.",
                "Welcome to Bara Imambara Heritage Zone. Please remain on paved pathways.",
                1,
            ),
            (
                "GEO-03",
                "Gomti Riverbank Canal Buffer",
                "CAUTION",
                26.8530,
                80.9620,
                300.0,
                40,
                "Steep embankment with low lighting conditions during twilight hours.",
                "Advisory: Riverbank caution perimeter. Maintain safe distance from water edge.",
                1,
            ),
            (
                "GEO-04",
                "North Ravine Restricted Perimeter",
                "RESTRICTED",
                26.8780,
                80.9050,
                350.0,
                80,
                "Unlit railway cutting and hazardous terrain outside tourist boundary.",
                "Warning: Restricted perimeter reached! Turn back toward designated trail markers immediately.",
                1,
            ),
        ]
        cursor.executemany(
            """
            INSERT INTO geofences (
                id, name, zone_type, latitude, longitude, radius_meters,
                risk_weight, description, advisory_message, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            geofences,
        )

    # 3. Backfill initial events for existing incidents if incident_events table is empty
    cursor.execute("SELECT COUNT(*) FROM incident_events;")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id, tourist_id, incident_type, status, created_at, updated_at FROM incidents;")
        existing_incidents = cursor.fetchall()
        initial_events = []
        for inc in existing_incidents:
            inc_id = inc["id"]
            c_at = inc["created_at"]
            u_at = inc["updated_at"]
            # Created event
            initial_events.append((
                f"EVT-{uuid.uuid4().hex[:10].upper()}",
                inc_id,
                "CREATED",
                f"Tourist {inc['tourist_id']}",
                f"Initial incident created ({inc['incident_type']})",
                c_at,
            ))
            # If closed, also record closure event
            if inc["status"] == "CLOSED":
                initial_events.append((
                    f"EVT-{uuid.uuid4().hex[:10].upper()}",
                    inc_id,
                    "CLOSED",
                    "Authority Control Room",
                    "Incident verified and marked CLOSED",
                    u_at,
                ))
        if initial_events:
            cursor.executemany(
                """
                INSERT INTO incident_events (
                    id, incident_id, event_type, actor, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?);
                """,
                initial_events,
            )

    # 4. Seed baseline synthetic demo incidents if incidents table is completely empty
    cursor.execute("SELECT COUNT(*) FROM incidents;")
    if cursor.fetchone()[0] == 0:
        seed_baseline_demo_incidents(conn)

    conn.commit()


def seed_baseline_demo_incidents(conn: sqlite3.Connection, force: bool = False) -> int:
    """Seed a curated baseline set of synthetic demonstration incidents if table is empty.

    Clearly marks all records with '(Synthetic Demo Anchor)' to differentiate them from genuine GPS reports.
    Will NOT insert anything if incidents table already contains data, unless force=True.
    """
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM incidents;")
    existing_count = cursor.fetchone()[0]
    if existing_count > 0 and not force:
        return 0

    now_iso = datetime.now(timezone.utc).isoformat()
    baseline_incidents = [
        (
            "INC-DEMO-001",
            "TS-BASELINE-01",
            "RISKY_ZONE",
            "HIGH",
            85,
            "Simulated breach into unmonitored canal hazard perimeter near Gomti Riverbank (Demo Baseline).",
            "ASSIGNED",
            "Unit 2 - Heritage Zone Ranger (Simulated)",
            now_iso,
            now_iso,
            26.8530,
            80.9620,
            "Gomti Riverfront Buffer (Synthetic Demo Anchor)",
            json.dumps([
                "Synthetic geofence boundary breach into restricted/unmonitored hazard perimeter.",
                "Hazard zone taxonomy: unmonitored canal waterbody edge (+10 risk).",
                "Assigned to Unit 2 (Heritage Ranger) for demonstration.",
            ]),
            None,
            None,
            "[DEMO NOTE] Field unit dispatched to inspect perimeter.",
            15.0,
            88,
            0,
        ),
        (
            "INC-DEMO-002",
            "TS-BASELINE-02",
            "SOS",
            "CRITICAL",
            100,
            "Emergency SOS distress simulation recorded during trail evaluation (Demo Baseline).",
            "CLOSED",
            None,
            now_iso,
            now_iso,
            26.8610,
            80.9270,
            "The Residency Historical Grounds (Synthetic Demo Anchor)",
            json.dumps([
                "Direct manual SOS distress trigger activated by tourist.",
                "Emergency priority override applied: assigned maximum risk weight (100/100).",
                "Incident verified resolved and marked safe in SQLite.",
            ]),
            "Resolved / Verified Safe",
            "Tourist verified safe at Residency grounds. Escort concluded.",
            "[DEMO NOTE] Verified false alarm test.",
            5.0,
            92,
            0,
        ),
        (
            "INC-DEMO-003",
            "TS-BASELINE-03",
            "ROUTE_DEVIATION",
            "MEDIUM",
            55,
            "Traveler drifted 140m away from designated heritage corridor (Demo Baseline).",
            "OPEN",
            None,
            now_iso,
            now_iso,
            26.8715,
            80.9118,
            "Rumi Darwaza Gateway (Synthetic Demo Anchor)",
            json.dumps([
                "Trajectory drifted 140m beyond planned tourist corridor boundary.",
                "Corridor re-centering advisory dispatched.",
                "Awaiting automated path recovery.",
            ]),
            None,
            None,
            None,
            20.0,
            75,
            0,
        ),
        (
            "INC-0D9F68497C",
            "TS-PRESERVED-01",
            "SOS",
            "CRITICAL",
            100,
            "Simulated emergency SOS triggered by the demo tourist.",
            "CLOSED",
            None,
            now_iso,
            now_iso,
            26.8524,
            80.9462,
            "Hazratganj Heritage Walk (Synthetic Demo Anchor)",
            json.dumps(["Manual emergency SOS distress beacon activated by tourist."]),
            "Resolved / Verified Safe",
            "Tourist verified safe.",
            None,
            10.0,
            90,
            0,
        ),
        (
            "INC-82B22CF66D",
            "TS-PRESERVED-02",
            "RISKY_ZONE",
            "HIGH",
            85,
            "Simulated breach into unmonitored canal hazard perimeter.",
            "CLOSED",
            None,
            now_iso,
            now_iso,
            26.8530,
            80.9620,
            "Gomti Riverbank Canal Buffer (Synthetic Demo Anchor)",
            json.dumps(["Hazard zone taxonomy: canal waterbody edge"]),
            "Resolved / Verified Safe",
            "Zone boundary restored.",
            None,
            12.0,
            85,
            0,
        ),
        (
            "INC-18D797B50D",
            "TS-PRESERVED-03",
            "ROUTE_DEVIATION",
            "MEDIUM",
            55,
            "Traveler drifted away from designated tourist corridor.",
            "CLOSED",
            None,
            now_iso,
            now_iso,
            26.8610,
            80.9270,
            "The Residency Grounds (Synthetic Demo Anchor)",
            json.dumps(["Trajectory drifted beyond boundary"]),
            "Resolved / Verified Safe",
            "Route re-centered.",
            None,
            8.0,
            94,
            0,
        ),
        (
            "INC-9D0B7643E0",
            "TS-PRESERVED-04",
            "SOS",
            "CRITICAL",
            100,
            "Simulated emergency SOS distress signal.",
            "CLOSED",
            None,
            now_iso,
            now_iso,
            26.8693,
            80.9127,
            "Bara Imambara Perimeter (Synthetic Demo Anchor)",
            json.dumps(["Distress beacon confirmed"]),
            "Resolved / Verified Safe",
            "Escort completed.",
            None,
            6.0,
            80,
            0,
        ),
        (
            "INC-8E0E9AFF9B",
            "TS-PRESERVED-05",
            "INACTIVITY",
            "LOW",
            30,
            "Extended dwell time detected at heritage rest area.",
            "CLOSED",
            None,
            now_iso,
            now_iso,
            26.8500,
            80.9490,
            "Hazratganj Cultural Center (Synthetic Demo Anchor)",
            json.dumps(["Stationary dwell at rest waypoint"]),
            "Resolved / Verified Safe",
            "Tourist resumed normal trail movement.",
            None,
            5.0,
            95,
            0,
        ),
    ]

    cursor.executemany(
        """
        INSERT OR IGNORE INTO incidents (
            id, tourist_id, incident_type, severity, risk_score, description,
            status, assigned_responder, created_at, updated_at, latitude, longitude,
            location_name, risk_factors, closure_reason, closure_notes, notes,
            location_confidence, device_battery, is_offline_submission
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
        baseline_incidents,
    )

    # Synchronize assigned responder for INC-DEMO-001
    cursor.execute(
        """
        UPDATE responders
        SET status = 'ASSIGNED', current_incident_id = 'INC-DEMO-001', updated_at = ?
        WHERE id = 'RESP-002';
        """,
        (now_iso,),
    )

    # Insert baseline audit events
    events = [
        (f"EVT-{uuid.uuid4().hex[:10].upper()}", "INC-DEMO-001", "CREATED", "Tourist TS-BASELINE-01", "Incident registered (RISKY_ZONE, Severity: HIGH, Risk: 85/100)", now_iso),
        (f"EVT-{uuid.uuid4().hex[:10].upper()}", "INC-DEMO-001", "ASSIGNED", "Authority Operator", "Simulated responder assigned: Unit 2 - Heritage Zone Ranger (Simulated)", now_iso),
        (f"EVT-{uuid.uuid4().hex[:10].upper()}", "INC-DEMO-002", "CREATED", "Tourist TS-BASELINE-02", "Emergency SOS triggered (Demo Baseline)", now_iso),
        (f"EVT-{uuid.uuid4().hex[:10].upper()}", "INC-DEMO-002", "CLOSED", "Authority Operator", "Closed reason: Resolved / Verified Safe", now_iso),
        (f"EVT-{uuid.uuid4().hex[:10].upper()}", "INC-DEMO-003", "CREATED", "Tourist TS-BASELINE-03", "Route deviation registered (Demo Baseline)", now_iso),
    ]
    cursor.executemany(
        """
        INSERT OR IGNORE INTO incident_events (
            id, incident_id, event_type, actor, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?);
        """,
        events,
    )
    conn.commit()
    return len(baseline_incidents)


def init_db(db_path: Path | None = None) -> Path:
    """Initialize SQLite database and ensure all required tables, columns, and seed data exist safely."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    try:
        conn.executescript(INCIDENTS_TABLE_SQL)
        conn.commit()
        ensure_extra_columns(conn)
        seed_reference_data(conn)
    finally:
        conn.close()
    return target_path


def verify_db_schema(db_path: Path | None = None) -> dict[str, object]:
    """Verify that the database can be opened and the incidents table exists with required columns."""
    target_path = db_path or get_db_path()
    if not target_path.exists():
        return {
            "status": "error",
            "message": f"Database file does not exist at {target_path}",
            "db_path": str(target_path),
        }

    conn = get_db_connection(target_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='incidents';"
        )
        table_row = cursor.fetchone()
        if not table_row:
            return {
                "status": "error",
                "message": "Table 'incidents' not found in database",
                "db_path": str(target_path),
            }

        cursor.execute("PRAGMA table_info(incidents);")
        columns = [row["name"] for row in cursor.fetchall()]

        required_columns = [
            "id",
            "tourist_id",
            "incident_type",
            "severity",
            "risk_score",
            "description",
            "status",
            "assigned_responder",
            "created_at",
            "updated_at",
        ]

        missing = [col for col in required_columns if col not in columns]
        if missing:
            return {
                "status": "error",
                "message": f"Missing required columns: {missing}",
                "columns": columns,
                "db_path": str(target_path),
            }

        return {
            "status": "ok",
            "db_path": str(target_path),
            "table": "incidents",
            "columns": columns,
        }
    finally:
        conn.close()


def _format_incident_row(row_dict: dict[str, object]) -> dict[str, object]:
    """Format row dictionary and deserialize/derive risk_factors."""
    item = dict(row_dict)
    rf = item.get("risk_factors")
    if rf and isinstance(rf, str):
        try:
            item["risk_factors"] = json.loads(rf)
        except Exception:
            item["risk_factors"] = [rf]
    else:
        item["risk_factors"] = get_explainable_factors(
            str(item["incident_type"]),
            int(item["risk_score"]),
            str(item["severity"]),
            str(item.get("description", "")),
        )
    # Ensure default values for new columns
    if "closure_reason" not in item:
        item["closure_reason"] = None
    if "closure_notes" not in item:
        item["closure_notes"] = None
    if "notes" not in item:
        item["notes"] = None
    if "location_confidence" not in item:
        item["location_confidence"] = None
    if "device_battery" not in item:
        item["device_battery"] = None
    if "is_offline_submission" not in item:
        item["is_offline_submission"] = 0
    return item


def create_incident(
    tourist_id: str,
    incident_type: str,
    severity: str,
    risk_score: int,
    description: str,
    latitude: float | None = None,
    longitude: float | None = None,
    location_name: str | None = None,
    risk_factors: list[str] | None = None,
    closure_reason: str | None = None,
    closure_notes: str | None = None,
    notes: str | None = None,
    location_confidence: float | None = None,
    device_battery: int | None = None,
    is_offline_submission: int = 0,
    db_path: Path | None = None,
) -> dict[str, object]:
    """Insert a new incident into SQLite database, create audit event, and return the saved record."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    ensure_extra_columns(conn)

    incident_id = f"INC-{uuid.uuid4().hex[:10].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    status = "OPEN"
    assigned_responder = None
    rf_json = json.dumps(risk_factors) if risk_factors else None

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO incidents (
                id, tourist_id, incident_type, severity, risk_score,
                description, status, assigned_responder, created_at, updated_at,
                latitude, longitude, location_name, risk_factors,
                closure_reason, closure_notes, notes, location_confidence,
                device_battery, is_offline_submission
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                incident_id,
                tourist_id,
                incident_type,
                severity,
                risk_score,
                description,
                status,
                assigned_responder,
                now_iso,
                now_iso,
                latitude,
                longitude,
                location_name,
                rf_json,
                closure_reason,
                closure_notes,
                notes,
                location_confidence,
                device_battery,
                is_offline_submission,
            ),
        )

        # Record CREATED event in incident_events
        evt_id = f"EVT-{uuid.uuid4().hex[:10].upper()}"
        offline_tag = " (Offline queue synced)" if is_offline_submission else ""
        cursor.execute(
            """
            INSERT INTO incident_events (
                id, incident_id, event_type, actor, notes, created_at
            ) VALUES (?, ?, 'CREATED', ?, ?, ?);
            """,
            (
                evt_id,
                incident_id,
                f"Tourist {tourist_id}",
                f"Incident registered ({incident_type}, Severity: {severity}, Risk: {risk_score}/100){offline_tag}",
                now_iso,
            ),
        )
        conn.commit()

        return _format_incident_row({
            "id": incident_id,
            "tourist_id": tourist_id,
            "incident_type": incident_type,
            "severity": severity,
            "risk_score": risk_score,
            "description": description,
            "status": status,
            "assigned_responder": assigned_responder,
            "created_at": now_iso,
            "updated_at": now_iso,
            "latitude": latitude,
            "longitude": longitude,
            "location_name": location_name,
            "risk_factors": rf_json,
            "closure_reason": closure_reason,
            "closure_notes": closure_notes,
            "notes": notes,
            "location_confidence": location_confidence,
            "device_battery": device_battery,
            "is_offline_submission": is_offline_submission,
        })
    finally:
        conn.close()


def get_all_incidents(
    status_filter: str | None = None,
    severity_filter: str | None = None,
    type_filter: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db_path: Path | None = None,
) -> list[dict[str, object]]:
    """Retrieve all incidents with optional filtering and sorting, newest first by default."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM incidents WHERE 1=1"
        params: list[object] = []

        if status_filter and isinstance(status_filter, str) and status_filter.upper() != "ALL":
            query += " AND status = ?"
            params.append(status_filter.upper())

        if severity_filter and isinstance(severity_filter, str) and severity_filter.upper() != "ALL":
            query += " AND severity = ?"
            params.append(severity_filter.upper())

        if type_filter and isinstance(type_filter, str) and type_filter.upper() != "ALL":
            query += " AND incident_type = ?"
            params.append(type_filter.upper())

        # Safe sorting column whitelist
        valid_sort_cols = {
            "created_at": "created_at",
            "updated_at": "updated_at",
            "risk_score": "risk_score",
            "severity": "severity",
            "status": "status",
        }
        col = valid_sort_cols.get(sort_by if isinstance(sort_by, str) else "created_at", "created_at")
        order = "DESC" if (isinstance(sort_order, str) and sort_order.lower() == "desc") else "ASC"
        query += f" ORDER BY {col} {order};"

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        return [_format_incident_row(dict(row)) for row in rows]
    finally:
        conn.close()


def get_incident_by_id(
    incident_id: str, db_path: Path | None = None
) -> dict[str, object] | None:
    """Retrieve a single incident by its unique identifier or return None."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents WHERE id = ?;", (incident_id,))
        row = cursor.fetchone()
        return _format_incident_row(dict(row)) if row else None
    finally:
        conn.close()


def delete_incident_by_id(
    incident_id: str, db_path: Path | None = None
) -> bool:
    """Delete an incident by its unique ID (used for test cleanup)."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM incident_events WHERE incident_id = ?;", (incident_id,))
        cursor.execute("DELETE FROM incidents WHERE id = ?;", (incident_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_active_incident(
    tourist_id: str,
    incident_type: str,
    db_path: Path | None = None,
) -> dict[str, object] | None:
    """Retrieve an active (OPEN or ASSIGNED) incident for the specified tourist and type if one exists."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM incidents
            WHERE tourist_id = ? AND incident_type = ? AND status IN ('OPEN', 'ASSIGNED')
            ORDER BY created_at DESC
            LIMIT 1;
            """,
            (tourist_id, incident_type),
        )
        row = cursor.fetchone()
        return _format_incident_row(dict(row)) if row else None
    finally:
        conn.close()


def get_open_sos_incident(
    tourist_id: str, db_path: Path | None = None
) -> dict[str, object] | None:
    """Retrieve an active OPEN or ASSIGNED SOS incident for the specified tourist if one exists."""
    return get_active_incident(tourist_id, "SOS", db_path=db_path)


def assign_responder(
    incident_id: str,
    responder_name: str,
    status_override: str | None = None,
    author: str = "Authority Operator",
    db_path: Path | None = None,
) -> dict[str, object] | None:
    """Assign a simulated responder to an incident, update responder table, and log audit event."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        cursor = conn.cursor()
        target_status = status_override or "ASSIGNED"

        cursor.execute(
            """
            UPDATE incidents
            SET assigned_responder = ?,
                status = CASE WHEN status = 'OPEN' THEN ? ELSE status END,
                updated_at = ?
            WHERE id = ?;
            """,
            (responder_name, target_status, now_iso, incident_id),
        )
        if cursor.rowcount == 0:
            return None

        # Release any previously assigned responder for this incident who is not the newly assigned responder
        cursor.execute(
            """
            UPDATE responders
            SET status = 'AVAILABLE', current_incident_id = NULL, updated_at = ?
            WHERE current_incident_id = ? AND NOT (id = ? OR name = ? OR name LIKE ?);
            """,
            (now_iso, incident_id, responder_name, responder_name, f"{responder_name}%"),
        )

        # Update matching responder in responders table
        cursor.execute(
            """
            UPDATE responders
            SET status = 'ASSIGNED', current_incident_id = ?, updated_at = ?
            WHERE id = ? OR name = ? OR name LIKE ?;
            """,
            (incident_id, now_iso, responder_name, responder_name, f"{responder_name}%"),
        )

        # Log audit event
        evt_id = f"EVT-{uuid.uuid4().hex[:10].upper()}"
        cursor.execute(
            """
            INSERT INTO incident_events (
                id, incident_id, event_type, actor, notes, created_at
            ) VALUES (?, ?, 'ASSIGNED', ?, ?, ?);
            """,
            (evt_id, incident_id, author, f"Simulated responder assigned: {responder_name}", now_iso),
        )
        conn.commit()
        return get_incident_by_id(incident_id, db_path=target_path)
    finally:
        conn.close()


def update_incident(
    incident_id: str,
    status: str | None = None,
    assigned_responder: str | None = None,
    author: str = "Authority Operator",
    db_path: Path | None = None,
) -> dict[str, object] | None:
    """Update incident status and/or assigned responder."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        fields = []
        params = []
        if status is not None:
            fields.append("status = ?")
            params.append(status)
        if assigned_responder is not None:
            fields.append("assigned_responder = ?")
            params.append(assigned_responder)
        if not fields:
            return get_incident_by_id(incident_id, db_path=target_path)
        fields.append("updated_at = ?")
        params.append(now_iso)
        params.append(incident_id)

        sql = f"UPDATE incidents SET {', '.join(fields)} WHERE id = ?;"
        cursor = conn.cursor()
        cursor.execute(sql, tuple(params))
        if cursor.rowcount == 0:
            return None

        # Synchronize responders table if status was closed or responder reassigned
        if status == "CLOSED":
            cursor.execute(
                """
                UPDATE responders
                SET status = 'AVAILABLE', current_incident_id = NULL, updated_at = ?
                WHERE current_incident_id = ?;
                """,
                (now_iso, incident_id),
            )
        elif assigned_responder is not None:
            cursor.execute(
                """
                UPDATE responders
                SET status = 'AVAILABLE', current_incident_id = NULL, updated_at = ?
                WHERE current_incident_id = ? AND NOT (name = ? OR name LIKE ?);
                """,
                (now_iso, incident_id, assigned_responder, f"{assigned_responder}%"),
            )
            cursor.execute(
                """
                UPDATE responders
                SET status = 'ASSIGNED', current_incident_id = ?, updated_at = ?
                WHERE name = ? OR name LIKE ?;
                """,
                (incident_id, now_iso, assigned_responder, f"{assigned_responder}%"),
            )

        # Record audit event
        evt_id = f"EVT-{uuid.uuid4().hex[:10].upper()}"
        event_notes = f"Updated: {', '.join(fields)}"
        cursor.execute(
            """
            INSERT INTO incident_events (
                id, incident_id, event_type, actor, notes, created_at
            ) VALUES (?, ?, 'STATUS_CHANGE', ?, ?, ?);
            """,
            (evt_id, incident_id, author, event_notes, now_iso),
        )
        conn.commit()
        return get_incident_by_id(incident_id, db_path=target_path)
    finally:
        conn.close()


def close_incident(
    incident_id: str,
    closure_reason: str | None = None,
    closure_notes: str | None = None,
    author: str = "Authority Operator",
    db_path: Path | None = None,
) -> dict[str, object] | None:
    """Mark an existing incident as CLOSED, record reason, release assigned responder, and log audit event."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        cursor = conn.cursor()
        final_reason = closure_reason or "Resolved / Verified Safe"

        cursor.execute(
            """
            UPDATE incidents
            SET status = 'CLOSED',
                closure_reason = ?,
                closure_notes = ?,
                updated_at = ?
            WHERE id = ?;
            """,
            (final_reason, closure_notes, now_iso, incident_id),
        )
        if cursor.rowcount == 0:
            return None

        # Release any assigned responder in responders table back to AVAILABLE
        cursor.execute(
            """
            UPDATE responders
            SET status = 'AVAILABLE', current_incident_id = NULL, updated_at = ?
            WHERE current_incident_id = ?;
            """,
            (now_iso, incident_id),
        )

        # Record audit event
        evt_id = f"EVT-{uuid.uuid4().hex[:10].upper()}"
        reason_txt = f"Closed reason: {final_reason}"
        if closure_notes:
            reason_txt += f" | Notes: {closure_notes}"
        cursor.execute(
            """
            INSERT INTO incident_events (
                id, incident_id, event_type, actor, notes, created_at
            ) VALUES (?, ?, 'CLOSED', ?, ?, ?);
            """,
            (evt_id, incident_id, author, reason_txt, now_iso),
        )
        conn.commit()
        return get_incident_by_id(incident_id, db_path=target_path)
    finally:
        conn.close()


def add_incident_note(
    incident_id: str,
    note_text: str,
    author: str = "Authority Operator",
    db_path: Path | None = None,
) -> dict[str, object] | None:
    """Append an operator note to an incident and log a NOTE_ADDED audit event."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT notes FROM incidents WHERE id = ?;", (incident_id,))
        row = cursor.fetchone()
        if not row:
            return None

        existing_notes = row["notes"] or ""
        new_entry = f"[{now_iso}] ({author}): {note_text.strip()}"
        updated_notes = f"{existing_notes}\n{new_entry}".strip() if existing_notes else new_entry

        cursor.execute(
            """
            UPDATE incidents
            SET notes = ?, updated_at = ?
            WHERE id = ?;
            """,
            (updated_notes, now_iso, incident_id),
        )

        # Audit event
        evt_id = f"EVT-{uuid.uuid4().hex[:10].upper()}"
        cursor.execute(
            """
            INSERT INTO incident_events (
                id, incident_id, event_type, actor, notes, created_at
            ) VALUES (?, ?, 'NOTE_ADDED', ?, ?, ?);
            """,
            (evt_id, incident_id, author, note_text.strip(), now_iso),
        )
        conn.commit()
        return get_incident_by_id(incident_id, db_path=target_path)
    finally:
        conn.close()


def get_incident_events(
    incident_id: str, db_path: Path | None = None
) -> list[dict[str, object]]:
    """Retrieve chronological audit timeline events for an incident."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, incident_id, event_type, actor, notes, created_at
            FROM incident_events
            WHERE incident_id = ?
            ORDER BY created_at ASC;
            """,
            (incident_id,),
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_responders(db_path: Path | None = None) -> list[dict[str, object]]:
    """Retrieve all simulated responders."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM responders ORDER BY id ASC;")
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def update_responder(
    responder_id: str,
    status: str | None = None,
    current_incident_id: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    db_path: Path | None = None,
) -> dict[str, object] | None:
    """Update simulated responder status, coordinates, or incident assignment."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        fields = []
        params = []
        if status is not None:
            fields.append("status = ?")
            params.append(status)
        if current_incident_id is not None:
            fields.append("current_incident_id = ?")
            params.append(None if current_incident_id == "" else current_incident_id)
        if latitude is not None:
            fields.append("latitude = ?")
            params.append(latitude)
        if longitude is not None:
            fields.append("longitude = ?")
            params.append(longitude)

        if not fields:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM responders WHERE id = ?;", (responder_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

        fields.append("updated_at = ?")
        params.append(now_iso)
        params.append(responder_id)

        sql = f"UPDATE responders SET {', '.join(fields)} WHERE id = ?;"
        cursor = conn.cursor()
        cursor.execute(sql, tuple(params))
        conn.commit()
        if cursor.rowcount == 0:
            return None

        cursor.execute("SELECT * FROM responders WHERE id = ?;", (responder_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_geofences(db_path: Path | None = None) -> list[dict[str, object]]:
    """Retrieve all active geofence zones."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM geofences WHERE is_active = 1 ORDER BY id ASC;")
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two coordinates using Haversine formula."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R * c


def check_geofence(
    latitude: float, longitude: float, db_path: Path | None = None
) -> dict[str, object]:
    """Check coordinates against active geofence perimeters and return containment and zone advisory."""
    geofences = get_geofences(db_path=db_path)
    matches = []
    min_safe_dist = float("inf")
    closest_safe_name = "Corridor"

    for g in geofences:
        dist = haversine_distance_m(latitude, longitude, float(g["latitude"]), float(g["longitude"]))
        radius = float(g["radius_meters"])
        if g["zone_type"] == "SAFE" and dist < min_safe_dist:
            min_safe_dist = dist
            closest_safe_name = str(g["name"])

        if dist <= radius:
            matches.append({
                "geofence": g,
                "distance_to_center_m": round(dist, 1),
                "zone_type": g["zone_type"],
                "risk_weight": g["risk_weight"],
                "advisory_message": g["advisory_message"],
            })

    # Priority sorting: RESTRICTED > CAUTION > SAFE
    priority_order = {"RESTRICTED": 3, "CAUTION": 2, "SAFE": 1}
    matches.sort(key=lambda m: priority_order.get(m["zone_type"], 0), reverse=True)

    if matches:
        top = matches[0]
        return {
            "inside_geofence": True,
            "geofence_id": top["geofence"]["id"],
            "geofence_name": top["geofence"]["name"],
            "zone_type": top["zone_type"],
            "risk_weight": top["risk_weight"],
            "distance_to_center_m": top["distance_to_center_m"],
            "advisory_message": top["advisory_message"],
            "is_hazard": top["zone_type"] in ("CAUTION", "RESTRICTED"),
        }

    # If outside all designated zones, check if tourist has drifted far
    is_deviated = min_safe_dist > 800
    return {
        "inside_geofence": False,
        "geofence_id": None,
        "geofence_name": None,
        "zone_type": "OUTSIDE_CORRIDOR" if is_deviated else "TRANSIT",
        "risk_weight": 25 if is_deviated else 0,
        "distance_to_center_m": round(min_safe_dist, 1) if min_safe_dist != float("inf") else 0,
        "advisory_message": (
            f"Advisory: You are {round(min_safe_dist)}m from {closest_safe_name}. Stay on marked paths."
            if is_deviated
            else "You are traveling in an open corridor area. Stay alert and follow trail markers."
        ),
        "is_hazard": is_deviated,
    }


def get_analytics_summary(db_path: Path | None = None) -> dict[str, object]:
    """Calculate real analytics metrics aggregated from the SQLite database."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM incidents;")
        total_incidents = cursor.fetchone()[0]

        cursor.execute("SELECT status, COUNT(*) as cnt FROM incidents GROUP BY status;")
        status_map = {row["status"]: row["cnt"] for row in cursor.fetchall()}

        cursor.execute("SELECT severity, COUNT(*) as cnt FROM incidents GROUP BY severity;")
        severity_map = {row["severity"]: row["cnt"] for row in cursor.fetchall()}

        cursor.execute("SELECT incident_type, COUNT(*) as cnt FROM incidents GROUP BY incident_type;")
        type_map = {row["incident_type"]: row["cnt"] for row in cursor.fetchall()}

        cursor.execute("SELECT AVG(risk_score) FROM incidents;")
        avg_risk_row = cursor.fetchone()[0]
        avg_risk = round(float(avg_risk_row or 0), 1)

        cursor.execute("SELECT COUNT(*) FROM responders;")
        total_resp = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM responders WHERE status = 'AVAILABLE';")
        avail_resp = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM responders WHERE status = 'ASSIGNED';")
        assigned_resp = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM responders WHERE status = 'OFF_DUTY';")
        off_duty_resp = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM geofences WHERE is_active = 1;")
        active_geofences = cursor.fetchone()[0]

        return {
            "total_incidents": total_incidents,
            "status_counts": {
                "OPEN": status_map.get("OPEN", 0),
                "ASSIGNED": status_map.get("ASSIGNED", 0),
                "CLOSED": status_map.get("CLOSED", 0),
            },
            "severity_counts": {
                "CRITICAL": severity_map.get("CRITICAL", 0),
                "HIGH": severity_map.get("HIGH", 0),
                "MEDIUM": severity_map.get("MEDIUM", 0),
                "LOW": severity_map.get("LOW", 0),
            },
            "type_counts": {
                "SOS": type_map.get("SOS", 0),
                "RISKY_ZONE": type_map.get("RISKY_ZONE", 0),
                "ROUTE_DEVIATION": type_map.get("ROUTE_DEVIATION", 0),
                "INACTIVITY": type_map.get("INACTIVITY", 0),
            },
            "avg_risk_score": avg_risk,
            "responders": {
                "total": total_resp,
                "available": avail_resp,
                "assigned": assigned_resp,
                "off_duty": off_duty_resp,
            },
            "active_geofences_count": active_geofences,
        }
    finally:
        conn.close()


def reset_demo_incidents(
    tourist_id: str = "TS-DEMO-001", db_path: Path | None = None
) -> int:
    """Delete all incidents associated with the specified demo tourist and release any assigned responders."""
    target_path = db_path or get_db_path()
    conn = get_db_connection(target_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        cursor = conn.cursor()
        # 1. Release any responders currently assigned to this tourist's incidents
        cursor.execute(
            """
            UPDATE responders
            SET status = 'AVAILABLE', current_incident_id = NULL, updated_at = ?
            WHERE current_incident_id IN (SELECT id FROM incidents WHERE tourist_id = ?);
            """,
            (now_iso, tourist_id),
        )

        # 2. Clean up audit events for demo tourist incidents
        cursor.execute(
            """
            DELETE FROM incident_events
            WHERE incident_id IN (SELECT id FROM incidents WHERE tourist_id = ?);
            """,
            (tourist_id,),
        )
        cursor.execute(
            "DELETE FROM incidents WHERE tourist_id = ?;", (tourist_id,)
        )
        deleted_count = cursor.rowcount
        conn.commit()
        return deleted_count
    finally:
        conn.close()
