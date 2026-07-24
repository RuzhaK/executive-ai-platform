# Professional Fit Gap Analysis (EMEA)

**Status:** Analysis only — no prompt, workflow, or code changes.  
**Date:** 2026-07-24  
**Scope:** Professional Fit scoring as implemented by **Stage 4 Verified AI** (`AI - Verified Review`) plus its immediate normalization (`Normalize Verified Review`). Preview and Initial stages are referenced only where manual calibration comments clearly blame upstream gating.

---

## 1. What “Professional Fit” means in this pipeline

In the current EMEA workflow there is **no separate `ProfessionalFit` field**. Professional Fit is expressed through Verified-stage outputs:

| Output | Role in Professional Fit |
|--------|--------------------------|
| `VerifiedScore` / `final_score` | 0–10 role-quality score (Stage 2 only) |
| `VerifiedRecommendation` / `apply` | YES / MONITOR / NO |
| `FinalDecision` | APPLY NOW / MONITOR / REJECT |
| `VerifiedRisk` / `biggest_risk` | Primary blocker or fit gap |
| `VerifiedWhyApply` / `why_apply` | Positive case narrative |
| `FinalCV` / `best_cv` | CV variant selection |
| `VerifiedInterviewProbability` | Probability aligned (in theory) with decision |

**Primary prompt source:** `AI - Verified Review` in `workflows/Executive-Job-CRM-v1.1-DEV.json` (Stage 4 Full Verified Evaluation).  
**Post-processing that affects fit outputs:** `Normalize Verified Review` (location sanitization, Stage 1 hard-reject preservation, salary mapping).

**Supporting documentation reviewed:**

| Document | Relevance |
|----------|-----------|
| `docs/architecture/WORKFLOW_ARCHITECTURE.md` §5.12–5.13 | Verified AI architecture, field contract |
| `docs/BUSINESS_RULES.md` §4 | Intended Deep AI / FinalScore semantics |
| `docs/BG_CALIBRATION_PRINCIPLES.md` | BG calibration intent — useful reference for EMEA gaps, not authoritative for EMEA |
| `docs/PROJECT_BACKLOG.md` | Open items EMEA-VER-P1/P2/P3 from v13 review |
| `config/rule-engine.config.json` | Target decision bands (not fully reflected in live prompt) |

**Authoritative manual calibration source:**

| Artifact | Details |
|----------|---------|
| `Executive Job CRM - EMEA DEV v31.xlsx` | External backup: `Executive Opportunity Intelligence Platform/backups/EMEA BACKUPs/` |
| Column **AL = KOMENTAR** | 24 manually annotated rows (of 1,073 total) |
| Annotation language | Bulgarian / English mix — treated as authoritative human judgment |

---

## 2. Where the current scoring prompt disagrees with manual calibration

### 2.1 Decision incoherence — APPLY NOW despite material blockers (EMEA-VER-P1)

The prompt requires Stage 1 hard blockers to force `apply=NO` / `final_decision=REJECT`, but **Stage 2 outputs and post-processing still produce APPLY NOW when risks or `why_apply` say the opposite.**

| Row | Company / Role | System output | KOMENTAR / manual intent |
|-----|----------------|---------------|--------------------------|
| 9 | Magnopus — Director of Product Operations | Verified **8**, **APPLY NOW**; Risk = location review; Why Apply = **“Do not apply due to UK right-to-work”** | **Product fit 5.5/10** — functional misfit, not an apply case |
| 11 | Deel — Associate Operations Director | Verified **8**, **APPLY NOW**; Risk = below COO/VP scope | Duplicate row; role scope too junior for apply |
| 20, 74 | Jack & Jill — Director of Operations @ GovAI | Verified **8**, **APPLY NOW**; Risk = nonprofit admin, not P&L | **No longer accepting applications** (posting closed) |
| 14 | LUNARTECH — CEO Netherlands | Verified **9**, **APPLY NOW** | **No longer accepting applications** |
| 75 | hackajob — Programme Director | Verified **8**, **APPLY NOW**; Why Apply = **“Do not apply due to UK-based requirement”** | Engineering bug (`System.Xml.XmlElement`) — manual review blocked |
| 16 | Areti Group — Delivery Director | Verified **7**, MONITOR | **Monthly travel to Netherlands office** — manual treats as blocker |

