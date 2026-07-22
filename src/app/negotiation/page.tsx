'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, statusTone } from '@/components/ui/Badge';
import { LoadingPanel } from '@/components/ui/Skeleton';
import { clsx } from 'clsx';
import { Sparkles, ArrowRightLeft, Scale } from 'lucide-react';

interface ConflictDetail {
  id: string;
  conflictType: string;
  severity: string;
  status: string;
  description: string;
  detectedAt: string;
  taskA: { id: string; wbsCode: string; name: string; zone: string | null; contractor: string | null; isCritical: boolean };
  taskB: { id: string; wbsCode: string; name: string; zone: string | null; contractor: string | null; isCritical: boolean };
  session: {
    id: string;
    mechanism: string;
    status: string;
    totalRounds: number;
    paretoImproving: boolean | null;
    nashProduct: number | null;
    daysOfDelaySaved: number | null;
    participants: { contractorName: string; reservationValue: number; finalPosition: { concessionDays: number }; utilityGain: number | null }[];
    rounds: { roundNumber: number; proposals: { contractorId: string; offeredConcessionDays: number; utility: number }[]; concessionGap: number; accepted: boolean }[];
    outcome: { resolution: Record<string, { concessionDays: number }>; explanationText: string | null; explanationModel: string | null; confidenceScore: number | null } | null;
  } | null;
}

