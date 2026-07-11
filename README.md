# GitHustle

**Where developers hustle, get hired, and get paid.**

A freelance operations platform built for technical talent — developers, designers, and creatives who want a structured way to find work, manage projects, and get paid without stitching together five different tools to do it.

---

### 📦 Stack

**Backend**
- **Node.js + Express 5** — REST API
- **PostgreSQL 15** — primary database (Supabase)
- **pg** — node-postgres driver
- **bcryptjs** — password hashing
- **jsonwebtoken** — JWT auth + refresh token rotation
- **Zod** — runtime schema validation
- **Helmet + CORS + express-rate-limit** — baseline API security
- **Nodemailer** — transactional email

**Frontend**
- **React 19** (Vite)
- **React Router v7**
- **TanStack Query v5** — server state
- **Zustand** — client state
- **React Hook Form** — form management
- **Axios** — HTTP client

---

### ✨ Quick start

```bash
# Backend
cd server
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, etc.
npm install
npm run dev

# Frontend
cd client
cp .env.example .env   # fill in VITE_API_URL
npm install
npm run dev
```

---

### 🗄 Database

PostgreSQL schema lives in `server/sql/migrations/`. Run migrations in order on a fresh database:

```bash
psql -U <user> -d githustle -f server/sql/migrations/000_general_migration.sql
```

For incremental setup on an existing database, apply `001_*` through `013_*` in sequence.

ERD and schema documentation: [`Docs/ERD_DIAGRAM.md`](./ERD_DIAGRAM.md) (paste into [mermaid.live](https://mermaid.live))

---

### 🔁 The core loop

```
Client posts job  →  Freelancers submit proposals  →  Client hires
→  Work tracked in milestones with deliverables
→  Approved milestone  →  Invoice  →  Payment
→  Both sides leave a review
```

Everything in that loop is logged. Every proposal, milestone status change, message, invoice, and payment has a paper trail both sides can reference.

---

### 🎯 Features

**For clients**
- Post fixed-price or hourly jobs with required skills and deadlines
- Browse and search freelancer profiles by skill, rate, and rating
- Track project progress through milestones
- Pay per milestone — not the full amount upfront

**For freelancers**
- Public profile with skills, portfolio, ratings, and job history
- Submit proposals with cover letter and proposed rate
- Auto-generated invoices per milestone
- Portable reputation that lives outside any single client relationship

**For everyone**
- Real-time per-project messaging
- Notifications for proposals, milestone updates, messages, and payments
- Review system — ratings are earned, visible, and linked to real completed work
- Dispute resolution with admin mediation
- Subscription tiers (Free / Pro / Business) with credits, promoted listings, and advanced features

**Collaboration Space** *(post-launch, schema-ready now)*
- Co-authored documents with version history
- Visual boards — flowcharts, diagrams, wireframes
- Sticky notes (personal and shared)
- Voice/video calls with a shared live whiteboard

---

### 🛡 Security

- Passwords hashed with bcrypt (12 rounds)
- Auth tokens SHA-256 hashed before storage; raw token sent in email only
- MFA secrets encrypted at rest via `pgp_sym_encrypt` (pgcrypto)
- Withdrawal account details encrypted at rest
- Row-Level Security on all sensitive tables — every query is scoped to the authenticated user
- Admin routes use a dedicated `githustle_admin` PostgreSQL role with `BYPASSRLS` — separate connection pool, never exposed to user-facing routes
- Refresh token family rotation — stolen token invalidates the entire family
- Payment webhook idempotency via `payment_gateway_events` (prevents double-processing on retry)

---

### 📁 Project structure

```
githustle/
├── client/               # React 19 frontend (Vite)
│   └── src/
│       ├── api/          # Axios instances and request functions
│       ├── components/   # Shared UI components
│       ├── context/      # React context providers
│       ├── hooks/        # Custom hooks
│       ├── pages/        # Route-level page components
│       └── utils/        # Helpers and constants
├── server/               # Express 5 backend
│   ├── src/
│   │   ├── config/       # DB pool, env validation
│   │   ├── middleware/   # Auth, rate limiting, error handling
│   │   ├── modules/      # Feature modules (auth, profiles, jobs, ...)
│   │   └── utils/        # Shared utilities
│   └── sql/
│       └── migrations/   # Ordered PostgreSQL migration files
└── Docs/                 # Schema docs, ERD, project documentation
```

---

### 🗺 Build order

Schema is production-ready. Backend builds in this sequence:

1. **Auth** — `users`, `refresh_tokens`, `mfa_recovery_codes`
2. **Profiles** — `freelancer_profiles`, `client_profiles`, skills, portfolio
3. **Jobs & search** — `job_postings`, `job_skills`, full-text search (GIN indexes live)
4. **Proposals** — `proposals`, `saved_jobs`
5. **Projects & milestones** — `projects`, `milestones`, `milestone_deliverables`, `time_entries`
6. **Messaging** — `messages` (RLS chain already wired)
7. **Invoicing** — `invoices`, `invoice_items` (sequence and math constraints in place)
8. **Payments** — `payments`, `platform_fees`, `withdrawals`, `payment_gateway_events`

Subscriptions, credits, collab space, and AI features layer on top without touching what is already built.

---

### 🌏 Market focus

Initial target: **Philippines** — built around GCash and local bank transfers, local pricing (PHP), and the realities of technical freelancing in Southeast Asia.

---

### 📄 License

Private — all rights reserved.
