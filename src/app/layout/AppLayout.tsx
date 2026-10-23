import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PlatformSidebar } from './PlatformSidebar';
import { MobileNav } from './MobileNav';
import { useAppUser } from '@/app/providers/AppUserProvider';
import { NotReadyNotice } from '@/components/NotReadyNotice';

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
          {platform ? (
            <div className="max-w-7xl mx-auto mb-4">
              <NotReadyNotice title="Super Admin ainda não está ativo neste banco">
                As telas de Clientes e Acesso só ligam depois de rodar os 3 SQLs SaaS no Supabase,
                publicar a função <strong>saas-tenants</strong> e entrar de novo com um usuário{' '}
                <strong>super_admin</strong>. Até lá a lista tende a falhar (404).
              </NotReadyNotice>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
