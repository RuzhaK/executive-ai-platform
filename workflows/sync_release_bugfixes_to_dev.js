/**
 * Sync release bugfix mirrors into Executive-Job-CRM-v1.1-STABLE.json (BUG-001, BUG-002).
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const devPath = path.join(root, 'Executive-Job-CRM-v1.1-STABLE.json');
const outputNormPath = path.join(root, '_normalize_output_record.js');
const verifiedMirrorPath = path.join(root, '_norm_verified_review.js');

const wf = JSON.parse(fs.readFileSync(devPath, 'utf8'));
const outputNormCode = fs.readFileSync(outputNormPath, 'utf8').replace(/\r\n/g, '\n');
const verifiedMirror = fs.readFileSync(verifiedMirrorPath, 'utf8').replace(/\r\n/g, '\n');

function mergeVerifiedReview(devCode, mirrorCode) {
  const catchStart = mirrorCode.indexOf('} catch (e) {');
  const catchEnd = mirrorCode.indexOf('\n}\n\nconst evalLocation');
  if (catchStart === -1 || catchEnd === -1) {
    throw new Error('Mirror catch block markers not found');
  }
  const newCatch = mirrorCode.slice(catchStart, catchEnd + 1);

  const devCatchStart = devCode.indexOf('} catch (e) {');
  const devCatchEnd = devCode.indexOf('\n}\n\nconst evalLocation');
  if (devCatchStart === -1 || devCatchEnd === -1) {
    throw new Error('DEV catch block markers not found');
  }

  return devCode.slice(0, devCatchStart) + newCatch + devCode.slice(devCatchEnd + 1);
}

let patched = 0;
for (const node of wf.nodes) {
  if (node.name === 'Normalize Output Record') {
    if (!outputNormCode.includes('safeSheetText')) {
      throw new Error('Mirror missing safeSheetText (BUG-001)');
    }
    node.parameters.jsCode = outputNormCode;
    patched++;
  }
  if (node.name === 'Normalize Verified Review') {
    const merged = mergeVerifiedReview(node.parameters.jsCode, verifiedMirror);
    if (!merged.includes('VERIFIED_PARSE_ERROR')) {
      throw new Error('Merged verified code missing VERIFIED_PARSE_ERROR (BUG-002)');
    }
    node.parameters.jsCode = merged;
    patched++;
  }
}

if (patched !== 2) {
  throw new Error(`Expected 2 nodes patched, got ${patched}`);
}

fs.writeFileSync(devPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('Synced BUG-001/BUG-002 mirrors into Executive-Job-CRM-v1.1-STABLE.json');
