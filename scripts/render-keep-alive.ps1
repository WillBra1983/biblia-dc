<#
.SYNOPSIS
  Mantém o site no Render acordado (evita cold start de ~30–60 s).

.DESCRIPTION
  O plano gratuito do Render dorme após ~15 min sem tráfego HTTP.
  Este script faz um ping periódico na URL do app.

  Uso contínuo (deixe o PowerShell aberto):
    .\scripts\render-keep-alive.ps1

  Uma única visita:
    .\scripts\render-keep-alive.ps1 -UmaVez

  Agendar no Windows (a cada 10 min):
    1. Abra "Agendador de Tarefas"
    2. Criar Tarefa Básica → Disparador: a cada 10 minutos
    3. Ação: Iniciar programa
       Programa: powershell.exe
       Argumentos: -NoProfile -ExecutionPolicy Bypass -File "C:\Salvation\scripts\render-keep-alive.ps1" -UmaVez

.PARAMETER Url
  URL pública do app (com barra final opcional).

.PARAMETER IntervaloMinutos
  Intervalo entre pings no modo loop (padrão 10; Render dorme após ~15 min).

.PARAMETER UmaVez
  Executa um único ping e encerra (ideal para o Agendador de Tarefas).
#>
param(
  [string]$Url = 'https://foundrine.com/biblia/',
  [int]$IntervaloMinutos = 10,
  [switch]$UmaVez
)

$ErrorActionPreference = 'Continue'

function Ping-Site {
  param([string]$TargetUrl)
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  try {
    $resp = Invoke-WebRequest -Uri $TargetUrl -Method Get -TimeoutSec 90 -UseBasicParsing
    Write-Host "$ts OK $($resp.StatusCode) $TargetUrl"
    return $true
  } catch {
    Write-Host "$ts ERRO $TargetUrl — $($_.Exception.Message)"
    return $false
  }
}

if ($UmaVez) {
  Ping-Site -TargetUrl $Url | Out-Null
  exit 0
}

$segundos = [Math]::Max(5, $IntervaloMinutos * 60)
Write-Host "Render keep-alive: $Url a cada $IntervaloMinutos min (Ctrl+C para parar)"
while ($true) {
  Ping-Site -TargetUrl $Url | Out-Null
  Start-Sleep -Seconds $segundos
}
