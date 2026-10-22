import type { SupabaseCredentials } from './supabase.ts';

/** Aceita só o par público que o bundle usaria. Chave de serviço nunca entra aqui. */
export function credentialsFromPublicConfig(body: unknown): SupabaseCredentials | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const url = typeof record.url === 'string' ? record.url.trim() : '';
  const anonKey = typeof record.anonKey === 'string' ? record.anonKey.trim() : '';
  if (!url || !anonKey) return null;
  if (!/^https:\/\/[^\s]+$/i.test(url)) return null;
  return { url, anonKey };
}
