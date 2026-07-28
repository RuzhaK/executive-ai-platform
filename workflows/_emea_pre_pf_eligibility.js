const { evaluateLanguageGate } = require('./_emea_c3_language_gate');

const MIN_FULL_JOB_TEXT = 200;

const SOFT_PREFERENCE_ONLY =
  /\b(preferred|nice to have|highly desirable|desirable|advantageous|a plus|ideally|would be (?:a )?bonus|helpful|beneficial|bonus)\b/i;

const PAN_EUROPE_REMOTE_EVIDENCE = [
  /\beurope-wide\s+remote\b/i,
  /\bremote\s+within\s+europe\b/i,
  /\beu-wide\s+remote\b/i,
  /\beea-wide\s+remote\b/i,
  /\bemea-wide\s+remote\b/i,
  /\bemea\s+remote\b/i,
  /\bremote\s+emea\b/i,
  /\bwork\s+from\s+anywhere\s+in\s+europe\b/i,
  /\bwork\s+from\s+anywhere\s+in\s+the\s+eu\b/i,
  /\bwork\s+from\s+anywhere\s+in\s+the\s+eea\b/i,
  /\bwork\s+from\s+any\s+eu\s+country\b/i,
  /\bwork\s+from\s+any\s+eea\s+country\b/i,
  /\blocation[\s-]flexible\s+across\s+europe\b/i,
  /\bdistributed\s+workforce\s+across\s+europe\b/i,
  /\bremote\s+within\s+the\s+european\s+union\b/i,
  /\bremote\s+across\s+the\s+european\s+union\b/i,
  /\bopen\s+to\s+candidates\s+across\s+the\s+eu\b/i,
  /\bopen\s+to\s+candidates\s+across\s+the\s+eea\b/i,
  /\bfully\s+remote\b/i,
  /\bwork\s+from\s+anywhere\b/i,
  /\bremote\s+across\s+europe\b/i,
  /\bremote\s+across\s+emea\b/i,
  /\bremote\s+across\s+(?:the\s+)?eu\b/i,
  /\bopen\s+across\s+europe\b/i,
  /\bwork\s+remotely\s+from\s+any\s+(?:eu|european)\s+countr/i,
  /\bdistributed\s+(?:team\s+)?across\s+europe\b/i,
  /\bdistributed\s+across\s+europe\b/i,
  /\bhiring\s+across\s+europe\b/i,
  /\bremote\s+europe\b/i,
  /\bremote\s+worldwide\b/i,
  /\bremote\s+global\b/i,
  /\banywhere\s+in\s+europe\b/i,
  /\bacross\s+europe\b/i,
  /\bwithin\s+europe\b/i,
  /\beuropean\s+union\b/i,
];

const EU_EEA_BULGARIA_ELIGIBLE_PATTERNS = [
  /\b(?:eu|eea|european\s+union)\s+nationals?\s+only\b/i,
  /\b(?:eu|eea|european\s+union)\s+citizens?\s+only\b/i,
  /\beligible\s+to\s+work\s+in\s+(?:the\s+)?(?:eu|eea|european\s+union)\b/i,
  /\bright\s+to\s+work\s+in\s+(?:the\s+)?(?:eu|eea|european\s+union)\b/i,
  /\bauthorized\s+to\s+work\s+in\s+(?:the\s+)?(?:eu|eea|european\s+union)\b/i,
];

const RESTRICTIVE_COUNTRY_PATTERN =
  /\b(?:uk|united kingdom|great britain|england|scotland|wales|northern ireland|germany|france|spain|italy|netherlands|portugal|ireland|austria|belgium|sweden|norway|denmark|finland|poland|romania|greece|switzerland|czech(?:ia| republic)?|hungary|croatia|serbia|slovakia|slovenia|luxembourg|malta|cyprus|estonia|latvia|lithuania|usa|united states|canada|australia|new zealand|japan|singapore|hong kong|uae|dubai|saudi arabia|qatar|israel|india|china|brazil|mexico)\b/i;

const WORK_AUTH_VERB_PATTERNS = [
  /\bright\s+to\s+work\s+in\b/i,
  /\bauthorized\s+to\s+work\s+in\b/i,
  /\beligible\s+to\s+work\s+in\b/i,
  /\bmust\s+already\s+be\s+(?:legally\s+)?(?:eligible|authorized)\s+to\s+work\s+in\b/i,
  /\bapplicants\s+must\s+already\s+be\s+eligible\s+to\s+work\s+in\b/i,
];

