# Project Rules

Engineering rules for the **Executive Opportunity Intelligence Platform** (n8n / Executive Job CRM). These rules apply to all workflow changes, documentation updates, and architectural decisions.

---

## 1. Workflow Environments

### Never modify production directly

- Do **not** edit, import, or activate changes on the production n8n workflow in place.
- Production changes must come from a reviewed, tested dev export — not ad-hoc edits in the live instance.
- If a hotfix is unavoidable, apply it to dev first, re-test, then promote to production.

### Development workflow files

- **EMEA v1.1 stable (frozen):** **`workflows/Executive-Job-CRM-v1.1-STABLE.json`** — canonical v1.1 export @ tag **`v1.1-stable`** / commit **`862e423`**. **Do not extend v1.1** with new features, gates, calibration, or prompt changes. v1.1 changes are limited to **emergency bug fixes** only.
- **EMEA production import:** **`workflows/Executive-Job-CRM-v1.1-PRODUCTION.json`** — earlier production snapshot @ tag `emea-v1.1.1` / `e59cf80` (62 nodes; Pre-PF not promoted). Updated only via explicit promotion when approved.
- **BG-only dev:** all development in **`workflows/Executive_Job_CRM_v1.1_BG_ONLY.json`** only.
- **Future EMEA work:** **Executive Opportunity Intelligence (v2)** — new workflow exports and documentation; do not resume feature development on v1.1 STABLE.
- Do not treat older exports (`v1.0.0`, `FIX*` snapshots, BG `rc*` snapshots, historical `Executive-Job-CRM-v1.1-DEV*.json` snapshots, etc.) as active development targets unless explicitly archiving or comparing history.

### EMEA tracks (production snapshot vs v1.1 stable)

EMEA v1.1 is **released and frozen**. The live multi-country pipeline is captured in **`Executive-Job-CRM-v1.1-STABLE.json`**.

| Track | Git branch | Workflow file | Role | Change policy |
|-------|------------|---------------|------|---------------|
| **v1.1 stable (frozen)** | `emea-dev` @ `v1.1-stable` | `Executive-Job-CRM-v1.1-STABLE.json` | Canonical v1.1 import | **Frozen.** Emergency bug fixes only. Tag **`v1.1-stable`** must not be moved or force-updated. |
| **Production snapshot** | `emea-v1.1` | `Executive-Job-CRM-v1.1-PRODUCTION.json` | Earlier promoted snapshot | **Frozen.** No direct edits. Promotion from STABLE only with explicit approval and regression. |

**Historical note:** Development during v1.1 build used `Executive-Job-CRM-v1.1-DEV.json` (removed at release). Rollback and regression history referencing that filename remain valid for old commits only.

**Rules:**

- Import **`Executive-Job-CRM-v1.1-STABLE.json`** for v1.1 production or regression replay of the frozen release.
- Never edit `Executive-Job-CRM-v1.1-STABLE.json` for v2 features — start v2 under new artifacts.
- Planned enhancements (Company Intelligence, multi-source intake, calibration) belong to **Executive Opportunity Intelligence (v2)**.
- Hotfixes to v1.1: minimal defect fix only → regression (Limit 1 → 10) → new maintenance commit; do **not** retag `v1.1-stable` without explicit release decision.

**Current v1.1 stable baseline:** tag **`v1.1-stable`** · commit **`862e423`** · 65 nodes (includes Pre-PF gate; BUG-001/BUG-002 resolved).

**Earlier production snapshot:** tag `emea-v1.1.1` · workflow commit `e59cf80` · 62 nodes / 60 connections.

### BG-only RC snapshots

The BG-only pipeline keeps **one working file** plus **numbered RC snapshots** in `workflows/`:

| Pattern | Example | Rule |
|---------|---------|------|
| Working | `Executive_Job_CRM_v1.1_BG_ONLY.json` | Edit freely between RC releases |
| Snapshot | `Executive_Job_CRM_v1.1_BG_ONLY_rc1.json`, `rc2.json`, … | **Immutable** after creation — compare or rollback only |

**Create a new RC** only when a logical feature or bug fix is **complete and tested** (Limit = 1 → 10 → 50), or immediately **before** the next significant logic change (to freeze the last tested state).

**Do not create an RC** for minor text-only edits that do not change runtime behavior.

To create the next snapshot:

```powershell
.\workflows\snapshot_bg_only_rc.ps1 -Message "What this RC captures"
```

Never edit existing `Executive_Job_CRM_v1.1_BG_ONLY_rc*.json` files in place.

---

## 2. Testing Requirements

