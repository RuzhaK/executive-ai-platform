$wf = Get-Content 'c:\Users\Ru\Documents\RUZHA\CV\GitHub\executive-ai-platform\workflows\Executive-Job-CRM-v1.1-DEV.json' -Raw | ConvertFrom-Json
$n = $wf.nodes | Where-Object { $_.name -eq 'Pre-PF Eligibility Gate' }
$code = $n.parameters.jsCode
$need = @(
  'const isEuEeaBulgariaEligibleClause',
  'const hasRestrictiveCountryMention',
  'const isSoftPreferenceChunk',
  'const isPrePfSoftPreferenceChunk',
  'const detectCountryRemoteOnlyBlock',
  'const evaluatePrePfEligibilityGate',
  'COUNTRY_REMOTE_ELIGIBILITY_UNKNOWN',
  'europe-wide'
)
foreach ($sym in $need) {
  $found = $code.Contains($sym)
  Write-Host "$sym : $found"
}
Write-Host '--- declaration counts ---'
Write-Host 'MIN_FULL_JOB_TEXT:' ([regex]::Matches($code,'const MIN_FULL_JOB_TEXT')).Count
Write-Host 'SOFT_PREFERENCE_ONLY:' ([regex]::Matches($code,'const SOFT_PREFERENCE_ONLY')).Count
Write-Host 'isSoftPreferenceChunk:' ([regex]::Matches($code,'const isSoftPreferenceChunk')).Count
Write-Host 'isPrePfSoftPreferenceChunk:' ([regex]::Matches($code,'const isPrePfSoftPreferenceChunk')).Count
$temp = Join-Path $env:TEMP 'pre_pf_wf_validate.js'
[IO.File]::WriteAllText($temp, $code)
& (Join-Path (Split-Path $MyInvocation.MyCommand.Path) '.tools\node\node.exe') --check $temp
Write-Host "syntax check exit: $LASTEXITCODE"
