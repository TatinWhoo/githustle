# GitHustle Server Security Reference

> **Scope:** `server/src/` — Express 5, Node.js, Postgres, Redis, nginx reverse proxy.
> References: Requirements 2.5, 10.5, 18.1

---

## Threat Model

### Trust Boundaries

| Boundary | Direction | Trust level |
|---|---|---|
| Internet → nginx (port 443) | Inbound | Untrusted |
| nginx → Express API (port 4000) | Inbound | Trusted (one hop) |
| Express → Postgres | Outbound | Trusted, TLS, least-privilege role |
| Express → Redis | Outbound | Trusted, TLS (`rediss://`), password |
| Browser → Socket.IO (via nginx) | Inbound | Untrusted until authenticated |

### Attacker Profiles

**External unauthenticated attacker** — Credential stuffing, brute-force, enumeration via timing, CORS bypass, upload exploit.

**Authenticated user** — Privilege escalation, IDOR, injection via user-controlled fields, token replay, token theft.

**Supply-chain / dependency** — Malicious packages, compromised base image.

**Insider / compromised secret** — Leaked `.env`, rotated credential not replaced.

### Assets

- User credentials (password hashes, refresh tokens)
- Access tokens (15-min JWTs)
- API keys (`RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`)
- Database and Redis connection strings
- User-uploaded files

### Out of Scope (this spec)

- CSRF double-submit tokens (requires client changes)
- CSP `nonce` per page
- Client-side origin binding beyond CORS
- DDoS mitigation at network layer (handled upstream)

---

## Authentication

### Token architecture

| Token | Algorithm | Lifetime | Transport |
|---|---|---|---|
| Access token | HS256 | 15 min | `Authorization: Bearer` header |
| Refresh token | 32-byte CSPRNG, SHA-256 stored | `REFRESH_TOKEN_EXPIRES_IN_DAYS` | `HttpOnly; Secure; SameSite=Strict` cookie, path `/api/v1/auth` |

### JWT claims required

`iss`, `aud`, `iat`, `exp`, `sub`, `jti`. Any token missing a claim or with an unrecognised `alg` is rejected. `exp - iat` must be ≤ 900 seconds.

### JWT rotation (zero-downtime)

1. Generate new secret (≥ 32 bytes).
2. Set `JWT_PREVIOUS_ACCESS_SECRET` = old value of `JWT_ACCESS_SECRET`.
3. Set `JWT_PREVIOUS_SECRET_ROTATED_AT` = current UTC timestamp (ISO-8601).
4. Set `JWT_ACCESS_SECRET` = new secret.
5. Redeploy. Server accepts tokens signed by either secret while `JWT_PREVIOUS_SECRET_ROTATED_AT` is within `JWT_PREVIOUS_SECRET_GRACE_MINUTES` (default 60) of now.
6. After the grace window expires, clear `JWT_PREVIOUS_ACCESS_SECRET` and `JWT_PREVIOUS_SECRET_ROTATED_AT`.

### Auth provider selection

