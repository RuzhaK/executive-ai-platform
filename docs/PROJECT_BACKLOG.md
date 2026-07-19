# Project Backlog

Executive Opportunity Intelligence Platform — EMEA dev pipeline (`emea-v1.1`).

**Source of truth:** `workflows/Executive-Job-CRM-v1.1-DEV.json`  
**Architecture reference:** `docs/architecture/WORKFLOW_ARCHITECTURE.md`  
**Engineering rules:** `docs/PROJECT_RULES.md`

## Repository and backlog rules

- Use `docs/PROJECT_BACKLOG.md` as the single authoritative backlog.
- Do not create additional backlog files unless explicitly approved.
- Commit workflow implementation first.
- Update and commit documentation only after the workflow commit exists and has been reviewed.
- Do not add Co-authored-by trailers unless explicitly requested.
- Do not use whole-file ConvertTo-Json on workflow JSON.
- Use surgical JSON edits only.
- Do not modify or commit unrelated files.
- Every implementation must reference a backlog ID.
- Implement one backlog item per workflow commit.
- After each workflow commit, stop and provide:
  - commit hash
  - exact nodes changed
  - exact connections changed
  - node and connection counts
  - rollback command
  - regression checklist
- Wait for approval before starting the next backlog item.

---

## Status values

Use these statuses on every tracked item (commit, gate, or backlog ID):

| Status | Meaning |
|--------|---------|
| **OPEN** | Approved scope or identified work; not started |
| **IN_PROGRESS** | Implementation or regression in flight |
| **DONE** | Shipped and on current baseline (or historical milestone retained for reference) |
| **SUPERSEDED** | Replaced by a later item; do not extend or re-implement |
| **WONT_FIX** | Explicitly declined; retained for audit only |

---

## Current Baseline

| Item | Value |
|------|--------|
| **Branch** | `emea-v1.1` |
| **Commit** | `ee48c2a611d55c3a13224bbd229821941a6bc26f` — `EMEA-C3: Add deterministic mandatory language gate with conservative skill-context detection` |
| **Workflow file** | `workflows/Executive-Job-CRM-v1.1-DEV.json` |
| **Nodes / connections** | 55 / 66 |
| **Regression label** | `jobs-exec-crm-regression` |
| **DEV spreadsheet** | `Executive Job CRM - EMEA DEV` (`1x_f_DK5yi3FprfIo2w1Pf1Q9VaAeUeMm66gOnR7igJs`) |
| **Validated regression workbook** | `Executive Job CRM - EMEA DEV v25.xlsx` (EMEA-C3 runtime PASS WITH EXPLANATION) |

### EMEA-C3 validation (2026-07-19)

| Field | Value |
|-------|--------|
| **Backlog ID** | **EMEA-C3** |
| **Commit** | `ee48c2a611d55c3a13224bbd229821941a6bc26f` |
| **Nodes added** | `Mandatory Language Gate`, `Check Mandatory Language`, `Build Mandatory Language Reject Record` |
| **Runtime status** | **PASS WITH EXPLANATION** (live n8n · Limit 1) |
| **Workbook** | `Executive Job CRM - EMEA DEV v25.xlsx` |
| **Email fetched** | One message (`EmailId=19f5dee4ab0568dc`; `TestLabelUsed=jobs-exec-crm-regression`) |
| **Job cards extracted** | **4** from that email |
| **Language gate — enriched jobs** | Mokrogoria co-founder + Kaderabotim Business Support and Operations Director: gate **executed**, `MandatoryLanguageBlocked=false`, FALSE branch → `AI - Verified Review` |
| **Language gate — preview rejects** | Two Head of e-commerce variants: **not reached** (stopped at Preview); expected |
| **Limit=1 note** | Four sheet rows because **`MaxJobCards=1` was not in effect** (effective cap ≥ 4; workflow JSON default **10**). Strict Limit=1 requires **both** `TestMaxResults=1` **and** `MaxJobCards=1`. Not a gate defect. |
| **Policy** | Conservative skill-context detection: block only explicit candidate language-ability mandates; citizenship/market/sector/bare `{lang} required` pass |

### Commit 5 validation (2026-07-18)

| Field | Value |
|-------|--------|
| **Backlog ID** | **EMEA-EXEC-OPS-THRESHOLD** |
| **Commit** | `2bc9b6ca0d00af2af2378ae38abf7c7e68edcaff` |
| **Node changed** | `Preview Score Job` only |
| **Runtime status** | **PASS** (live n8n) |
| **Primary case** | Business Support and Operations Director — `PreviewScore = 6`, `PreviewRecommendation = MONITOR`, `PreviewPassesThreshold = true`; continues through enrichment and Verified AI → `FinalDecision = APPLY NOW`, `PipelineStage = FINAL_ACCEPT` |
| **Negative controls** | Head of e-commerce variants remain `PREVIEW_REJECT` |
| **Regression catalog** | **EMEA-EXEC-OPS-THRESH-A** → **PASS**; **EMEA-EXEC-OPS-THRESH-N1** → **PASS** |
| **Notes** | Option B: global `PreviewScoreThreshold` stays **7**; allowlisted exec-ops titles pass at floored score **6** via `qualifiesForExecOpsFloor`. Initial v23 run matched Commit 4 until workflow re-imported — runtime version mismatch, not code defect. |

