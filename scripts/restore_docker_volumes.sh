#!/usr/bin/env bash
# ============================================================================
# ArthaAI — Complete Docker Persistent Volumes Restore Utility
# Restores all 6 named volumes from a timestamped backup tarball.
# ============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_tarball.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' not found!"
    exit 1
fi

echo "=========================================================="
echo " Restoring ArthaAI Persistent Volumes from:"
echo " ${BACKUP_FILE}"
echo "=========================================================="

# Ensure volumes exist
docker volume create arthai-runs >/dev/null
docker volume create arthai-blackboard >/dev/null
docker volume create arthai-chroma >/dev/null
docker volume create arthai-parquet >/dev/null
docker volume create arthai-experiments-results >/dev/null
docker volume create arthai-experiments-datasets >/dev/null

BACKUP_DIR=$(dirname "$(realpath "${BACKUP_FILE}")")
ARCHIVE_NAME=$(basename "${BACKUP_FILE}")

docker run --rm \
  -v arthai-runs:/dest/runs \
  -v arthai-blackboard:/dest/blackboard \
  -v arthai-chroma:/dest/chroma_db \
  -v arthai-parquet:/dest/parquet \
  -v arthai-experiments-results:/dest/experiments_results \
  -v arthai-experiments-datasets:/dest/experiments_datasets \
  -v "${BACKUP_DIR}:/backup" \
  alpine:latest \
  tar -xzf "/backup/${ARCHIVE_NAME}" -C /dest

echo "=========================================================="
echo " Restore Completed Successfully!"
echo " Volumes arthai-* are restored."
echo "=========================================================="
