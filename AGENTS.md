# AGENTS.md

Guidance for AI assistants working on the **Executive Opportunity Intelligence Platform**.

Read **[PROJECT_STATUS.md](PROJECT_STATUS.md)** first for the authoritative overview of each track (BG production, EMEA v1.1 frozen, v2 planned).

---

## What This Project Is

This is an **n8n automation project**, not a traditional software application.

- There is no conventional app codebase, build pipeline, or deployable service in the usual sense.
- The automation is defined as **n8n workflow JSON** plus supporting documentation.
- Logic lives in **workflow nodes** (Code nodes, IF nodes, OpenAI nodes, Gmail, Google Sheets) — not in a separate application layer.
- Changes are made by editing workflow exports and importing them into n8n, not by shipping compiled artifacts.

Treat the repository as **workflow-as-code** with docs, not as a Node/Python/React project unless that explicitly changes in the future.

---

## Source of Truth

**The workflow JSON is the primary source of truth** for runtime behavior.

| Priority | Artifact | Role |
|----------|----------|------|
| 0 | [PROJECT_STATUS.md](PROJECT_STATUS.md) | Authoritative project status (BG / EMEA / v2) |
| 1 | `workflows/Executive-Job-CRM-v1.1-STABLE.json` | **Canonical EMEA v1.1** — frozen @ tag `v1.1-stable` / commit `862e423` |
| 1 | `workflows/Executive_Job_CRM_v1.1_BG_ONLY.json` | Canonical **BG-only** working workflow — logic changes for Bulgaria-only pipeline |
| 2 | [docs/v1.1_FINAL_REVIEW.md](docs/v1.1_FINAL_REVIEW.md) | EMEA v1.1 release sign-off and known-issue resolution |
| 2 | [docs/architecture/WORKFLOW_ARCHITECTURE.md](docs/architecture/WORKFLOW_ARCHITECTURE.md) | Architecture reference (body may reflect pre-STABLE as-built; see FINAL_REVIEW for 65-node STABLE) |
| 3 | [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md) | Engineering rules: testing, schema, naming, change policy |
| 4 | `workflows/Executive_Job_CRM_v1.1_BG_ONLY_rc*.json` | BG-only RC snapshots — immutable after creation; compare or rollback only |
| 5 | Other workflow exports (`FIX*`, `v1.0.0`, `Executive-Job-CRM-v1.1-DEV*.json` snapshots, etc.) | Historical snapshots — compare or rollback only; do not edit for active work |

Documentation describes the workflow; it does not override the JSON. If docs and JSON disagree, flag the discrepancy and treat the **relevant canonical workflow export** (STABLE for EMEA v1.1, BG_ONLY for BG) as authoritative until the user resolves it.

**Historical note:** EMEA v1.1 was developed in `Executive-Job-CRM-v1.1-DEV.json`, removed at release commit `862e423`. Git history and rollback commands referencing that filename remain valid for old commits only.

---

## EMEA v1.1 — Released and Frozen

Executive Job CRM **EMEA v1.1 is released and frozen**.

| Item | Value |
|------|-------|
| **Tag** | `v1.1-stable` (do not move or rewrite) |
| **Release commit** | `862e423` |
| **Canonical import** | `workflows/Executive-Job-CRM-v1.1-STABLE.json` |
| **Nodes** | 65 (Pre-PF gate; BUG-001/BUG-002 resolved) |

**Maintenance policy:**

- Do **not** modify the STABLE workflow for feature development, calibration, new gates, or prompt tuning.
- Only **emergency bug fixes** are permitted on v1.1.
- Any emergency fix requires: minimal diff → Limit 1 → 10 validation → new commit → **new patch release tag** (not a retag of `v1.1-stable`).
- Do **not** build v2 inside the frozen v1.1 workflow.

---

## Executive Opportunity Intelligence (v2)

**Status:** Planned. All **new EMEA feature work** belongs to v2, not v1.1.

**Initial direction:**

- Company-level opportunity intelligence (remote-first employers, career pages, ATS sources)
- Classify opportunities as TARGET, BRIDGE, WATCH, or NONE
- Separate operational apply decisions from long-term career strategy

