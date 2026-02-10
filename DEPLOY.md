# Deployment Guide

This guide explains how to deploy the application using Docker and Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## 1. Environment Configuration

### Backend

Ensure `backend/.env` is configured. You can copy `backend/.env.local` or use the provided example in `backend/.env`.

Key variables to check in `backend/.env`:
- `DATABASE_URL`: `postgresql://postgres:postgres@db:5432/jobhunter` (Default for Docker)
- `CHROMA_HOST`: `chroma` (Default for Docker)
- `CHROMA_PORT`: `8000` (Internal Docker port)
- `BACKEND_CORS_ORIGINS`: Update this list to include your production frontend domain and extension ID.
  - Example: `["http://your-domain.com", "https://your-domain.com", "chrome-extension://YOUR_EXTENSION_ID"]`
- `SUPABASE_URL` and `SUPABASE_KEY`: Required for authentication if using Supabase.
- LLM Keys: `PHARSE_LLM_API_KEY`, `ANALYSIS_LLM_API_KEY`, etc.

### Frontend

The frontend build requires environment variables to be present at build time.
You can set these in a `.env` file in the root or pass them via command line.
The `docker-compose.yml` expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to be set in your shell or root `.env` file.

Create a `.env` file in the root directory (same level as `docker-compose.yml`):

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2. Build and Run

To build and start the application:

```bash
docker-compose up --build -d
```

This will start:
- **Backend**: Available at `http://localhost:8004`
- **Frontend**: Available at `http://localhost:3004`
- **Postgres DB**: Internal port 5432
- **ChromaDB**: Internal port 8000 (Exposed as 8021 locally)

## 3. Verify Deployment

Run the health check script:

```bash
./check_health.sh
```

## 4. Extension Configuration

The Chrome Extension is currently configured for local development. For production:

1.  **Update URLs**:
    - Open `extension/popup/popup.js`.
    - Change `DEFAULT_API_BASE` to your production backend URL (e.g., `https://api.your-domain.com`).
    - Change `DEFAULT_DASHBOARD_URL` to your production frontend URL (e.g., `https://your-domain.com`).

2.  **Supabase Config**:
    - `extension/popup/popup.js` contains hardcoded Supabase keys (`SUPABASE_URL`, `SUPABASE_KEY`).
    - **SECURITY WARNING**: Ensure you are using the `ANON` key, not the `SERVICE_ROLE` key.
    - Update these values to match your production Supabase project.

3.  **Permissions**:
    - If your domain is not covered by `*://*/*` (it is, but be aware), check `extension/manifest.json`.
    - Update `content_security_policy` in `manifest.json` to include your production domains if strict CSP is enabled.

## 5. Cloud Deployment Tips

- **Reverse Proxy**: In a real production environment, you should use a reverse proxy (like Nginx or Traefik) in front of the Frontend and Backend to handle SSL/TLS termination and routing (e.g., `your-domain.com` -> Frontend, `api.your-domain.com` -> Backend).
- **Database**: Consider using a managed database service (like AWS RDS or Supabase) instead of the containerized Postgres for better reliability and backups. Update `DATABASE_URL` accordingly.
- **Secrets**: Do not commit `.env` files to version control. Use a secrets manager or environment variable injection provided by your cloud provider.