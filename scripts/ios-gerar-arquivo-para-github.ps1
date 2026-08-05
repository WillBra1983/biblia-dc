# Cria um arquivo na Área de Trabalho com valores para colar no GitHub (Secrets).
# NÃO commite esse arquivo. Uso: npm run ios:gerar-secrets-desktop

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$desktop = [Environment]::GetFolderPath('Desktop')
$outFile = Join-Path $desktop 'BibliaDC-secrets-GitHub-NAO-COMPARTILHAR.txt'

function Read-DotEnv($path) {
  $map = @{}
  if (-not (Test-Path $path)) { return $map }
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $map[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim()
  }
  return $map
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('BÍBLIA DC — valores para GitHub Secrets (Actions)')
[void]$sb.AppendLine('Abra: https://github.com/WillBra1983/biblia-dc/settings/secrets/actions')
[void]$sb.AppendLine('Para cada linha "NOME =", clique New repository secret, cole o nome e o valor.')
[void]$sb.AppendLine('APAGUE este arquivo depois de colar tudo. NÃO envie por WhatsApp.')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('========== TEXTO (copie do .env) ==========')

$envMap = Read-DotEnv (Join-Path $root '.env')
$names = @(
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
foreach ($n in $names) {
  if ($envMap.ContainsKey($n)) {
    [void]$sb.AppendLine("$n = $($envMap[$n])")
  } else {
    [void]$sb.AppendLine("$n = (FALTA NO .env)")
  }
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('KEYCHAIN_PASSWORD = invente uma senha qualquer (ex: BibliaDC2026!)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('APPSTORE_ISSUER_ID = (App Store Connect - Usuarios e acesso - Integracoes - Chaves)')
[void]$sb.AppendLine('APPSTORE_API_KEY_ID = ')
[void]$sb.AppendLine('APPSTORE_API_PRIVATE_KEY = (cole o arquivo .p8 inteiro)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('APPLE_CERTIFICATE_BASE64 = (depois de criar o .p12 no site Apple)')
[void]$sb.AppendLine('APPLE_CERTIFICATE_PASSWORD = senha que você definiu no .p12')
[void]$sb.AppendLine('APPLE_PROVISION_PROFILE_BASE64 = (arquivo .mobileprovision em base64)')

$plist = Join-Path $root 'ios\App\App\GoogleService-Info.plist'
[void]$sb.AppendLine('')
[void]$sb.AppendLine('========== GOOGLE_SERVICE_INFO_PLIST_BASE64 (uma linha) ==========')
if (Test-Path $plist) {
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($plist))
  [void]$sb.AppendLine($b64)
} else {
  [void]$sb.AppendLine('(Arquivo plist não encontrado — baixe no Firebase)')
}

$sb.ToString() | Set-Content -Path $outFile -Encoding UTF8
Write-Host "Arquivo criado na Área de Trabalho:" -ForegroundColor Green
Write-Host $outFile
Write-Host "Abra, cole no GitHub, depois APAGUE o arquivo." -ForegroundColor Yellow
