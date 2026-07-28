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

$rejectJsCode = @'
// Pre-PF eligibility FINAL_REJECT — skips Professional Fit and Verified AI.
return {
  json: {
    ...$json,
    Status: 'Hard Eligibility Reject',
    RejectReason: $json.PrePfEligibilityRejectReason || 'Pre-PF eligibility gate',
    MainRisk: $json.PrePfEligibilityRejectReason || 'Pre-PF eligibility gate',
    FinalDecision: 'REJECT',
    PipelineStage: 'FINAL_REJECT',
    auto_reject_reason: $json.auto_reject_reason || $json.PrePfEligibilityGate || 'PRE_PF_ELIGIBILITY',
    ProfessionalFitScore: '',
    ProfessionalFitDimensionScores: '',
    ProfessionalFitStrengths: '',
    ProfessionalFitGaps: '',
    ProfessionalFitReasoning: '',
    ProfessionalFitError: '',
    VerifiedScore: '',
    VerifiedRecommendation: '',
    VerifiedRisk: '',
    VerifiedWhyApply: '',
    FinalCV: '',
    PreviewCV: '',
    VerifiedInterviewProbability: '',
    InterviewProbability: '',
    VerifiedPriority: '',
    SalaryEstimate: '',
    SalaryRange: '',
    SalaryTarget: '',
    SalaryConfidence: '',
    SalaryAssumption: '',
    LocationFit: '',
  },
};
'@

$passThroughLanguageGateJsCode = @'
// Mandatory language evaluated in Pre-PF Eligibility Gate (before Professional Fit).
return {
  json: {
    ...$json,
    MandatoryLanguageBlocked: false,
    MandatoryLanguageRejectReason: '',
    MandatoryLanguageLabel: '',
    MandatoryLanguageGateSkipped: true,
  },
};
'@

$workflow = Get-Content -Raw -Path $workflowPath | ConvertFrom-Json

$gateNode = [ordered]@{
  parameters = [ordered]@{ mode = 'runOnceForEachItem'; jsCode = $gateJsCode }
  type = 'n8n-nodes-base.code'
  typeVersion = 2
  position = @(-784, -48)
  id = 'e8prepf001-4d10-4a6f-b8c3-emea00000001'
  name = 'Pre-PF Eligibility Gate'
}

$checkNode = [ordered]@{
  parameters = [ordered]@{
    conditions = [ordered]@{
      options = [ordered]@{
        caseSensitive = $true
        leftValue = ''
        typeValidation = 'loose'
        version = 3
      }
      conditions = @(
        [ordered]@{
          id = 'emea-pre-pf-eligibility-blocked'
          leftValue = '={{$json.PrePfEligibilityBlocked}}'
          rightValue = ''
          operator = [ordered]@{
            type = 'boolean'
            operation = 'true'
            singleValue = $true
          }
        }
      )
      combinator = 'and'
    }
    looseTypeValidation = $true
    options = [ordered]@{}
  }
  type = 'n8n-nodes-base.if'
  typeVersion = 2.3
  position = @(-656, -48)
  id = 'e8prepf002-4d10-4a6f-b8c3-emea00000002'
  name = 'Check Pre-PF Eligibility'
}

$rejectNode = [ordered]@{
  parameters = [ordered]@{ mode = 'runOnceForEachItem'; jsCode = $rejectJsCode }
  type = 'n8n-nodes-base.code'
  typeVersion = 2
  position = @(-528, -144)
  id = 'e8prepf003-4d10-4a6f-b8c3-emea00000003'
  name = 'Build Pre-PF Eligibility Reject Record'
}

foreach ($node in @($gateNode, $checkNode, $rejectNode)) {
  $idx = -1
  for ($i = 0; $i -lt $workflow.nodes.Count; $i++) {
    if ($workflow.nodes[$i].name -eq $node.name) {
      $idx = $i
      break
    }
  }
  if ($idx -ge 0) {
    $workflow.nodes[$idx] = $node
  } else {
    $workflow.nodes += $node
  }
}

$previewNode = $workflow.nodes | Where-Object { $_.name -eq 'Preview Score Job' } | Select-Object -First 1
if ($previewNode) {
  $previewNode.parameters.jsCode = $previewNode.parameters.jsCode.Replace(
    'const PreviewScoreThreshold = 5;',
    'const PreviewScoreThreshold = 3;'
  )
}

$langGate = $workflow.nodes | Where-Object { $_.name -eq 'Mandatory Language Gate' } | Select-Object -First 1
if ($langGate) {
  $langGate.parameters.jsCode = $passThroughLanguageGateJsCode
}

$normOut = $workflow.nodes | Where-Object { $_.name -eq 'Normalize Output Record' } | Select-Object -First 1
if ($normOut) {
  $normOut.parameters.jsCode = $normOut.parameters.jsCode.Replace(
    "['MANDATORY_TRAVEL','MANDATORY_DOMAIN','MANDATORY_LANGUAGE','CLOSED_POSTING','COUNTRY_ELIGIBILITY']",
    "['MANDATORY_TRAVEL','MANDATORY_DOMAIN','MANDATORY_LANGUAGE','CLOSED_POSTING','COUNTRY_ELIGIBILITY','WORK_AUTHORIZATION_REQUIRED','COUNTRY_RESIDENCY_REQUIRED','COUNTRY_REMOTE_ONLY']"
  )
}

$conn = @{}
$workflow.connections.PSObject.Properties | ForEach-Object { $conn[$_.Name] = $_.Value }

$conn['Check Posting Closed'] = [ordered]@{
  main = @(
    ,@([ordered]@{ node = 'Build Closed Posting Reject Record'; type = 'main'; index = 0 })
    ,@([ordered]@{ node = 'Pre-PF Eligibility Gate'; type = 'main'; index = 0 })
  )
}

$conn['Pre-PF Eligibility Gate'] = [ordered]@{
  main = @(,@([ordered]@{ node = 'Check Pre-PF Eligibility'; type = 'main'; index = 0 }))
}

$conn['Check Pre-PF Eligibility'] = [ordered]@{
  main = @(
    ,@([ordered]@{ node = 'Build Pre-PF Eligibility Reject Record'; type = 'main'; index = 0 })
    ,@([ordered]@{ node = 'AI - Professional Fit'; type = 'main'; index = 0 })
  )
}

$conn['Build Pre-PF Eligibility Reject Record'] = [ordered]@{
  main = @(,@([ordered]@{ node = 'Merge Final Records'; type = 'main'; index = 1 }))
}

$workflow.connections = $conn

$json = $workflow | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($workflowPath, "$json`n", (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'Patched Executive-Job-CRM-v1.1-DEV.json with Pre-PF eligibility gate.'
