# Testa se o .p12 abre com a senha (antes de culpar o GitHub).
$dir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'BibliaDC-certificado-Apple'
$p12 = Join-Path $dir 'distribution.p12'
$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
$senha = Read-Host 'Senha do .p12 (a mesma do GitHub APPLE_CERTIFICATE_PASSWORD)'

if (-not (Test-Path $p12)) { throw "Falta $p12" }
& $openssl pkcs12 -in $p12 -noout -passin "pass:$senha" 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host 'OK: senha e arquivo .p12 estao corretos.' -ForegroundColor Green
} else {
  Write-Host 'ERRO: senha errada ou .p12 corrompido. Atualize APPLE_CERTIFICATE_PASSWORD no GitHub.' -ForegroundColor Red
}
