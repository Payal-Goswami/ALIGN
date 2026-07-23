import { clsx } from 'clsx';

export function ProgressBar({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'success' | 'warning' | 'danger' }) {
  const color = { accent: 'bg-accent', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
