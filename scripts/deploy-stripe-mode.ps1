param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("live", "sandbox")]
  [string]$Mode,

  [switch]$Build
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$samDir = Join-Path $repoRoot "services\api\plainterms-api"
$samConfigPath = Join-Path $samDir "samconfig.toml"

if (-not (Test-Path $samConfigPath)) {
  throw "Could not find SAM config at $samConfigPath"
}

$configText = Get-Content $samConfigPath -Raw
$match = [regex]::Match($configText, '(?m)^parameter_overrides\s*=\s*"(.*)"\s*$')
if (-not $match.Success) {
  throw "Could not find parameter_overrides in $samConfigPath"
}

$parameterOverrides = $match.Groups[1].Value
$parameterOverrides = $parameterOverrides -replace 'StripeMode=\\"(?:live|sandbox)\\"', "StripeMode=\`"$Mode\`""

Push-Location $samDir
try {
  if ($Build) {
    sam build
  }

  Write-Host "Deploying PlainTerms API with StripeMode=$Mode"
  sam deploy --parameter-overrides $parameterOverrides
}
finally {
  Pop-Location
}
