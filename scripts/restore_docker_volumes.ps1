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

docker volume create arthai-runs | Out-Null
docker volume create arthai-blackboard | Out-Null
docker volume create arthai-chroma | Out-Null
docker volume create arthai-parquet | Out-Null
docker volume create arthai-experiments-results | Out-Null
docker volume create arthai-experiments-datasets | Out-Null

docker run --rm `
  -v arthai-runs:/dest/runs `
  -v arthai-blackboard:/dest/blackboard `
  -v arthai-chroma:/dest/chroma_db `
  -v arthai-parquet:/dest/parquet `
  -v arthai-experiments-results:/dest/experiments_results `
  -v arthai-experiments-datasets:/dest/experiments_datasets `
  -v "${backupDir}:/backup" `
  alpine:latest `
  tar -xzf "/backup/${archiveName}" -C /dest

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Restore Completed Successfully!" -ForegroundColor Green
Write-Host " Volumes are restored and ready for 'docker compose up -d'" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
