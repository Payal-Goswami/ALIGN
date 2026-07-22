# EPC Project Intelligence Platform

**AI Intelligence Platform for Data Centre EPC Project Delivery**
Theme: Industrial Intelligence / Infrastructure Construction / Quality Management

Built for a Hyderabad hyperscale data-centre campus (Tier III, 36 MW), this platform unifies
schedule, procurement, quality and commissioning data into one intelligence layer — anchored
by a **Multi-Agent Contractor Negotiation Scheduler** that resolves the 200-contractor
schedule-clash bottleneck algorithmically instead of by PMO phone calls.

➡️ See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the system design and
[`docs/AGENT_FLOW.md`](docs/AGENT_FLOW.md) for how each agent decides things.

---

## Why this exists

A single hyperscale data-centre build involves 15,000–40,000 equipment line items, up to 200
concurrent trade contractors, and thousands of commissioning test procedures — with zero
tolerance for the errors that jeopardize an uptime SLA. Today, the "master schedule" is really
200 competing local schedules reconciled by an overworked PMO through adversarial phone calls.
Primavera/MS Project output one top-down schedule with no concept of a contractor as a
self-interested actor with its own crew constraints, other site commitments, and incentive to
protect float.

This platform models each trade contractor as an autonomous negotiating agent and runs a
**Nash-bargaining / mechanism-design negotiation** to find Pareto-improving schedule
compromises automatically — alongside three supporting agents (spec/quality compliance,
supply-chain risk, and RFI knowledge retrieval) that round out the EPC delivery lifecycle.

## What's implemented

| Module | What it does | How it decides |
|---|---|---|
| **Contractor Negotiation Scheduler** | Resolves resource/space/sequence clashes between trade contractors | Deterministic Nash-bargaining algorithm (`src/lib/algorithms/negotiation.ts`) |
| **Critical Path Engine** | Computes early/late start-finish, float, critical path | Deterministic CPM forward/backward pass (`src/lib/algorithms/criticalPath.ts`) |
| **Predictive Schedule Risk Engine** | Scores every task 0–100 for delay risk | Deterministic weighted rule engine (`src/lib/algorithms/riskScore.ts`) |
| **Spec & Quality Compliance Agent** | Flags submittal deviations from governing specs (TIA-942, Uptime, BICSI) | Deterministic tolerance-band / categorical checker (`src/lib/algorithms/specCompliance.ts`) |
| **Supply Chain Visibility Agent** | Flags at-risk equipment shipments | Deterministic buffer-erosion rule engine (`src/lib/algorithms/supplyChainRisk.ts`) |
| **RFI & Knowledge Agent** | Finds similar prior RFIs, drafts an answer suggestion | Deterministic TF-IDF cosine retrieval (`src/lib/algorithms/rfiSearch.ts`) + LLM phrasing |

**In every case, the decision is made by an algorithm. The LLM (local, via Ollama) is only ever
used afterward to translate an already-decided, structured result into plain language** — see
`src/lib/llm/ollama.ts` and `src/lib/llm/prompts.ts`. If Ollama isn't running, every agent still
works: it falls back to a deterministic template built from the same facts.

## Tech stack (100% free / open-source)

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: PostgreSQL on [Supabase](https://supabase.com) (free tier) via Prisma ORM
- **Auth**: Supabase Auth (free tier)
- **LLM**: [Ollama](https://ollama.com) running Qwen 2.5 / Gemma 3 / Llama 3.2 / Mistral locally — no API key, no cost
- **External data**: [Open-Meteo](https://open-meteo.com) (weather, no key) and [Nager.Date](https://date.nager.at) (public holidays, no key)

No Claude API, no OpenAI API, no paid cloud service is required anywhere in this codebase.

---

## Quickstart

### 1. Prerequisites
- Node.js ≥ 18.18
- A free [Supabase](https://supabase.com) account
- [Ollama](https://ollama.com) installed locally (optional but recommended — see below)

### 2. Install
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Fill in `DATABASE_URL` / `DIRECT_URL` from your Supabase project (**Project Settings → Database
→ Connection string**) and `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API**. No local Postgres install is
required — Supabase hosts it for you on the free tier.

### 4. Create the schema and seed data
```bash
npm run db:migrate    # applies prisma/migrations/000001_init against your Supabase DB
npm run db:seed       # loads one realistic 36MW Tier III data-centre project end-to-end
```
(`prisma/migrations/000001_init/migration.sql` is also provided pre-written, in case you'd
rather paste it directly into the Supabase SQL editor instead of running the CLI.)

### 5. (Optional but recommended) Pull a local LLM
```bash
ollama pull qwen2.5:7b-instruct
ollama serve
```
Every agent works without this step (it falls back to deterministic explanation templates), but
the "Generate explanation" buttons will call a real local model if it's running.

### 6. Run
```bash
npm run dev
```
Open http://localhost:3000 — you'll land on the Dashboard for the seeded "Hyderabad Hyperscale
Campus — Phase 1" project.

---

## Where to look first (for judges)

1. **`/negotiation`** — the core Multi-Agent Contractor Negotiation Scheduler. Pick any
   conflict on the left to see the two contractor-agents' constraint-driven concession trace,
   the Nash-bargaining split, and the Pareto-improvement check versus the old uncoordinated
   PMO-forced baseline.
2. **`src/lib/algorithms/negotiation.ts`** — the actual mechanism-design implementation, fully
   commented, with no LLM involved in the decision.
3. **`/schedule`** — click "Recompute critical path" to watch the CPM algorithm re-run live
   against the database.
4. **`prisma/schema.prisma`** — the full normalized data model (25 tables) behind all of it.

## Project structure

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the annotated folder structure and
system diagram, [`docs/AGENT_FLOW.md`](docs/AGENT_FLOW.md) for per-agent decision flow,
[`docs/DATABASE.md`](docs/DATABASE.md) for the schema reference, [`docs/API.md`](docs/API.md)
for the route reference, [`docs/DATASETS.md`](docs/DATASETS.md) for data sourcing, and
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for deploying beyond `localhost`.

## Scaling to 200 contractors

The seed script models 8 major trade packages (representative of a real hyperscale build's
critical disciplines) rather than typing out 200 by hand. The schema and negotiation engine are
already contractor-count-agnostic — `negotiateScheduleConflict()` operates on any two
`ContractorConstraints` objects regardless of how many contractor rows exist in the project, so
scaling the seed to 200 contractors is a data-generation exercise, not an architecture change.
See "Future Improvements" in `docs/ARCHITECTURE.md`.
