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

**Status:** Released and Frozen

**Release:**

- **Version:** v1.1-stable
- **Release commit:** 862e423
- **Canonical workflow:** `workflows/Executive-Job-CRM-v1.1-STABLE.json`

**Maintenance policy:**

- Do not modify the frozen STABLE workflow for feature development.
- Only emergency bug fixes are allowed.
- Any emergency fix requires a new commit, validation, and a new patch release tag.
- Do not move or rewrite tag `v1.1-stable`.

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
