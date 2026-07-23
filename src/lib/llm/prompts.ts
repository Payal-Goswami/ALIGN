import { generateExplanation, LlmExplanationResult } from './ollama';

const NEGOTIATION_SYSTEM = `You are a construction PMO assistant. You are given the ALREADY-DECIDED numeric
outcome of a contractor schedule negotiation (computed by a deterministic Nash-bargaining algorithm).
Your only job is to explain, in 3-5 concise sentences, why this split is fair to both contractors and
what it means operationally. Do NOT propose a different split. Do NOT invent numbers not given to you.
Write for a project manager reading this on a dashboard — plain, direct, no headers, no bullet points.`;

export async function explainNegotiationOutcome(facts: {
  contractorAName: string;
  contractorBName: string;
  overlapDays: number;
  splitA: number;
  splitB: number;
  paretoImproving: boolean;
  daysOfDelaySaved: number;
  forcedParty: string;
  conflictDescription: string;
}): Promise<LlmExplanationResult> {
  const userPrompt = `Conflict: ${facts.conflictDescription}
Total overlap to resolve: ${facts.overlapDays} day(s).
Negotiated outcome: ${facts.contractorAName} absorbs ${facts.splitA} day(s), ${facts.contractorBName} absorbs ${facts.splitB} day(s).
Pareto-improving for both parties vs. the uncoordinated PMO-forced fallback (where ${facts.forcedParty === 'A' ? facts.contractorAName : facts.contractorBName} would have absorbed the full ${facts.overlapDays} days alone): ${facts.paretoImproving}.
Estimated schedule days saved vs. the uncoordinated fallback: ${facts.daysOfDelaySaved}.
Explain this outcome to the PMO.`;

  return generateExplanation(NEGOTIATION_SYSTEM, userPrompt, facts, (f) => {
    const ff = f as typeof facts;
    return `The ${ff.overlapDays}-day clash between ${ff.contractorAName} and ${ff.contractorBName} was resolved by splitting the overlap: ${ff.contractorAName} absorbs ${ff.splitA} day(s) and ${ff.contractorBName} absorbs ${ff.splitB} day(s). ${
      ff.paretoImproving
        ? `Both contractors are better off than the uncoordinated fallback, where ${ff.forcedParty === 'A' ? ff.contractorAName : ff.contractorBName} would have absorbed the full ${ff.overlapDays} days alone with no crew replanning window.`
        : 'This clash could not be split without one party being worse off than the forced fallback — it has been flagged for PMO review.'
    } The coordinated split is estimated to save approximately ${ff.daysOfDelaySaved} day(s) of knock-on delay compared to letting the PMO force the outcome after the fact.`;
  });
}

const RISK_SYSTEM = `You are a construction risk analyst assistant. You are given the ALREADY-COMPUTED
risk score and its contributing factors (from a deterministic rule engine) for one schedule task.
Summarize the top 2-3 drivers of this score in 2-3 sentences for a project manager. Do not recompute
or contradict the score. No headers, no bullet points.`;

export async function explainTaskRisk(facts: {
  taskName: string;
  score: number;
  band: string;
  topFactors: { label: string; contribution: number }[];
}): Promise<LlmExplanationResult> {
  const userPrompt = `Task: ${facts.taskName}
Risk score: ${facts.score}/100 (${facts.band})
Top contributing factors: ${facts.topFactors.map((f) => `${f.label} (+${f.contribution.toFixed(1)} pts)`).join(', ')}
Summarize why this task is at this risk level.`;

  return generateExplanation(RISK_SYSTEM, userPrompt, facts, (f) => {
    const ff = f as typeof facts;
    const top = ff.topFactors.slice(0, 2).map((t) => t.label.toLowerCase()).join(' and ');
    return `${ff.taskName} carries a ${ff.band.toLowerCase()} risk score of ${ff.score}/100, driven mainly by ${top}. This task should be monitored closely and considered for a mitigation plan before it threatens the schedule.`;
  });
}

const NC_SYSTEM = `You are a QA/QC reviewer assistant on a data centre construction project. You are given
an ALREADY-DETECTED specification deviation (from a deterministic compliance check). Rephrase the
deviation as a clear, professional non-conformance note for the audit trail, in 2-3 sentences. Do not
change the numbers or the severity.`;

export async function explainNonConformance(facts: {
  deviationDetail: string;
  severity: string;
  submittalTitle: string;
}): Promise<LlmExplanationResult> {
  const userPrompt = `Submittal: ${facts.submittalTitle}
Severity: ${facts.severity}
Raw deviation: ${facts.deviationDetail}
Write the non-conformance note.`;

  return generateExplanation(NC_SYSTEM, userPrompt, facts, (f) => {
    const ff = f as typeof facts;
    return `${ff.deviationDetail} This has been logged as a ${ff.severity.toLowerCase()} non-conformance against "${ff.submittalTitle}" and routed to the QA/QC audit trail for disposition.`;
  });
}

const RFI_SYSTEM = `You are a project knowledge assistant. You are given a new RFI question and a list of
PREVIOUSLY-RETRIEVED similar RFIs (already ranked by a deterministic search algorithm), including their
answers where available. Using ONLY the information given, write a 2-4 sentence answer suggestion that
cites which prior RFI number(s) it draws from. If no prior RFI is closely related, say so plainly and do
not fabricate an answer.`;

export async function synthesizeRfiAnswer(facts: {
  question: string;
  matches: { number: string; subject: string; answerText: string | null; similarity: number }[];
}): Promise<LlmExplanationResult> {
  const matchesText = facts.matches
    .map(
      (m) =>
        `RFI ${m.number} (similarity ${(m.similarity * 100).toFixed(0)}%) — "${m.subject}": ${
          m.answerText ?? 'No answer on file yet.'
        }`
    )
    .join('\n');

  const userPrompt = `New question: ${facts.question}

Retrieved similar prior RFIs:
${matchesText || 'None found above the similarity threshold.'}

Draft a suggested answer, citing RFI numbers.`;

  return generateExplanation(RFI_SYSTEM, userPrompt, facts, (f) => {
    const ff = f as typeof facts;
    if (ff.matches.length === 0) {
      return 'No sufficiently similar prior RFI was found in the project record for this question. Recommend routing to the responsible discipline lead for a first-time answer.';
    }
    const best = ff.matches[0]!;
    return `This question closely resembles RFI ${best.number} ("${best.subject}"), matched at ${(
      best.similarity * 100
    ).toFixed(0)}% textual similarity. ${
      best.answerText
        ? `That RFI was answered: ${best.answerText}`
        : 'That RFI has not yet been answered, so this may be a genuinely open question worth escalating.'
    }`;
  });
}
