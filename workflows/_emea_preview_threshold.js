// Offline mirror of Preview Score Job gate (Preview Score Job node only).
const PREVIEW_SCORE_THRESHOLD = 3;
const EXEC_OPS_PREVIEW_SCORE_FLOOR = 6;

const clampScore = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
};

const computePreviewPassesThreshold = ({
  aiPreviewScore,
  qualifiesForExecOpsFloor = false,
  previewScoreThreshold = PREVIEW_SCORE_THRESHOLD,
}) => {
  let previewScore = clampScore(aiPreviewScore);

  if (qualifiesForExecOpsFloor && previewScore < EXEC_OPS_PREVIEW_SCORE_FLOOR) {
    previewScore = EXEC_OPS_PREVIEW_SCORE_FLOOR;
  }

  return (
    previewScore >= previewScoreThreshold ||
    (qualifiesForExecOpsFloor && previewScore >= EXEC_OPS_PREVIEW_SCORE_FLOOR)
  );
};

const routeAfterPreviewGate = (previewPassesThreshold) =>
  previewPassesThreshold ? 'ENRICHMENT' : 'PREVIEW_REJECT';

module.exports = {
  PREVIEW_SCORE_THRESHOLD,
  EXEC_OPS_PREVIEW_SCORE_FLOOR,
  clampScore,
  computePreviewPassesThreshold,
  routeAfterPreviewGate,
};
