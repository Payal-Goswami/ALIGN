import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computeTaskRiskScore } from '@/lib/algorithms/riskScore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!project) return NextResponse.json({ error: 'No project seeded yet.' }, { status: 404 });

  const [tasks, nonConformances, rfis] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: project.id },
      include: { contractor: true },
      orderBy: { earlyStart: 'asc' },
    }),
    prisma.nonConformance.findMany({ where: { taskId: { not: null } } }),
    prisma.rFI.findMany({ where: { projectId: project.id, taskId: { not: null } } }),
  ]);

  const ncByTask = new Map<string, number>();
  for (const nc of nonConformances) {
    if (nc.taskId && nc.status === 'OPEN') ncByTask.set(nc.taskId, (ncByTask.get(nc.taskId) ?? 0) + 1);
  }
  const rfiByTask = new Map<string, number>();
  for (const r of rfis) {
    if (r.taskId && r.status === 'OPEN') rfiByTask.set(r.taskId, (rfiByTask.get(r.taskId) ?? 0) + 1);
  }

  const enriched = tasks.map((t) => {
    const risk = computeTaskRiskScore({
      totalFloatDays: t.totalFloatDays ?? 0,
      isCritical: t.isCritical,
      contractorReliabilityScore: t.contractor?.reliabilityScore ?? 0.75,
      openNonConformanceCount: ncByTask.get(t.id) ?? 0,
      openRfiCount: rfiByTask.get(t.id) ?? 0,
      linkedEquipmentDelayDays: 0,
      weatherRiskDays: 0,
      isHolidayOverlap: false,
      percentComplete: t.percentComplete,
      durationDays: t.durationDays,
    });
    return {
      id: t.id,
      wbsCode: t.wbsCode,
      name: t.name,
      discipline: t.discipline,
      system: t.system,
      zone: t.zone,
      contractor: t.contractor ? { id: t.contractor.id, name: t.contractor.companyName } : null,
      plannedStart: t.plannedStart,
      plannedEnd: t.plannedEnd,
      durationDays: t.durationDays,
      percentComplete: t.percentComplete,
      status: t.status,
      earlyStart: t.earlyStart,
      earlyFinish: t.earlyFinish,
      lateStart: t.lateStart,
      lateFinish: t.lateFinish,
      totalFloatDays: t.totalFloatDays,
      isCritical: t.isCritical,
      risk: { score: risk.score, band: risk.band },
    };
  });

  const projectDurationDays = Math.max(...tasks.map((t) => t.earlyFinish ?? 0), 0);

  return NextResponse.json({ tasks: enriched, projectDurationDays, projectStart: project.startDate });
}