**Prompt disagreement:** Stage 2 says `final_score = ROLE QUALITY ONLY` and allows `apply: YES typically 8-10` without requiring alignment between `biggest_risk`, `why_apply`, and `final_decision`. Manual calibration expects **one coherent decision** — material blocker in risk or explicit “do not apply” must cap at MONITOR or REJECT.

**Downstream disagreement:** `Normalize Verified Review` can **upgrade** location-related rejects to `APPLY NOW` when the card has a country-specific remote label (`United Kingdom · Remote`), overwriting AI Stage 1/2 reject signals. This directly conflicts with manual rows 9 and 75.

---

### 2.2 Under-scoring — manual fit much higher than VerifiedScore

| Row | Company / Role | System | KOMENTAR (manual fit) | Gap |
|-----|----------------|--------|------------------------|-----|
| 22 | Scry AI — Manager, CEO's Office | Verified **6**, REJECT | **9.9/10** | Executive scope override missing — CEO Office / Chief of Staff treated as too junior |
| 30 | Speedy.io — COO & Board Member | Blocked pre-Verified (`MANDATORY_DOMAIN`) | **10/10** (Lithuanian language + remote LT) | Should be language/location gate, not domain; strong COO fit |
| 39 | Valsea — AI Transformation Lead | Parse/policy REJECT (Spain onsite) | **10/10** — posting says hybrid/remote | Location policy disagrees with FullJobText |
| 47 | KeoBat — CGO (France) | Parse/policy REJECT | Should **pass with lower score**, not hard reject | EMEA location policy vs manual “score down, don’t kill” |
| 93 | Hyland — AVP Partner Management | Preview **4**, REJECT_PREVIEW | Manual fit **9.2** | Preview under-scores senior partnerships role |
| 48 | ENSEK — Business Transformation Manager | Preview **4**, REJECT_PREVIEW | Manual: should **open** — transformation manager | Preview under-scores transformation scope |

**Prompt disagreement:** Stage 2 lists “Strong fit: COO, MD, GM, VP Ops, Strategy & Ops, Chief of Staff…” but gives **no positive calibration** for:

- Executive scope override (Manager / CEO’s Office with strategic scope)
- Transformation / modernization boost
- Commercial / partnerships / GSI roles at director+ level

BG principles (§4, §6, §7, §5) encode these; EMEA Verified prompt does not.

---

### 2.3 Over-scoring — VerifiedScore or decision too high vs manual

| Row | Company / Role | System | KOMENTAR | Gap |
|-----|----------------|--------|----------|-----|
| 6 | WorkNomads — Digital Transformation Services Lead | Verified **7**, MONITOR | Manual: **reject** — missing Enterprise Architecture | Score too high; domain gap should cap lower |
| 90 | BRUSH Group — Strategic BD Director Europe | Verified **6**, REJECT | Manual: should be **5**, not 6 | Score band off by one; domain-heavy energy sector |
| 11 | Deel — Associate Operations Director | Verified **8**, APPLY NOW | Scope too junior | “Associate Director” should not reach 8 / APPLY |

---

### 2.4 Interview probability vs decision (BG §10 / calibration rules)

Manual calibration and BG principles require **≤40% on REJECT** (≤45% exceptional). Systematic violations in KOMENTAR rows:

| Row | FinalDecision | VerifiedScore | Interview Probability |
|-----|---------------|---------------|------------------------|
| 58, 67 | REJECT | 0 | **70%** |
| 88 | REJECT | 0 (parse fail) | **75%** |
| 90 | REJECT | 6 | **70%** |
| 6 | MONITOR | 7 | **70%** (borderline — manual wants reject) |

**Prompt disagreement:** Prompt sets anchors (“Apply ~45–70%”) but **no hard caps by decision**. Normalization clamps 0–100 but does not enforce decision-aligned caps.

