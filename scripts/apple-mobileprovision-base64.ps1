# Gera base64 do .mobileprovision para GitHub (APPLE_PROVISION_PROFILE_BASE64)
$ErrorActionPreference = 'Stop'
$dir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'BibliaDC-certificado-Apple'
$pp = Get-ChildItem -Path $dir -Filter '*.mobileprovision' | Select-Object -First 1
if (-not $pp) { throw "Nenhum .mobileprovision em $dir" }
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pp.FullName))
$out = Join-Path $dir 'APPLE_PROVISION_PROFILE_BASE64-cole-no-GitHub.txt'
$b64 | Set-Content -Path $out -Encoding ASCII -NoNewline
Write-Host "Arquivo: $($pp.Name)"
Write-Host "Base64 salvo em: $out"
