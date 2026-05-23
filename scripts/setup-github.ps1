# Passo B — subir para GitHub (build iOS grátis no Actions)
# Uso: powershell -ExecutionPolicy Bypass -File scripts/setup-github.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

if (-not (Test-Path '.git')) {
  Write-Host 'Inicializando git...'
  git init
  git branch -M main
}

$status = git status --porcelain
if ($status) {
  Write-Host 'Criando commit inicial...'
  git add .
  git commit -m @"
Bíblia DC: Capacitor Android + iOS, CI simulador grátis.

Inclui app React/Vite, Firebase, workflows GitHub Actions e docs iOS.
"@
} else {
  Write-Host 'Nada novo para commitar.'
}

Write-Host ''
Write-Host '=== Próximo passo (no navegador) ==='
Write-Host '1) https://github.com/new — criar repo (ex.: biblia-dc)'
Write-Host '   Recomendado: Publico (Actions macOS ilimitado no plano gratuito)'
Write-Host ''
Write-Host '2) Depois rode (troque SEU_USUARIO):'
Write-Host '   git remote add origin https://github.com/SEU_USUARIO/biblia-dc.git'
Write-Host '   git push -u origin main'
Write-Host ''
Write-Host '3) GitHub -> Actions -> "iOS simulador (gratis)" -> deve ficar verde.'
