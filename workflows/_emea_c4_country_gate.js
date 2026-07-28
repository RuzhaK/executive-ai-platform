const MIN_FULL_JOB_TEXT = 200;

const SOFT_PREFERENCE_ONLY =
  /\b(preferred|nice to have|highly desirable|desirable|advantageous|a plus|ideally|would be (?:a )?bonus|helpful|beneficial|bonus)\b/i;

const GENERIC_REMOTE_ALLOW = [
  /\bremote\s+europe\b/i,
  /\bremote\s+emea\b/i,
  /\bremote\s+worldwide\b/i,
  /\bremote\s+global\b/i,
  /\banywhere\s+in\s+europe\b/i,
  /\bacross\s+europe\b/i,
  /\bwithin\s+europe\b/i,
  /\beuropean\s+union\b/i,
];

const COUNTRY_ALIASES = [
  ['united kingdom', 'UK'],
  ['great britain', 'UK'],
  ['england', 'UK'],
  ['uk', 'UK'],
  ['british', 'UK'],
  ['united arab emirates', 'UAE'],
  ['uae', 'UAE'],
  ['spain', 'Spain'],
  ['spanish', 'Spain'],
  ['germany', 'Germany'],
  ['german', 'Germany'],
  ['france', 'France'],
  ['french', 'France'],
  ['netherlands', 'Netherlands'],
  ['dutch', 'Netherlands'],
  ['italy', 'Italy'],
  ['italian', 'Italy'],
  ['portugal', 'Portugal'],
  ['portuguese', 'Portugal'],
  ['switzerland', 'Switzerland'],
  ['swiss', 'Switzerland'],
  ['ireland', 'Ireland'],
  ['irish', 'Ireland'],
  ['poland', 'Poland'],
  ['polish', 'Poland'],
  ['romania', 'Romania'],
  ['romanian', 'Romania'],
  ['greece', 'Greece'],
  ['greek', 'Greece'],
  ['austria', 'Austria'],
  ['austrian', 'Austria'],
  ['belgium', 'Belgium'],
  ['belgian', 'Belgium'],
  ['sweden', 'Sweden'],
  ['swedish', 'Sweden'],
  ['norway', 'Norway'],
  ['norwegian', 'Norway'],
  ['denmark', 'Denmark'],
  ['danish', 'Denmark'],
  ['finland', 'Finland'],
  ['finnish', 'Finland'],
  ['czech republic', 'Czech Republic'],
  ['czechia', 'Czech Republic'],
  ['czech', 'Czech Republic'],
  ['hungary', 'Hungary'],
  ['hungarian', 'Hungary'],
  ['croatia', 'Croatia'],
  ['croatian', 'Croatia'],
  ['serbia', 'Serbia'],
  ['serbian', 'Serbia'],
  ['slovakia', 'Slovakia'],
  ['slovak', 'Slovakia'],
  ['slovenia', 'Slovenia'],
  ['slovenian', 'Slovenia'],
  ['luxembourg', 'Luxembourg'],
  ['malta', 'Malta'],
  ['maltese', 'Malta'],
  ['cyprus', 'Cyprus'],
  ['cypriot', 'Cyprus'],
  ['estonia', 'Estonia'],
  ['estonian', 'Estonia'],
  ['latvia', 'Latvia'],
  ['latvian', 'Latvia'],
  ['lithuania', 'Lithuania'],
  ['lithuanian', 'Lithuania'],
  ['bulgaria', 'Bulgaria'],
  ['bulgarian', 'Bulgaria'],
];

const RESTRICTION_PATTERNS = [
  /remote[,\s][^.\n]{0,100}anywhere\s+in\b/i,
  /remote[^.\n]{0,120}\b(only\s+from|from\s+only|anywhere\s+in|only\s+in|only\s+within|permitted\s+in|eligible\s+in|based\s+in|located\s+in|within|across|in\s+the\s+following)\b/i,
  /may\s+be\s+(performed|carried\s+out|done|worked)\s+remotely\s+(only\s+)?(from|in|within)\b/i,
  /work\s+remotely\s+(only\s+)?(from|in|within)\b/i,
  /remote\s+work\s+(only\s+)?(from|in|available\s+in|permitted\s+in)\b/i,
  /role\s+may\s+only\s+be\s+performed\s+remotely\b/i,
];

const NAMED_COUNTRY_IN_SNIPPET =
  /(spain|uk|united kingdom|uae|germany|france|netherlands|italy|portugal|ireland|switzerland|poland|romania|greece|austria|belgium|sweden|norway|denmark|finland|czech|hungary|croatia|serbia|slovakia|slovenia|luxembourg|malta|cyprus|estonia|latvia|lithuania)/i;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractCountriesFromText = (text) => {
  const found = new Map();
  const lower = String(text || '').toLowerCase();
  const sorted = [...COUNTRY_ALIASES].sort((a, b) => b[0].length - a[0].length);
  for (const [alias, label] of sorted) {
    const re = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');
    if (re.test(lower) && !found.has(label)) found.set(label, true);
  }
  return [...found.keys()];
};

const isSoftPreferenceChunk = (chunk) =>
  SOFT_PREFERENCE_ONLY.test(chunk) &&
  !/\b(required|mandatory|essential|must|only|non-negotiable)\b/i.test(chunk);

const isWorkAuthorizationOnlyClause = (chunk) => {
  const c = String(chunk || '');
  if (
    !/\b(work\s+authorization|right\s+to\s+work|work\s+permit|visa\s+sponsorship|sponsorship)\b/i.test(
      c,
    )
  ) {
    return false;
  }
  if (
    /\b(citizenship|national(?:ity)?|resident(?:s|cy)?|domicile|domiciled|passport\s+holder)\b/i.test(
      c,
    )
  ) {
    return false;
  }
  return /\b(required|mandatory|essential|must)\b/i.test(c);
};

