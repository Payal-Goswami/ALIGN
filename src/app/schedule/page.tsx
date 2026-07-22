'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Badge, riskBandTone } from '@/components/ui/Badge';
import { LoadingPanel } from '@/components/ui/Skeleton';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface ScheduleTask {
  id: string;
  wbsCode: string;
  name: string;
  discipline: string;
  zone: string | null;
  contractor: { id: string; name: string } | null;
  plannedStart: string;
  plannedEnd: string;
  durationDays: number;
  percentComplete: number;
  status: string;
  totalFloatDays: number | null;
  isCritical: boolean;
  risk: { score: number; band: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' };
}

const DISCIPLINES = ['All', 'Civil', 'Structural', 'Electrical', 'Mechanical', 'Fire & Life Safety', 'IT Infrastructure', 'Controls', 'Commissioning'];

export default function SchedulePage() {
  const [tasks, setTasks] = useState<ScheduleTask[] | null>(null);
  const [projectDuration, setProjectDuration] = useState<number>(0);
  const [filter, setFilter] = useState('All');
  const [recomputing, setRecomputing] = useState(false);
  const [onlyCritical, setOnlyCritical] = useState(false);

  const load = () => {
    fetch('/api/schedule')
      .then((r) => r.json())
      .then((d) => {
        setTasks(d.tasks);
        setProjectDuration(d.projectDurationDays);
      });
  };

  useEffect(load, []);

  const recompute = async () => {
    setRecomputing(true);
    await fetch('/api/schedule/critical-path', { method: 'POST' });
    load();
    setRecomputing(false);
  };

  const filtered = tasks?.filter((t) => (filter === 'All' || t.discipline === filter) && (!onlyCritical || t.isCritical));

  return (
    <>
      <Topbar title="Critical Path Schedule" subtitle={projectDuration ? `${projectDuration}-day CPM-derived program duration` : undefined} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {DISCIPLINES.map((d) => (
              <button
                key={d}
                onClick={() => setFilter(d)}
                className={clsx(
                  'rounded border px-2.5 py-1 text-2xs font-medium transition-colors',
                  filter === d ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-secondary hover:text-text-primary'
                )}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setOnlyCritical((v) => !v)}
              className={clsx(
                'ml-2 rounded border px-2.5 py-1 text-2xs font-medium transition-colors',
                onlyCritical ? 'border-danger bg-danger/15 text-danger' : 'border-border text-text-secondary hover:text-text-primary'
              )}
            >
              Critical path only
            </button>
          </div>
          <button
            onClick={recompute}
            disabled={recomputing}
            className="flex items-center gap-1.5 rounded border border-border bg-bg-card px-3 py-1.5 text-2xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            <RefreshCw size={13} className={recomputing ? 'animate-spin' : ''} />
            Recompute critical path
          </button>
        </div>

        {!tasks && <LoadingPanel rows={10} />}

        {filtered && (
          <Card padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-2xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2.5 font-medium">WBS</th>
                    <th className="px-4 py-2.5 font-medium">Task</th>
                    <th className="px-4 py-2.5 font-medium">Contractor</th>
                    <th className="px-4 py-2.5 font-medium">Zone</th>
                    <th className="px-4 py-2.5 font-medium">Start</th>
                    <th className="px-4 py-2.5 font-medium">Finish</th>
                    <th className="px-4 py-2.5 font-medium text-right">Duration</th>
                    <th className="px-4 py-2.5 font-medium text-right">Float</th>
                    <th className="px-4 py-2.5 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className={clsx('border-b border-border/60 last:border-0 hover:bg-white/[0.02]', t.isCritical && 'bg-danger/[0.04]')}>
                      <td className="mono-tabular px-4 py-2.5 text-2xs text-text-muted">{t.wbsCode}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {t.isCritical && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" title="Critical path" />}
                          <span className="text-text-primary">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">{t.contractor?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{t.zone ?? '—'}</td>
                      <td className="mono-tabular px-4 py-2.5 text-text-secondary">{format(new Date(t.plannedStart), 'dd MMM yy')}</td>
                      <td className="mono-tabular px-4 py-2.5 text-text-secondary">{format(new Date(t.plannedEnd), 'dd MMM yy')}</td>
                      <td className="mono-tabular px-4 py-2.5 text-right text-text-secondary">{t.durationDays}d</td>
                      <td className={clsx('mono-tabular px-4 py-2.5 text-right', t.isCritical ? 'text-danger' : 'text-text-secondary')}>
                        {t.totalFloatDays}d
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="mono-tabular text-2xs text-text-muted">{t.risk.score}</span>
                          <Badge tone={riskBandTone(t.risk.band)}>{t.risk.band}</Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
