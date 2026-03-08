---
name: frontendstructure
description: Reference guide for the frontend project structure, component architecture, and state management.
---

# Frontendstructure

## 1. Overview
The frontend is a **Single Page Application (SPA)** built with **React 19**, **Vite**, and **TypeScript**. It emphasizes a component-based architecture with context-based state management and direct integration with Supabase and the Backend API.

## 2. Directory Structure

### Root Files
- **`App.tsx`**: Main application component. Sets up Routing (implied or conditional rendering) and Global Providers (`AuthContext`, `Layout`).
- **`index.tsx`**: Entry point. Mounts React root.
- **`vite.config.ts`**: Build configuration (Proxy settings, plugins).

### `components/`
UI Building Blocks.
- **Role**: Contains both "dumb" presentation components and "smart" business components.


### `contexts/`
Global State Management.
- **`AuthContext.tsx`**:
  - Manages User Session (Supabase).
  - Exposes `user`, `loading`, `signIn`, `signOut`.
  - Wraps the entire app in `App.tsx`.

### `hooks/`
Custom React Hooks.
- **`useResizable.ts`**: UI utility for resizable split-panes (likely used in Document/Report comparison views).

### `services/`
API & Data Layer.

## 3. Key Architectural Patterns

### Authentication
- **Provider Pattern**: `AuthContext` holds the source of truth.
- **Protection**: Components check `user` from context; redirect to `Login` if null.
- **Token Handling**: `api.ts` intercepts requests to attach the Supabase JWT.

### Component Communication
- **Props**: Parent-to-Child data flow.
- **Context**: Global state (User, Theme).
- **Events**: Callback functions passed down to children (e.g., `onUploadComplete`).

### Styling
- **CSS Strategy**: Likely Tailwind CSS (inferred from modern stack, though `index.css` not explicitly deep-scanned, `lucide-react` icons usage is standard with Tailwind UI libs).
- **Responsive Design**: Mobile-first considerations in Layouts.

## 4. Development Workflow

1.  **New UI Feature**:
    1.  Create Component in `components/`.
    2.  Define Props Interface in `types.ts` (or colocated).
    3.  Add API methods in `services/api.ts`.
    4.  Integrate into `App.tsx` or parent component.

2.  **State Management**:
    - Local state: `useState` for form inputs/toggles.
    - Server state: `useEffect` + API calls (fetch on mount).
    - Global state: `useContext` (Auth).

3.  **Build & Deploy**:
    - `pnpm dev`: Local server (Vite).
    - `pnpm build`: Production assets generation.
