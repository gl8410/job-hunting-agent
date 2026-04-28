---
name: frontend_structure_design
description: Reference pattern for frontend architectural structure, component design, and state management conventions.
---

# Frontend Structure Design

## 1. Overview
The frontend is built as a **Single Page Application (SPA)** utilizing **React (v19.2.4)**, **Vite (v6.2.0)**, and **TypeScript**. It utilizes context-based state management, a modular component-based architecture, and directly queries backend endpoints. UI utilizes **Tailwind CSS (v4.1.18)** and **lucide-react (v0.563.0)**.

## 2. Directory Structure

- `App.tsx`: Main routing configuration and application setup (wrapping global Context providers like `AuthContext`).
- `vite.config.ts`: Vite settings, build configuration, and proxying.
- `components/`: Core UI blocks. Contains both raw presentation elements and feature-specific "smart" views.
- `contexts/`: Global logic. For example, `AuthContext.tsx` handles Supabase session tokens, signIn, signOut.
- `hooks/`: Reusable React functionalities (e.g., custom wrappers like `useResizable.ts`).
- `services/`: Data/API layer encapsulating HTTP fetches and domain-specific Supabase calls.

## 3. Key Architectural Patterns

### Authentication & Authorization
- Use Context (`AuthContext`) as the ultimate source of truth for the local user state.
- Component-level route protection: If the `user` object in context is null, redirect the view to the login component.
- API layer logic intercepts auth calls and injects Supabase JWT Bearer tokens to headers automagically.

### Component Communication
- **Props**: Use typed interfaces to define Top-down Data communication.
- **Context**: Use for widespread variables avoiding prop-drilling (Theme, User).
- **Callback Events**: Define `onActionComplete` type handlers extending downward into action buttons.

### Styling & UI
- **Tailwind CSS**: Inferred logic suggests Tailwind (`index.css`), often utilized alongside libraries that provide Lucide layout icons.
- **Responsive Layouts**: Design utilizing grid/flex structures considering Mobile-first concepts implicitly.

## 4. Development Workflow for Features
When building a new UI module, follow this flow:
1. **Component**: Establish logic and UI in `components/Name.tsx`.
2. **Types**: Establish explicitly strongly typed props and state interfaces.
3. **API Logic**: Define network requests within `services/api.ts` avoiding inline networking code.
4. **State Management**:
   - `useState` for form fields / local variables.
   - `useEffect` strictly for mounts/dismounts data fetching side-effects.
   - `useContext` for referencing the user scope.
5. Setup the feature implementation into the main layout component or inside `App.tsx` routes.
