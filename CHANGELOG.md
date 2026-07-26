# Changelog

## v1.0

- Initial Executive Job CRM prototype
- Gmail → AI → Google Sheets pipeline
- Initial executive scoring

## v1.1

- BG workflow stabilization
- TestMode support
- TestLabel support
- HTTP throttling
- Google Sheets reliability improvements
- Empty row prevention
- Policy engine improvements

## v1.1.1

- Executive Title Override
- Bulgarian executive title support
- Executive Scope Override
- Commercial executive calibration
- Chief of Staff / Executive Business Partner calibration
- Cross-country modernization calibration
- Improved extraction reliability
- NO_JOB_CARD recovery
- Regression improvements

## v1.1.2

- BG production release
- Final executive calibration
- Production configuration restored
- Production workflow snapshot
- Documentation completed
- Frozen production baseline

## EMEA v1.1 dev (`emea-v1.1` branch)

Preview calibration and output-contract commits on `Executive-Job-CRM-v1.1-DEV.json` (not BG production).

| Commit | Summary | Runtime validated |
|--------|---------|-------------------|
| `c8d2664` | Harden closed posting gate | — |
| `05a4c5f` | German title gate on output-norm baseline | — |
| `330a3ea` | Stop writing legacy `Score` column to CRM sheet | — |
| `2db88cf` | Targeted executive-operations preview floor (`Preview Score Job`; floor **6**, threshold **7**) | **Yes** — `Executive Job CRM - EMEA DEV v22.xlsx`; Business Support and Operations Director → `PreviewScore = 6`, `MONITOR`, preview gate still fails at 7 |
| `2bc9b6c` | Targeted exec-ops preview pass at score 6 (`qualifiesForExecOpsFloor`; global threshold **7** unchanged) | **Yes** — `Executive Job CRM - EMEA DEV v24.xlsx`; Business Support and Operations Director → `PreviewScore = 6`, `MONITOR`, `PreviewPassesThreshold = true`, full pipeline → `APPLY NOW` / `FINAL_ACCEPT`; Head of e-commerce variants remain `PREVIEW_REJECT` |
| `90d7a3c` | EMEA-C4 country eligibility gate on `FullJobText` (Track A remote country-list · Track B explicit eligibility; `COUNTRY_ELIGIBILITY`) | Offline matrix 17/17; Limit 50 PASS path — `Executive Job CRM - EMEA DEV v27.xlsx` |
| `df37378` | **EMEA v1.1 release baseline** — `PreviewScoreThreshold = 5` (Preview Score Job only); Verified threshold **7** unchanged | **Yes** — Airalo Strategy Director JobId `4430353001` → Enrichment OK → `COUNTRY_ELIGIBILITY` → `FINAL_REJECT`; Verified AI skipped |

### EMEA v1.1 release (`df37378`) — 2026-07-22

- **Preview opening threshold:** **5** (was 7 at Limit 50 baseline `v27`)
- **Verified threshold:** **7** (unchanged)
- **EMEA-C4:** **COMPLETE** — PASS @ Limit 50; BLOCK @ Airalo targeted test
- **Runtime BLOCK validation case:** Airalo / Strategy Director / JobId `4430353001`
- **Topology:** 58 nodes / 70 connections
- **Next gate (not in v1.1 tag):** EMEA-C5 (founder/co-founder)
- **Future work (backlog only):** `EMEA-PREVIEW-CALIBRATION` — evaluate thresholds 5/6/7 on larger datasets; improve Preview scoring for strategy/director roles without materially increasing enrichment cost

**Current validated baseline:** `df37378c0c1d81a66eea4228bdea5045298e5e0f` (ready to tag as EMEA v1.1)

## EMEA v1.1.1 — Professional Fit + dual-track (2026-07-27)

- **Professional Fit stage** — `AI - Professional Fit` + `Normalize Professional Fit` before eligibility; PF preservation in `Normalize Verified Review`
- **Regression:** 10-job PASS @ `e59cf80` (EMEA-PF-A)
- **Dual-track:** branch `emea-v1.1` (production) + branch `emea-dev` (active development)
- **Production import:** `workflows/Executive-Job-CRM-v1.1-PRODUCTION.json` · tag `emea-v1.1.1`
- **Development import:** `workflows/Executive-Job-CRM-v1.1-DEV.json` on `emea-dev`
- **Topology:** 62 nodes / 60 connections
