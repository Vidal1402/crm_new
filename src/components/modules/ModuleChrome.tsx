import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ModuleHeader({
  title,
  subtitle,
  extra,
}: {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-[#111827]">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#6B7280]">{subtitle}</p> : null}
      </div>
      {extra ? <div className="flex flex-wrap gap-2">{extra}</div> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: 'in' | 'out';
}) {
  const up = delta?.startsWith('+');
  return (
    <div className="bg-white px-4 py-4">
      <div className="text-[12px] leading-snug text-[#6B7280]">{label}</div>
      <div className="mt-2 text-[1.5rem] font-semibold tabular-nums tracking-tight text-[#111827]">{value}</div>
      {delta ? (
        <div className={cn('mt-1 text-[12px] font-medium', up ? 'text-[#16A34A]' : 'text-[#9CA3AF]')}>{delta}</div>
      ) : null}
    </div>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#E5E7EB] shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:grid-cols-4">
      {children}
    </div>
  );
}

export function PeriodPills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-[#E5E7EB] bg-white p-1">
      {options.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium',
            value === p ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:text-[#111827]',
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]',
        className,
      )}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] px-5 py-3.5">
          <h2 className="text-sm font-medium text-[#111827]">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={title ? 'p-5' : 'p-0'}>{children}</div>
    </div>
  );
}

export const fieldClass =
  'h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/15';
