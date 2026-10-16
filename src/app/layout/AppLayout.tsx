import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PlatformSidebar } from './PlatformSidebar';
import { MobileNav } from './MobileNav';
import { useAppUser } from '@/app/providers/AppUserProvider';

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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
