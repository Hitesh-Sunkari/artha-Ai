# ============================================================================
# ArthaAI Unified Production Container
# Compatible with: Hugging Face Spaces (Port 7860), Render, OCI VM, GCP VM
# ============================================================================

# ── Stage 1: Build Main React Frontend ─────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --prefer-offline --no-audit
COPY frontend/ ./
ENV NODE_ENV=production
RUN npm run build

# ── Stage 2: Build Admin Portal Frontend ───────────────────────────────────
FROM node:22-alpine AS admin-builder
WORKDIR /build/admin-frontend
COPY admin-frontend/package.json admin-frontend/package-lock.json* ./
RUN npm ci --prefer-offline --no-audit
COPY admin-frontend/ ./
ENV NODE_ENV=production
RUN npm run build

# ── Stage 3: Production Python Runtime ──────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app/src" \
    ARTHAAI_DATA_DIR="/app/data" \
    ARTHAAI_ENVIRONMENT="production" \
    ARTHAAI_LIVE_TRADING_ENABLED="false" \
    PORT=7860

WORKDIR /app

# Install system dependencies for health checks and network
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged user (UID 1000 is required by Hugging Face Spaces)
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser

# Install Python packages
COPY pyproject.toml /app/
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir \
    "fastapi>=0.112.0" \
    "uvicorn[standard]>=0.30.0" \
    "pydantic>=2.12.0" \
    "pydantic-settings>=2.2.0" \
    "duckdb>=1.0.0" \
    "pyarrow>=16.0.0" \
    "chromadb>=0.5.0" \
    "mcp>=1.2.0" \
    "a2a-sdk>=0.3.4" \
    "google-adk>=2.13.0" \
    "crewai>=1.15.0" \
    "httpx>=0.27.0" \
    "numpy>=1.26.0" \
    "pandas>=2.2.0" \
    "scipy>=1.13.0" \
    "yfinance>=0.2.40" \
    "python-dotenv>=1.0.0"

# Copy source code and install
COPY src/ /app/src/
RUN pip install --no-cache-dir -e /app

# Copy datasets and configurations
COPY data/ /app/data/
COPY configs/ /app/configs/

# Copy compiled frontend SPAs from build stages
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist
COPY --from=admin-builder /build/admin-frontend/dist /app/admin-frontend/dist

# Ensure state directories exist and assign permissions to unprivileged user
RUN mkdir -p /app/data/runs /app/data/blackboard /app/data/quality /app/data/quarantine && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 7860 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT}/health || exit 1

# Start uvicorn on the container port ($PORT defaults to 7860, or 8000 if configured)
CMD ["sh", "-c", "python -m uvicorn arthaai.api.research_api:app --host 0.0.0.0 --port ${PORT} --workers 1 --limit-concurrency 10"]