---

### 2.5 Generic / misleading reject reasons

Several KOMENTAR rows note the **real reason is masked**:

| Row | System RejectReason | Manual expects |
|-----|---------------------|----------------|
| 58, 67, 77, 88, 90 | `VerifiedScore missing or below threshold.` | Domain-specific, authorization, or parse-failure reason |
| 77 | Score 0 + risk “Requires being based in Switzerland” | Manual: **“ne e wqrno”** — location blocker is correct; score 0 is wrong |

**Prompt disagreement:** Stage 1 says `biggest_risk = blocker` on hard reject, but `Build Verified Score Reject Record` replaces narrative with generic threshold text (EMEA-VER-P3).

---

### 2.6 Preview gate vs Professional Fit (upstream but cited in KOMENTAR)

Six KOMENTAR rows are `PREVIEW_REJECT` or `POLICY_REJECT` before Verified runs. Manual comments still express **Professional Fit judgment** (e.g. Hyland 9.2, ENSEK should open, Hopper UK remote). These are not Verified prompt bugs alone, but they block Professional Fit evaluation entirely.

---

## 3. Scoring rules missing from the current Verified prompt

Rules present in manual calibration / BG principles / backlog but **absent or too thin** in the live Verified prompt:

| # | Missing rule | Manual evidence | BG / doc reference |
|---|--------------|-----------------|-------------------|
| M1 | **Executive scope override** — Manager / CEO’s Office / Executive Business Partner can score 7–9 when scope shows enterprise ownership | Scry AI 9.9/10 | BG §4, §7 |
| M2 | **Transformation / modernization boost** — Business Transformation Manager, modernization, AI transformation roles | ENSEK, WorkNomads context | BG §6 |
| M3 | **Commercial / partnerships / GSI / channel fit** — Director+ partnerships not auto-downranked | Hyland 9.2, Sophos GSI notes | BG §5 |
| M4 | **Domain vs seniority separation** — mandatory domain gap must not be labeled “seniority mismatch”; cap score by domain | WorkNomads EA gap, BRUSH energy domain | BG §8, Archive calibration rules |
| M5 | **Mandatory domain score caps** — e.g. clinical/GCP max 6, IFRS/accounting max 6, deep tech practice max 6–7 | WorkNomads, BRUSH | BG calibration doc §5 |
| M6 | **Functional / product fit dimension** — separate from title seniority (Product Ops ≠ executive ops) | Magnopus “Product fit 5.5/10” | Not in any EMEA doc today |
| M7 | **Decision coherence rule** — `final_decision` cannot be APPLY NOW if `biggest_risk` or `why_apply` states a hard blocker | Magnopus, hackajob, Jack & Jill | EMEA-VER-P1 |
| M8 | **Location/residency uncertainty cap** — REVIEW_REQUIRED or explicit jurisdiction requirement → max MONITOR, not APPLY NOW | Magnopus UK RTW, hackajob UK-based, Sophos authorization | EMEA-VER-P2 |
| M9 | **Interview probability caps by decision** | Sophos 70% on REJECT | BG §10 |
| M10 | **Why Apply tone by decision** — no strong apply narrative on REJECT/MONITOR with blockers | Magnopus “Do not apply…” | BG calibration §8 |
| M11 | **CV selection matrix** — role-nature mapping beyond one-line list | Magnopus N/A, Sophos GTM vs Strategy | BG §11 |
| M12 | **Closed posting** — must not output APPLY NOW (handled in gates, not prompt) | LUNARTECH, Jack & Jill, SalesFinders | C6 gate |
| M13 | **Travel threshold alignment** — monthly travel to NL office | Areti | EMEA-TRAVEL gate (>20%) |
| M14 | **Score 7 = MONITOR, not APPLY** — align with `Check Verified Score Threshold` at 7 | BRUSH “6 should be 5” implies band discipline | `rule-engine.config.json` bands differ from prompt |
| M15 | **RejectReason must carry Stage 1/2 rationale** — not generic threshold | Multiple rows | EMEA-VER-P3 |

---

