/**
 * Specification & Quality Compliance Agent — deterministic checking layer.
 *
 * Compares a vendor submittal's declared value against the governing spec
 * requirement (with numeric tolerance band or exact-match string rule) and
 * produces a structured deviation record. The LLM is only used afterward to
 * phrase the non-conformance description in reviewer-friendly language —
 * the PASS/FAIL/severity decision itself is 100% rule-based and reproducible.
 */

export interface RequirementCheckInput {
  clauseRef: string;
  parameter: string;
  requiredValue: string;
  unit: string | null;
  toleranceLow: number | null;
  toleranceHigh: number | null;
  submittedValue: string;
}

export interface ComplianceResult {
  compliant: boolean;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL' | null;
  deviationDetail: string;
  percentDeviation: number | null;
}

function tryParseNumeric(v: string): number | null {
  const cleaned = v.replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function checkSubmittalAgainstRequirement(input: RequirementCheckInput): ComplianceResult {
  const requiredNum = tryParseNumeric(input.requiredValue);
  const submittedNum = tryParseNumeric(input.submittedValue);

  // --- Numeric requirement with tolerance band ---
  if (requiredNum !== null && submittedNum !== null && (input.toleranceLow !== null || input.toleranceHigh !== null)) {
    const low = input.toleranceLow ?? requiredNum;
    const high = input.toleranceHigh ?? requiredNum;
    const inBand = submittedNum >= low && submittedNum <= high;
    const percentDeviation = ((submittedNum - requiredNum) / (requiredNum || 1)) * 100;

    if (inBand) {
      return { compliant: true, severity: null, deviationDetail: '', percentDeviation };
    }

    const absPct = Math.abs(percentDeviation);
    const severity: ComplianceResult['severity'] = absPct > 20 ? 'CRITICAL' : absPct > 8 ? 'MAJOR' : 'MINOR';

    return {
      compliant: false,
      severity,
      deviationDetail: `Clause ${input.clauseRef} (${input.parameter}): required ${requiredNum}${input.unit ?? ''} within [${low}, ${high}], submittal declares ${submittedNum}${input.unit ?? ''} — ${percentDeviation >= 0 ? '+' : ''}${percentDeviation.toFixed(1)}% deviation.`,
      percentDeviation,
    };
  }

  // --- Exact-match / categorical requirement ---
  const normalizedReq = input.requiredValue.trim().toLowerCase();
  const normalizedSub = input.submittedValue.trim().toLowerCase();
  if (normalizedReq === normalizedSub) {
    return { compliant: true, severity: null, deviationDetail: '', percentDeviation: null };
  }

  return {
    compliant: false,
    severity: 'MAJOR',
    deviationDetail: `Clause ${input.clauseRef} (${input.parameter}): required "${input.requiredValue}", submittal declares "${input.submittedValue}" — categorical mismatch.`,
    percentDeviation: null,
  };
}
