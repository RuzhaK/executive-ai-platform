// VERIFIED STAGE: VerifiedScore, VerifiedRecommendation, VerifiedRisk, VerifiedWhyApply (+ FinalCV, salary from verified AI only).
// Never fall back to InitialEvalScore or Preview* for verified fields.
// Role quality only — location label must not reduce score.
const evalContext = $('Normalize AI Evaluation').item?.json || {};
const enrichmentContext = $('Extract LinkedIn Job Description').item?.json || {};
const original = {
  ...evalContext,
  FullJobText: enrichmentContext.FullJobText ?? evalContext.FullJobText ?? '',
  FullJobTextLength: enrichmentContext.FullJobTextLength ?? evalContext.FullJobTextLength ?? 0,
  EnrichmentStatus: enrichmentContext.EnrichmentStatus ?? evalContext.EnrichmentStatus ?? '',
  EnrichmentError: enrichmentContext.EnrichmentError ?? evalContext.EnrichmentError ?? '',
};

const isCountrySpecificRemote = (location, workType = '') => {
  const loc = String(location || '').toLowerCase().trim();
  const wt = String(workType || '').toLowerCase().trim();
  const hasRemote = wt === 'remote' || /\bremote\b/.test(loc);
  if (!hasRemote) return false;
  if (/remote europe|remote emea|remote worldwide|remote global|bulgaria/.test(loc)) return false;
  if (loc.includes('· remote')) return true;
  return /\b(united kingdom|uk|spain|netherlands|france|germany|italy|portugal|switzerland)\b/.test(loc);
};

const looksLikeLabelLocationRejection = (text, locationFit, finalDecision, score) => {
  const t = String(text || '').toLowerCase();
  const textReject = /country-specific|not acceptable|residents only|work authorization|outside bulgaria|uk remote|united kingdom remote|spain remote|netherlands remote|location mismatch/.test(t);
  const fitReject = ['MISMATCH', 'NO'].includes(String(locationFit || '').toUpperCase());
  const decisionReject = String(finalDecision || '').toUpperCase() === 'REJECT' && Number(score) <= 5;
  return textReject || fitReject || decisionReject;
};

const LOCATION_REVIEW_MSG = 'Location eligibility requires full posting verification.';

const clampInterviewProbability = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const pct = n >= 0 && n <= 10 ? Math.round(n * 10) : Math.round(n);
  return Math.max(0, Math.min(100, pct));
};

const normalizeRecommendation = (value, fallback = 'NO') => {
  const v = String(value || '').trim().toUpperCase();
  if (['YES', 'MONITOR', 'NO'].includes(v)) return v;
  return fallback;
};

const normalizeFinalDecision = (value, fallback = 'MONITOR') => {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'APPLY IF INTERESTED' || v === 'APPLY_IF_INTERESTED') return 'MONITOR';
  if (v === 'APPLY NOW' || v === 'APPLY_NOW' || v === 'APPLY') return 'APPLY NOW';
  if (v === 'MONITOR') return 'MONITOR';
  if (v === 'REJECT') return 'REJECT';
  return fallback;
};

const normalizeGeoFit = (value, fallback = 'REVIEW_REQUIRED') => {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'FULL MATCH' || v === 'FULL_MATCH') return 'FULL MATCH';
  if (v === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  if (v === 'MISMATCH') return 'MISMATCH';
  return fallback;
};

const normalizePriority = (value, fallback = 'LOW') => {
  const v = String(value || '').trim().toUpperCase();
  if (['HIGH', 'MEDIUM', 'LOW'].includes(v)) return v;
  return fallback;
};

const normalizeSalaryConfidence = (value, fallback = 'LOW') => {
  const v = String(value || '').trim().toUpperCase();
  if (['HIGH', 'MEDIUM', 'LOW'].includes(v)) return v;
  return fallback;
};

const resolvePipelineStageFromVerified = (finalDecision) => {
  const d = String(finalDecision || '').toUpperCase().trim();
  if (d === 'REJECT') return 'FINAL_REJECT';
  if (d === 'APPLY NOW' || d === 'APPLY') return 'FINAL_ACCEPT';
  return 'FULL_EVALUATION';
};

