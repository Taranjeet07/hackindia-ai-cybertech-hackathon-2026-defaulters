# TrailSafe 🛡️ — Tourist Safety & Authority Incident Management System

**TrailSafe** is an end-to-end, full-stack tourist safety and emergency incident management platform designed for heritage trails, cultural circuits, and eco-tourism corridors. 

The platform provides travelers with real-time route guidance, risk awareness, and emergency SOS distress signaling, while equipping public safety operators with an Authority Control Room dashboard featuring live geospatial maps, explainable risk audits, simulated responder dispatch, and operational analytics.

---

## ⚠️ Hackathon Demonstration Notice
> **IMPORTANT SIMULATION NOTICE**: TrailSafe is a prototype simulation platform developed for hackathon demonstration and evaluation.
> - All responder designations, GPS telemetry anchors, patrol movements, and dispatches are **synthetically simulated**.
> - The application **does NOT contact real emergency services, police, 112, or law enforcement**.
> - Visible demo mode badges and disclaimers are prominently displayed throughout both the Tourist and Authority interfaces.

---

## 🎯 Problem Statement
Heritage tourism circuits and eco-trails present distinct public safety challenges:
1. **Unmonitored Hazard Zones**: Tourists frequently wander into unlit, restricted, or hazardous perimeters (e.g., riverbanks, unstable ruins, deep forest trails) without immediate hazard warnings.
2. **Delayed Emergency Response**: In conventional setups, distressed tourists struggle to communicate precise coordinates to emergency operators, leading to dispatch delays.
3. **Dead-Zone Vulnerability**: Connectivity drops in remote or dense historical sectors result in failed distress transmissions.
4. **Lack of Operational Visibility**: Local authorities lack a centralized, map-centric dashboard to track ongoing trail distress calls, allocate patrol units, and monitor response lifecycle metrics in real time.

**TrailSafe resolves these problems** with edge-aware browser geolocation, deterministic rule-based risk evaluation, offline transmission queuing, and a live Authority Control Room powered by Leaflet and OpenStreetMap.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                 │
│  React 18 + TypeScript + Vite + Custom High-Contrast Command Center CSS     │
│                                                                             │
│  ┌─────────────────────────┐  ┌────────────────────────┐  ┌──────────────┐  │
│  │   Tourist App View      │  │ Authority Control Room │  │ Map Engine   │  │
│  │   - Excursion Timer     │  │ - Metrics & Filters    │  │ Leaflet +    │  │
│  │   - Hazard Detectors    │  │ - Incident Table       │  │ OpenStreetMap│  │
│  │   - Single-Click SOS    │  │ - Patrol Fleet Modal   │  │ (Zero API key│  │
│  │   - Offline Queue Sync  │  │ - Analytics Insights   │  │  required)   │  │
│  └───────────┬─────────────┘  └───────────┬────────────┘  └──────┬───────┘  │
│              │ (Bilingual en/hi Context)  │                      │          │
└──────────────┼────────────────────────────┼──────────────────────┼──────────┘
               │ HTTP / JSON REST Requests  │                      │
               ▼                            ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND LAYER                                  │
│                 FastAPI (Python 3.12+) Asynchronous REST API                │
│                                                                             │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────┐  │
│  │ /api/incidents Routes  │  │ Deterministic Risk     │  │ /api/geofences│  │
│  │ - Duplicate SOS Guard  │  │ Engine (0-100 scale)   │  │ - Haversine   │  │
│  │ - Assign & Close       │  │ - Explainable Factors  │  │   Distance    │  │
│  │ - Chronological Events │  │ - Priority Triage      │  │ - Zone Alert  │  │
│  └───────────┬────────────┘  └───────────┬────────────┘  └───────┬───────┘  │
└──────────────┼───────────────────────────┼───────────────────────┼──────────┘
               │                           │                       │
               ▼                           ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATABASE LAYER                                  │
│                   SQLite (backend/data/trailsafe.db)                        │
│                                                                             │
│  • `incidents`: Persisted records, status, severity, coordinates, notes     │
│  • `responders`: 5 persistent patrol units with status and current incident │
│  • `geofences`: Defined Safe, Caution, and Restricted perimeter polygons   │
│  • `incident_events`: Immutable chronological audit logs for each incident  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite | Fast, responsive UI with strict type validation |
| **Mapping Engine** | Leaflet 1.9, OpenStreetMap | Open-source geospatial canvas; **Zero API keys required** |
| **Styling & Theming** | Custom CSS3 with CSS Variables | Cyber-navy dark theme with responsive mobile/desktop layouts |
| **Internationalization**| Custom React Context (`i18n`) | Full runtime toggle between English (`en`) and Hindi (`हिन्दी`) |
| **Offline Resilience** | Browser `localStorage` + Network Events | Automatic offline queuing and background auto-sync |
| **Backend API** | FastAPI, Uvicorn, Python 3.12 | Asynchronous high-performance REST endpoints |
| **Validation Schemas** | Pydantic v2 | Strict request payload and response contract validation |
| **Database** | SQLite 3 (`trailsafe.db`) | Transactional storage preserving all incidents, units, and audit logs |

