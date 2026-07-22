'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { LoadingPanel } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface Contractor {
  id: string;
  companyName: string;
  trade: string;
  crewSize: number;
  crewSizeFlex: number;
  otherActiveSites: number;
  penaltyExposureInr: string;
  dailyPenaltyRateInr: string;
  reliabilityScore: number;
  floatProtectionBias: number;
  taskCount: number;
  contactName: string;
  contactPhone: string;
}

function formatInr(v: string) {
  const n = Number(v);
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[] | null>(null);

  useEffect(() => {
    fetch('/api/contractors')
      .then((r) => r.json())
      .then((d) => setContractors(d.contractors));
  }, []);

  return (
    <>
      <Topbar title="Trade Contractors" subtitle="Constraint profiles used by the negotiation engine's autonomous agents" />
      <main className="flex-1 overflow-y-auto p-6">
        {!contractors && <LoadingPanel rows={6} />}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contractors?.map((c) => (
            <Card key={c.id}>
              <p className="text-sm font-semibold text-text-primary">{c.companyName}</p>
              <p className="mb-3 text-2xs text-text-muted">{c.trade}</p>

              <div className="mb-3 grid grid-cols-2 gap-2 text-2xs">
                <div>
                  <p className="text-text-muted">Crew size</p>
                  <p className="mono-tabular text-text-secondary">{c.crewSize} (+{c.crewSizeFlex} flex)</p>
                </div>
                <div>
                  <p className="text-text-muted">Other active sites</p>
                  <p className="mono-tabular text-text-secondary">{c.otherActiveSites}</p>
                </div>
                <div>
                  <p className="text-text-muted">Penalty exposure</p>
                  <p className="mono-tabular text-text-secondary">{formatInr(c.penaltyExposureInr)}</p>
                </div>
                <div>
                  <p className="text-text-muted">Daily penalty rate</p>
                  <p className="mono-tabular text-text-secondary">{formatInr(c.dailyPenaltyRateInr)}/day</p>
                </div>
              </div>

              <div className="mb-1 flex items-center justify-between text-2xs">
                <span className="text-text-muted">Reliability score</span>
                <span className="mono-tabular text-text-secondary">{(c.reliabilityScore * 100).toFixed(0)}%</span>
              </div>
              <ProgressBar value={c.reliabilityScore * 100} tone={c.reliabilityScore > 0.8 ? 'success' : c.reliabilityScore > 0.65 ? 'warning' : 'danger'} />

              <div className="mb-3 mt-2 flex items-center justify-between text-2xs">
                <span className="text-text-muted">Float protection bias</span>
                <span className="mono-tabular text-text-secondary">{(c.floatProtectionBias * 100).toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3 text-2xs text-text-muted">
                <span>{c.taskCount} active WBS task(s)</span>
                <span>{c.contactName}</span>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
