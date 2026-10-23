import type { ReactNode } from 'react';
import { TractionLogo } from '@/components/brand/TractionLogo';
import { appProductHint } from '@/lib/app-flavor';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

// Shared chrome for /auth/login and /auth/signup — keeps both pages visually
// consistent with /setup without repeating the logo + card + layout code.
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8 gap-2">
          <TractionLogo />
          <div className="text-[10px] text-[var(--color-text-secondary)]">{appProductHint()}</div>
        </div>

        <div className="glass-card p-8 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-display">{title}</h1>
            {subtitle && (
              <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
            )}
          </header>

          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}
