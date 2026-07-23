import { clsx } from 'clsx';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-white/5 text-text-secondary border-border',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
};

export function Badge({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-2xs font-medium uppercase tracking-wide',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function riskBandTone(band: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE'): BadgeTone {
  if (band === 'LOW') return 'success';
  if (band === 'MODERATE') return 'warning';
  return 'danger';
}

export function statusTone(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (['RESOLVED', 'APPROVED', 'CONVERGED', 'PASS', 'COMPLETE', 'DELIVERED', 'CLOSED'].includes(s)) return 'success';
  if (['OPEN', 'NEGOTIATING', 'PENDING', 'PENDING_REVIEW', 'RUNNING', 'SCHEDULED', 'IN_TRANSIT', 'IN_PROGRESS'].includes(s)) return 'accent';
  if (['ESCALATED', 'REJECTED', 'FAIL', 'DELAYED', 'CUSTOMS_HOLD', 'DELAYED', 'CRITICAL', 'REVISE_RESUBMIT'].includes(s)) return 'danger';
  if (['UNDER_REVIEW', 'CONDITIONAL_PASS', 'BLOCKED', 'ON_HOLD'].includes(s)) return 'warning';
  return 'neutral';
}
