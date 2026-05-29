# Build do .aab com menos RAM (fecha daemons antigos, um processo JVM).
# Uso: .\scripts\bundle-release-lowmem.ps1
# Requer: npm run build:android e npx cap sync android já executados, ou use -SyncWeb.

param([switch]$SyncWeb)

$ErrorActionPreference = "Stop"
# PowerShell 7.3+ trata stderr de comando nativo como erro quando ErrorActionPreference=Stop.
# O JVM imprime "Picked up JAVA_TOOL_OPTIONS..." em stderr (não é erro) e isso abortava o script.
$PSNativeCommandUseErrorActionPreference = $false
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if ($SyncWeb) {
  Write-Host ">> build web + cap sync..."
  npm run build:android
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# Memória do build via GRADLE_OPTS (vale para --no-daemon). NÃO usar JAVA_TOOL_OPTIONS:
# ele faz a JVM imprimir "Picked up ..." em stderr, poluindo a saída e abortando o script.
$env:GRADLE_OPTS = "-Xmx1024m -XX:MaxMetaspaceSize=384m -XX:+UseSerialGC -Dfile.encoding=UTF-8"
Remove-Item Env:\JAVA_TOOL_OPTIONS -ErrorAction SilentlyContinue

Set-Location android
Write-Host ">> Parando daemons Gradle antigos..."
.\gradlew.bat --stop | Out-Host

Write-Host ">> bundleRelease (sem daemon, 1 worker)..."
.\gradlew.bat bundleRelease --no-daemon --max-workers=1
$code = $LASTEXITCODE
Set-Location $root

if ($code -eq 0) {
  $aab = Join-Path $root "android\app\build\outputs\bundle\release\app-release.aab"
  Write-Host ""
  Write-Host "OK: $aab"
} else {
  Write-Host "Falha no build (codigo $code). Feche Chrome/Cursor e tente de novo."
}
exit $code