---

## ⚡ Core Features

### 1. Tourist Safety Companion (`/#tourist`)
- **Simulated Traveler Profile**: Identity `TS-DEMO-001` (Aarav Sharma), destination, and live trip status.
- **Trip Lifecycle Controls**: Interactive Start / Conclude Trip timers with active duration telemetry.
- **Dual Geolocation Modes**: Real browser GPS via the HTML5 Geolocation API with graceful fallback to simulated waypoints along the Lucknow Heritage Corridor.
- **Hazard Perimeter Detection**: Live evaluation against safe corridors, caution buffers, and restricted hazard zones with transition deduplication (no repeated alert spam).
- **Single-Click Emergency SOS**: Instant distress triggering with duplicate prevention and offline fallback.

### 2. Authority Control Room Dashboard (`/#authority`)
- **Live Database-Backed Metrics**: Total, Open, Critical, Assigned, and Resolved incident counters calculated live from SQLite.
- **Real-Time Interactive Map**: OpenStreetMap tiles rendering severity-coded pins, pulse beacons for critical emergencies, patrol unit stations, and geofence perimeter rings.
- **Stored GPS vs. Demo Anchors**: Visual badges distinguish hardware GPS (`⚡ GPS`) from synthetic fallback anchors (`~ Demo`).
- **Comprehensive Search & Multi-Level Filters**: Search by ID, tourist, description, or assigned unit; filter by status (`OPEN`, `ASSIGNED`, `CLOSED`), severity, and type.
- **Sortable Columns**: Dynamic table sorting by timestamp, risk score, severity, and status.
- **Chronological Audit Timeline**: Modal inspection displays immutable audit logs (`CREATED`, `ASSIGNED`, `NOTE_ADDED`, `CLOSED`).
- **Simulated Responder Dispatch & Fleet Management**: 5 persistent patrol units (`RESP-001` to `RESP-005`). Dispatching an incident updates the unit's status to `ASSIGNED`; reassigning frees the prior unit; resolving the incident releases the unit back to `AVAILABLE`.
- **Operational Analytics Modal**: Live charts showing incident lifecycle breakdown, severity distribution, category counts, and fleet utilization.

### 3. Explainable Risk Scoring Engine
- Deterministic, rule-based mathematical scoring model (0–100 scale):
  - `0–39`: LOW
  - `40–69`: MEDIUM
  - `70–89`: HIGH
  - `90–100`: CRITICAL
- Transparent contributing factor breakdown (e.g., life-safety SOS override, restricted perimeter breach, unmonitored canal hazard, offline delay).

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Node.js 18+ and `npm`
- Python 3.10+

### 1. Run Backend Server (FastAPI)
```powershell
# Open terminal in project root
& "C:\Users\Taran\AppData\Local\Python\bin\python.exe" -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```
- API Health Check: `http://localhost:8000/api/health`
- Interactive Swagger Docs: `http://localhost:8000/docs`

### 2. Run Frontend Server (React + Vite)
```powershell
# Open terminal in project root
npm run dev -- --host 127.0.0.1 --port 5173
```
- Frontend Application: `http://localhost:5173/`
- Authority Control Room: `http://localhost:5173/#authority`
- Tourist Safety App: `http://localhost:5173/#tourist`

### 3. Production Deployment
For complete step-by-step instructions on deploying the frontend to **Vercel** and backend to **Render** with persistent SQLite disk storage and secure CORS, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🧪 Testing & Verification

### Run Backend Feature Test Suite
```powershell
& "C:\Users\Taran\AppData\Local\Python\bin\python.exe" backend/test_features_api.py
```
*Result: 8/8 tests pass (Health, SQLite records preservation, responders, geofencing, analytics, risk engine, audit events, SOS duplicate lifecycle).*

### Run Full End-to-End Lifecycle Verification
```powershell
& "C:\Users\Taran\AppData\Local\Python\bin\python.exe" C:/Users/Taran/.gemini/antigravity/brain/f3f45b77-a969-4bd7-9088-21d122d09d80/scratch/test_e2e_full_lifecycle.py
```
*Result: 10/10 checks pass (Creation, Duplicate prevention while OPEN, Assignment, Duplicate prevention while ASSIGNED, Reassignment with unit auto-release, Working notes, Closure, Unit release, Subsequent SOS fresh ID creation, Record integrity).*

### Run Frontend Production Build & Linter
```powershell
npm run build
npm run lint
```
*Result: 0 build errors, 0 linter errors.*

---

