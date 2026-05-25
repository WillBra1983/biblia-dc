# Gera CSR sem perguntar (para o assistente rodar). E-mail padrao do projeto.
$ErrorActionPreference = 'Stop'
$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
$dir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'BibliaDC-certificado-Apple'
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$email = 'willbra1983@gmail.com'
& $openssl genrsa -out (Join-Path $dir 'apple_distribution.key') 2048
& $openssl req -new -key (Join-Path $dir 'apple_distribution.key') `
  -out (Join-Path $dir 'CertificateSigningRequest.certSigningRequest') `
  -subj "/email=$email/CN=Wilson Lucas Ferreira/C=BR"
Write-Output $dir
