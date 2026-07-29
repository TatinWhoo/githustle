# GitHustle Frontend Foundation — Design Spec

**Date:** 2026-07-27
**Status:** Approved (brainstorming)
**Scope:** Foundation layer for migrating the `ui-draft/githustle` UI into the production `client/` app and wiring it to the existing `server/` API.

---

## 1. Purpose

The `ui-draft/githustle` app is a high-fidelity, mock-data React 19 + TypeScript prototype with no server wiring, no routing, and a fake client-side role simulator. The production `client/` is a near-empty JavaScript Vite scaffold with data tooling installed but unused. The `server/` is a mature modular PERN API at `/api/v1` with cookie-based JWT auth, socket.io, pino logging, and a correlation-id middleware.

This spec defines the **foundation** every feature migration depends on: stack conversion, ported design system, API client, structured client logging, real authentication, routing, and the application layout shell. Feature pages (jobs, projects/messaging, invoices, AI, admin, collaborative workspace) are explicitly deferred to their own follow-on specs that plug into this foundation.

## 2. Success Criteria

- `client/` runs as TypeScript + Tailwind v4 with the draft's exact design tokens; no visual drift from the draft shell.
- A user can register (role select), verify email, log in, reset password, and land in an authenticated shell whose role is derived from the real `GET /auth/me` user — the role simulator is gone.
- All server calls go through a single axios client with `withCredentials`, correlation-id propagation, and a `401 → refresh → retry once → else redirect` flow.
- Client emits structured logs (`{ timestamp, level, correlationId, action, message, meta }`) that share the correlation id with server logs.
- The layout shell (topnav, collapsible sidebar, mobile drawer, profile menu, toast) is decomposed into small, individually testable components with typed props.
- `npm run build` succeeds and the foundation test suite passes.

## 3. Stack Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Language | Convert `client/` to **TypeScript** |
| Styling | **Tailwind v4** (`@tailwindcss/vite`) + ported `@theme` tokens |
| Animation | **motion** (Framer Motion) |
| Data fetching | **@tanstack/react-query** over **axios** (already installed) |
| Cross-page client state | **zustand** (already installed) |
| Routing | **react-router-dom v7** (already installed) |
| Charts / flowchart | `recharts`, `@xyflow/react` — installed in foundation, used by feature specs |
| Icons | **`@phosphor-icons/react` only** — drop `lucide-react` for icon-set consistency |
| Testing | **Vitest + React Testing Library** (added in foundation) |

## 4. Architecture

Feature-based structure mirroring server module boundaries so a bug in one area maps to one folder.

```
client/src/
  main.tsx                      # createRoot + StrictMode + error listener
  App.tsx                       # providers + router mount only (no business logic)
  app/
    router.tsx                  # route table, ProtectedRoute, RoleRoute
    providers.tsx               # QueryClientProvider, AuthProvider, Toaster/ToastHost
  lib/
    api/client.ts               # axios instance + interceptors
    api/endpoints/auth.ts       # typed auth calls (foundation)
    logger/logger.ts            # browser structured logger
    logger/correlation.ts       # correlation-id generate/store/read
    query/queryClient.ts        # QueryClient + defaults
    query/keys.ts               # query-key factory
  features/
    auth/
      pages/{LoginPage,RegisterPage,VerifyEmailPage,ForgotPasswordPage,ResetPasswordPage}.tsx
      components/{AuthCard,RoleSelect,PasswordField}.tsx
      hooks/{useAuth,useLogin,useRegister}.ts
      api/auth.api.ts
      AuthProvider.tsx
    layout/
      AppShell.tsx  TopNav.tsx  Sidebar.tsx  MobileDrawer.tsx
      ProfileMenu.tsx  NavItem.tsx  Toast.tsx  ToastHost.tsx
  stores/
    session.store.ts            # authenticated user cache
    ui.store.ts                 # sidebarCollapsed, mobileDrawerOpen, toasts
  types/
    user.ts  auth.ts  api.ts    # foundation types (feature types come later)
  styles/
    index.css                   # ported @theme tokens + utilities
```

**Isolation contract:** every unit has one responsibility, typed props/return, and no hidden global reads except the two zustand stores and react-query. Feature folders are added by their own specs; foundation ships only `auth` and `layout`.

## 5. Design System Port

Port the draft's `src/index.css` verbatim into `client/src/styles/index.css`:
- `@import "tailwindcss";` + Google Fonts import (Inter, Geist, JetBrains Mono, Playfair Display).
- Full `@theme` block: `gh-ink #0F1923`, `gh-ink2 #1E2D3D`, `gh-teal #0D9488` (+ hover/light), amber/red/green/blue (+ light), `surface-0 #F7FAFC`, `surface-1 #FFFFFF`, `border #E2E8F0`, text primary/secondary/muted, `shadow-card/elevated/diffuse`, status tokens (pending/active/approved/overdue/disputed), pro-gold, `--height-topnav: 56px`, `--height-bottom-nav: 64px`.
- Utilities: `.glass-panel`, `.active-glow`, `.transition-all-custom`, `.no-scrollbar`, scrollbar styling, React-Flow overrides, `.gh-table*`.

`vite.config.ts` gets `react()` + `tailwindcss()` plugins and the `@` path alias resolving to `src/`.

## 6. API Client + Structured Logging

`lib/api/client.ts`:
- `axios.create({ baseURL: import.meta.env.VITE_API_URL, withCredentials: true })`.
- **Request interceptor:** ensure an `X-Correlation-ID` header (reuse a per-session id from `correlation.ts`, or a fresh one per request); start a timer.
- **Response/error interceptor:** read server's `X-Correlation-ID` back, log `HTTP_REQUEST` with `{ method, path, statusCode, durationMs }` at status-derived level (`>=500 error`, `>=400 warn`, else `info`).
- **401 handler:** on 401 (except the refresh call itself), call `POST /auth/refresh` once; on success replay the original request; on failure clear session and redirect to `/login`. Guard against infinite refresh loops with a per-request `_retried` flag.

