# Database

PostgreSQL on Supabase (free tier), managed via Prisma ORM. Full schema: `prisma/schema.prisma`.
Full SQL: `prisma/migrations/000001_init/migration.sql`.

## Entity groups

| Group | Tables |
|---|---|
| Core | `projects`, `user_profiles` |
| Contractors & Schedule | `trade_contractors`, `tasks`, `task_dependencies` |
| Negotiation | `schedule_conflicts`, `negotiation_sessions`, `negotiation_participants`, `negotiation_rounds`, `negotiation_outcomes` |
| Risk | `risk_assessments` |
| Supply Chain | `suppliers`, `equipment`, `shipment_events` |
| Quality | `specification_documents`, `spec_requirements`, `submittals`, `non_conformances` |
| Knowledge | `rfis`, `change_orders` |
| Commissioning | `commissioning_tests` |
| Audit | `audit_logs` |

## Normalization notes

- **3NF throughout.** `trade_contractors` is the single source of truth for a contractor's
  negotiating constraints (crew size, penalty exposure, reliability); `tasks` references it by
  foreign key rather than duplicating contractor attributes.
- **`negotiation_sessions` → `negotiation_outcomes` is 1:1** (a session concludes with exactly
  one resolution), enforced via a `@unique` foreign key — everything upstream of it
  (`negotiation_participants`, `negotiation_rounds`) is 1:many, capturing the full audit trail
  of the alternating-offer protocol rather than just the final answer.
- **`non_conformances`** can trace back to a `submittal`, a `spec_requirement`, and/or a `task`
  independently (all nullable FKs) because a deviation can be raised from any of those contexts
  — e.g. a task-level QA walk vs. a desk review of a submittal.
- **JSON columns** (`initialPositionJson`, `finalPositionJson`, `proposalsJson`,
  `resolutionJson`, `factorsJson`, `payloadJson`) are used only where the shape is inherently
  variable per algorithm version (negotiation offers, risk-factor breakdowns) — every other
  field is a proper typed column, not a JSON blob, so it can be indexed, filtered, and
  constrained normally.

## Indexing strategy

Every foreign key used in a hot-path query has an explicit `@@index`:
- `tasks(projectId)`, `tasks(contractorId)`, `tasks(isCritical)` — dashboard/schedule filtering
- `task_dependencies(successorId)` — CPM backward-pass lookups
- `schedule_conflicts(status)`, `negotiation_sessions(conflictId)` — negotiation board queries
- `risk_assessments(taskId)`, `risk_assessments(riskBand)` — risk dashboard widgets
- `equipment(projectId)`, `equipment(status)` — supply-chain agent
- `submittals(projectId)`, `submittals(status)`, `non_conformances(status)` — QA/QC agent
- `rfis(projectId)`, `rfis(status)` — knowledge agent
- `audit_logs(projectId)`, `audit_logs(entityType, entityId)` — audit trail lookups by record

## Constraints

- `tasks(projectId, wbsCode)` unique — a WBS code is unique within a project
- `task_dependencies(predecessorId, successorId)` unique — no duplicate dependency edges
- `equipment(projectId, tagNumber)`, `submittals(projectId, submittalNumber)`,
  `rfis(projectId, number)`, `change_orders(projectId, number)` unique — real EPC document
  numbering is unique per project by convention; the schema enforces it
- `negotiation_outcomes(sessionId)` unique — one resolution per negotiation session
- All monetary fields (`penaltyExposureInr`, `dailyPenaltyRateInr`, `costImpactInr`) use
  `Decimal(14,2)` / `Decimal(12,2)`, never `Float`, to avoid floating-point rounding on currency
- Cascading deletes (`onDelete: Cascade`) are used only for true parent/child ownership (e.g.
  deleting a project deletes its tasks); reference-only relations (e.g. a task's contractor) use
  the default `Restrict`-equivalent behavior

## Migrations

`prisma/migrations/000001_init/migration.sql` is hand-verified to match `schema.prisma` exactly
(this sandbox's outbound network allowlist blocks `binaries.prisma.sh`, which the Prisma CLI
needs to download its query engine, so the migration was authored directly rather than
CLI-generated — on a normal machine `npm run db:migrate` will generate and apply the identical
migration automatically). Apply it either via:
```bash
npm run db:migrate   # recommended — keeps Prisma's migration history table in sync
```
or by pasting `migration.sql` directly into the Supabase SQL editor.

## Seed data

`prisma/seed.ts` builds one full project (see `docs/DATASETS.md` for sourcing). Notably, task
dates are **not typed in** — they are the output of running the real `computeCriticalPath()`
algorithm over hand-authored durations and a hand-authored dependency graph, and negotiation
outcomes are the output of running the real `negotiateScheduleConflict()` algorithm, not
pre-written numbers.
