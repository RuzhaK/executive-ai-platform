# Project Status

## Executive Job CRM Bulgaria

**Status:** Production

**Purpose:**  
Automated intake, filtering, scoring, and CRM storage of executive job opportunities relevant to Bulgaria.

**Current state:**

- Production workflow
- Maintained separately from EMEA
- Changes allowed only through its own controlled release process

## Executive Job CRM EMEA

**Status:** Production (patch release) — v1.1 line frozen except emergency bug fixes

**Current production release:**

- **Version:** `v1.1.1-stable`
- **Canonical workflow:** `workflows/Executive-Job-CRM-v1.1.1-STABLE.json` (73 nodes)
- **Runtime validation:** completed successfully in n8n (execution **#1445**)
- **Published in n8n** after validation
- **BUG-003 fix:** production Gmail fetch uses the exact trigger Gmail message ID (`config.id`) via `fetchMode='byEmailId'` — no Get Many re-query in production

**Historical frozen baseline:**

- **Version:** `v1.1-stable`
- **Release commit:** `862e423`
- **Canonical workflow:** `workflows/Executive-Job-CRM-v1.1-STABLE.json` (65 nodes)
- **Do not move or overwrite** tag `v1.1-stable` or the frozen STABLE export

**Maintenance policy:**

- Do not modify v1.1 workflows for feature development, calibration, or new gates.
- Only emergency bug fixes are allowed on the v1.1 line.
- Any emergency fix requires validation in n8n, a new commit, and a new patch release tag (not a retag of `v1.1-stable`).
- Future EMEA capability belongs to **Executive Opportunity Intelligence (v2)** — do not build v2 inside v1.1 exports.

## Executive Opportunity Intelligence

**Status:** Planned

**Version:** v2

**Purpose:**  
Shift the system from job-level filtering toward company-level opportunity intelligence.

**Initial direction:**

- Identify and monitor target remote-first and executive-relevant companies
- Track company career pages and ATS sources
- Reuse existing ATS integrations where appropriate
- Classify opportunities as TARGET, BRIDGE, WATCH, or NONE
- Separate operational apply decisions from long-term career strategy

**Development rules:**

- Start on a new branch
- Use a new workflow export
- Do not build v2 inside the frozen v1.1 workflow
- Create architecture and MVP scope before implementation

## Repository Source of Truth

- **Current project status:** `PROJECT_STATUS.md`
- **General project instructions:** `README.md`
- **Release history:** `CHANGELOG.md`
- **v1.1 release review:** `docs/v1.1_FINAL_REVIEW.md`
- **Project rules:** `docs/PROJECT_RULES.md`
