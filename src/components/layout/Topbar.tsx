import { Bell, Search } from 'lucide-react';

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-bg-secondary px-6">
      <div>
        <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-2xs text-text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded border border-border bg-bg-primary px-2.5 py-1.5 text-2xs text-text-muted">
          <Search size={13} />
          <span>Search project data…</span>
        </div>
        <button className="text-text-muted hover:text-text-primary" aria-label="Notifications">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2 border-l border-border pl-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-2xs font-semibold text-accent">
            AR
          </div>
          <div className="leading-tight">
            <p className="text-2xs font-medium text-text-primary">Payal</p>
            <p className="text-2xs text-text-muted">PMO Lead</p>
          </div>
        </div>
      </div>
    </header>
  );
}
