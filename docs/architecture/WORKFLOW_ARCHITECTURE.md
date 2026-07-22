# Executive Job CRM v1.1 — Workflow Architecture

**Workflow:** `Executive Job CRM v1.1 - Development`  
**File:** `workflows/Executive-Job-CRM-v1.1-DEV.json`  
**Status:** Inactive (`active: false`)  
**Nodes:** 17  
**Trigger:** Gmail poll (every minute, label-filtered)

---

## 1. Purpose

This workflow automates executive job opportunity intake from LinkedIn job alert emails. For each job found in an email, it:

1. Extracts structured job data from HTML email content
2. Applies deterministic location and parsing filters
3. Runs a two-stage AI evaluation (initial scoring, then verified review for high scorers)
4. Writes every job — accepted or rejected — as a row in a Google Sheets CRM

The design is a **single linear pipeline with three rejection branches** that all converge before persistence.

---

## 2. System Boundaries

| System | Role |
|--------|------|
| **Gmail** | Source of LinkedIn job alert emails (label: `Jobs/LinkedIn`) |
| **OpenAI** | Three LLM calls: extraction, evaluation, verified review |
| **Google Sheets** | CRM destination (`Executive Job CRM` → `Sheet1`) |
| **n8n Code nodes** | Parsing, normalization, rejection record building |

**Credentials required:** Gmail OAuth2, OpenAI API, Google Sheets OAuth2.

---

## 3. High-Level Data Flow

```mermaid
flowchart TB
  subgraph ingest [Ingestion]
    T[Gmail - Job Alerts Trigger]
    R[Gmail - Read Job Alert Emails]
    E[Extract Email Body]
    N[Normalize Email Content]
  end

  subgraph extract [Extraction]
    AI1[AI - Extract Job Cards]
    P[Parse Job Cards]
  end

  subgraph filter [Filtering]
    L{Check Location Eligibility}
    V{Validate Parsed Jobs}
  end

  subgraph evaluate [Evaluation]
    AI2[AI - Initial Job Evaluation]
    NE[Normalize AI Evaluation]
    S{Check Score Threshold}
    AI3[AI - Verified Review]
    NV[Normalize Verified Review]
  end

  subgraph persist [Persistence]
    BR[Build Reject Record]
    M[Merge Final Records]
    GS[Append to Google Sheets]
    W[Execution Delay]
  end

  T --> R --> E --> N --> AI1 --> P --> L
  L -->|LocationAllowed = true| V
  L -->|LocationAllowed = false| BR
  V -->|Role & Company present| AI2
  V -->|Missing fields| BR
  AI2 --> NE --> S
  S -->|Score ≥ 7| AI3 --> NV --> M
  S -->|Score < 7| BR
  BR --> M
  M --> GS --> W
```

**Fan-out:** `Parse Job Cards` emits **one item per valid job card**. All downstream nodes run **once per job**, not once per email.

**Fan-in:** `Merge Final Records` combines the verified-review path (input 0) and all reject paths (input 1).

---

## 4. Pipeline Stages

| Stage | Nodes | Purpose |
|-------|-------|---------|
| **1. Trigger & fetch** | Gmail Trigger → Read → Extract | Detect new labeled emails and load full body |
| **2. Normalize & extract** | Normalize Email → AI Extract → Parse Job Cards | Turn HTML into text; LLM extracts job cards; code validates and structures them |
| **3. Gate** | Check Location → Validate Parsed Jobs | Deterministic filters before AI evaluation |
| **4. Evaluate** | AI Initial → Normalize → Score check → AI Verified → Normalize | Profile/location scoring; second pass for score ≥ 7 |
| **5. Reject handling** | Build Reject Record | Standardizes rejected jobs for CRM |
| **6. Persist** | Merge → Sheets → Wait | Append row; throttle with 4s delay |

---

## 5. Node Reference

Nodes are listed in **logical execution order**.

