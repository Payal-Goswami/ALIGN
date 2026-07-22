# Agent Flow

Every agent in this platform follows the same shape, per the design rule "an LLM should never
directly replace business logic":

```
   Business Logic  →  Algorithm  →  Structured Output  →  [Optional LLM reasoning]
```

## 1. Multi-Agent Contractor Negotiation Scheduler

**File**: `src/lib/algorithms/negotiation.ts` · **API**: `/api/negotiation/*`

```
ScheduleConflict detected (resource / space / sequence / crew-overcommit clash)
        │
        ▼
Compute overlapDays (from the two tasks' CPM-derived planned dates)
        │
        ▼
Build two ContractorConstraints objects (crew size, other active sites,
penalty exposure, float-protection bias, reliability, available float
from the CPM cache)
        │
        ▼
negotiateScheduleConflict(overlapDays, agentA, agentB)   ← ALGORITHM
  1. Disagreement point: uncoordinated 50/50 forced split, high-exponent
     cost for BOTH agents (Zeuthen-style forced baseline)
  2. Exhaustive integer search over every (x_A, x_B) split summing to
     overlapDays; keep only Pareto-improving splits (both agents' gain
     over disagreement ≥ 0); pick the one maximizing the Nash product
     (gain_A × gain_B) — the discrete Nash Bargaining Solution
  3. Synthesize an alternating-offer round trace for auditability
        │
        ▼
Persisted: NegotiationSession, NegotiationParticipant ×2,
           NegotiationRound × N, NegotiationOutcome
        │
        ▼ (on demand, PMO clicks "Generate explanation")
explainNegotiationOutcome() → Ollama (Qwen2.5 / Gemma / Llama / Mistral)  ← LLM
  Given ONLY the already-decided facts (split, Pareto-improving?, days
  saved), phrase 3–5 sentences for the PMO dashboard. Falls back to a
  deterministic template if Ollama isn't running.
```

## 2. Predictive Schedule Risk Engine

**File**: `src/lib/algorithms/riskScore.ts` · **API**: `/api/dashboard`, `/api/schedule`

```
For each task: gather float (from CPM), contractor reliability, open
non-conformances, open RFIs, upstream equipment slip, weather-risk days
(Open-Meteo), holiday overlap (Nager.Date)
        │
        ▼
computeTaskRiskScore()   ← ALGORITHM (explainable weighted linear model,
                             weights sum to 100, fully auditable per factor)
        │
        ▼
0–100 score + band (LOW/MODERATE/HIGH/SEVERE) + itemized factor breakdown
        │
        ▼ (optional)
explainTaskRisk() → Ollama   ← LLM (summarizes top 2-3 drivers in prose)
```

## 3. Specification & Quality Compliance Agent

**File**: `src/lib/algorithms/specCompliance.ts` · **API**: `/api/agents/spec-compliance`

```
Submittal declares a value against a SpecRequirement (clause, required
value, tolerance band OR categorical match)
        │
        ▼
checkSubmittalAgainstRequirement()   ← ALGORITHM
  - Numeric + tolerance band → in/out-of-band check, % deviation,
    severity (MINOR/MAJOR/CRITICAL by deviation magnitude)
  - Categorical → exact-match check
        │
        ▼
NonConformance row created automatically if non-compliant, logged to the
QA/QC audit trail with a fully computed deviationDetail string
        │
        ▼ (on demand)
explainNonConformance() → Ollama   ← LLM (rephrases the computed deviation
                                      as a professional audit note; cannot
                                      change the severity or the numbers)
```

## 4. Supply Chain Visibility & Risk Agent

**File**: `src/lib/algorithms/supplyChainRisk.ts` · **API**: `/api/agents/supply-chain`

```
Equipment row (promised/revised/actual delivery, supplier tier &
reliability, long-lead flag) + required-on-site date
        │
        ▼
computeEquipmentRisk()   ← ALGORITHM (buffer erosion, slip, supplier
                             reliability, tier, long-lead — each with an
                             explicit, printed reason string)
        │
        ▼
0–100 score + band + itemized reasons — no LLM call in this agent at all;
the reasons are already plain language because the rule engine authors
them directly.
```

## 5. Project Knowledge & RFI Intelligence Agent

**File**: `src/lib/algorithms/rfiSearch.ts` · **API**: `/api/agents/rfi`

```
New question typed by an engineer
        │
        ▼
findSimilarRfis()   ← ALGORITHM (TF-IDF vectorization + cosine similarity
                        over the RFI corpus's subject+question text —
                        this is the "R" in RAG, and it is 100%
                        deterministic and free — no embeddings API)
        │
        ▼
Top-5 ranked prior RFIs (with similarity score, answer text if any)
        │
        ▼
synthesizeRfiAnswer() → Ollama   ← LLM (drafts a suggested answer citing
                                    RFI numbers, USING ONLY the retrieved
                                    facts — told explicitly not to
                                    fabricate when no good match exists)
```

## Why this separation matters for accuracy

An LLM asked to "decide" a schedule split, a pass/fail, or a risk score will produce a
plausible-sounding but non-reproducible number that can silently drift between runs and cannot
be defended in a compliance audit. Every number a PMO or QA/QC lead relies on in this platform
comes from a named, versioned, unit-tested function in `src/lib/algorithms/`. The LLM's job is
strictly narrower and safer: turning an already-correct structured result into a sentence a
human can read quickly — which is also the one place a model's fluency genuinely adds value.
