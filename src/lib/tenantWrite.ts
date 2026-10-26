import { getSupabase } from './supabase';

/** Anexa o tenant do JWT. A policy de RLS recusa a linha se o id não for o da sessão. */
export async function withTenant<T extends Record<string, unknown>>(row: T): Promise<T> {
  const { data } = await getSupabase().auth.getSession();
  const tenant = (data.session?.user.app_metadata as { tenant_id?: unknown } | undefined)?.tenant_id;
  if (typeof tenant !== 'string' || tenant.length === 0) return row;
  return { ...row, tenant_id: tenant };
}
