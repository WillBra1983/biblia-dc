# Converte distribution.cer + apple_distribution.key -> distribution.p12 + base64 GitHub
$ErrorActionPreference = 'Stop'
$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
$dir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'BibliaDC-certificado-Apple'
$cer = Join-Path $dir 'distribution.cer'
$key = Join-Path $dir 'apple_distribution.key'
$pem = Join-Path $dir 'distribution.pem'
$p12 = Join-Path $dir 'distribution.p12'
$senha = 'BibliaDC2026!'

if (-not (Test-Path $cer)) { throw "Falta distribution.cer em $dir" }
if (-not (Test-Path $key)) { throw "Falta apple_distribution.key em $dir" }

& $openssl x509 -in $cer -inform DER -out $pem -outform PEM
& $openssl pkcs12 -export -out $p12 -inkey $key -in $pem -passout "pass:$senha"

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($p12))
$b64File = Join-Path $dir 'APPLE_CERTIFICATE_BASE64-cole-no-GitHub.txt'
$b64 | Set-Content -Path $b64File -Encoding ASCII -NoNewline

$info = @"
Biblia DC - certificado Apple (guarde nesta pasta)

Senha do .p12 (GitHub secret APPLE_CERTIFICATE_PASSWORD):
$senha

Arquivo .p12: distribution.p12
Base64 para GitHub (secret APPLE_CERTIFICATE_BASE64):
  Abra: APPLE_CERTIFICATE_BASE64-cole-no-GitHub.txt
  Copie TUDO em uma linha -> GitHub Secrets

KEYCHAIN_PASSWORD no GitHub: pode usar a mesma senha acima.

Proximo: Apple Developer -> Profiles -> App Store -> baixar .mobileprovision
"@
$info | Set-Content -Path (Join-Path $dir 'LEIA-ME-certificado.txt') -Encoding UTF8

Write-Host "OK: $p12"
Write-Host "Base64: $b64File"
Write-Host "Senha p12: $senha"
