# Gera o arquivo que a Apple pede (CSR) na Area de Trabalho.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/apple-gerar-csr.ps1

$ErrorActionPreference = 'Stop'
$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
if (-not (Test-Path $openssl)) {
  Write-Host 'OpenSSL nao encontrado. Instale Git for Windows ou OpenSSL.' -ForegroundColor Red
  exit 1
}

$dir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'BibliaDC-certificado-Apple'
New-Item -ItemType Directory -Path $dir -Force | Out-Null
Set-Location $dir

$email = Read-Host 'Seu e-mail da conta Apple (ex: pastor@igreja.com)'
if (-not $email) { $email = 'contato@foundcine.com' }

& $openssl genrsa -out apple_distribution.key 2048
& $openssl req -new -key apple_distribution.key -out CertificateSigningRequest.certSigningRequest `
  -subj "/email=$email/CN=Wilson Lucas Ferreira/C=BR"

Write-Host ''
Write-Host 'Pronto!' -ForegroundColor Green
Write-Host "Pasta: $dir"
Write-Host ''
Write-Host 'No site Apple, clique Choose File e escolha:' -ForegroundColor Cyan
Write-Host '  CertificateSigningRequest.certSigningRequest'
Write-Host ''
Write-Host 'Guarde a pasta! Depois do .cer da Apple voce precisa do apple_distribution.key' -ForegroundColor Yellow
explorer $dir
