import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const contractors = await prisma.tradeContractor.findMany({
    include: { _count: { select: { tasks: true } } },
    orderBy: { companyName: 'asc' },
  });

  return NextResponse.json({
    contractors: contractors.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      trade: c.trade,
      crewSize: c.crewSize,
      crewSizeFlex: c.crewSizeFlex,
      otherActiveSites: c.otherActiveSites,
      penaltyExposureInr: c.penaltyExposureInr.toString(),
      dailyPenaltyRateInr: c.dailyPenaltyRateInr.toString(),
      reliabilityScore: c.reliabilityScore,
      floatProtectionBias: c.floatProtectionBias,
      taskCount: c._count.tasks,
      contactName: c.contactName,
      contactPhone: c.contactPhone,
    })),
  });
}