## 📡 API Reference Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check returning service status (`{"status":"ok"}`) |
| `GET` | `/api/incidents` | List incidents with optional status, severity, type, and sort filters |
| `POST` | `/api/incidents` | Create an incident (enforces duplicate SOS prevention for active incidents) |
| `GET` | `/api/incidents/{id}` | Retrieve incident details by ID |
| `PATCH` | `/api/incidents/{id}/assign` | Assign/reassign a simulated responder unit to an incident |
| `PATCH` | `/api/incidents/{id}/close` | Close an incident with validated reason, debrief notes, and unit release |
| `POST` | `/api/incidents/{id}/notes` | Append an operator note and log an audit event |
| `GET` | `/api/incidents/{id}/events` | Fetch chronological audit timeline events for an incident |
| `GET` | `/api/responders` | List all 5 simulated responder patrol units |
| `PATCH` | `/api/responders/{id}` | Update responder availability status or assignment |
| `GET` | `/api/geofences` | List all active monitored geofence boundaries |
| `POST` | `/api/geofences/check` | Test coordinates against geofence perimeters |
| `GET` | `/api/analytics` | Retrieve live operational telemetry and aggregate incident analytics |
| `POST` | `/api/risk/evaluate` | Evaluate deterministic risk score and factor breakdown |

---

## 🎬 3-Minute Hackathon Demo Script

| Time | Presenter Action | Visual Focus | Spoken Commentary |
|---|---|---|---|
| **0:00 – 0:40** | Open `http://localhost:5173/` <br> Click **"Tourist App Demo"** (`#tourist`) | Landing page hero into Tourist Safety Companion. | *"Welcome to TrailSafe. We solve tourist safety in heritage and eco-tourism corridors. Here is traveler Aarav Sharma on the Lucknow Heritage Trail. When he starts his trip, telemetry activates. When he moves near hazard perimeters, the geofencing engine alerts him with zero alert spam."* |
| **0:40 – 1:20** | Click **"EMERGENCY SOS"** <br> Confirm modal. <br> Show returned incident ID. <br> Click SOS again. | Distress beacon active banner; duplicate prevention card. | *"Now imagine an emergency. Aarav taps Emergency SOS. Confirming creates a verified incident in our SQLite backend with risk score 100/100. If he accidentally presses it again, our backend idempotency prevents duplicate spam, returning the active incident."* |
| **1:20 – 2:15** | Open `http://localhost:5173/#authority` in another tab or click Switch to Authority. <br> Point out the radar pulse pin on the Leaflet map. | Authority Control Room, Leaflet map with OpenStreetMap tiles, 5 simulated responders. | *"Switching to the Authority Control Room: operators immediately see the emergency pulsing on the OpenStreetMap map—requiring zero paid API keys. Notice all 5 simulated responder units stationed across sectors. Let's click the incident pin to inspect the deterministic risk audit breakdown."* |
| **2:15 – 2:45** | Click **"Inspect Details ↗"** <br> Assign **Unit 1 (Hazratganj Patrol)**. <br> Reassign to **Unit 2 (Heritage Ranger)**. <br> Add operator working note. | Incident Detail Modal, Chronological Audit Timeline, Unit status sync. | *"We dispatch Unit 1. The unit immediately updates to ASSIGNED on the map. If conditions require specialized backup, we reassign to Unit 2: Unit 1 is automatically freed back to AVAILABLE, and Unit 2 is dispatched. Every single step is logged in our immutable audit timeline."* |
| **2:45 – 3:00** | Select closure reason *"Resolved / Verified Safe"*, click **Resolve**. <br> Toggle **🌐 हिन्दी / English**. <br> Open **Analytics Modal**. | Closed badge, released responder, full bilingual UI, analytics telemetry. | *"Once the tourist is safe, we resolve the incident. The responder is returned to standby, metrics update live, and the entire platform seamlessly operates bilingually in English and Hindi. TrailSafe delivers transparent, resilient, community-first tourist safety."* |

---

## ⚠️ System Limitations
1. **Simulation Scope**: All responders, dispatch actions, radio channels, and sirens are synthetically simulated. No connections to emergency services (112 / Police / EMS) exist.
2. **Synthetic Telemetry Fallback**: If browser geolocation permission is denied or running on desktop devices without a hardware GPS sensor, the app falls back to predefined Lucknow corridor waypoints, visibly tagged with `~ Demo Anchor`.
3. **Client-Side Polling**: Authority telemetry updates via periodic 8-second polling and manual refresh rather than a WebSocket broker.

---

## 🔮 Future Scope
1. **IoT Smart Wristbands & Beacons**: Direct integration with wearable Bluetooth LE panic buttons and trail checkpoint gateways.
2. **LoRaWAN / Satellite Relays**: Long-range low-power mesh networking allowing distress transmission in remote canyons and national parks completely devoid of cellular service.
3. **WebSockets & Push Notifications**: Real-time push stream for sub-second incident distribution to field tablets.
4. **Municipal CAD / Smart City Integration**: Interoperability with official 112 emergency Computer-Aided Dispatch (CAD) systems.
