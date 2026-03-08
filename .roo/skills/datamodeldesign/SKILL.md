---
name: datamodeldesign
description: Reference guide for the project's data model architecture, patterns, and schema definitions.
---

# Datamodeldesign

## 1. Overview
This document outlines the data modeling patterns, schema definitions, and relationships uses **SQLModel** (SQLAlchemy + Pydantic) for ORM and validation, targeting a **PostgreSQL** database.

## 2. Core Paradigms

### Model Definition Standards
- **Base Class**: All models must inherit from `SQLModel`.
- **Table Definition**: Use `table=True` for database entities.
- **Primary Keys**: Use `uuid.UUID` generated via `default_factory=uuid.uuid4`.
- **Type Hinting**: Mandatory for all fields (e.g., `Optional[str]`, `List["Rule"]`).

### State Management
- **Enums**: Use `str, Enum` inheritance for status fields.
- **Consistency**: Enums ensure strictly typed state transitions (e.g., `DocumentStatus`, `TaskStatus`).

### Data Relationships
- **Foreign Keys**: defined as fields (e.g., `group_id: str = Field(foreign_key="...")`).
- **Navigation**: defined as `Relationship` objects (e.g., `rules: List["Rule"] = Relationship(...)`).
- **Hierarchies**: Use Adjacency List pattern for tree structures (e.g., `RuleGroup` self-referencing `parent_id`).

---
### Migration Workflow (Alembic)
1.  Modify `SQLModel` classes in `backend/models/`.
2.  Run `alembic revision --autogenerate -m "message"`.
3.  Verify generated script in `alembic/versions/`.
4.  Apply with `alembic upgrade head`.
