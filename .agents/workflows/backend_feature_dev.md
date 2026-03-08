---
description: Workflow for adding a new backend feature via FastAPI Modular Architecture
---

# Backend Feature Development Workflow

This workflow describes the step-by-step process for adding new backend features to the FastAPI server, ensuring type safety and separation of concerns.

1. **Define the Model**: Create the data schema in `backend/app/models/`. Use SQLModel `table=True` to define both the DB schema and business object.
2. **Database Migration**: Run Alembic to autogenerate migration scripts.
// turbo
`cd backend && alembic revision --autogenerate -m "Add new feature model"`
3. **Define Schemas (DTOs)**: In `backend/app/schemas/`, define Pydantic models for Requests (Input) and Responses (Output). Examples: `FeatureCreate`, `FeatureRead`, `FeatureUpdate`.
4. **Implement Service Logic**: In `backend/app/services/`, implement the business logic. This handles CRUD operations, external API calls, and business validation. Note that this logic is agnostic to the HTTP routing layer.
5. **Create Router**: Expose the service logic via an API router in `backend/app/api/v1/routers/`. Inject the DB Session (`Depends(get_session)`) and call the Service layer.
6. **Register Router**: Add the newly created router to `backend/app/api/v1/api.py` to mount it into the main FastAPI application.
7. **Testing**: Write automated tests in `backend/tests/` using `pytest` to assert the service logic functions correctly. See `.agents/workflows/test_driven_development.md` for running tests.
