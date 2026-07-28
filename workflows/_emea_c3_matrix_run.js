const MIN_FULL_JOB_TEXT = 200;

const WORKING_LANGUAGE_ALLOWLIST = ['english', 'bulgarian'];

const ALL_SUPPORTED_LANGUAGE_NAMES = [
  'english',
  'bulgarian',
  'spanish',
  'german',
  'french',
  'dutch',
  'italian',
  'portuguese',
  'polish',
  'czech',
  'hungarian',
  'romanian',
  'greek',
  'swedish',
  'norwegian',
  'danish',
  'finnish',
  'russian',
  'ukrainian',
  'arabic',
  'chinese',
  'mandarin',
  'cantonese',
  'japanese',
  'korean',
  'hindi',
  'turkish',
  'hebrew',
  'slovak',
  'croatian',
  'serbian',
  'vietnamese',
  'thai',
  'indonesian',
  'malay',
  'tagalog',
  'flemish',
  'catalan',
];

const SOFT_PREFERENCE_ONLY =
  /\b(preferred|nice to have|highly desirable|desirable|advantageous|a plus|ideally|would be (?:a )?bonus|helpful|beneficial|bonus)\b/i;

const MANDATORY_IN_CLAUSE =
  /\b(required|mandatory|essential|must|non-negotiable|need to|needs to|is a must)\b/i;

const LANGUAGE_SKILL_CTX =
  /\b(fluent|fluency|native|speaker|speaking|professional fluency|business fluency|proficiency|proficient|working language|language skills?|working knowledge|communicate in|written and spoken|oral and written|command of|must speak)\b/i;

const LANG_SPEAKING_OBJECT_NOUNS =
  /\b(customers|markets|clients|client|portfolio|audience|users|regions|territories|countries|country|team|teams|stakeholders|suppliers|partners|vendors)\b/i;

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeLangToken = (value) => String(value || '').toLowerCase().trim();

const isAllowlistedWorkingLanguage = (lang) =>
  WORKING_LANGUAGE_ALLOWLIST.includes(normalizeLangToken(lang));

const langWordPattern = (lang) => new RegExp(`\\b${escapeRegExp(normalizeLangToken(lang))}\\b`, 'i');

const splitLocalClauses = (chunk) => {
  const parts = String(chunk || '')
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length ? parts : [String(chunk || '').trim()];
};

const isSoftPreferenceChunk = (chunk) =>
  SOFT_PREFERENCE_ONLY.test(chunk) && !MANDATORY_IN_CLAUSE.test(chunk);

const isLocalizationDutyChunk = (chunk) =>
  /\b(translation|translat(?:e|ing|ion)|localization|localisation)\b/i.test(chunk) &&
  !LANGUAGE_SKILL_CTX.test(chunk);

const isLangSpeakingObjectReference = (clause, lang) => {
  const e = escapeRegExp(normalizeLangToken(lang));
  return new RegExp(`\\b${e}[- ]speaking\\s+${LANG_SPEAKING_OBJECT_NOUNS.source}`, 'i').test(clause);
};

const isSoftOptionalForLang = (clause, lang) => {
  const e = escapeRegExp(normalizeLangToken(lang));
  if (!langWordPattern(lang).test(clause)) return false;

  const patterns = [
    new RegExp(`${e}[\\s\\S]{0,80}\\b(preferred|nice to have|highly desirable|desirable|advantageous|a plus|plus|bonus|helpful|beneficial)\\b`, 'i'),
    new RegExp(`\\b(preferred|nice to have|highly desirable|desirable|advantageous|a plus|plus|bonus|helpful|beneficial)[\\s\\S]{0,80}${e}\\b`, 'i'),
    new RegExp(`\\b${e}\\b[^,.;]{0,50}\\b(is\\s+)?(a\\s+)?plus\\b`, 'i'),
    new RegExp(`\\bwith\\s+${e}\\b[^,.;]{0,50}\\b(advantageous|preferred|desirable|beneficial|helpful|a plus|plus|bonus)\\b`, 'i'),
  ];

  return patterns.some((pattern) => pattern.test(clause));
};

