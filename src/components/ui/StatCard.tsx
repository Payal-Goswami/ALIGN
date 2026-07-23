import { clsx } from 'clsx';

export function StatCard({
  label,
  value,
  sublabel,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const toneColor = {
    neutral: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }[tone];

  return (
    <div className="rounded border border-border bg-bg-card p-4">
      <p className="text-2xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className={clsx('mono-tabular mt-1.5 text-2xl font-semibold', toneColor)}>{value}</p>
      {sublabel && <p className="mt-1 text-2xs text-text-muted">{sublabel}</p>}
    </div>
  );
}
