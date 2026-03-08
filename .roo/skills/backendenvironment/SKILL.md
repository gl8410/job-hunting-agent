---
name: backendenvironment
description: Reference guide for the backend runtime environment, dependencies, configuration, and startup procedures.
---

# Backendenvironment

## 1. Overview
The backend runs on **Python 3.12** in a **Docker** container or a local virtual environment. It manages dependencies via `requirements.txt` and configuration via `.env` files loaded by Pydantic Settings.

## 2. Runtime Environment

### Docker
- **Base Image**: `python:3.12`.
- **Workdir**: `/app`.


### Local Virtual Environment
- **Path**: `backend/venv/`
- **Creation**: `python -m venv venv`
- **Activation**: `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Linux/Mac).

## 3. Configuration Management

### Settings Module (`app/core/config.py`)
- Uses `pydantic-settings`.
- **Source**: Reads from system environment variables and `.env` file.
- **Key Variables**:
  - `PROJECT_NAME`: App title.
  - `API_V1_STR`: API prefix (default: `/api/v1`).
  - `POSTGRES_SERVER`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Database connection.
  - `SUPABASE_URL`, `SUPABASE_KEY`: Auth & Storage.
  - `OPENAI_API_KEY` (or compatible): LLM Provider.

### Environment Files
- **`.env`**: Secrets and local config (git-ignored).
- **`.env.example`**: Template for required variables.

## 4. Dependencies (`requirements.txt`)

### Core Framework
- `fastapi>=0.109.0`: Web framework.
- `uvicorn>=0.27.0`: ASGI Server.
- `pydantic>=2.0.0`: Data validation.

### Database
- `sqlmodel>=0.0.14`: ORM.
- `alembic>=1.13.0`: Migrations.
- `psycopg2-binary>=2.9.9`: PostgreSQL driver.

### AI & Data
- `chromadb>=0.4.22`: Vector Store (if local).
- `supabase>=2.3.0`: Supabase Client.
- `reportlab>=4.0.0`: PDF Generation.

### Testing
- `pytest`, `pytest-asyncio`.

## 5. Startup Procedures

### Production (Docker)
1.  Build: `docker build -t backend .`
2.  Run: `docker run -p 8874:8874 --env-file .env backend`
3.  Command: `uvicorn backend.main:app --host 0.0.0.0 --port 8874`

### Development (Local)
1.  **Script**: `backend/start_backend.bat` (Windows).
    - Activates `venv`.
    - Runs `python run.py`.
2.  **Entry Point (`run.py`)**:
    - Adds current directory to `sys.path`.
    - Launches `uvicorn` with `reload=True` on port `8000`.

## 6. Development Reference

### Adding Dependencies
1.  `pip install package-name`
2.  `pip freeze > requirements.txt` (Filter out system packages if necessary).

### Changing Ports
- **Local**: Edit `backend/run.py` -> `uvicorn.run(..., port=8000)`.
- **Docker**: Edit `backend/Dockerfile` (`EXPOSE`, `CMD`) and `docker-compose.yml`.
