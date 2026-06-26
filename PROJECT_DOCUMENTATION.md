# Executive Job CRM – Project Documentation

## Overview

Executive Job CRM is an AI-powered automation workflow built in n8n.

The workflow automatically processes LinkedIn Job Alert emails, extracts executive job opportunities, evaluates their relevance using AI, and stores structured results in Google Sheets.

The primary objective is to reduce executive job search time from several hours per day to a highly automated review process.

---

# Workflow Architecture

Gmail Job Alerts
↓

Extract Email Body

↓

Normalize Email Content

↓

AI – Extract Job Cards

↓

Parse Job Cards

↓

Location Eligibility Check

├── Reject by Location
│
└── AI Initial Evaluation
     │
     ├── Reject by Score
     │
     └── AI Verified Review
             │
             ↓
     Normalize Verified Review

↓

Merge Final Records

↓

Google Sheets

---

# Current Features

- Gmail Job Alert processing
- LinkedIn job card extraction
- Executive AI scoring
- Executive profile matching
- Location filtering
- AI verification stage
- Automatic rejection workflow
- Google Sheets integration
- LinkedIn JobId deduplication

---

# Evaluation Logic

Stage 1

Preview evaluation using:

- Role
- Company
- Location
- Email preview

Stage 2

Full AI verification.

Produces:

- Verified Score
- Recommended CV
- Interview Probability
- Salary Estimate
- Risk Assessment
- Final Decision

---

# Output Fields

Each processed opportunity contains:

- Company
- Role
- JobId
- URL
- Location
- Work Type
- Score
- Verified Score
- Recommendation
- Final Decision
- Salary Estimate
- Salary Confidence
- Priority
- Risks
- Why Apply
- DedupeKey

---

# Current Limitations

Known limitations in v1.0.0:

- Some LinkedIn digest emails do not expose every Job URL consistently.
- Some preview emails still return "Location not specified".
- Location decisions are currently based on the extracted preview rather than the full LinkedIn job posting.

---

# Planned Improvements

## v1.0.1

- Improve URL extraction
- Improve location extraction
- Better LinkedIn digest parsing

## v1.1

- Two-stage AI architecture
- Open LinkedIn job only when Initial Score ≥ 7
- AI Location Engine
- Company enrichment
- Salary enrichment
- Improved duplicate detection

---

# Technology Stack

- n8n
- OpenAI
- Gmail
- Google Sheets
- JavaScript

---

# Status

Current release:

**v1.0.0**

Status:

**Release Candidate / Production Ready**
