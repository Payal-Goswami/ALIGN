import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computeCriticalPath } from '@/lib/algorithms/criticalPath';

export const dynamic = 'force-dynamic';

/**
 * Recomputes the critical path from scratch (tasks + dependencies currently
 * in the database) and persists the refreshed CPM fields. Call this after
 * any task duration/dependency edit — this is the deterministic algorithm
 * described in the SDS ("Critical Path → Algorithm"), not an LLM call.
 */
export async function POST() {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!project) return NextResponse.json({ error: 'No project seeded yet.' }, { status: 404 });

  const [tasks, dependencies] = await Promise.all([
    prisma.task.findMany({ where: { projectId: project.id } }),
    prisma.taskDependency.findMany({ where: { predecessor: { projectId: project.id } } }),
  ]);

  const results = computeCriticalPath(
    tasks.map((t) => ({ id: t.id, durationDays: t.durationDays })),
    dependencies.map((d) => ({ predecessorId: d.predecessorId, successorId: d.successorId, type: d.type, lagDays: d.lagDays }))
  );

  await prisma.$transaction(
    results.map((r) =>
      prisma.task.update({
        where: { id: r.id },
        data: {
          earlyStart: r.earlyStart,
          earlyFinish: r.earlyFinish,
          lateStart: r.lateStart,
          lateFinish: r.lateFinish,
          totalFloatDays: r.totalFloatDays,
          isCritical: r.isCritical,
          cpmComputedAt: new Date(),
        },
      })
    )
  );

  return NextResponse.json({
    recomputedTasks: results.length,
    criticalPathLength: results.filter((r) => r.isCritical).length,
    projectDurationDays: Math.max(...results.map((r) => r.earlyFinish)),
  });
}
