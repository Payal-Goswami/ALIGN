/**
 * Supply Chain Visibility & Risk Agent — deterministic scoring.
 *
 * Flags at-risk equipment shipments purely from dates, supplier history and
 * buffer-to-required-on-site — no LLM in the scoring path.
 */

export interface EquipmentRiskInput {
  promisedDelivery: Date;
  revisedDelivery: Date | null;
  actualDelivery: Date | null;
  requiredOnSiteDate: Date; // derived from the task that consumes this equipment
  supplierReliabilityScore: number; // 0..1
  supplierTier: number; // 1 = direct OEM, higher = more hops = more risk
  isLongLead: boolean;
  today: Date;
}

export interface EquipmentRiskResult {
  score: number; // 0..100
  band: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  bufferDays: number; // days between (best known delivery estimate) and required-on-site date
  slippedDays: number; // revised vs promised
  reasons: string[];
}

export function computeEquipmentRisk(input: EquipmentRiskInput): EquipmentRiskResult {
  const bestEstimate = input.actualDelivery ?? input.revisedDelivery ?? input.promisedDelivery;
  const bufferDays = Math.round(
    (input.requiredOnSiteDate.getTime() - bestEstimate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const slippedDays = input.revisedDelivery
    ? Math.round((input.revisedDelivery.getTime() - input.promisedDelivery.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const reasons: string[] = [];
  let score = 0;

  // Buffer erosion — the dominant factor.
  if (bufferDays < 0) {
    score += 45;
    reasons.push(`Projected delivery is ${Math.abs(bufferDays)} day(s) AFTER the date it is required on site.`);
  } else if (bufferDays < 7) {
    score += 30;
    reasons.push(`Only ${bufferDays} day(s) of buffer before it is required on site.`);
  } else if (bufferDays < 14) {
    score += 12;
    reasons.push(`${bufferDays} days of buffer — tightening but not yet critical.`);
  }

  // Slippage already observed vs. original promise.
  if (slippedDays > 0) {
    const slipScore = Math.min(25, slippedDays * 1.2);
    score += slipScore;
    reasons.push(`Delivery has already slipped ${slippedDays} day(s) from the original promised date.`);
  }

  // Supplier reliability.
  const reliabilityScore = (1 - input.supplierReliabilityScore) * 15;
  score += reliabilityScore;
  if (input.supplierReliabilityScore < 0.7) {
    reasons.push(`Supplier historical on-time delivery is ${(input.supplierReliabilityScore * 100).toFixed(0)}%.`);
  }

  // Multi-tier supply chain adds coordination risk.
  if (input.supplierTier > 1) {
    const tierScore = Math.min(10, (input.supplierTier - 1) * 5);
    score += tierScore;
    reasons.push(`Sourced through a Tier-${input.supplierTier} sub-supplier, adding coordination risk.`);
  }

  // Long-lead items compound any slip because there is little recovery room.
  if (input.isLongLead) {
    score += 5;
    reasons.push('Classified as long-lead equipment — limited ability to expedite if delayed further.');
  }

  const finalScore = Math.round(Math.min(100, score));
  let band: EquipmentRiskResult['band'] = 'LOW';
  if (finalScore >= 70) band = 'SEVERE';
  else if (finalScore >= 45) band = 'HIGH';
  else if (finalScore >= 20) band = 'MODERATE';

  return { score: finalScore, band, bufferDays, slippedDays, reasons };
}
