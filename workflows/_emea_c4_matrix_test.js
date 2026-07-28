const { evaluateCountryEligibilityGate } = require('./_emea_c4_country_gate');

const PAD = 'Additional posting context padding text for minimum length requirement.';

const pad = (text) => {
  const base = String(text || '').trim();
  if (base.length >= 200) return base;
  let out = base;
  while (out.length < 200) out += ` ${PAD}`;
  return out;
};

const cases = [
  {
    id: 'A1',
    group: 'BLOCK-A',
    text: 'Remote work permitted in the UK and Germany only.',
    expectBlocked: true,
    expectBlockType: 'REMOTE_COUNTRY_LIST',
  },
  {
    id: 'A2',
    group: 'BLOCK-A',
    text: 'Role may be performed remotely only from Spain or Portugal.',
    expectBlocked: true,
    expectBlockType: 'REMOTE_COUNTRY_LIST',
  },
  {
    id: 'A3',
    group: 'PASS',
    text: 'Remote Europe — anywhere in the EU.',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'A4',
    group: 'PASS',
    text: 'Remote EMEA; flexible working arrangements.',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'A5',
    group: 'PASS',
    text: 'Remote work is permitted in Bulgaria, Romania, and Greece.',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'A6',
    group: 'PASS',
    text: 'Fully remote worldwide role with flexible hours.',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'B1',
    group: 'BLOCK-B',
    text: 'Must be resident in the United Kingdom.',
    expectBlocked: true,
    expectBlockType: 'EXPLICIT_ELIGIBILITY',
  },
  {
    id: 'B2',
    group: 'BLOCK-B',
    text: 'German citizenship required.',
    expectBlocked: true,
    expectBlockType: 'EXPLICIT_ELIGIBILITY',
  },
  {
    id: 'B3',
    group: 'BLOCK-B',
    text: 'UK nationals only.',
    expectBlocked: true,
    expectBlockType: 'EXPLICIT_ELIGIBILITY',
  },
  {
    id: 'B4',
    group: 'PASS',
    text: 'German work authorization required.',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'B5',
    group: 'PASS',
    text: 'EU citizenship required.',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'B6',
    group: 'PASS',
    text: 'Bulgarian citizenship required.',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'B7',
    group: 'PASS',
    text: 'UK residency preferred.',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'F1',
    group: 'PASS',
    text: 'Remote work permitted in the UK and Germany only.',
    enrichmentStatus: 'FAILED',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'F2',
    group: 'PASS',
    text: 'Remote work permitted in the UK and Germany only.',
    rawText: true,
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'I1',
    group: 'PASS',
    text: 'Fluent German required for this role.',
    expectBlocked: false,
    expectBlockType: '',
  },
  {
    id: 'I2',
    group: 'PASS',
    text: 'Senior operations leadership role with broad EMEA scope.',
    expectBlocked: false,
    expectBlockType: '',
  },
];

let failed = 0;
for (const testCase of cases) {
  const fullJobText =
    testCase.rawText === true
      ? String(testCase.text || '').trim()
      : pad(testCase.text);
  const result = evaluateCountryEligibilityGate(
    fullJobText,
    testCase.enrichmentStatus ?? 'OK',
  );

  const blockedOk = result.CountryListRemoteBlocked === testCase.expectBlocked;
  const typeOk =
    (result.CountryEligibilityBlockType || '') === (testCase.expectBlockType || '');
  const pass = blockedOk && typeOk;

  if (!pass) failed += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'} [${testCase.id}/${testCase.group}] ${testCase.text} => blocked=${result.CountryListRemoteBlocked} type=${result.CountryEligibilityBlockType || "''"}${result.CountryListRemoteRejectReason ? ` reason=${result.CountryListRemoteRejectReason}` : ''}`,
  );
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} matrix case(s) failed.`);
} else {
  console.log(`\nAll ${cases.length} matrix cases passed.`);
}
