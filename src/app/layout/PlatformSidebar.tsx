import { NavLink } from 'react-router-dom';
import { PLATFORM_NAV_ITEMS } from './nav-config';
import { TractionLogo } from '@/components/brand/TractionLogo';
import { cn } from '@/lib/utils';

export function PlatformSidebar() {
  return (
    <aside
      className="app-sidebar hidden md:flex md:flex-col w-[220px] shrink-0 sticky top-0 h-screen"
      aria-label="Navegação da plataforma"
    >
      <div className="h-16 flex items-center px-5 border-b border-[#E5E7EB]">
        <TractionLogo compact />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {PLATFORM_NAV_ITEMS.map(({ to, label, icon: Icon, comingSoon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/saas'}
            title={comingSoon ? `${label} — Super Admin ainda não está ativo neste banco` : label}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 min-h-10 text-[13px] font-medium',
                isActive ? 'bg-[#111827] text-white shadow-sm' : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]',
              )
            }
          >
            <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
