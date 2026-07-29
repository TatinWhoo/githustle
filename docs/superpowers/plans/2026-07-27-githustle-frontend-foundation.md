# GitHustle Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `client/` into a TypeScript + Tailwind v4 app with the draft's design system, a structured-logging axios/react-query data layer, real cookie-based auth (replacing the role simulator), routing, and a decomposed layout shell wired to the `server/` API.

**Architecture:** Feature-based folders mirroring server modules. react-query owns server data; zustand owns session + UI state; local state owns forms. A single axios client carries correlation ids and a 401→refresh→retry flow. The monolithic draft `App.tsx` dissolves into router pages + small typed layout components. Foundation ships only `auth` + `layout`; feature areas follow in their own specs.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, motion, @tanstack/react-query, axios, zustand, react-router-dom v7, @phosphor-icons/react, Vitest + React Testing Library.

**Working directory for all commands:** `c:\Users\pc\Documents\Github Repos\githustle\client`

**Reference:** `docs/superpowers/specs/2026-07-27-githustle-frontend-foundation-design.md`

---

## Task 1: TypeScript + tooling conversion

**Files:**
- Create: `client/tsconfig.json`, `client/tsconfig.node.json`, `client/src/vite-env.d.ts`
- Modify: `client/vite.config.js` → `client/vite.config.ts`
- Modify: `client/package.json`
- Create: `client/vitest.config.ts`, `client/src/test/setup.ts`

- [ ] **Step 1: Install dependencies**

Run (in `client/`):
```
npm install @tailwindcss/vite@^4 tailwindcss@^4 motion @phosphor-icons/react @xyflow/react @dagrejs/dagre recharts
npm install -D typescript @types/react @types/react-dom vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom vite-tsconfig-paths
```
Expected: exits 0, packages added to `package.json`.

- [ ] **Step 2: Create `client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `client/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `client/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 5: Replace `vite.config.js` with `vite.config.ts`**

Delete `vite.config.js`. Create `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
});
```

- [ ] **Step 6: Create `client/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 7: Create `client/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 8: Update `package.json` scripts**

Set the `scripts` block to:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 9: Verify tooling boots**

Run: `npx tsc -b`
Expected: exits 0 (no type errors; project may have no TS files yet — that is fine).

- [ ] **Step 10: Commit**

```
git add client/tsconfig.json client/tsconfig.node.json client/vite.config.ts client/vitest.config.ts client/src/vite-env.d.ts client/src/test/setup.ts client/package.json
git rm client/vite.config.js
git commit -m "chore(client): convert to TypeScript + Tailwind v4 tooling"
```

---

## Task 2: Port the design system

**Files:**
- Create: `client/src/styles/index.css`
- Delete: `client/src/App.css`, `client/src/index.css` (old scaffold CSS)

- [ ] **Step 1: Create `client/src/styles/index.css`**

Copy the draft's tokens verbatim (source: `ui-draft/githustle/src/index.css`):
```css
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

