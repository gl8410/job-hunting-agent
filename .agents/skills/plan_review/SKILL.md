---
name: plan_review
description: Multi-viewpoint engineering review of plans to surface conflicts, risks, and unclear decisions before coding begins.
---

# Plan Review Skill

## Overview

Before any implementation begins, perform a structured review of the plan from **five engineering viewpoints**. The goal is to surface hidden conflicts, ambiguous requirements, technical risks, and unanswered questions that would otherwise cause rework mid-sprint.

Output a **Plan Review Report** as a markdown document (save to `design/plan-review-<topic>.md` or print inline). Each section must have an explicit **verdict**: ✅ Clear, ⚠️ Needs Clarification, or ❌ Conflict/Blocker.

---

## Review Viewpoints

### 1. 🏗️ Architecture & Design Consistency

**Questions to ask:**
- Do the proposed layers/modules map cleanly onto each other without circular dependencies?
- Are naming conventions consistent across models, services, and API routes?
- Does the data flow make sense end-to-end (ingestion → storage → transformation → serving)?
- Are there any God objects, overly broad services, or responsibility leaks?

**Check for:**
- Model fields that are defined differently in different layers (e.g., `date` as `Date` in DB but `str` in API schema).
- Services that call each other in a way that creates circular imports.
- API routes that bypass the service layer and talk directly to the DB.

---

### 2. 🗄️ Data & Schema Integrity

**Questions to ask:**
- Are all unique constraints defined and enforced at both the DB and application level?
- Are nullable vs. non-nullable fields intentional and documented?
- Are there any missing indexes for high-frequency query patterns?
- Will the schema support future partitioning or sharding needs?

**Check for:**
- Missing composite unique constraints (e.g., `symbol + date` for kline data).
- JSONB/JSON fields without a documented schema — these become tech debt.
- Timestamps stored as `DateTime` without timezone awareness (`timezone=True`).
- FKs without cascading rules defined (what happens on delete?).

---

### 3. ⚙️ Infrastructure & Environment Conflicts

**Questions to ask:**
- Do all services (postgres, redis, minio) have their ports documented and non-conflicting?
- Are environment variables consistently named between `.env.example`, `config.py`, and `docker-compose.yml`?
- Is the Python version pinned consistently across `.python-version`, `pyproject.toml` `requires-python`, and any Docker base image?
- Is the venv path consistent with what `alembic.ini` and any startup scripts reference?

**Check for:**
- `DATABASE_URL` vs. `POSTGRES_*` split variables — pick one pattern.
- Violations of the canonical virtual environment rule (must use `uv venv` and `.\backend\venv\Scripts\activate`).
- MinIO bucket names hardcoded in code vs. pulled from env.
- Redis connection string format (`redis://` vs. individual host/port fields).

---

### 4. 🧪 Testability & TDD Readiness

**Questions to ask:**
- Can every service be tested without a live database (via dependency injection or mocking)?
- Is there a `conftest.py` plan with async test fixtures for DB sessions?
- Are external API calls (AKShare, MinIO) isolated behind an interface so they can be mocked?
- Does the plan include at least one test per critical business rule (e.g., night-session alignment, rollover factor calculation)?

**Check for:**
- Services that instantiate their own DB sessions (not injected) — untestable.
- Missing `pytest-asyncio` configuration (`asyncio_mode = "auto"` in `pyproject.toml`).
- Integration tests that require a live PostgreSQL — they need a separate marker (`@pytest.mark.integration`).
- Scripts in `scripts/` that embed business logic instead of calling services — untestable.

---

### 5. 🔐 Security & Operational Concerns

**Questions to ask:**
- Are secrets ever logged, printed, or returned in API responses?
- Is there an auth layer (JWT/API token) planned before the API is exposed?
- Are there any endpoints that accept raw SQL or unvalidated user input?
- Is there a plan for rate limiting on data ingestion endpoints to avoid hitting AKShare limits?

**Check for:**
- `echo=True` on the SQLAlchemy engine in production — logs all SQL including values.
- MinIO credentials hardcoded in `docker-compose.yml` without an override pattern.
- `/api/v1/registry/sync/{source_id}` callable without authentication.
- No retry/backoff strategy for AKShare rate limits.

---

## Output Format

For each viewpoint, produce a table:

| Issue # | Severity | Description | Recommendation |
|---------|----------|-------------|----------------|
| A-1 | ❌ Blocker | Circular import between `etl_service` and `calendar_service` | Extract shared logic into a `utils/trading_date.py` module |
| D-2 | ⚠️ Warning | `quality_schema` JSONB field has no documented structure | Add a Pydantic model `QualitySchema` and validate on write |
| I-3 | ✅ Clear | Port assignments in docker-compose are non-conflicting | No action needed |

Severity levels:
- **❌ Blocker** — must be resolved before coding starts
- **⚠️ Warning** — should be resolved; can proceed with documented assumption
- **✅ Clear** — no action needed

---

## Usage Instructions

When asked to review a plan, follow these steps:

1. **Read** all relevant plan files (e.g., `design/*.md`, `CLAUDE.md`, `.antigravity_rules`).
2. **Apply** each of the 5 viewpoints above to the plan content.
3. **Produce** a Plan Review Report saved to `design/plan-review-<topic>.md`.
4. **Summarize** blockers and warnings inline for the user.
5. **Do not** suggest implementation until all ❌ Blocker items are resolved or explicitly accepted by the user.
