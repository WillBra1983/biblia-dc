# Gera base64 e lista de secrets para GitHub Actions (iOS App Store).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/ios-prepare-github-secrets.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Show-B64File($label, $path) {
  if (-not (Test-Path $path)) {
    Write-Host "○ $label — arquivo não encontrado: $path" -ForegroundColor Yellow
    return $false
  }
  $bytes = [IO.File]::ReadAllBytes($path)
  $b64 = [Convert]::ToBase64String($bytes)
  Write-Host "`n=== $label ===" -ForegroundColor Cyan
  Write-Host "Arquivo: $path"
  Write-Host "Secret no GitHub. Cole o valor em UMA linha:`n"
  Write-Host $b64
  return $true
}

function Read-DotEnv($path) {
  $map = @{}
  if (-not (Test-Path $path)) { return $map }
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    if ($v) { $map[$k] = $v }
  }
  return $map
}

Write-Host "Bíblia DC — secrets GitHub (iOS App Store)`n" -ForegroundColor Green

$p12 = Read-Host 'Caminho do certificado .p12 (Distribution) [Enter pula]'
if ($p12) { Show-B64File 'APPLE_CERTIFICATE_BASE64' $p12 | Out-Null }

$pp = Read-Host 'Caminho do .mobileprovision App Store [Enter pula]'
if ($pp) { Show-B64File 'APPLE_PROVISION_PROFILE_BASE64' $pp | Out-Null }

$plist = Join-Path $root 'ios\App\App\GoogleService-Info.plist'
if (-not (Show-B64File 'GOOGLE_SERVICE_INFO_PLIST_BASE64' $plist)) {
  Write-Host "Baixe o plist no Firebase (app iOS com.bibliadc.app) e salve em:" -ForegroundColor Yellow
  Write-Host "  $plist`n"
}

$envMap = Read-DotEnv (Join-Path $root '.env')
Write-Host "`n=== Secrets de texto (copie do .env para o GitHub) ===" -ForegroundColor Cyan
$textSecrets = @(
  'APPLE_TEAM_ID',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_VAPID_KEY'
)
foreach ($name in $textSecrets) {
  if ($envMap.ContainsKey($name)) {
    Write-Host "  [ok] $name" -ForegroundColor Green
  } else {
    Write-Host "  [falta] $name" -ForegroundColor Yellow
  }
}
Write-Host "`n  KEYCHAIN_PASSWORD = invente uma senha (ex. Ci-local-2026!)"
Write-Host "  APPSTORE_ISSUER_ID, APPSTORE_API_KEY_ID, APPSTORE_API_PRIVATE_KEY = App Store Connect`n"

Write-Host "Checklist: .github\APPLE_SECRETS_CHECKLIST.md"
Write-Host "Guia: docs\GITHUB_IOS_APP_STORE.md`n"
