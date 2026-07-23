/**
 * Critical Path Method (CPM) — deterministic forward/backward pass.
 *
 * This is pure graph algorithm, per the platform's design rule:
 * "Critical Path → Algorithm" (never an LLM). The output of this module
 * feeds the risk engine, the negotiation engine (to know which tasks carry
 * zero float and therefore cannot absorb concessions), and the dashboard.
 */

export interface CpmTaskInput {
  id: string;
  durationDays: number;
}

export interface CpmDependencyInput {
  predecessorId: string;
  successorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
}

export interface CpmResult {
  id: string;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloatDays: number;
  isCritical: boolean;
}

/**
 * Computes CPM over a DAG of tasks. Day offsets are relative to project day 0.
 * Supports Finish-to-Start (the dominant EPC schedule link type) fully, and
 * approximates SS/FF/SF via lag-adjusted offsets — sufficient for portfolio-level
 * critical path detection across trade contractor packages.
 */
export function computeCriticalPath(
  tasks: CpmTaskInput[],
  dependencies: CpmDependencyInput[]
): CpmResult[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const predecessorsOf = new Map<string, CpmDependencyInput[]>();
  const successorsOf = new Map<string, CpmDependencyInput[]>();

  for (const t of tasks) {
    predecessorsOf.set(t.id, []);
    successorsOf.set(t.id, []);
  }
  for (const dep of dependencies) {
    if (!taskMap.has(dep.predecessorId) || !taskMap.has(dep.successorId)) continue;
    predecessorsOf.get(dep.successorId)!.push(dep);
    successorsOf.get(dep.predecessorId)!.push(dep);
  }

  // Topological sort (Kahn's algorithm) — required before the forward pass.
  const inDegree = new Map<string, number>();
  for (const t of tasks) inDegree.set(t.id, predecessorsOf.get(t.id)!.length);
  const queue: string[] = tasks.filter((t) => inDegree.get(t.id) === 0).map((t) => t.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const dep of successorsOf.get(id) ?? []) {
      const remaining = (inDegree.get(dep.successorId) ?? 0) - 1;
      inDegree.set(dep.successorId, remaining);
      if (remaining === 0) queue.push(dep.successorId);
    }
  }
  if (order.length !== tasks.length) {
    throw new Error(
      `Schedule dependency graph contains a cycle — CPM cannot be computed until it is resolved (processed ${order.length}/${tasks.length} tasks).`
    );
  }

  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  // Forward pass
  for (const id of order) {
    const preds = predecessorsOf.get(id)!;
    const dur = taskMap.get(id)!.durationDays;
    let es = 0;
    for (const dep of preds) {
      const predEF = earlyFinish.get(dep.predecessorId) ?? 0;
      const predES = earlyStart.get(dep.predecessorId) ?? 0;
      let candidate: number;
      switch (dep.type) {
        case 'SS':
          candidate = predES + dep.lagDays;
          break;
        case 'FF':
          candidate = predEF + dep.lagDays - dur;
          break;
        case 'SF':
          candidate = predES + dep.lagDays - dur;
          break;
        case 'FS':
        default:
          candidate = predEF + dep.lagDays;
      }
      es = Math.max(es, candidate);
    }
    earlyStart.set(id, es);
    earlyFinish.set(id, es + dur);
  }

  const projectDuration = Math.max(0, ...order.map((id) => earlyFinish.get(id) ?? 0));

  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();

  // Backward pass
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]!;
    const succs = successorsOf.get(id)!;
    const dur = taskMap.get(id)!.durationDays;
    let lf = succs.length === 0 ? projectDuration : Infinity;
    for (const dep of succs) {
      const succLS = lateStart.get(dep.successorId) ?? projectDuration;
      const succLF = lateFinish.get(dep.successorId) ?? projectDuration;
      let candidate: number;
      switch (dep.type) {
        case 'SS':
          candidate = succLS - dep.lagDays + dur;
          break;
        case 'FF':
          candidate = succLF - dep.lagDays;
          break;
        case 'SF':
          candidate = succLF - dep.lagDays + dur;
          break;
        case 'FS':
        default:
          candidate = succLS - dep.lagDays;
      }
      lf = Math.min(lf, candidate);
    }
    if (!isFinite(lf)) lf = projectDuration;
    lateFinish.set(id, lf);
    lateStart.set(id, lf - dur);
  }

  return order.map((id) => {
    const es = earlyStart.get(id)!;
    const ef = earlyFinish.get(id)!;
    const ls = lateStart.get(id)!;
    const lf = lateFinish.get(id)!;
    const float = ls - es;
    return {
      id,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloatDays: float,
      isCritical: float <= 0,
    };
  });
}
