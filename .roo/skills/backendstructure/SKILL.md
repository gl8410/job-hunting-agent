---
name: backendstructure
description: Reference guide for the backend project structure, architectural patterns, and code organization.
---

# Backendstructure

## 1. Overview
The backend follows a **FastAPI Modular Architecture**, emphasizing Separation of Concerns (SoC) and Type Safety. It is structured to support scaling, easy testing, and clear data flow from API endpoints to database models.

## 2. Directory Structure

### `backend/app/`
The application root.
- **`main.py`**: Entry point. Initializes FastAPI `app`, middleware (CORS), DB connection (`init_db`), and registers the global `api_router`.
- **`run.py`**: Uvicorn launcher script for development.

### `backend/app/api/`
The Interface Layer (REST API).
- **`v1/api.py`**: Central router aggregator. Includes all domain routers with prefixes/tags.
- **`v1/routers/`**: Domain-specific controllers.
  - **Logic**: Routers should only handle HTTP concerns (request parsing, status codes) and delegate business logic to `services`.
  - **Naming**: `document.py`, `rule.py`, `review.py`.

### `backend/app/core/`
System-wide Infrastructure.
- **`config.py`**: Pydantic `Settings` for environment variables (DB URL, API Keys).
- **`db.py`**: Database session management (SQLModel/SQLAlchemy engine).
- **`exceptions.py`**: Custom exception handlers.
- **`supabase.py`**: Auth and storage integration.

### `backend/app/models/`
The Data Layer (ORM).
- See `Data model design.md`.
- **Role**: Defines Database Schema AND Internal Business Objects.
- **Pattern**: Uses `SQLModel` (table=True).

### `backend/app/schemas/`
The Data Transfer Layer (DTOs).
- **Role**: Defines Pydantic models for **Requests** (Input) and **Responses** (Output).
- **Naming**: `DocumentCreate`, `DocumentRead`, `RuleUpdate`.
- **Goal**: Decouples internal DB models from external API contracts.

### `backend/app/services/`
The Business Logic Layer.
- **Role**: Contains the "Meat" of the application.
- **Responsibilities**:
  - Complex CRUD operations.
  - External API calls (LLM, MinerU).
  - Business rules validation.
- **Pattern**: Dependency Injection (usually functions or classes injected into Routers).

### `backend/app/integrations/`
External Adapter Layer.
- **`llm_client.py`**: Wrappers for AI model providers.
- **`vector_store.py`**: Interfaces for embedding storage/retrieval.

### `alembic/`
Database Migrations.
- Managed by `alembic` CLI.
- Stores version history for schema changes.

---

## 3. Key Architectural Patterns

### Request Lifecycle
1.  **Request** hits `api/v1/routers/endpoint`.
2.  **Schema** (`schemas/`) validates input JSON.
3.  **Router** calls **Service** (`services/`).
4.  **Service** interacts with **Model** (`models/`) via **DB Session**.
5.  **Service** returns data/object.
6.  **Router** returns response, serialized by **Schema**.

### Dependency Injection
- Use `Depends()` for database sessions: `session: Session = Depends(get_session)`.
- Use `Depends()` for current user auth: `current_user: User = Depends(get_current_user)`.

### Async/Await
- **FastAPI** is fully async.
- **IO-bound** operations (DB, External APIs) must use `await`.
- **CPU-bound** tasks should be offloaded (e.g., Celery or background tasks, though simple background tasks are used here via `BackgroundTasks`).

---

## 4. Development Workflow

1.  **New Feature**:
    1.  Define **Model** in `models/`.
    2.  Create **Migration** (`alembic revision --autogenerate`).
    3.  Define **Schemas** (Create/Read/Update) in `schemas/`.
    4.  Implement **Service** logic in `services/`.
    5.  Expose via **Router** in `api/v1/routers/`.
    6.  Register Router in `api/v1/api.py`.

2.  **Testing**:
    - Use `pytest`.
    - Tests located in `tests/`.
    - Fixtures for DB sessions and Client.

