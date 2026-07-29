const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const PRE_RELEASE_BASELINE_COMMIT = '0f966c8';
const stablePath = path.join(__dirname, 'Executive-Job-CRM-v1.1-STABLE.json');

const cur = JSON.parse(fs.readFileSync(stablePath, 'utf8'));
const baseline = JSON.parse(
  execSync(
    `git show ${PRE_RELEASE_BASELINE_COMMIT}:workflows/Executive-Job-CRM-v1.1-DEV.json`,
    { cwd: root, encoding: 'utf8' },
  ),
);

const get = (wf, n) => wf.nodes.find((x) => x.name === n)?.parameters?.jsCode || '';
const baselineNorm = get(baseline, 'Normalize Output Record');
const curNorm = get(cur, 'Normalize Output Record');

console.log(`Comparing STABLE vs pre-release baseline ${PRE_RELEASE_BASELINE_COMMIT}`);

for (const r of [
  'WORK_AUTHORIZATION_REQUIRED',
  'COUNTRY_RESIDENCY_REQUIRED',
  'COUNTRY_REMOTE_ONLY',
  'VERIFIED_PARSE_ERROR',
  'safeSheetText',
]) {
  console.log(`${r}: baseline=${baselineNorm.includes(r)} STABLE=${curNorm.includes(r)}`);
}

const vc = get(cur, 'Normalize Verified Review');
console.log(`VerifiedScore: 0 in STABLE=${vc.includes('VerifiedScore: 0')}`);
console.log(`VERIFIED_PARSE_ERROR in verified=${vc.includes('VERIFIED_PARSE_ERROR')}`);

const nodeExe = path.join(__dirname, '.tools/node/node.exe');
const tmpDir = path.join(__dirname, '.tmp_syntax');
fs.mkdirSync(tmpDir, { recursive: true });

let ok = 0;
let fail = 0;
for (const n of cur.nodes) {
  if (!n.parameters?.jsCode) continue;
  const p = path.join(tmpDir, `${n.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.js`);
  fs.writeFileSync(p, n.parameters.jsCode);
  try {
    execSync(`"${nodeExe}" --check "${p}"`, { stdio: 'pipe' });
    ok += 1;
  } catch {
    console.log('SYNTAX FAIL:', n.name);
    fail += 1;
  }
}
console.log(`Code nodes syntax OK: ${ok}, FAIL: ${fail}`);

const append = cur.nodes.find((x) => x.name === 'Append to Google Sheets');
const cols = Object.keys(append.parameters.columns.value).sort();
console.log(`Append columns: ${cols.length}`);
console.log(`Company mapping: ${append.parameters.columns.value.Company}`);
