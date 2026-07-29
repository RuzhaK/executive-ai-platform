// EMEA-OUTPUT-NORM: output contract only — never mutate routing fields
// (PipelineStage, Status, RejectReason, auto_reject_reason, Company, Role, URL, etc.)

const EMPTY = '';

const isFiniteNumber = (v) => {
  const s = String(v ?? '').trim();
  if (s === '') return false;
  const n = Number(s);
  return Number.isFinite(n);
};

const asTrimmed = (v) => String(v ?? '').trim();

const safeSheetText = (v) => {
  if (v == null) return EMPTY;
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return String(v).trim();
  if (t === 'object') {
    if (v._ != null) return String(v._).trim();
    if (v['#text'] != null) return String(v['#text']).trim();
    if (v.text != null) return String(v.text).trim();
    try { return JSON.stringify(v); } catch { return EMPTY; }
  }
  return String(v).trim();
};

const normalizeFinalDecision = (value) => {
  const v = asTrimmed(value).toUpperCase();
  if (v === 'APPLY IF INTERESTED' || v === 'APPLY_IF_INTERESTED') return 'MONITOR';
  if (v === 'APPLY NOW' || v === 'APPLY_NOW' || v === 'APPLY') return 'APPLY NOW';
  if (v === 'MONITOR') return 'MONITOR';
  if (v === 'REJECT') return 'REJECT';
  if (v === 'REJECT_PREVIEW') return 'REJECT_PREVIEW';
  return asTrimmed(value) || EMPTY;
};

const FINAL_REJECT_TERMINAL_REASONS = [
  'MANDATORY_TRAVEL',
  'MANDATORY_DOMAIN',
  'MANDATORY_LANGUAGE',
  'CLOSED_POSTING',
  'COUNTRY_ELIGIBILITY',
  'WORK_AUTHORIZATION_REQUIRED',
  'COUNTRY_RESIDENCY_REQUIRED',
  'COUNTRY_REMOTE_ONLY',
  'VERIFIED_PARSE_ERROR',
];

const resolveLocationFit = (item, stage, autoReason, status) => {
  if (stage === 'POLICY_REJECT' && autoReason === 'LANGUAGE') return EMPTY;
  if (stage === 'PREVIEW_REJECT') return EMPTY;
  if (stage === 'FINAL_REJECT' && FINAL_REJECT_TERMINAL_REASONS.includes(autoReason)) {
    return EMPTY;
  }
  if (stage === 'POLICY_REJECT' && status === 'Location Rejected') {
    return asTrimmed(item.LocationFit) || 'MISMATCH';
  }
  return asTrimmed(item.LocationFit);
};

const isPreVerifiedTerminal = (s) => {
  const stage = asTrimmed(s.PipelineStage);
  const auto = asTrimmed(s.auto_reject_reason);
  if (stage === 'POLICY_REJECT' && auto === 'LANGUAGE') return true;
  if (stage === 'PREVIEW_REJECT' || stage === 'NO_JOB_CARD') return true;
  if (stage === 'FINAL_REJECT' && FINAL_REJECT_TERMINAL_REASONS.includes(auto)) return true;
  if (stage === 'POLICY_REJECT' && asTrimmed(s.Status) === 'Location Rejected') return true;
  return false;
};

const blankVerifiedFields = () => ({
  VerifiedScore: EMPTY,
  VerifiedRecommendation: EMPTY,
  FinalCV: EMPTY,
  VerifiedRisk: EMPTY,
  VerifiedWhyApply: EMPTY,
  VerifiedPriority: EMPTY,
  SalaryEstimate: EMPTY,
  SalaryRange: EMPTY,
  SalaryConfidence: EMPTY,
  SalaryAssumption: EMPTY,
});

return $input.all().map((item) => {
  const src = item.json;
  const stage = asTrimmed(src.PipelineStage);
  const autoReason = asTrimmed(src.auto_reject_reason);
  const status = asTrimmed(src.Status);

  const initialEvalRan = isFiniteNumber(src.InitialEvalScore);
  const previewRan = isFiniteNumber(src.PreviewScore) && asTrimmed(src.PreviewRecommendation) !== '';

  const hasNumericVerifiedScore = isFiniteNumber(src.VerifiedScore);
  const verifiedRec = asTrimmed(src.VerifiedRecommendation).toUpperCase();
  const hasVerifiedRec = ['YES', 'MONITOR', 'NO'].includes(verifiedRec);
  const verifiedRan = hasNumericVerifiedScore && hasVerifiedRec && !isPreVerifiedTerminal(src);

  const out = {
    ...src,
    FinalDecision: normalizeFinalDecision(src.FinalDecision),
    LocationFit: resolveLocationFit(src, stage, autoReason, status),
    InterviewProbability: initialEvalRan ? src.InterviewProbability : EMPTY,
    OutputVerifiedRan: verifiedRan,
    OutputInitialEvalRan: initialEvalRan,
    OutputPreviewRan: previewRan,
  };

  if (verifiedRan) {
    out.VerifiedScore = Number(src.VerifiedScore);
    out.VerifiedRecommendation = verifiedRec;
  } else {
    Object.assign(out, blankVerifiedFields());
  }

  if (verifiedRan) {
    out.OutputScore = out.VerifiedScore;
    out.OutputRecommendation = out.VerifiedRecommendation;
    out.OutputRecommendedCV = asTrimmed(out.FinalCV);
  } else if (previewRan) {
    out.OutputScore = Number(src.PreviewScore);
    out.OutputRecommendation = asTrimmed(src.PreviewRecommendation);
    out.OutputRecommendedCV = asTrimmed(src.PreviewCV);
  } else {
    out.OutputScore = EMPTY;
    out.OutputRecommendation = EMPTY;
    out.OutputRecommendedCV = EMPTY;
  }

  if (verifiedRan && asTrimmed(out.VerifiedRisk)) {
    out.OutputNotes = asTrimmed(out.VerifiedRisk);
  } else if (asTrimmed(src.MainRisk)) {
    out.OutputNotes = asTrimmed(src.MainRisk);
  } else if (asTrimmed(src.PreviewReason)) {
    out.OutputNotes = asTrimmed(src.PreviewReason);
  } else if (asTrimmed(src.PreviewRisk)) {
    out.OutputNotes = asTrimmed(src.PreviewRisk);
  } else {
    out.OutputNotes = EMPTY;
  }

  out.Company = safeSheetText(src.Company);
  out.Role = safeSheetText(src.Role);

  return { json: out, pairedItem: item.pairedItem };
});
