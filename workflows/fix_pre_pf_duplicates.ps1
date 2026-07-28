$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$workflowPath = Join-Path $dir 'Executive-Job-CRM-v1.1-DEV.json'
$c3Path = Join-Path $dir '_emea_c3_language_gate.js'
$prePfPath = Join-Path $dir '_emea_pre_pf_eligibility.js'

function Strip-Module([string]$source) {
  $out = $source -replace '(?m)^const \{ evaluateLanguageGate \} = require\([^)]+\);\r?\n?', ''
  $out = $out -replace '(?s)\r?\nmodule\.exports.*$', ''
  return $out.TrimEnd()
}

function Remove-SharedConsts([string]$source) {
  $out = $source
  $out = $out -replace '(?m)^const MIN_FULL_JOB_TEXT = 200;\r?\n\r?\n', ''
  # SOFT_PREFERENCE_ONLY is not always at file start (e.g. c3 language gate).
  $out = $out -replace '(?s)const SOFT_PREFERENCE_ONLY[\s\S]*?;\r?\n\r?\n', ''
  return $out.TrimEnd()
}

function Prepare-PrePfBody([string]$source) {
  $out = $source
  # isSoftPreferenceChunk is mid-file in _emea_pre_pf_eligibility.js, not at start.
  $out = $out -replace '(?s)const isSoftPreferenceChunk[\s\S]*?;\r?\n\r?\n', ''
  $out = $out -replace 'isSoftPreferenceChunk\(', 'isPrePfSoftPreferenceChunk('
  $prelude = @'
const isPrePfSoftPreferenceChunk = (chunk) =>
  SOFT_PREFERENCE_ONLY.test(chunk) &&
  !/\b(required|mandatory|essential|must|only|non-negotiable)\b/i.test(chunk);

'@
  return ($prelude + $out).TrimEnd()
}

$sharedHeader = @'
const MIN_FULL_JOB_TEXT = 200;

const SOFT_PREFERENCE_ONLY =
  /\b(preferred|nice to have|highly desirable|desirable|advantageous|a plus|ideally|would be (?:a )?bonus|helpful|beneficial|bonus)\b/i;

'@

$c3Body = Remove-SharedConsts (Strip-Module (Get-Content -Raw -Path $c3Path))
$prePfBody = Prepare-PrePfBody (Remove-SharedConsts (Strip-Module (Get-Content -Raw -Path $prePfPath)))

$gateJsCode = @"
// EMEA pre-PF eligibility — keep in sync with _emea_pre_pf_eligibility.js + _emea_c3_language_gate.js
$sharedHeader
$c3Body

$prePfBody

const card = `$('Parse Job Cards').item?.json || {};
const result = evaluatePrePfEligibilityGate({
  fullJobText: String(`$json.FullJobText || '').trim(),
  enrichmentStatus: `$json.EnrichmentStatus,
  location: `$json.Location || card.Location || '',
  emailSnippet: card.EmailSnippet || `$json.EmailSnippet || '',
});

return {
  json: {
    ...`$json,
    ...result,
  },
};
"@

$tempJs = Join-Path $env:TEMP 'pre_pf_gate_validate.js'
[System.IO.File]::WriteAllText($tempJs, $gateJsCode, (New-Object System.Text.UTF8Encoding($false)))
$nodeExe = Join-Path $dir '.tools\node\node.exe'
if (-not (Test-Path $nodeExe)) { throw "Bundled node not found at $nodeExe" }
& $nodeExe --check $tempJs
if ($LASTEXITCODE -ne 0) { throw 'Generated Pre-PF gate code failed syntax check.' }

$matches = [regex]::Matches($gateJsCode, 'const MIN_FULL_JOB_TEXT')
$soft = [regex]::Matches($gateJsCode, 'const SOFT_PREFERENCE_ONLY')
$softFn = [regex]::Matches($gateJsCode, 'const isSoftPreferenceChunk')
$prePfFn = [regex]::Matches($gateJsCode, 'const isPrePfSoftPreferenceChunk')
Write-Host "Declarations: MIN_FULL_JOB_TEXT=$($matches.Count) SOFT_PREFERENCE_ONLY=$($soft.Count) isSoftPreferenceChunk=$($softFn.Count) isPrePfSoftPreferenceChunk=$($prePfFn.Count)"

$wf = Get-Content -Raw -Path $workflowPath | ConvertFrom-Json
$gateNode = $wf.nodes | Where-Object { $_.name -eq 'Pre-PF Eligibility Gate' } | Select-Object -First 1
if (-not $gateNode) { throw 'Pre-PF Eligibility Gate node not found.' }
$gateNode.parameters.jsCode = $gateJsCode
$json = $wf | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($workflowPath, "$json`n", (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'Fixed Pre-PF Eligibility Gate: deduplicated shared constants.'
