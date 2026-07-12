# GitHustle

**Where developers hustle, get hired, and get paid.**

*Project Documentation — Draft v1.0 (Pre-Launch)*

---

## 1. What Is GitHustle?

GitHustle is a freelance operations platform built specifically around **developers, designers, and technical talent** — the people who already live in Git, ship code for a living, and want a straightforward way to find paid work without juggling five different tools to do it.

Instead of freelancers managing job leads over Messenger, tracking payments in a spreadsheet, and chasing clients for feedback over email, GitHustle puts the entire relationship — job posting, proposal, contract, milestones, messaging, invoicing, and payment — inside one platform.

Think of it as the operational backbone freelance developers actually need: part job board, part project tracker, part invoicing tool, part messaging app — built around how technical freelance work really happens (in milestones, with deliverables, and with money on the line).

**One-line pitch:** *GitHustle is where clients post real work, developers pitch real proposals, and both sides track the entire project — from first message to final payment — in one place.*

---

## 2. The Problem We're Solving

Freelance developers and small clients currently stitch together a workflow from tools never built for this:

- Job leads arrive over Facebook groups, LinkedIn DMs, or word of mouth — with no structure and no accountability.
- Scope and payment terms live in a chat thread, not a contract — leading to disputes neither side can resolve.
- Freelancers track multiple clients' payment status in a personal spreadsheet, and follow up on overdue invoices manually (or not at all).
- Clients have no visibility into progress until the freelancer says "it's done" — with no milestone trail to check against.
- There's no portable reputation. A freelancer's five years of good work with past clients doesn't show up anywhere a *new* client can see it.

GitHustle exists to fix the operational side of freelancing — not by replacing the relationship between client and freelancer, but by giving that relationship structure, a paper trail, and a shared source of truth.

---

## 3. Who GitHustle Is For

| Persona | What they need |
|---|---|
| **Freelance developers & technical talent** | A steady pipeline of real jobs, a professional portfolio, proof of past work (ratings, completed jobs), and a system that chases invoices *for* them. |
| **Indie clients & small businesses** | A faster way to find vetted developers, a structured way to track deliverables, and confidence their money is tied to actual progress. |
| **Startups & agencies hiring contract help** | A lightweight way to bring on contractors without standing up their own contractor-management process. |

GitHustle's first market focus is the **Philippines** — one of the largest freelance talent markets in the world, currently underserved by platforms built for a different market's pricing, payment methods (GCash, local bank transfer), and communication norms. The platform is architected to expand beyond that, but the initial community, tone, and payment integrations are built with that market in mind first.

---

## 4. How GitHustle Works

The core loop is simple, and mirrors how real freelance engagements already happen — GitHustle just makes every step visible and recorded instead of scattered across apps.

```
1. Client posts a job          →  Title, description, budget (fixed or hourly), required skills, deadline
2. Freelancers submit proposals →  Cover letter, proposed rate, estimated timeline
3. Client reviews & hires       →  Accepted proposal becomes a live Project
4. Work happens in milestones   →  Each milestone has a deliverable, a due date, and an amount
5. Freelancer submits deliverable → Client reviews: approve, request changes, or reject
6. Approved milestone → invoice → Freelancer invoices the milestone; client pays
7. Project completes            →  Both sides leave a review — building portable reputation
```

Everything in that loop is logged: every proposal, every milestone status change, every message, every invoice. If a disagreement happens six weeks in, both sides can point to exactly what was agreed and what was delivered — instead of scrolling back through a chat history trying to reconstruct it.

---

## 5. Is It a Website, a Web App, or a Mobile App?

**Short answer: GitHustle is a full web application first, with a mobile app as a planned next phase — not a static marketing website.**

Here's the distinction, and why it matters for how you talk about this pre-launch:

- **A website** is mostly static content — informational pages, no real user accounts doing real work.
- **A web app** is what GitHustle actually is: users log in, manage real data (jobs, proposals, projects, money), and the interface updates dynamically based on what they do. This is a full client-server application — a React frontend talking to a Node.js/Express backend, backed by a real database (PostgreSQL).

**On mobile:** rather than building three separate codebases (web, iOS, Android) before launch, the recommended path is:

