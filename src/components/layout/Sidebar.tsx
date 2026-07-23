'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  GanttChartSquare,
  Handshake,
  Users,
  ShieldCheck,
  Truck,
  MessageSquareText,
  Building2,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Schedule',
    items: [
      { href: '/schedule', label: 'Critical Path', icon: GanttChartSquare },
      { href: '/negotiation', label: 'Negotiation Scheduler', icon: Handshake },
      { href: '/contractors', label: 'Trade Contractors', icon: Users },
    ],
  },
  {
    label: 'AI Agents',
    items: [
      { href: '/agents/spec-compliance', label: 'Spec & Quality Compliance', icon: ShieldCheck },
      { href: '/agents/supply-chain', label: 'Supply Chain Visibility', icon: Truck },
      { href: '/agents/rfi-knowledge', label: 'RFI & Knowledge', icon: MessageSquareText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-accent">
          <Building2 size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-text-primary">ALIGN</p>
          <p className="text-2xs leading-tight text-text-muted">Project Delivery Platform</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1.5 px-2 text-2xs font-semibold uppercase tracking-wider text-text-muted">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-accent/15 text-accent'
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    )}
                  >
                    <Icon size={16} strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <p className="text-2xs text-text-muted">Tier III · 36 MW · Shamshabad</p>
      </div>
    </aside>
  );
}