---

### 5.1 Gmail - Job Alerts Trigger

| | |
|---|---|
| **Type** | `gmailTrigger` v1.4 |
| **Purpose** | Poll Gmail every minute for new messages with label `Jobs/LinkedIn` |
| **Inputs** | None (scheduled trigger) |
| **Outputs** | Gmail message metadata per matching email |

**Key output fields:** `id`, `threadId`, `snippet`, `labels`, `From`, `Subject`, `To`, `internalDate`

**Notes:** Workflow is currently inactive; pinned test data exists on this node for manual runs.

---

### 5.2 Gmail - Read Job Alert Emails

| | |
|---|---|
| **Type** | `gmail` (getAll) v2.2 |
| **Purpose** | Re-fetch messages from the same label (limit: **1**) |
| **Inputs** | Trigger output (message reference) |
| **Outputs** | Message list item(s) with `id` for full retrieval |

**Notes:** Processes one email per execution. Label ID is instance-specific (`Label_3053362597517296520` → `Jobs/LinkedIn`).

---

### 5.3 Extract Email Body

| | |
|---|---|
| **Type** | `gmail` (get) v2.2 |
| **Purpose** | Fetch full message content by `messageId` |
| **Inputs** | `{ id }` from previous node |
| **Outputs** | Full Gmail message: `subject`, `html`, `text`, `textAsHtml`, headers |

**Configuration:** `simple: false` (full payload, not simplified).

---

### 5.4 Normalize Email Content

| | |
|---|---|
| **Type** | `code` v2 (run once per item) |
| **Purpose** | Strip HTML to plain text and extract LinkedIn job URLs |
| **Inputs** | Raw Gmail message fields |
| **Outputs** | Normalized email payload for the extraction LLM |

**Output schema:**

| Field | Description |
|-------|-------------|
| `Subject` | Cleaned email subject |
| `EmailText` | HTML stripped to readable plain text |
| `LinkedInJobUrls` | Array of deduplicated `/jobs/view/{id}` URLs |
| `LinkedInJobUrlsText` | URLs joined by newline (prompt input) |
| `Source` | Always `"LinkedIn"` |

**Logic highlights:** Decodes HTML entities; removes scripts/styles; regex-extracts LinkedIn job URLs; dedupes by job ID.

---

### 5.5 AI - Extract Job Cards

| | |
|---|---|
| **Type** | `@n8n/n8n-nodes-langchain.openAi` v2.3 |
| **Model** | `gpt-4.1-mini` |
| **Purpose** | Extract structured job cards from email subject + body + URL list |
| **Inputs** | `Subject`, `EmailText`, `LinkedInJobUrlsText` |
| **Outputs** | OpenAI response object (JSON array in `output[0].content[0].text`) |

**Expected LLM output schema (per job):**

```json
{
  "company": "",
  "role": "",
  "location": "",
  "work_type": "",
  "url": ""
}
```

**Prompt rules (summary):** Extract only real job cards; ignore LinkedIn UI labels; normalize locations by country + work type; strict URL-per-card matching; no guessing or invention.

---

### 5.6 Parse Job Cards

| | |
|---|---|
| **Type** | `code` v2 (run once for all items) |
| **Purpose** | Parse LLM JSON, filter bad extractions, dedupe, apply location pre-filter |
| **Inputs** | OpenAI extraction response |
| **Outputs** | **One item per valid job** (fan-out) |

**Output schema:**

| Field | Description |
|-------|-------------|
| `Role`, `Company`, `JobId`, `Location`, `WorkType`, `URL` | Structured job fields |
| `LocationAllowed` | `true` if location matches allowlist |
| `LocationRejectReason` | Empty if allowed; otherwise reason string |
| `Source` | `"LinkedIn"` |
| `Status` | `"New"` |
| `Notes`, `ParseError` | Empty on success |
| `DedupeKey` | `jobId` or `{company}\|{role}\|{location}` (lowercase) |