export default function NegotiationPage() {
  const [conflicts, setConflicts] = useState<ConflictDetail[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    fetch('/api/negotiation/conflicts')
      .then((r) => r.json())
      .then((d) => {
        setConflicts(d.conflicts);
        if (d.conflicts.length && !selectedId) setSelectedId(d.conflicts[0].id);
      });
  };

  useEffect(load, []);

  const selected = conflicts?.find((c) => c.id === selectedId) ?? null;

  const generateExplanation = async () => {
    if (!selected?.session) return;
    setGenerating(true);
    await fetch('/api/negotiation/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: selected.session.id }),
    });
    load();
    setGenerating(false);
  };

  return (
    <>
      <Topbar title="Multi-Agent Contractor Negotiation Scheduler" subtitle="Nash-bargaining mechanism design over contractor schedule clashes" />
      <main className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-y-auto border-r border-border p-4">
          {!conflicts && <LoadingPanel rows={5} />}
          <div className="space-y-2">
            {conflicts?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={clsx(
                  'w-full rounded border p-3 text-left transition-colors',
                  selectedId === c.id ? 'border-accent bg-accent/10' : 'border-border bg-bg-card hover:border-text-muted'
                )}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-2xs font-medium uppercase tracking-wide text-text-muted">{c.conflictType.replace(/_/g, ' ')}</span>
                  <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2">{c.description}</p>
                {c.session?.daysOfDelaySaved != null && (
                  <p className="mono-tabular mt-1.5 text-2xs text-success">+{c.session.daysOfDelaySaved.toFixed(1)}d saved vs. uncoordinated</p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selected && <p className="text-sm text-text-muted">Select a conflict to view its negotiation trace.</p>}
          {selected && (
            <div className="space-y-5">
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <Badge tone="danger">{selected.severity}</Badge>
                  <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
                </div>
                <p className="text-sm text-text-primary">{selected.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[selected.taskA, selected.taskB].map((t) => (
                    <div key={t.id} className="rounded border border-border p-3">
                      <p className="mono-tabular text-2xs text-text-muted">{t.wbsCode}</p>
                      <p className="text-sm text-text-primary">{t.name}</p>
                      <p className="mt-1 text-2xs text-text-secondary">{t.contractor} · {t.zone}</p>
                      {t.isCritical && <Badge tone="danger" className="mt-1.5">Critical path</Badge>}
                    </div>
                  ))}
                </div>
              </Card>

              {selected.session && (
                <>
                  <Card>
                    <CardHeader
                      title="Nash Bargaining Outcome"
                      subtitle={`Mechanism: ${selected.session.mechanism} · ${selected.session.totalRounds} negotiation round(s)`}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded border border-border p-3">
                        <p className="text-2xs uppercase tracking-wide text-text-muted">Pareto-improving</p>
                        <p className={clsx('mt-1 text-lg font-semibold', selected.session.paretoImproving ? 'text-success' : 'text-danger')}>
                          {selected.session.paretoImproving ? 'Yes' : 'No — escalated'}
                        </p>
                      </div>
                      <div className="rounded border border-border p-3">
                        <p className="text-2xs uppercase tracking-wide text-text-muted">Nash Product</p>
                        <p className="mono-tabular mt-1 text-lg font-semibold text-text-primary">{selected.session.nashProduct?.toFixed(3) ?? '—'}</p>
                      </div>
                      <div className="rounded border border-border p-3">
                        <p className="text-2xs uppercase tracking-wide text-text-muted">Days Saved vs. Forced Split</p>
                        <p className="mono-tabular mt-1 text-lg font-semibold text-success">{selected.session.daysOfDelaySaved?.toFixed(1) ?? '—'}d</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {selected.session.participants.map((p) => (
                        <div key={p.contractorName} className="flex items-center justify-between rounded border border-border px-3 py-2">
                          <span className="text-sm text-text-primary">{p.contractorName}</span>
                          <div className="flex items-center gap-4 text-2xs">
                            <span className="text-text-muted">concedes <span className="mono-tabular text-text-secondary">{p.finalPosition.concessionDays}d</span></span>
                            <span className={clsx('mono-tabular', (p.utilityGain ?? 0) >= 0 ? 'text-success' : 'text-danger')}>
                              utility gain {p.utilityGain?.toFixed(3) ?? '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader title="Concession Trace" subtitle="Alternating-offer rounds converging on the Nash-bargaining split" />
                    <div className="space-y-2">
                      {selected.session.rounds.map((r) => (
                        <div key={r.roundNumber} className="flex items-center gap-3 rounded border border-border px-3 py-2 text-2xs">
                          <span className="mono-tabular w-14 shrink-0 text-text-muted">Round {r.roundNumber}</span>
                          <ArrowRightLeft size={12} className="shrink-0 text-text-muted" />
                          <div className="flex flex-1 flex-wrap gap-3">
                            {r.proposals.map((p, i) => (
                              <span key={i} className="mono-tabular text-text-secondary">
                                {p.offeredConcessionDays}d (u={p.utility.toFixed(2)})
                              </span>
                            ))}
                          </div>
                          {r.accepted && <Badge tone="success">Accepted</Badge>}
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader
                      title="PMO Explanation"
                      subtitle="LLM-generated from the already-decided algorithm output — never the reverse"
                      action={
                        <button
                          onClick={generateExplanation}
                          disabled={generating}
                          className="flex items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-2.5 py-1 text-2xs font-medium text-accent hover:bg-accent/15 disabled:opacity-50"
                        >
                          <Sparkles size={12} className={generating ? 'animate-pulse' : ''} />
                          {generating ? 'Generating…' : selected.session.outcome?.explanationText ? 'Regenerate' : 'Generate explanation'}
                        </button>
                      }
                    />
                    {selected.session.outcome?.explanationText ? (
                      <>
                        <p className="text-sm leading-relaxed text-text-secondary">{selected.session.outcome.explanationText}</p>
                        <p className="mt-2 text-2xs text-text-muted">
                          {selected.session.outcome.explanationModel
                            ? `Generated by ${selected.session.outcome.explanationModel} (local Ollama inference)`
                            : 'Ollama unavailable — shown using the deterministic fallback template'}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-2xs text-text-muted">
                        <Scale size={14} />
                        No explanation generated yet — click "Generate explanation" to phrase the decided outcome for the PMO.
                      </div>
                    )}
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
