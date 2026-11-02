import { NavLink } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { NAV_ITEMS } from './nav-config';
import { useAppUser } from '@/app/providers/AppUserProvider';
import { useWhatsappConnected } from '@/hooks/useWhatsappConnected';
import { TractionLogo } from '@/components/brand/TractionLogo';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { tenantRole } = useAppUser();
  const isTenantAdmin = tenantRole === 'admin';
  const whatsapp = useWhatsappConnected();
  return (
    <aside
      className="app-sidebar hidden md:flex md:flex-col w-[220px] shrink-0 sticky top-0 h-screen"
      aria-label="Navegação principal"
    >
      <div className="h-16 flex items-center px-5 border-b border-[#E5E7EB]">
        <TractionLogo compact />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isTenantAdmin).map(({ to, label, icon: Icon, needsWhatsapp }) =>
          needsWhatsapp && whatsapp !== true ? (
            <div
              key={to}
              title="Em breve"
              aria-disabled="true"
              className="group flex items-center gap-3 rounded-xl px-3 min-h-10 text-[13px] font-medium text-[#9CA3AF] cursor-not-allowed select-none"
            >
              <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
              <span className="truncate flex-1">{label}</span>
              <span className="hidden rounded-md bg-[#111827] px-1.5 py-0.5 text-[10px] text-white group-hover:inline">Em breve</span>
              <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            </div>
          ) : (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 min-h-10 text-[13px] font-medium',
                  isActive ? 'bg-[#111827] text-white shadow-sm' : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]',
                )
              }
              end={to === '/painel' || to === '/funil' || to === '/sala-de-guerra' || to === '/settings/profile'}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
              <span className="truncate">{label}</span>
            </NavLink>
          ),
        )}
      </nav>
    </aside>
  );
}
