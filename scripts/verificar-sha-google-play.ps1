# Verifica SHAs locais vs google-services.json (login Google na Play Store).
# Uso: powershell -File scripts/verificar-sha-google-play.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Keystore = Join-Path $Root 'android\salvation.keystore'
$Gs = Join-Path $Root 'android\app\google-services.json'

Write-Host '=== SHA da keystore de UPLOAD (APK local) ===' -ForegroundColor Cyan
if (Test-Path $Keystore) {
  keytool -list -v -keystore $Keystore -alias salvation -storepass 123456 2>&1 |
    Select-String -Pattern 'SHA1:|SHA256:'
} else {
  Write-Host "Keystore nao encontrada: $Keystore"
}

Write-Host ''
Write-Host '=== certificate_hash no google-services.json ===' -ForegroundColor Cyan
if (Test-Path $Gs) {
  Select-String -Path $Gs -Pattern 'certificate_hash' -AllMatches | ForEach-Object { $_.Line.Trim() }
  $count = (Select-String -Path $Gs -Pattern 'client_type.: 1' -AllMatches).Count
  Write-Host "Clientes OAuth Android (tipo 1): $count"
  if ($count -lt 4) {
    Write-Host ''
    Write-Host 'ATENCAO: Falta SHA da Play no Firebase.' -ForegroundColor Yellow
    Write-Host 'Apos cadastrar a SHA-1 da CHAVE DE ASSINATURA DO APP (Google), baixe de novo'
    Write-Host 'o google-services.json — deve aparecer um 4o cliente Android (tipo 1).'
  }
} else {
  Write-Host "Arquivo nao encontrado: $Gs"
}

Write-Host ''
Write-Host '=== SHA da PLAY (obrigatoria para app instalado pela loja) ===' -ForegroundColor Cyan
Write-Host '1) Play Console -> abra o APP Bíblia DC (nao a conta de desenvolvedor)'
Write-Host '2) Barra de pesquisa do Console: digite "assinatura de apps" ou "app signing"'
Write-Host '3) Certificado "Chave de ASSINATURA do app" (NAO "chave de upload")'
Write-Host '4) Copie SHA-1 e SHA-256 -> Firebase -> app Android com.bibliadc.app'
Write-Host '5) Baixe google-services.json de novo e substitua android/app/'
Write-Host '6) Novo AAB (versionCode maior) + upload teste fechado + reinstalar'
Write-Host ''
Write-Host 'SHA-256 da Play (asset links): 68:F0:29:33:... (ja usada no site)'
Write-Host 'SHA-1 da Play e DIFERENTE da upload D4:C2:B2:2C:...'