## 4. Rules that produce systematically incorrect scores

These are **repeatable failure modes** seen across multiple KOMENTAR rows, not one-off noise.

### 4.1 `Normalize Verified Review` location sanitization (systematic)

When the card has **country-specific remote** (`· Remote` for UK, NL, etc.), `sanitizeVerifiedLocation`:

1. Forces `location_fit = REVIEW_REQUIRED`
2. Replaces risk with `"Location eligibility requires full posting verification."`
3. If AI had location-related reject with score ≤ 5, **raises score**, flips `apply` NO→YES, and REJECT→**APPLY NOW** (if score ≥ 8)

**Effect:** Verified Professional Fit is **decoupled from posting evidence** on the most common EMEA card pattern. Confirmed harmful in rows 9, 75; flagged in backlog since v13.

**Note:** Phase 3A.3 added `isStage1HardEligibilityReject` to preserve language/travel/timezone rejects — **location authorization rejects from FullJobText are still upgraded** when score ≤ 5 heuristic triggers.

### 4.2 Verified score threshold vs APPLY bands (systematic)

| Layer | Rule |
|-------|------|
| Prompt | `apply: YES typically 8-10`; `final_decision: APPLY NOW` if strong fit |
| `Check Verified Score Threshold` | Pass if VerifiedScore **≥ 7** |
| Manual / config | Score **7 → MONITOR**; APPLY NOW only for strong 8–10 |

**Effect:** Score 7–7.9 roles reach FINAL_ACCEPT path too easily; Deel 8 / Associate Director and Delivery Director 7 align with this looseness.

### 4.3 Stage 1 in prompt vs deterministic pre-Verified gates (systematic overlap)

Travel, language, domain, country eligibility, and closed posting are enforced **both** in Code gates and in prompt Stage 1. Failures differ:

| Case | Gate behavior | Manual expectation |
|------|---------------|-------------------|
| Speedy.io COO | `MANDATORY_DOMAIN` (regulated financial/pharma) | Language + Lithuania remote — wrong gate |
| Valsea / KeoBat | Parse `locationAllowed` policy reject | FullJobText remote/hybrid — should reach Verified |
| Jobgether | AI Stage 1 reject (Switzerland) score **0** | Correct blocker, wrong score treatment |

**Effect:** Professional Fit never runs, or runs with score 0 and generic downstream reject — manual cannot calibrate prompt consistently.

### 4.4 Preview under-scoring executive-adjacent roles (systematic upstream)

Transformation Manager, AVP Partnerships, Strategy & Analytics Manager rejected at Preview 3–4 despite manual fit 6–9. Verified prompt never runs — **Professional Fit pipeline starved of candidates manual considers strong**.

### 4.5 Invalid JSON / engineering failures scored as Professional Fit (systematic)

Rows 58, 75, 88: `VerifiedRisk = Verified review returned invalid JSON` or append mapping errors (`System.Xml.XmlElement`). These are **not scoring errors** but pollute Professional Fit calibration data and produce score 0 + misleading reject reasons.

### 4.6 Interview probability inheritance (systematic)

On parse failure, normalization falls back to `original.InterviewProbability` (often Initial-stage **75–85%**) while `FinalDecision = REJECT`. Prompt does not instruct “on REJECT, set probability ≤ 40.”

---

## 5. Ambiguous rules in the current prompt

Rules that **exist but are insufficiently precise** for consistent Professional Fit scoring:

