# ArthaAI Production Docker Deployment & DevOps Operations Runbook
**Version:** 2.0.0-PROD  
**Classification:** DevOps Engineering & Institutional Deployment Architecture  
**Author:** ArthaAI DevOps & Quantitative Systems Engineering Team  

---

## 1. Executive Architectural Research & Recommendation

### Is it Recommended to Dockerize ArthaAI?
**Yes, strongly recommended.**

ArthaAI is a heterogeneous, multi-tiered algorithmic research framework consisting of:
1. **Python 3.11/3.12 Backend**: FastAPI, DuckDB (with SIMD columnar vectorized execution), ChromaDB (C++ SQLite and hnswlib bindings), Google ADK, CrewAI, FastMCP, and A2A JSON-RPC 2.0.
2. **User Web Platform**: React 19, TypeScript, Vite, Chart.js, Lucide Icons.
3. **Institutional Admin Portal**: Consolidated 3-Console experimental evaluator, real-time network traffic surveillance, user session tracking, and portfolio risk telemetry.
4. **Persistent Analytical State**: 5-year OHLCV Parquet files, ChromaDB regulatory vector embeddings, multi-agent blackboard deliberation states, user paper-trading portfolios, and the canonical 96-experiment evaluation dataset.

#### Why Dockerization is Essential (Bare Metal vs Containerized):
| Risk Vector | Bare Metal / Direct Node & Python | Containerized (Docker Compose) |
|---|---|---|
| **C++ / SQLite Dependencies** | ChromaDB and DuckDB require exact OS-level C++ compilers (`libsqlite3`, `build-essential`). Different Linux distros or Windows versions break bindings. | **Standardized**: Packaged inside `python:3.12-slim` with validated native C++ dependencies. |
| **Data Loss on Deployment** | Overwriting files or upgrading servers can accidentally erase historical runs, vector embeddings, or portfolios. | **Zero Data Loss**: State is decoupled into 6 dedicated persistent named Docker volumes that survive rebuilds. |
| **Microservice Isolation** | Frontend node processes, Vite dev servers, and Python FastAPI fight over ports and system resources. | **Isolated**: Clean container boundaries with bridge network DNS resolution (`http://backend:8000`). |
| **Memory Leak / OOM Risk** | A single greedy LLM response or large Monte Carlo SIMD simulation can crash the entire host machine. | **Enforced Resource Caps**: Hard cgroup limits (e.g. 1024 MB RAM for backend, 256 MB for frontends). |
| **Port & Routing Collisions** | Port forwarding conflicts across developer machines and cloud hosts. | **Deterministic Mapping**: Customizable port bindings via `.env` (`BACKEND_PORT`, `USER_PORT`, `ADMIN_PORT`). |

---

## 2. Multi-Container Production Topology (Docker Compose)

The primary production architecture runs 3 decoupled services over an isolated bridge network (`arthaai-network`):

```
                        ┌──────────────────────────────────────────────┐
                        │              Host Machine / VPS              │
                        └───────┬──────────────────────────────┬───────┘
                                │                              │
                        Port 5173                              Port 5174
                                ▼                              ▼
                 ┌─────────────────────────────┐┌─────────────────────────────┐
                 │    arthaai-user-frontend    ││   arthaai-admin-frontend    │
                 │   (Nginx Alpine Container)  ││  (Nginx Alpine Container)   │
                 └──────────────┬──────────────┘└──────────────┬──────────────┘
                                │                              │
                                └───► Reverse Proxy API Calls ─┘
                                     (/health, /research, /admin, etc.)
                                                │
                                                ▼ Port 8000
                                 ┌─────────────────────────────┐
                                 │       arthaai-backend       │
                                 │ (FastAPI + DuckDB + CrewAI) │
                                 └──────────────┬──────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
         ┌──────────────────────────────┐                ┌──────────────────────────────┐
         │      Persistent Volumes      │                │   Statutory Data Bank & RAG  │
         │  • arthai-runs               │                │  • arthai-parquet            │
         │  • arthai-blackboard         │                │  • arthai-chroma             │
         │  • arthai-experiments-res    │                │  • arthai-experiments-data   │
         └──────────────────────────────┘                └──────────────────────────────┘
```

---

## 3. Persistent Volume Blueprint: Zero Data Loss Guarantee

To ensure that **nothing is ever lost** after deployment, 6 dedicated Docker named volumes isolate all stateful data away from the disposable application containers:

