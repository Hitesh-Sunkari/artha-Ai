# ============================================================================
# ArthaAI — Complete Docker Persistent Volumes Restore Utility (PowerShell)
# Restores all 6 named volumes from a timestamped backup tarball.
# ============================================================================

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

if (!(Test-Path -Path $BackupFile)) {
    Write-Error "Backup file '$BackupFile' does not exist."
    exit 1
}

$fullBackupPath = (Resolve-Path $BackupFile).Path
$backupDir = Split-Path $fullBackupPath -Parent
$archiveName = Split-Path $fullBackupPath -Leaf

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Restoring ArthaAI Persistent Volumes from:" -ForegroundColor Green
Write-Host " Archive: $fullBackupPath" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

docker volume create arthaai-data-runs | Out-Null
docker volume create arthaai-data-blackboard | Out-Null
docker volume create arthaai-data-chroma | Out-Null
docker volume create arthaai-data-parquet | Out-Null
docker volume create arthaai-experiments-results | Out-Null
docker volume create arthaai-experiments-datasets | Out-Null

docker run --rm `
  -v arthaai-data-runs:/dest/runs `
  -v arthaai-data-blackboard:/dest/blackboard `
  -v arthaai-data-chroma:/dest/chroma_db `
  -v arthaai-data-parquet:/dest/parquet `
  -v arthaai-experiments-results:/dest/experiments_results `
  -v arthaai-experiments-datasets:/dest/experiments_datasets `
  -v "${backupDir}:/backup" `
  alpine:latest `
  tar -xzf "/backup/${archiveName}" -C /dest

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Restore Completed Successfully!" -ForegroundColor Green
Write-Host " Volumes are restored and ready for 'docker compose up -d'" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