const isEuEeaCitizenshipMandate = (chunk) => {
  const c = String(chunk || '').toLowerCase();
  const hasEuEea =
    /\b(eu|eea|european\s+union)\b/.test(c) &&
    /\b(citizenship|citizen|national)\b/.test(c);
  const hasMandatory =
    /\b(required|mandatory|essential|must|only|non-negotiable)\b/.test(c) ||
    /\bcitizenship\s+required\b/.test(c) ||
    /\bnationals?\s+only\b/.test(c);
  return hasEuEea && hasMandatory;
};

const hasExplicitEligibilityAnchor = (chunk) => {
  const c = String(chunk || '');
  if (isSoftPreferenceChunk(c)) return false;

  const anchorPatterns = [
    /\bcitizenship\s+required\b/i,
    /\b(required|mandatory|essential|non-negotiable)\s+[^.]{0,80}\bcitizenship\b/i,
    /\b[A-Za-z]+\s+citizenship\s+(required|mandatory|essential)\b/i,
    /\bnationals?\s+only\b/i,
    /\bmust\s+be\s+(a\s+)?legal\s+resident\s+of\b/i,
    /\bmust\s+be\s+resident\s+in\b/i,
    /\bmust\s+reside\s+in\b/i,
    /\blegal\s+resident\s+of\b/i,
    /\bdomiciled\s+in\b/i,
    /\bpassport\s+holders?\b/i,
    /\bresiden(?:t|cy)\s+(required|mandatory|essential)\b/i,
    /\b(required|mandatory|essential)\s+[^.]{0,80}\bresiden(?:t|cy)\b/i,
  ];

  return anchorPatterns.some((re) => re.test(c));
};

const detectExplicitRemoteCountryListBlock = (fullJobText) => {
  const text = String(fullJobText || '').trim();
  if (text.length < MIN_FULL_JOB_TEXT) return { blocked: false, countries: [], reason: '' };

  let restrictionSnippet = '';
  for (const pat of RESTRICTION_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      restrictionSnippet = text.slice(
        Math.max(0, m.index),
        Math.min(text.length, m.index + 450),
      );
      break;
    }
  }
  if (!restrictionSnippet) return { blocked: false, countries: [], reason: '' };

  const snippetLower = restrictionSnippet.toLowerCase();
  const countries = extractCountriesFromText(restrictionSnippet);
  if (!countries.length) return { blocked: false, countries: [], reason: '' };

  if (
    GENERIC_REMOTE_ALLOW.some((re) => re.test(snippetLower)) &&
    !NAMED_COUNTRY_IN_SNIPPET.test(snippetLower)
  ) {
    return { blocked: false, countries, reason: '' };
  }

  if (countries.includes('Bulgaria')) return { blocked: false, countries, reason: '' };

  const countryList = countries.join(', ');
  return {
    blocked: true,
    countries,
    reason: `Remote eligibility restricted to: ${countryList}; Bulgaria not eligible`,
  };
};

const detectExplicitEligibilityBlock = (fullJobText) => {
  const text = String(fullJobText || '').trim();
  if (text.length < MIN_FULL_JOB_TEXT) return { blocked: false, countries: [], reason: '' };

  const chunks = text
    .split(/[.;\n]/)
    .map((c) => c.trim())
    .filter((c) => c.length >= 15);

  for (const chunk of chunks) {
    if (isSoftPreferenceChunk(chunk)) continue;
    if (isWorkAuthorizationOnlyClause(chunk)) continue;
    if (isEuEeaCitizenshipMandate(chunk)) continue;
    if (!hasExplicitEligibilityAnchor(chunk)) continue;

    const countries = extractCountriesFromText(chunk);
    if (!countries.length) continue;
    if (countries.includes('Bulgaria')) continue;

    const countryList = countries.join(', ');
    return {
      blocked: true,
      countries,
      reason: `Explicit eligibility required: ${countryList}; Bulgaria not eligible`,
    };
  }

  return { blocked: false, countries: [], reason: '' };
};

const emptyGateFields = () => ({
  CountryListRemoteBlocked: false,
  CountryEligibilityBlockType: '',
  CountryListRemoteRejectReason: '',
  CountryListRemotePermitted: '',
  ExplicitEligibilityRequired: '',
});

const evaluateCountryEligibilityGate = (fullJobText, enrichmentStatus) => {
  const text = String(fullJobText || '').trim();
  const enrichmentOk =
    String(enrichmentStatus || '') === 'OK' && text.length >= MIN_FULL_JOB_TEXT;

  if (!enrichmentOk) return emptyGateFields();

  const trackA = detectExplicitRemoteCountryListBlock(text);
  if (trackA.blocked) {
    return {
      CountryListRemoteBlocked: true,
      CountryEligibilityBlockType: 'REMOTE_COUNTRY_LIST',
      CountryListRemoteRejectReason: trackA.reason,
      CountryListRemotePermitted: trackA.countries.join(', '),
      ExplicitEligibilityRequired: '',
    };
  }

  const trackB = detectExplicitEligibilityBlock(text);
  if (trackB.blocked) {
    return {
      CountryListRemoteBlocked: true,
      CountryEligibilityBlockType: 'EXPLICIT_ELIGIBILITY',
      CountryListRemoteRejectReason: trackB.reason,
      CountryListRemotePermitted: trackB.countries.join(', '),
      ExplicitEligibilityRequired: trackB.countries.join(', '),
    };
  }

  return emptyGateFields();
};

module.exports = {
  MIN_FULL_JOB_TEXT,
  evaluateCountryEligibilityGate,
  detectExplicitRemoteCountryListBlock,
  detectExplicitEligibilityBlock,
  extractCountriesFromText,
};
