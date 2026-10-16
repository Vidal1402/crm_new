import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { useSupabaseConfig } from '@/hooks/useSupabase';
import { useAuth } from './providers/AuthProvider';
import { isAuthCallbackLocation } from '@/lib/auth-callback';
import { FeatureGate } from '@/components/plans/FeatureGate';
import { useAppUser } from './providers/AppUserProvider';
import { homePath } from '@/lib/home-path';

const SetupPage = lazy(() => import('./routes/setup/SetupPage'));
const LoginPage = lazy(() => import('./routes/auth/LoginPage'));
const SignupPage = lazy(() => import('./routes/auth/SignupPage'));
const InvitePage = lazy(() => import('./routes/invite/InvitePage'));
const DashboardPage = lazy(() => import('./routes/dashboard/DashboardPage'));
const InboxPage = lazy(() => import('./routes/inbox/InboxPage'));
const CampaignsPage = lazy(() => import('./routes/campaigns/CampaignsPage'));
const ContactsPage = lazy(() => import('./routes/contacts/ContactsPage'));
const ContactDetailPage = lazy(() => import('./routes/contacts/ContactDetailPage'));
const FunilPage = lazy(() => import('./routes/funil/FunilPage'));
const SettingsPage = lazy(() => import('./routes/settings/SettingsPage'));
const SaasTenantsPage = lazy(() => import('./routes/saas/SaasTenantsPage'));
const SaasTenantDetailPage = lazy(() => import('./routes/saas/SaasTenantDetailPage'));
const SaasAdminsPage = lazy(() => import('./routes/saas/SaasAdminsPage'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-label opacity-60">Carregando...</div>
    </div>
  );
}

function HomeRedirect() {
  const { isSuperAdmin, loading } = useAppUser();
  if (loading) return <PageFallback />;
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
  if (loading) return <PageFallback />;
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
  if (loading) return <PageFallback />;
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function RedirectIfAuthenticated({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  const { isSuperAdmin, loading: userLoading } = useAppUser();
  if (loading || userLoading) return <PageFallback />;
  if (session) {
    return <Navigate to={homePath(isSuperAdmin)} replace />;
  }
  return children;
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route
            path="/campaigns"
            element={
              <FeatureGate feature="campaigns">
                <CampaignsPage />
              </FeatureGate>
            }
          />
          <Route path="/templates" element={<Navigate to="/campaigns?tab=templates" replace />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
          <Route path="/funil" element={<FunilPage />} />
          <Route path="/projetos" element={<Navigate to="/funil" replace />} />
          <Route path="/educacao" element={<Navigate to="/funil" replace />} />
          <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/settings/profile" element={<SettingsPage />} />
          <Route path="/settings/credentials" element={<Navigate to="/settings/profile" replace />} />
        </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  );
}
