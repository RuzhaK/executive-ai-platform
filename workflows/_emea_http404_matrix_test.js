const {
  evaluateExtractClosedPosting,
  resolveHttpStatusCode,
  routeAfterExtract,
  shouldSkipProfessionalFit,
  CLOSED_POSTING_ROUTE,
  OPEN_POSTING_ROUTE,
} = require('./_emea_http404_enrichment');

const httpCases = [
  {
    id: 'H1',
    group: 'HTTP404',
    input: { httpJson: { statusCode: 404, body: '' } },
    expectClosed: true,
    expectStatusCode: 404,
    expectEnrichmentError: 'HTTP 404',
    expectRoute: CLOSED_POSTING_ROUTE,
  },
  {
    id: 'H2',
    group: 'HTTP410',
    input: { httpJson: { statusCode: 410, body: '' } },
    expectClosed: true,
    expectStatusCode: 410,
    expectEnrichmentError: 'HTTP 410',
    expectRoute: CLOSED_POSTING_ROUTE,
  },
  {
    id: 'H3',
    group: 'HTTP404',
    input: { httpJson: { error: { httpCode: '404', message: '404 - Not Found' } } },
    expectClosed: true,
    expectStatusCode: 404,
    expectEnrichmentError: 'HTTP 404',
    expectRoute: CLOSED_POSTING_ROUTE,
  },
  {
    id: 'H4',
    group: 'PASS',
    input: { httpJson: { statusCode: 200, body: '<html>open posting</html>' } },
    expectClosed: false,
    expectStatusCode: 200,
    expectEnrichmentError: '',
    expectRoute: OPEN_POSTING_ROUTE,
  },
  {
    id: 'H5',
    group: 'FAIL-OPEN',
    input: { httpJson: { statusCode: 403, body: '' } },
    expectClosed: false,
    expectStatusCode: 403,
    expectEnrichmentError: 'HTTP 403',
    expectRoute: OPEN_POSTING_ROUTE,
  },
  {
    id: 'H6',
    group: 'FAIL-OPEN',
    input: { httpJson: { statusCode: 429, body: '' } },
    expectClosed: false,
    expectStatusCode: 429,
    expectEnrichmentError: 'HTTP 429',
    expectRoute: OPEN_POSTING_ROUTE,
  },
  {
    id: 'H7',
    group: 'HTML-C6',
    input: {
      httpJson: { statusCode: 200, body: '<div class="closed-job__flavor--closed">Closed</div>' },
    },
    expectClosed: true,
    expectStatusCode: 200,
    expectEnrichmentError: '',
    expectRoute: CLOSED_POSTING_ROUTE,
  },
];

let failed = 0;

for (const testCase of httpCases) {
  const statusCode = resolveHttpStatusCode(testCase.input.httpJson);
  const result = evaluateExtractClosedPosting(testCase.input);
  const route = routeAfterExtract(result);
  const skipPf = shouldSkipProfessionalFit(result);

  const pass =
    result.PostingClosedConfirmed === testCase.expectClosed &&
    statusCode === testCase.expectStatusCode &&
    result.EnrichmentError === testCase.expectEnrichmentError &&
    route === testCase.expectRoute &&
    skipPf === testCase.expectClosed &&
    (testCase.expectClosed
      ? result.PostingClosedRejectReason === 'Closed' &&
        result.EnrichmentStatus === 'FAILED'
      : true);

  if (!pass) failed += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'} [${testCase.id}/${testCase.group}] status=${statusCode} closed=${result.PostingClosedConfirmed} route=${route} skipPF=${skipPf} err=${result.EnrichmentError || "''"}`,
  );
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} HTTP404 matrix case(s) failed.`);
} else {
  console.log(`\nAll ${httpCases.length} HTTP404 matrix cases passed.`);
}
