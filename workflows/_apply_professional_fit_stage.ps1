# Applies Professional Fit stage to Executive-Job-CRM-v1.1-DEV.json using surgical edits.
# Inserts AI - Professional Fit + Normalize Professional Fit after Extract LinkedIn Job Description
# and before Check Posting Closed (first eligibility gate on enriched path).

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
$wfPath = Join-Path $PSScriptRoot 'Executive-Job-CRM-v1.1-DEV.json'
$promptPath = Join-Path $repoRoot 'docs\ProfessionalFitPrompt_v2.2.md'

if (-not (Test-Path $wfPath)) { throw "Workflow not found: $wfPath" }
if (-not (Test-Path $promptPath)) { throw "Prompt not found: $promptPath" }

$raw = Get-Content $wfPath -Raw -Encoding UTF8
$beforeWf = $raw | ConvertFrom-Json
$nodesBefore = $beforeWf.nodes.Count
if ($beforeWf.nodes.name -contains 'AI - Professional Fit') {
    throw 'AI - Professional Fit already exists - aborting duplicate patch'
}

$promptMd = Get-Content $promptPath -Raw -Encoding UTF8
if ($promptMd -notmatch '(?s)## Prompt body\s*\r?\n\r?\n```\r?\n([\s\S]*?)\r?\n```') {
    throw 'Could not extract Professional Fit prompt body from ProfessionalFitPrompt_v2.2.md'
}

$promptBody = $Matches[1]
$promptBody = $promptBody.Replace('{{Role}}', '{{$json.Role}}')
$promptBody = $promptBody.Replace('{{Company}}', '{{$json.Company}}')
$promptBody = $promptBody.Replace('{{FullJobText}}', '{{$json.FullJobText}}')
$promptBody = $promptBody.Replace('{{Notes}}', '{{$json.Notes}}')
$promptExpr = '=' + $promptBody

$normalizeJs = @'
// PROFESSIONAL FIT STAGE: role quality only - separate from Verified/eligibility fields.
// Adds ProfessionalFit* fields to the existing job item; never replaces Verified* fields.
const enrichmentContext = $('Extract LinkedIn Job Description').item?.json || {};
const evalContext = $('Normalize AI Evaluation').item?.json || {};
const original = {
  ...evalContext,
  ...enrichmentContext,
  FullJobText: enrichmentContext.FullJobText ?? evalContext.FullJobText ?? '',
  FullJobTextLength: enrichmentContext.FullJobTextLength ?? evalContext.FullJobTextLength ?? 0,
  EnrichmentStatus: enrichmentContext.EnrichmentStatus ?? evalContext.EnrichmentStatus ?? '',
  EnrichmentError: enrichmentContext.EnrichmentError ?? evalContext.EnrichmentError ?? '',
  PostingClosedConfirmed: enrichmentContext.PostingClosedConfirmed ?? evalContext.PostingClosedConfirmed ?? false,
  PostingClosedRejectReason: enrichmentContext.PostingClosedRejectReason ?? evalContext.PostingClosedRejectReason ?? '',
};

const blankProfessionalFit = () => ({
  ProfessionalFitScore: '',
  ProfessionalFitDimensionScores: '',
  ProfessionalFitStrengths: '',
  ProfessionalFitGaps: '',
  ProfessionalFitReasoning: '',
  ProfessionalFitError: '',
});

const clampScore = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
};

const raw =
  $json.output?.[0]?.content?.[0]?.text ||
  $json.output?.[0]?.text ||
  $json.content?.[0]?.text ||
  $json.text ||
  $json.response ||
  $json.message ||
  '';

let clean = String(raw)
  .replace(/```json/gi, '')
  .replace(/```/g, '')
  .trim();

const firstBrace = clean.indexOf('{');
const lastBrace = clean.lastIndexOf('}');
if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
  clean = clean.slice(firstBrace, lastBrace + 1);
}

let ai;
try {
  ai = JSON.parse(clean);
} catch (e) {
  return {
    json: {
      ...original,
      ...blankProfessionalFit(),
      ProfessionalFitError: `Professional Fit returned invalid JSON: ${e.message}`,
    },
  };
}

const dimensionKeys = [
  'strategic_scope',
  'executive_seniority',
  'functional_match',
  'leadership',
  'domain_alignment',
  'ai_transformation',
  'technical_match',
  'career_progression',
];

const dimensionScores = {};
for (const key of dimensionKeys) {
  const score = clampScore(ai?.dimension_scores?.[key]);
  dimensionScores[key] = Number.isFinite(score) ? score : '';
}

