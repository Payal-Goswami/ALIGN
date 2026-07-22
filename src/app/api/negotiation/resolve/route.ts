import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { explainNegotiationOutcome } from '@/lib/llm/prompts';

export const dynamic = 'force-dynamic';

/**
 * Generates (or regenerates) the plain-language explanation for an already
 * -computed negotiation outcome. The split itself was decided by
 * negotiateScheduleConflict() at seed/detection time — this route ONLY
 * calls the LLM to phrase the explanation, per the platform's
 * algorithm-decides / LLM-explains separation of concerns.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body.sessionId;
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

  const session = await prisma.negotiationSession.findUnique({
    where: { id: sessionId },
    include: {
      conflict: { include: { taskA: true, taskB: true } },
      participants: { include: { contractor: true } },
      outcome: true,
    },
  });
  if (!session) return NextResponse.json({ error: 'Negotiation session not found' }, { status: 404 });
  if (!session.outcome) return NextResponse.json({ error: 'Session has no outcome yet' }, { status: 409 });

  const [participantA, participantB] = session.participants;
  const forcedParty = (session.outcome.resolutionJson as Record<string, { concessionDays: number }>);
  const daysA = forcedParty[session.conflict.taskAId]?.concessionDays ?? 0;
  const daysB = forcedParty[session.conflict.taskBId]?.concessionDays ?? 0;

  const result = await explainNegotiationOutcome({
    contractorAName: participantA?.contractor.companyName ?? 'Contractor A',
    contractorBName: participantB?.contractor.companyName ?? 'Contractor B',
    overlapDays: daysA + daysB,
    splitA: daysA,
    splitB: daysB,
    paretoImproving: session.paretoImproving ?? false,
    daysOfDelaySaved: session.daysOfDelaySaved ?? 0,
    forcedParty: daysA >= daysB ? 'A' : 'B',
    conflictDescription: session.conflict.description,
  });

  await prisma.negotiationOutcome.update({
    where: { id: session.outcome.id },
    data: { explanationText: result.text, explanationModel: result.model },
  });

  return NextResponse.json({
    explanationText: result.text,
    model: result.model,
    usedFallbackTemplate: result.usedFallbackTemplate,
  });
}