const SPONSORSHIP_PATTERNS = [
  /\bno\s+visa\s+sponsorship\b/i,
  /\bsponsorship\s+unavailable\b/i,
  /\bvisa\s+sponsorship\s+(?:is\s+)?(?:not\s+(?:available|provided)|unavailable)\b/i,
];

const RESIDENCY_PATTERNS = [
  /\bmust\s+live\s+in\b/i,
  /\bresidents?\s+only\b/i,
  /\bmust\s+be\s+based\s+in\b/i,
  /\bcandidates\s+located\s+in\b/i,
  /\bmust\s+reside\s+in\b/i,
  /\bmust\s+be\s+resident\s+in\b/i,
  /\blegal\s+resident\s+of\b/i,
  /\bnationals?\s+only\b/i,
  /\b(?:uk|united kingdom|germany|france|spain|italy|netherlands|portugal|ireland|austria|belgium|sweden|norway|denmark|finland|poland|romania|greece|switzerland|czech(?:ia| republic)?|hungary|croatia|serbia|slovakia|slovenia|luxembourg|malta|cyprus|estonia|latvia|lithuania)[-\s]based\b/i,
  /\b(?:uk|united kingdom|germany|france|spain|italy|netherlands|portugal|ireland|austria|belgium|sweden|norway|denmark|finland|poland|romania|greece|switzerland|czech(?:ia| republic)?|hungary|croatia|serbia|slovakia|slovenia|luxembourg|malta|cyprus|estonia|latvia|lithuania)\s+(?:residents?|candidates)\s+only\b/i,
];

const GENERIC_REMOTE_LOCATION =
  /^(?:remote\s+(?:europe|emea|worldwide|global)|(?:europe|emea|worldwide|global)\s*[·•]\s*remote|bulgaria\s*[·•]\s*remote|remote)$/i;

const isSoftPreferenceChunk = (chunk) =>
  SOFT_PREFERENCE_ONLY.test(chunk) &&
  !/\b(required|mandatory|essential|must|only|non-negotiable)\b/i.test(chunk);

const isEuEeaBulgariaEligibleClause = (chunk) =>
  EU_EEA_BULGARIA_ELIGIBLE_PATTERNS.some((pattern) => pattern.test(chunk));

const isEuEeaResidencyPass = (chunk) =>
  /\b(?:eu|eea|european\s+union)\s+(?:residents?|nationals?|citizens?)\s+only\b/i.test(
    chunk,
  );

const hasRestrictiveCountryMention = (chunk) => {
  if (isEuEeaBulgariaEligibleClause(chunk) || isEuEeaResidencyPass(chunk)) {
    return false;
  }
  return RESTRICTIVE_COUNTRY_PATTERN.test(chunk);
};

const hasMandatoryCountryRestriction = (chunk) => {
  if (!hasRestrictiveCountryMention(chunk)) return false;

  const hasAuthVerb = WORK_AUTH_VERB_PATTERNS.some((pattern) => pattern.test(chunk));
  const hasResidencyVerb = RESIDENCY_PATTERNS.some((pattern) => pattern.test(chunk));
  const hasMandatoryLanguage =
    /\b(must|required|mandatory|essential|only)\b/i.test(chunk) &&
    (hasAuthVerb || hasResidencyVerb);

  return hasAuthVerb || hasResidencyVerb || hasMandatoryLanguage;
};

const parseCountrySpecificRemoteLocation = (location) => {
  const loc = String(location || '').trim();
  if (!loc || GENERIC_REMOTE_LOCATION.test(loc)) return '';

  const dotRemote = loc.match(/^(.+?)\s*[·•]\s*remote$/i);
  if (dotRemote) {
    const countryPart = dotRemote[1].trim();
    if (/^(europe|emea|worldwide|global|bulgaria)$/i.test(countryPart)) return '';
    return countryPart;
  }

  const remotePrefix = loc.match(/^remote\s*[·•]?\s*(.+)$/i);
  if (remotePrefix) {
    const countryPart = remotePrefix[1].trim();
    if (/^(europe|emea|worldwide|global)$/i.test(countryPart)) return '';
    return countryPart;
  }

  const countrySuffix = loc.match(/^(.+?)\s+remote$/i);
  if (countrySuffix) {
    const countryPart = countrySuffix[1].trim();
    if (/^(europe|emea|worldwide|global)$/i.test(countryPart)) return '';
    return countryPart;
  }

  return '';
};