**Deterministic filters:**
- **Location allowed:** Bulgaria; Remote Europe/EMEA/Worldwide/Global
- **Fake company detection:** Blocks LinkedIn labels, work-type words, role-like company names
- **Dedup:** Within-batch dedupe by `DedupeKey`
- **Parse failures:** Silently skipped (no output item)

---

### 5.7 Check Location Eligibility

| | |
|---|---|
| **Type** | `if` v2.3 |
| **Purpose** | Route jobs by pre-computed `LocationAllowed` flag |
| **Condition** | `LocationAllowed === true` |

| Branch | Route | Next node |
|--------|-------|-----------|
| **True** | Eligible location | Validate Parsed Jobs |
| **False** | Location rejected | Build Reject Record |

---

### 5.8 Validate Parsed Jobs

| | |
|---|---|
| **Type** | `if` v2.3 |
| **Purpose** | Ensure minimum required fields before AI evaluation |
| **Conditions** | `Role` not empty **AND** `Company` not empty |

| Branch | Route | Next node |
|--------|-------|-----------|
| **True** | Valid job | AI - Initial Job Evaluation |
| **False** | Parse incomplete | Build Reject Record |

---

### 5.9 AI - Initial Job Evaluation

| | |
|---|---|
| **Type** | OpenAI LangChain v2.3 |
| **Model** | `gpt-4.1` |
| **Purpose** | Profile-first scoring on **card/metadata only** — gates Full Verified Evaluation (`InitialEvalScore ≥ 7`) |
| **Inputs** | `Role`, `Company`, `Location`, `Notes`, `URL`, `JobId`, `WorkType`, `DedupeKey` |
| **Outputs** | OpenAI JSON evaluation object |

**Scope:** Stage 2 after preview pass. Does **not** have the full LinkedIn posting. Must **not** finalize location eligibility from card location alone.

**Location deferral (country-specific remote, e.g. United Kingdom · Remote):**
- `country_fit` / `location_fit` → `"REVIEW_REQUIRED"` (not `"NO"` / `"MISMATCH"`)
- `main_risk` → `"Location eligibility requires full posting verification."`
- **Role quality only** — must not cap score or set `recommendation: NO` for location labels

**Final location decisions** belong to Policy Engine / explicit posting verification — not AI score penalties from card labels.

**Normalize AI Evaluation** applies deterministic sanitization if the model still returns card-level location rejection for country-specific remote patterns.

**Expected LLM output fields:**

| Field | Description |
|-------|-------------|
| `score` | 0–10 fit score |
| `interview_probability` | Estimated interview likelihood |
| `recommended_cv` | One of five CV variants |
| `recommendation` | Apply recommendation |
| `remote_fit`, `country_fit`, `seniority_fit`, `sector_fit` | Fit dimensions |
| `follow_up_priority`, `why_apply`, `main_risk` | Narrative fields |
| `role`, `company`, `job_id`, `location`, `work_type`, `url`, `dedupe_key` | Echoed job fields |

**Evaluation rules (summary):** Executive ops/COO profile; **profile fit weighted above location**; country-specific remote on card → UNKNOWN (defer to Verified); reject on card only when language/timezone/domain requirements are **explicit** in provided fields; deep domain mismatch may still reject at this stage.

---

### 5.10 Normalize AI Evaluation

| | |
|---|---|
| **Type** | `code` v2 (run once per item) |
| **Purpose** | Parse LLM JSON into canonical CRM field names |
| **Inputs** | OpenAI initial evaluation response |
| **Outputs** | Normalized job + evaluation record |

**Adds/renames fields:**

