# ============================================================================
# ArthaAI — Complete Docker Persistent Volumes Backup Utility (PowerShell)
# Archives all 6 named volumes to a single timestamped gzip tarball.
# ============================================================================

param (
    [string]$BackupDir = "./backups"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archiveName = "arthaai_volumes_backup_${timestamp}.tar.gz"
$targetDir = (Resolve-Path .).Path + "\backups"

if (!(Test-Path -Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting ArthaAI Persistent Volumes Backup..." -ForegroundColor Green
Write-Host " Target Directory: $targetDir" -ForegroundColor Yellow
Write-Host " Archive Name: $archiveName" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

docker run --rm `
  -v arthai-runs:/source/runs:ro `
  -v arthai-blackboard:/source/blackboard:ro `
  -v arthai-chroma:/source/chroma_db:ro `
  -v arthai-parquet:/source/parquet:ro `
  -v arthai-experiments-results:/source/experiments_results:ro `
  -v arthai-experiments-datasets:/source/experiments_datasets:ro `
  -v "${targetDir}:/backup" `
  alpine:latest `
  tar -czf "/backup/${archiveName}" -C /source .

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Backup Completed Successfully!" -ForegroundColor Green
Write-Host " Archive: $targetDir\$archiveName" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