Every **functional change** must be validated in this order before wider rollout:

| Stage | Gmail / batch limit | Purpose |
|-------|---------------------|---------|
| **1** | `Limit = 1` | Confirm basic path, parsing, and sheet write for a single email/job |
| **2** | `Limit = 10` | Catch edge cases, fan-out, and rate-limit behavior |
| **3** | `Limit = 50` | Stress-test batching, delays, API quotas, and merge/reject paths |

- Do not skip stages.
- Do not increase limits until the current stage passes without regressions.
- Document what was tested (date, limit, outcome) when promoting a change.
- Follow the **EMEA Development Lifecycle** and **Regression Catalog** in `docs/PROJECT_BACKLOG.md` (`EMEA-REGRESSION-FRAMEWORK`): specification → regression design → implementation → deterministic regression (when applicable) → n8n regression → documentation → DONE.

Non-functional changes (comments, docs-only, node repositioning with no logic change) still benefit from at least a **Limit = 1** smoke test.

---

## 3. Data Contract & Schema

### Google Sheets schema

- **Preserve the existing Google Sheets column schema** unless the change explicitly includes a schema update.
- Before adding, removing, or remapping columns, confirm impact on the live CRM sheet and any downstream use (filters, reports, manual review).
- Coordinate sheet header changes with the workflow export in the same change set.

### Output fields

- **Never rename output fields** (Code node JSON keys, normalized evaluation fields, sheet mappings) without documenting the migration.
- A field rename requires:
  - A note in the change description or architecture docs
  - Updated column mapping in the workflow (if applicable)
  - Awareness of existing rows that used the old field names

Refer to `docs/architecture/WORKFLOW_ARCHITECTURE.md` for the current field model.

---

## 4. Workflow Conventions

### Node naming

- **Keep node names descriptive** — purpose and service should be obvious (e.g. `AI - Extract Job Cards`, `Check Location Eligibility`).
- Avoid generic names (`Code in JavaScript`, `Message a model`, `Replace Me`).
- Use a consistent pattern: `{Service} - {Action}` for integrations; `{Verb} {Object}` for logic nodes where appropriate.

### AI prompts

- **Do not introduce new AI prompts** (or materially change existing ones) without documenting their purpose.
- Document: objective, inputs, expected JSON shape, rejection/fit rules, and which model is used.
- Prompt changes are functional changes — they follow the **Limit = 1 → 10 → 50** testing sequence.

---

## 5. Change Philosophy

### Incremental over big-bang

- **Prefer incremental changes** over large refactors.
- Small, reviewable diffs are easier to test, revert, and reason about in n8n JSON.
- Split risky work into steps: e.g. extract logic → test → rename nodes → test again.

### Architectural changes

- **Before proposing architectural changes** (sub-workflows, dedupe services, externalized config, new integrations), **explain trade-offs**:
  - Impact on workflow stability
  - Testing and rollback complexity
  - Operational cost (AI calls, API limits)
  - Migration effort for existing sheet data and credentials
- Do not refactor for style alone when the current pipeline is stable and meeting requirements.

### Stability first

- **Treat workflow stability as the highest priority.**
- A working pipeline that reliably ingests, evaluates, and writes to Sheets outweighs clever abstractions or premature optimization.
- When in doubt, choose the change that is easier to test and revert.

---

## 6. Quick Checklist (before merge / promote)

- [ ] Change made only in the correct working file — EMEA v1.1: **`Executive-Job-CRM-v1.1-STABLE.json` emergency fixes only**; v2: new artifacts; BG: **`Executive_Job_CRM_v1.1_BG_ONLY.json`**; never edit PRODUCTION snapshots or RC files in place
- [ ] BG-only: RC snapshot created when required (see §1 BG-only RC snapshots)
- [ ] Tested at Limit = 1, then 10, then 50 (functional changes)
- [ ] Google Sheets schema unchanged, or migration documented
- [ ] No silent output field renames
- [ ] Node names remain descriptive
- [ ] New/changed AI prompts documented
- [ ] Change is incremental and reversible where possible
- [ ] Architecture trade-offs noted if structure changed

---

## Related Documentation

- [Workflow Architecture](./architecture/WORKFLOW_ARCHITECTURE.md) — nodes, data flow, field evolution (may reference pre-stable DEV history)
- `workflows/Executive-Job-CRM-v1.1-STABLE.json` — EMEA v1.1 canonical frozen export
- `workflows/Executive_Job_CRM_v1.1_BG_ONLY.json` — BG-only working export
- `workflows/snapshot_bg_only_rc.ps1` — create next BG-only RC snapshot