const hasEuWideEligibilityEvidence = (text) => {
  const haystack = String(text || '');
  if (!haystack.trim()) return false;
  return EU_EEA_BULGARIA_ELIGIBLE_PATTERNS.some((pattern) => pattern.test(haystack));
};

const hasPanEuropeRemoteEvidence = (text) => {
  const haystack = String(text || '');
  if (!haystack.trim()) return false;
  return (
    PAN_EUROPE_REMOTE_EVIDENCE.some((pattern) => pattern.test(haystack)) ||
    hasEuWideEligibilityEvidence(haystack)
  );
};

const detectWorkAuthorizationBlock = (fullJobText) => {
  const text = String(fullJobText || '').trim();
  if (text.length < MIN_FULL_JOB_TEXT) return { blocked: false, reason: '' };

  const chunks = text
    .split(/[.;\n]/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 12);

  for (const chunk of chunks) {
    if (isSoftPreferenceChunk(chunk)) continue;
    if (isEuEeaBulgariaEligibleClause(chunk)) continue;

    const hasRestrictiveCountry = hasRestrictiveCountryMention(chunk);
    const authVerb = WORK_AUTH_VERB_PATTERNS.find((pattern) => pattern.test(chunk));
    if (authVerb && hasRestrictiveCountry) {
      return {
        blocked: true,
        reason: `Work authorization requirement: ${chunk.slice(0, 160)}`,
      };
    }

    const hasSponsorship = SPONSORSHIP_PATTERNS.some((pattern) => pattern.test(chunk));
    if (hasSponsorship && hasMandatoryCountryRestriction(chunk)) {
      return {
        blocked: true,
        reason: `Work authorization requirement: ${chunk.slice(0, 160)}`,
      };
    }
  }

  return { blocked: false, reason: '' };
};

const detectCountryResidencyBlock = (fullJobText) => {
  const text = String(fullJobText || '').trim();
  if (text.length < MIN_FULL_JOB_TEXT) return { blocked: false, reason: '' };

  const chunks = text
    .split(/[.;\n]/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 12);

  for (const chunk of chunks) {
    if (isSoftPreferenceChunk(chunk)) continue;
    if (isEuEeaBulgariaEligibleClause(chunk) || isEuEeaResidencyPass(chunk)) continue;

    const matched = RESIDENCY_PATTERNS.find((pattern) => pattern.test(chunk));
    if (matched && hasRestrictiveCountryMention(chunk)) {
      return {
        blocked: true,
        reason: `Country residency requirement: ${chunk.slice(0, 160)}`,
      };
    }
  }

  return { blocked: false, reason: '' };
};

const detectCountryRemoteOnlyBlock = (
  location,
  fullJobText,
  emailSnippet,
  enrichmentStatus,
) => {
  const countryLabel = parseCountrySpecificRemoteLocation(location);
  if (!countryLabel) {
    return { blocked: false, unknown: false, reason: '', countryLabel: '' };
  }

  const text = String(fullJobText || '').trim();
  const enrichmentOk =
    String(enrichmentStatus || '') === 'OK' && text.length >= MIN_FULL_JOB_TEXT;

  if (!enrichmentOk) {
    return {
      blocked: false,
      unknown: true,
      reason:
        'Country-specific remote eligibility could not be verified; full posting unavailable.',
      countryLabel,
    };
  }

  const searchable = [text, emailSnippet].filter(Boolean).join('\n');
  if (hasPanEuropeRemoteEvidence(searchable)) {
    return { blocked: false, unknown: false, reason: '', countryLabel };
  }

  return {
    blocked: true,
    unknown: false,
    reason: `Country-specific remote (${countryLabel}) without pan-Europe remote eligibility evidence`,
    countryLabel,
  };
};

const emptyPrePfFields = () => ({
  PrePfEligibilityBlocked: false,
  PrePfEligibilityRejectReason: '',
  PrePfEligibilityGate: '',
  MandatoryLanguageBlocked: false,
  MandatoryLanguageRejectReason: '',
  MandatoryLanguageLabel: '',
  WorkAuthorizationBlocked: false,
  WorkAuthorizationRejectReason: '',
  CountryResidencyBlocked: false,
  CountryResidencyRejectReason: '',
  CountryRemoteOnlyBlocked: false,
  CountryRemoteOnlyRejectReason: '',
  CountryRemoteOnlyLocation: '',
  CountryRemoteEligibilityUnknown: false,
});

