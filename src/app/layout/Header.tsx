import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, PLATFORM_NAV_ITEMS } from './nav-config';
import { toast } from 'sonner';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { useAuth } from '@/app/providers/AuthProvider';

interface HeaderProps {
  onMenuClick?: () => void;
  platform?: boolean;
}

export function Header({ onMenuClick, platform = false }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const items = platform ? PLATFORM_NAV_ITEMS : NAV_ITEMS;
  const section =
    items.find((item) =>
      item.to === '/saas'
        ? location.pathname === '/saas'
        : location.pathname.startsWith(item.to),
    )?.label ?? (platform ? 'Plataforma' : 'Workspace');
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success('Sessão encerrada.');
    navigate('/auth/login', { replace: true });
  };

  return (
    <header
      className="h-16 shrink-0 glass-surface border-b border-[rgba(59,130,246,0.08)] flex items-center justify-between px-4 sm:px-6 gap-4"
      role="banner"
    >
      <div className="flex items-center gap-2"><span className="hidden md:inline text-sm text-[var(--color-text-secondary)]">{platform ? 'Super Admin' : 'Workspace'} <span className="mx-2 opacity-40">/</span> <strong className="font-medium text-[var(--color-text-primary)]">{section}</strong></span>
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="md:hidden h-11 w-11 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)] transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {!platform ? <NotificationsDropdown /> : null}

        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right leading-tight">
            <div className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              {platform ? 'Super Admin' : 'Conectado'}
            </div>
            <div className="text-xs font-medium text-[var(--color-text-primary)] max-w-[200px] truncate">
              {user?.email ?? '—'}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sair"
            onClick={handleLogout}
          >
            <LogOut className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
