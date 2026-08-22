# Converte distribution.cer + apple_distribution.key -> distribution.p12 + base64 GitHub
$ErrorActionPreference = 'Stop'
$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
$dir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'BibliaDC-certificado-Apple'
$cer = Join-Path $dir 'distribution.cer'
$key = Join-Path $dir 'apple_distribution.key'
$pem = Join-Path $dir 'distribution.pem'
$p12 = Join-Path $dir 'distribution.p12'
$senhaSegura = Read-Host 'Senha atual do certificado .p12' -AsSecureString
$senhaPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaSegura)
try {
  $senha = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($senhaPtr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($senhaPtr)
}
if ([string]::IsNullOrWhiteSpace($senha)) { throw 'A senha do .p12 nao pode ficar vazia.' }

if (-not (Test-Path $cer)) { throw "Falta distribution.cer em $dir" }
if (-not (Test-Path $key)) { throw "Falta apple_distribution.key em $dir" }

& $openssl x509 -in $cer -inform DER -out $pem -outform PEM
# Algoritmos compatíveis com security import no macOS (GitHub Actions)
& $openssl pkcs12 -export -out $p12 -inkey $key -in $pem `
  -certpbe PBE-SHA1-3DES -keypbe PBE-SHA1-3DES -macalg sha1 `
  -passout "pass:$senha"

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($p12))
$b64File = Join-Path $dir 'APPLE_CERTIFICATE_BASE64-cole-no-GitHub.txt'
$b64 | Set-Content -Path $b64File -Encoding ASCII -NoNewline

$info = @"
Biblia DC - certificado Apple (guarde nesta pasta)

Senha do .p12: use a mesma informada durante a geracao.
GitHub secret correspondente: APPLE_CERTIFICATE_PASSWORD

Arquivo .p12: distribution.p12
Base64 para GitHub (secret APPLE_CERTIFICATE_BASE64):
  Abra: APPLE_CERTIFICATE_BASE64-cole-no-GitHub.txt
  Copie TUDO em uma linha -> GitHub Secrets

KEYCHAIN_PASSWORD no GitHub: use uma senha propria para o chaveiro temporario.

Proximo: Apple Developer -> Profiles -> App Store -> baixar .mobileprovision
"@
$info | Set-Content -Path (Join-Path $dir 'LEIA-ME-certificado.txt') -Encoding UTF8

Write-Host "OK: $p12"
Write-Host "Base64: $b64File"
Write-Host 'A senha nao foi gravada nem exibida por este script.'
