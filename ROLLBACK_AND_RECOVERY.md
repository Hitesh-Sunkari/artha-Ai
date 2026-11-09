# ArthaAI Rollback, Disaster Recovery & High Availability Runbook
**Version:** 1.0.0-PROD  
**Classification:** Site Reliability Engineering (SRE) Manual  

---

## 1. Rollback Procedures

### 1.1 Hugging Face Spaces Rollback
Hugging Face Spaces are versioned directly in Git:
```bash
# View deployment commit history
git log --oneline -n 5

# Revert to the previous working commit
git revert HEAD --no-edit

# Force-deploy the previous commit immediately
git push origin main
```
*Recovery Time Objective (RTO):* **< 2 minutes**.

### 1.2 Docker Compose Rollback (Oracle Cloud / GCP)
```bash
# 1. Stop current containers
docker compose down

# 2. Revert Git working tree to previous release tag
git checkout tags/v1.0.0-STABLE

# 3. Rebuild and launch previous release
docker compose up -d --build
```
*RTO:* **< 3 minutes**.

---

## 2. Disaster Recovery Scenarios & Procedures

### Scenario 1: ChromaDB Vector Store Corruption
If the ChromaDB collection becomes corrupted or unreadable due to sudden power loss or process termination:
```bash
# 1. Clear corrupted vector database directory
rm -rf data/chroma_db/*

# 2. Trigger automatic zero-download re-ingestion
python -c "
from arthaai.rag.chroma_store import get_chroma_rag_store
store = get_chroma_rag_store()
print('Re-ingested documents count:', store.collection.count())
"
```
*Result:* The `ensure_corpus_ingested()` method automatically re-embeds all regulatory statutes, SEBI LODR rules, and earnings filings in **< 1.5 seconds** using the deterministic lexical embedding engine.

### Scenario 2: Parquet Data Corruption or Missing Historical Bars
If any Parquet partition is damaged:
```bash
# Verify integrity of Parquet files
python -c "
import glob, pyarrow.parquet as pq
for f in glob.glob('data/parquet/**/*.parquet', recursive=True):
    try:
        pq.read_schema(f)
    except Exception as e:
        print('CORRUPTED FILE:', f, e)
"
```
To re-fetch clean historical bars from the resilient pipeline:
```bash
python -c "
from arthaai.data.yfinance_pipeline import get_yfinance_pipeline
pipe = get_yfinance_pipeline()
pipe.fetch_market_data('RELIANCE', period='2y', force_refresh=True)
print('Successfully refreshed market cache.')
"
```

### Scenario 3: External LLM Rate Limit or API Outage
If Google Gemini API responds with `429 Too Many Requests`:
1. The `llm_adapter.py` module automatically falls back to OpenAI (`gpt-4o-mini`) if `OPENAI_API_KEY` is configured.
2. If both providers are unreachable, the system executes deterministic fallback synthesis grounded strictly in FastMCP quantitative calculations and statutory tax tables, ensuring that research reports are never blocked.

### Scenario 4: Out-Of-Memory (OOM) Termination on 512 MB Hosts
If a low-resource host triggers an OOM kill:
1. Ensure the 256 MB DuckDB memory limit is active:
   `PRAGMA max_memory='256MB'`
2. Ensure uvicorn concurrency limit is set:
   `--workers 1 --limit-concurrency 10`
3. On Linux VMs, verify the swap file is enabled:
   `sudo swapon -s`

---

## 3. Data Retention & Periodic Backup Schedule

| Data Category | Retention Policy | Backup Frequency | Backup Destination |
|---|---|---|---|
| **Research Runs (`data/runs/`)** | 90 days rolling | Daily at 00:00 UTC | Local / Compressed tarball |
| **Blackboard Snapshots (`data/blackboard/`)** | 30 days rolling | Daily at 00:00 UTC | Local / Compressed tarball |
| **Statutory ChromaDB Vector Corpus** | Permanent | On source update | Baked into Git / Docker image |
| **Parquet Market Tables** | 5 years point-in-time | Weekly sync | Baked into Git / Docker image |

