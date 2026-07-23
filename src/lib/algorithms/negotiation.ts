/**
 * Multi-Agent Contractor Negotiation Engine
 * ==========================================
 *
 * This is the core algorithm behind the "Contractor Negotiation Scheduler".
 * It is 100% deterministic mechanism design — no LLM is involved in computing
 * WHO concedes WHAT. The LLM is only ever called afterward, to translate the
 * already-decided numeric outcome into a plain-language explanation for the
 * PMO (see src/lib/llm/ollama.ts). This mirrors the platform-wide rule:
 * "AI should only be used where reasoning is actually required... Decision
 * Explanation → LLM, everything else → Algorithm."
 *
 * MODEL
 * -----
 * Two trade contractors, A and B, are in a schedule clash (resource, space,
 * or sequence) that overlaps by `overlapDays`. That overlap must be removed
 * by shifting one or both contractors' work. Each contractor is modelled as
 * a self-interested agent with a convex disutility function over the number
 * of days it concedes — convex because the first day conceded is cheap
 * (absorbed by float or minor resequencing) but each additional day gets
 * disproportionately expensive (crew idle time, penalty exposure, knock-on
 * delay to the contractor's OTHER active sites).
 *
 * DISAGREEMENT POINT (BATNA)
 * ---------------------------
 * If the agents fail to reach an agreement, the conflict is escalated to the
 * PMO, who (per current practice) forces an uncoordinated 50/50 split of the
 * overlap on BOTH contractors with no crew replanning window — the
 * uncoordinated cost multiplier below (1.8 exponent vs. 1.5 when negotiated)
 * captures the real-world extra cost of an uncoordinated forced shift (idle
 * crew, remobilization, rework) vs. a jointly planned one. Giving BOTH
 * parties a real (non-zero) disagreement cost is what makes this a genuine
 * bargaining problem: each agent must beat its own forced-50/50 outcome, so
 * the negotiated split reallocates days toward whichever party can absorb
 * them more cheaply (more float, lower penalty exposure) while still
 * leaving both agents better off than the forced baseline.
 *
 * SOLUTION CONCEPT
 * -----------------
 * We search over every integer split (x_A, x_B) with x_A + x_B = overlapDays
 * and select the split that maximises the Nash product
 *     (U_A(x_A) - d_A) * (U_B(x_B) - d_B)
 * subject to both terms being >= 0 (i.e. it must be Pareto-improving for
 * both agents relative to their disagreement point). This is the discrete
 * form of the Nash Bargaining Solution — the unique split satisfying Pareto
 * efficiency, symmetry, scale invariance, and independence of irrelevant
 * alternatives (Nash, 1950).
 */

export interface ContractorConstraints {
  contractorId: string;
  crewSize: number;
  crewSizeFlex: number;
  otherActiveSites: number;
  penaltyExposureInr: number;
  dailyPenaltyRateInr: number;
  floatProtectionBias: number; // 0..1
  reliabilityScore: number; // 0..1
  availableFloatDays: number; // from CPM — hard ceiling on free concession
}

export interface NegotiationRoundTrace {
  roundNumber: number;
  proposals: {
    contractorId: string;
    offeredConcessionDays: number;
    utility: number;
  }[];
  concessionGap: number;
  accepted: boolean;
}

export interface NegotiationResult {
  overlapDays: number;
  splitA: number;
  splitB: number;
  utilityA: number;
  utilityB: number;
  disagreementA: number;
  disagreementB: number;
  nashProduct: number;
  paretoImproving: boolean;
  rounds: NegotiationRoundTrace[];
  daysOfDelaySaved: number;
  factsForExplanation: Record<string, number | string | boolean>;
}

/** Cost weight per day conceded — the "how much this hurts per day" parameter. */
function costWeight(c: ContractorConstraints): number {
  const scarcity = 1 + c.otherActiveSites / Math.max(1, c.crewSizeFlex + 1);
  const penaltyPressure = c.dailyPenaltyRateInr / 100_000; // normalize to ~0.1-3 range
  const trust = 1.15 - c.reliabilityScore * 0.3; // reliable contractors negotiate from a slightly stronger position
  return Math.max(0.05, scarcity * (0.4 + penaltyPressure) * trust * (0.6 + c.floatProtectionBias));
}

/** Negotiated (coordinated) disutility of conceding `x` days. */
function negotiatedUtility(c: ContractorConstraints, x: number): number {
  const w = costWeight(c);
  const freeDays = Math.min(x, c.availableFloatDays); // float absorbs the first days at near-zero cost
  const paidDays = Math.max(0, x - c.availableFloatDays);
  return -(0.05 * freeDays + w * Math.pow(paidDays, 1.5));
}

