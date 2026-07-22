# API Reference

All routes are Next.js Route Handlers under `src/app/api/`, returning JSON. None require an
API key (auth would be layered on via Supabase session cookies in a production deployment —
see `docs/DEPLOYMENT.md`).

## `GET /api/dashboard`
Portfolio KPIs: schedule health score, critical-path task count, open conflicts, average
negotiation days saved, open non-conformances, at-risk equipment, open RFIs, top 5 highest-risk
tasks, conflict summary. All computed live from the deterministic algorithms.

## `GET /api/schedule`
All tasks with CPM fields (early/late start/finish, total float, critical flag), contractor,
and a live-computed risk score per task.

## `POST /api/schedule/critical-path`
Recomputes the critical path from the current tasks + dependencies in the database and persists
the refreshed CPM fields. Body: none. Returns `{ recomputedTasks, criticalPathLength,
projectDurationDays }`.

## `GET /api/negotiation/conflicts`
All schedule conflicts with their most recent negotiation session, participants, round-by-round
concession trace, and outcome (including any generated LLM explanation).

## `POST /api/negotiation/resolve`
Body: `{ sessionId: string }`. Generates (or regenerates) the plain-language explanation for an
already-decided negotiation outcome via the local Ollama model, and persists it. Does **not**
recompute the split — that already happened when the conflict was detected/seeded. Returns
`{ explanationText, model, usedFallbackTemplate }`.

## `GET /api/contractors`
All trade contractors with their negotiation-relevant constraint profile (crew size, other
active sites, penalty exposure, reliability score, float-protection bias) and active task count.

## `GET /api/agents/spec-compliance`
Spec documents, submittals (with their governing requirement and declared value), and open
non-conformances.

## `POST /api/agents/spec-compliance`
Body: `{ nonConformanceId: string }`. Generates an LLM-phrased audit-trail note for an
already-computed non-conformance. Returns `{ explanationText, model, usedFallbackTemplate }`.

## `GET /api/agents/supply-chain`
All equipment with supplier info, shipment tracking, and a live-computed risk score + itemized
reasons, sorted highest-risk first. Also returns a severity-band summary.

## `GET /api/agents/rfi`
All RFIs on record.

## `POST /api/agents/rfi`
Body: `{ question: string, excludeRfiId?: string }`. Runs deterministic TF-IDF retrieval over
the RFI corpus, then asks the local LLM to draft a suggested answer using only the retrieved
facts. Returns `{ matches: [...], suggestedAnswer, model, usedFallbackTemplate }`.

---

Every `POST` route that calls the LLM returns `usedFallbackTemplate: true` when Ollama isn't
reachable (or `LLM_DISABLED=true` is set) — the UI shows this transparently so a judge or PMO
always knows whether they're looking at model output or the deterministic fallback.