1. **Launch as a responsive web app.** It already works on mobile browsers — freelancers checking job alerts on their phone, clients approving a milestone from the train, all functional day one.
2. **Add PWA (Progressive Web App) support shortly after launch.** This lets users "install" GitHustle to their home screen, get push notifications for new messages and proposals, and get a near-native feel — with almost no additional engineering cost on top of the web app.
3. **Build a true native mobile app once there's real usage data to justify it.** At that point, React Native lets you reuse a meaningful chunk of the existing frontend logic rather than starting over.

This sequencing means you can honestly tell the community "yes, a mobile app is coming" without it being a launch blocker or an empty promise.

---

## 6. Core Features

### For clients
- Post jobs with fixed-price or hourly budgets, required skills, and deadlines
- Browse and search freelancer profiles by skill, rate, availability, and rating
- Review proposals side-by-side and message freelancers before hiring
- Track project progress through milestones — no more "just trust me, it's almost done"
- Approve deliverables, request changes, or raise a dispute if something goes wrong
- Pay per milestone instead of the full amount upfront

### For freelancers
- A public profile: skills, hourly rate, experience level, portfolio, ratings, and completed job count
- Browse jobs filtered by skill, budget, and experience level required
- Submit proposals with a cover letter and proposed rate/timeline
- Manage every active project's milestones in one dashboard
- Auto-generated invoices per milestone, with automatic overdue-payment reminders
- A portable reputation that follows them — ratings and job history that live *outside* any single client relationship

### For everyone
- Real-time messaging per project — no more negotiating scope over five different apps
- Notifications for new proposals, milestone updates, messages, and payments
- A review system so reputation is earned, visible, and hard to fake
- A dispute process with admin mediation if a project relationship breaks down

### Live Collaboration Space (per project)

Each project gets a shared collaboration workspace — a persistent, real-time environment where client and freelancer can work together beyond just messaging. The collaboration space includes:

- **Collaborative Documents** — Real-time co-authored notes and project documents. Both parties see changes live as they type. Documents are version-tracked and linked to the project permanently, serving as the project's living written record: scoping notes, meeting summaries, requirement specs, change logs.

- **Visual Boards (Charts & Flowcharts)** — A drag-and-drop canvas for building flowcharts, system diagrams, wireframes, and visual planning boards. Elements (shapes, arrows, text, images) are persisted to the database and synced in real time. Each board is named, versioned, and scoped to its project — useful for technical architecture discussions, user flow planning, and delivery scope alignment.

- **Sticky Notes & Reminders** — Lightweight personal and shared annotations. Sticky notes can be pinned to a user's personal workspace (only they see them) or posted to the shared collaboration space (both parties see them). Separate from the full document editor — quick capture, no formatting required. Reminders are time-stamped and can trigger in-app notifications.

- **Voice & Video Calls with Shared Whiteboard** — Real-time audio/video calls scoped to the project, with an integrated whiteboard that both parties can draw on simultaneously during the call. Call metadata (start time, duration, participants) is logged. Whiteboard snapshots taken during calls are saved to the collaboration space and linked to the call record for future reference.

**Technical note:** The collaboration space is a planned feature scoped for post-launch development. The database is designed now to support all persistence requirements — documents, board elements, sticky notes, call records, whiteboard snapshots — so implementation is additive rather than requiring schema migrations later. Real-time sync uses the same Socket.io infrastructure as project messaging; WebRTC handles peer-to-peer audio/video.

---

## 7. Trust & Safety

Freelance platforms live or die on trust — from both directions. GitHustle's approach:

- **Verified accounts.** Email verification is required before anyone can post a job or submit a proposal. Payment-method verification is planned for clients before they can post high-budget jobs.
- **Milestone-based payment, not lump-sum.** Money is tied to specific, agreed-upon deliverables — not released all at once at the start or the end.
- **Two-sided reviews.** Both client and freelancer rate each other after every project. A freelancer's reputation is visible before a client ever messages them; a client's payment history and rating are visible before a freelancer accepts a job.
- **A real dispute process.** If a milestone is rejected repeatedly or a payment is contested, either side can open a dispute. An admin reviews the project's actual history — messages, milestone submissions, deliverables — rather than taking one side's word for it.
- **An audit trail on everything.** Every meaningful action (status changes, approvals, payments) is logged. This isn't visible to end users day-to-day, but it means "what actually happened" is never in question if something needs to be reviewed later.

