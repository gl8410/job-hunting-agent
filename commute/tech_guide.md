# Tech Stack Guide

This document provides a detailed overview of the technology stack used in the Job Analysis System project.

## 1. Backend

The backend is a Python-based application built with **FastAPI**, designed to provide AI-powered job analysis and decision support.

*   **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (v0.109.0) - High-performance web framework for building APIs.
*   **Language:** Python
*   **Database:**
    *   **PostgreSQL**: Primary relational database.
    *   **SQLModel**: ORM (Object-Relational Mapping) library, combining Pydantic and SQLAlchemy for database interactions.
    *   **Alembic**: Database migration tool.
    *   **Supabase**: Used for authentication and potentially as a hosted database/backend-as-a-service layer.
*   **AI & LLM Integration:**
    *   **Parsing (Phrase LLM):** Configured to use **DeepSeek-V3.2** via the SiliconFlow API. Used for parsing job descriptions and structured data extraction.
    *   **Analysis (Analysis LLM):** Configured to use **Gemini 3 Flash Preview** via HiAPI. Used for complex research, RAG (Retrieval-Augmented Generation), and writing tasks.
    *   **Client:** `httpx` is used for asynchronous HTTP requests to these LLM APIs.
*   **External Services:**
    *   **Tavily API**: Used for AI-powered web search and research capabilities.
    *   **Mineru**: Configuration present for Mineru.net integration.
*   **Key Libraries:**
    *   `beautifulsoup4`: For web scraping and HTML parsing.
    *   `tiktoken`: For token counting (OpenAI model compatibility).
    *   `pyjwt`: For JSON Web Token handling.
    *   `uvicorn`: ASGI server for running the application.

## 2. Frontend

The frontend is a modern web application built with **React** and **TypeScript**, managed by **Vite**.

*   **Framework:** [React](https://react.dev/) (v19.2.3)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Language:** TypeScript
*   **Styling:**
    *   **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
    *   `postcss` & `autoprefixer`: CSS processing tools.
*   **State Management & Data:**
    *   **Supabase Client** (`@supabase/supabase-js`): For interacting with the Supabase backend (Auth, DB).
*   **UI Components & Visualization:**
    *   **Lucide React**: Icon library.
    *   **Recharts**: Composable charting library for React (used for job statistics).
*   **Internationalization (i18n):**
    *   `i18next`, `react-i18next`: For handling multi-language support (English/Chinese).
    *   `i18next-browser-languagedetector`: Auto-detects user language.
*   **AI Integration (Client-side):**
    *   `@google/genai`: Google's Generative AI SDK for direct access to Gemini models from the frontend.
*   **Utilities:**
    *   `docx`: For generating and working with Word documents (likely for resume/report export).

## 3. Browser Extension (Jobs)

A Chrome/Edge extension designed to capture job postings directly from browser tabs.

*   **Manifest Version:** V3
*   **Core Features:**
    *   Captures job postings for analysis.
    *   Interacts with the backend API.
*   **Permissions:** `activeTab`, `scripting`, `tabs`, `storage`.
*   **Host Permissions:** Access to all HTTP/HTTPS sites to extract content, with specific allowances for localhost and the development server IP.

## 4. DevOps & Infrastructure

*   **Containerization:**
    *   **Docker**: Dockerfiles provided for both `backend` and `frontend`.
    *   **Docker Compose**: Orchestrates the multi-container application (frontend, backend, database).
*   **Web Server:**
    *   **Nginx**: Configuration present in `frontend/nginx.conf`, likely serving the frontend static assets and potentially acting as a reverse proxy.

## 5. Project Structure

*   `backend/`: FastAPI application code, API endpoints, services, and models.
*   `frontend/`: React application code, components, and assets.
*   `jobs/`: Browser extension source code.
*   `commute/`: Documentation and project notes.
