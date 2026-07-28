const { evaluatePrePfEligibilityGate } = require('./_emea_pre_pf_eligibility');
const {
  computePreviewPassesThreshold,
  routeAfterPreviewGate,
} = require('./_emea_preview_threshold');

const PAD =
  'Additional posting context padding text for minimum length requirement.';

const pad = (text) => {
  const base = String(text || '').trim();
  if (base.length >= 200) return base;
  let out = base;
  while (out.length < 200) out += ` ${PAD}`;
  return out;
};

const prePfCases = [
  {
    id: 'R1',
    group: 'PASS',
    location: 'UK Remote',
    text: 'This role is Europe-wide remote with flexible collaboration.',
    expectBlocked: false,
    expectReason: '',
    expectGate: 'PASS',
  },
  {
    id: 'R2',
    group: 'PASS',
    location: 'UK Remote',
    text: 'We are hiring for an EMEA remote leadership position.',
    expectBlocked: false,
    expectReason: '',
    expectGate: 'PASS',
  },
  {
    id: 'R3',
    group: 'PASS',
    location: 'Germany Remote',
    text: 'Location flexible across Europe for senior operators.',
    expectBlocked: false,
    expectReason: '',
    expectGate: 'PASS',
  },
  {
    id: 'R4',
    group: 'PASS',
    location: 'Spain Remote',
    text: 'Work from any EU country with quarterly onsite reviews.',
    expectBlocked: false,
    expectReason: '',
    expectGate: 'PASS',
  },
  {
    id: 'R5',
    group: 'REJECT-WORK-AUTH',
    location: 'UK Remote',
    text: 'Candidates must have the right to work in the UK without sponsorship.',
    expectBlocked: true,
    expectReason: 'WORK_AUTHORIZATION_REQUIRED',
    expectGate: 'WORK_AUTHORIZATION_REQUIRED',
  },
  {
    id: 'R6',
    group: 'REJECT-RESIDENCY',
    location: 'Germany Remote',
    text: 'Germany residents only. Strong leadership background required.',
    expectBlocked: true,
    expectReason: 'COUNTRY_RESIDENCY_REQUIRED',
    expectGate: 'COUNTRY_RESIDENCY_REQUIRED',
  },
  {
    id: 'R7',
    group: 'PASS-EU',
    location: 'Germany Remote',
    text: 'EU nationals only. Executive operations leadership role.',
    expectBlocked: false,
    expectReason: '',
    expectGate: 'PASS',
  },
  {
    id: 'R8',
    group: 'PASS-EU',
    location: 'France Remote',
    text: 'Eligible to work in the EU required for this distributed team.',
    expectBlocked: false,
    expectReason: '',
    expectGate: 'PASS',
  },
  {
    id: 'R9',
    group: 'REVIEW-ENRICHMENT-FAIL',
    location: 'UK Remote',
    text: '',
    enrichmentStatus: 'HTTP_ERROR',
    expectBlocked: false,
    expectReason: '',
    expectGate: 'COUNTRY_REMOTE_ELIGIBILITY_UNKNOWN',
    expectLocationFit: 'REVIEW_REQUIRED',
  },
  {
    id: 'R10',
    group: 'REJECT-REMOTE-ONLY',
    location: 'UK Remote',
    text: 'Hybrid executive role with quarterly leadership reviews in London.',
    expectBlocked: true,
    expectReason: 'COUNTRY_REMOTE_ONLY',
    expectGate: 'COUNTRY_REMOTE_ONLY',
  },
];

const previewCases = [
  {
    id: 'P-PREVIEW-2',
    group: 'PREVIEW_REJECT',
    aiPreviewScore: 2,
    expectPass: false,
    expectRoute: 'PREVIEW_REJECT',
  },
  {
    id: 'P-PREVIEW-3',
    group: 'ENRICHMENT',
    aiPreviewScore: 3,
    expectPass: true,
    expectRoute: 'ENRICHMENT',
  },
];

let failed = 0;

console.log('Pre-PF eligibility gate cases\n');

for (const testCase of prePfCases) {
  const result = evaluatePrePfEligibilityGate({
    fullJobText: pad(testCase.text),
    enrichmentStatus: testCase.enrichmentStatus || 'OK',
    location: testCase.location,
    emailSnippet: '',
  });

  const reasonOk =
    testCase.expectReason === ''
      ? !result.auto_reject_reason
      : result.auto_reject_reason === testCase.expectReason;
  const gateOk = result.PrePfEligibilityGate === testCase.expectGate;
  const locationFitOk =
    testCase.expectLocationFit === undefined ||
    result.LocationFit === testCase.expectLocationFit;
  const ok =
    result.PrePfEligibilityBlocked === testCase.expectBlocked &&
    reasonOk &&
    gateOk &&
    locationFitOk;

  if (!ok) failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} [${testCase.id}/${testCase.group}] blocked=${result.PrePfEligibilityBlocked} gate=${result.PrePfEligibilityGate} reason=${result.auto_reject_reason || 'none'} locationFit=${result.LocationFit || 'none'}`,
  );
}

console.log('\nPreview threshold gate cases\n');

for (const testCase of previewCases) {
  const pass = computePreviewPassesThreshold({
    aiPreviewScore: testCase.aiPreviewScore,
    qualifiesForExecOpsFloor: false,
  });
  const route = routeAfterPreviewGate(pass);
  const ok = pass === testCase.expectPass && route === testCase.expectRoute;

  if (!ok) failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} [${testCase.id}/${testCase.group}] score=${testCase.aiPreviewScore} pass=${pass} route=${route}`,
  );
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} pre-PF / preview case(s) failed.`);
} else {
  console.log(
    `\nAll ${prePfCases.length + previewCases.length} pre-PF and preview cases passed.`,
  );
}