@theme {
  --font-sans: "Inter", "Geist", system-ui, sans-serif;
  --font-serif: "Playfair Display", serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --color-gh-ink: #0F1923;
  --color-gh-ink2: #1E2D3D;
  --color-gh-teal: #0D9488;
  --color-gh-teal-hover: #0F766E;
  --color-gh-teal-light: #CCFBF1;
  --color-gh-amber: #D97706;
  --color-gh-amber-light: #FEF3C7;
  --color-gh-red: #DC2626;
  --color-gh-red-light: #FEE2E2;
  --color-gh-green: #16A34A;
  --color-gh-green-light: #DCFCE7;
  --color-gh-blue: #2563EB;
  --color-gh-blue-light: #DBEAFE;

  --color-surface-0: #F7FAFC;
  --color-surface-1: #FFFFFF;
  --color-border: #E2E8F0;

  --color-text-primary: #0F1923;
  --color-text-secondary: #4A5568;
  --color-text-muted: #8898AA;

  --shadow-card: 0 1px 3px rgba(15, 25, 35, 0.08), 0 1px 2px rgba(15, 25, 35, 0.04);
  --shadow-elevated: 0 4px 16px rgba(15, 25, 35, 0.12), 0 2px 4px rgba(15, 25, 35, 0.06);
  --shadow-diffuse: 0 20px 40px -15px rgba(0, 0, 0, 0.05);

  --color-status-pending: #D97706;
  --color-status-active: #0D9488;
  --color-status-approved: #16A34A;
  --color-status-overdue: #DC2626;
  --color-status-disputed: #7C3AED;

  --color-pro-gold: #B45309;
  --color-pro-gold-light: #FEF3C7;

  --color-bottom-nav: #1E2D3D;
  --height-bottom-nav: 64px;
  --height-topnav: 56px;

  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

body {
  font-family: var(--font-sans);
  background-color: #F7FAFC;
  color: #0F1923;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(24, 24, 27, 0.15); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(24, 24, 27, 0.3); }

.border-subtle { border-color: rgba(24, 24, 27, 0.08); }
.glass-panel { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(24, 24, 27, 0.06); }
.active-glow { box-shadow: 0 4px 20px rgba(15, 118, 110, 0.04); }
.transition-all-custom { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
(The React-Flow `.react-flow__*` overrides and `.gh-table*` rules from the draft are added by the Collaborative Workspace feature spec, not here.)

- [ ] **Step 2: Delete old scaffold CSS**

```
git rm client/src/App.css client/src/index.css
```
Expected: files removed.

- [ ] **Step 3: Commit**

```
git add client/src/styles/index.css
git commit -m "feat(client): port GitHustle design tokens"
```

---

## Task 3: Foundation types

**Files:**
- Create: `client/src/types/user.ts`
- Create: `client/src/types/auth.ts`
- Create: `client/src/types/api.ts`

- [ ] **Step 1: Create `client/src/types/user.ts`**

```ts
export type UserRole = 'client' | 'freelancer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  avatarUrl?: string;
}
```

- [ ] **Step 2: Create `client/src/types/auth.ts`**

```ts
import type { UserRole } from './user';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role: Exclude<UserRole, 'admin'>;
}

export interface ResetRequestPayload {
  email: string;
}

export interface ResetConfirmPayload {
  token: string;
  password: string;
}

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';
```

- [ ] **Step 3: Create `client/src/types/api.ts`**

```ts
export interface ApiError {
  message: string;
  code?: string;
  requestId?: string;
  fields?: Record<string, string>;
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc -b`
Expected: exits 0.

- [ ] **Step 5: Commit**

```
git add client/src/types
git commit -m "feat(client): add foundation user/auth/api types"
```

---

## Task 4: Correlation id utility + structured logger

**Files:**
- Create: `client/src/lib/logger/correlation.ts`
- Create: `client/src/lib/logger/logger.ts`
- Test: `client/src/lib/logger/logger.test.ts`

- [ ] **Step 1: Write the failing test `client/src/lib/logger/logger.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('emits the required structured fields', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info({ action: 'TEST_EVENT', message: 'hello', meta: { a: 1 } });
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).toMatchObject({ level: 'info', action: 'TEST_EVENT', message: 'hello' });
    expect(typeof arg.timestamp).toBe('string');
    expect('correlationId' in arg).toBe(true);
  });

  it('never emits secret keys', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn({ action: 'X', message: 'y', meta: { password: 'p', token: 't', ok: 1 } });
    const arg = spy.mock.calls[0][0] as { meta: Record<string, unknown> };
    expect(arg.meta.password).toBeUndefined();
    expect(arg.meta.token).toBeUndefined();
    expect(arg.meta.ok).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/logger/logger.test.ts`
Expected: FAIL — cannot find module `./logger`.

- [ ] **Step 3: Create `client/src/lib/logger/correlation.ts`**

```ts
const KEY = 'gh_correlation_id';

function makeId(): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2);
  return `corr_${rnd}`;
}

export function getCorrelationId(): string {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = makeId();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return makeId();
  }
}

export function setCorrelationId(id: string): void {
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    /* ignore storage errors */
  }
}
```

- [ ] **Step 4: Create `client/src/lib/logger/logger.ts`**

```ts
import { getCorrelationId } from './correlation';

type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogInput {
  action: string;
  message: string;
  meta?: Record<string, unknown>;
}

const SECRET_KEYS = new Set(['password', 'token', 'accessToken', 'refreshToken', 'authorization', 'cookie', 'secret']);

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = import.meta.env.DEV ? 'debug' : 'info';

function scrub(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SECRET_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function emit(level: Level, input: LogInput): void {
  if (ORDER[level] < ORDER[MIN_LEVEL]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId: getCorrelationId(),
    action: input.action,
    message: input.message,
    meta: scrub(input.meta),
  };
  const fn = level === 'debug' ? console.debug : console[level];
  fn(entry);
}

export const logger = {
  debug: (i: LogInput) => emit('debug', i),
  info: (i: LogInput) => emit('info', i),
  warn: (i: LogInput) => emit('warn', i),
  error: (i: LogInput) => emit('error', i),
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/logger/logger.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```
git add client/src/lib/logger
git commit -m "feat(client): structured browser logger with correlation ids"
```

---

## Task 5: Axios client + interceptors

**Files:**
- Create: `client/src/lib/api/client.ts`
- Test: `client/src/lib/api/client.test.ts`

- [ ] **Step 1: Write the failing test `client/src/lib/api/client.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient, __resetRefreshState } from './client';

describe('apiClient interceptors', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    __resetRefreshState();
  });

  it('attaches an X-Correlation-ID header to requests', async () => {
    mock.onGet('/ping').reply((config) => {
      expect(config.headers?.['X-Correlation-ID']).toBeTruthy();
      return [200, { ok: true }];
    });
    const res = await apiClient.get('/ping');
    expect(res.data.ok).toBe(true);
  });

  it('on 401 refreshes once then retries the original request', async () => {
    let calls = 0;
    mock.onGet('/secure').reply(() => {
      calls += 1;
      return calls === 1 ? [401] : [200, { ok: true }];
    });
    mock.onPost('/auth/refresh').reply(200, { ok: true });

    const res = await apiClient.get('/secure');
    expect(res.data.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('does not loop when refresh itself fails', async () => {
    mock.onGet('/secure').reply(401);
    mock.onPost('/auth/refresh').reply(401);
    await expect(apiClient.get('/secure')).rejects.toBeTruthy();
  });
});
```

Install the test dep first:
Run: `npm install -D axios-mock-adapter`
Expected: exits 0.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/api/client.test.ts`
Expected: FAIL — cannot find module `./client`.

- [ ] **Step 3: Create `client/src/lib/api/client.ts`**

```ts
import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getCorrelationId, setCorrelationId } from '@/lib/logger/correlation';
import { logger } from '@/lib/logger/logger';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean; _startedAt?: number };

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let refreshInFlight: Promise<void> | null = null;

export function __resetRefreshState(): void {
  refreshInFlight = null;
}

async function runRefresh(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = apiClient
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

apiClient.interceptors.request.use((config: RetriableConfig) => {
  config.headers.set('X-Correlation-ID', getCorrelationId());
  config._startedAt = Date.now();
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const cid = response.headers['x-correlation-id'];
    if (cid) setCorrelationId(cid);
    const cfg = response.config as RetriableConfig;
    const durationMs = cfg._startedAt ? Date.now() - cfg._startedAt : undefined;
    logger.info({
      action: 'HTTP_REQUEST',
      message: `${cfg.method?.toUpperCase()} ${cfg.url} -> ${response.status}`,
      meta: { method: cfg.method, path: cfg.url, statusCode: response.status, durationMs },
    });
    return response;
  },
  async (error: AxiosError) => {
    const cfg = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = cfg?.url?.includes('/auth/refresh');

    if (status === 401 && cfg && !cfg._retried && !isRefreshCall) {
      cfg._retried = true;
      try {
        await runRefresh();
        return apiClient(cfg);
      } catch {
        logger.warn({ action: 'SESSION_EXPIRED', message: 'Refresh failed; clearing session' });
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
        return Promise.reject(error);
      }
    }

    const level = status && status >= 500 ? 'error' : 'warn';
    logger[level]({
      action: 'HTTP_ERROR',
      message: `${cfg?.method?.toUpperCase()} ${cfg?.url} -> ${status ?? 'network'}`,
      meta: { method: cfg?.method, path: cfg?.url, statusCode: status },
    });
    return Promise.reject(error);
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/api/client.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```
git add client/src/lib/api/client.ts client/src/lib/api/client.test.ts client/package.json
git commit -m "feat(client): axios client with correlation id + 401 refresh-retry"
```

---

## Task 6: React Query client + key factory

**Files:**
- Create: `client/src/lib/query/queryClient.ts`
- Create: `client/src/lib/query/keys.ts`

- [ ] **Step 1: Create `client/src/lib/query/queryClient.ts`**

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 2: Create `client/src/lib/query/keys.ts`**

```ts
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
};
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc -b`
Expected: exits 0.

- [ ] **Step 4: Commit**

```
git add client/src/lib/query
git commit -m "feat(client): react-query client and key factory"
```

---

## Task 7: Auth API layer

**Files:**
- Create: `client/src/features/auth/api/auth.api.ts`

- [ ] **Step 1: Create `client/src/features/auth/api/auth.api.ts`**

```ts
import { apiClient } from '@/lib/api/client';
import type { User } from '@/types/user';
import type {
  LoginPayload,
  RegisterPayload,
  ResetRequestPayload,
  ResetConfirmPayload,
} from '@/types/auth';

export const authApi = {
  me: () => apiClient.get<{ user: User }>('/auth/me').then((r) => r.data.user),
  login: (p: LoginPayload) => apiClient.post<{ user: User }>('/auth/login', p).then((r) => r.data.user),
  register: (p: RegisterPayload) => apiClient.post('/auth/register', p).then((r) => r.data),
  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
  verifyEmail: (token: string) =>
    apiClient.get('/auth/verify-email', { params: { token } }).then((r) => r.data),
  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }).then((r) => r.data),
  requestReset: (p: ResetRequestPayload) => apiClient.post('/auth/password-reset', p).then((r) => r.data),
  confirmReset: (p: ResetConfirmPayload) =>
    apiClient.post('/auth/password-reset/confirm', p).then((r) => r.data),
};
```

> NOTE for implementer: the exact response envelope (`{ user }` vs `{ data: { user } }`) must be confirmed against `server/src/modules/auth/auth.controller.js` before wiring. Adjust the `.then` extraction to match; do not guess. If the server returns `{ data: { user } }`, extract `r.data.data.user`.

- [ ] **Step 2: Verify compile**

Run: `npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Commit**