### Commit 4 validation (2026-07-18)

| Field | Value |
|-------|--------|
| **Backlog ID** | **EMEA-EXEC-OPS-FLOOR** |
| **Commit** | `2db88cf490974b57c0078b5ae9056a6dd85b01c4` |
| **Node changed** | `Preview Score Job` only |
| **Runtime status** | **PASS** (live n8n) |
| **Primary case** | Business Support and Operations Director — AI preview score below floor → `PreviewScore = 6`, `PreviewRecommendation = MONITOR`, `PreviewPassesThreshold = false` (threshold remains **7**) |
| **Regression catalog** | **EMEA-EXEC-OPS-FLOOR-A** → **PASS** |
| **Notes** | Floor is deterministic allowlist + exclusions in `Preview Score Job`; no generic Director override; no sheet schema change. Initial post-commit run showed `PreviewScore = 5` until workflow re-imported — runtime version mismatch, not code defect. |

### Pre-Preview chain (C1)

```
Policy Engine → Check Language in Title
  TRUE  → Build Language Title Reject Record → Merge Final Records (input 1)
  FALSE → AI - Preview Score Job → …
```

### Post-Extract pre-Verified chain (C6 + TRAVEL + C2 + C3)

```
Extract LinkedIn Job Description → Check Posting Closed
  TRUE  → Build Closed Posting Reject Record → Merge Final Records (input 1)
  FALSE → Mandatory Travel Gate → Check Mandatory Travel
            TRUE  → Build Mandatory Travel Reject Record → Merge Final Records (input 1)
            FALSE → Mandatory Domain Gate → Check Mandatory Domain
                      TRUE  → Build Mandatory Domain Reject Record → Merge Final Records (input 1)
                      FALSE → Mandatory Language Gate → Check Mandatory Language
                                TRUE  → Build Mandatory Language Reject Record → Merge Final Records (input 1)
                                FALSE → AI - Verified Review → Normalize Verified Review → …
```

### Frozen (do not change without explicit approval)

- `AI - Verified Review` prompt (Phase 3A.x calibration)
- `Normalize Verified Review` (Phase 3A.3 hard-eligibility preservation)
- `Build Verified Score Reject Record` and verified-score path
- Google Sheets schema
- BG production workflow (`Executive_Job_CRM_BG_v1.1.2_PRODUCTION.json`)

### Reference backups (EMEA)

Under `Executive Opportunity Intelligence Platform/backups/EMEA BACKUPs/`:

- v17 — `Executive Job CRM - EMEA DEV v17 - Pre-Verified-HardEligibility-Fix.json` (full pre-Verified gate reference; do not wholesale import)
- Phase 3A.3 baseline — commit `b80d15b` (41 nodes / 47 connections)

### Known regression failure — Fulchester (C2.1 DONE)

| Field | Value |
|-------|--------|
| **Backlog ID** | `EMEA-C2.1` |
| **Status** | **DONE** |
| **Commit** | `3ebeaf0326afc5a2a623cb6eb15e264ccba95b7c` |
| **Company** | Fulchester Consultants |
| **Role** | Managing Director |
| **JobId** | `4434499750` |
| **EmailId** | `19f2992fca6a623c` |
| **Pre-fix result** | `MandatoryDomainBlocked = false`, `MandatoryDomainRejectReason = ""`, `MandatoryDomainLabel = ""` |
| **Expected (post-fix)** | `FINAL_REJECT` before `AI - Verified Review` |
| **Trigger sentence** | *Proven senior leadership experience within home care, healthcare, or a related multi-site/service-led environment.* |
| **Root cause (pre-fix)** | `hasMandatoryLanguage()` did not recognize **“Proven … experience within …”** phrasing. Domain patterns (`home care`, `healthcare`) are present and would match if mandatory language fired. |
| **Fix shipped** | Added to `hasMandatoryLanguage` return: `/\bproven\s+(?:senior\s+)?(?:leadership\s+)?experience\s+within\b/i` |

### Known regression pass — Fulchester travel (EMEA-TRAVEL DONE + validated)

