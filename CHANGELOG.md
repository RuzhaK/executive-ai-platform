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

**Current validated baseline:** `2db88cf490974b57c0078b5ae9056a6dd85b01c4`