| Output field | Source |
|--------------|--------|
| `InitialEvalScore`, `InitialEvalRecommendation`, `InitialEvalCV` | AI response (routing only — **not** written to Sheets `Score`) |
| `InterviewProbability`, `RemoteFit`, `CountryFit`, `SeniorityFit`, `SectorFit` | AI response |
| `Priority`, `WhyApply`, `MainRisk` | AI response |
| `PreviewScore`, `PreviewRecommendation`, `PreviewReason`, `PreviewRisk`, `PreviewCV` | Copied from **Preview Score Job** (unchanged) |
| `ParseError` | Set on JSON parse failure; `Status` → `"AI Parse Error"` |

On parse error: returns safe defaults (`InitialEvalScore: 0`, `InitialEvalRecommendation: "NO"`, etc.).

**Does not set:** `Score`, `VerifiedScore`, or any overwrite of `Preview*` fields.

---

### 5.11 Check Score Threshold

| | |
|---|---|
| **Type** | `if` v2.3 |
| **Purpose** | Decide whether a job warrants expensive verified review |
| **Condition** | `7 <= InitialEvalScore` (i.e. **InitialEvalScore ≥ 7**) |

| Branch | Route | Next node |
|--------|-------|-----------|
| **True** | High score | AI - Verified Review |
| **False** | Low score | Build Reject Record |

---

### 5.12 AI - Verified Review

| | |
|---|---|
| **Type** | OpenAI LangChain v2.3 |
| **Model** | `gpt-5.5` |
| **Purpose** | Stage 4 verified review: **role quality** scoring, salary, CV, `final_decision` |
| **Inputs** | Job fields + initial evaluation context from upstream item |
| **Outputs** | OpenAI JSON verified review object |
| **Options** | `maxTokens: 1000`; instruction to return JSON only |

**Architecture:** Scores role quality only. Country-specific remote **labels** → `location_fit: REVIEW_REQUIRED`; must not `REJECT` or cap `final_score` from label alone. `MISMATCH` only when Location/Notes **explicitly** require relocation, hybrid/onsite outside Bulgaria, or residents-only/work authorization constraints.

**Normalize Verified Review** sanitizes label-only location rejections and restores role-based scores when needed.

**Expected LLM output fields:**

| Field | Description |
|-------|-------------|
| `final_score`, `apply`, `best_cv`, `interview_probability` | Refined evaluation |
| `salary_target_eur_gross`, `salary_range_eur_gross`, `salary_confidence`, `salary_assumption` | Compensation estimate |
| `location`, `location_fit`, `final_decision` | Location + decision |
| `biggest_risk`, `why_apply`, `follow_up_priority` | Narrative |
| `role`, `company`, `job_id`, `work_type`, `url`, `dedupe_key` | Echoed job fields |

**Final decision values:** `APPLY NOW`, `APPLY IF INTERESTED`, `MONITOR`, `REJECT`

---

### 5.13 Normalize Verified Review

| | |
|---|---|
| **Type** | `code` v2 (run once per item) |
| **Purpose** | Parse verified AI JSON into verified-stage fields only |
| **Inputs** | Verified review LLM response; merges with **Normalize AI Evaluation** item for job/email/preview context |
| **Outputs** | Complete CRM record (verified path) |

**Verified-stage fields (from verified AI only — no fallback to initial eval or preview):**

| Field | Source |
|-------|--------|
| `VerifiedScore` | `ai.final_score` |
| `VerifiedRecommendation` | `ai.apply` |
| `VerifiedRisk` | `ai.biggest_risk` |
| `VerifiedWhyApply` | `ai.why_apply` |
| `FinalCV` | `ai.best_cv` |
| `VerifiedInterviewProbability`, salary fields, `LocationFit`, `FinalDecision` | Verified AI response |

On JSON parse failure: sets verified fields to safe error defaults (`VerifiedScore: 0`, parse message in `VerifiedRisk`); **does not** copy `InitialEvalScore` or `Preview*`.

**Routes to:** `Merge Final Records` (input **0** — approved/verified path).

---

### 5.14 Build Reject Record

