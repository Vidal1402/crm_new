import { getSupabase } from '@/lib/supabase';
import { parsePlan, type CommercialPlan } from '@/lib/plans';

export type TenantStatus = 'active' | 'paused' | 'cancelled';

export interface SaasTenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  owner_email: string | null;
  created_at: string;
  plan: CommercialPlan;
  subscription_status: string;
  users: number;
}

export interface SaasMember {
  user_id: string;
  email: string | null;
  role: 'admin' | 'operator';
  accepted_at: string | null;
  commercial_plan: CommercialPlan;
}

export interface PlatformAdmin {
  user_id: string;
  email: string;
  created_at: string;
}

async function invokeErrorMessage(error: unknown, data: { error?: string } | null): Promise<string> {
  if (data?.error) return data.error;
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = (await ctx.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      /* ignore */
    }
  }
  return (error as { message?: string } | null)?.message ?? 'Erro desconhecido';
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke('saas-tenants', {
    body: {
      ...body,
      app_url: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  const payload = data as (T & { ok?: boolean; error?: string }) | null;
  if (payload?.ok) return payload;
  throw new Error(await invokeErrorMessage(error, payload));
}

function normalizeTenant(row: Record<string, unknown>): SaasTenant {
  const status = row.status === 'paused' || row.status === 'cancelled' ? row.status : 'active';
  return {
    id: String(row.id ?? ''),
    slug: String(row.slug ?? ''),
    name: String(row.name ?? ''),
    status,
    owner_email: (row.owner_email as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    plan: parsePlan(row.plan),
    subscription_status: String(row.subscription_status ?? status),
    users: typeof row.users === 'number' ? row.users : 0,
  };
}

export async function listSaasTenants(): Promise<SaasTenant[]> {
  const payload = await invoke<{ tenants?: Record<string, unknown>[] }>({ action: 'list' });
  return (payload.tenants ?? []).map(normalizeTenant);
}

export async function createSaasTenant(input: {
  name: string;
  owner_email: string;
  plan: CommercialPlan;
  slug?: string;
}): Promise<SaasTenant> {
  const payload = await invoke<{ tenant?: Record<string, unknown> }>({
    action: 'create',
    ...input,
  });
  if (!payload.tenant) throw new Error('Resposta inválida ao criar o CRM.');
  return normalizeTenant(payload.tenant);
}

export async function updateSaasTenant(input: {
  id: string;
  status?: TenantStatus;
  plan?: CommercialPlan;
}): Promise<SaasTenant | null> {
  const payload = await invoke<{ tenant?: Record<string, unknown> }>({ action: 'update', ...input });
  return payload.tenant ? normalizeTenant(payload.tenant) : null;
}

export async function listSaasMembers(tenantId: string): Promise<SaasMember[]> {
  const payload = await invoke<{ members?: Record<string, unknown>[] }>({
    action: 'members',
    tenant_id: tenantId,
  });
  return (payload.members ?? []).map((row) => ({
    user_id: String(row.user_id ?? ''),
    email: (row.email as string | null) ?? null,
    role: row.role === 'admin' ? 'admin' : 'operator',
    accepted_at: (row.accepted_at as string | null) ?? null,
    commercial_plan: parsePlan(row.commercial_plan),
  }));
}

export async function inviteSaasMember(input: {
  tenant_id: string;
  email: string;
  role: 'admin' | 'operator';
}): Promise<void> {
  await invoke({ action: 'invite', ...input });
}

export async function revokeSaasMember(input: { tenant_id: string; user_id: string }): Promise<void> {
  await invoke({ action: 'revoke', ...input });
}

export async function listPlatformAdmins(): Promise<PlatformAdmin[]> {
  const payload = await invoke<{ admins?: Record<string, unknown>[] }>({
    action: 'list_platform_admins',
  });
  return (payload.admins ?? []).map((row) => ({
    user_id: String(row.user_id ?? ''),
    email: String(row.email ?? ''),
    created_at: String(row.created_at ?? ''),
  }));
}

export async function invitePlatformAdmin(email: string): Promise<void> {
  await invoke({ action: 'invite_platform_admin', email });
}

export async function revokePlatformAdmin(userId: string): Promise<void> {
  await invoke({ action: 'revoke_platform_admin', user_id: userId });
}
