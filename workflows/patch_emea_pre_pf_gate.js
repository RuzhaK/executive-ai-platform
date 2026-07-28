#!/usr/bin/env node
/**
 * Patches Executive-Job-CRM-v1.1-DEV.json with Pre-PF eligibility gate nodes.
 * Run from repo root: node workflows/patch_emea_pre_pf_gate.js
 */
const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, 'Executive-Job-CRM-v1.1-DEV.json');
const c3Path = path.join(__dirname, '_emea_c3_language_gate.js');
const prePfPath = path.join(__dirname, '_emea_pre_pf_eligibility.js');

const stripModule = (source) =>
  source
    .replace(/^const \{ evaluateLanguageGate \} = require\([^)]+\);\n?/m, '')
    .replace(/\nmodule\.exports[\s\S]*$/m, '')
    .replace(/^module\.exports[\s\S]*$/m, '');

const removeSharedConsts = (source) =>
  source
    .replace(/^const MIN_FULL_JOB_TEXT = 200;\n\n/m, '')
    .replace(/const SOFT_PREFERENCE_ONLY[\s\S]*?;\n\n/m, '')
    .trimEnd();

const preparePrePfBody = (source) => {
  let body = source
    .replace(/const isSoftPreferenceChunk[\s\S]*?;\n\n/m, '')
    .replace(/isSoftPreferenceChunk\(/g, 'isPrePfSoftPreferenceChunk(');
  const prelude = `const isPrePfSoftPreferenceChunk = (chunk) =>
  SOFT_PREFERENCE_ONLY.test(chunk) &&
  !/\\b(required|mandatory|essential|must|only|non-negotiable)\\b/i.test(chunk);

`;
  return `${prelude}${body}`.trimEnd();
};

const sharedHeader = `const MIN_FULL_JOB_TEXT = 200;

const SOFT_PREFERENCE_ONLY =
  /\\b(preferred|nice to have|highly desirable|desirable|advantageous|a plus|ideally|would be (?:a )?bonus|helpful|beneficial|bonus)\\b/i;

`;

const c3Body = removeSharedConsts(stripModule(fs.readFileSync(c3Path, 'utf8')));
const prePfBody = preparePrePfBody(removeSharedConsts(stripModule(fs.readFileSync(prePfPath, 'utf8'))));

const gateJsCode = `// EMEA pre-PF eligibility — keep in sync with _emea_pre_pf_eligibility.js + _emea_c3_language_gate.js
${sharedHeader}${c3Body}

${prePfBody}

const card = $('Parse Job Cards').item?.json || {};
const result = evaluatePrePfEligibilityGate({
  fullJobText: String($json.FullJobText || '').trim(),
  enrichmentStatus: $json.EnrichmentStatus,
  location: $json.Location || card.Location || '',
  emailSnippet: card.EmailSnippet || $json.EmailSnippet || '',
});

return {
  json: {
    ...$json,
    ...result,
  },
};
`;

const rejectJsCode = `// Pre-PF eligibility FINAL_REJECT — skips Professional Fit and Verified AI.
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
`;

const passThroughLanguageGateJsCode = `// Mandatory language evaluated in Pre-PF Eligibility Gate (before Professional Fit).
return {
  json: {
    ...$json,
    MandatoryLanguageBlocked: false,
    MandatoryLanguageRejectReason: '',
    MandatoryLanguageLabel: '',
    MandatoryLanguageGateSkipped: true,
  },
};
`;

const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const gateNode = {
  parameters: {
    mode: 'runOnceForEachItem',
    jsCode: gateJsCode,
  },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [-784, -48],
  id: 'e8prepf001-4d10-4a6f-b8c3-emea00000001',
  name: 'Pre-PF Eligibility Gate',
};

const checkNode = {
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'loose',
        version: 3,
      },
      conditions: [
        {
          id: 'emea-pre-pf-eligibility-blocked',
          leftValue: '={{$json.PrePfEligibilityBlocked}}',
          rightValue: '',
          operator: {
            type: 'boolean',
            operation: 'true',
            singleValue: true,
          },
        },
      ],
      combinator: 'and',
    },
    looseTypeValidation: true,
    options: {},
  },
  type: 'n8n-nodes-base.if',
  typeVersion: 2.3,
  position: [-656, -48],
  id: 'e8prepf002-4d10-4a6f-b8c3-emea00000002',
  name: 'Check Pre-PF Eligibility',
};

const rejectNode = {
  parameters: {
    mode: 'runOnceForEachItem',
    jsCode: rejectJsCode,
  },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [-528, -144],
  id: 'e8prepf003-4d10-4a6f-b8c3-emea00000003',
  name: 'Build Pre-PF Eligibility Reject Record',
};

const existingNames = new Set(workflow.nodes.map((n) => n.name));
for (const node of [gateNode, checkNode, rejectNode]) {
  if (!existingNames.has(node.name)) {
    workflow.nodes.push(node);
  } else {
    const idx = workflow.nodes.findIndex((n) => n.name === node.name);
    workflow.nodes[idx] = node;
  }
}

const previewScoreJob = workflow.nodes.find((n) => n.name === 'Preview Score Job');
if (previewScoreJob) {
  previewScoreJob.parameters.jsCode = previewScoreJob.parameters.jsCode.replace(
    'const PreviewScoreThreshold = 5;',
    'const PreviewScoreThreshold = 3;',
  );
}

const langGate = workflow.nodes.find((n) => n.name === 'Mandatory Language Gate');
if (langGate) {
  langGate.parameters.jsCode = passThroughLanguageGateJsCode;
}

const normOut = workflow.nodes.find((n) => n.name === 'Normalize Output Record');
if (normOut) {
  normOut.parameters.jsCode = normOut.parameters.jsCode.replace(
    "['MANDATORY_TRAVEL','MANDATORY_DOMAIN','MANDATORY_LANGUAGE','CLOSED_POSTING','COUNTRY_ELIGIBILITY']",
    "['MANDATORY_TRAVEL','MANDATORY_DOMAIN','MANDATORY_LANGUAGE','CLOSED_POSTING','COUNTRY_ELIGIBILITY','WORK_AUTHORIZATION_REQUIRED','COUNTRY_RESIDENCY_REQUIRED','COUNTRY_REMOTE_ONLY']",
  );
}

workflow.connections['Check Posting Closed'] = {
  main: [
    [
      {
        node: 'Build Closed Posting Reject Record',
        type: 'main',
        index: 0,
      },
    ],
    [
      {
        node: 'Pre-PF Eligibility Gate',
        type: 'main',
        index: 0,
      },
    ],
  ],
};

workflow.connections['Pre-PF Eligibility Gate'] = {
  main: [
    [
      {
        node: 'Check Pre-PF Eligibility',
        type: 'main',
        index: 0,
      },
    ],
  ],
};

workflow.connections['Check Pre-PF Eligibility'] = {
  main: [
    [
      {
        node: 'Build Pre-PF Eligibility Reject Record',
        type: 'main',
        index: 0,
      },
    ],
    [
      {
        node: 'AI - Professional Fit',
        type: 'main',
        index: 0,
      },
    ],
  ],
};

workflow.connections['Build Pre-PF Eligibility Reject Record'] = {
  main: [
    [
      {
        node: 'Merge Final Records',
        type: 'main',
        index: 1,
      },
    ],
  ],
};

fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
console.log('Patched Executive-Job-CRM-v1.1-DEV.json with Pre-PF eligibility gate.');
