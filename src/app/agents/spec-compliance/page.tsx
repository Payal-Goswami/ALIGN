'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, statusTone } from '@/components/ui/Badge';
import { LoadingPanel } from '@/components/ui/Skeleton';
import { Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface Submittal {
  id: string;
  submittalNumber: string;
  title: string;
  contractor: string;
  status: string;
  submittedAt: string;
  requirement: { clauseRef: string; parameter: string; standardRef: string } | null;
  submittedValue: string;
  requiredValue: string | null;
}
interface NonConformance {
  id: string;
  severity: string;
  status: string;
  deviationDetail: string;
  raisedAt: string;
  submittalNumber: string | null;
  submittalTitle: string | null;
}

export default function SpecCompliancePage() {
  const [submittals, setSubmittals] = useState<Submittal[] | null>(null);
  const [ncs, setNcs] = useState<NonConformance[] | null>(null);
  const [specDocs, setSpecDocs] = useState<{ id: string; title: string; standardRef: string; version: string; requirementCount: number }[] | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/agents/spec-compliance')
      .then((r) => r.json())
      .then((d) => {
        setSubmittals(d.submittals);
        setNcs(d.nonConformances);
        setSpecDocs(d.specDocs);
      });
  }, []);

  const explain = async (ncId: string) => {
    setLoadingId(ncId);
    const res = await fetch('/api/agents/spec-compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonConformanceId: ncId }),
    });
    const data = await res.json();
    setExplanations((prev) => ({ ...prev, [ncId]: data.explanationText }));
    setLoadingId(null);
  };

  return (
    <>
      <Topbar title="Specification & Quality Compliance Agent" subtitle="Deterministic clause-by-clause deviation checking against TIA-942 / Uptime / BICSI requirements" />
      <main className="flex-1 overflow-y-auto p-6">
        {!specDocs && <LoadingPanel rows={6} />}

        {specDocs && (
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {specDocs.map((d) => (
              <Card key={d.id}>
                <p className="text-sm font-semibold text-text-primary">{d.standardRef}</p>
                <p className="text-2xs text-text-muted">{d.title}</p>
                <p className="mt-2 text-2xs text-text-secondary">{d.requirementCount} governing clause(s) tracked · {d.version}</p>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card padded={false}>
            <div className="p-5 pb-0">
              <CardHeader title="Submittal Register" subtitle="Vendor submittals checked against governing spec requirements" />
            </div>
            <div className="max-h-[640px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-bg-card">
                  <tr className="border-b border-border text-2xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2 font-medium">No.</th>
                    <th className="px-4 py-2 font-medium">Title</th>
                    <th className="px-4 py-2 font-medium">Clause</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {submittals?.map((s) => (
                    <tr key={s.id} className="border-b border-border/60 last:border-0">
                      <td className="mono-tabular px-4 py-2.5 text-2xs text-text-muted">{s.submittalNumber}</td>
                      <td className="px-4 py-2.5">
                        <p className="text-text-primary">{s.title}</p>
                        <p className="text-2xs text-text-muted">{s.contractor} · declared: <span className="mono-tabular">{s.submittedValue}</span>{s.requiredValue ? ` (req: ${s.requiredValue})` : ''}</p>
                      </td>
                      <td className="mono-tabular px-4 py-2.5 text-2xs text-text-secondary">{s.requirement?.clauseRef ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={statusTone(s.status)}>{s.status.replace(/_/g, ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-0">
              <CardHeader title="Non-Conformance Log" subtitle="Auto-flagged by the deterministic compliance checker, explained on demand by the LLM" />
            </div>
            <div className="max-h-[640px] space-y-3 overflow-y-auto p-5 pt-0">
              {ncs?.map((nc) => (
                <div key={nc.id} className="rounded border border-border p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <Badge tone={nc.severity === 'CRITICAL' ? 'danger' : nc.severity === 'MAJOR' ? 'warning' : 'neutral'}>{nc.severity}</Badge>
                    <span className="text-2xs text-text-muted">{format(new Date(nc.raisedAt), 'dd MMM yyyy')}</span>
                  </div>
                  <p className="text-sm text-text-primary">{nc.submittalTitle}</p>
                  <p className="mt-1 text-2xs text-text-secondary">{nc.deviationDetail}</p>

                  {explanations[nc.id] ? (
                    <p className="mt-2 border-t border-border pt-2 text-2xs italic text-accent">{explanations[nc.id]}</p>
                  ) : (
                    <button
                      onClick={() => explain(nc.id)}
                      disabled={loadingId === nc.id}
                      className="mt-2 flex items-center gap-1.5 text-2xs font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      <Sparkles size={11} className={loadingId === nc.id ? 'animate-pulse' : ''} />
                      {loadingId === nc.id ? 'Drafting audit note…' : 'Draft audit-trail note'}
                    </button>
                  )}
                </div>
              ))}
              {ncs?.length === 0 && <p className="text-2xs text-text-muted">No open non-conformances.</p>}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
