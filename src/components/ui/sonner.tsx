import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            'glass-card !border-[#E5E7EB] !bg-[var(--color-bg-card)] !text-[var(--color-text-primary)]',
          description: '!text-[var(--color-text-secondary)]',
        },
      }}
    />
  );
}
