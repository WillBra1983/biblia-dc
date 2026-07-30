<#
.SYNOPSIS
  Mantem o site no Render acordado para reduzir o tempo de inicializacao.

.DESCRIPTION
  O plano gratuito do Render dorme apos cerca de 15 minutos sem trafego HTTP.
  Este script faz uma requisicao leve a cada 10 minutos.

  Uso continuo (deixe o PowerShell aberto):
    .\scripts\render-keep-alive.ps1

  Uma unica requisicao (ideal para o Agendador de Tarefas):
    .\scripts\render-keep-alive.ps1 -UmaVez

  Agendar no Windows:
    Programa: powershell.exe
    Argumentos: -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Pr Wilson Lucas\Desktop\Salvation\scripts\render-keep-alive.ps1" -UmaVez

.PARAMETER Url
  URL publica do servico.

.PARAMETER IntervaloMinutos
  Intervalo entre requisicoes no modo continuo. O padrao e 10 minutos.

.PARAMETER UmaVez
  Executa uma unica requisicao e encerra.
#>
param(
  [string]$Url = 'https://foundcine.com/biblia/',
  [int]$IntervaloMinutos = 10,
  [switch]$UmaVez
)

$ErrorActionPreference = 'Continue'

function Ping-Site {
  param([string]$TargetUrl)

  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  try {
    try {
      $resp = Invoke-WebRequest -Uri $TargetUrl -Method Head -TimeoutSec 90 -UseBasicParsing
    } catch {
      # Alguns proxies nao aceitam HEAD. GET preserva a compatibilidade.
      $resp = Invoke-WebRequest -Uri $TargetUrl -Method Get -TimeoutSec 90 -UseBasicParsing
    }
    Write-Host "$ts OK $($resp.StatusCode) $TargetUrl"
    return $true
  } catch {
    Write-Host "$ts ERRO $TargetUrl - $($_.Exception.Message)"
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
