# BG v1.1.2 Release Notes

**Release date:** July 2026  
**Production artifact:** `workflows/Executive_Job_CRM_BG_v1.1.2_PRODUCTION.json`  
**Related documentation:** [BG_CALIBRATION_PRINCIPLES.md](BG_CALIBRATION_PRINCIPLES.md)

---

## 1. Release Summary

**BG v1.1.2** is the first **production-ready Bulgaria workflow** for the Executive Job CRM pipeline.

This release delivers:

- **Executive scoring calibrated** across Preview, Initial, and Verified AI stages (v1 → v1.1.1 → FINAL → P3 calibration layers)
- **Production configuration restored** — BG-only location policy, Sheets gate, and stable n8n export suitable for import into the live instance
- **Released after multiple regression cycles** — iterative TEST-BG runs, calibration dataset review, and manual validation of representative jobs before freeze

BG v1.1.2 replaces ad-hoc BG dev exports as the authoritative Bulgaria production baseline.

---

## 2. Major Improvements

### Executive scoring and calibration

- **Executive Title Override** — routing for eligible executive titles without altering Preview scores
- **Bulgarian executive title support** — interpretation by responsibility level (e.g. Директор, Управител, Оперативен директор)
- **Executive Scope Override** — organizational scope outweighs Manager / Senior Manager / Executive Business Partner title hierarchy
- **Commercial executive calibration** — Commercial Director and related roles scored on GTM, pricing, partnerships, and revenue scope
- **Cross-country modernization calibration** — transformation and modernization Manager roles open for verification (e.g. KONE-style patterns)
- **Executive Business Partner / Chief of Staff calibration** — Strategy & Operations executive treatment when influence and execution ownership are present
- **Verified scoring improvements** — domain vs seniority separation, probability caps, CV selection, and substantive reject reasons

### Extraction and pipeline reliability

- **NO_JOB_CARD extraction improvements** — subject-line parsing (en-dash/em-dash normalization, alert-prefix subjects), `SUBJECT_FALLBACK` when card extraction fails but subject hint is valid
- **Digest email filtering** — skip LinkedIn carousel / similar-jobs digest subjects before AI extraction
- **Empty row prevention** — Gate Append blocks rows with empty Company/Role; NO_JOB_CARD path kept internal

### Operations and testing

- **HTTP throttling** — execution delay and concurrency controls for LinkedIn enrichment
- **TestLabel support** — `jobs-test-bg` and related DEV config for isolated regression runs
- **Google Sheets stability improvements** — consistent field mapping, extraction status, and pipeline stage handling

---

## 3. Regression Validation

BG v1.1.2 was validated through a structured regression process:

1. **Multiple TEST-BG runs** — n8n executions with `TestLabel=jobs-test-bg`, progressing Limit 1 → 10 → full dataset (~38 rows)
2. **Calibration dataset review** — row-level audit of Preview score, Verified score, recommendation, interview probability, CV selection, and reject reasons against expected executive judgment
3. **Executive false-positive / false-negative reduction** — targeted fixes for under-scored scope-heavy roles (e.g. TELUS, AnyTech365 EBP, Ingram Micro Sr Manager, Commercial Director typo normalization) and over-scored non-BG / junior roles
4. **Manual validation of representative jobs** — confirmation of subject fallback (Teva), digest skip, location rejects, and APPLY/MONITOR/REJECT consistency on real LinkedIn alert emails

Regression focused on **consistent executive judgment**, not perfect keyword matching on every edge case.

---

## 4. Known Engineering Backlog

The following are **engineering** items — not calibration changes — tracked for future BG maintenance:

| Item | Description |
|------|-------------|
| **Remaining parser edge cases** | Unusual subject formats, sparse email bodies, and multi-card emails may still require subject fallback or deterministic hints |
| **VMG location parsing** | Location string normalization and card vs FullJobText alignment for specific employer formats |
| **Probability normalization refinement** | Post-processing or prompt tightening if interview probability still drifts outside target bands on edge cases |

Calibration principles for scoring behavior are documented in [BG_CALIBRATION_PRINCIPLES.md](BG_CALIBRATION_PRINCIPLES.md). Backlog items should not drive further prompt churn unless regression proves a systematic scoring defect.

---

## 5. Production Status

**BG v1.1.2 is the production baseline** for Bulgaria.

| Policy | Guidance |
|--------|----------|
| **Import target** | `workflows/Executive_Job_CRM_BG_v1.1.2_PRODUCTION.json` |
| **Dev working file** | `workflows/Executive_Job_CRM_v1.1_BG_ONLY.json` (changes promote to a new tagged production snapshot) |
| **Future BG work** | Normally **bug fixes** and engineering backlog items — not major calibration changes |
| **Calibration changes** | Require regression (TEST-BG), updated principles doc if intent changes, and a new production snapshot version |

EMEA development should proceed on a **separate workflow branch/file**, selectively porting BG calibration principles where applicable — without modifying the frozen BG v1.1.2 production export in place.

---

*BG v1.1.2 — frozen for production. Ready for EMEA development.*