const hasLanguageSkillAnchor = (clause, lang) => {
  const e = escapeRegExp(normalizeLangToken(lang));
  if (!langWordPattern(lang).test(clause)) return false;
  if (isLangSpeakingObjectReference(clause, lang)) return false;

  const patterns = [
    new RegExp(`\\b(fluent|fluency)\\s+(in\\s+)?(the\\s+)?${e}\\b`, 'i'),
    new RegExp(`\\b${e}\\s+(language\\s+)?(fluency|fluent|fluently)\\b`, 'i'),
    new RegExp(`\\bnative\\s+${e}(\\s+speaker)?\\b`, 'i'),
    new RegExp(`\\b${e}\\s+native\\s+speaker\\b`, 'i'),
    new RegExp(`\\b${e}\\s+language\\s+(proficiency|skills?)\\b`, 'i'),
    new RegExp(`\\b(proficiency|proficient)\\s+(in\\s+)?(the\\s+)?${e}\\b`, 'i'),
    new RegExp(`\\b(professional|business)[- ]?(level\\s+)?(fluency|proficiency|working\\s+proficiency)\\s+(in\\s+)?(the\\s+)?${e}\\b`, 'i'),
    new RegExp(`\\bworking\\s+knowledge\\s+of\\s+(the\\s+)?${e}\\b`, 'i'),
    new RegExp(`\\b${e}\\s+as\\s+(a\\s+)?working\\s+language\\b`, 'i'),
    new RegExp(`\\bworking\\s+language\\s*[:\\-â€“â€”]?\\s*${e}\\b`, 'i'),
    new RegExp(`\\bmust\\s+speak\\s+(the\\s+)?${e}\\b`, 'i'),
    new RegExp(`\\bability\\s+to\\s+communicate\\s+in\\s+(the\\s+)?${e}\\b`, 'i'),
    new RegExp(`\\b(written\\s+and\\s+spoken|oral\\s+and\\s+written|spoken\\s+and\\s+written)\\s+(the\\s+)?${e}\\b`, 'i'),
    new RegExp(`\\b(excellent|strong|good|high|outstanding)\\s+(written\\s+and\\s+spoken|oral\\s+and\\s+written|spoken\\s+and\\s+written)\\s+(the\\s+)?${e}\\b`, 'i'),
    new RegExp(`\\b${e}\\s+language\\s+skills?\\b`, 'i'),
    new RegExp(`\\blanguage\\s+skills?\\s+(in\\s+)?(the\\s+)?${e}\\b`, 'i'),
    new RegExp(`\\b(command|mastery)\\s+of\\s+(the\\s+)?${e}(\\s+language)?\\b`, 'i'),
    new RegExp(`\\b${e}\\s+speaker\\b`, 'i'),
  ];

  return patterns.some((pattern) => pattern.test(clause));
};

const hasMandatorySkillRequirement = (clause, lang) => {
  const e = escapeRegExp(normalizeLangToken(lang));

  if (new RegExp(`\\bmust\\s+speak\\s+(the\\s+)?${e}\\b`, 'i').test(clause)) return true;
  if (new RegExp(`\\bability\\s+to\\s+communicate\\s+in\\s+(the\\s+)?${e}\\b`, 'i').test(clause)) return true;
  if (new RegExp(`\\b${e}\\s+language\\s+proficiency\\s+(is\\s+)?mandatory\\b`, 'i').test(clause)) return true;
  if (new RegExp(`\\b(professional|business)[^,.;]{0,50}\\b${e}\\b[^,.;]{0,50}\\bmandatory\\b`, 'i').test(clause)) return true;

  const pairedPatterns = [
    new RegExp(`\\b(fluent|fluency|native|proficien\\w+|speaker|written and spoken|oral and written|working knowledge|command of|language skills?|communicate in)[^,.;]{0,60}\\b${e}\\b[^,.;]{0,60}\\b(required|mandatory|essential)\\b`, 'i'),
    new RegExp(`\\b(required|mandatory|essential)[^,.;]{0,60}\\b${e}\\b[^,.;]{0,60}\\b(fluent|fluency|native|proficien\\w+|speaker|written and spoken|oral and written|language skills?)\\b`, 'i'),
    new RegExp(`\\b(excellent|strong|good|high|outstanding)\\s+(written\\s+and\\s+spoken|oral\\s+and\\s+written|spoken\\s+and\\s+written)\\s+(the\\s+)?${e}\\b[^,.;]{0,40}\\b(is\\s+)?essential\\b`, 'i'),
    new RegExp(`\\bnative\\s+${e}\\s+speaker[^,.;]{0,40}\\b(required|mandatory|essential)\\b`, 'i'),
  ];

  if (pairedPatterns.some((pattern) => pattern.test(clause))) return true;

  if (hasLanguageSkillAnchor(clause, lang) && MANDATORY_IN_CLAUSE.test(clause)) return true;

  return false;
};

