# Gera valores base64 para colar nos Secrets do GitHub (Windows).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/ios-prepare-github-secrets.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Show-B64File($label, $path) {
  if (-not (Test-Path $path)) {
    Write-Host "○ $label — arquivo não encontrado: $path" -ForegroundColor Yellow
    return
  }
  $bytes = [IO.File]::ReadAllBytes($path)
  $b64 = [Convert]::ToBase64String($bytes)
  Write-Host "`n=== $label ===" -ForegroundColor Cyan
  Write-Host "Arquivo: $path"
  Write-Host "Cole no GitHub Secret (valor completo em uma linha):`n"
  Write-Host $b64
}

Write-Host "Bíblia DC — segredos GitHub Actions (iOS App Store)`n" -ForegroundColor Green

$p12 = Read-Host 'Caminho do certificado .p12 (Distribution) [Enter pula]'
if ($p12) { Show-B64File 'APPLE_CERTIFICATE_BASE64' $p12 }

$pp = Read-Host 'Caminho do .mobileprovision App Store [Enter pula]'
if ($pp) { Show-B64File 'APPLE_PROVISION_PROFILE_BASE64' $pp }

$plist = Join-Path $root 'ios\App\App\GoogleService-Info.plist'
Show-B64File 'GOOGLE_SERVICE_INFO_PLIST_BASE64' $plist

Write-Host "`n--- Texto (copie do .env local) ---" -ForegroundColor Cyan
Write-Host "APPLE_TEAM_ID = BDAN6452VU"
Write-Host "APPSTORE_ISSUER_ID, APPSTORE_API_KEY_ID, APPSTORE_API_PRIVATE_KEY"
Write-Host "  → App Store Connect → Utilizadores e acesso → Integrações → Chaves de API"
Write-Host "VITE_FIREBASE_* e VITE_GEMINI_* → copie do seu .env"
Write-Host "`nGuia completo: docs/GITHUB_IOS_APP_STORE.md`n"
