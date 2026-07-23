/**
 * Predictive Schedule Risk Engine — deterministic rule engine.
 *
 * Produces a 0-100 risk score per task from explainable, weighted factors.
 * No LLM involved in scoring (per platform rule: "Risk Score → ML / Rule
 * Engine"). The LLM layer only summarises the top drivers into a sentence
 * for the dashboard — see src/lib/llm/ollama.ts.
 */

export interface RiskFactorInputs {
  totalFloatDays: number;
  isCritical: boolean;
  contractorReliabilityScore: number; // 0..1
  openNonConformanceCount: number;
  openRfiCount: number;
  linkedEquipmentDelayDays: number; // max slip among equipment this task depends on
  weatherRiskDays: number; // count of high-precipitation days forecast within task window
  isHolidayOverlap: boolean; // task window overlaps a public holiday (crew availability risk)
  percentComplete: number;
  durationDays: number;
}

export interface RiskResult {
  score: number; // 0..100
  band: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  factors: { label: string; contribution: number; weight: number; rawValue: number | boolean }[];
}

/**
 * Each factor contributes 0..weight points. Weights sum to 100.
 * This is intentionally an explainable linear scoring model (common in EPC
 * QA/risk registers) rather than a black-box ML model, so every point on
 * the dashboard can be traced to a named, auditable cause.
 */
export function computeTaskRiskScore(input: RiskFactorInputs): RiskResult {
  const factors: RiskResult['factors'] = [];

  // 1. Float exhaustion (weight 30) — zero/negative float is maximal risk.
  const floatWeight = 30;
  const floatContribution = input.isCritical
    ? floatWeight
    : Math.max(0, floatWeight * (1 - Math.min(input.totalFloatDays, 15) / 15));
  factors.push({
    label: 'Schedule float exhaustion',
    contribution: floatContribution,
    weight: floatWeight,
    rawValue: input.totalFloatDays,
  });

  // 2. Contractor reliability (weight 15)
  const reliabilityWeight = 15;
  const reliabilityContribution = reliabilityWeight * (1 - input.contractorReliabilityScore);
  factors.push({
    label: 'Contractor historical reliability',
    contribution: reliabilityContribution,
    weight: reliabilityWeight,
    rawValue: input.contractorReliabilityScore,
  });

  // 3. Open non-conformances tied to this task (weight 15)
  const ncWeight = 15;
  const ncContribution = Math.min(ncWeight, input.openNonConformanceCount * 5);
  factors.push({
    label: 'Open non-conformances',
    contribution: ncContribution,
    weight: ncWeight,
    rawValue: input.openNonConformanceCount,
  });

  // 4. Open RFIs tied to this task (weight 10)
  const rfiWeight = 10;
  const rfiContribution = Math.min(rfiWeight, input.openRfiCount * 4);
  factors.push({
    label: 'Unresolved RFIs',
    contribution: rfiContribution,
    weight: rfiWeight,
    rawValue: input.openRfiCount,
  });

  // 5. Upstream equipment delivery slip (weight 15)
  const equipWeight = 15;
  const equipContribution = Math.min(equipWeight, input.linkedEquipmentDelayDays * 1.5);
  factors.push({
    label: 'Upstream equipment delivery slip',
    contribution: equipContribution,
    weight: equipWeight,
    rawValue: input.linkedEquipmentDelayDays,
  });

  // 6. Weather exposure (weight 10)
  const weatherWeight = 10;
  const weatherContribution = Math.min(weatherWeight, input.weatherRiskDays * 2.5);
  factors.push({
    label: 'Adverse weather days in window',
    contribution: weatherContribution,
    weight: weatherWeight,
    rawValue: input.weatherRiskDays,
  });

  // 7. Public holiday overlap / crew availability (weight 5)
  const holidayWeight = 5;
  const holidayContribution = input.isHolidayOverlap ? holidayWeight : 0;
  factors.push({
    label: 'Public holiday overlapping task window',
    contribution: holidayContribution,
    weight: holidayWeight,
    rawValue: input.isHolidayOverlap,
  });

  const rawScore = factors.reduce((sum, f) => sum + f.contribution, 0);

  // Behind-schedule tasks that are already far along are slightly de-risked
  // (less remaining exposure); this is a bounded adjustment, not a factor.
  const progressDamping = 1 - Math.min(0.15, input.percentComplete / 100 / 3);
  const score = Math.round(Math.min(100, rawScore * progressDamping));

  let band: RiskResult['band'] = 'LOW';
  if (score >= 75) band = 'SEVERE';
  else if (score >= 50) band = 'HIGH';
  else if (score >= 25) band = 'MODERATE';

  return { score, band, factors };
}
