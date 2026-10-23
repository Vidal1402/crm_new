import { cn } from '@/lib/utils';

export function TractionMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden="true">
      <path
        fill="currentColor"
        d="M15.2 2.2h1.6l.7 8.4 6.2-5.7 1.1 1.1-5.7 6.2 8.4.7v1.6l-8.4.7 5.7 6.2-1.1 1.1-6.2-5.7-.7 8.4h-1.6l-.7-8.4-6.2 5.7-1.1-1.1 5.7-6.2L2.5 16.8v-1.6l8.4-.7-5.7-6.2 1.1-1.1 6.2 5.7z"
      />
    </svg>
  );
}

export function TractionLogo({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2 min-w-0', inverted ? 'text-white' : 'text-[#111827]')}>
      <TractionMark className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
      <div className="min-w-0 leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className={cn('font-semibold tracking-[-0.06em]', compact ? 'text-[1.2rem]' : 'text-[1.45rem]')}>
            traction.
          </span>
          <span className={cn('font-medium tracking-[0.02em] text-[#6B7280]', compact ? 'text-[9px]' : 'text-[10px]')}>
            by United
          </span>
        </div>
      </div>
    </div>
  );
}