`AUTH_PROVIDER=local` — `LocalJwtProvider` (current).
`AUTH_PROVIDER=clerk` — `ClerkProvider` (future, see [Clerk Migration Plan](#clerk-migration-plan)).
Set in environment; registry lives in `server/src/modules/auth/auth-provider.js`.

### Account lockout

After `LOGIN_MAX_ATTEMPTS` (default 5) consecutive failures the account locks for `LOGIN_LOCKOUT_MINUTES` (default 15). HTTP 423 is returned for all subsequent attempts, correct password or not, until `locked_until` passes.

### Password policy

Minimum length 12, must contain uppercase, lowercase, digit, and non-alphanumeric character. Must not appear in the 10,000-entry curated list at `server/src/modules/auth/common-passwords.txt`. bcrypt cost ≥ 12 in production.

### Timing-safe login

Unknown-email and wrong-password paths take the same wall-clock time (200 ms ± 50 ms budget via constant-time bcrypt dummy compare). Both return HTTP 401 with identical body.

### Refresh token family

- Each login issues a new `Token_Family` (UUID).
- Every successful refresh revokes the presented token and issues a new one in the same family.
- Presenting a revoked or rotated token triggers full-family revocation and records a `refresh_token_reuse_detected` security event.
- Logout revokes the entire current family.
- Password change revokes every family for the user.

---

## Rate Limits

All limits use a Redis-backed store (`rate-limit-redis`) in production so they apply across all API processes. Client IP is derived from the leftmost `X-Forwarded-For` hop bounded by `TRUSTED_PROXY_DEPTH` (default 1).

On limit breach: HTTP 429 with `Retry-After` header (seconds to reset) and body:

```json
{
  "status": "error",
  "message": "Too many requests. Please try again later.",
  "code": "RATE_LIMITED",
  "requestId": "<Correlation_ID>"
}
```

### Limit table

| Route / scope | Window | Max requests | Key |
|---|---|---|---|
| Global — every `GET\|POST\|PATCH\|PUT\|DELETE` under `/api/v1/` | 15 min | 300 | Per IP |
| `POST /api/v1/auth/login` | 15 min | 10 | Per IP |
| `POST /api/v1/auth/login` | 15 min | 5 | Per email |
| `POST /api/v1/auth/register` | 60 min | 5 | Per IP |
| `POST /api/v1/auth/password-reset` | 60 min | 3 | Per IP |
| `POST /api/v1/auth/password-reset` | 60 min | 3 | Per email |
| `POST /api/v1/auth/refresh` | 15 min | 60 | Per IP |
| Authenticated requests — any `/api/v1/` route with valid `req.user.id` | 1 min | 120 | Per user ID |
| Unauthenticated requests — any `/api/v1/` route without `req.user` | 1 min | 120 | Per IP |

Notes:
- Login runs two limiters in sequence (IP then email); whichever trips first returns 429.
- Password-reset runs two limiters in sequence (IP then email); same first-to-trip rule.
- The global 300/15min applies to all requests regardless of authentication state.
- The unauthenticated 120/min is additional to the global limit.
- Every limit breach on an auth route records a `rate_limit_exceeded` security event.

---

## HTTP Headers

All headers below are set by Express middleware (`server/src/middleware/securityHeaders.js`) and mirrored in nginx so removing the proxy does not weaken security.

### Header table

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-site` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'` |
| `X-Powered-By` | **removed** (never sent) |

### Upload route exception

Responses from `/uploads/*` override `Cross-Origin-Resource-Policy` to `cross-origin` and add `Content-Disposition: inline`.

---

## Secret Rotation

### Secret inventory

| Variable | Purpose | Classification |
|---|---|---|
| `JWT_ACCESS_SECRET` | Signs / verifies access tokens | Secret |
| `DATABASE_URL` (password component) | Postgres connection | Secret |
| `REDIS_URL` (password component) | Redis connection | Secret |
| `RESEND_API_KEY` | Transactional email via Resend | Secret |
| `ANTHROPIC_API_KEY` | AI features via Anthropic | Secret |
| `SENTRY_DSN` | Error reporting (contains project key) | Secret |

### Per-secret rotation steps

#### `JWT_ACCESS_SECRET`

Zero-downtime rotation using the grace-window mechanism described in [Authentication](#authentication).

```bash
# 1. Generate a new secret
openssl rand -base64 48

# 2. Update environment (keep old value as previous)
JWT_PREVIOUS_ACCESS_SECRET=<old_JWT_ACCESS_SECRET>
JWT_PREVIOUS_SECRET_ROTATED_AT=<current_ISO-8601_timestamp>
JWT_ACCESS_SECRET=<new_secret>

# 3. Redeploy (rolling deploy supported — grace window keeps old tokens valid)

# 4. After JWT_PREVIOUS_SECRET_GRACE_MINUTES (default 60 min) clear the previous vars
JWT_PREVIOUS_ACCESS_SECRET=
JWT_PREVIOUS_SECRET_ROTATED_AT=
```

Action: All active user sessions remain valid during the grace window. No forced logout.

#### `DATABASE_URL` password

```bash
# 1. In Postgres, create a new password for the app role
ALTER USER githustle_app PASSWORD '<new_password>';

# 2. Update DATABASE_URL in your secrets store / env file
DATABASE_URL=postgres://githustle_app:<new_password>@host:5432/githustle

# 3. Redeploy — pg pool reconnects on next checkout

# 4. Verify connectivity, then revoke the old password if it was shared
# (Postgres does not have a built-in old-password concept; step 3 is atomic)
```

#### `REDIS_URL` password

```bash
# 1. Set the new password in Redis ACL or requirepass
# Redis 6+ ACL:
redis-cli ACL SETUSER default on ><new_password> ~* +@all
# Legacy requirepass (restart required):
# requirepass <new_password>

# 2. Update REDIS_URL in secrets store
REDIS_URL=rediss://:<new_password>@host:6380

# 3. Redeploy — rate-limit-redis and ioredis reconnect automatically
```

#### `RESEND_API_KEY`

```bash
# 1. In Resend dashboard: Settings → API Keys → Create new key
# 2. Update RESEND_API_KEY in secrets store
# 3. Redeploy
# 4. Revoke old key in Resend dashboard after confirming email delivery works
```

#### `ANTHROPIC_API_KEY`

```bash
# 1. In Anthropic console: API Keys → Create new key
# 2. Update ANTHROPIC_API_KEY in secrets store
# 3. Redeploy
# 4. Delete old key in Anthropic console
```

#### `SENTRY_DSN`

```bash
# 1. In Sentry: Project Settings → Client Keys (DSN) → Create new key
# 2. Update SENTRY_DSN in secrets store
# 3. Redeploy
# 4. Revoke old DSN key in Sentry
```

### History purge for committed `.env*` files

If any `.env`, `.env.local`, `.env.production`, or `.env.supabase` file was ever committed to git history, **rotate every secret above before and after the purge**.

The purge script is at `server/scripts/purge-secrets.sh`. It wraps `git-filter-repo` (preferred) with a BFG fallback.

```bash
# Prerequisites
pip install git-filter-repo
# OR download bfg.jar from https://rtyley.github.io/bfg-repo-cleaner/

# Dry run first — shows what would be removed
bash server/scripts/purge-secrets.sh --dry-run

# Execute the purge
bash server/scripts/purge-secrets.sh

# Force-push all branches and tags
git push --force --all
git push --force --tags
```

After the purge:
1. All collaborators must delete their local clones and re-clone.
2. Rotate every secret listed in [Secret inventory](#secret-inventory).
3. Verify no secret values appear in the new history:
   ```bash
   git log --all --full-history -- ".env*"
   git grep -r "JWT_ACCESS_SECRET\s*=" $(git log --all --pretty=format:'%T') 2>/dev/null | head
   ```

---

## Incident Response

### Severity classification

| Severity | Examples |
|---|---|
| P0 — Critical | Active credential theft, database exfil, token forgery, malware in uploaded file |
| P1 — High | Brute-force attack in progress, mass account lockout, secret exposure in logs |
| P2 — Medium | Rate-limit bypass, auth anomaly, unexpected 500 spike |
| P3 — Low | Single failed auth audit event, minor misconfiguration |

### Response playbook

**P0 / P1 — Immediate actions (within 30 min)**

1. Rotate all secrets (see [Secret Rotation](#secret-rotation)).
2. Revoke all active refresh token families:
   ```sql
   UPDATE refresh_tokens SET state = 'revoked', revoked_at = now()
   WHERE state IN ('active', 'rotated');
   ```
3. Block attacking IP at nginx or upstream firewall.
4. Capture `audit_logs` rows for the incident window:
   ```sql
   SELECT * FROM audit_logs
   WHERE occurred_at BETWEEN '<start>' AND '<end>'
   ORDER BY occurred_at;
   ```
5. Preserve Sentry event IDs and correlation IDs (`requestId`) from affected requests.
6. Notify affected users if credentials or PII were accessed.

**Ongoing**

- Monitor rate-limit breaches via `rate_limit_exceeded` security events in `audit_logs`.
- Correlate events across requests using `request_id` column and `X-Request-Id` response header.
- Review pino NDJSON logs on stdout; ship to log aggregator in production.

### Useful audit queries

```sql
-- All security events for a specific IP in the last hour
SELECT occurred_at, event_type, outcome, actor_user_id, metadata
FROM audit_logs
WHERE ip = '<ip>'::inet
  AND occurred_at > now() - interval '1 hour'
ORDER BY occurred_at DESC;

-- Failed logins with lockout events for a specific user
SELECT occurred_at, event_type, outcome, metadata
FROM audit_logs
WHERE actor_user_id = '<user_id>'
  AND event_type IN ('login_failure', 'account_locked')
ORDER BY occurred_at DESC;

-- Refresh token reuse events (token theft indicator)
SELECT * FROM audit_logs
WHERE event_type = 'refresh_token_reuse_detected'
ORDER BY occurred_at DESC
LIMIT 50;
```

---

## Reporting a Vulnerability

GitHustle follows responsible disclosure.

**Do not open a public GitHub issue for security vulnerabilities.**

### How to report

1. Email the security team at **security@githustle.dev** with subject line `[SECURITY] <brief description>`.
2. Include:
   - Description of the vulnerability and affected component
   - Steps to reproduce or proof-of-concept (as a private gist if needed)
   - Potential impact assessment
   - Your contact information for follow-up
3. Encrypt sensitive reports using the PGP key published at `https://githustle.dev/.well-known/security.txt`.

### Response timeline

| Milestone | Target |
|---|---|
| Acknowledgement | 2 business days |
| Severity assessment | 5 business days |
| Fix ETA provided | 10 business days |
| Patch released (critical) | 30 days |
| Patch released (others) | 90 days |
| Public disclosure (coordinated) | After patch ships |

We credit researchers in release notes unless anonymity is requested.

---

## Clerk Migration Plan

The current implementation uses `AUTH_PROVIDER=local` backed by `LocalJwtProvider` (bcrypt + JWT + refresh-token family in Postgres). The `Auth_Provider_Interface` in `server/src/modules/auth/auth-provider.js` isolates all identity operations behind a stable contract so the Clerk swap requires zero changes to routes, middleware, or socket code.

### Interface contract

```js
// Auth_Provider_Interface — both providers implement this shape
{
  verifyAccessToken(token: string): Promise<VerifiedToken>,
  getCurrentUser(userId: string): Promise<SafeUser>,
  signOut(sessionId: string): Promise<void>,
  mintTokensForUser(user: SafeUser, ctx: { ip, userAgent }): Promise<IssuedTokens>,
}
```

### Migration steps

1. **Install Clerk SDK**
   ```bash
   npm install @clerk/clerk-sdk-node --save-exact
   ```

2. **Implement `ClerkProvider`** at `server/src/modules/auth/providers/clerkProvider.js`
   — `verifyAccessToken`: call `clerkClient.verifyToken(token)`, map Clerk claims to `VerifiedToken`.
   — `getCurrentUser`: call `clerkClient.users.getUser(userId)`, map to `SafeUser`.
   — `signOut`: call `clerkClient.sessions.revokeSession(sessionId)`.
   — `mintTokensForUser`: not used for Clerk (Clerk issues its own tokens); throw `NotImplemented` or delegate to Clerk's session creation API.

3. **Register the provider** in `auth-provider.js`:
   ```js
   registry.register('clerk', new ClerkProvider());
   ```
   The stub already exists and throws `NotImplemented` — replace with the real implementation.

4. **Set env vars** for the Clerk environment:
   ```
   AUTH_PROVIDER=clerk
   CLERK_SECRET_KEY=sk_live_...
   CLERK_PUBLISHABLE_KEY=pk_live_...
   ```
   `CLERK_SECRET_KEY` must be added to `SECRET_VARS` in `server/src/config/env.js`.

5. **Migrate users** — export users from Postgres `users` table into Clerk via the Clerk Backend API bulk-import endpoint. Map `password_hash` to Clerk's bcrypt import format.

6. **Shadow-test** — run both providers in parallel (local verifies, Clerk also verifies) for one release cycle, logging mismatches. Switch `AUTH_PROVIDER=clerk` in staging first.

7. **Cutover** — set `AUTH_PROVIDER=clerk` in production. Revoke all active local refresh tokens:
   ```sql
   UPDATE refresh_tokens SET state = 'revoked', revoked_at = now()
   WHERE state IN ('active', 'rotated');
   ```

8. **Decommission `LocalJwtProvider`** — after 30-day stability window, remove `localJwtProvider.js`, the JWT util, and the `refresh_tokens` table migration.

### Rollback

Set `AUTH_PROVIDER=local` and redeploy. Local provider remains registered and functional throughout the migration window.

### What does NOT change

- All route paths under `/api/v1/`
- `middleware/authenticate.js` — calls `authProvider.active.verifyAccessToken(token)` unchanged
- `socket/index.js` — same handshake gate
- Rate limiters, CORS allowlist, security headers
- `audit_logs` schema
