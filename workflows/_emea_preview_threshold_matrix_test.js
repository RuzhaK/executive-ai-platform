const {
  PREVIEW_SCORE_THRESHOLD,
  computePreviewPassesThreshold,
  routeAfterPreviewGate,
} = require('./_emea_preview_threshold');

const cases = [
  {
    id: 'P1',
    group: 'REJECT',
    aiPreviewScore: 2,
    qualifiesForExecOpsFloor: false,
    expectPass: false,
    expectRoute: 'PREVIEW_REJECT',
  },
  {
    id: 'P2',
    group: 'ENRICH',
    aiPreviewScore: 3,
    qualifiesForExecOpsFloor: false,
    expectPass: true,
    expectRoute: 'ENRICHMENT',
  },
  {
    id: 'P3',
    group: 'ENRICH',
    aiPreviewScore: 4,
    qualifiesForExecOpsFloor: false,
    expectPass: true,
    expectRoute: 'ENRICHMENT',
  },
  {
    id: 'P4',
    group: 'ENRICH',
    aiPreviewScore: 5,
    qualifiesForExecOpsFloor: false,
    expectPass: true,
    expectRoute: 'ENRICHMENT',
  },
  {
    id: 'P5',
    group: 'ENRICH',
    aiPreviewScore: 7,
    qualifiesForExecOpsFloor: false,
    expectPass: true,
    expectRoute: 'ENRICHMENT',
  },
  {
    id: 'P6',
    group: 'EXEC-OPS-FLOOR',
    aiPreviewScore: 2,
    qualifiesForExecOpsFloor: true,
    expectPass: true,
    expectRoute: 'ENRICHMENT',
  },
  {
    id: 'P7',
    group: 'REJECT',
    aiPreviewScore: 1,
    qualifiesForExecOpsFloor: false,
    expectPass: false,
    expectRoute: 'PREVIEW_REJECT',
  },
];

let failed = 0;

console.log(`PreviewScoreThreshold=${PREVIEW_SCORE_THRESHOLD} (reject when score <= 2)\n`);

for (const testCase of cases) {
  const pass = computePreviewPassesThreshold({
    aiPreviewScore: testCase.aiPreviewScore,
    qualifiesForExecOpsFloor: testCase.qualifiesForExecOpsFloor,
  });
  const route = routeAfterPreviewGate(pass);
  const ok =
    pass === testCase.expectPass && route === testCase.expectRoute;

  if (!ok) failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} [${testCase.id}/${testCase.group}] score=${testCase.aiPreviewScore} execOpsFloor=${testCase.qualifiesForExecOpsFloor} pass=${pass} route=${route}`,
  );
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} preview threshold case(s) failed.`);
} else {
  console.log(`\nAll ${cases.length} preview threshold cases passed.`);
}
