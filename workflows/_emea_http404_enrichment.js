// Offline mirror of Extract + Check Posting Closed routing (EMEA-HTTP404-A).
const POSTING_NOT_FOUND_HTTP = new Set([404, 410]);

const CLOSED_POSTING_ROUTE = 'CLOSED_REJECT';
const OPEN_POSTING_ROUTE = 'PROFESSIONAL_FIT';

const CLOSED_POSTING_PATTERNS = [
  /no longer accepting applications/i,
  /this job is no longer accepting applications/i,
  /applications are closed/i,
  /position has been filled/i,
  /job has expired/i,
  /job no longer available/i,
  /closed-job__flavor--closed/i,
];

const isPostingClosedText = (text) => {
  const raw = String(text || '').trim();
  if (!raw) return false;
  return CLOSED_POSTING_PATTERNS.some((re) => re.test(raw));
};

const resolveHttpStatusCode = (json) => {
  const direct = Number(json?.statusCode || 0);
  if (direct >= 400) return direct;
  const err = json?.error || {};
  const fromErr = Number(err.httpCode || err.statusCode || 0);
  if (fromErr >= 400) return fromErr;
  const msg = String(err.message || json?.message || '');
  const m = msg.match(/\b(404|410)\b/);
  if (m) return Number(m[1]);
  return direct || fromErr || 0;
};

const isPostingNotFoundHttp = (statusCode) => POSTING_NOT_FOUND_HTTP.has(Number(statusCode));

const evaluateExtractClosedPosting = ({ httpJson = {}, html = '' } = {}) => {
  const statusCode = resolveHttpStatusCode(httpJson);
  const htmlText = String(html || httpJson.body || httpJson.data || '');
  const postingClosedConfirmed =
    isPostingNotFoundHttp(statusCode) || isPostingClosedText(htmlText);
  const enrichmentError = statusCode >= 400 ? `HTTP ${statusCode}` : '';
  const enrichmentStatus =
    postingClosedConfirmed || statusCode >= 400 ? 'FAILED' : 'OK';

  return {
    statusCode,
    PostingClosedConfirmed: postingClosedConfirmed,
    PostingClosedRejectReason: postingClosedConfirmed ? 'Closed' : '',
    EnrichmentStatus: enrichmentStatus,
    EnrichmentError: enrichmentError,
  };
};

const routeAfterExtract = (extractOutput) => {
  if (extractOutput?.PostingClosedConfirmed === true) return CLOSED_POSTING_ROUTE;
  return OPEN_POSTING_ROUTE;
};

const shouldSkipProfessionalFit = (extractOutput) =>
  routeAfterExtract(extractOutput) === CLOSED_POSTING_ROUTE;

module.exports = {
  POSTING_NOT_FOUND_HTTP,
  CLOSED_POSTING_ROUTE,
  OPEN_POSTING_ROUTE,
  resolveHttpStatusCode,
  isPostingNotFoundHttp,
  isPostingClosedText,
  evaluateExtractClosedPosting,
  routeAfterExtract,
  shouldSkipProfessionalFit,
};
