# BG Calibration Principles

Executive scoring principles for **Executive Job CRM BG v1.1.2** (`workflows/Executive_Job_CRM_BG_v1.1.2_PRODUCTION.json`).

Use this document for BG maintenance, regression review, and selective porting to the EMEA workflow. It describes **AI calibration intent** — not workflow architecture or deterministic policy code.

---

## 1. Core Objective

The workflow evaluates **executive fit**, not keyword match.

The goal is to identify roles worth executive-level attention for a **Sofia / Remote Bulgaria** candidate with 15+ years of COO / MD / VP Operations–type leadership.

Scoring should reflect:

- **Seniority** — leadership level and decision authority
- **Scope** — organizational breadth, ownership, and influence
- **Transferability** — whether domain expertise is mandatory or general leadership suffices
- **Location fit** — Bulgaria eligibility (deterministic gate + Verified confirmation)
- **Strategic value** — whether the role merits opening the full posting and deeper evaluation

Preview and Verified AI steps apply these principles; they do not replace location policy or extraction logic.

---

## 2. Location Principles

**Accept**

- Sofia and other Bulgaria cities
- Remote Bulgaria
- Hybrid Bulgaria when Bulgaria is the eligible base

**Reject (deterministic)**

- Hard non-BG locations (country-specific remote outside Bulgaria, e.g. UK · Remote, Germany · Hybrid)
- Hybrid or on-site roles outside Bulgaria
- Relocation required outside Bulgaria
- Remote Europe / Remote EMEA / Remote Worldwide when Bulgaria eligibility is not confirmed

**Rule:** Location policy is **deterministic** — enforced by Policy Engine, location gates, and Verified location rules. AI must not override a hard BG-ineligible location with a high executive score or APPLY recommendation.

---

## 3. Executive Title Principles

These titles should **normally open** for Preview and Verified evaluation unless location policy rejects them:

- COO / Chief Operating Officer
- Managing Director / General Manager
- Operations Director / Head of Operations
- VP Operations / Vice President Operations
- Business Support & Operations Director
- Commercial Director (see also §5)
- Director / Senior Director / Associate Director (relevant function)
- Global Practice Leader (evaluate CV and domain separately)

**Bulgarian titles** (e.g. Управител, Директор, Оперативен директор, Търговски директор, Ръководител with broad scope) should be interpreted by **responsibility level**, not literal translation alone.

**Do not** preview-reject or under-score solely because the company is unknown, local, or not a global brand when the title and location are otherwise eligible.

---

## 4. Executive Scope Override

**Organizational scope can outweigh title hierarchy.**

Do not reject **Manager**, **Senior Manager**, or **Executive Business Partner** titles when the description shows strong executive scope indicators:

- Global or regional ownership
- Cross-country responsibility
- Enterprise initiatives
- Business transformation
- Modernization
- AI / automation
- Operational excellence
- Governance
- KPI ownership
- Executive stakeholder management
- Cross-functional leadership
- Strategic initiatives
- Multi-site responsibility

When these signals are present, roles should normally score **7–8** and proceed toward Verified evaluation / APPLY unless another deterministic rejection applies (location, mandatory specialist domain, mandatory language).

**Examples:** TELUS Operations Account General Manager; Ingram Micro Sr Manager, Support Operations; AnyTech365 Executive Business Partner to the COO.

---

## 5. Commercial Executive Principle

Do not under-score **Commercial Director**, **Commercial Manager**, **Business Development Director**, **Growth Director**, or **Revenue Director** when the posting shows executive-commercial scope:

- GTM strategy
- Pricing
- Revenue ownership
- Partnerships
- Business planning
- Executive decision-making
- Cross-functional leadership
- Team leadership
- Scaling a business

These roles should normally open for Verified evaluation. Prefer **GTM & Commercial Operations CV** when commercial scope dominates.

---

## 6. Transformation / Modernization Principle

Signals such as **transformation**, **modernization**, **business solutions**, **operational excellence**, and **AI/automation** should **increase score** when the role has enterprise or cross-functional scope.

