'use client';
import { ComplaintStatus, Urgency } from '@/lib/types';
import { clsx } from 'clsx';

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const map: Record<ComplaintStatus, string> = {
    submitted:   'badge-submitted',
    assigned:    'badge-assigned',
    'in-progress': 'badge-in-progress',
    resolved:    'badge-resolved',
    rejected:    'badge-rejected',
  };
  const label: Record<ComplaintStatus, string> = {
    submitted:   'Submitted',
    assigned:    'Assigned',
    'in-progress': 'In Progress',
    resolved:    'Resolved',
    rejected:    'Rejected',
  };
  return <span className={clsx('inline-block', map[status])}>{label[status]}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const cls = `urgency-${urgency}`;
  return (
    <span className={clsx('inline-block border text-xs font-medium px-2 py-0.5 rounded-full', cls)}>
      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
    </span>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-gray-200 border-t-blue-600', s)} />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export function EmptyState({ title, desc, icon }: { title: string; desc: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center py-16">
      {icon && <div className="flex justify-center mb-4 text-gray-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </div>
  );
}