| Named Volume | In-Container Mount Path | Contents & Criticality | Loss Consequence if Unmounted |
|---|---|---|---|
| `arthai-runs` | `/app/data/runs` | User-initiated research reports, execution traces, and query outputs | Historical user inquiries lost on container restart |
| `arthai-blackboard` | `/app/data/blackboard` | 7-agent sequential/parallel deliberation snapshots | Multi-agent handoff audit trail lost |
| `arthai-chroma` | `/app/data/chroma_db` | Persistent ChromaDB vector embeddings for RBI circulars & SEBI LODR | Expensive re-embedding needed from raw PDFs |
| `arthai-parquet` | `/app/data/parquet` | 5-year daily OHLCV bars, financial filings, and macro tables | DuckDB falls back to slow live yfinance queries |
| `arthai-experiments-results` | `/app/experiments/results` | Canonical 96-run paired evaluation results (`exp-canon-*.json`) | Scientific benchmark verification metrics lost |
| `arthai-experiments-datasets` | `/app/experiments/datasets` | Canonical benchmark scenarios (`Q01`–`Q06`, `S01`–`S06`) | Scenario definitions reset to default |

---

## 4. Quick-Start Deployment Commands

### Step 1: Configure Environment Variables
Copy `.env.example` to `.env` and provide your Gemini API key:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```ini
GEMINI_API_KEY=your_actual_gemini_key_here
ARTHAAI_ENVIRONMENT=production
ARTHAAI_LIVE_TRADING_ENABLED=false
```

### Step 2: Build & Start the Multi-Container Stack
```bash
# Build all 3 images with BuildKit parallel caching and start in background
docker compose up -d --build
```

### Step 3: Verify Container Health
```bash
docker compose ps
```
All three containers should transition to `(healthy)`:
- `arthaai-backend`: `http://127.0.0.1:8000`
- `arthaai-user-frontend`: `http://127.0.0.1:5173`
- `arthaai-admin-frontend`: `http://127.0.0.1:5174`

---

## 5. Automated Disaster Recovery & Volume Backup

### 5.1 One-Click Backup of All 6 Named Volumes
To create a complete snapshot of all research runs, vector embeddings, and benchmark evaluations:

**On Linux / macOS:**
```bash
chmod +x scripts/backup_docker_volumes.sh
./scripts/backup_docker_volumes.sh ./backups
```

**On Windows (PowerShell):**
```powershell
.\scripts\backup_docker_volumes.ps1 -BackupDir .\backups
```
This produces a single compressed archive (e.g., `backups/arthaai_volumes_backup_20261109_183000.tar.gz`).

### 5.2 One-Click Restore of All Volumes
If migrating to a brand-new cloud VPS or recovering from an outage:

**On Linux / macOS:**
```bash
chmod +x scripts/restore_docker_volumes.sh
./scripts/restore_docker_volumes.sh ./backups/arthaai_volumes_backup_20261109_183000.tar.gz
docker compose up -d
```

**On Windows (PowerShell):**
```powershell
.\scripts\restore_docker_volumes.ps1 -BackupFile .\backups\arthaai_volumes_backup_20261109_183000.tar.gz
docker compose up -d
```
All 6 volumes will be restored instantly with exact permissions, and the system resumes without missing a single byte.

---

## 6. Single-Container Deployment (Hugging Face Spaces / Render / PaaS)

If deploying to environments that only permit a single container or single exposed port (such as Hugging Face Spaces on Port 7860 or Render Web Service):

The root `Dockerfile` contains a unified multi-stage build that:
1. Builds the User React SPA (`frontend/dist`).
2. Builds the Admin React SPA (`admin-frontend/dist`).
3. Installs Python dependencies and mounts both SPAs inside the FastAPI backend.
4. Serves:
   - User SPA at `http://host:7860/`
   - Admin Portal at `http://host:7860/admin`
   - Backend API at `http://host:7860/health`, `/research`, `/admin/benchmark/*`

```bash
# Build unified container
docker build -t arthaai-unified:latest .

# Run on port 7860
docker run -d \
  -p 7860:7860 \
  -e GEMINI_API_KEY="your-key-here" \
  -e PORT=7860 \
  -v arthai-runs:/app/data/runs \
  -v arthai-parquet:/app/data/parquet \
  -v arthai-experiments-results:/app/experiments/results \
  --name arthaai-unified \
  arthaai-unified:latest
```

---

## 7. Cloud Provider Deployment Matrix

| Platform | Recommended Mode | Configuration Notes |
|---|---|---|
| **AWS EC2 / DigitalOcean Droplet / Hetzner** | Docker Compose | Run `docker compose up -d`. Map ports 80/443 with Nginx or Caddy for automatic Let's Encrypt SSL. |
| **Google Cloud Run** | Unified Dockerfile | Deploy as single container. Set `PORT=8080` and allocate 2 GB RAM. Mount Cloud Storage FUSE for persistence. |
| **Hugging Face Spaces** | Unified Dockerfile | Use `Dockerfile` directly with default port `7860` and unprivileged UID `1000`. |
| **Render.com** | Docker Compose or Web Service | Use Docker runtime with disk mount attached at `/app/data`. |
| **Oracle Cloud Free Tier VM** | Docker Compose | Fits within the 1 GB RAM / 4 OCPU ARM Ampere free tier using configured resource caps. |
