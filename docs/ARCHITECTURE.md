# Architecture

## System diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Next.js App Router)                     │
│  Dashboard · Schedule · Negotiation Scheduler · Contractors · 3 Agents   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                 │  fetch()
┌───────────────────────────────▼──────────────────────────────────────────┐
│                     NEXT.JS API ROUTES (src/app/api/*)                   │
│  /dashboard  /schedule  /schedule/critical-path  /negotiation/*          │
│  /contractors  /agents/spec-compliance  /agents/supply-chain  /agents/rfi│
└───────┬───────────────────────────────────────────────────┬─────────────┘
        │                                                    │
        ▼                                                    ▼
┌───────────────────────────┐                 ┌──────────────────────────────┐
│  DETERMINISTIC ALGORITHMS  │                 │   LLM EXPLANATION LAYER      │
│  src/lib/algorithms/*      │  decides first  │   src/lib/llm/ollama.ts      │
│  - criticalPath.ts (CPM)   │ ───results────► │   src/lib/llm/prompts.ts     │
│  - negotiation.ts (Nash)   │                 │   (Ollama: Qwen/Gemma/Llama/ │
│  - riskScore.ts            │                 │    Mistral — local, free)    │
│  - specCompliance.ts       │                 │   Falls back to deterministic │
│  - supplyChainRisk.ts      │                 │   templates if Ollama is down │
│  - rfiSearch.ts (TF-IDF)   │                 └──────────────────────────────┘
└──────────────┬──────────────┘
               │ Prisma Client
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  PostgreSQL on Supabase (free tier)                      │
│  25 tables — projects, tasks, contractors, negotiation sessions,         │
│  equipment/suppliers, specs/submittals/NCs, RFIs, commissioning tests    │
└──────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                  Supabase Auth (free tier) — user_profiles

        External free APIs consulted by the risk engine:
        Open-Meteo (weather, no key) · Nager.Date (public holidays, no key)
```

**Core design rule, enforced everywhere:** an algorithm decides the number / pass-fail / date /
split; the LLM is only ever handed the already-decided result to phrase in plain language. No
route lets the model recompute or override a business decision.

## Folder structure

```
epc-intelligence-platform/
├── prisma/
│   ├── schema.prisma              # full normalized data model (25 tables)
│   ├── seed.ts                    # builds one realistic project end-to-end
│   ├── migration_lock.toml
│   └── migrations/000001_init/migration.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx              # shell: sidebar + content area
│   │   ├── page.tsx                # Dashboard
│   │   ├── schedule/page.tsx       # Critical Path Schedule
│   │   ├── negotiation/page.tsx    # Multi-Agent Contractor Negotiation Scheduler
│   │   ├── contractors/page.tsx    # Trade Contractor constraint profiles
│   │   ├── agents/
│   │   │   ├── spec-compliance/page.tsx
│   │   │   ├── supply-chain/page.tsx
│   │   │   └── rfi-knowledge/page.tsx
│   │   └── api/
│   │       ├── dashboard/route.ts
│   │       ├── schedule/route.ts
│   │       ├── schedule/critical-path/route.ts
│   │       ├── negotiation/conflicts/route.ts
│   │       ├── negotiation/resolve/route.ts
│   │       ├── contractors/route.ts
│   │       └── agents/{spec-compliance,supply-chain,rfi}/route.ts
│   ├── components/
│   │   ├── ui/          # Badge, Card, StatCard, ProgressBar, Skeleton
│   │   └── layout/       # Sidebar, Topbar
│   └── lib/
│       ├── db.ts                    # Prisma singleton
│       ├── types.ts
│       ├── algorithms/              # ALL deterministic decision logic
│       ├── llm/                     # Ollama client + prompt templates
│       ├── external/                # Open-Meteo + Nager.Date clients
│       └── supabase/client.ts       # Supabase Auth browser client
├── docs/                             # this documentation set
├── .env.example
└── package.json
```

## Why Next.js App Router (not a separate backend)

A single deployable unit keeps the free-tier footprint minimal (one Vercel/Render/Railway free
project, one Supabase free project) while still cleanly separating concerns: UI pages are thin,
API routes own request/response shaping, and `src/lib` owns all business logic — so the
algorithms are independently testable (see the smoke tests referenced in `docs/AGENT_FLOW.md`)
without spinning up the web server.

## Future improvements

- **Scale to 200 contractors**: extend `prisma/seed.ts`'s contractor/task generation loop;
  the negotiation engine, schema, and UI already scale without change.
- **Row-Level Security**: wire Supabase Auth JWT claims into Postgres RLS policies keyed off
  `user_profiles.role`, so contractor reps only see their own trade's data.
- **Vector retrieval**: swap the TF-IDF retrieval in `rfiSearch.ts` for a pgvector-based
  embedding index (still free on Supabase) once the RFI corpus grows past a few hundred records.
- **Live drawing/submittal computer vision**: the SDS's "Computer Vision (drawing review,
  submittal checking)" suggestion is a natural extension of the Spec & Quality Compliance Agent
  — open-source OCR (Tesseract) + layout parsing could feed structured values into the existing
  `checkSubmittalAgainstRequirement()` checker without changing its interface.
- **Real-time negotiation triggers**: currently conflicts are seeded/detected as a batch; a
  background job comparing newly-edited task dates against the dependency graph could raise
  `ScheduleConflict` rows automatically and kick off `negotiateScheduleConflict()` on write.