const isNonSkillLanguageContext = (clause, lang) => {
  if (hasLanguageSkillAnchor(clause, lang)) return false;

  const e = escapeRegExp(normalizeLangToken(lang));
  const patterns = [
    new RegExp(`\\b${e}\\b[^,.;]{0,60}\\b(citizenship|authorization|work\\s+authorization|work\\s+permit|nationals?|market|sector|office|attendance|customers|clients|portfolio|region|geograph\\w*)\\b`, 'i'),
    new RegExp(`\\b(citizenship|authorization|work\\s+authorization|work\\s+permit|nationals?|market|sector|office|attendance|customers|clients|portfolio|background|experience|luxury\\s+sector)[^,.;]{0,60}\\b${e}\\b`, 'i'),
    new RegExp(`\\b${e}\\b[^,.;]{0,40}\\b(luxury\\s+sector|market)\\b`, 'i'),
    new RegExp(`\\b${e}\\b[^,.;]{0,20}\\brequired\\b`, 'i'),
    new RegExp(`\\bnationals?\\s+only\\b`, 'i'),
  ];

  return patterns.some((pattern) => pattern.test(clause));
};

const detectBlockedMandatoryLanguage = (chunk) => {
  if (isSoftPreferenceChunk(chunk)) return null;
  if (isLocalizationDutyChunk(chunk)) return null;

  const localClauses = splitLocalClauses(chunk);
  for (const localClause of localClauses) {
    if (isSoftPreferenceChunk(localClause)) continue;

    for (const lang of ALL_SUPPORTED_LANGUAGE_NAMES) {
      if (isAllowlistedWorkingLanguage(lang)) continue;
      if (!langWordPattern(lang).test(localClause)) continue;
      if (isSoftOptionalForLang(localClause, lang)) continue;
      if (isLangSpeakingObjectReference(localClause, lang)) continue;
      if (isNonSkillLanguageContext(localClause, lang)) continue;
      if (!hasLanguageSkillAnchor(localClause, lang)) continue;
      if (!hasMandatorySkillRequirement(localClause, lang)) continue;
      return normalizeLangToken(lang);
    }
  }

  return null;
};

const toLanguageLabel = (lang) =>
  normalizeLangToken(lang).replace(/\b\w/g, (char) => char.toUpperCase());

const detectMandatoryWorkingLanguageBlock = (fullJobText) => {
  const text = String(fullJobText || '').trim();
  if (text.length < MIN_FULL_JOB_TEXT) return { blocked: false, reason: '', label: '' };

  const chunks = text
    .split(/[.;\n]/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 20);

  for (const chunk of chunks) {
    const blockedLang = detectBlockedMandatoryLanguage(chunk);
    if (blockedLang) {
      const label = toLanguageLabel(blockedLang);
      return {
        blocked: true,
        label,
        reason: `Mandatory working language: ${label}`,
      };
    }
  }

  return { blocked: false, reason: '', label: '' };
};

const evaluateLanguageGate = (fullJobText, enrichmentStatus) => {
  const text = String(fullJobText || '').trim();
  const enrichmentOk =
    String(enrichmentStatus || '') === 'OK' && text.length >= MIN_FULL_JOB_TEXT;
  const block = enrichmentOk
    ? detectMandatoryWorkingLanguageBlock(text)
    : { blocked: false, reason: '', label: '' };

  return {
    MandatoryLanguageBlocked: block.blocked,
    MandatoryLanguageRejectReason: block.reason || '',
    MandatoryLanguageLabel: block.label || '',
  };
};

const PAD = 'Additional posting context padding text for minimum length requirement.';
const pad = (text) => {
  const base = String(text || '').trim();
  if (base.length >= 200) return base;
  return (base + ' ' + PAD + ' ' + PAD).slice(0, 220);
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
  const result = evaluateLanguageGate(fullJobText, testCase.enrichmentStatus || 'OK');
  const pass = result.MandatoryLanguageBlocked === testCase.expectBlocked;
  if (!pass) failed += 1;
  WScript.Echo((pass ? 'PASS' : 'FAIL') + ' [' + testCase.group + '] ' + testCase.text + ' => blocked=' + result.MandatoryLanguageBlocked + (result.MandatoryLanguageLabel ? ' (' + result.MandatoryLanguageLabel + ')' : ''));
}
if (failed > 0) {
  WScript.Echo('');
  WScript.Echo(failed + ' matrix case(s) failed.');
  WScript.Quit(1);
}
WScript.Echo('');
WScript.Echo('All ' + cases.length + ' matrix cases passed.');
