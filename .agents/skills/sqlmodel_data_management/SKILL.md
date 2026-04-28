---
name: sqlmodel_data_management
description: Reference guide for managing database models, schema designs, and relationships using SQLModel.
---

# Manage Data Models through SQLModel

## 1. Overview
This project uses **SQLModel (v0.0.32)** (which acts as a combination of SQLAlchemy and Pydantic) for Object-Relational Mapping (ORM) and data validation. It targets a **PostgreSQL** database environment utilizing **psycopg2-binary (v2.9.11)** and migrations are handled by **Alembic (v1.18.4)**.

## 2. Core Paradigms

### Model Definition Standards
- **Base Class**: All database objects must inherit from `SQLModel`.
- **Database Tables**: Add `table=True` in the class definition to declare it an actual database entity.
- **Primary Keys**: Utilize standard UUID generation via `uuid.UUID` and `default_factory=uuid.uuid4`.
- **Type Hinting**: All fields must be explicitly typed (e.g., `Optional[str]`, `List["Rule"]`).

```python
import uuid
from typing import Optional
from sqlmodel import Field, SQLModel

class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    username: str
    email: Optional[str] = None
```

### State Management
- **Enums**: Inherit from `str, Enum` for strict database string statuses fields. (e.g., `DocumentStatus`, `TaskStatus`).

### Data Relationships
- **Foreign Keys**: Defined as fields utilizing `foreign_key` string referencing the table. field name is lowercase table name.
- **Relationships**: Defined as `Relationship` objects for navigation over relationships.
- **Hierarchies/Adjacency**: Use self-referencing relationships with Adjacency List patterns for tree structures.

```python
from sqlmodel import Relationship

class File(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_id: uuid.UUID = Field(foreign_key="project.id")
    
    # Navigation property
    project: "Project" = Relationship(back_populates="files")
```

## 3. Migration Workflow (Alembic)
Changes to data models must be synced to the Postgres database through Alembic migrations.
1. Modify definitions in `backend/app/models/`.
2. Generate migration script: `alembic revision --autogenerate -m "describe change"`
3. Verify the generated script in `alembic/versions/`.
4. Apply to DB: `alembic upgrade head`
