import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, PLATFORM_NAV_ITEMS, type NavItem } from './nav-config';
import { useAppUser } from '@/app/providers/AppUserProvider';
import { TractionLogo } from '@/components/brand/TractionLogo';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  platform?: boolean;
}

export function MobileNav({ open, onClose, platform = false }: MobileNavProps) {
  const { tenantRole } = useAppUser();
  const source: NavItem[] = platform ? PLATFORM_NAV_ITEMS : NAV_ITEMS;
  const items = platform
    ? source
    : source.filter((item) => !item.adminOnly || tenantRole === 'admin');

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 md:hidden transition-opacity duration-300',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        className={cn(
          'absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-white border-r border-[#E5E7EB] flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-label="Navegação"
      >
        <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-[#E5E7EB]">
          <TractionLogo compact />
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="h-11 w-11 flex items-center justify-center rounded-xl text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/saas' || item.to === '/painel' || item.to === '/funil' || item.to === '/sala-de-guerra' || item.to === '/settings/profile'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 min-h-11 text-sm font-medium',
                    isActive ? 'bg-[#111827] text-white' : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]',
                  )
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.comingSoon ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">em breve</span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
