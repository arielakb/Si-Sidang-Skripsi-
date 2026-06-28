$ErrorActionPreference = "Stop"

$BaseUrl = "http://localhost:5000/api"

Write-Host "== Sisidang QA Smoke Test ==" -ForegroundColor Cyan

function Assert-Success {
  param (
    [string]$Name,
    [scriptblock]$Action
  )

  try {
    & $Action | Out-Null
    Write-Host "[PASS] $Name" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] $Name" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    throw
  }
}

Assert-Success "Health check" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/health" `
    -Method GET
}

$adminBody = @{
  identifier = "admin"
  password = "ChangeMe123!"
} | ConvertTo-Json

$adminLogin = Invoke-RestMethod `
  -Uri "$BaseUrl/auth/login" `
  -Method POST `
  -Body $adminBody `
  -ContentType "application/json" `
  -SessionVariable adminSession

$adminToken = $adminLogin.data.accessToken

$headers = @{
  Authorization = "Bearer $adminToken"
}

Assert-Success "Auth me" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/auth/me" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Dashboard summary" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/dashboard/my-summary" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Users list" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/users" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Master peminatan" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/master-data/peminatan" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Master ruang" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/master-data/ruang" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Public jadwal sidang" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/public/jadwal-sidang" `
    -Method GET
}

Assert-Success "Skripsi list" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/skripsi" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Jadwal sidang list" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/jadwal-sidang" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Peminjaman ruang list" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/peminjaman-ruang" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Notifications" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/notifications" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Gamification leaderboard" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/gamification/leaderboard" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Laporan summary" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/laporan/summary" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Laporan skripsi" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/laporan/skripsi" `
    -Method GET `
    -Headers $headers
}

Assert-Success "Audit logs" {
  Invoke-RestMethod `
    -Uri "$BaseUrl/audit-logs" `
    -Method GET `
    -Headers $headers
}

Write-Host "All smoke tests passed." -ForegroundColor Cyan