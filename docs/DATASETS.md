# Datasets & Data Sourcing

Per the SDS instruction to avoid "meaningless placeholder data" and to document every source,
this file lists what informed the seed data in `prisma/seed.ts`, and why hand-authored
relational data was used where no usable public dataset exists.

## Live, free, no-key public APIs wired into the running application

These are called by the application at request time (not just referenced for seeding):

| Source | Used for | Why this one |
|---|---|---|
| [Open-Meteo](https://open-meteo.com) (`api.open-meteo.com/v1/forecast`) | 16-day precipitation forecast feeding the Predictive Schedule Risk Engine's weather-exposure factor | Free, open-source, no API key, no signup, CC BY 4.0, 10,000 req/day free — verified current as of this build |
| [Nager.Date](https://date.nager.at) (`date.nager.at/api/v3/PublicHolidays`) | Indian public holidays feeding the risk engine's crew-availability factor | Free, open, no API key, covers India (`IN`) |

Both are integrated in `src/lib/external/` and called live from `src/lib/algorithms/riskScore.ts`
call sites — not mocked.

## Public datasets reviewed for structuring the seed data

The following public construction-domain datasets were reviewed to ground the **shape and
realism** of the seed data (field names, typical value ranges, delay-cause taxonomy). None of
their raw rows are redistributed here (most are Kaggle-hosted and outside this sandbox's
network allowlist to download directly); instead, their structure informed how
`prisma/seed.ts` models tasks, delays, and risk factors:

- **Construction Project Management Dataset** (Kaggle, `programmer3/construction-project-management-dataset`) — schedule/cost/risk field structure for real construction projects.
- **Construction Project Resource Dataset** (Kaggle, `programmer3/construction-project-resource-dataset`) — resource allocation field structure.
- **Survey on Road Construction Delay** (Kaggle, `amansaxena/survey-on-road-construction-delay`) — delay-cause taxonomy.
- **BIM-AI Integrated Dataset** (Kaggle, `ziya07/bim-ai-integrated-dataset`) — cost/schedule/structural-health/risk field structure.
- **Construction delay** (Wikipedia, `en.wikipedia.org/wiki/Construction_delay`) — the standard
  delay classification (critical/non-critical, excusable/non-excusable, concurrent/non-concurrent,
  compensable/non-compensable) that informed how `ScheduleConflict` and `RiskAssessment` are
  categorized in the schema.

## Industry standards used for realistic domain structure (not datasets, but public specs)

- **TIA-942-B** (Telecommunications Infrastructure Standard for Data Centers) — structure for
  `SpecificationDocument`/`SpecRequirement` rows and `CommissioningTest.standardRef` values.
- **Uptime Institute Tier III Topology Guide** — Tier III concurrent-maintainability requirement
  modeled in the seeded N+1 chiller redundancy requirement and its associated RFI/non-conformance.
- **BICSI 002-2019** (Data Center Design and Implementation Best Practices) — structured-cabling
  and raised-floor-clearance requirements in the seeded spec requirements.

## Why some data is generated rather than sourced

Per the instruction *"if a required entity has no public dataset, generate ONLY that missing
relational data while maintaining realistic relationships"* — the following are generated,
because no public dataset provides project-specific, internally-consistent EPC records for a
*single named hypothetical project* (which is what a working prototype needs to demonstrate
end-to-end joins across tasks → contractors → conflicts → negotiations → equipment → specs →
non-conformances → RFIs → commissioning):

- **Task list, durations and dependencies** — real data-centre EPC activity names and a
  dependency graph reflecting genuine construction sequencing logic (civil → structural →
  MEP → fit-out → commissioning), but the specific project's 47 tasks are authored, not
  pulled from a dataset. Their **dates are not hand-typed** — they are the output of running
  the real CPM algorithm (`computeCriticalPath()`) over the authored durations/dependencies.
- **Trade contractor constraint profiles** — realistic Indian EPC contractor company names,
  trades, and constraint values (crew size, penalty exposure, reliability) consistent with the
  project scale, used directly by the negotiation engine.
- **Schedule conflicts** — hand-selected genuine clash scenarios (e.g. two trades needing the
  same physical zone in the same week), but their **resolution is not hand-typed** — it is the
  live output of `negotiateScheduleConflict()`.
- **Equipment, suppliers, shipment events** — realistic categories/suppliers/lead-times for
  data-centre long-lead equipment (UPS, generators, chillers, switchgear), with shipment event
  geography interpolated between real supplier-country coordinates and the real project site
  coordinates (Shamshabad, Telangana: 17.4065°N, 78.4772°E).
- **Submittal values and resulting non-conformances** — declared values are authored, but
  **whether each one is compliant, and the exact deviation %, is computed** by
  `checkSubmittalAgainstRequirement()` against the seeded tolerance bands, not pre-decided.
- **RFIs, change orders, commissioning tests** — authored to be internally consistent with the
  non-conformances and conflicts above (e.g. RFI-0142 references the same UPS battery-autonomy
  shortfall that the compliance checker independently flagged from SUB-EL-002).

Every generated record links to at least one other real (or algorithmically-derived) record in
the schema — there are no orphaned or logically-inconsistent rows.
