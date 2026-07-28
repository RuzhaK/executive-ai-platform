const { evaluateLanguageGate } = require('./_emea_c3_language_gate');

const PAD = 'Additional posting context padding text for minimum length requirement.';

const pad = (text) => {
  const base = String(text || '').trim();
  if (base.length >= 200) return base;
  let out = base;
  while (out.length < 200) out += ` ${PAD}`;
  return out;
};

const cases = [
  { group: 'BLOCK', text: 'Fluent German required for this role.', expectBlocked: true },
  { group: 'BLOCK', text: 'Native French speaker essential for client engagement.', expectBlocked: true },
  { group: 'BLOCK', text: 'Professional fluency in Dutch is mandatory for this position.', expectBlocked: true },
  { group: 'BLOCK', text: 'Must speak Italian with stakeholders across the region.', expectBlocked: true },
  { group: 'BLOCK', text: 'Excellent written and spoken Spanish required for this leadership role.', expectBlocked: true },
  { group: 'PASS', text: 'German required for coordination with local teams.', expectBlocked: false },
  { group: 'PASS', text: 'Romanian citizenship required for this position.', expectBlocked: false },
  { group: 'PASS', text: 'German work authorization required before start date.', expectBlocked: false },
  { group: 'PASS', text: 'Required experience in the Dutch market is essential for success.', expectBlocked: false },
  { group: 'PASS', text: 'Required background in the French luxury sector is essential.', expectBlocked: false },
  { group: 'PASS', text: 'Russian nationals only may apply for this local contract role.', expectBlocked: false },
  { group: 'PASS', text: 'English required, German preferred for stakeholder management.', expectBlocked: false },
  { group: 'PASS', text: 'English is mandatory and French is a plus for this role.', expectBlocked: false },
  { group: 'PASS', text: 'Fluent English required, with German advantageous for regional teams.', expectBlocked: false },
  { group: 'PASS', text: 'Manage localization into Spanish and Italian for product documentation.', expectBlocked: false },
  { group: 'PASS', text: 'German-speaking customers are part of the portfolio for this account.', expectBlocked: false },
  { group: 'PASS', text: 'Fluent German required for this role.', enrichmentStatus: 'FAILED', expectBlocked: false },
  { group: 'PASS', text: 'Short posting.', expectBlocked: false },
];

let failed = 0;
for (const testCase of cases) {
  const fullJobText = testCase.text === 'Short posting.' ? 'Short posting.' : pad(testCase.text);
  const result = evaluateLanguageGate(fullJobText, testCase.enrichmentStatus ?? 'OK');
  const pass = result.MandatoryLanguageBlocked === testCase.expectBlocked;
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} [${testCase.group}] ${testCase.text} => blocked=${result.MandatoryLanguageBlocked}${result.MandatoryLanguageLabel ? ` (${result.MandatoryLanguageLabel})` : ''}`);
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} matrix case(s) failed.`);
} else {
  console.log(`\nAll ${cases.length} matrix cases passed.`);
}