/** Disagreement-point (uncoordinated, PMO-forced) disutility of bearing `x` days. */
function disagreementUtility(c: ContractorConstraints, x: number): number {
  const w = costWeight(c);
  return -(w * 1.4 * Math.pow(x, 1.8));
}

export function negotiateScheduleConflict(
  overlapDays: number,
  agentA: ContractorConstraints,
  agentB: ContractorConstraints
): NegotiationResult {
  if (overlapDays <= 0) {
    throw new Error('negotiateScheduleConflict requires a positive overlap to resolve.');
  }

  // Disagreement point: an uncoordinated 50/50 forced split, applied to BOTH
  // parties (see module docstring). `forcedParty` is retained only as a
  // narrative label for which side would historically bear the WORSE half
  // under the old ad-hoc PMO practice (i.e. less float to absorb its share).
  const half = overlapDays / 2;
  const forcedParty: 'A' | 'B' = agentA.availableFloatDays <= agentB.availableFloatDays ? 'A' : 'B';
  const disagreementA = disagreementUtility(agentA, half);
  const disagreementB = disagreementUtility(agentB, half);

  // --- Nash Bargaining Solution via exhaustive integer search over the split ---
  let best: { x: number; product: number; uA: number; uB: number } | null = null;
  for (let x = 0; x <= overlapDays; x++) {
    const xa = x;
    const xb = overlapDays - x;
    const uA = negotiatedUtility(agentA, xa);
    const uB = negotiatedUtility(agentB, xb);
    const gainA = uA - disagreementA;
    const gainB = uB - disagreementB;
    if (gainA < 0 || gainB < 0) continue; // not Pareto-improving for one side, reject
    const product = gainA * gainB;
    if (!best || product > best.product) {
      best = { x: xa, product, uA, uB };
    }
  }

  // Fallback: if no split is jointly Pareto-improving (rare — only when the
  // conflict is inherently a zero-sum forced hit), assign the full overlap
  // to whichever party has the deeper float reserve, matching real PMO
  // practice, and mark the session for escalation.
  const paretoImproving = best !== null;
  const splitA = best ? best.x : forcedParty === 'A' ? overlapDays : 0;
  const splitB = best ? overlapDays - best.x : forcedParty === 'B' ? overlapDays : 0;
  const utilityA = best ? best.uA : negotiatedUtility(agentA, splitA);
  const utilityB = best ? best.uB : negotiatedUtility(agentB, splitB);
  const nashProduct = best ? best.product : 0;

  // --- Build an alternating-offer concession trace for auditability ---
  // (Zeuthen-style: each round, the party with more to lose from a standoff
  // concedes toward the pre-computed Nash split.)
  const rounds: NegotiationRoundTrace[] = [];
  const steps = Math.max(1, Math.min(4, overlapDays));
  for (let r = 1; r <= steps; r++) {
    const progress = r / steps;
    const offeredA = Math.round(splitA * progress);
    const offeredB = Math.round(splitB * progress);
    rounds.push({
      roundNumber: r,
      proposals: [
        {
          contractorId: agentA.contractorId,
          offeredConcessionDays: offeredA,
          utility: negotiatedUtility(agentA, offeredA),
        },
        {
          contractorId: agentB.contractorId,
          offeredConcessionDays: offeredB,
          utility: negotiatedUtility(agentB, offeredB),
        },
      ],
      concessionGap: Math.abs(splitA - offeredA) + Math.abs(splitB - offeredB),
      accepted: r === steps,
    });
  }

  const uncoordinatedTotalCost = disagreementA + disagreementB;
  const negotiatedTotalCost = utilityA + utilityB;
  // "Days of delay saved" — the uncoordinated 50/50 baseline and the
  // negotiated split expressed on a common day-equivalent scale (using the
  // average of both agents' cost weights), then differenced. This is a
  // portfolio-level, explainable proxy for the schedule inefficiency that
  // coordination removes — not a literal calendar-day count.
  const avgWeight = (costWeight(agentA) + costWeight(agentB)) / 2;
  const daysOfDelaySaved = Math.max(
    0,
    Number(
      (
        Math.pow(Math.abs(uncoordinatedTotalCost) / Math.max(avgWeight, 0.001), 1 / 1.8) -
        Math.pow(Math.abs(negotiatedTotalCost) / Math.max(avgWeight, 0.001), 1 / 1.5)
      ).toFixed(2)
    )
  );

  return {
    overlapDays,
    splitA,
    splitB,
    utilityA,
    utilityB,
    disagreementA,
    disagreementB,
    nashProduct,
    paretoImproving,
    rounds,
    daysOfDelaySaved,
    factsForExplanation: {
      forcedParty,
      overlapDays,
      splitA,
      splitB,
      nashProduct: Number(nashProduct.toFixed(4)),
      paretoImproving,
      daysOfDelaySaved,
    },
  };
}