---

## 8. Payments

GitHustle is designed to support multiple payment rails relevant to its initial market:

- Card payments (Stripe)
- PayPal
- GCash / Maya
- Direct bank transfer

---

## 8a. Monetization Model

GitHustle uses a hybrid monetization strategy combining marketplace transaction fees, SaaS subscription tiers, and attention-based visibility products. Revenue grows with platform usage rather than being front-loaded.

### Revenue Stream 1: Take Rate (Transaction Fees)

A percentage is taken from every funded and approved milestone.

**Freelancer commission:** 5–10% flat on milestone earnings. Justified by automated invoicing, payment protection, and dispute coverage.

**Client payment processing fee:** 2–3% on each milestone funding to cover local payment gateway costs (GCash, Maya, bank transfer).

**Fee schedule is configurable** — the `fee_schedules` table controls active rates and allows zero-fee periods (beta launch strategy).

**Beta launch:** Zero-fee period for the first months to build liquidity. Fees activate once users are dependent on the platform.

### Revenue Stream 2: Freemium Subscriptions

Core job matching and milestone tracking stays free. Advanced tools lock behind subscription tiers.

**GitHustle Pro (Freelancers)** — ~₱299/month:
- Unlimited AI-assisted proposal drafting
- Profile view analytics (who looked at your profile, when)
- "Verified Expert" badge visible in search results
- Priority customer support

**GitHustle Business (Clients)** — ~₱799/month:
- Multi-user team accounts (multiple PMs on one client account)
- Advanced contract templates + custom NDA integration
- Bulk job posting tools
- Team activity log access

Subscription state is tracked in `user_subscriptions`. Feature access is checked against `feature_entitlements` per subscription plan.

### Revenue Stream 3: Featured & Promoted Listings

Monetizing attention scarcity on the platform.

**Promoted Jobs:** Flat fee (e.g., ₱500) to pin a job post to the top of the freelancer feed for 48 hours. Tracked in `job_promotions`.

**Proposal Boosting:** Freelancers spend platform credits to move their proposal to the top of a client's review queue. Credits are purchased or earned. Tracked in `credit_ledger` and `proposal_boosts`.

### Revenue Stream 4: Localized Value-Added Services

**Tax & Compliance Add-on:** Automated BIR-ready tax summaries generated from invoice logs. Partnership with local fintech for filing. Tracked in `tax_records`.

**Priority Dispute Mediation:** Expedited 24-hour resolution for high-value contracts. Small flat fee. Tracked via `priority_dispute` flag on the `disputes` table with SLA timestamps.

### Launch Strategy: Zero-Fee Beta

1. Launch at ₱0 fees — no take rate, no subscription paywalls
2. Collect usage data: which features get used, which jobs get posted, which freelancers complete milestones
3. Introduce 5% take rate once active milestone completions are consistent
4. Launch Pro/Business subscription tiers once core workflow features are daily-use habits

---

## 9. Community Guidelines (Draft)

These are the baseline expectations worth publishing before launch, even in early form:

1. **Payments happen on GitHustle.** Circumventing the platform to avoid fees undermines the trust and dispute-protection the platform exists to provide.
2. **Scope changes get documented.** If the work changes from what was originally agreed, that change should be reflected in the project — not just discussed verbally and left untracked.
3. **Respond in good faith.** Ghosting a client mid-project or ignoring a freelancer's completed milestone for weeks damages the reputation system for everyone.
4. **Disputes are a last resort, not a first move.** Most disagreements are resolved faster through direct communication than through admin mediation.
5. **Reviews should be honest, not retaliatory.** The reputation system only works if it reflects real experiences.

These should eventually become a formal Terms of Service and Community Guidelines document reviewed by someone with legal expertise — informal guidelines are a fine starting point, not a permanent substitute.

---

## 10. Security & Privacy

Since GitHustle handles real user data and real payment activity, security isn't an afterthought:

