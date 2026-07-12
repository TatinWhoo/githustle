# GitHustle

**Where developers hustle, get hired, and get paid.**

A freelance operations platform built for technical talent — developers, designers, and creatives who want a structured way to find work, manage projects, and get paid without stitching together five different tools to do it.

---

### 🔁 The Core Loop

```
Client posts job  →  Freelancers submit proposals  →  Client hires
→  Work tracked in milestones with deliverables
→  Approved milestone  →  Invoice  →  Payment
→  Both sides leave a review
```

Everything in that loop is logged. Every proposal, milestone status change, message, invoice, and payment has a paper trail both sides can reference.

---

### 🎯 Features

**For Clients**
- Post fixed-price or hourly jobs with required skills and deadlines
- Browse and search freelancer profiles by skill, rate, and rating
- Track project progress through milestones
- Pay per milestone — not the full amount upfront

**For Freelancers**
- Public profile with skills, portfolio, ratings, and job history
- Submit proposals with cover letter and proposed rate
- Auto-generated invoices per milestone
- Portable reputation that lives outside any single client relationship

**For Everyone**
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

### 🚀 Getting Started

#### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (local) or a Supabase project
- npm

#### 1. Clone and install dependencies

```bash
git clone https://github.com/your-org/githustle.git
cd githustle

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```
#### 2. Start the development servers

Open two terminals:

```bash
# Terminal 1 — backend (local DB)
cd server
npm run dev:local

# Or Supabase
cd server 
npm run dev:supabase

# Terminal 2 — frontend
cd client
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |

#### Available server scripts

| Script | Description |
|---|---|
| `npm run dev` | Start server using default `.env` |
| `npm run dev:local` | Start server using `.env.local` (local PostgreSQL) |
| `npm run dev:supabase` | Start server using `.env.supabase` (Supabase) |
| `npm start` | Production start |

---

### 🌏 Market Focus

Initial target: **Philippines** — built around GCash and local bank transfers, local pricing (PHP), and the realities of technical freelancing in Southeast Asia.

---

### 📄 License

Private — all rights reserved.
