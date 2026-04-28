---
name: backend_structure_design
description: Reference pattern for FastAPI backend architectural structure, routing design, and separation of concerns.
---

# Backend Modular Architecture (FastAPI)

This skill outlines the standard directory structure and architectural patterns for the FastAPI backend in this project. It ensures a clear separation of concerns, maintainability, and scalability.

## Directory Structure

The backend should strictly follow this modular layout:

```text
backend/
├── app/
│   ├── api/          # API route definitions (Controllers)
│   │   ├── router.py # Main router aggregator
│   │   └── v1/
│   │       └── endpoints/ # Specific route handlers (e.g., design.py, projects.py)
│   ├── core/         # Core application configuration and database setup
│   │   ├── config.py # Central configuration, environment variables, settings
│   │   └── db.py     # Database connection and session initialization
│   ├── models/       # Database models (SQLModel / SQLAlchemy ORM classes)
│   ├── schemas/      # Pydantic models for request/response validation
│   └── services/     # Core business logic and external service integrations
├── tests/            # Unit and integration tests (pytest)
├── main.py           # FastAPI application entry point
└── requirements.txt  # Project dependencies
```

## Architectural Principles

1. **Routing (`app/api/`)**: 
   - Define API endpoints within `app/api/v1/endpoints/`.
   - Keep route handlers thin. They should focus on receiving requests, validating inputs via `schemas`, calling `services` for business logic, and returning standard responses.
   - Aggregate all endpoint routers in `app/api/router.py`.
   - Include the main router in `main.py` with standard prefixes (e.g., `/api/v1`).

2. **Core Configuration (`app/core/`)**:
   - Manage all environment variables and constant configurations in `config.py` using Pydantic `BaseSettings`.
   - Setup the database engine and session management in `db.py`.

3. **Data Models (`app/models/`)**:
   - Define ORM models (using SQLModel) that strictly map to database tables.
   - Keep database relational logic and constraints defined here.

4. **Data Validation (`app/schemas/`)**:
   - Define Pydantic V2 models for structuring incoming request bodies and outgoing response payloads.
   - Separating schemas from models ensures flexibility, allowing endpoints to accept or return different shapes of data securely.

5. **Business Logic (`app/services/`)**:
   - Place all complex operations, database manipulations, third-party API interactions, and domain-specific algorithms here (e.g., `design_service.py`, `ai_generation_service.py`).
   - Route handlers should delegate core processing to these services. This allows logic to be reused across different endpoints, background tasks, or testing suites.

6. **Application Entry Point (`main.py`)**:
   - Initialize the main FastAPI application instance.
   - Configure global applications: CORS middleware, static file serving routes, and lifespan events (such as initializing the database on startup).

## Benefits
- **Maintainability**: Clear separation means developers always know where files belong.
- **Testability**: Service functions can be tested independently of HTTP API routing.
- **Scalability**: Adding new features simply involves adding a new model, schema, service, and endpoint by mirroring the established pattern.