const isLocationOnlySalaryAssumption = (value) => {
  const v = String(value || '').trim().toLowerCase();
  return [
    'remote bulgaria', 'remote europe', 'remote emea', 'remote worldwide', 'remote global',
    'bulgaria hybrid', 'bulgaria onsite', 'not specified',
  ].includes(v) || /^remote /.test(v);
};

const normalizeSalaryAssumption = (assumption) => {
  if (isLocationOnlySalaryAssumption(assumption)) {
    return 'Estimated from role seniority and executive compensation anchors';
  }
  const text = String(assumption || '').trim();
  return text || 'Not specified';
};

const parseSalaryNumber = (value) => {
  const s = String(value || '').trim();
  if (!s) return NaN;
  const kMatch = s.replace(/[,\s]/g, '').match(/^([\d.]+)k$/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const digits = s.replace(/[^\d.]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? Math.round(n) : NaN;
};

const mapSalaryFields = (ai) => {
  const rawRange = String(ai.salary_range_eur_gross || '').trim();
  const rawTarget = String(ai.salary_target_eur_gross || '').trim();
  let salaryRange = '';
  let salaryEstimate = '';

  const rangeMatch = rawRange.match(/([\d.k]+)\s*(?:-|–|—|\sto\s)+\s*([\d.k]+)/i);
  if (rangeMatch) {
    const low = parseSalaryNumber(rangeMatch[1]);
    const high = parseSalaryNumber(rangeMatch[2]);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      const min = Math.min(low, high);
      const max = Math.max(low, high);
      salaryRange = min === max ? String(min) : `${min}-${max}`;
    }
  } else {
    const single = parseSalaryNumber(rawRange);
    if (Number.isFinite(single)) salaryRange = String(single);
  }

  const targetNum = parseSalaryNumber(rawTarget);
  if (Number.isFinite(targetNum)) {
    salaryEstimate = String(targetNum);
  } else if (salaryRange.includes('-')) {
    const [lowStr, highStr] = salaryRange.split('-');
    const low = Number(lowStr);
    const high = Number(highStr);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      salaryEstimate = String(Math.round((low + high) / 2));
    }
  } else if (salaryRange) {
    salaryEstimate = salaryRange;
  }

  return {
    SalaryRange: salaryRange,
    SalaryEstimate: salaryEstimate,
    SalaryTarget: rawTarget || salaryEstimate,
  };
};

const sanitizeVerifiedLocation = (ai, location, workType, ctx) => {
  if (!isCountrySpecificRemote(location, workType)) return ai;
  const out = { ...ai };
  const hadLabelLocationReject = looksLikeLabelLocationRejection(
    out.biggest_risk,
    out.location_fit,
    out.final_decision,
    out.final_score,
  );

  out.location_fit = 'REVIEW_REQUIRED';

  if (hadLabelLocationReject || looksLikeLabelLocationRejection(out.biggest_risk, '', '', 0) || !String(out.biggest_risk || '').trim()) {
    out.biggest_risk = LOCATION_REVIEW_MSG;
  }

  if (hadLabelLocationReject) {
    const score = Number(out.final_score);
    const roleFloor = Math.max(
      Number(ctx.InitialEvalScore) || 0,
      Number(ctx.PreviewScore) || 0,
      7,
    );
    if (Number.isFinite(score) && score < 7) out.final_score = Math.max(score, roleFloor);
    if (String(out.apply || '').toUpperCase() === 'NO') out.apply = 'YES';
    if (String(out.final_decision || '').toUpperCase() === 'REJECT') {
      const s = Number(out.final_score);
      out.final_decision = s >= 8 ? 'APPLY NOW' : 'MONITOR';
    }
  }

  return out;
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

// Try to extract JSON object if model returned extra text
const firstBrace = clean.indexOf('{');
const lastBrace = clean.lastIndexOf('}');

if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
  clean = clean.slice(firstBrace, lastBrace + 1);
}

let ai;

