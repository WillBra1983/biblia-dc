$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  & npm.cmd run build:web
  if ($LASTEXITCODE -ne 0) { throw 'Build falhou. Publicacao cancelada; a pasta apis nao foi alterada.' }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'deploy-pwa-para-apis.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Publicacao local falhou. Nao envie estes arquivos para o Render.' }
  Write-Host 'Site gerado, validado e copiado para apis. Revise as alteracoes antes de publicar no Render.'
} finally { Pop-Location }
