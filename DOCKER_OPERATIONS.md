# ArthaAI Docker Operations & Container Runbook
**Version:** 1.0.0-PROD  
**Classification:** DevOps Operations Manual  

---

## 1. Quick Reference Commands

| Operation | Command |
|---|---|
| **Build & Start Compose Stack** | `docker compose up -d --build` |
| **Stop Stack (Preserve Volumes)** | `docker compose down` |
| **Stop Stack (Remove Volumes)** | `docker compose down -v` |
| **View Running Containers** | `docker compose ps` |
| **Stream Backend Logs** | `docker logs -f arthaai-backend` |
| **Stream Frontend / Nginx Logs** | `docker logs -f arthaai-frontend` |
| **Container Resource Stats (RAM/CPU)** | `docker stats --no-stream` |
| **Execute Shell in Backend** | `docker exec -it arthaai-backend /bin/bash` |
| **Execute Backend Health Check** | `docker exec arthaai-backend curl -f http://127.0.0.1:8000/health` |
| **Clean Build Cache** | `docker system prune -f` |

---

## 2. Image Building Procedures

### 2.1 Multi-Container Stack (Compose)
```bash
# Build both frontend (Nginx) and backend images with buildkit caching
DOCKER_BUILDKIT=1 docker compose build

# Start services in detached mode
docker compose up -d
```

### 2.2 Unified Single-Host Container (Hugging Face / Render / Single VM)
```bash
# Build the unified single container containing frontend, admin, and backend
DOCKER_BUILDKIT=1 docker build -t arthai-unified:latest .

# Run locally on port 7860
docker run -d \
  --name arthai-app \
  -p 7860:7860 \
  -e GEMINI_API_KEY="your-key-here" \
  -e ARTHAAI_ENVIRONMENT=production \
  arthai-unified:latest
```

---

## 3. Persistent Volume Management

ArthaAI uses 4 dedicated named volumes to ensure that research history, ChromaDB vector collections, and DuckDB Parquet data survive container rebuilds:

| Volume Name | Container Path | Stored Data |
|---|---|---|
| `arthai-runs` | `/app/data/runs` | In-memory research report JSON records and execution traces |
| `arthai-blackboard` | `/app/data/blackboard` | Versioned blackboard state snapshots across agent deliberations |
| `arthai-chroma` | `/app/data/chroma_db` | Persistent ChromaDB collection files and lexical vector embeddings |
| `arthai-parquet` | `/app/data/parquet` | 5-year daily OHLCV bars, financial disclosures, and macro tables |

### Backing Up Volumes to Host
```bash
# Create a backup archive of ChromaDB and Parquet datasets
docker run --rm \
  -v arthai-chroma:/chroma \
  -v arthai-parquet:/parquet \
  -v $(pwd)/backups:/backup \
  busybox tar -czvf /backup/arthai_data_backup_$(date +%Y%m%d).tar.gz /chroma /parquet
```

### Restoring Volumes from Host Backup
```bash
docker run --rm \
  -v arthai-chroma:/chroma \
  -v arthai-parquet:/parquet \
  -v $(pwd)/backups:/backup \
  busybox tar -xzvf /backup/arthai_data_backup_20261109.tar.gz -C /
```

---

## 4. Resource Consumption & Limit Enforcement

To guarantee zero-cost stability on 1 GB RAM cloud VMs (e.g., Google Cloud `e2-micro` or Oracle Cloud):

```yaml
# Enforced in compose.yaml:
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 1024M
        reservations:
          cpus: '0.2'
          memory: 384M
  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 64M
```

### Live Resource Verification
Check actual memory usage across running containers:
```bash
docker stats
```
*Observed steady-state memory usage:*
- `arthaai-backend`: **~280 MB - 450 MB RAM**
- `arthaai-frontend` (Nginx): **~15 MB RAM**
- Total Stack Footprint: **< 500 MB RAM** (Fits within free 1 GB tier!)

---

## 5. Troubleshooting Common Container Issues

### Issue A: Container Exits Immediately with Error
```bash
# Inspect container exit logs
docker logs --tail 50 arthaai-backend
```
*Common root causes:*
- Missing `pyproject.toml` or missing dependencies.
- `ARTHAAI_LIVE_TRADING_ENABLED=true` (application asserts `false` at boot).

### Issue B: Port Already in Use on Host
```bash
# Check what process is listening on port 80
sudo lsof -i :80
# Or change host port in .env:
HOST_PORT=8080 docker compose up -d
```

### Issue C: DuckDB File Lock Conflict
If multiple processes attempt to write to the same DuckDB path, DuckDB throws a lock exception. ArthaAI uses `:memory:` database with read-only Parquet views (`read_parquet`), completely eliminating DuckDB lock contentions in container environments.