const overall = clampScore(ai?.professional_fit_score);

return {
  json: {
    ...original,
    ProfessionalFitScore: Number.isFinite(overall) ? overall : '',
    ProfessionalFitDimensionScores: JSON.stringify(dimensionScores),
    ProfessionalFitStrengths: String(ai?.primary_strengths || '').trim(),
    ProfessionalFitGaps: String(ai?.primary_fit_gap || '').trim(),
    ProfessionalFitReasoning: String(ai?.scoring_rationale || '').trim(),
    ProfessionalFitError: '',
  },
};
'@

$aiNodeObj = [ordered]@{
    parameters = [ordered]@{
        modelId = [ordered]@{ __rl = $true; value = 'gpt-4.1-mini'; mode = 'list'; cachedResultName = 'GPT-4.1-MINI' }
        responses = [ordered]@{ values = @([ordered]@{ content = $promptExpr }) }
        builtInTools = [ordered]@{}
        options = [ordered]@{
            instructions = "Return ONLY valid JSON.`nDo not include explanations.`nDo not use markdown."
            maxTokens = 1200
            temperature = 0
        }
    }
    type = '@n8n/n8n-nodes-langchain.openAi'
    typeVersion = 2.3
    position = @(-968, -48)
    id = 'pf1a0001-0001-4001-8001-emea00000001'
    name = 'AI - Professional Fit'
    credentials = [ordered]@{ openAiApi = [ordered]@{ id = '7dUCHr2ifwfK2pVa'; name = 'OpenAI account' } }
}

$normNodeObj = [ordered]@{
    parameters = [ordered]@{ mode = 'runOnceForEachItem'; jsCode = $normalizeJs }
    type = 'n8n-nodes-base.code'
    typeVersion = 2
    position = @(-968, 96)
    id = 'pf1a0002-0002-4002-8002-emea00000002'
    name = 'Normalize Professional Fit'
}

$aiNodeJson = ($aiNodeObj | ConvertTo-Json -Depth 20 -Compress:$false) -replace "`r`n", "`n" -replace '^', '    ' -replace "`n", "`r`n    "
$normNodeJson = ($normNodeObj | ConvertTo-Json -Depth 20 -Compress:$false) -replace "`r`n", "`n" -replace '^', '    ' -replace "`n", "`r`n    "
$nodesInsert = ",`r`n$aiNodeJson,`r`n$normNodeJson"

$beforeCount = $nodesBefore
if ($beforeCount -ne 60) { throw "Expected 60 nodes before patch, found $beforeCount" }

$marker = "    }`r`n  ],`r`n  `"pinData`": {"
if (-not $raw.Contains($marker)) { throw 'Could not find nodes/pinData insertion marker' }
$raw = $raw.Replace($marker, "    }$nodesInsert`r`n  ],`r`n  `"pinData`": {")

$extractOld = "    `"Extract LinkedIn Job Description`": {`r`n      `"main`": [`r`n        [`r`n          {`r`n            `"node`": `"Check Posting Closed`",`r`n            `"type`": `"main`",`r`n            `"index`": 0`r`n          }`r`n        ]`r`n      ]`r`n    },"

$extractNew = @"
    "Extract LinkedIn Job Description": {
      "main": [
        [
          {
            "node": "AI - Professional Fit",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI - Professional Fit": {
      "main": [
        [
          {
            "node": "Normalize Professional Fit",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Normalize Professional Fit": {
      "main": [
        [
          {
            "node": "Check Posting Closed",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
"@ -replace "`n", "`r`n"

if (-not $raw.Contains('"node": "Check Posting Closed"')) {
    if ($raw.Contains('"node": "AI - Professional Fit"')) {
        throw 'Extract LinkedIn Job Description connection already patched'
    }
    throw 'Extract LinkedIn Job Description connection block not found'
}
$raw = $raw.Replace($extractOld, $extractNew)

[System.IO.File]::WriteAllText($wfPath, $raw, [System.Text.UTF8Encoding]::new($false))

try {
    Get-Content $wfPath -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
    $valid = 'yes'
} catch {
    $valid = "no: $($_.Exception.Message)"
}

$after = Get-Content $wfPath -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Output "PATCH_OK=yes"
Write-Output "nodes_before=$nodesBefore"
Write-Output "nodes_after=$($after.nodes.Count)"
Write-Output "JSON_VALID=$valid"
Write-Output "prompt_chars=$($promptBody.Length)"