| | |
|---|---|
| **Type** | `code` v2 (run once per item) |
| **Purpose** | Standardize rejected jobs from any rejection branch |
| **Inputs** | Job item from location fail, validation fail, or low score |
| **Outputs** | CRM-ready reject record |

**Rejection sources:**

| Source | Typical `Status` |
|--------|------------------|
| Location filter | `Location Rejected` |
| Missing Role/Company | `Rejected` (default) |
| Low score (< 7) | `Low Score` |
| Domain/language/timezone/profile (if `auto_reject_reason` set) | `{Reason} Rejected` |

**Sets on all rejects (when verified review did not run):**

| Field | Value |
|-------|-------|
| `VerifiedScore`, `VerifiedRecommendation`, `VerifiedRisk`, `VerifiedWhyApply`, `FinalCV` | Empty string `''` |
| `FinalDecision` | `"REJECT"` |
| `VerifiedPriority` | `"LOW"` |
| `RejectReason` | Computed reason string |
| Salary fields | Empty / `"LOW"` / contextual assumption |

**Does not set:** `Score`, `Recommendation`, or `RecommendedCV` — final CRM columns are computed at **Append to Google Sheets**.

**Routes to:** `Merge Final Records` (input **1** — reject path).

---

### 5.15 Merge Final Records

| | |
|---|---|
| **Type** | `merge` v3.2 |
| **Purpose** | Unify verified and rejected streams before writing |
| **Inputs** | Input 0: verified path; Input 1: reject path |
| **Outputs** | Single stream of complete job records |

**Notes:** Default merge mode (append). Only one path fires per job item.

---

### 5.16 Append to Google Sheets

| | |
|---|---|
| **Type** | `googleSheets` (append) v4.7 |
| **Purpose** | Write one CRM row per job |
| **Target** | Spreadsheet `Executive Job CRM`, sheet `Sheet1` |
| **Inputs** | Merged job record |
| **Outputs** | Google Sheets API append response |
| **Retry** | `retryOnFail: true`, 3s between tries |

**Column mapping (selected):**

| Sheet column | Source field |
|--------------|--------------|
| Date | `$now` |
| Company, Role, Location, URL | Job fields |
| Source | `Source` |
| Status | `Status` |
| Score | `VerifiedScore` if full evaluation ran, else `PreviewScore` |
| Interview Probability | `InterviewProbability` (initial eval) |
| Recommended CV | `FinalCV` if verified ran, else `PreviewCV` |
| Recommendation | `VerifiedRecommendation` if verified ran, else `PreviewRecommendation` |
| Country/Seniority/Sector Fit, Priority, Why Apply | Initial evaluation |
| Verified Score, Verified Recommendation, Final CV | Verified-stage fields (empty when verified review did not run) |
| Salary Estimate, Salary Confidence, Salary Assumption | Verified salary |
| Verified Risk, Verified Why Apply, Verified Priority | Verified narrative |
| Final Decision, Location Fit | Decision fields |
| DedupeKey, RejectReason | Tracking |
| Notes | `VerifiedRisk` if set, else `MainRisk`, else `PreviewReason` / `PreviewRisk` |
| PreviewScore, PreviewRecommendation, PreviewReason, PreviewRisk, PreviewCV | Preview stage (always from preview gate) |
| PipelineStage | Pipeline outcome (see table below) |
| Remote | `RemoteFit` |

**Note:** `Salary Target` (`SalaryTarget`) is computed upstream but not mapped to a sheet column in this export. `auto_reject_reason` is mapped to empty string.

---

### 5.17 Execution Delay

| | |
|---|---|
| **Type** | `wait` v1.1 |
| **Purpose** | Pause **4 seconds** after each sheet append |
| **Inputs** | Sheets append result |
| **Outputs** | Same item, delayed |

**Rationale:** Rate limiting for Google Sheets API and/or OpenAI call pacing when multiple jobs process sequentially.

**Terminal node:** No downstream connections.

