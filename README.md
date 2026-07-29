# Executive Job CRM

## Overview

**Executive Job CRM** is an AI-assisted workflow that automatically processes LinkedIn executive job alerts from Gmail, evaluates them using a **two-stage AI pipeline** plus **deterministic rules**, and stores structured opportunities in **Google Sheets**.

The project is implemented as **n8n workflow-as-code** (JSON exports + documentation), not a conventional application. Each job passes through extraction, Preview screening, policy gates, and Verified evaluation before a CRM row is appended with score, recommendation, CV, interview probability, and reject rationale.

The **Bulgaria (BG)** workflow is in production at v1.1.2. **Executive Job CRM EMEA v1.1** is released and frozen at tag `v1.1-stable`. Future EMEA work belongs to **Executive Opportunity Intelligence (v2)**.

---

## Current Status

| Track | Status |
|-------|--------|
| **BG production** | v1.1.2 — `workflows/Executive_Job_CRM_BG_v1.1.2_PRODUCTION.json` |
| **BG dev working file** | `workflows/Executive_Job_CRM_v1.1_BG_ONLY.json` |
| **EMEA v1.1 stable (frozen)** | `workflows/Executive-Job-CRM-v1.1-STABLE.json` — tag `v1.1-stable` @ `862e423` (branch `emea-dev`) |
| **EMEA production snapshot** | v1.1.1 — `workflows/Executive-Job-CRM-v1.1-PRODUCTION.json` (branch `emea-v1.1`, tag `emea-v1.1.1`) |

BG v1.1.2 is the frozen production baseline for Bulgaria-eligible roles. **EMEA v1.1 is frozen** — import `Executive-Job-CRM-v1.1-STABLE.json` for the canonical v1.1 pipeline (Pre-PF gate, BUG-001/BUG-002 resolved). Planned enhancements move to **Executive Opportunity Intelligence (v2)**; do not extend v1.1 with new features.

---

## Main Features

- **Gmail integration** — label-filtered job alert ingestion
- **LinkedIn job extraction** — AI card extraction with subject fallback and digest skip
- **Two-stage AI evaluation** — Preview (email card) and Verified (full posting)
- **Executive Title Override** — routing for eligible executive titles
- **Executive Scope Override** — organizational scope outweighs modest titles (Manager / Sr Manager)
- **Commercial executive calibration** — GTM, pricing, partnerships, revenue scope
- **Deterministic location policy** — BG eligibility enforced outside AI judgment
- **CV recommendation** — COO, GTM, Strategy & Operations, AI Transformation, Program leadership
- **Interview probability estimation** — aligned with final recommendation
- **Google Sheets CRM** — searchable executive opportunity database
- **Duplicate prevention** — JobId and composite dedupe keys
- **Digest filtering** — skip LinkedIn carousel / similar-jobs emails
- **Test mode** — `TestMode`, `TestLabel`, and isolated TEST-BG regression fetch

---

## Repository Structure

```
executive-ai-platform/
├── workflows/          # n8n workflow JSON exports (runtime source of truth)
├── docs/               # Architecture, calibration, and project rules
├── README.md           # This file — project overview
├── CHANGELOG.md        # Version history
└── AGENTS.md           # Guidance for AI assistants (contributors)
```

**Key workflow files:**

| File | Role |
|------|------|
| `Executive_Job_CRM_BG_v1.1.2_PRODUCTION.json` | BG production import |
| `Executive_Job_CRM_v1.1_BG_ONLY.json` | BG development |
| `Executive-Job-CRM-v1.1-STABLE.json` | EMEA v1.1 stable import (frozen — tag `v1.1-stable`) |
| `Executive-Job-CRM-v1.1-PRODUCTION.json` | EMEA production snapshot (branch `emea-v1.1`) |

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/BG_CALIBRATION_PRINCIPLES.md](docs/BG_CALIBRATION_PRINCIPLES.md) | Executive scoring principles for BG and EMEA porting |
| [docs/BG_v1.1.2_RELEASE_NOTES.md](docs/BG_v1.1.2_RELEASE_NOTES.md) | BG v1.1.2 production release summary |
| [docs/BG_WORKFLOW_ARCHITECTURE.md](docs/BG_WORKFLOW_ARCHITECTURE.md) | BG v1.1.2 technical architecture |
| [docs/v1.1_FINAL_REVIEW.md](docs/v1.1_FINAL_REVIEW.md) | EMEA v1.1 stable release sign-off |
| [CHANGELOG.md](CHANGELOG.md) | Project version history |

Additional references: [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md), [docs/architecture/WORKFLOW_ARCHITECTURE.md](docs/architecture/WORKFLOW_ARCHITECTURE.md), [AGENTS.md](AGENTS.md).

---

## Roadmap

### Near-term

- **Executive Opportunity Intelligence (v2)** — company-centric discovery and remote-first employer intelligence
- **Shared calibration** — port BG principles where region-agnostic (v2 scope)
- **Parser improvements** — subject fallback and location edge cases (v2 scope)

### Long-term

- **Target company discovery** — proactive company-level intake
- **Executive outreach automation** — structured follow-up from CRM signals
- **CRM enrichment** — extended fields and pipeline status
- **AI market monitoring** — broader role and market trend awareness

---

*BG v1.1.2 in production · EMEA v1.1 frozen at `v1.1-stable` · v2 in planning*
