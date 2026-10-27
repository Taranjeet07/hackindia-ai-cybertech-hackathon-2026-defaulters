# TrailSafe 🛡️

**TrailSafe** is a smart tourist safety monitoring and authority incident response system designed for heritage trails, cultural circuits, and eco-tourism corridors.

The platform provides a dual interface: a **Tourist Safety Companion** for route guidance, geofence hazard alerts, and emergency SOS distress signaling; and an **Authority Control Room** for real-time geospatial incident tracking, rule-based risk audits, simulated responder dispatch, and operational analytics.

> **Disclaimer**: TrailSafe is a prototype simulation platform. All responder units, dispatch workflows, and radio channels are synthetically simulated. The system **does not** contact actual emergency services (112, Police, or EMS).

---

## ⚡ Core Features

- **Tourist SOS Reporting**: Instant emergency distress trigger with server-side duplicate prevention for active incidents.
- **Geolocation & Fallback**: Browser-based HTML5 geolocation with graceful fallback to simulated waypoints along defined corridors.
- **Geofence Hazard Awareness**: Real-time evaluation against safe zones, caution buffers, and restricted perimeters with alert deduplication.
- **Server-Side Risk Scoring**: Deterministic, explainable mathematical risk assessment (0–100 scale) based on incident type, proximity to hazards, and time context.
- **Authority Incident Dashboard & Map**: Live interactive map powered by Leaflet and OpenStreetMap displaying active emergencies, geofences, and patrol unit markers.
- **Simulated Responder Assignment**: Complete incident lifecycle management (`OPEN` → `ASSIGNED` → `CLOSED`) with automatic responder allocation, reassignment, and release.
- **Bilingual Interface**: Full runtime language switching between English and Hindi (`हिन्दी`).
- **Offline Transmission Queuing**: Browser `localStorage`-backed incident queue with automatic background synchronization upon network reconnection.

---

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend API**: FastAPI, Python 3.12+, Pydantic v2
- **Database**: SQLite 3 (WAL mode, foreign key enforcement)
- **Mapping**: Leaflet 1.9, OpenStreetMap (no paid API keys required)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and `npm`
- Python 3.10+

### 1. Start Backend API
```bash
# In project root
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

### 2. Start Frontend Application
In a separate terminal:
```bash
# In project root
npm install
npm run dev
```

---

## 🔗 Useful Local URLs

| Application / Service | URL |
|---|---|
| **Overview Landing Page** | [http://localhost:5173/](http://localhost:5173/) |
| **Tourist Safety Companion** | [http://localhost:5173/#tourist](http://localhost:5173/#tourist) |
| **Authority Control Room** | [http://localhost:5173/#authority](http://localhost:5173/#authority) |
| **API Health Check** | [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) |
| **Interactive API Documentation** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |

---

## 📡 API Overview

The FastAPI backend exposes the following major resource groups:

- **`/api/health`**: Service health and readiness verification.
- **`/api/incidents`**: Incident creation, listing, detail retrieval, responder assignment, closure, and chronological audit timelines.
- **`/api/responders`**: Simulated patrol unit roster, availability statuses, and dispatch assignments.
- **`/api/geofences`**: Defined perimeter polygons and point-in-polygon coordinate hazard checking.
- **`/api/risk/evaluate`**: Deterministic risk calculation and explainable factor breakdown.
- **`/api/analytics`**: Aggregated incident telemetry, severity breakdowns, and unit utilization metrics.

---

## ⚠️ System Limitations

- **Simulated Units**: Responder units, coordinates, and dispatch actions are synthetic simulations.
- **Geolocation Fallback**: Devices without GPS sensor hardware or location permissions default to predefined demonstration waypoints.
- **Polling Updates**: Control room metrics and map pins refresh via periodic client-side polling rather than push WebSockets.

---

## 🔮 Future Scope

- **IoT Wearable Integration**: Panic button triggers via Bluetooth Low Energy (BLE) wristbands.
- **LoRaWAN / Satellite Relays**: Distress beacon transmission in remote trail dead-zones lacking cellular networks.
- **WebSocket Streaming**: Sub-second push delivery of telemetry and incident dispatches to field personnel.
