# TrailSafe Backend

FastAPI backend foundation for **TrailSafe — AI-Powered Smart Tourist Safety Monitoring & Incident Response System**.

---

## Project Structure

```text
backend/
  app/
    __init__.py
    database.py
    main.py
    models.py
  data/
    trailsafe.db
  requirements.txt
  test_incidents_api.py
  verify_db.py
  README.md
```

---

## Incident API Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check | `200 OK` |
| `POST` | `/api/incidents` | Create a new incident | `201 Created` |
| `GET` | `/api/incidents` | List all incidents (newest first) | `200 OK` |
| `GET` | `/api/incidents/{incident_id}` | Retrieve incident details by ID | `200 OK` / `404 Not Found` |

### Automated Incident API Tests

Run the complete test suite against the running server:

```powershell
python test_incidents_api.py
```

---

## SQLite Database

The database is built using Python's standard library `sqlite3` (no additional external dependencies required) and is located at `backend/data/trailsafe.db`.

### `incidents` Table Schema

| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique incident identifier |
| `tourist_id` | `TEXT` | `NOT NULL` | Synthetic tourist identifier |
| `incident_type` | `TEXT` | `NOT NULL` | One of `'SOS'`, `'RISKY_ZONE'`, `'ROUTE_DEVIATION'`, `'INACTIVITY'` |
| `severity` | `TEXT` | `NOT NULL` | One of `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'CRITICAL'` |
| `risk_score` | `INTEGER` | `NOT NULL` | Value between 0 and 100 inclusive |
| `description` | `TEXT` | `NOT NULL` | Detailed incident explanation |
| `status` | `TEXT` | `NOT NULL` | One of `'OPEN'`, `'ASSIGNED'`, `'CLOSED'` (defaults to `'OPEN'`) |
| `assigned_responder` | `TEXT` | `NULL` | Optional simulated responder name |
| `created_at` | `TEXT` | `NOT NULL` | ISO 8601 timestamp string |
| `updated_at` | `TEXT` | `NOT NULL` | ISO 8601 timestamp string |

The database initializes automatically when the FastAPI application starts up via its lifespan handler.

### Verifying the Database

Run the standalone verification script to test database initialization, schema validation, and read/write operations:

```powershell
python verify_db.py
```

---

## Setup & Run Instructions (Windows PowerShell)

### 1. Open PowerShell in the `backend` directory

```powershell
cd c:\Users\Taran\OneDrive\Desktop\TrailSafe\backend
```

### 2. Create a Virtual Environment

Using Python Launcher (`py`):

```powershell
py -m venv .venv
```

*(Or `python -m venv .venv` if `python` is aliased directly in your PATH)*

### 3. Activate the Virtual Environment

```powershell
.venv\Scripts\Activate.ps1
```

> **Note on PowerShell Execution Policy**: If script execution is restricted on your machine, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` before activating.

### 4. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 5. Start the Development Server

```powershell
uvicorn app.main:app --reload --port 8000
```

The server will start at:
- **API Base URL**: [http://localhost:8000](http://localhost:8000)
- **Interactive OpenAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Verifying the Health Endpoint

### In a Web Browser

Open the following link in your browser:
[http://localhost:8000/api/health](http://localhost:8000/api/health)

### Using PowerShell

In a new PowerShell tab:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/health" -Method Get
```

### Expected Response

```json
{
  "status": "ok",
  "project": "TrailSafe"
}
```

---

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured strictly for the local Vite frontend development origins:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
