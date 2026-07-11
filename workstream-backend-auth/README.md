# WorkStream — Milestone 1: Project Setup + Auth System

This is the auth foundation for WorkStream. Every other module (job board,
messaging, invoices) sits on top of what's built here, so this milestone
is deliberately strict about a few things:

- **Feature-based folder structure** — `modules/auth/` owns its routes,
  controller, service, repository, and validation. Not file-type folders.
- **A full middleware chain** — security headers → CORS → body parsing →
  cookies → rate limiting → routes → 404 → global error handler.
- **JWT access tokens** (15 min) + **opaque refresh tokens** with
  rotation and theft detection, stored hashed in PostgreSQL.
- **bcrypt** password hashing (cost factor 12).
- **Email verification** — token hashed at rest, raw token only ever
  exists in the email link.
- **Account lockout** after repeated failed logins — independent of the
  IP-based rate limiter, so it still works even behind a shared IP/NAT.

## Folder structure

```
src/
├── server.js              entry point — boot, DB check, graceful shutdown
├── app.js                  middleware chain + route mounting
├── config/
│   ├── env.js              validates all env vars on startup (Zod)
│   └── database.js         pg Pool + slow-query logging
├── middleware/
│   ├── asyncHandler.js      wraps async routes so errors reach Express
│   ├── errorHandler.js      404 + centralized error responses
│   ├── validate.js          Zod-backed request validation
│   ├── rateLimiter.js       general / login / register limiters
│   └── authenticate.js      verifies JWT, attaches req.user
├── modules/
│   └── auth/
│       ├── auth.routes.js       wires validation + limiters + controller
│       ├── auth.controller.js   thin HTTP layer, owns the refresh cookie
│       ├── auth.service.js      all business logic — the file to study
│       ├── auth.repository.js   the only file that writes SQL
│       └── auth.validation.js   Zod schemas per endpoint
└── utils/
    ├── AppError.js          operational error class
    ├── jwt.js               sign/verify access tokens
    ├── hash.js              bcrypt + opaque token hashing
    └── email.js             sendEmail() with a dev console fallback
```

## What's deliberately NOT in this milestone

Scope was kept tight on purpose — these arrive later, on schedule:

- Freelancer/client profile creation → **Milestone 2**
- Password reset flow (the schema columns already exist for it)
- OAuth/social login and MFA → **Phase 03** of the roadmap
- Structured logging, Sentry, health checks → **Milestone 10**

## Setup

**1. Run the schema** (the `workstream_schema.sql` from earlier):
```bash
psql -U postgres -d workstream -f workstream_schema.sql
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure environment**
```bash
cp .env.example .env
```
At minimum, set `DATABASE_URL` and generate a `JWT_ACCESS_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Leave `SMTP_*` blank for now — verification emails will print to your
terminal instead of actually sending.

**4. Run it**
```bash
npm run dev
```
You should see:
```
🚀 WorkStream API running on port 4000 [development]
✅ PostgreSQL connection verified
```

## Testing the full auth flow with curl

**1. Register**
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@example.com","password":"S3cure!Pass","role":"freelancer"}'
```
Check your terminal — the verification email (with its link) prints
there since SMTP isn't configured.

**2. Verify email**
Copy the `token` query param from the printed link:
```bash
curl "http://localhost:4000/api/v1/auth/verify-email?token=<paste_token_here>"
```

**3. Log in**
```bash
curl -i -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@example.com","password":"S3cure!Pass"}' \
  -c cookies.txt
```
`-c cookies.txt` saves the httpOnly refresh cookie Express set on the
response. Copy `accessToken` from the JSON body for the next step.

**4. Access a protected route**
```bash
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <paste_accessToken_here>"
```
This confirms the full JWT pipeline: the `authenticate` middleware
decodes the token, then the service re-fetches the user from PostgreSQL
rather than trusting stale claims.

**5. Trigger account lockout**
Re-run step 3 with the *wrong* password five times in a row. The 6th
attempt — even with the *correct* password — now returns `423 Locked`
for 15 minutes. That's the DB-driven lockout working independently of
the login rate limiter.

**6. Refresh the access token**
```bash
curl -i -X POST http://localhost:4000/api/v1/auth/refresh \
  -b cookies.txt -c cookies.txt
```
Run this twice using the *same* `cookies.txt` saved before the first
refresh call. The second call should fail with `TOKEN_REUSE_DETECTED` —
the first refresh already rotated and revoked that token.

**7. Log out**
```bash
curl -X POST http://localhost:4000/api/v1/auth/logout -b cookies.txt
```

## Verification checklist before moving to Milestone 2

- [ ] Registering twice with the same email returns `409`, not a 500
- [ ] An expired or already-used verification token returns `400`
- [ ] 5 failed logins lock the account; a 6th attempt with the *correct*
      password still fails while locked
- [ ] `/me` returns the current user when called with a valid access token
- [ ] Refresh token rotates on every call — the old token cannot be reused
- [ ] `Ctrl+C` logs "Shutting down gracefully..." instead of dying
      mid-request
