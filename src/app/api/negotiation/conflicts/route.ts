import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conflicts = await prisma.scheduleConflict.findMany({
    include: {
      taskA: { include: { contractor: true } },
      taskB: { include: { contractor: true } },
      negotiations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          participants: { include: { contractor: true } },
          rounds: { orderBy: { roundNumber: 'asc' } },
          outcome: true,
        },
      },
    },
    orderBy: { detectedAt: 'desc' },
  });

  return NextResponse.json({
    conflicts: conflicts.map((c) => ({
      id: c.id,
      conflictType: c.conflictType,
      severity: c.severity,
      status: c.status,
      description: c.description,
      detectedAt: c.detectedAt,
      taskA: { id: c.taskA.id, wbsCode: c.taskA.wbsCode, name: c.taskA.name, zone: c.taskA.zone, contractor: c.taskA.contractor?.companyName, isCritical: c.taskA.isCritical },
      taskB: { id: c.taskB.id, wbsCode: c.taskB.wbsCode, name: c.taskB.name, zone: c.taskB.zone, contractor: c.taskB.contractor?.companyName, isCritical: c.taskB.isCritical },
      session: c.negotiations[0]
        ? {
            id: c.negotiations[0].id,
            mechanism: c.negotiations[0].mechanism,
            status: c.negotiations[0].status,
            totalRounds: c.negotiations[0].totalRounds,
            paretoImproving: c.negotiations[0].paretoImproving,
            nashProduct: c.negotiations[0].nashProduct,
            daysOfDelaySaved: c.negotiations[0].daysOfDelaySaved,
            participants: c.negotiations[0].participants.map((p) => ({
              contractorName: p.contractor.companyName,
              reservationValue: p.reservationValue,
              finalPosition: p.finalPositionJson,
              utilityGain: p.utilityGain,
            })),
            rounds: c.negotiations[0].rounds.map((r) => ({
              roundNumber: r.roundNumber,
              proposals: r.proposalsJson,
              concessionGap: r.concessionGap,
              accepted: r.accepted,
            })),
            outcome: c.negotiations[0].outcome
              ? {
                  resolution: c.negotiations[0].outcome.resolutionJson,
                  explanationText: c.negotiations[0].outcome.explanationText,
                  explanationModel: c.negotiations[0].outcome.explanationModel,
                  confidenceScore: c.negotiations[0].outcome.confidenceScore,
                }
              : null,
          }
        : null,
    })),
  });
}
