import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { useSupabaseConfig } from '@/hooks/useSupabase';
import { useAuth } from './providers/AuthProvider';
import { isAuthCallbackLocation } from '@/lib/auth-callback';
import { useAppUser } from './providers/AppUserProvider';
import { homePath } from '@/lib/home-path';
import SetupPage from './routes/setup/SetupPage';
import LoginPage from './routes/auth/LoginPage';
import SignupPage from './routes/auth/SignupPage';
import InvitePage from './routes/invite/InvitePage';
import InboxPage from './routes/inbox/InboxPage';
import CampaignsPage from './routes/campaigns/CampaignsPage';
import ContactsPage from './routes/contacts/ContactsPage';
import ContactDetailPage from './routes/contacts/ContactDetailPage';
import FunilPage from './routes/funil/FunilPage';
import SettingsPage from './routes/settings/SettingsPage';
import SaasTenantsPage from './routes/saas/SaasTenantsPage';
import SaasTenantDetailPage from './routes/saas/SaasTenantDetailPage';
import SaasAdminsPage from './routes/saas/SaasAdminsPage';
import ProspeccaoPage from './routes/modules/ProspeccaoPage';
import SalaGuerraPage from './routes/modules/SalaGuerraPage';
import OperacaoPage from './routes/modules/OperacaoPage';
import PerformancePage from './routes/modules/PerformancePage';
import MetasPage from './routes/modules/MetasPage';
import ConversasPage from './routes/modules/ConversasPage';
import AgendaPage from './routes/modules/AgendaPage';
import PlaybooksPage from './routes/modules/PlaybooksPage';
import RoteiroPage from './routes/modules/RoteiroPage';
import IndicadoresPage from './routes/modules/IndicadoresPage';
import PainelPage from './routes/modules/PainelPage';
import PropostasPage from './routes/modules/PropostasPage';

function HomeRedirect() {
  const { isSuperAdmin, loading } = useAppUser();
  if (loading) return null;
  return <Navigate to={homePath(isSuperAdmin)} replace />;
}

function RequireSetup({ children }: { children: ReactElement }) {
  const { configured } = useSupabaseConfig();
  const location = useLocation();
  if (!configured) {
    return <Navigate to="/setup" state={{ from: location.pathname }} replace />;
  }
  return children;
}

function RequireSession({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading && !session) return null;
  if (!session) {
    return (
      <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
    );
  }
  return children;
}

function RedirectIfConfigured({ children }: { children: ReactElement }) {
  const { configured } = useSupabaseConfig();
  const { session } = useAuth();
  const location = useLocation();
  if (isAuthCallbackLocation(location.search, location.hash)) {
    return null;
  }
  if (configured) {
    return session ? <HomeRedirect /> : <Navigate to="/auth/login" replace />;
  }
  return children;
}

function RequireSuperAdmin({ children }: { children: ReactElement }) {
  const { isSuperAdmin, loading } = useAppUser();
  if (loading && !isSuperAdmin) return null;
  if (!isSuperAdmin) {
    return <Navigate to="/funil" replace />;
  }
  return children;
}

function RedirectIfAuthenticated({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  const { isSuperAdmin, loading: userLoading } = useAppUser();
  if (loading || userLoading) return children;
  if (session) {
    return <Navigate to={homePath(isSuperAdmin)} replace />;
  }
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/setup"
        element={
          <RedirectIfConfigured>
            <SetupPage />
          </RedirectIfConfigured>
        }
      />

      <Route
        path="/auth/login"
        element={
          <RequireSetup>
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          </RequireSetup>
        }
      />
      <Route
        path="/auth/signup"
        element={
          <RequireSetup>
            <RedirectIfAuthenticated>
              <SignupPage />
            </RedirectIfAuthenticated>
          </RequireSetup>
        }
      />
      <Route path="/invite" element={<InvitePage />} />

      <Route
        element={
          <RequireSetup>
            <RequireSession>
              <AppLayout />
            </RequireSession>
          </RequireSetup>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route
          path="/saas"
          element={
            <RequireSuperAdmin>
              <SaasTenantsPage />
            </RequireSuperAdmin>
          }
        />
        <Route
          path="/saas/admins"
          element={
            <RequireSuperAdmin>
              <SaasAdminsPage />
            </RequireSuperAdmin>
          }
        />
        <Route
          path="/saas/:id"
          element={
            <RequireSuperAdmin>
              <SaasTenantDetailPage />
            </RequireSuperAdmin>
          }
        />
        <Route path="/prospeccao" element={<ProspeccaoPage />} />
        <Route path="/painel" element={<PainelPage />} />
        <Route path="/sala-de-guerra" element={<SalaGuerraPage />} />
        <Route path="/operacao" element={<OperacaoPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/metas" element={<MetasPage />} />
        <Route path="/conversas" element={<ConversasPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/playbooks" element={<PlaybooksPage />} />
        <Route path="/roteiro" element={<RoteiroPage />} />
        <Route path="/indicadores" element={<IndicadoresPage />} />
        <Route path="/propostas" element={<PropostasPage />} />
        <Route path="/dashboard" element={<Navigate to="/painel" replace />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/templates" element={<Navigate to="/campaigns?tab=templates" replace />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/funil" element={<FunilPage />} />
        <Route path="/automacao" element={<Navigate to="/operacao" replace />} />
        <Route path="/inteligencia" element={<Navigate to="/prospeccao" replace />} />
        <Route path="/roi" element={<Navigate to="/metas" replace />} />
        <Route path="/projetos" element={<Navigate to="/funil" replace />} />
        <Route path="/educacao" element={<Navigate to="/funil" replace />} />
        <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/settings/profile" element={<SettingsPage />} />
        <Route path="/settings/credentials" element={<Navigate to="/settings/profile" replace />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