---

## 6. Preview vs Verified Field Ownership

Scoring fields are **stage-owned**. No node overwrites another stage’s fields, and **`Score` is never set on the item** — it is computed only when mapping to Google Sheets.

### Preview stage (email card only)

**Producer:** `AI - Preview Score Job` → `Preview Score Job`

| Field | Description |
|-------|-------------|
| `PreviewScore` | 0–10 triage score from email card |
| `PreviewRecommendation` | Preview apply hint |
| `PreviewReason` | Why preview scored this way |
| `PreviewRisk` | Preview-stage risk note |
| `PreviewCV` | Best CV guess from card |
| `PreviewScoreThreshold` | Gate constant (default **5**); set in **Preview Score Job** |
| `PreviewPassesThreshold` | Boolean: `PreviewScore >= PreviewScoreThreshold` (computed in code) |

**Routing:** `Check Preview Threshold` uses boolean `PreviewPassesThreshold === true` (same pattern as `Check Location Eligibility`). TRUE → location gate → full evaluation. FALSE → `Build Preview Reject Record` (`FinalDecision: REJECT_PREVIEW`).

**Rules:** Set once after Preview AI; never overwritten downstream. Preview reject path (`Build Preview Reject Record`) leaves `Verified*` empty.

### Initial evaluation (internal routing)

**Producer:** `AI - Initial Job Evaluation` → `Normalize AI Evaluation`

| Field | Purpose |
|-------|---------|
| `InitialEvalScore` | Gates verified review (`Check Score Threshold`, ≥ 7) |
| `InitialEvalRecommendation`, `InitialEvalCV` | Internal; not mapped to Sheets `Score` / `Recommendation` / `Recommended CV` |
| `MainRisk`, `WhyApply`, fit dimensions | Enrichment for CRM and reject notes |

**Rules:** Does not set `Score`, `VerifiedScore`, or modify `Preview*`.

### Verified stage (full evaluation)

**Producer:** `AI - Verified Review` → `Normalize Verified Review`

| Field | Description |
|-------|-------------|
| `VerifiedScore` | Final score after full posting review |
| `VerifiedRecommendation` | Final apply decision |
| `VerifiedRisk` | Verified risk |
| `VerifiedWhyApply` | Verified why-apply narrative |
| `FinalCV` | Verified CV choice (Sheets “Recommended CV” when verified ran) |

**Rules:** Populated **only** when verified review executes. Empty string `''` on all other paths (preview reject, location reject, low initial score, etc.). Verified AI output only — no fallback to `InitialEvalScore` or `Preview*`.

### Google Sheets `Score` (final column)

Computed at **Append to Google Sheets** only:

| Path | Sheets `Score` | Sheets `Verified Score` |
|------|----------------|-------------------------|
| Preview reject | `PreviewScore` | empty |
| Full eval not run (any other reject) | `PreviewScore` | empty |
| Verified review completed | `VerifiedScore` | `VerifiedScore` |

Same pattern for **Recommendation** and **Recommended CV**: verified fields when present, otherwise preview fields.

### PipelineStage values

| Value | When set |
|-------|----------|
| `NO_JOB_CARD` | Parse fallback / no job card extracted |
| `POLICY_REJECT` | Location gate, validation fail, or low initial score (`Build Reject Record`) |
| `PREVIEW_REJECT` | Preview score below threshold |
| `FULL_EVALUATION` | Verified review completed; `FinalDecision` is MONITOR / APPLY IF INTERESTED / etc. |
| `FINAL_ACCEPT` | Verified review completed; `FinalDecision` is APPLY or APPLY NOW |
| `FINAL_REJECT` | Verified review completed; `FinalDecision` is REJECT |

---

## 7. Record Data Model Evolution