```
git add client/src/features/auth/api/auth.api.ts
git commit -m "feat(client): auth API layer"
```

---

## Task 8: Zustand stores

**Files:**
- Create: `client/src/stores/ui.store.ts`
- Test: `client/src/stores/ui.store.test.ts`

- [ ] **Step 1: Write the failing test `client/src/stores/ui.store.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './ui.store';

describe('ui.store', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarCollapsed: false, mobileDrawerOpen: false, toasts: [] });
  });

  it('toggles the sidebar', () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('pushes and dismisses toasts', () => {
    const id = useUiStore.getState().pushToast('Saved');
    expect(useUiStore.getState().toasts).toHaveLength(1);
    useUiStore.getState().dismissToast(id);
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/ui.store.test.ts`
Expected: FAIL — cannot find module `./ui.store`.

- [ ] **Step 3: Create `client/src/stores/ui.store.ts`**

```ts
import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  variant: 'info' | 'success' | 'error';
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  setMobileDrawer: (open: boolean) => void;
  pushToast: (message: string, variant?: Toast['variant']) => string;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileDrawer: (open) => set({ mobileDrawerOpen: open }),
  pushToast: (message, variant = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/ui.store.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```
git add client/src/stores/ui.store.ts client/src/stores/ui.store.test.ts
git commit -m "feat(client): ui zustand store"
```

---

## Task 9: AuthProvider + useAuth

**Files:**
- Create: `client/src/features/auth/AuthProvider.tsx`
- Create: `client/src/features/auth/hooks/useAuth.ts`
- Test: `client/src/features/auth/AuthProvider.test.tsx`

- [ ] **Step 1: Write the failing test `client/src/features/auth/AuthProvider.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './hooks/useAuth';
import { authApi } from './api/auth.api';

vi.mock('./api/auth.api', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), register: vi.fn() },
}));

