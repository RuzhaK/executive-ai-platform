# BG Workflow Architecture

Technical reference for **Executive Job CRM BG v1.1.2** (`workflows/Executive_Job_CRM_BG_v1.1.2_PRODUCTION.json`).

Related docs: [BG_CALIBRATION_PRINCIPLES.md](BG_CALIBRATION_PRINCIPLES.md) · [BG_v1.1.2_RELEASE_NOTES.md](BG_v1.1.2_RELEASE_NOTES.md)

---

## 1. Overview

The BG workflow is an **end-to-end executive job CRM pipeline** for Bulgaria-eligible LinkedIn job alerts. It ingests Gmail messages, extracts job opportunities, applies deterministic gates and AI scoring, and appends structured rows to Google Sheets.

**Purpose:** Surface roles worth executive-level attention for a Sofia / Remote Bulgaria candidate — evaluating fit, scope, transferability, and strategic value rather than keyword matching alone.

**Systems involved:**

| System | Role |
|--------|------|
| **Gmail** | Source of LinkedIn job alert emails |
| **OpenAI** | Job card extraction, Preview scoring, Initial evaluation, Verified review |
| **LinkedIn (HTTP)** | Optional full job posting enrichment |
| **Google Sheets** | CRM destination — every evaluated job (accept or reject) when Company + Role are present |
| **n8n Code nodes** | Parsing, normalization, policy, rejection records, gates |

**Fan-out:** One email may produce multiple job items after `Parse Job Cards`. Downstream nodes run **per job**, not per email.

---

## 2. High-Level Flow

Production path (simplified; rejection branches converge at `Merge Final Records`):

```
Gmail Trigger / Fetch
        ↓
Normalize Email Metadata → Extract Email Body → Normalize Email Content
        ↓
Filter Skip Digest Emails
        ↓
AI - Extract Job Cards → Parse Job Cards
        ↓
Check Job Cards Extracted
        ↓
Policy Engine
        ↓
AI - Preview Score Job → Preview Score Job (normalize)
        ↓
Executive Title Override
        ↓
Check Preview Threshold
        ↓
Check Location Eligibility → Validate Parsed Jobs
        ↓
AI - Initial Job Evaluation → Normalize AI Evaluation
        ↓
Check Job URL Valid → HTTP enrich (or No URL branch)
        ↓
Extract LinkedIn Job Description
        ↓
AI - Verified Review → Normalize Verified Review
        ↓
Check Verified Score Threshold
        ↓
Merge Final Records → Gate Append to CRM Sheet
        ↓
Append to Google Sheets → Execution Delay
```

**Rejection branches** (not shown above) feed `Merge Final Records` input 1:

- Preview below threshold → `Build Preview Reject Record`
- Location not allowed → `Build Reject Record`
- Missing Company/Role after validation → `Build Reject Record`
- No job card extracted → `Build No Job Card Record` (internal; not merged to Sheets)
- No valid job URL → `Build No URL Preview Only Record`
- Verified below threshold → `Build Verified Score Reject Record`

**Note:** `Policy Engine` runs **before** Preview AI (sets enrichment flags and pipeline metadata). `Executive Title Override` runs **after** Preview normalization — it adjusts routing only, not Preview scores.

---

## 3. Major Components

### Gmail retrieval

- **Trigger:** `Gmail - Job Alerts Trigger` → `DEV Config - Gmail Input Selection` → `Build Gmail Fetch Plan` → `Switch Gmail Fetch Mode`
- **Production path:** `Gmail - Read Job Alert Emails` (label-filtered fetch, limit 1 per run)
- **Test path:** `Gmail - Get Email By ID` or `Gmail - Search Emails` when `TestMode = true`
- Outputs message metadata forwarded to `Normalize Email Metadata`

### Email normalization

- **`Normalize Email Metadata`** — EmailId, ThreadId, received date, subject, snippet, labels
- **`Extract Email Body`** — Full HTML/text body from Gmail
- **`Normalize Email Content`** — Clean text for AI, LinkedIn URL hints, anchor hints, **`SubjectJobHint`** (subject-line company/role parsing with en-dash normalization)

### Card extraction

