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
  $out = $out -replace '(?s)const SOFT_PREFERENCE_ONLY[\s\S]*?;\r?\n\r?\n', ''
  return $out.TrimEnd()
}

function Prepare-PrePfBody([string]$source) {
  $out = $source
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

function ConvertTo-JsonString([string]$value) {
  return (ConvertTo-Json -Compress $value)
}

$gateJson = ConvertTo-JsonString $gateJsCode
$rejectJson = ConvertTo-JsonString $rejectJsCode
$passLangJson = ConvertTo-JsonString $passThroughLanguageGateJsCode

$nodesInsert = @"
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": $gateJson
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -784,
        -48
      ],
      "id": "e8prepf001-4d10-4a6f-b8c3-emea00000001",
      "name": "Pre-PF Eligibility Gate"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "loose",
            "version": 3
          },
          "conditions": [
            {
              "id": "emea-pre-pf-eligibility-blocked",
              "leftValue": "={{$json.PrePfEligibilityBlocked}}",
              "rightValue": "",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "looseTypeValidation": true,
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.3,
      "position": [
        -656,
        -48
      ],
      "id": "e8prepf002-4d10-4a6f-b8c3-emea00000002",
      "name": "Check Pre-PF Eligibility"
    },
    {
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": $rejectJson
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -528,
        -144
      ],
      "id": "e8prepf003-4d10-4a6f-b8c3-emea00000003",
      "name": "Build Pre-PF Eligibility Reject Record"
    },
"@

$wf = Get-Content -Raw -Path $workflowPath

if ($wf -notmatch 'Pre-PF Eligibility Gate') {
  $anchor = '        "name":  "AI - Professional Fit",'
  if ($wf -notmatch [regex]::Escape($anchor)) {
    throw 'Could not find AI - Professional Fit node anchor for insertion.'
  }
  $wf = $wf.Replace($anchor, ($nodesInsert + $anchor))
}

$oldPostingClosedConn = @'
    "Check Posting Closed": {
      "main": [
        [
          {
            "node": "Build Closed Posting Reject Record",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "AI - Professional Fit",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
'@

$newPostingClosedConn = @'
    "Check Posting Closed": {
      "main": [
        [
          {
            "node": "Build Closed Posting Reject Record",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Pre-PF Eligibility Gate",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Pre-PF Eligibility Gate": {
      "main": [
        [
          {
            "node": "Check Pre-PF Eligibility",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Pre-PF Eligibility": {
      "main": [
        [
          {
            "node": "Build Pre-PF Eligibility Reject Record",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "AI - Professional Fit",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Pre-PF Eligibility Reject Record": {
      "main": [
        [
          {
            "node": "Merge Final Records",
            "type": "main",
            "index": 1
          }
        ]
      ]
    },
'@

if ($wf.Contains($oldPostingClosedConn)) {
  $wf = $wf.Replace($oldPostingClosedConn, $newPostingClosedConn)
}

$wf = $wf.Replace('const PreviewScoreThreshold = 5;', 'const PreviewScoreThreshold = 3;')
$wf = $wf.Replace('(default 5).', '(default 3; reject at <=2).')

$wf = $wf.Replace(
  "['MANDATORY_TRAVEL','MANDATORY_DOMAIN','MANDATORY_LANGUAGE','CLOSED_POSTING','COUNTRY_ELIGIBILITY']",
  "['MANDATORY_TRAVEL','MANDATORY_DOMAIN','MANDATORY_LANGUAGE','CLOSED_POSTING','COUNTRY_ELIGIBILITY','WORK_AUTHORIZATION_REQUIRED','COUNTRY_RESIDENCY_REQUIRED','COUNTRY_REMOTE_ONLY']"
)

# Replace Mandatory Language Gate jsCode (post-PF pass-through; evaluated in Pre-PF gate).
$nameMarker = '"name": "Mandatory Language Gate"'
$nameIdx = $wf.IndexOf($nameMarker)
if ($nameIdx -ge 0) {
  $jsKey = '"jsCode": "'
  $jsStart = $wf.LastIndexOf($jsKey, $nameIdx)
  if ($jsStart -ge 0) {
    $valueStart = $jsStart + $jsKey.Length
    $typeMarker = '",
      },
      "type": "n8n-nodes-base.code"'
    $valueEnd = $wf.IndexOf($typeMarker, $valueStart)
    if ($valueEnd -gt $valueStart) {
      $escaped = (ConvertTo-Json -Compress $passThroughLanguageGateJsCode)
      $inner = $escaped.Substring(1, $escaped.Length - 2)
      $wf = $wf.Substring(0, $valueStart) + $inner + $wf.Substring($valueEnd)
    }
  }
}

[System.IO.File]::WriteAllText($workflowPath, $wf, (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'Minimally patched Executive-Job-CRM-v1.1-DEV.json.'
