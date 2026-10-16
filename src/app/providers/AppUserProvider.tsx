import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthProvider';
import { getSupabase } from '@/lib/supabase';
import { parsePlan, type CommercialPlan } from '@/lib/plans';

export type AppRole = 'admin' | 'operator' | 'super_admin';
export type TenantRole = 'admin' | 'operator';

interface AppUserContextValue {
  userId: string | null;
  role: AppRole | null;
  tenantRole: TenantRole | null;
  tenantId: string | null;
  plan: CommercialPlan;
  isSuperAdmin: boolean;
  loading: boolean;
  reloadPlan: () => Promise<void>;
}

const AppUserContext = createContext<AppUserContextValue | null>(null);

function readRoleFromUser(appMetadata: Record<string, unknown> | undefined): AppRole | null {
  if (!appMetadata) return null;
  const role = appMetadata['role'];
  if (role === 'admin' || role === 'operator' || role === 'super_admin') {
    return role;
  }
  return null;
}

function readTenantRole(appMetadata: Record<string, unknown> | undefined): TenantRole | null {
  if (!appMetadata) return null;
  const claimed = appMetadata['tenant_role'];
  if (claimed === 'admin' || claimed === 'operator') return claimed;
  const role = appMetadata['role'];
  if (role === 'admin' || role === 'operator') return role;
  return null;
}

export function AppUserProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<CommercialPlan>('avancado');
  const [planLoading, setPlanLoading] = useState(true);

  const role = useMemo(
    () => readRoleFromUser(user?.app_metadata as Record<string, unknown> | undefined),
    [user],
  );

  const tenantRole = useMemo(
    () => readTenantRole(user?.app_metadata as Record<string, unknown> | undefined),
    [user],
  );

  const tenantId = useMemo(() => {
    const raw = (user?.app_metadata as Record<string, unknown> | undefined)?.tenant_id;
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }, [user]);

  const isSuperAdmin = role === 'super_admin';

  const loadPlan = useMemo(
    () => async (userId: string, tenant: string | null) => {
      const db = getSupabase();
      if (tenant) {
        const { data: sub } = await db
          .from('tenant_subscriptions')
          .select('plan_id')
          .eq('tenant_id', tenant)
          .maybeSingle();
        const fromTenant = (sub as { plan_id?: unknown } | null)?.plan_id;
        if (
          fromTenant === 'inicial' ||
          fromTenant === 'intermediario' ||
          fromTenant === 'avancado' ||
          fromTenant === 'basico'
        ) {
          setPlan(parsePlan(fromTenant));
          return;
        }
      }
      const { data, error } = await db
        .from('app_users')
        .select('commercial_plan')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        setPlan('avancado');
        return;
      }
      setPlan(parsePlan((data as { commercial_plan?: unknown } | null)?.commercial_plan));
    },
    [],
  );

  useEffect(() => {
    if (!user?.id) {
      setPlan('avancado');
      setPlanLoading(false);
      return;
    }
    if (isSuperAdmin && !tenantId) {
      setPlanLoading(false);
      return;
    }
    let cancelled = false;
    setPlanLoading(true);
    void loadPlan(user.id, tenantId).finally(() => {
      if (!cancelled) setPlanLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, tenantId, isSuperAdmin, loadPlan]);

  const reloadPlan = useMemo(
    () => async () => {
      if (user?.id) await loadPlan(user.id, tenantId);
    },
    [user?.id, tenantId, loadPlan],
  );

  const loading = authLoading || planLoading;

  const value = useMemo<AppUserContextValue>(
    () => ({
      userId: user?.id ?? null,
      role,
      tenantRole,
      tenantId,
      plan,
      isSuperAdmin,
      loading,
      reloadPlan,
    }),
    [user, role, tenantRole, tenantId, plan, isSuperAdmin, loading, reloadPlan],
  );

  return <AppUserContext.Provider value={value}>{children}</AppUserContext.Provider>;
}

export function useAppUser(): AppUserContextValue {
  const ctx = useContext(AppUserContext);
  if (!ctx) {
    throw new Error('useAppUser must be used inside <AppUserProvider>');
  }
  return ctx;
}
