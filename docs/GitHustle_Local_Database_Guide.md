# GitHustle — Local Database Setup Guide

## Prerequisites

- [PostgreSQL 15+](https://www.postgresql.org/download/windows/) installed locally
- `psql` available in your terminal (`pg_isready -h localhost` to verify)

---

## 1. Create the database, user, and admin role

Open a terminal and connect as the `postgres` superuser:

```bash
psql -U postgres
```

Then run:

```sql
CREATE DATABASE githustle_dev;
CREATE USER githustle_user WITH PASSWORD 'your_local_password';
GRANT ALL PRIVILEGES ON DATABASE githustle_dev TO githustle_user;
CREATE ROLE githustle_admin BYPASSRLS;

\c githustle_dev

GRANT ALL ON SCHEMA public TO githustle_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO githustle_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO githustle_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO githustle_user;

\q
```

> `githustle_admin` is a service role used by admin backend routes. It bypasses RLS.
> Your app connects as `githustle_user`, not as `githustle_admin`.

---

## 2. Run the schema migration

From the project root in a terminal (CMD or PowerShell):

```bash
psql -U postgres -d githustle_dev -f "server/sql/migrations/000_general_migration.sql"
```

Verify it ran cleanly — you should see no `ERROR` lines, only `CREATE TABLE`, `CREATE INDEX`, `CREATE TRIGGER`, etc.

---

## 3. Run the seed data

```bash
psql -U postgres -d githustle_dev -f "server/sql/seeds/000_seed.sql"
```

This inserts:
- 3 subscription plans (free, pro_freelancer, business_client)
- 2 fee schedules (beta zero-fee, standard 5%/2%)
- 48 skills across Development, Design, Writing, Marketing, Media

Seeds use `ON CONFLICT DO NOTHING` — safe to re-run anytime.

---

## 4. Configure the environment

In `server/`, create a `.env.local` file:

```env
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173

DATABASE_URL=postgresql://githustle_user:your_local_password@localhost:5432/githustle_dev
DB_CONNECT_TIMEOUT=10000

JWT_ACCESS_SECRET=local_dev_secret_change_me
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=7

BCRYPT_SALT_ROUNDS=12
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
EMAIL_VERIFY_EXPIRES_HOURS=24

UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
PORTFOLIO_IMAGE_MAX_SIZE_MB=8
PUBLIC_API_URL=http://localhost:4000
```

---

## 5. Start the server (local DB)

```bash
cd server
npm install
npm run dev:local
```

To switch to Supabase instead:

```bash
npm run dev:supabase
```

Make sure `server/.env.supabase` exists with your Supabase `DATABASE_URL`.

---

## Switching between local and Supabase

| Situation | Command |
|---|---|
| Weak connection / offline | `npm run dev:local` |
| Good connection / staging | `npm run dev:supabase` |

---

## Useful psql commands

| Command | Action |
|---|---|
| `\l` | List all databases |
| `\c githustle_dev` | Connect to the database |
| `\dt` | List all tables |
| `\du` | List all roles/users |
| `\q` | Quit psql |
| `pg_isready -h localhost -p 5432` | Check if PostgreSQL is running |

---

## Reset and reseed (data only)

To wipe reference data without touching the schema:

```sql
\c githustle_dev
TRUNCATE skills, fee_schedules, subscription_plans CASCADE;
```

Then re-run the seed:

```bash
psql -U postgres -d githustle_dev -f "server/sql/seeds/000_seed.sql"
```

---

## Full reset (nuclear)

Drop and recreate everything from scratch:

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS githustle_dev;"
psql -U postgres -c "CREATE DATABASE githustle_dev;"
psql -U postgres -d githustle_dev -c "GRANT ALL ON SCHEMA public TO githustle_user;"
psql -U postgres -d githustle_dev -f "server/sql/migrations/000_general_migration.sql"
psql -U postgres -d githustle_dev -f "server/sql/seeds/000_seed.sql"
```