**Development rules for assistants:**

- Start on a **new branch**
- Use a **new workflow export** (do not extend `Executive-Job-CRM-v1.1-STABLE.json`)
- Create architecture and MVP scope **before** implementation
- Follow [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md) and propose a plan before workflow logic changes

---

## Required Reading Before Changes

Before proposing or making **workflow logic changes**, read:

1. **[PROJECT_STATUS.md](PROJECT_STATUS.md)** — confirm which track (BG / EMEA v1.1 / v2) the request belongs to.
2. **[docs/PROJECT_RULES.md](docs/PROJECT_RULES.md)** — follow testing limits, schema rules, and stability policy.
3. **[docs/architecture/WORKFLOW_ARCHITECTURE.md](docs/architecture/WORKFLOW_ARCHITECTURE.md)** — nodes, inputs/outputs, rejection paths, field evolution.
4. For EMEA v1.1 context only: **[docs/v1.1_FINAL_REVIEW.md](docs/v1.1_FINAL_REVIEW.md)**.

Skim the relevant sections of the **canonical workflow JSON** for the track you are working on (STABLE for EMEA v1.1 reference/emergency fixes; BG_ONLY for BG; new export for v2).

---

## How to Work on This Project

### Propose a plan first

- **Always propose a plan before modifying workflow logic.**
- The plan should name: affected nodes, expected behavior change, testing steps (Limit = 1 → 10 → 50), and rollback approach.
- Wait for user confirmation on non-trivial or breaking changes before editing the workflow file.
- If the user asks for v2 features on EMEA, redirect to v2 scope — do not implement in STABLE.

### Keep changes minimal and reversible

- Prefer the **smallest diff** that solves the stated problem.
- Avoid drive-by refactors, renames, or reorganizations unless requested.
- Structure changes so they can be reverted by restoring the previous workflow export or git commit.

### Explain the why

- **Explain why each proposed change improves reliability or maintainability.**
- Tie rationale to concrete outcomes: fewer parse failures, clearer reject reasons, safer sheet writes, lower AI cost, easier debugging — not abstract “clean code” preferences.

### Never make breaking changes silently

- **Never make breaking changes without explaining them first.**
- Breaking changes include: renamed output fields, altered Google Sheets column mapping, removed nodes/branches, changed score thresholds, new AI prompts that alter decisions, removed dedupe or reject paths.
- Call out migration impact on existing sheet rows and in-flight n8n executions.

### Preserve backward compatibility

- **Prefer preserving backward compatibility** with existing sheet data, field names, node contracts, and user workflows.
- Additive changes (new optional fields, new branches) are safer than replacements.
- **Never remove existing functionality unless explicitly requested** by the user.

---

## Rules You Must Respect

All assistant work must comply with **[docs/PROJECT_RULES.md](docs/PROJECT_RULES.md)**. In summary:

