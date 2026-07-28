# Offline regression runner for Pre-PF + preview gates (no Node.js required).
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Strip-Module([string]$source) {
  $out = $source -replace '(?m)^const \{ evaluateLanguageGate \} = require\([^)]+\);\r?\n?', ''
  $out = $out -replace '(?s)\r?\nmodule\.exports.*$', ''
  return $out.TrimEnd()
}

$c3 = Strip-Module (Get-Content -Raw (Join-Path $dir '_emea_c3_language_gate.js'))
$prePf = Strip-Module (Get-Content -Raw (Join-Path $dir '_emea_pre_pf_eligibility.js'))
$prePf = $prePf -replace '(?m)^const MIN_FULL_JOB_TEXT = 200;\r?\n\r?\n', ''

$previewJs = Get-Content -Raw (Join-Path $dir '_emea_preview_threshold.js')
$previewJs = $previewJs -replace '(?m)^const PREVIEW_SCORE_THRESHOLD = 3;\r?\n', ''
$previewJs = $previewJs -replace '(?s)\r?\nmodule\.exports.*$', ''

$pad = 'Additional posting context padding text for minimum length requirement.'
function Pad-Text([string]$text) {
  $base = $text.Trim()
  if ($base.Length -ge 200) { return $base }
  $out = $base
  while ($out.Length -lt 200) { $out += " $pad" }
  return $out
}

$runner = @"
$c3

$prePf

$previewJs

const pad = (text) => {
  const base = String(text || '').trim();
  if (base.length >= 200) return base;
  let out = base;
  const PAD = '$pad';
  while (out.length < 200) out += ' ' + PAD;
  return out;
};

const prePfCases = [
  { id: 'R1', location: 'UK Remote', text: 'This role is Europe-wide remote with flexible collaboration.', enrichmentStatus: 'OK', expectBlocked: false, expectGate: 'PASS' },
  { id: 'R2', location: 'UK Remote', text: 'We are hiring for an EMEA remote leadership position.', enrichmentStatus: 'OK', expectBlocked: false, expectGate: 'PASS' },
  { id: 'R3', location: 'Germany Remote', text: 'Location flexible across Europe for senior operators.', enrichmentStatus: 'OK', expectBlocked: false, expectGate: 'PASS' },
  { id: 'R4', location: 'Spain Remote', text: 'Work from any EU country with quarterly onsite reviews.', enrichmentStatus: 'OK', expectBlocked: false, expectGate: 'PASS' },
  { id: 'R5', location: 'UK Remote', text: 'Candidates must have the right to work in the UK without sponsorship.', enrichmentStatus: 'OK', expectBlocked: true, expectReason: 'WORK_AUTHORIZATION_REQUIRED', expectGate: 'WORK_AUTHORIZATION_REQUIRED' },
  { id: 'R6', location: 'Germany Remote', text: 'Germany residents only. Strong leadership background required.', enrichmentStatus: 'OK', expectBlocked: true, expectReason: 'COUNTRY_RESIDENCY_REQUIRED', expectGate: 'COUNTRY_RESIDENCY_REQUIRED' },
  { id: 'R7', location: 'Germany Remote', text: 'EU nationals only. Executive operations leadership role.', enrichmentStatus: 'OK', expectBlocked: false, expectGate: 'PASS' },
  { id: 'R8', location: 'France Remote', text: 'Eligible to work in the EU required for this distributed team.', enrichmentStatus: 'OK', expectBlocked: false, expectGate: 'PASS' },
  { id: 'R9', location: 'UK Remote', text: '', enrichmentStatus: 'HTTP_ERROR', expectBlocked: false, expectGate: 'COUNTRY_REMOTE_ELIGIBILITY_UNKNOWN', expectLocationFit: 'REVIEW_REQUIRED' },
  { id: 'R10', location: 'UK Remote', text: 'Hybrid executive role with quarterly leadership reviews in London.', enrichmentStatus: 'OK', expectBlocked: true, expectReason: 'COUNTRY_REMOTE_ONLY', expectGate: 'COUNTRY_REMOTE_ONLY' },
];

const previewCases = [
  { id: 'P-PREVIEW-2', aiPreviewScore: 2, expectPass: false, expectRoute: 'PREVIEW_REJECT' },
  { id: 'P-PREVIEW-3', aiPreviewScore: 3, expectPass: true, expectRoute: 'ENRICHMENT' },
];

let failed = 0;
WScript.Echo('Pre-PF eligibility gate cases');
WScript.Echo('');

for (const testCase of prePfCases) {
  const result = evaluatePrePfEligibilityGate({
    fullJobText: pad(testCase.text),
    enrichmentStatus: testCase.enrichmentStatus,
    location: testCase.location,
    emailSnippet: '',
  });
  const reasonOk = testCase.expectReason ? result.auto_reject_reason === testCase.expectReason : !result.auto_reject_reason;
  const gateOk = result.PrePfEligibilityGate === testCase.expectGate;
  const locationFitOk = !testCase.expectLocationFit || result.LocationFit === testCase.expectLocationFit;
  const ok = result.PrePfEligibilityBlocked === testCase.expectBlocked && reasonOk && gateOk && locationFitOk;
  if (!ok) failed++;
  WScript.Echo((ok ? 'PASS' : 'FAIL') + ' [' + testCase.id + '] blocked=' + result.PrePfEligibilityBlocked + ' gate=' + result.PrePfEligibilityGate + ' reason=' + (result.auto_reject_reason || 'none'));
}

WScript.Echo('');
WScript.Echo('Preview threshold gate cases');
WScript.Echo('');

for (const testCase of previewCases) {
  const pass = computePreviewPassesThreshold({ aiPreviewScore: testCase.aiPreviewScore, qualifiesForExecOpsFloor: false });
  const route = routeAfterPreviewGate(pass);
  const ok = pass === testCase.expectPass && route === testCase.expectRoute;
  if (!ok) failed++;
  WScript.Echo((ok ? 'PASS' : 'FAIL') + ' [' + testCase.id + '] score=' + testCase.aiPreviewScore + ' pass=' + pass + ' route=' + route);
}

WScript.Echo('');
if (failed > 0) {
  WScript.Echo(failed + ' case(s) failed.');
  WScript.Quit(1);
}
WScript.Echo('All ' + (prePfCases.length + previewCases.length) + ' cases passed.');
"@

$tempJs = Join-Path $env:TEMP 'emea_pre_pf_matrix_test.js'
[System.IO.File]::WriteAllText($tempJs, $runner, (New-Object System.Text.UTF8Encoding($false)))

$cscript = Join-Path $env:Windir 'System32\cscript.exe'
if (-not (Test-Path $cscript)) { throw 'cscript.exe not found.' }

& $cscript //Nologo //E:JScript $tempJs
exit $LASTEXITCODE
