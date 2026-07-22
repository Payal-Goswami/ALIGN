'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, riskBandTone, statusTone } from '@/components/ui/Badge';
import { LoadingPanel } from '@/components/ui/Skeleton';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface EquipmentRow {
  id: string;
  tagNumber: string;
  description: string;
  category: string;
  status: string;
  isLongLead: boolean;
  supplier: { name: string; tier: number; country: string; reliabilityScore: number };
  promisedDelivery: string;
  revisedDelivery: string | null;
  lastEvent: { eventType: string; eventDate: string } | null;
  risk: { score: number; band: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE'; bufferDays: number; slippedDays: number; reasons: string[] };
}

export default function SupplyChainPage() {
  const [equipment, setEquipment] = useState<EquipmentRow[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; severe: number; high: number; moderate: number; low: number } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/agents/supply-chain')
      .then((r) => r.json())
      .then((d) => {
        setEquipment(d.equipment);
        setSummary(d.summary);
      });
  }, []);

  return (
    <>
      <Topbar title="Supply Chain Visibility & Risk Agent" subtitle="Deterministic buffer-erosion scoring across multi-tier equipment shipments" />
      <main className="flex-1 overflow-y-auto p-6">
        {!summary && <LoadingPanel rows={6} />}

        {summary && (
          <div className="mb-5 grid grid-cols-4 gap-3">
            <Card><p className="text-2xs text-text-muted">Severe</p><p className="mono-tabular text-2xl font-semibold text-danger">{summary.severe}</p></Card>
            <Card><p className="text-2xs text-text-muted">High</p><p className="mono-tabular text-2xl font-semibold text-warning">{summary.high}</p></Card>
            <Card><p className="text-2xs text-text-muted">Moderate</p><p className="mono-tabular text-2xl font-semibold text-warning">{summary.moderate}</p></Card>
            <Card><p className="text-2xs text-text-muted">Low</p><p className="mono-tabular text-2xl font-semibold text-success">{summary.low}</p></Card>
          </div>
        )}

        <Card padded={false}>
          <div className="p-5 pb-0">
            <CardHeader title="Equipment Tracker" subtitle="Sorted by risk score — long-lead critical equipment first" />
          </div>
          <div className="divide-y divide-border/60">
            {equipment?.map((e) => (
              <div key={e.id}>
                <button className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-white/[0.02]" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="mono-tabular text-2xs text-text-muted">{e.tagNumber}</span>
                      <span className="text-sm text-text-primary">{e.description}</span>
                      {e.isLongLead && <Badge tone="accent">Long-lead</Badge>}
                    </div>
                    <p className="mt-0.5 text-2xs text-text-muted">
                      {e.supplier.name} · Tier {e.supplier.tier} · {e.supplier.country} · promised {format(new Date(e.promisedDelivery), 'dd MMM yy')}
                      {e.revisedDelivery && <span className="text-warning"> → revised {format(new Date(e.revisedDelivery), 'dd MMM yy')}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={statusTone(e.status)}>{e.status.replace(/_/g, ' ')}</Badge>
                    <div className="flex items-center gap-1.5">
                      <span className="mono-tabular text-sm font-semibold text-text-primary">{e.risk.score}</span>
                      <Badge tone={riskBandTone(e.risk.band)}>{e.risk.band}</Badge>
                    </div>
                  </div>
                </button>
                {expanded === e.id && (
                  <div className="border-t border-border/60 bg-white/[0.015] px-5 py-3">
                    <div className="mb-2 grid grid-cols-3 gap-3 text-2xs">
                      <div><p className="text-text-muted">Buffer to required-on-site</p><p className={clsx('mono-tabular', e.risk.bufferDays < 0 ? 'text-danger' : 'text-text-secondary')}>{e.risk.bufferDays}d</p></div>
                      <div><p className="text-text-muted">Slip vs. original promise</p><p className="mono-tabular text-text-secondary">{e.risk.slippedDays}d</p></div>
                      <div><p className="text-text-muted">Supplier reliability</p><p className="mono-tabular text-text-secondary">{(e.supplier.reliabilityScore * 100).toFixed(0)}%</p></div>
                    </div>
                    <ul className="list-inside list-disc space-y-0.5 text-2xs text-text-secondary">
                      {e.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
