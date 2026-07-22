'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, riskBandTone, statusTone } from '@/components/ui/Badge';
import { LoadingPanel } from '@/components/ui/Skeleton';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  project: { name: string; siteName: string; tierTarget: string; capacityMw: number; startDate: string; targetEndDate: string };
  kpis: {
    totalTasks: number;
    criticalPathTasks: number;
    openConflicts: number;
    resolvedConflictsThisMonth: number;
    avgNegotiationDaysSaved: number;
    openNonConformances: number;
    atRiskEquipment: number;
    openRfis: number;
    scheduleHealthScore: number;
  };
  topRiskTasks: { id: string; wbsCode: string; name: string; contractor: string; score: number; band: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE'; isCritical: boolean; totalFloatDays: number }[];
  conflictSummary: { id: string; type: string; severity: string; status: string; daysSaved: number | null }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <>
      <Topbar title="Project Dashboard" subtitle={data?.project.name ?? 'Loading…'} />
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <Card className="mb-6 border-danger/40 bg-danger/5">
            <p className="text-sm text-danger">{error}</p>
            <p className="mt-1 text-2xs text-text-muted">Run <code className="mono-tabular">npm run db:seed</code> after configuring your Supabase DATABASE_URL, then reload.</p>
          </Card>
        )}

        {!data && !error && <LoadingPanel rows={6} />}

        {data && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              <StatCard label="Schedule Health" value={`${data.kpis.scheduleHealthScore}`} sublabel="Composite score / 100" tone={data.kpis.scheduleHealthScore > 70 ? 'success' : data.kpis.scheduleHealthScore > 45 ? 'warning' : 'danger'} />
              <StatCard label="Critical Path Tasks" value={data.kpis.criticalPathTasks} sublabel={`of ${data.kpis.totalTasks} total`} />
              <StatCard label="Open Conflicts" value={data.kpis.openConflicts} tone={data.kpis.openConflicts > 0 ? 'warning' : 'success'} />
              <StatCard label="Avg. Days Saved / Negotiation" value={data.kpis.avgNegotiationDaysSaved} tone="success" />
              <StatCard label="Open Non-Conformances" value={data.kpis.openNonConformances} tone={data.kpis.openNonConformances > 3 ? 'danger' : 'neutral'} />
              <StatCard label="At-Risk Equipment" value={data.kpis.atRiskEquipment} tone={data.kpis.atRiskEquipment > 3 ? 'danger' : 'warning'} />
              <StatCard label="Open RFIs" value={data.kpis.openRfis} />
              <StatCard label="Target Tier" value={data.project.tierTarget} />
              <StatCard label="Capacity" value={`${data.project.capacityMw} MW`} />
              <StatCard label="Site" value={data.project.siteName.split(',')[0] ?? data.project.siteName} />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title="Highest-Risk Tasks"
                  subtitle="Deterministic rule-engine score — float, reliability, NCs, RFIs, equipment, weather"
                  action={
                    <Link href="/schedule" className="text-2xs font-medium text-accent hover:underline">
                      View schedule →
                    </Link>
                  }
                />
                <div className="space-y-2">
                  {data.topRiskTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text-primary">
                          <span className="mono-tabular text-text-muted">{t.wbsCode}</span> · {t.name}
                        </p>
                        <p className="text-2xs text-text-muted">{t.contractor} · float {t.totalFloatDays}d{t.isCritical ? ' · on critical path' : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mono-tabular text-sm font-semibold text-text-primary">{t.score}</span>
                        <Badge tone={riskBandTone(t.band)}>{t.band}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Contractor Negotiation Scheduler"
                  subtitle="Multi-agent Nash-bargaining resolution of schedule clashes"
                  action={
                    <Link href="/negotiation" className="text-2xs font-medium text-accent hover:underline">
                      Open negotiation board →
                    </Link>
                  }
                />
                <div className="space-y-2">
                  {data.conflictSummary.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        {c.status === 'ESCALATED' ? (
                          <AlertTriangle size={14} className="text-danger" />
                        ) : (
                          <TrendingUp size={14} className="text-success" />
                        )}
                        <span className="text-sm text-text-primary">{c.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.daysSaved !== null && <span className="mono-tabular text-2xs text-success">+{c.daysSaved.toFixed(1)}d saved</span>}
                        <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </main>
    </>
  );
}
