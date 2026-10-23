import { useLocation, useNavigate } from 'react-router-dom';
import { PLATFORM_NAV_ITEMS, TOP_NAV_ITEMS } from './nav-config';
import { toast } from 'sonner';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { useAuth } from '@/app/providers/AuthProvider';
import { TractionLogo } from '@/components/brand/TractionLogo';

interface HeaderProps {
  onMenuClick?: () => void;
  platform?: boolean;
}

export function Header({ onMenuClick, platform = false }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const items = platform ? PLATFORM_NAV_ITEMS : TOP_NAV_ITEMS;
  const { user, signOut } = useAuth();
  const current =
    items.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label ??
    (platform ? 'Plataforma' : 'Traction');
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date());

  const handleLogout = async () => {
    await signOut();
    toast.success('Sessão encerrada.');
    navigate('/auth/login', { replace: true });
  };

  return (
    <header
      className="h-16 shrink-0 bg-white/90 backdrop-blur border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-6 gap-4"
      role="banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl text-[#6B7280] hover:bg-[#F3F4F6]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="md:hidden">
          <TractionLogo compact />
        </div>
        <div className="hidden md:block min-w-0">
          <div className="text-[11px] capitalize text-[#9CA3AF]">{today}</div>
          <div className="truncate text-sm font-medium text-[#111827]">{current}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1 text-[12px] font-medium text-[#166534]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
          Ao vivo
        </div>
        {!platform ? <NotificationsDropdown /> : null}
        <div className="hidden lg:block text-right leading-tight mr-1">
          <div className="text-[11px] text-[#9CA3AF]">{platform ? 'Super Admin' : 'Conta'}</div>
          <div className="text-xs font-medium text-[#111827] max-w-[200px] truncate">{user?.email ?? '—'}</div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Sair" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
