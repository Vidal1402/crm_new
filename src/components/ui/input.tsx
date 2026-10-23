import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm',
          'placeholder:text-[var(--color-text-secondary)] placeholder:opacity-60',
          'text-[var(--color-text-primary)]',
          'transition-colors',
          'focus:border-[#22C55E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/20',
          'disabled:cursor-not-allowed disabled:opacity-40',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