- Passwords are hashed (never stored in plain text), with account lockout after repeated failed login attempts
- Sessions use short-lived access tokens with rotating refresh tokens — so a stolen token has a short shelf life and reuse is detected automatically
- Role-based access control ensures a client can never access another client's job data, and a freelancer can never edit another freelancer's profile or portfolio
- File uploads (avatars, portfolio images) are validated by actual file content, not just filename or declared type — closing a common upload-based attack vector
- Sensitive project data (messages, invoices, milestones) is scoped so only the client and freelancer on that specific project can access it

A public-facing security disclosure (what's encrypted, what's logged, how disputes are handled, data retention policy) should be published as part of launch — this builds trust with a community that will be trusting the platform with real money.

---

## 11. Current Status & Roadmap

Being transparent about what's real today versus what's coming builds more trust than overpromising. As of this document:

| Feature | Status |
|---|---|
| Account registration, email verification, secure login | ✅ Built |
| Freelancer & client profiles, skill tagging, portfolio, avatar upload | ✅ Built |
| Job posting, browsing, full-text search, proposals | 🔨 In progress |
| Projects & milestone tracking | 📋 Planned |
| Real-time messaging | 📋 Planned |
| Invoicing & payment integration | 📋 Planned |
| Transaction fee engine (take rate + processing fee) | 📋 Planned |
| Freemium subscription tiers (Pro / Business) | 📋 Planned |
| Promoted jobs & proposal boosting | 📋 Planned |
| Platform credits system | 📋 Planned |
| Notifications | 📋 Planned |
| Admin panel & dispute resolution | 📋 Planned |
| Priority dispute mediation | 📋 Planned |
| Tax & compliance add-on (BIR) | 📋 Planned (partner integration) |
| AI-assisted proposal drafting & contract review | 📋 Planned (post-launch enhancement) |
| Live collaboration space (documents, boards, sticky notes) | 📋 Planned (post-launch) |
| Voice & video calls with shared whiteboard | 📋 Planned (post-launch) |
| Mobile app (native) | 📋 Future — PWA first |

Publishing a version of this table publicly (in simpler language) is a good way to set expectations with early users — people are far more forgiving of "coming soon" than they are of a feature that's silently broken or missing.

---

## 12. Open Questions Before Launch

Worth deciding — or at least drafting a position on — before opening this to real users:

- **Platform fee model** — see Section 8a. Take rate (5–10%) + client processing fee (2–3%) + zero-fee beta period. Fee schedule is configurable per `fee_schedules` table.
- **Supported currencies and countries** — starting PH-only, or open to any country from day one?
- **Identity verification requirements** — is email verification enough, or will payment-related ID verification be required for higher-value jobs?
- **Legal entity & Terms of Service** — who is contractually responsible if a dispute escalates beyond the platform's mediation?
- **Content moderation policy** — what happens with a job posting or profile that violates guidelines? Who reviews reports?
- **Minimum viable trust threshold** — should a brand-new freelancer with zero reviews be visible in search the same as one with 50 completed jobs, or should there be an onboarding/visibility ramp?

None of these block continuing to build the product, but they do block a responsible public launch — worth resolving in parallel with development, not after.

---

## 13. Frequently Asked Questions (Community-Facing Draft)

**Is GitHustle only for developers?**
The initial focus is developers and technical freelancers, since that's the core community GitHustle is built for. Whether to expand into design, writing, or marketing categories is an open product decision — not a technical limitation.

**How is this different from [Upwork / Fiverr / OnlineJobs.ph]?**
GitHustle is built around milestone-based project tracking as the core experience, not just a job-matching layer on top of a generic messaging system. It's also purpose-built with Philippine payment methods and market dynamics in mind from day one, not retrofitted later.

**Is my data safe?**
See Section 10. A full, plain-language privacy policy will be published before launch.

**When is the mobile app coming?**
See Section 5 — the web app works on mobile browsers today; a PWA and native app are on the roadmap, sequenced after core web functionality is solid.

---

## 14. Feedback & Getting Involved

*(Fill in before publishing: beta signup link, feedback channel — Discord/email/form, and how early users can report bugs or request features.)*

---

*This document is a living draft. As GitHustle's feature set, fee model, and launch scope solidify, this documentation should be updated to match — publishing an inaccurate picture of the platform is worse than publishing a smaller, accurate one.*
