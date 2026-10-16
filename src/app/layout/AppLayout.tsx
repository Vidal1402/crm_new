import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PlatformSidebar } from './PlatformSidebar';
import { MobileNav } from './MobileNav';
import { useAppUser } from '@/app/providers/AppUserProvider';
import { isCrmEspelho } from '@/lib/app-flavor';

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isSuperAdmin } = useAppUser();
  const location = useLocation();
  const platform = isSuperAdmin && location.pathname.startsWith('/saas');

  return (
    <div className="min-h-screen flex">
      {platform ? <PlatformSidebar /> : <Sidebar />}
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} platform={platform} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileNavOpen(true)} platform={platform} />
        <main className="app-main flex-1 overflow-auto" role="main">
          {isCrmEspelho() ? (
            <div className="px-4 sm:px-6 pt-3">
              <div className="rounded-lg border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.08)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                CRM Espelho — mesmos dados do CRM de produção. O que você alterar aqui grava no banco real.
              </div>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