```
Email metadata
    ↓
{ Subject, EmailText, LinkedInJobUrls*, Source }
    ↓  [AI extraction]
{ company, role, location, work_type, url } × N
    ↓  [Parse Job Cards]
{ Role, Company, JobId, Location, WorkType, URL,
  LocationAllowed, LocationRejectReason, DedupeKey, Status, Source }
    ↓  [Preview AI + Preview Score Job]
+ { PreviewScore, PreviewRecommendation, PreviewReason, PreviewRisk, PreviewCV }
    ↓  [AI initial evaluation + normalize]
+ { InitialEvalScore, InitialEvalRecommendation, InitialEvalCV,
    InterviewProbability, RemoteFit, CountryFit, SeniorityFit, SectorFit,
    Priority, WhyApply, MainRisk }
    ↓  [verified path only]
+ { VerifiedScore, VerifiedRecommendation, FinalCV,
    SalaryEstimate, SalaryTarget, SalaryConfidence, SalaryAssumption,
    VerifiedRisk, VerifiedWhyApply, VerifiedPriority,
    LocationFit, FinalDecision }
    ↓  [reject paths]
+ { FinalDecision: REJECT*, RejectReason, Status: *Rejected, Verified*: '' }
    ↓
Google Sheets row (Score / Recommendation / Recommended CV resolved at append)
```

---

## 8. Branching Summary

Three paths reach **Build Reject Record**:

| # | Gate | Condition | CRM outcome |
|---|------|-----------|-------------|
| 1 | Check Location Eligibility | `LocationAllowed === false` | Location Rejected |
| 2 | Validate Parsed Jobs | Missing `Role` or `Company` | Rejected |
| 3 | Check Score Threshold | `InitialEvalScore < 7` | Low Score |

One path reaches **Normalize Verified Review**:

| Gate | Condition | CRM outcome |
|------|-----------|-------------|
| Check Score Threshold | `InitialEvalScore ≥ 7` | Full verified record with salary + final decision |

All paths converge at **Merge Final Records → Append to Google Sheets**.

---

## 9. Operational Characteristics

| Aspect | Behavior |
|--------|----------|
| **Concurrency** | One email per run (`limit: 1`); multiple jobs per email processed as separate items |
| **Dedup** | In-batch only at parse stage; **no sheet lookup** for existing jobs |
| **AI cost** | 1× mini model per email + 1× GPT-4.1 per eligible job + 1× GPT-5.5 per job scoring ≥ 7 |
| **Failure handling** | Code nodes use try/catch with degraded defaults; Sheets node retries on failure |
| **Active state** | Workflow disabled in export |
| **Test data** | `pinData` on Gmail trigger for manual debugging |

---

## 10. External Configuration Dependencies

These values are **hardcoded in the export** and are environment-specific:

| Setting | Value / reference |
|---------|-------------------|
| Gmail label | `Label_3053362597517296520` (`Jobs/LinkedIn`) |
| Google Sheet ID | `1UikquDerfPU6G9IpN7rQvHbhUC2c3l78UksOsQ52YuM` |
| Sheet tab | `Sheet1` (gid=0) |
| Score threshold | 7 (verified review gate on `InitialEvalScore`) |
| Preview score threshold | 5 (`Preview Score Job` — `PreviewScoreThreshold`) |
| Execution delay | 4 seconds |

---

## 11. Architecture Observations

1. **Two-layer filtering:** Deterministic rules in Code nodes (location, fake company) precede expensive AI evaluation.
2. **Tiered AI pipeline:** Cheap extraction (mini) → standard evaluation (4.1) → premium verification (5.5) only for high scorers.
3. **Reject transparency:** All filtered jobs are persisted to Sheets with reason codes, not silently dropped.
4. **Monolithic design:** All logic in one workflow; no sub-workflows or external dedupe service.
5. **Item-per-job model:** After `Parse Job Cards`, the pipeline behaves as a per-job processor despite a single-email trigger.

---

*Generated from `workflows/Executive-Job-CRM-v1.1-DEV.json`.*
