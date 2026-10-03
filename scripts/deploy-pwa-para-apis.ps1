# Publica o PWA (build web /biblia/) e o Digital Asset Links na pasta do servidor Flask em c:\apis.
# Pré-requisito: npm run build:web (gera dist/ com base /biblia/).
# Uso: npm run deploy:pwa-apis

param(
  [string]$ApisRoot = $env:SALVATION_APIS_ROOT,
  [switch]$ValidateOnly
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
$IndexDist = Join-Path $Dist 'index.html'
$ValidacaoDist = Join-Path $Dist 'build-validado.json'
if (-not (Test-Path -LiteralPath $IndexDist -PathType Leaf) -or -not (Test-Path -LiteralPath $ValidacaoDist -PathType Leaf)) {
  throw 'Publicacao cancelada: o build nao terminou ou falta index.html. Rode npm run build:web e confirme o sucesso antes de publicar. Nenhum arquivo do servidor foi alterado.'
}
$Validacao = Get-Content -LiteralPath $ValidacaoDist -Raw | ConvertFrom-Json
if ($Validacao.base -ne '/biblia/' -or $Validacao.indexSha256 -ne (Get-FileHash -LiteralPath $IndexDist -Algorithm SHA256).Hash.ToLowerInvariant()) {
  throw 'Publicacao cancelada: dist nao corresponde a um build web validado. Rode npm run build:web novamente.'
}
foreach ($ArquivoValidado in $Validacao.arquivos) {
  if (-not (Test-Path -LiteralPath (Join-Path $Dist $ArquivoValidado) -PathType Leaf)) { throw "Publicacao cancelada: falta o arquivo $ArquivoValidado." }
}
if ($ValidateOnly) { Write-Host 'Build web validado. Nenhum arquivo foi copiado.'; exit 0 }
$ApisRoot = [System.IO.Path]::GetFullPath($ApisRoot)
$BibliaTarget = [System.IO.Path]::GetFullPath((Join-Path $ApisRoot 'biblia_dist'))
if (-not $BibliaTarget.StartsWith($ApisRoot.TrimEnd('\') + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Destino de publicacao fora da pasta apis.' }
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