`lib/logger/logger.ts` (adapted from the structured-logging skill for the browser):
- `logger.{debug,info,warn,error}(obj)` emits `{ timestamp: ISO, level, correlationId, action, message, meta }`.
- Dev: readable `console` output; prod: compact JSON via `console`.
- Level gate via `import.meta.env` (`debug` in dev, `info` in prod).
- **Never logs** passwords, tokens, cookies, or full request bodies — named fields only.

## 7. Auth + Routing + Session

Endpoints consumed (from `server/src/modules/auth/auth.routes.js`): `POST /auth/register`, `GET /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password-reset`, `POST /auth/password-reset/confirm`.

- **`AuthProvider`** runs `GET /auth/me` once on mount to hydrate the session (loading → authenticated/anonymous). Exposes `useAuth() → { user, role, status, login, register, logout, refetch }`.
- **Pages:** Login, Register (role select: `client` | `freelancer`), VerifyEmail (reads token from query), ForgotPassword, ResetPassword. Forms use `react-hook-form` with inline validation (validate on blur), visible labels, error-below-field, password show/hide, submit loading + success/error states, first-invalid-field focus.
- **`<ProtectedRoute>`** redirects anonymous users to `/login` preserving intended path; **`<RoleRoute role="admin">`** guards the admin desk.
- **Routes** replace the draft's `activeTab` state: `/hub`, `/conversations`, `/personal`, `/live`, `/saved`, `/admin`, `/profile`, `/premium`, `/help`, `/settings`, plus the public auth routes. Feature specs fill each route's page; foundation renders authenticated placeholder pages inside the shell so navigation is testable.

## 8. State Architecture + Types

- **react-query** owns all server data. No mock ledgers in component state.
- **zustand** owns only: `session.store` (user cache synced by AuthProvider) and `ui.store` (`sidebarCollapsed`, `mobileDrawerOpen`, toast queue).
- **local `useState`** for form/component-local state.
- **Types:** foundation ports `User`, `AuthSession`, auth DTOs, and a generic `ApiError`/`ApiResponse` into `types/`. Feature-specific types (`Job`, `Project`, `Milestone`, …) migrate with their feature specs. Where the draft's camelCase shapes diverge from server rows, feature specs add a per-module `adapters/` mapping layer; foundation establishes the pattern with the auth/user adapter.

## 9. Layout Shell (decomposition)

The draft's ~700-line `App.tsx` shell splits into typed components:
- `AppShell` — grid, `min-h-[100dvh]`, composes TopNav + Sidebar + MobileDrawer + `<Outlet/>` + ToastHost.
- `TopNav` — logo, search field, notification bell, `ProfileMenu`. **Role switcher removed.**
- `Sidebar` — collapsible; primary + utility nav via `NavItem`; active state from the real current route (`useLocation`), not local state.
- `MobileDrawer` — motion spring slide-in; closes on route change / backdrop tap.
- `ProfileMenu` — motion pop-in dropdown; real logout.
- `NavItem` — one nav row, active/collapsed variants, accessible.
- `Toast` / `ToastHost` — reads `ui.store` toast queue; `aria-live="polite"`; auto-dismiss 3–5s.

## 10. Animation & UX Baseline

- Preserve draft motion: drawer spring (`type: "spring", damping: 25, stiffness: 220`), dropdown pop-in.
- Shared motion tokens: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`; entrances ease-out, exits shorter than entrances.
- Press feedback (`scale ~0.97`) on interactive controls; hover effects gated behind `@media (hover: hover) and (pointer: fine)`.
- Respect `prefers-reduced-motion` (reduce, not remove).
- Keyboard-triggered / high-frequency actions (nav, search focus) stay un-animated. Deep per-feature animation audits are deferred to feature specs.

## 11. Error Handling & Testing

- App-root error boundary + per-route fallback UI; react-query errors surfaced as inline states or toasts with a recovery action (retry/login).
- Replace the draft's global blanket `ResizeObserver` error swallow with a scoped, commented suppressor documented as a known xyflow/canvas workaround (used by the workspace feature spec).
- **Vitest + React Testing Library** added. Foundation tests:
  - api client: attaches correlation id; 401 → refresh → retry once; no infinite loop.
  - logger: emits required fields; omits secrets.
  - `useAuth`: hydrates from `/auth/me`; login/logout transitions.
  - `ProtectedRoute`: redirects anonymous, allows authenticated; `RoleRoute` blocks wrong role.
  - `Sidebar`/`NavItem`: active state from route.
- Per verification-before-completion: `npm run build` + `npm test` must pass before any task is marked done.

## 12. Improvements Folded In

- Consolidate to a single icon set (`@phosphor-icons/react`); drop `lucide-react`.
- Add `@ → src/` path alias and `vite-tsconfig` paths for clean imports.
- Introduce a client structured logger sharing correlation ids with the server (observability parity).
- Scope the `ResizeObserver` error suppression instead of a blanket global handler.
- Note downstream: server mounts `messages.routes` at `/api/v1/projects` which collides with `projects.routes` and is remapped to `projects-messages` by `mountAll`; the Projects/Messaging feature spec must target the actual mounted path, not assume `/projects/:id/messages`.

## 13. Out of Scope (follow-on specs, one each)

Job Board & Proposals · Projects/Milestones + Real-time Messaging (socket.io) · Invoices & Earnings · AI Assistant (SSE) · Admin & Analytics · Collaborative Workspace (xyflow flowchart, whiteboard, shared tables) · Marketing landing page.
