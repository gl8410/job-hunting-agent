---
name: frontendenvironment
description: Reference guide for the frontend environment configuration, build tools, and deployment settings.
---

# Frontendenvironment

## 1. Overview
The frontend is built with **Vite**, **React 19**, and **TypeScript**. It uses **pnpm** for package management and **Docker** for containerized deployment with an Nginx production stage.

## 2. Toolchain
- **Package Manager**: `pnpm` (required for dependency resolution and efficiency).
- **Build Tool**: `Vite` (for fast development and optimized production builds).
- **Compiler**: `TypeScript` (Strict mode).

## 3. Environment Variables
The project uses `.env` files for environment-specific configuration. In Vite, variables must be prefixed with `VITE_` to be exposed to the client-side code.

### Core Variables
- `VITE_SUPABASE_URL`: The URL of the Supabase project.
- `VITE_SUPABASE_ANON_KEY`: The public anonymous key for Supabase.
- `VITE_API_BASE_URL`: (Optional) Custom backend API URL.

### Loading Strategy (`vite.config.ts`)
```typescript
import { loadEnv } from 'vite';
// ...
const env = loadEnv(mode, '.', '');
```
Variables are accessible in the code via `import.meta.env.VITE_VARIABLE_NAME`.

## 4. Dockerization (`Dockerfile`)
The frontend uses a multi-stage build process.

### Stage 1: Build
- Base Image: `node:20`.
- Corepack enabled to support `pnpm`.
- Build arguments (`ARG`) are used to pass environment variables during the build phase.
- Command: `pnpm build`

### Stage 2: Production
- Base Image: `nginx`.
- Build artifacts are copied to `/usr/share/nginx/html`.
- Custom `nginx.conf` is used to handle SPA routing (fallback to `index.html`).
- Port: `80` (internal).

## 5. Deployment Procedures

### Development
1.  Install deps: `pnpm install`.
2.  Start dev server: `pnpm dev` (Runs on `http://localhost:3000`).

### Production Build
1.  Run `pnpm build`.
2.  Preview build: `pnpm preview`.

### Containerized Build
```bash
docker build -t frontend \
  --build-arg VITE_SUPABASE_URL=your_url \
  --build-arg VITE_SUPABASE_ANON_KEY=your_key .
```

## 6. Development Reference

### Port Mapping
By default, the Vite dev server is configured to run on port `3000` and listen on all interfaces (`0.0.0.0`) to support Docker/WSL environments.

### Path Aliases
The `@` alias is configured to point to the root directory in `vite.config.ts` and `tsconfig.json`.
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, '.'),
  }
}
```