try {
  ai = JSON.parse(clean);
} catch (e) {
  const parseMsg = `Verified AI returned invalid JSON: ${e.message}`;
  return {
    json: {
      ...original,

      VerifiedScore: '',
      VerifiedRecommendation: '',
      FinalCV: '',
      VerifiedInterviewProbability: '',
      VerifiedPriority: '',

      SalaryEstimate: '',
      SalaryTarget: '',
      SalaryConfidence: '',
      SalaryAssumption: '',
      SalaryRange: '',

      VerifiedRisk: '',
      VerifiedWhyApply: '',

      Location: original.Location || 'Not specified',
      LocationFit: original.LocationFit || 'REVIEW_REQUIRED',
      CountryFit: original.CountryFit || 'REVIEW_REQUIRED',

      FinalDecision: 'REJECT',
      PipelineStage: 'FINAL_REJECT',
      auto_reject_reason: 'VERIFIED_PARSE_ERROR',
      Status: 'Rejected',
      RejectReason: parseMsg,
      MainRisk: parseMsg,

      FullJobText: original.FullJobText || '',
      FullJobTextLength: original.FullJobTextLength ?? 0,
      EnrichmentStatus: original.EnrichmentStatus || '',
      EnrichmentError: original.EnrichmentError || '',
      ParseError: e.message,
      VerifiedParseError: true,

      DedupeKey: original.DedupeKey && original.DedupeKey !== '||'
        ? original.DedupeKey
        : (
            original.JobId ||
            `${original.Company || ''}|${original.Role || ''}|${original.Location || ''}`.toLowerCase()
          )
    }
  };
}

const evalLocation = ai.location || original.Location || '';
const evalWorkType = ai.work_type || original.WorkType || '';
ai = sanitizeVerifiedLocation(ai, evalLocation, evalWorkType, original);
const countrySpecificRemote = isCountrySpecificRemote(evalLocation, evalWorkType);
const salaryFields = mapSalaryFields(ai);

return {
  json: {
    ...original,

    Role: original.Role || ai.role || '',
    Company: original.Company || ai.company || '',
    JobId: original.JobId || ai.job_id || '',
    WorkType: original.WorkType || ai.work_type || '',
    URL: original.URL || ai.url || '',

    VerifiedScore: ai.final_score ?? 0,
    VerifiedRecommendation: normalizeRecommendation(ai.apply),
    FinalCV: ai.best_cv || 'Strategy & Operations CV',
    VerifiedInterviewProbability: clampInterviewProbability(ai.interview_probability ?? original.InterviewProbability),

    SalaryEstimate: salaryFields.SalaryEstimate,
    SalaryTarget: salaryFields.SalaryTarget,
    SalaryConfidence: normalizeSalaryConfidence(ai.salary_confidence),
    SalaryAssumption: normalizeSalaryAssumption(ai.salary_assumption),

    VerifiedRisk: ai.biggest_risk || '',
    VerifiedWhyApply: ai.why_apply || '',
    VerifiedPriority: normalizePriority(ai.follow_up_priority || original.Priority),

    SalaryRange: salaryFields.SalaryRange,
    Location: ai.location || original.Location || 'Not specified',
    LocationFit: normalizeGeoFit(ai.location_fit || original.LocationFit),
    CountryFit: normalizeGeoFit(countrySpecificRemote ? 'REVIEW_REQUIRED' : (ai.country_fit || original.CountryFit)),

    FinalDecision: normalizeFinalDecision(ai.final_decision),
    PipelineStage: resolvePipelineStageFromVerified(normalizeFinalDecision(ai.final_decision)),

    FullJobText: original.FullJobText || '',
    FullJobTextLength: original.FullJobTextLength ?? 0,
    EnrichmentStatus: original.EnrichmentStatus || '',
    EnrichmentError: original.EnrichmentError || '',

    ParseError: '',

    DedupeKey: original.DedupeKey && original.DedupeKey !== '||'
      ? original.DedupeKey
      : (
          ai.dedupe_key ||
          ai.job_id ||
          original.JobId ||
          `${original.Company || ai.company || ''}|${original.Role || ai.role || ''}|${ai.location || original.Location || ''}`.toLowerCase()
        )
  }
};