| # | Ambiguity | Symptom in data |
|---|-----------|-----------------|
| A1 | **“Weak fit: reduce final_score 2-4”** — no anchor examples or floors | Same role type scores 6 vs 8 unpredictably (Scry 6 vs manual 9.9) |
| A2 | **“Outside core profile: reduce final_score 2-4; use apply/final_decision for eligibility”** — mixes fit and eligibility | Magnopus 8 + APPLY with eligibility blocker |
| A3 | **Stage 1 vs Stage 2 boundary for domain** — “Domain/timezone (Stage 2 only)” vs mandatory domain gates pre-Verified | WorkNomads domain in risk but score 7; Speedy domain gate before AI |
| A4 | **Country-specific remote labels “never REVIEW_REQUIRED”** in prompt vs normalize forcing REVIEW_REQUIRED | Contradictory location_fit on every UK · Remote row |
| A5 | **“Remote Europe / Remote Worldwide: never auto-REJECT”** vs EMEA-C4 country-list gate | KeoBat / Airalo-type cases — policy vs prompt |
| A6 | **Associate / Manager titles** — listed in weak fit examples but not calibrated with scope override | Deel Associate Director 8; Scry Manager 6 |
| A7 | **Salary anchors** (Lead 100–140k … C-Level 200–400k+) without confidence / posted-salary rules | False precision on MONITOR/REJECT rows |
| A8 | **`biggest_risk` priority list** — compensation #4 may outrank domain gap | WorkNomads: EA gap in risk but score still 7 |
| A9 | **Thin/missing FullJobText** — “prefer MONITOR” but no score cap | Low-evidence APPLY/MONITOR inflation |
| A10 | **CV list without selection logic** — five variants named, no decision tree | COO CV on wrong roles (LUNARTECH CEO, Jack & Jill nonprofit ops) |
| A11 | **“apply YES typically 8-10 ONLY if Stage 1 passed”** — Stage 1 skipped when enrichment OK but AI mis-read blocker | Switzerland / UK authorization rows score 0 not REJECT-with-reason |
| A12 | **Relationship to PreviewScore/InitialEvalScore** — “hints only” but normalize uses them as **score floor** (≥7) in location sanitization | Inflated VerifiedScore on country-remote cards |

---

## 6. What should remain unchanged

These elements align with architecture, manual calibration, or engineering stability — **do not change in a Professional Fit redesign** without explicit migration plan:

### 6.1 Pipeline architecture

| Keep | Why |
|------|-----|
| **Verified as authoritative Professional Fit stage** — Preview/Initial are hints only | Core v1.1 score-path design (`WORKFLOW_ARCHITECTURE.md`) |
| **FullJobText primary when `EnrichmentStatus=OK` and length ≥ 200** | Correct evidence hierarchy; manual trusts posting over card |
| **Stage 1 hard eligibility concept** (blockers override score) | Matches manual “blocker first” intent — implementation needs fix, not removal |
| **Deterministic pre-Verified gates** (C3 language, C4 country, C6 closed, travel, domain) | Manual expects hard rejects — prompt should not duplicate weakly |
| **Separate Verified fields** — no fallback to `PreviewScore` / `InitialEvalScore` in sheet contract | Output norm / architecture rules |
| **JSON-only Verified output schema** | Engineering stability |
| **Evidence-only writing rules** — no speculation phrasing | Phase 3A.1 intent |
| **`biggest_risk` = single primary blocker** | Good manual calibration direction |
| **Role-quality-only `final_score`** — location must not silently cap score in prompt | EMEA architecture — eligibility via gates + decision, not score penalty from labels alone |
| **Five CV variants** (names unchanged) | Sheet schema + BG §11 — selection logic needs work, not rename |
| **Check Verified Score Threshold at 7** as engineering gate | Changing threshold is separate from prompt calibration |

### 6.2 Prompt fragments to preserve verbatim intent

- Decision order: Stage 1 before Stage 2 when FullJobText available  
- STOP after Stage 1 hard blocker — no salary/CV/interview on blocked rows  
- Mandatory language in Stage 1 with same force as location  
- Thin posting → MONITOR preference (with clearer caps to be added later)  
- Candidate profile summary (15+ years COO/MD/VP Ops, SaaS/Fintech/AI)  

### 6.3 Out of scope for “Professional Fit prompt” redesign

Do not fold these into Verified scoring prompts (already gated elsewhere):

- Parse / digest / dedupe logic  
- Preview threshold (currently 5 post-v1.1) — separate backlog item EMEA-PREVIEW-CALIBRATION  
- Google Sheets column mapping / append schema  
- Gmail / enrichment plumbing  

---

## 7. KOMENTAR row index (authoritative sample)