const evaluatePrePfEligibilityGate = ({
  fullJobText,
  enrichmentStatus,
  location,
  emailSnippet = '',
}) => {
  const text = String(fullJobText || '').trim();
  const enrichmentOk =
    String(enrichmentStatus || '') === 'OK' && text.length >= MIN_FULL_JOB_TEXT;

  const language = enrichmentOk
    ? evaluateLanguageGate(text, enrichmentStatus)
    : {
        MandatoryLanguageBlocked: false,
        MandatoryLanguageRejectReason: '',
        MandatoryLanguageLabel: '',
      };

  if (language.MandatoryLanguageBlocked) {
    return {
      ...emptyPrePfFields(),
      PrePfEligibilityBlocked: true,
      PrePfEligibilityRejectReason: language.MandatoryLanguageRejectReason,
      PrePfEligibilityGate: 'MANDATORY_LANGUAGE',
      auto_reject_reason: 'MANDATORY_LANGUAGE',
      ...language,
    };
  }

  const workAuth = enrichmentOk
    ? detectWorkAuthorizationBlock(text)
    : { blocked: false, reason: '' };
  if (workAuth.blocked) {
    return {
      ...emptyPrePfFields(),
      PrePfEligibilityBlocked: true,
      PrePfEligibilityRejectReason: workAuth.reason,
      PrePfEligibilityGate: 'WORK_AUTHORIZATION_REQUIRED',
      auto_reject_reason: 'WORK_AUTHORIZATION_REQUIRED',
      WorkAuthorizationBlocked: true,
      WorkAuthorizationRejectReason: workAuth.reason,
    };
  }

  const residency = enrichmentOk
    ? detectCountryResidencyBlock(text)
    : { blocked: false, reason: '' };
  if (residency.blocked) {
    return {
      ...emptyPrePfFields(),
      PrePfEligibilityBlocked: true,
      PrePfEligibilityRejectReason: residency.reason,
      PrePfEligibilityGate: 'COUNTRY_RESIDENCY_REQUIRED',
      auto_reject_reason: 'COUNTRY_RESIDENCY_REQUIRED',
      CountryResidencyBlocked: true,
      CountryResidencyRejectReason: residency.reason,
    };
  }

  const countryRemote = detectCountryRemoteOnlyBlock(
    location,
    text,
    emailSnippet,
    enrichmentStatus,
  );
  if (countryRemote.unknown) {
    return {
      ...emptyPrePfFields(),
      PrePfEligibilityGate: 'COUNTRY_REMOTE_ELIGIBILITY_UNKNOWN',
      CountryRemoteEligibilityUnknown: true,
      CountryRemoteOnlyLocation: countryRemote.countryLabel,
      LocationFit: 'REVIEW_REQUIRED',
      CountryFit: 'REVIEW_REQUIRED',
      MainRisk: countryRemote.reason,
    };
  }
  if (countryRemote.blocked) {
    return {
      ...emptyPrePfFields(),
      PrePfEligibilityBlocked: true,
      PrePfEligibilityRejectReason: countryRemote.reason,
      PrePfEligibilityGate: 'COUNTRY_REMOTE_ONLY',
      auto_reject_reason: 'COUNTRY_REMOTE_ONLY',
      CountryRemoteOnlyBlocked: true,
      CountryRemoteOnlyRejectReason: countryRemote.reason,
      CountryRemoteOnlyLocation: countryRemote.countryLabel,
    };
  }

  return {
    ...emptyPrePfFields(),
    PrePfEligibilityGate: 'PASS',
    ...language,
  };
};

module.exports = {
  MIN_FULL_JOB_TEXT,
  evaluatePrePfEligibilityGate,
  parseCountrySpecificRemoteLocation,
  hasPanEuropeRemoteEvidence,
  detectWorkAuthorizationBlock,
  detectCountryResidencyBlock,
  detectCountryRemoteOnlyBlock,
  isEuEeaBulgariaEligibleClause,
  hasEuWideEligibilityEvidence,
};