- **`Filter Skip Digest Emails`** — Deterministic pre-filter for LinkedIn digest / carousel subjects (no AI cost)
- **`AI - Extract Job Cards`** — LLM extraction from email text
- **`Parse Job Cards`** — JSON parse, deterministic fallback from URL hints, **`SUBJECT_FALLBACK`** when card extraction fails but subject hint is valid
- **`Check Job Cards Extracted`** — Routes `NO_JOB_CARD` to internal diagnostic path; valid cards continue

### Preview evaluation

- **`Policy Engine`** — Lightweight metadata pass (`NeedsEnrichment`, `PolicyVersion`, pipeline stage hints)
- **`AI - Preview Score Job`** — Fast executive screening on email card only (no FullJobText)
- **`Preview Score Job`** — Normalizes Preview* fields, thresholds (`PreviewScoreThreshold = 6`)
- **`Executive Title Override`** — Routing for eligible executive titles (does not change Preview scores)
- **`Check Preview Threshold`** — Pass → location/validation path; fail → preview reject record

### Deterministic policy layer

- **`Check Location Eligibility`** — BG-only location gate (Bulgaria / Sofia / Remote Bulgaria vs hard non-BG)
- **`Validate Parsed Jobs`** — Requires Company + Role before Initial AI
- **`Check Job URL Valid`** — Branches to LinkedIn HTTP enrichment or no-URL preview-only record
- **`Gate Append to CRM Sheet`** — Blocks empty Company/Role rows from Sheets append

### Verified evaluation

- **`HTTP Request`** + **`Extract LinkedIn Job Description`** — Sequential throttled fetch of full posting (`HttpDelayMs` 2000–5000 ms)
- **`AI - Verified Review`** — Full evaluation using `FullJobText` (role quality, location fit, apply, CV, probability)
- **`Normalize Verified Review`** — Maps AI output to CRM field contract
- **`Check Verified Score Threshold`** — Pass → merge; fail → verified score reject record

### Google Sheets output

- **`Merge Final Records`** — Combines verified path and all reject paths
- **`Regression Assert - Score Path`** — DEV regression guard (pass-through when disabled)
- **`Gate Append to CRM Sheet`** — Final empty-row prevention
- **`Append to Google Sheets`** — Maps Preview*, Verified*, extraction, and test metadata columns
- **`Execution Delay`** — Per-item throttle after append

---

## 4. AI Layers

### Preview AI (`AI - Preview Score Job`)

**Role:** Fast executive screening on the **email job card only**.

- Inputs: Role, Company, Location, EmailSubject, EmailSnippet, URL
- Outputs: `preview_score`, `preview_recommendation` (YES / MONITOR / NO), `preview_reason`, `preview_risk`, `preview_cv`
- Decides whether opening the full LinkedIn posting is worthwhile
- Calibrated via BG v1.1 / v1.1.1 / FINAL / P3 prompt layers (see [BG_CALIBRATION_PRINCIPLES.md](BG_CALIBRATION_PRINCIPLES.md))
- Does **not** set final APPLY decision or Verified score

### Initial AI (`AI - Initial Job Evaluation`)

**Role:** Internal role-quality hints on card metadata — **not a score reject gate**.

- Outputs: `InitialEvalScore`, `InitialEvalRecommendation`, `InitialEvalCV`, fit fields, `interview_probability` hint
- Runs after location gate and field validation, before HTTP enrichment
- Does not overwrite Preview* or Verified* fields

### Verified AI (`AI - Verified Review`)

**Role:** Detailed executive evaluation using **FullJobText** (when enrichment succeeds).

- Outputs: `final_score`, `apply`, `final_decision`, `best_cv`, `interview_probability`, salary fields, `location_fit`, `biggest_risk`, `why_apply`, `follow_up_priority`
- Separates **role quality** (score) from **location eligibility** (apply / final_decision)
- CV selection and interview probability must align with final recommendation
- Primary source for production CRM Score, Recommendation, and Verified columns

### Extraction AI (`AI - Extract Job Cards`)

Separate from scoring — structured job card extraction only. Failures are handled by deterministic and subject fallback logic in `Parse Job Cards`.

---

## 5. Deterministic Rules

These are enforced in **Code nodes and IF branches** — not left to AI judgment.