Quick reference for the 24 annotated rows in v31:

| Row | Company | Role | Verified | Final | KOMENTAR theme |
|-----|---------|------|----------|-------|----------------|
| 6 | WorkNomads | Digital Transformation Services Lead | 7 | MONITOR | Should reject — EA domain gap |
| 9 | Magnopus | Director of Product Operations | 8 | APPLY NOW | Product fit 5.5/10 |
| 11 | Deel | Associate Operations Director | 8 | APPLY NOW | Duplicate; junior scope |
| 14 | LUNARTECH | CEO Netherlands | 9 | APPLY NOW | Closed posting |
| 16 | Areti Group | Delivery Director | 7 | MONITOR | Monthly NL travel |
| 20 | Jack & Jill | Director of Operations | 8 | APPLY NOW | Closed posting |
| 22 | Scry AI | Manager - CEO's Office | 6 | REJECT | Manual 9.9/10 |
| 30 | Speedy.io | COO & Board Member | — | REJECT (domain gate) | Manual 10/10; LT language |
| 39 | Valsea | AI Transformation Lead | — | POLICY_REJECT | Posting remote/hybrid |
| 47 | KeoBat | CGO France | — | POLICY_REJECT | Should score low, not reject |
| 48 | ENSEK | Business Transformation Manager | — | PREVIEW_REJECT | Should open |
| 49 | Hello Recruiterr | Regional Director ME | — | PREVIEW_REJECT | Closed + ME domain |
| 50 | GREEN SHIRTS | COO (German title) | — | POLICY_REJECT | Closed / wrong snippet |
| 58, 67 | Sophos | Director, Global GSI | 0 | REJECT | GSI/cyber domain; UK auth |
| 74 | Jack & Jill | Director of Operations | 8 | APPLY NOW | Sophos-style GSI misfit text |
| 75 | hackajob | Programme Director | 8 | APPLY NOW | XmlElement bug |
| 76 | SalesFinders | Operations Lead | — | FINAL_REJECT (closed) | Closed; low fit |
| 77 | Jobgether | Head of Product Operations | 0 | REJECT | CH residency — score wrong |
| 82 | Hopper | Strategy & Analytics Manager | — | PREVIEW_REJECT | UK remote block |
| 83 | Showpad | Sales Business Partner | — | PREVIEW_REJECT | Low fit |
| 88 | Page Executive | Group Operations Director | 0 | REJECT | JSON parse fail |
| 90 | BRUSH Group | Strategic BD Director Europe | 6 | REJECT | Score should be 5 |
| 93 | Hyland | AVP Partner Management | — | PREVIEW_REJECT | Manual 9.2 |

---

## 8. Summary matrix

| Category | Count (KOMENTAR sample) | Primary cause layer |
|----------|-------------------------|---------------------|
| APPLY NOW disagrees with manual | 6 | Prompt + normalize location sanitization |
| Under-scored vs manual | 6 | Missing scope/commercial/transformation rules |
| Over-scored vs manual | 3 | Missing domain caps / junior title calibration |
| Blocked before Verified | 9 | Preview policy / gates — upstream of prompt |
| Engineering / parse failures | 4 | Not prompt — invalid JSON, XmlElement, generic reject |

---

## 9. Recommended reading order for implementers (future work)

When implementation is approved (not part of this analysis):

1. Resolve **normalize location sanitization vs EMEA-VER-P1/P2** — conflicts with manual calibration on country-remote rows.  
2. Add **missing Professional Fit rules** (§3 M1–M11) to Verified Stage 2 prompt.  
3. Align **score bands** with decision outputs and interview probability caps.  
4. Address **Preview false negatives** separately (EMEA-PREVIEW-CALIBRATION) where KOMENTAR cites PREVIEW_REJECT.  
5. Fix **RejectReason propagation** (EMEA-VER-P3) and engineering failures conflated with score 0.

---

*Analysis based on `Executive-Job-CRM-v1.1-DEV.json` Verified prompt + `Executive Job CRM - EMEA DEV v31.xlsx` column AL (KOMENTAR). No workflow files were modified.*
