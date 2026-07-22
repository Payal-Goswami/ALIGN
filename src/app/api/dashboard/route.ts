import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computeTaskRiskScore } from '@/lib/algorithms/riskScore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!project) {
    return NextResponse.json({ error: 'No project seeded yet. Run `npm run db:seed`.' }, { status: 404 });
  }

  const [tasks, conflicts, nonConformances, equipment, rfis, negotiationSessions] = await Promise.all([
    prisma.task.findMany({ where: { projectId: project.id }, include: { contractor: true } }),
    prisma.scheduleConflict.findMany({
      where: { taskA: { projectId: project.id } },
      include: { negotiations: { include: { outcome: true } } },
    }),
    prisma.nonConformance.count({ where: { status: 'OPEN' } }),
    prisma.equipment.findMany({ where: { projectId: project.id } }),
    prisma.rFI.count({ where: { projectId: project.id, status: 'OPEN' } }),
    prisma.negotiationSession.findMany({
      where: { conflict: { taskA: { projectId: project.id } } },
      include: { outcome: true },
    }),
  ]);

  const criticalPathTasks = tasks.filter((t) => t.isCritical).length;
  const openConflicts = conflicts.filter((c) => c.status === 'OPEN' || c.status === 'NEGOTIATING').length;
  const resolvedConflicts = conflicts.filter((c) => c.status === 'RESOLVED').length;

  const converged = negotiationSessions.filter((s) => s.status === 'CONVERGED' && s.daysOfDelaySaved != null);
  const avgDaysSaved = converged.length
    ? converged.reduce((sum, s) => sum + (s.daysOfDelaySaved ?? 0), 0) / converged.length
    : 0;

  // At-risk equipment: quick deterministic pass reusing the same rule engine as the supply-chain agent.
  const today = new Date();
  const atRiskEquipment = equipment.filter((e) => {
    const bestEstimate = e.actualDelivery ?? e.revisedDelivery ?? e.promisedDelivery;
    return bestEstimate.getTime() > e.promisedDelivery.getTime() + 10 * 86_400_000 || e.status === 'DELAYED';
  }).length;

  // Composite schedule health score (0-100): weighted rollup of the same
  // signals the risk engine uses per-task, aggregated to portfolio level.
  const avgFloat =
    tasks.reduce((s, t) => s + Math.max(0, Math.min(30, t.totalFloatDays ?? 0)), 0) / Math.max(1, tasks.length);
  const criticalRatio = criticalPathTasks / Math.max(1, tasks.length);
  const conflictPenalty = Math.min(25, openConflicts * 6);
  const ncPenalty = Math.min(20, nonConformances * 3);
  const equipPenalty = Math.min(20, atRiskEquipment * 3);
  const scheduleHealthScore = Math.max(
    0,
    Math.round(100 - criticalRatio * 30 - conflictPenalty - ncPenalty - equipPenalty + Math.min(10, avgFloat / 3))
  );

  // Top 5 highest-risk tasks (live rule-engine scoring for the dashboard widget)
  const riskScored = tasks
    .filter((t) => t.status !== 'COMPLETE')
    .map((t) => {
      const risk = computeTaskRiskScore({
        totalFloatDays: t.totalFloatDays ?? 0,
        isCritical: t.isCritical,
        contractorReliabilityScore: t.contractor?.reliabilityScore ?? 0.75,
        openNonConformanceCount: 0,
        openRfiCount: 0,
        linkedEquipmentDelayDays: 0,
        weatherRiskDays: 0,
        isHolidayOverlap: false,
        percentComplete: t.percentComplete,
        durationDays: t.durationDays,
      });
      return { task: t, risk };
    })
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, 5);

  return NextResponse.json({
    project,
    kpis: {
      totalTasks: tasks.length,
      criticalPathTasks,
      openConflicts,
      resolvedConflictsThisMonth: resolvedConflicts,
      avgNegotiationDaysSaved: Number(avgDaysSaved.toFixed(1)),
      openNonConformances: nonConformances,
      atRiskEquipment,
      openRfis: rfis,
      scheduleHealthScore,
    },
    topRiskTasks: riskScored.map(({ task, risk }) => ({
      id: task.id,
      wbsCode: task.wbsCode,
      name: task.name,
      contractor: task.contractor?.companyName,
      score: risk.score,
      band: risk.band,
      isCritical: task.isCritical,
      totalFloatDays: task.totalFloatDays,
    })),
    conflictSummary: conflicts.map((c) => ({
      id: c.id,
      type: c.conflictType,
      severity: c.severity,
      status: c.status,
      daysSaved: c.negotiations[0]?.daysOfDelaySaved ?? null,
    })),
  });
}