| Rule | Where | Behavior |
|------|-------|----------|
| **Location policy** | `Parse Job Cards` (card-level), `Check Location Eligibility`, Verified prompt location rules | Accept Sofia, Bulgaria cities, Remote/Hybrid Bulgaria; reject hard non-BG locations |
| **Executive title override** | `Executive Title Override` | Routing for eligible executive titles; excluded patterns (store manager, coordinator, etc.) |
| **Deduplication** | `Parse Job Cards` | `DedupeKey` from JobId or `company\|role\|location`; in-run dedupe set |
| **Digest filtering** | `Filter Skip Digest Emails` | Skip similar-jobs carousel / digest subjects before extraction |
| **Empty-row prevention** | `Gate Append to CRM Sheet` | Append only when Company and Role are non-empty (unless explicit debug/test append mode) |
| **NO_JOB_CARD isolation** | `Check Job Cards Extracted` | Internal diagnostic path; does not append empty rows |
| **Test mode** | `DEV Config - Gmail Input Selection`, `Build Gmail Fetch Plan` | `TestMode = true` switches to search/by-ID fetch, `TestLabel`, date windows, higher limits |
| **HTTP throttling** | `HTTP Request` batching | `batchSize = 1`, interval from `HttpDelayMs` (default 3000 ms) |
| **Preview / Verified thresholds** | `Preview Score Job`, `Check Preview Threshold`, `Check Verified Score Threshold` | Preview ≥ 6 opens full path; Verified threshold gates merge |

---

## 6. Production Configuration

Settings for the frozen **BG v1.1.2 production baseline**:

| Setting | Production value |
|---------|------------------|
| **TestMode** | `false` |
| **TestLabel** | Empty / not used |
| **Test limits** | `limit: 1` email per production fetch (no `TestMaxResults` override) |
| **Gmail label** | `Jobs/LinkedIn` (label ID resolved in `Build Gmail Fetch Plan`) |
| **Fetch mode** | `production` → `Gmail - Read Job Alert Emails` |
| **HttpDelayMs** | Default `3000` (2000–5000 ms allowed) |
| **Google Sheets document** | `Executive Job CRM - Bulgaria` |
| **Sheet** | `Sheet1` (`gid=0`) |
| **Spreadsheet ID** | `1fAAQJgZ1QDt2vIhK0t_3qo9Zd7OJMevfyI_fHtUj-jQ` |

**Gmail label context** (applied on read): INBOX, CATEGORY_UPDATES, UNREAD, Personal, Jobs/LinkedIn, Jobs/High Priority.

**DEV-only nodes** (disabled in production runs):

- `DEV - Inject Low Preview Test Job` — `DEV_TEST_MODE_ENABLED = false`
- `DEV - Inject Score Path Regression Case` — `DEV_SCORE_PATH_REGRESSION = false`
- `Regression Assert - Score Path` — pass-through unless regression flags enabled

**Regression testing** (non-production): set `TestMode = true`, `TestLabel = jobs-test-bg`, increase `TestMaxResults` as needed.

---

## 7. Engineering Backlog

Engineering items tracked for future BG maintenance — **not** calibration changes:

| Item | Description |
|------|-------------|
| **Parser edge cases** | Unusual subject formats, multi-card emails, sparse HTML — extend subject fallback or deterministic hints |
| **Location parsing improvements** | VMG and similar employer-specific location string normalization; card vs FullJobText alignment |
| **Probability normalization refinement** | Tighten post-AI normalization if interview probability drifts outside target bands on edge cases |

Scoring behavior changes belong in calibration docs and require a new versioned production snapshot — not ad-hoc prompt edits on the frozen export.

---

## Source of Truth

| Artifact | Path |
|----------|------|
| Production workflow | `workflows/Executive_Job_CRM_BG_v1.1.2_PRODUCTION.json` |
| Dev working file | `workflows/Executive_Job_CRM_v1.1_BG_ONLY.json` |
| EMEA / main dev (separate) | `workflows/Executive-Job-CRM-v1.1-DEV.json` |

If this document and the production JSON disagree, the **production workflow JSON** is authoritative until reconciled.

---

*BG v1.1.2 — production architecture reference.*