- **EMEA v1.1:** frozen in `Executive-Job-CRM-v1.1-STABLE.json` — emergency bug fixes only; no feature work.
- **EMEA v2:** new branch, new workflow export, architecture before implementation.
- **BG-only:** edit `Executive_Job_CRM_v1.1_BG_ONLY.json` only; create RC snapshots before significant logic changes (see [BG-only RC versioning](#bg-only-rc-versioning)).
- Never modify production n8n instances or PRODUCTION JSON snapshots directly.
- Test functional changes at **Limit = 1, then 10, then 50**.
- Preserve the Google Sheets schema unless explicitly changing it.
- Never rename output fields without documenting migration.
- Keep node names descriptive; document new or changed AI prompts.
- Prefer incremental changes; explain trade-offs before architectural shifts.
- **Workflow stability is the highest priority.**

If a user request conflicts with PROJECT_RULES or asks for v1.1 feature development, explain the conflict and suggest a v2-compliant alternative.

---

## What to Avoid

- Building **v2 features** inside `Executive-Job-CRM-v1.1-STABLE.json`.
- Treating **`Executive-Job-CRM-v1.1-DEV.json`** as an active workflow (file removed at release; historical commits/snapshots only).
- Moving, rewriting, or force-updating tag **`v1.1-stable`**.
- Refactoring the workflow into sub-workflows or external services without a requested plan and trade-off analysis.
- Editing RC snapshot JSON files (`Executive_Job_CRM_v1.1_BG_ONLY_rc*.json`) — edit the BG working file only; snapshots are read-only.
- Editing multiple historical exports instead of the single canonical file for the track.
- Stripping `pinData`, credentials, or instance IDs from exports unless the user asked for sanitization for Git.
- Introducing dependencies (npm packages, Docker, scripts) unless the user explicitly wants that direction.
- Assuming git, CI, or test runners exist — verify before relying on them.

---

## Suggested Response Pattern

When the user asks for a workflow change:

1. **Confirm track** — BG, EMEA v1.1 (emergency only), or v2.
2. **Confirm scope** — which node(s) and behavior.
3. **Reference architecture** — how the change fits the current pipeline.
4. **Propose a plan** — minimal steps, risks, testing sequence, rollback.
5. **Explain benefit** — reliability or maintainability improvement.
6. **Implement only after approval** (for non-trivial changes) or when the request is clearly scoped and safe.
7. **Remind of manual testing** — n8n import + Limit = 1/10/50.

When the user asks for analysis or documentation only, do not modify workflow files unless asked.

---

## BG-only RC versioning

The **Bulgaria-only** pipeline uses a working file plus numbered release-candidate snapshots.

| File | Role |
|------|------|
| `workflows/Executive_Job_CRM_v1.1_BG_ONLY.json` | **Working file** — always edit here between RC releases |
| `workflows/Executive_Job_CRM_v1.1_BG_ONLY_rc1.json`, `rc2.json`, … | **Immutable RC snapshots** — created after a completed, tested feature or fix |

### When to create an RC snapshot

Create the **next** `rcN` snapshot only when:

- A logical feature or bug fix on the BG-only workflow is **complete and tested** (Limit = 1 → 10 → 50), **or**
- You are about to start the **next** significant logic change and need a rollback point (snapshot the current tested state first)

Do **not** create an RC for minor text-only edits (prompt wording, comments, node repositioning) that do not change runtime behavior.

### How to snapshot (assistants)

Before a significant BG-only logic change, run:

```powershell
.\workflows\snapshot_bg_only_rc.ps1 -Message "Brief note: what is being frozen"
```

Then edit `Executive_Job_CRM_v1.1_BG_ONLY.json` as usual. Never edit existing `rc*.json` files.

### BG-only guard rules (current)

- **Always** run AI job extraction — never skip emails based on subject (e.g. `"has been created"`).
- **Zero job cards** after extraction → `NO_JOB_CARD`, stop gracefully (no Preview/Verified AI).
- **One or more job cards** → normal pipeline.
- **Empty or invalid `URL`/`JobUrl`** → skip HTTP Request; route to preview-only path (`NO_URL_PREVIEW_ONLY`).

---

## Key Paths

```
PROJECT_STATUS.md                                 # Authoritative project status (read first)
workflows/Executive-Job-CRM-v1.1-STABLE.json      # EMEA v1.1 canonical frozen workflow (do not extend for features)
workflows/Executive_Job_CRM_v1.1_BG_ONLY.json     # BG-only working workflow (edit here for BG)
workflows/Executive_Job_CRM_v1.1_BG_ONLY_rc*.json  # BG-only RC snapshots (read-only)
workflows/snapshot_bg_only_rc.ps1                 # Create next BG-only RC snapshot
docs/v1.1_FINAL_REVIEW.md                           # EMEA v1.1 release sign-off
docs/PROJECT_RULES.md                             # Engineering rules
docs/architecture/WORKFLOW_ARCHITECTURE.md        # Architecture reference
AGENTS.md                                           # This file
```

**Historical EMEA dev export (removed @ 862e423):** `Executive-Job-CRM-v1.1-DEV.json` — retrieve via git history or `Executive-Job-CRM-v1.1-DEV*.json` snapshots for comparison only.

---

*Assistants should optimize for a stable, testable Executive Job CRM pipeline — EMEA v1.1 is frozen; new EMEA capability belongs in Executive Opportunity Intelligence (v2).*