| Field | Value |
|-------|--------|
| **Backlog ID** | `EMEA-TRAVEL` |
| **Status** | **DONE — regression-validated (n8n)** |
| **Gate commit** | `570c097e669dd1bb9d3d72facd0be1fef8970a1e` |
| **Fix commit** | `355c91b33fb0fa18907e972a3c632fcd51aff1f4` |
| **Company** | Fulchester Consultants |
| **Role** | Managing Director |
| **JobId** | `4434499750` |
| **EnrichmentStatus** | `OK` |
| **FullJobTextLength** | `3304` |
| **FinalDecision** | `REJECT` |
| **PipelineStage** | `FINAL_REJECT` |
| **RejectReason** | `Mandatory travel above 20%: 20-30%` |
| **auto_reject_reason** | `MANDATORY_TRAVEL` |
| **Trigger sentence** | *Travel across the region as required (approx. 20–30%, flexible based on business needs).* |
| **Fix shipped** | Option A — scan full `FullJobText` before period-split chunks (`355c91b`) |
| **Out of scope** | Output-field normalization (separate future backlog item) |

### Provisional conclusion — CleverMatch REJECT→ACCEPT (post EMEA-TRAVEL; not a travel-gate regression)

| Field | Value |
|-------|--------|
| **Status** | **Provisional — accepted; exact prior cause unconfirmed** |
| **Company** | CleverMatch |
| **Role** | Geschäftsführer / Unternehmer / Nachfolger für den Mittelstand (m/w/d) |
| **JobId** | `4432338590` |
| **Observed** | Previously **REJECT** (commit `570c097` run); later **ACCEPT** (commit `355c91b` run) |
| **Option A (`355c91b`) is not the cause** | On current guest `FullJobText` (2031 chars, `EnrichmentStatus=OK`), mandatory travel gate is **`blocked=false` at both `570c097` and `355c91b`** — no `%`, no English travel context, no German travel/mobility terms. Option A cannot flip travel-gate REJECT→ACCEPT on identical text. |
| **Exact cause** | **Unconfirmed** — previous n8n execution output unavailable in repo/backups. |
| **Most likely causes** | (1) **Verified AI variability** and/or **verified score-threshold outcome**; (2) **different enrichment input** (`FullJobText` / `FullJobTextLength`) between runs. |
| **Mandatory Travel fix** | **Do not revert** — Fulchester `4434499750` validated at `355c91b`. |
| **Historical row search** | **No row found** — see [Historical row search](#historical-row-search-clevermatch-4432338590) below. Prior REJECT observation **cannot be reconstructed** from available exports. |
| **Next step** | CleverMatch added as **controlled repeatability regression case** (next test run). **Separate from EMEA-OUTPUT-NORM** — see [Repeatability — CleverMatch](#repeatability--clevermatch-open-next-test-run). |

#### Historical row search — CleverMatch `4432338590`

Searched 2026-07-17 (prior REJECT reconstruction attempt):

| Source | Scope | Result |
|--------|--------|--------|
| `executive-ai-platform` repo | all tracked files | **No row** |
| `Executive Opportunity Intelligence Platform/backups/EMEA BACKUPs/` | 40 workflow JSON snapshots | **No row** (workflow exports only; no sheet/execution data) |
| `Executive Opportunity Intelligence Platform/backups/BG VERSION BACKUPS/` | BG snapshots | **No row** |
| `workflows/_forensic_*.txt` | forensic artifacts | **No row** |
| Agent transcript / `agent-tools` | conversation + tool outputs | JobId mentioned; **no execution field values** |
| Excel (`.xlsx`) / CSV regression exports | under `CV/GitHub` tree | **No `.xlsx`/`.csv` files found** in searchable workspace paths |
| n8n execution exports | `*execution*` filename pattern | **None found** |

**Fields sought (not recovered):** timestamp, `FinalDecision`, `PipelineStage`, `RejectReason`, `auto_reject_reason`, `VerifiedScore`, `VerifiedRecommendation`, `FullJobTextLength`, `EnrichmentStatus`.

---

## Completed Work

### Infrastructure & DEV harness (`emea-v1.1`, pre-restoration)

| Status | Commit | Summary |
|--------|--------|---------|
| DONE | `eb49f8f` | Phase 0 — Preview pipeline / field contract baseline |
| DONE | `c2a23fd` | Phase 1.1 — skip LinkedIn digest emails before extraction AI |
| DONE | `31ed041` | Phase 1.3 — gate CRM append on non-empty Company and Role |
| DONE | `947656a` | Infrastructure parity — TestLabel, HttpDelayMs, Gmail fetch plan, Sheets test metadata |
| DONE | `f822fc7` | DEV default regression configuration (`jobs-exec-crm-regression`, Limit 10) |
| DONE | `cc574a3` | MaxJobCards cap after Parse Job Cards |
| DONE | `40ab802` | Phase 1.2 — isolate NO_JOB_CARD before Preview AI |
| DONE | `3c45a61` | Phase 2 — full posting enrichment plumbing |
| DONE | `8bbe820` | EMEA schema — enrichment ops fields to DEV Google Sheet |

### Verified AI calibration (Phase 3A)

| Status | Commit | Summary |
|--------|--------|---------|
| DONE | `1129a40` / `57a7642` | Verified prompt uses FullJobText (EMEA) |
| DONE | `4931861` | Phase 3A.1 — evidence-only prompt cleanup (no speculation) |
| DONE | `9c76947` | Phase 3A.2 — Stage 1 hard eligibility gate in Verified prompt |
| DONE | `b80d15b` | Phase 3A.3 — Normalize preserves Stage 1 hard rejects (no location sanitization override) |

### Location / parse fixes (Phase 3C family)

| Status | Commits | Summary |
|--------|---------|---------|
| DONE | `d21bfe4` … `55181e7` | Card location preservation, parse isolation, backfill (historical; pre-restoration base) |

### Preview calibration & output contract (Jul 2026)

| Status | Commit | Summary |
|--------|--------|---------|
| DONE | `c8d2664` | Harden closed posting gate (guest HTML markers) |
| DONE | `05a4c5f` | German title gate applied to output-norm baseline |
| DONE | `330a3ea` | Stop writing legacy `Score` column to CRM sheet |
| DONE | `2db88cf` | **Commit 4** — targeted executive-operations preview floor (`EXEC_OPS_PREVIEW_SCORE_FLOOR = 6`); **n8n validated** (`v22.xlsx`) |
| DONE | `2bc9b6c` | **Commit 5** — targeted exec-ops preview pass at score 6 (`qualifiesForExecOpsFloor`; threshold **7** unchanged); **n8n validated** (`v24.xlsx`) |
| DONE | `ee48c2a` | **EMEA-C3** — mandatory language gate (conservative skill-context) on `FullJobText`; **n8n validated** (`v25.xlsx` · PASS WITH EXPLANATION) |

---

## Gate & restoration tracker

Pre-Verified gate work from v17 reference. One commit per gate unless noted.

| Status | ID / commit | Item | Placement / notes |
|--------|-------------|------|-------------------|
| DONE | `7514dc2` | **C1 — Language-in-title** | Pre-Preview (`Policy Engine` → IF → reject \| Preview) |
| SUPERSEDED | `9acb019` | C2 — Mandatory domain in Policy Engine (pre-Preview) | Replaced by `8773158` |
| DONE | `8773158` | **C2 — Mandatory specialized domain (structural move)** | Post-Extract, pre-Verified (`Mandatory Domain Gate` on `FullJobText`) |
| DONE | `3ebeaf0326afc5a2a623cb6eb15e264ccba95b7c` | **C2.1 — `hasMandatoryLanguage` proven-within regex** | `Mandatory Domain Gate` only; Fulchester `4434499750` |
| OPEN | **EMEA-C2-TEST** | C2 regression Limit 1 → 10 → 50 | After C2.1 |
| DONE | `ee48c2a` | **EMEA-C3 — Mandatory language (FullJobText)** | Post-Extract chain; conservative skill-context policy |
| OPEN | **EMEA-C4** | Country-list remote / explicit residency | Post-Extract chain |
| OPEN | **EMEA-C5** | Founder / co-founder role | Post-Extract chain; immediate predecessor to Verified |
| DONE | `7ccdf7c5a96210adf14b18eac0b2986365383059` | **C6 — Closed posting (guest HTML markers)** | `Check Posting Closed` first after Extract; Mokrogoria fail-open |
| DONE | `355c91b33fb0fa18907e972a3c632fcd51aff1f4` | **EMEA-TRAVEL — Mandatory travel >20%** | Gate `570c097`; chunk fix `355c91b`; **n8n validated** Fulchester `4434499750` |

**Target enrichment topology (after C4–C5):**

```
Extract → Closed → Travel → Domain → Language → Country-list → Founder → AI - Verified Review
```

### Known coverage ceiling — closed posting (C6)

| Case | JobId | Guest marker in raw HTTP | Gate behavior |
|------|-------|--------------------------|---------------|
| Hard-close control | `3900000000` | Yes (`closed-job__flavor--closed` + phrase) | `FINAL_REJECT` / `Status: Closed` |
| Mokrogoria | `4437213682` | **No** — UI shows closed; guest HTML does not | **Fail open** → continues to downstream gates / Verified |
| Fulchester | `4434499750` | Yes when guest serves closed stub; may be absent when guest-open at fetch time | REJECT when marker present; fail open otherwise |

---

## Open Work

### P0 — C2 mandatory-domain (next approved change)

| Status | ID | Item | Notes |
|--------|-----|------|-------|
| DONE | **EMEA-C2.1** | Add `/\bproven\s+(?:senior\s+)?(?:leadership\s+)?experience\s+within\b/i` to `hasMandatoryLanguage` | Commit `3ebeaf0326afc5a2a623cb6eb15e264ccba95b7c`; Fulchester `4434499750` |
| OPEN | **EMEA-C2-TEST** | Limit 1 → 10 → 50 after C2.1 | Mill `4436662085`, Fulchester `4434499750` / `19f2992fca6a623c`, soft preference, transferable sectors |

### P1 — Deterministic hard-eligibility (not yet gated)

| Status | ID | Item | Notes |
|--------|-----|------|-------|
| DONE | **EMEA-TRAVEL** | Mandatory travel **>20%** hard reject | **Regression-validated (n8n).** Gate `570c097`; fix `355c91b`; Fulchester `4434499750` passed |
| OPEN | **EMEA-TZ** | Mandatory incompatible timezone | Verified Stage 1 prompt only; no pre-Verified gate |

### P2 — Verified / calibration (prompt-only, when approved)

| Status | ID | Item | Source |
|--------|-----|------|--------|
| OPEN | **EMEA-VER-P1** | Risk must drive `apply` / `final_decision` — no `APPLY NOW` with material blocker in `Verified Risk` | v13 calibration review |
| OPEN | **EMEA-VER-P2** | Location / residency uncertainty → cap at `MONITOR`, not `APPLY NOW` | v13 review |
| OPEN | **EMEA-VER-P3** | Propagate Stage 1 blocker text into `RejectReason` on score-0 hard rejects | v13 review |

### P2 — BG portability (after EMEA validation)

| Status | ID | Item | Notes |
|--------|-----|------|-------|
| OPEN | **PBG-001** | Preview open-for-verification calibration | Port to `Executive_Job_CRM_v1.1_BG_ONLY.json` after EMEA Limit 1 → 10 → 50 |
| OPEN | **PBG-002** | Closed-posting gate (C6) | Port after EMEA validation; Mokrogoria fail-open ceiling applies |
| OPEN | **PBG-003** | Mandatory travel >20% gate (EMEA-TRAVEL) | Port after EMEA validation; candidate policy: travel ≤20% acceptable |

### P3 — Documentation / hygiene

| Status | ID | Item |
|--------|-----|------|
| OPEN | **EMEA-OUTPUT-NORM** | Output-field normalization (runtime/sheet display vs internal gate fields) — governs field consistency **after** a decision is produced (deterministic or AI). **Independent of** CleverMatch repeatability (`4432338590`); related investigation only |
| DONE | **EMEA-REGRESSION-FRAMEWORK** | Lightweight 7-phase lifecycle + Regression Catalog — seed `EMEA-TRAVEL-A` only; add cases incrementally after explicit n8n validation |
| OPEN | **DOC-ARCH-REFRESH** | Refresh architecture docs: `WORKFLOW_ARCHITECTURE.md` must accurately reflect current EMEA v1.1 workflow (`Executive-Job-CRM-v1.1-DEV.json`, 51 nodes); `V1.1_ARCHITECTURE.md` clearly positioned as historical target design or updated appropriately. Audit 2026-07-17: WORKFLOW header/topology **partially stale** (documents 17-node path); V1.1 gap analysis **historical** vs as-built. Do not commit stale architecture as canonical without qualification or update. |
| SUPERSEDED | **DOC-ARCH** | Reconcile `WORKFLOW_ARCHITECTURE.md` with post-C2 topology (46 nodes) — superseded by **DOC-ARCH-REFRESH** |
| OPEN | **DOC-SHEET** | Fix `Company = System.Xml.XmlElement` append mapping noted in v13 export |

---

## EMEA Development Lifecycle (`EMEA-REGRESSION-FRAMEWORK`)

Lightweight protocol for every EMEA backlog item. Goal: clear next step, fast validation — not extra bureaucracy.

| Phase | Action | Exit |
|-------|--------|------|
| **1. Specification** | Backlog ID, scope, affected nodes, rollback sketch | Approved or clearly scoped |
| **2. Regression design** | Name case ID(s); write expected outcomes **before** code | Case(s) listed in catalog as `OPEN` or in item notes |
| **3. Implementation** | One workflow commit per backlog ID | Commit hash recorded |
| **4. Deterministic regression** | Offline gate check (mirror Code node) when a deterministic gate exists | **PASS** · **N/A** for AI-only / prompt-only / routing-only items |
| **5. n8n regression** | Import dev workflow; Limit **1 → 10 → 50** | Primary case(s) PASS |
| **6. Documentation** | Docs commit after workflow validated | Backlog + catalog updated |
| **7. DONE** | Close item | Status DONE; catalog case(s) `PASS` where applicable |

**Catalog policy:** Seed with **validated cases only** (explicit n8n PASS). Add rows **incrementally** — do not catalogue every historical execution. Gate expected-behavior tables below remain design reference until a case earns a catalog row.

**Existing repo rules still apply:** one backlog ID per workflow commit; docs commit after workflow commit; surgical JSON edits only (`docs/PROJECT_RULES.md`).

---

## Regression Catalog

Stable, re-runnable cases with documented n8n validation. Not an execution archive.

| Case ID | Backlog ID | Type | Input | Expected (summary) | Validated | Status |
|---------|------------|------|-------|-------------------|-----------|--------|
| **EMEA-TRAVEL-A** | EMEA-TRAVEL | POSITIVE | Fulchester Consultants / Managing Director / JobId `4434499750`; `EnrichmentStatus=OK`; `FullJobTextLength=3304`; travel *"as required (approx. 20–30%)"* | `FINAL_REJECT`; `PipelineStage=FINAL_REJECT`; `RejectReason: Mandatory travel above 20%: 20-30%`; `auto_reject_reason: MANDATORY_TRAVEL`; Verified does not run | `355c91b` · 2026-07-17 · Limit 1 (n8n) | **PASS** |
| **EMEA-EXEC-OPS-FLOOR-A** | EMEA-EXEC-OPS-FLOOR | POSITIVE | Business Support and Operations Director; AI `preview_score` below 6 | `PreviewScore = 6`; `PreviewRecommendation = MONITOR`; `PreviewPassesThreshold = false`; `PipelineStage = PREVIEW_REJECT` (threshold **7**) | `2db88cf` · 2026-07-18 · Limit 1 (n8n) · workbook `Executive Job CRM - EMEA DEV v22.xlsx` | **PASS** |
| **EMEA-EXEC-OPS-THRESH-A** | EMEA-EXEC-OPS-THRESHOLD | POSITIVE | Business Support and Operations Director; JobId `4439702062` | `PreviewScore = 6`; `PreviewRecommendation = MONITOR`; `PreviewPassesThreshold = true`; enrichment + Verified run; `FinalDecision = APPLY NOW`; `PipelineStage = FINAL_ACCEPT` | `2bc9b6c` · 2026-07-18 · Limit 1 (n8n) · workbook `Executive Job CRM - EMEA DEV v24.xlsx` | **PASS** |
| **EMEA-EXEC-OPS-THRESH-N1** | EMEA-EXEC-OPS-THRESHOLD | NEGATIVE | Head of e-commerce variants (non-allowlisted) | `PreviewPassesThreshold = false`; `PipelineStage = PREVIEW_REJECT` | `2bc9b6c` · 2026-07-18 · Limit 1 (n8n) · workbook `Executive Job CRM - EMEA DEV v24.xlsx` | **PASS** |
| **EMEA-C3-A** | EMEA-C3 | POSITIVE | Mokrogoria co-founder + Kaderabotim Business Support and Operations Director; `EnrichmentStatus=OK`; regression email `19f5dee4ab0568dc` | Language gate executes; `MandatoryLanguageBlocked=false`; FALSE branch → Verified; no `auto_reject_reason=MANDATORY_LANGUAGE` | `ee48c2a` · 2026-07-19 · Limit 1 (n8n) · workbook `Executive Job CRM - EMEA DEV v25.xlsx` | **PASS** |
| **EMEA-C3-N1** | EMEA-C3 | NEGATIVE | Head of e-commerce variants on same email | `PREVIEW_REJECT` before Extract; language gate not reached | `ee48c2a` · 2026-07-19 · Limit 1 (n8n) · workbook `Executive Job CRM - EMEA DEV v25.xlsx` | **PASS** |

*Additional cases (e.g. C2.1 Fulchester domain, C6 controls, explicit language BLOCK corpus) — add only after explicit n8n regression validation.*

---

## Regression Rules

### Test protocol (all functional changes)

1. Import `Executive-Job-CRM-v1.1-DEV.json` into n8n dev.
2. Run from **`DEV Config - Gmail Input Selection`** (not Gmail trigger) when trigger trial blocks.
3. Scale: **Limit = 1 → 10 → 50** (and `MaxJobCards` independently when testing card volume).
4. Stop and fix before advancing scale if any case fails.

### Mandatory-domain gate (C2 — `8773158` DONE; C2.1 — `3ebeaf0326afc5a2a623cb6eb15e264ccba95b7c` DONE)

| Case | Input / condition | Expected |
|------|-------------------|----------|
| **A. Mill Adventure** | JobId `4436662085`; `FullJobText` contains *“5+ years in leading iGaming brands in regulated markets is mandatory”* | `FINAL_REJECT` before `AI - Verified Review`; `Status: Hard Eligibility Reject`; Preview fields preserved |
| **B. Fulchester — mandatory** | Fulchester Consultants / Managing Director / JobId `4434499750`; `FullJobText` contains *“Proven senior leadership experience within home care, healthcare…”* | `FINAL_REJECT` before Verified (**DONE at `3ebeaf0326afc5a2a623cb6eb15e264ccba95b7c`**) |
| **B. Fulchester — preferred only** | Wording is preference only, not mandatory | Pass to Verified |
| **C. Soft preference** | *“Healthcare experience preferred”* | Pass (soft-preference guard) |
| **D. Transferable sectors** | SaaS / FinTech / manufacturing / retail / logistics / BPO — no explicit mandatory niche-domain wording | Pass |
| **E. C1 integrity** | `Director (German)` → language reject before Preview; `Head of Sales - Spain` → pass to Preview | Unchanged |
| **F. Enrichment fail-open** | `EnrichmentStatus != OK` or `FullJobTextLength < 200` | `MandatoryDomainBlocked = false`; may continue to Verified |

**Fulchester is not a universal negative control.** If `FullJobText` explicitly requires prior senior leadership in home care / healthcare, it must REJECT (same class as Mill Adventure iGaming).

### Language-in-title gate (C1 — `7514dc2` DONE)

| Case | Expected |
|------|----------|
| `Role: "Director (German)"` | `POLICY_REJECT` / Language Rejected before Preview |
| `Role: "Head of Sales - Spain"` | Pass to Preview (country name, not language mandate) |
| `Role: "Founder's Office Director"` | Pass (not a language-in-title block) |

### Enrichment / gate fail-open (global)

When `EnrichmentStatus` is not `OK` or `FullJobTextLength < 200`, deterministic post-Extract gates must **fail open** (do not hard-reject on missing posting text). Verified AI may still evaluate thin context.

**Exception — C6 closed posting:** scans **raw guest HTTP HTML** inside Extract. May reject with `EnrichmentStatus: FAILED` when guest serves a closed stub without extractable description. Absence of closed markers always fail-opens.

### Closed-posting gate (C6)

| Case | Input / condition | Expected |
|------|-------------------|----------|
| **A. Hard-close control** | JobId `3900000000`; raw guest HTML has `closed-job__flavor--closed` or phrase | `FINAL_REJECT` before Verified; `Status: Closed`; `auto_reject_reason: CLOSED_POSTING` |
| **B. Open control** | JobId `4440043160`; no closed markers | Pass to Mandatory Travel Gate |
| **C. Mokrogoria (fail-open)** | JobId `4437213682`; UI closed, guest HTML has no marker | Pass through C6; may reach Verified |
| **D. Fulchester (when stub)** | JobId `4434499750`; guest stub with markers | `FINAL_REJECT` before Verified |
| **E. NO_URL path** | Missing/invalid URL | No HTTP; C6 skipped |
| **F. HTTP error** | 403 / 429 / empty body | C6 fail-open |
| **G. C2 integrity** | Mill `4436662085` mandatory domain | Unchanged downstream behavior when C6 does not fire |

### Mandatory-language gate (EMEA-C3 — `ee48c2a611d55c3a13224bbd229821941a6bc26f` validated)

| Case | Input / condition | Expected |
|------|-------------------|----------|
| **A. Skill mandate (BLOCK)** | *Fluent German required*; *Native French speaker essential*; *Must speak Italian*; *Professional fluency in Dutch is mandatory*; *Excellent written and spoken Spanish required* (in `FullJobText`, `EnrichmentStatus=OK`, length ≥ 200) | `FINAL_REJECT` before Verified; `auto_reject_reason: MANDATORY_LANGUAGE` |
| **B. Ambiguous / non-skill (PASS)** | *German required*; citizenship; work authorization; market/sector; *English required, German preferred*; localization duties; *German-speaking customers* | Pass to Verified (conservative policy) |
| **C. Enrichment fail-open** | `EnrichmentStatus != OK` or `FullJobTextLength < 200` | `MandatoryLanguageBlocked = false` |
| **D. Allowlist** | English / Bulgarian skill mandates | Pass (working-language allowlist) |
| **E. C2 / travel integrity** | Fulchester domain / travel cases | Unchanged when language gate does not fire |
| **F. Preview path** | Jobs stopping at Preview | Language gate not reached; expected |

### Mandatory-travel gate (EMEA-TRAVEL — `355c91b33fb0fa18907e972a3c632fcd51aff1f4` validated)

| Case | Input / condition | Expected |
|------|-------------------|----------|
| **A. Fulchester travel (PASSED n8n)** | JobId `4434499750`; `EnrichmentStatus=OK`; `FullJobTextLength=3304`; travel *"as required (approx. 20–30%)"* | `FINAL_REJECT`; `RejectReason: Mandatory travel above 20%: 20-30%`; `auto_reject_reason: MANDATORY_TRAVEL` |
| **B. Up to 20%** | *"Up to 20% travel required"* | Pass |
| **C. Range 10–20%** | *"10–20% travel required"* | Pass |
| **D. Single 25%** | *"25% travel required"* | REJECT |
| **E. Plus notation** | *"50%+ travel"* | REJECT |
| **F. Minimum** | *"minimum 25% travel"* | REJECT |
| **G. Occasional** | *"occasional travel"* | Pass |
| **H. May be required** | *"travel may be required"* (no %) | Pass |
| **I. Preferred** | *"travel preferred"* | Pass |
| **J. Enrichment fail-open** | `EnrichmentStatus != OK` | `MandatoryTravelBlocked = false` |
| **K. C6 / C2 integrity** | Closed stub / Mill domain | Unchanged when travel gate does not fire |

### Repeatability — CleverMatch (OPEN; next test run)

Controlled case for **Verified/score/enrichment repeatability** — not a travel-gate negative control. **Related but separate from EMEA-OUTPUT-NORM:** repeatability tests whether AI/score outcomes are stable; output normalization tests whether emitted fields consistently reflect whatever decision was produced.

| Field | Value |
|-------|--------|
| **Company** | CleverMatch |
| **JobId** | `4432338590` |
| **Baseline commit** | `355c91b33fb0fa18907e972a3c632fcd51aff1f4` |
| **Purpose** | Run **twice** on same regression batch; capture full execution JSON + sheet row both times. Confirm whether outcome is stable and record all fields in [Historical row search](#historical-row-search-clevermatch-4432338590) table. |
| **Deterministic gate expectation** | `MandatoryTravelBlocked=false`, `MandatoryDomainBlocked=false`, `PostingClosedConfirmed=false` when `EnrichmentStatus=OK` and `FullJobTextLength≈2031` |
| **Fields to capture per run** | timestamp, last node, `FinalDecision`, `PipelineStage`, `RejectReason`, `auto_reject_reason`, `MandatoryTravelBlocked`, `MandatoryTravelPercentMax`, `MandatoryTravelRejectReason`, `MandatoryDomainBlocked`, `MandatoryDomainRejectReason`, `VerifiedScore`, `VerifiedRecommendation`, `FullJobTextLength`, `EnrichmentStatus`, `FullJobText` hash or export |
| **Status** | **OPEN — scheduled for next Limit = 1 regression run** |

### Protected paths (must not regress)

| Path | Rule |
|------|------|
| NO_JOB_CARD | `Check Job Cards Extracted` FALSE → `Build No Job Card Record`; no Preview/Verified |
| NO_URL_PREVIEW_ONLY | Missing/invalid URL → preview-only; no HTTP; gates skipped |
| Verified score reject | `Check Verified Score Threshold` FALSE → `Build Verified Score Reject Record` → Merge (unchanged) |
| Normalize 3A.3 | Stage 1 hard rejects from Verified AI must not be overwritten by location sanitization |

### Rollback references

| Status | Target | Command |
|--------|--------|---------|
| DONE | EMEA-TRAVEL fix only (`355c91b33fb0fa18907e972a3c632fcd51aff1f4`) | `git revert 355c91b33fb0fa18907e972a3c632fcd51aff1f4` |
| DONE | EMEA-TRAVEL gate only (`570c097e669dd1bb9d3d72facd0be1fef8970a1e`) | `git revert 570c097e669dd1bb9d3d72facd0be1fef8970a1e` |
| DONE | C6 only (`7ccdf7c5a96210adf14b18eac0b2986365383059`) | `git revert 7ccdf7c5a96210adf14b18eac0b2986365383059` |
| DONE | C2.1 only (`3ebeaf0326afc5a2a623cb6eb15e264ccba95b7c`) | `git revert 3ebeaf0326afc5a2a623cb6eb15e264ccba95b7c` |
| DONE | C2 structural (`8773158`) | `git checkout 8773158 -- workflows/Executive-Job-CRM-v1.1-DEV.json` |
| SUPERSEDED | Misplaced C2 (`9acb019`) | `git checkout 9acb019 -- workflows/Executive-Job-CRM-v1.1-DEV.json` |
| DONE | C1 only (no C2) | `git checkout 7514dc2 -- workflows/Executive-Job-CRM-v1.1-DEV.json` |
| DONE | Phase 3A.3 baseline | `git checkout b80d15b -- workflows/Executive-Job-CRM-v1.1-DEV.json` |
| DONE | EMEA-C3 only (`ee48c2a611d55c3a13224bbd229821941a6bc26f`) | `git revert ee48c2a611d55c3a13224bbd229821941a6bc26f` |

---

*Last updated: 2026-07-19 — baseline `ee48c2a611d55c3a13224bbd229821941a6bc26f` (EMEA-C3 DONE). `DOC-ARCH-REFRESH` OPEN (architecture docs not yet committed). Next approved gate: **EMEA-C4**.*
