# Dispara o workflow "iOS App Store" no GitHub sem precisar do gh CLI.
# Uso:
#   $env:GITHUB_TOKEN = "ghp_..."   # PAT com escopo repo + workflow
#   .\scripts\trigger-ios-appstore.ps1
#   .\scripts\trigger-ios-appstore.ps1 -UploadTestFlight $false

param(
  [string]$Repo = "WillBra1983/biblia-dc",
  [string]$Ref = "main",
  [bool]$UploadTestFlight = $true
)

$token = $env:GITHUB_TOKEN
if (-not $token) {
  Write-Error "Defina GITHUB_TOKEN (PAT com permissao workflow). Ou instale gh: winget install GitHub.cli"
  exit 1
}

$body = @{
  ref = $Ref
  inputs = @{
    upload_testflight = $(if ($UploadTestFlight) { "true" } else { "false" })
  }
} | ConvertTo-Json -Depth 3

$headers = @{
  Authorization = "Bearer $token"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$uri = "https://api.github.com/repos/$Repo/actions/workflows/ios-appstore-release.yml/dispatches"

try {
  Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body -ContentType "application/json"
  Write-Host "Workflow disparado. Acompanhe em: https://github.com/$Repo/actions/workflows/ios-appstore-release.yml"
} catch {
  Write-Error $_
  exit 1
}
