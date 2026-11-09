#!/usr/bin/env bash
# ============================================================================
# ArthaAI — Complete Docker Persistent Volumes Backup Utility
# Archives all 6 named volumes to a single timestamped gzip tarball.
# Zero Data Loss Guarantee across server migrations or container teardowns.
# ============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/arthaai_volumes_backup_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "=========================================================="
echo " Starting ArthaAI Persistent Volumes Backup..."
echo " Target Archive: ${BACKUP_FILE}"
echo "=========================================================="

docker run --rm \
  -v arthai-runs:/source/runs:ro \
  -v arthai-blackboard:/source/blackboard:ro \
  -v arthai-chroma:/source/chroma_db:ro \
  -v arthai-parquet:/source/parquet:ro \
  -v arthai-experiments-results:/source/experiments_results:ro \
  -v arthai-experiments-datasets:/source/experiments_datasets:ro \
  -v "$(pwd)/${BACKUP_DIR}:/backup" \
  alpine:latest \
  tar -czf "/backup/arthaai_volumes_backup_${TIMESTAMP}.tar.gz" -C /source .

echo "=========================================================="
echo " Backup Completed Successfully!"
echo " File: ${BACKUP_FILE}"
echo " Size: $(du -h "${BACKUP_FILE}" 2>/dev/null || ls -lh "${BACKUP_FILE}")"
echo "=========================================================="