function Probe() {
  const { status, user } = useAuth();
  return <div>{status}:{user?.name ?? 'none'}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hydrates an authenticated session from /auth/me', async () => {
    (authApi.me as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '1', email: 'a@b.co', name: 'Ada', role: 'freelancer', emailVerified: true,
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('authenticated:Ada')).toBeInTheDocument());
  });

  it('falls back to anonymous when /auth/me rejects', async () => {
    (authApi.me as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('anonymous:none')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/auth/AuthProvider.test.tsx`
Expected: FAIL — cannot find module `./AuthProvider`.

- [ ] **Step 3: Create `client/src/features/auth/AuthProvider.tsx`**

```tsx
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@/types/user';
import type { LoginPayload, RegisterPayload, SessionStatus } from '@/types/auth';
import { authApi } from './api/auth.api';
import { logger } from '@/lib/logger/logger';

interface AuthContextValue {
  user: User | null;
  status: SessionStatus;
  role: User['role'] | null;
  login: (p: LoginPayload) => Promise<void>;
  register: (p: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  const hydrate = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const login = useCallback(async (p: LoginPayload) => {
    const me = await authApi.login(p);
    setUser(me);
    setStatus('authenticated');
    logger.info({ action: 'LOGIN_SUCCESS', message: 'User logged in', meta: { userId: me.id } });
  }, []);

  const register = useCallback(async (p: RegisterPayload) => {
    await authApi.register(p);
    logger.info({ action: 'REGISTER_SUBMITTED', message: 'Registration submitted' });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('anonymous');
    logger.info({ action: 'LOGOUT', message: 'User logged out' });
  }, []);

  const value: AuthContextValue = {
    user,
    status,
    role: user?.role ?? null,
    login,
    register,
    logout,
    refetch: hydrate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 4: Create `client/src/features/auth/hooks/useAuth.ts`**

```ts
import { useContext } from 'react';
import { AuthContext } from '../AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/auth/AuthProvider.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```
git add client/src/features/auth/AuthProvider.tsx client/src/features/auth/hooks/useAuth.ts client/src/features/auth/AuthProvider.test.tsx
git commit -m "feat(client): AuthProvider + useAuth session hydration"
```

---

## Task 10: Route guards

**Files:**
- Create: `client/src/app/ProtectedRoute.tsx`
- Create: `client/src/app/RoleRoute.tsx`
- Test: `client/src/app/ProtectedRoute.test.tsx`

- [ ] **Step 1: Write the failing test `client/src/app/ProtectedRoute.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthContext } from '@/features/auth/AuthProvider';
import type { SessionStatus } from '@/types/auth';
import type { User } from '@/types/user';

function withAuth(status: SessionStatus, user: User | null, initial = '/hub') {
  return render(
    <AuthContext.Provider
      value={{
        user, status, role: user?.role ?? null,
        login: async () => {}, register: async () => {}, logout: async () => {}, refetch: async () => {},
      }}
    >
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/hub" element={<div>HUB</div>} />
          </Route>
          <Route path="/login" element={<div>LOGIN</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    withAuth('authenticated', { id: '1', email: 'a@b.co', name: 'A', role: 'client', emailVerified: true });
    expect(screen.getByText('HUB')).toBeInTheDocument();
  });

  it('redirects to /login when anonymous', () => {
    withAuth('anonymous', null);
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/ProtectedRoute.test.tsx`
Expected: FAIL — cannot find module `./ProtectedRoute`.

- [ ] **Step 3: Create `client/src/app/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div className="grid min-h-[100dvh] place-items-center text-text-muted">Loading…</div>;
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
```

- [ ] **Step 4: Create `client/src/app/RoleRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { UserRole } from '@/types/user';

export function RoleRoute({ role }: { role: UserRole }) {
  const { role: current, status } = useAuth();
  if (status === 'loading') return null;
  if (current !== role) return <Navigate to="/hub" replace />;
  return <Outlet />;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/app/ProtectedRoute.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```
git add client/src/app/ProtectedRoute.tsx client/src/app/RoleRoute.tsx client/src/app/ProtectedRoute.test.tsx
git commit -m "feat(client): protected + role route guards"
```

---

## Task 11: Layout — NavItem + Sidebar

**Files:**
- Create: `client/src/features/layout/NavItem.tsx`
- Create: `client/src/features/layout/navConfig.ts`
- Create: `client/src/features/layout/Sidebar.tsx`
- Test: `client/src/features/layout/Sidebar.test.tsx`

- [ ] **Step 1: Create `client/src/features/layout/navConfig.ts`**

```ts
import { Compass, ChatTeardropText, Notebook, Database, Lightning, BookmarkSimple, UserCircle, CrownSimple, Question, GearSix, type Icon } from '@phosphor-icons/react';

export interface NavEntry {
  to: string;
  label: string;
  icon: Icon;
  adminOnly?: boolean;
}

export const primaryNav: NavEntry[] = [
  { to: '/hub', label: 'Public Hub', icon: Compass },
  { to: '/conversations', label: 'Conversations', icon: ChatTeardropText },
  { to: '/personal', label: 'Personal Space', icon: Notebook },
  { to: '/live', label: 'Live Workspaces', icon: Lightning },
  { to: '/saved', label: 'Saved Posts', icon: BookmarkSimple },
  { to: '/admin', label: 'Admin Desk', icon: Database, adminOnly: true },
];

export const utilityNav: NavEntry[] = [
  { to: '/profile', label: 'Profile', icon: UserCircle },
  { to: '/premium', label: 'Premium', icon: CrownSimple },
  { to: '/help', label: 'Help', icon: Question },
  { to: '/settings', label: 'Settings', icon: GearSix },
];
```

- [ ] **Step 2: Create `client/src/features/layout/NavItem.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import type { Icon } from '@phosphor-icons/react';

interface NavItemProps {
  to: string;
  label: string;
  icon: Icon;
  collapsed: boolean;
  onNavigate?: () => void;
}

export function NavItem({ to, label, icon: IconCmp, collapsed, onNavigate }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 px-3 py-2 rounded-md font-sans font-medium text-xs tracking-wide transition cursor-pointer ${
          isActive
            ? 'bg-gh-teal/15 border-l-2 border-gh-teal text-gh-teal-light font-semibold'
            : 'text-white/65 hover:text-white hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <IconCmp size={18} weight={isActive ? 'bold' : 'regular'} className={isActive ? 'text-gh-teal' : 'text-white/50'} />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );
}
```

- [ ] **Step 3: Write the failing test `client/src/features/layout/Sidebar.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('marks the current route active', () => {
    render(
      <MemoryRouter initialEntries={['/personal']}>
        <Sidebar role="freelancer" />
      </MemoryRouter>,
    );
    const active = screen.getByRole('link', { name: /Personal Space/i });
    expect(active.className).toMatch(/border-gh-teal/);
  });

  it('hides admin-only nav for non-admins', () => {
    render(
      <MemoryRouter initialEntries={['/hub']}>
        <Sidebar role="freelancer" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Admin Desk/i })).toBeNull();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/features/layout/Sidebar.test.tsx`
Expected: FAIL — cannot find module `./Sidebar`.

- [ ] **Step 5: Create `client/src/features/layout/Sidebar.tsx`**

```tsx
import { CaretRight } from '@phosphor-icons/react';
import { useUiStore } from '@/stores/ui.store';
import type { UserRole } from '@/types/user';
import { NavItem } from './NavItem';
import { primaryNav, utilityNav } from './navConfig';

export function Sidebar({ role }: { role: UserRole }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const items = primaryNav.filter((n) => !n.adminOnly || role === 'admin');

  return (
    <aside className={`hidden lg:flex flex-col shrink-0 bg-gh-ink2 border-r border-white/5 text-white/90 transition-all duration-300 ${collapsed ? 'w-14' : 'w-56'}`}>
      <div className="p-3 flex justify-between items-center border-b border-white/5">
        {!collapsed && <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-white/30">Workspace Menu</span>}
        <button onClick={toggle} aria-label="Toggle sidebar" className="p-1 text-white/40 hover:text-white rounded hover:bg-white/5 ml-auto cursor-pointer">
          <CaretRight size={14} className={`transform transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {items.map((n) => <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} collapsed={collapsed} />)}
        <div className="my-2 mx-2 border-t border-white/5" />
        {utilityNav.map((n) => <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} collapsed={collapsed} />)}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/features/layout/Sidebar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```
git add client/src/features/layout/NavItem.tsx client/src/features/layout/navConfig.ts client/src/features/layout/Sidebar.tsx client/src/features/layout/Sidebar.test.tsx
git commit -m "feat(client): sidebar + nav items with route-driven active state"
```

---

## Task 12: Layout — Toast + ToastHost

**Files:**
- Create: `client/src/features/layout/Toast.tsx`
- Create: `client/src/features/layout/ToastHost.tsx`

- [ ] **Step 1: Create `client/src/features/layout/Toast.tsx`**

```tsx
import { useEffect } from 'react';
import { motion } from 'motion/react';
import type { Toast as ToastType } from '@/stores/ui.store';

export function Toast({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const color =
    toast.variant === 'error' ? 'bg-gh-red' : toast.variant === 'success' ? 'bg-gh-green' : 'bg-gh-ink2';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className={`${color} text-white text-xs font-sans px-4 py-2.5 rounded-lg shadow-elevated`}
    >
      {toast.message}
    </motion.div>
  );
}
```

- [ ] **Step 2: Create `client/src/features/layout/ToastHost.tsx`**

```tsx
import { AnimatePresence } from 'motion/react';
import { useUiStore } from '@/stores/ui.store';
import { Toast } from './Toast';

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={dismiss} />)}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc -b`
Expected: exits 0.

- [ ] **Step 4: Commit**

```
git add client/src/features/layout/Toast.tsx client/src/features/layout/ToastHost.tsx
git commit -m "feat(client): toast host with aria-live and motion"
```

---

## Task 13: Layout — TopNav, MobileDrawer, ProfileMenu, AppShell

**Files:**
- Create: `client/src/features/layout/ProfileMenu.tsx`
- Create: `client/src/features/layout/MobileDrawer.tsx`
- Create: `client/src/features/layout/TopNav.tsx`
- Create: `client/src/features/layout/AppShell.tsx`

- [ ] **Step 1: Create `client/src/features/layout/ProfileMenu.tsx`**

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const initials = (user?.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open profile menu"
        className="w-8 h-8 rounded-full bg-gh-teal flex items-center justify-center font-bold text-xs cursor-pointer text-white border border-white/10"
      >
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-lg shadow-elevated py-1 text-xs text-text-primary z-50 font-sans"
          >
            <div className="p-3 border-b border-border">
              <p className="font-semibold">{user?.name}</p>
              <p className="text-[10px] text-text-muted mt-0.5 capitalize">{user?.role}</p>
            </div>
            <div className="p-1">
              <button onClick={() => { navigate('/profile'); setOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-0 rounded transition font-bold text-gh-teal">View Profile</button>
              <button onClick={() => { void logout(); setOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-0 rounded text-gh-red transition">Sign Out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/features/layout/MobileDrawer.tsx`**

```tsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { useUiStore } from '@/stores/ui.store';
import type { UserRole } from '@/types/user';
import { NavItem } from './NavItem';
import { primaryNav, utilityNav } from './navConfig';

export function MobileDrawer({ role }: { role: UserRole }) {
  const open = useUiStore((s) => s.mobileDrawerOpen);
  const setOpen = useUiStore((s) => s.setMobileDrawer);
  const location = useLocation();
  const items = primaryNav.filter((n) => !n.adminOnly || role === 'admin');

  useEffect(() => { setOpen(false); }, [location.pathname, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 bg-black z-40 lg:hidden" />
          <motion.aside
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 bottom-0 left-0 w-64 bg-gh-ink2 text-white z-50 p-4 flex flex-col gap-4 lg:hidden overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="font-sans font-semibold text-sm">GitHustle</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-1">
              {items.map((n) => <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} collapsed={false} onNavigate={() => setOpen(false)} />)}
              <div className="my-2 border-t border-white/10" />
              {utilityNav.map((n) => <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} collapsed={false} onNavigate={() => setOpen(false)} />)}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Create `client/src/features/layout/TopNav.tsx`**

```tsx
import { List, MagnifyingGlass, Bell } from '@phosphor-icons/react';
import { useUiStore } from '@/stores/ui.store';
import { ProfileMenu } from './ProfileMenu';

export function TopNav() {
  const setDrawer = useUiStore((s) => s.setMobileDrawer);
  const drawerOpen = useUiStore((s) => s.mobileDrawerOpen);
  return (
    <header className="h-[56px] bg-gh-ink border-b border-white/5 text-white sticky top-0 z-50 shrink-0">
      <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawer(!drawerOpen)} className="lg:hidden text-white/80 hover:text-white p-1 rounded transition cursor-pointer" aria-label="Toggle menu">
            <List size={22} weight="bold" />
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sans font-semibold text-lg tracking-tight">Git</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gh-teal" />
            <span className="font-sans font-light text-lg tracking-tight text-white/90">Hustle</span>
          </div>
        </div>
        <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
          <input type="text" placeholder="Search contracts, skills, docs..." className="w-full text-xs font-sans pl-9 pr-3 py-1.5 bg-white/8 border border-white/10 rounded-md placeholder-white/40 text-white focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal transition" />
          <MagnifyingGlass size={16} className="text-white/40 absolute left-3 top-2.5" />
        </div>
        <div className="flex items-center gap-4">
          <button className="relative cursor-pointer group" aria-label="Notifications">
            <Bell size={20} className="text-white/70 group-hover:text-white transition" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gh-red rounded-full" />
          </button>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create `client/src/features/layout/AppShell.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';
import { ToastHost } from './ToastHost';

export function AppShell() {
  const { role } = useAuth();
  const activeRole = role ?? 'freelancer';
  return (
    <div className="min-h-[100dvh] bg-surface-0 text-text-primary flex flex-col font-sans overflow-x-hidden antialiased">
      <TopNav />
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar role={activeRole} />
        <MobileDrawer role={activeRole} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  );
}
```

- [ ] **Step 5: Verify compile**

Run: `npx tsc -b`
Expected: exits 0.

- [ ] **Step 6: Commit**

```
git add client/src/features/layout/ProfileMenu.tsx client/src/features/layout/MobileDrawer.tsx client/src/features/layout/TopNav.tsx client/src/features/layout/AppShell.tsx
git commit -m "feat(client): topnav, mobile drawer, profile menu, app shell"
```

---

## Task 14: Auth pages + components

**Files:**
- Create: `client/src/features/auth/components/{AuthCard,PasswordField,RoleSelect}.tsx`
- Create: `client/src/features/auth/pages/{LoginPage,RegisterPage,VerifyEmailPage,ForgotPasswordPage,ResetPasswordPage}.tsx`
- Test: `client/src/features/auth/pages/LoginPage.test.tsx`

- [ ] **Step 1: Create `client/src/features/auth/components/AuthCard.tsx`**

```tsx
import type { ReactNode } from 'react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] grid place-items-center bg-gh-ink px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-elevated p-8">
        <div className="flex items-center gap-1 mb-6">
          <span className="font-sans font-semibold text-lg tracking-tight text-gh-ink">Git</span>
          <span className="w-1.5 h-1.5 rounded-full bg-gh-teal" />
          <span className="font-sans font-light text-lg tracking-tight text-gh-ink">Hustle</span>
        </div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/features/auth/components/PasswordField.tsx`**

```tsx
import { useState, forwardRef, type InputHTMLAttributes } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, Props>(({ label, error, id, ...rest }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold text-text-secondary">{label}</label>
      <div className="relative">
        <input ref={ref} id={id} type={show ? 'text' : 'password'} className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...rest} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-2 text-text-muted">
          {show ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-xs text-gh-red">{error}</p>}
    </div>
  );
});
PasswordField.displayName = 'PasswordField';
```

- [ ] **Step 3: Create `client/src/features/auth/components/RoleSelect.tsx`**

```tsx
import type { UserRole } from '@/types/user';

type SelectableRole = Exclude<UserRole, 'admin'>;

export function RoleSelect({ value, onChange }: { value: SelectableRole; onChange: (r: SelectableRole) => void }) {
  const roles: { id: SelectableRole; label: string; desc: string }[] = [
    { id: 'freelancer', label: 'Freelancer', desc: 'I offer services' },
    { id: 'client', label: 'Client', desc: 'I hire talent' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {roles.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={`text-left p-3 rounded-md border transition cursor-pointer ${value === r.id ? 'border-gh-teal bg-gh-teal/5' : 'border-border hover:border-gh-teal/50'}`}
        >
          <p className="text-sm font-semibold text-text-primary">{r.label}</p>
          <p className="text-[11px] text-text-muted">{r.desc}</p>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `client/src/features/auth/pages/LoginPage.tsx`**

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { useAuth } from '../hooks/useAuth';
import type { LoginPayload } from '@/types/auth';
import type { ApiError } from '@/types/api';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setFocus, formState: { errors, isSubmitting } } = useForm<LoginPayload>();

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await login(data);
      const to = (location.state as { from?: string } | null)?.from ?? '/hub';
      navigate(to, { replace: true });
    } catch (e) {
      const err = e as AxiosError<ApiError>;
      setFormError(err.response?.data?.message ?? 'Login failed. Check your credentials and try again.');
      setFocus('email');
    }
  });

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your GitHustle account">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs font-semibold text-text-secondary">Email</label>
          <input id="email" type="email" autoComplete="email" className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...register('email', { required: 'Email is required' })} />
          {errors.email && <p className="text-xs text-gh-red">{errors.email.message}</p>}
        </div>
        <PasswordField id="password" label="Password" autoComplete="current-password" error={errors.password?.message} {...register('password', { required: 'Password is required' })} />
        {formError && <p role="alert" className="text-xs text-gh-red">{formError}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full bg-gh-teal hover:bg-gh-teal-hover text-white text-sm font-semibold py-2.5 rounded-md transition active:scale-[0.98] disabled:opacity-50">
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
        <div className="flex justify-between text-xs text-text-muted">
          <Link to="/forgot-password" className="hover:text-gh-teal">Forgot password?</Link>
          <Link to="/register" className="hover:text-gh-teal">Create account</Link>
        </div>
      </form>
    </AuthCard>
  );
}
```

- [ ] **Step 5: Create `client/src/features/auth/pages/RegisterPage.tsx`**

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { useAuth } from '../hooks/useAuth';
import type { RegisterPayload } from '@/types/auth';
import type { ApiError } from '@/types/api';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import { RoleSelect } from '../components/RoleSelect';

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<RegisterPayload['role']>('freelancer');
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Omit<RegisterPayload, 'role'>>();

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await registerUser({ ...data, role });
      navigate('/verify-email', { replace: true });
    } catch (e) {
      const err = e as AxiosError<ApiError>;
      setFormError(err.response?.data?.message ?? 'Registration failed. Try again.');
    }
  });

  return (
    <AuthCard title="Create your account" subtitle="Join GitHustle">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <RoleSelect value={role} onChange={setRole} />
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-xs font-semibold text-text-secondary">Full name</label>
          <input id="name" autoComplete="name" className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...register('name', { required: 'Name is required' })} />
          {errors.name && <p className="text-xs text-gh-red">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs font-semibold text-text-secondary">Email</label>
          <input id="email" type="email" autoComplete="email" className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...register('email', { required: 'Email is required' })} />
          {errors.email && <p className="text-xs text-gh-red">{errors.email.message}</p>}
        </div>
        <PasswordField id="password" label="Password" autoComplete="new-password" error={errors.password?.message} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
        {formError && <p role="alert" className="text-xs text-gh-red">{formError}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full bg-gh-teal hover:bg-gh-teal-hover text-white text-sm font-semibold py-2.5 rounded-md transition active:scale-[0.98] disabled:opacity-50">
          {isSubmitting ? 'Creating…' : 'Create Account'}
        </button>
        <p className="text-xs text-text-muted text-center">Already have an account? <Link to="/login" className="text-gh-teal">Sign in</Link></p>
      </form>
    </AuthCard>
  );
}
```

- [ ] **Step 6: Create `client/src/features/auth/pages/VerifyEmailPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { AuthCard } from '../components/AuthCard';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'idle' | 'verifying' | 'ok' | 'error'>(token ? 'verifying' : 'idle');

  useEffect(() => {
    if (!token) return;
    authApi.verifyEmail(token).then(() => setState('ok')).catch(() => setState('error'));
  }, [token]);

  return (
    <AuthCard title="Verify your email" subtitle={token ? undefined : 'Check your inbox for a verification link.'}>
      {state === 'verifying' && <p className="text-sm text-text-secondary">Verifying…</p>}
      {state === 'ok' && <p className="text-sm text-gh-green">Email verified. <Link to="/login" className="text-gh-teal">Sign in</Link></p>}
      {state === 'error' && <p className="text-sm text-gh-red">Verification link is invalid or expired.</p>}
      {state === 'idle' && <Link to="/login" className="text-sm text-gh-teal">Back to sign in</Link>}
    </AuthCard>
  );
}
```

- [ ] **Step 7: Create `client/src/features/auth/pages/ForgotPasswordPage.tsx`**

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import type { ResetRequestPayload } from '@/types/auth';
import { AuthCard } from '../components/AuthCard';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetRequestPayload>();
  const onSubmit = handleSubmit(async (data) => { await authApi.requestReset(data).catch(() => {}); setSent(true); });

  return (
    <AuthCard title="Reset password" subtitle="We'll email you a reset link">
      {sent ? (
        <p className="text-sm text-gh-green">If an account exists for that email, a reset link is on its way. <Link to="/login" className="text-gh-teal">Back to sign in</Link></p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-semibold text-text-secondary">Email</label>
            <input id="email" type="email" autoComplete="email" className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...register('email', { required: 'Email is required' })} />
            {errors.email && <p className="text-xs text-gh-red">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-gh-teal hover:bg-gh-teal-hover text-white text-sm font-semibold py-2.5 rounded-md transition active:scale-[0.98] disabled:opacity-50">
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
```

- [ ] **Step 8: Create `client/src/features/auth/pages/ResetPasswordPage.tsx`**

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ password: string }>();

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await authApi.confirmReset({ token, password });
      navigate('/login', { replace: true });
    } catch {
      setFormError('Reset link is invalid or expired.');
    }
  });

  return (
    <AuthCard title="Set a new password">
      {!token ? (
        <p className="text-sm text-gh-red">Missing reset token. <Link to="/forgot-password" className="text-gh-teal">Request a new link</Link></p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <PasswordField id="password" label="New password" autoComplete="new-password" error={errors.password?.message} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
          {formError && <p role="alert" className="text-xs text-gh-red">{formError}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full bg-gh-teal hover:bg-gh-teal-hover text-white text-sm font-semibold py-2.5 rounded-md transition active:scale-[0.98] disabled:opacity-50">
            {isSubmitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
```

- [ ] **Step 9: Write the failing test `client/src/features/auth/pages/LoginPage.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthContext } from '../AuthProvider';

function renderLogin(login = vi.fn()) {
  return render(
    <AuthContext.Provider value={{ user: null, status: 'anonymous', role: null, login, register: async () => {}, logout: async () => {}, refetch: async () => {} }}>
      <MemoryRouter><LoginPage /></MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('LoginPage', () => {
  it('shows validation errors when submitting empty', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('calls login with entered credentials', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    renderLogin(login);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret12' });
  });
});
```

- [ ] **Step 10: Run the auth page test**

Run: `npx vitest run src/features/auth/pages/LoginPage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 11: Commit**

```
git add client/src/features/auth/components client/src/features/auth/pages
git commit -m "feat(client): auth pages (login, register, verify, reset)"
```

---

## Task 15: Error boundary + placeholder route pages

**Files:**
- Create: `client/src/app/ErrorBoundary.tsx`
- Create: `client/src/features/layout/PlaceholderPage.tsx`

- [ ] **Step 1: Create `client/src/app/ErrorBoundary.tsx`**

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/lib/logger/logger';

interface State { hasError: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error({ action: 'UI_CRASH', message: error.message, meta: { stack: error.stack, componentStack: info.componentStack } });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-[100dvh] place-items-center bg-surface-0 px-4 text-center">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Something went wrong</h1>
            <p className="text-sm text-text-secondary mt-1">Please reload the page.</p>
            <button onClick={() => window.location.reload()} className="mt-4 bg-gh-teal text-white text-sm font-semibold px-4 py-2 rounded-md active:scale-[0.98]">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Create `client/src/features/layout/PlaceholderPage.tsx`**

```tsx
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center py-24">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      <p className="text-sm text-text-muted mt-2">This area ships in its own feature spec.</p>
    </div>
  );
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc -b`
Expected: exits 0.

- [ ] **Step 4: Commit**

```
git add client/src/app/ErrorBoundary.tsx client/src/features/layout/PlaceholderPage.tsx
git commit -m "feat(client): error boundary + placeholder pages"
```

---

## Task 16: Router, providers, App, main

**Files:**
- Create: `client/src/app/router.tsx`
- Create: `client/src/app/providers.tsx`
- Modify: `client/src/App.tsx` (replace scaffold)
- Modify: `client/src/main.tsx` (rename from `main.jsx`, wire providers + styles)
- Delete: `client/src/main.jsx`

- [ ] **Step 1: Create `client/src/app/router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { AppShell } from '@/features/layout/AppShell';
import { PlaceholderPage } from '@/features/layout/PlaceholderPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/hub" replace /> },
          { path: '/hub', element: <PlaceholderPage title="Public Hub" /> },
          { path: '/conversations', element: <PlaceholderPage title="Conversations" /> },
          { path: '/personal', element: <PlaceholderPage title="Personal Space" /> },
          { path: '/live', element: <PlaceholderPage title="Live Workspaces" /> },
          { path: '/saved', element: <PlaceholderPage title="Saved Posts" /> },
          { path: '/profile', element: <PlaceholderPage title="Profile" /> },
          { path: '/premium', element: <PlaceholderPage title="Premium" /> },
          { path: '/help', element: <PlaceholderPage title="Help" /> },
          { path: '/settings', element: <PlaceholderPage title="Settings" /> },
          {
            element: <RoleRoute role="admin" />,
            children: [{ path: '/admin', element: <PlaceholderPage title="Admin Desk" /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/hub" replace /> },
]);
```

- [ ] **Step 2: Create `client/src/app/providers.tsx`**

```tsx
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/queryClient';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ErrorBoundary } from './ErrorBoundary';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 3: Replace `client/src/App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { router } from './app/router';

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
```
> NOTE: If a scaffold `App.jsx` exists, remove it: `git rm client/src/App.jsx`.

- [ ] **Step 4: Create `client/src/main.tsx` and remove `main.jsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```
Then: `git rm client/src/main.jsx` and update `client/index.html` script tag to `src="/src/main.tsx"`.

- [ ] **Step 5: Full type + build check**

Run: `npx tsc -b && npm run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```
git add client/src/app/router.tsx client/src/app/providers.tsx client/src/App.tsx client/src/main.tsx client/index.html
git commit -m "feat(client): wire router, providers, and app entry"
```

---

## Task 17: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass (logger, api client, ui store, AuthProvider, ProtectedRoute, Sidebar, LoginPage). Record the pass count.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: exits 0, `dist/` produced.

- [ ] **Step 3: Manual smoke check (requires server running)**

Start the dev server (`npm run dev`) and, with the API up, verify: `/login` renders, a seeded login lands on `/hub` inside the shell, the sidebar highlights the active route, the mobile drawer springs in under `lg`, an invalid login shows an inline error, and logout returns to `/login`. Confirm the browser network tab shows `X-Correlation-ID` on requests and structured logs in the console.

- [ ] **Step 4: Verification checklist against the design spec**

Re-read `docs/superpowers/specs/2026-07-27-githustle-frontend-foundation-design.md` §2 Success Criteria and confirm each line item is met. Note any gaps rather than claiming done.

- [ ] **Step 5: Commit any fixes**

```
git add -A
git commit -m "test(client): foundation verification pass"
```
