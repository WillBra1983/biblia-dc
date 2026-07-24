# Publica o PWA (build web /biblia/) e o Digital Asset Links na pasta do servidor Flask em c:\apis.
# Pré-requisito: npm run build:web (gera dist/ com base /biblia/).
# Uso: npm run deploy:pwa-apis

param(
  [string]$ApisRoot = $env:SALVATION_APIS_ROOT
)

$ErrorActionPreference = 'Stop'
# scripts/ -> raiz do projeto Salvation
$SalvationRoot = Split-Path $PSScriptRoot -Parent

if ([string]::IsNullOrWhiteSpace($ApisRoot)) {
  $CandidatosApis = @(
    'C:\apis',
    (Join-Path (Split-Path $SalvationRoot -Parent) 'apis')
  )

  $ApisRoot = $CandidatosApis | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($ApisRoot)) {
  $ApisRoot = 'C:\apis'
}

$Dist = Join-Path $SalvationRoot 'dist'
$BibliaTarget = Join-Path $ApisRoot 'biblia_dist'
$WellKnownSrc = Join-Path $SalvationRoot 'public\.well-known'
$WellKnownDst = Join-Path $ApisRoot '.well-known'

if (-not (Test-Path $Dist)) {
  Write-Error "Pasta dist nao encontrada. Rode antes: npm run build:web"
}
if (-not (Test-Path $ApisRoot)) {
  Write-Error "Pasta apis nao encontrada em: $ApisRoot. Informe outro caminho com: npm run deploy:pwa-apis -- -ApisRoot C:\apis"
}

Write-Host "Usando pasta apis: $ApisRoot"
Write-Host "Copiando dist -> $BibliaTarget ..."
if (-not (Test-Path $BibliaTarget)) { New-Item -ItemType Directory -Path $BibliaTarget -Force | Out-Null }
robocopy $Dist $BibliaTarget /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Host
if ($LASTEXITCODE -ge 8) { exit $LASTEXITCODE }

Write-Host "Copiando .well-known -> $WellKnownDst ..."
if (-not (Test-Path $WellKnownDst)) { New-Item -ItemType Directory -Path $WellKnownDst -Force | Out-Null }
Copy-Item -Path (Join-Path $WellKnownSrc 'assetlinks.json') -Destination (Join-Path $WellKnownDst 'assetlinks.json') -Force
$AasaSrc = Join-Path $WellKnownSrc 'apple-app-site-association'
if (Test-Path $AasaSrc) {
  Copy-Item -Path $AasaSrc -Destination (Join-Path $WellKnownDst 'apple-app-site-association') -Force
  Write-Host "Copiado apple-app-site-association (Universal Links iOS)."
}

Write-Host "OK. Reinicie o Flask na apis se necessario."
