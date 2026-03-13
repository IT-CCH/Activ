<#
Simple PowerShell helper to apply a single SQL migration file using `psql`.

Usage:
  # set connection string (libpq format) in env var PGCONN or DATABASE_URL
  $env:PGCONN = 'postgresql://user:password@db.host:5432/dbname'
  .\apply_migration.ps1 -File "20260223_add_activities_image_url.sql"

Notes:
 - Requires `psql` (PostgreSQL client) on PATH.
 - On Supabase, you can get a connection string from the project settings (Database > Connection string).
 - Alternatively paste the SQL into the Supabase SQL editor.
#>

[param(
  [string]$File = "20260223_add_activities_image_url.sql"
)]

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$migrationPath = Join-Path $scriptDir $File

if (-not (Test-Path $migrationPath)) {
  Write-Error "Migration file not found: $migrationPath"
  exit 1
}

$pgconn = $env:PGCONN
if (-not $pgconn) { $pgconn = $env:DATABASE_URL }
if (-not $pgconn) {
  Write-Error "No PG connection string found. Set environment variable PGCONN or DATABASE_URL."
  exit 2
}

# verify psql exists
$psql = "psql"
try {
  & $psql --version > $null 2>&1
} catch {
  Write-Error "`psql` not found in PATH. Install PostgreSQL client or use Supabase SQL editor instead."
  exit 3
}

Write-Host "Applying migration: $migrationPath"
& $psql $pgconn -v ON_ERROR_STOP=1 -f $migrationPath
$exit = $LASTEXITCODE
if ($exit -eq 0) {
  Write-Host "Migration applied successfully."
} else {
  Write-Error "psql exited with code $exit"
  exit $exit
}
