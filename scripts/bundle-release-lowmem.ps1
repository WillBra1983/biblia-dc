# Build do .aab com menos RAM (fecha daemons antigos, um processo JVM).
# Uso: .\scripts\bundle-release-lowmem.ps1
# Requer: npm run build:android e npx cap sync android já executados, ou use -SyncWeb.

param([switch]$SyncWeb)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if ($SyncWeb) {
  Write-Host ">> build web + cap sync..."
  npm run build:android
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$env:GRADLE_OPTS = "-Xmx1024m -XX:MaxMetaspaceSize=384m -XX:+UseSerialGC -Dfile.encoding=UTF-8"
$env:JAVA_TOOL_OPTIONS = "-Xmx1024m -XX:MaxMetaspaceSize=384m"

Set-Location android
Write-Host ">> Parando daemons Gradle antigos..."
.\gradlew.bat --stop 2>$null

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