Do not reject Manager titles solely because they contain "Manager" when cross-country modernization or enterprise operational scope is visible.

**Example principle:** KONE-style cross-country modernization manager roles should open for full-posting verification.

Prefer **Strategy & Operations CV** or **AI Transformation CV** depending on whether transformation/AI is central to the role.

---

## 7. Chief of Staff / Executive Business Partner Principle

**Executive Business Partner to COO**, **Chief of Staff**, and **Strategy Execution** roles should be evaluated as **Strategy & Operations executive roles** when they include:

- Organizational influence
- Execution ownership
- Executive stakeholder management
- Cross-functional coordination at leadership level

Do **not** treat them as administrative assistant roles unless the description clearly indicates administrative support only.

---

## 8. Domain Fit vs Seniority Fit

**Industry mismatch is not the same as seniority mismatch.**

| Situation | Treatment |
|-----------|-----------|
| Senior title + mandatory specialist domain gap | Reduce score; explain **domain** gap in risk/reject reason — not generic "seniority mismatch" |
| Mandatory clinical/GCP, pharma manufacturing OPEX, IFRS/accounting ops, licensed engineering, deep technical credentials | May reject or cap score when expertise is mandatory |
| Digital operations, BPO/CX, ecommerce, marketplace, commercial operations, delivery operations | Generally **transferable** unless posting requires deep specialist credentials |

Executive title alone must not produce APPLY; domain transferability must be assessed separately at Verified stage using FullJobText.

---

## 9. Company Scale / Overqualification

Small-company or small-agency **execution** roles may be rejected due to **organizational scale mismatch** or **overqualification** — not because the candidate lacks capability.

Reject reasons and risk fields should state **scale/overqualification**, not a generic capability gap or undersell of the candidate profile.

Overqualification rejects should use lower interview probability (see §10).

---

## 10. Probability Consistency

`interview_probability` must align with the final recommendation and decision:

| Outcome | Typical range |
|---------|----------------|
| **Reject** | ≤40% |
| **Overqualification reject** | 20–30% |
| **Monitor** | ~35–55% |
| **Apply** | ~45–70% |

Never assign 55–75% on rejected roles. Probability inconsistency is a calibration defect, not a sign of strong fit.

---

## 11. CV Selection Principles

Select CV by **role nature**, not title alone:

| CV | Use when |
|----|----------|
| **COO / Business Operations CV** | Broad operations, GM, account operations, delivery leadership, multi-site operations |
| **GTM & Commercial Operations CV** | Commercial, revenue, partnerships, GTM, pricing, growth leadership |
| **Strategy & Operations CV** | Transformation, business operations, modernization, Chief of Staff, Executive Business Partner, programmatic strategy execution |
| **AI Transformation CV** | AI, automation, RPA, or digital transformation is **central** to the role |
| **Project / Program Leadership CV** | Delivery/program governance only when the role is **not** a broad COO/GTM/strategy executive role |

---

## 12. Known Limitations

- Some parser, subject-line, and location edge cases remain **engineering backlog** items — not calibration principles.
- Do not overfit calibration to every one-off role in a regression export.
- Calibration should favor **consistent executive judgment** over perfect keyword behavior.
- Extraction fallback (`SUBJECT_FALLBACK`) and digest filtering are engineering concerns; this document covers **scoring and recommendation** only.

---

## Source of Truth

| Artifact | Role |
|----------|------|
| `workflows/Executive_Job_CRM_BG_v1.1.2_PRODUCTION.json` | Frozen production baseline (BG v1.1.2) |
| `workflows/Executive_Job_CRM_v1.1_BG_ONLY.json` | Active BG dev working file |
| AI prompts in Preview, Initial, Verified nodes | Runtime calibration (v1 → v1.1.1 → FINAL → P3 layers) |

If this document and the production workflow disagree, treat the **production workflow JSON** as authoritative until the discrepancy is resolved and documented.

---

*BG v1.1.2 — production freeze. Ready for EMEA selective porting.*
