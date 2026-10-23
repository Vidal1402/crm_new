import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAppUser } from '@/app/providers/AppUserProvider';
import { isStoryId, mergeById, storyTemplates } from '@/lib/mock/story';
import { cacheFresh, peekCache, setCache } from '@/lib/queryCache';
import type { Template } from '@/types/templates';

interface UseTemplatesResult {
  templates: Template[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (input: Omit<Template, 'id' | 'created_at' | 'updated_at' | 'status' | 'meta_template_id' | 'meta_template_status' | 'submitted_at' | 'approved_at'>) => Promise<Template | null>;
  update: (id: string, patch: Partial<Template>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useTemplates(): UseTemplatesResult {
  const { userId } = useAppUser();
  const cacheKey = userId ? `templates:${userId}` : '';
  const cached = cacheKey ? peekCache<Template[]>(cacheKey) : undefined;
  const [templates, setTemplates] = useState<Template[]>(() => cached ?? []);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (opts?: { force?: boolean }) => {
    if (!userId) return;
    const key = `templates:${userId}`;
    if (!opts?.force && cacheFresh(key)) {
      const hit = peekCache<Template[]>(key);
      if (hit) {
        setTemplates(hit);
        setLoading(false);
        return;
      }
    }
    if (!peekCache(key)) setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const { data, error: err } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    const next = mergeById(storyTemplates(), err ? [] : ((data ?? []) as Template[]));
    setCache(key, next);
    setTemplates(next);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create: UseTemplatesResult['create'] = async (input) => {
    if (!userId) return null;
    const supabase = getSupabase();
    const { data, error: err } = await supabase
      .from('templates')
      .insert({ ...input, status: 'draft' })
      .select()
      .single();
    if (err) {
      setError(err.message);
      throw new Error(translateDbError(err.message));
    }
    await reload({ force: true });
    return data as Template;
  };

  const update: UseTemplatesResult['update'] = async (id, patch) => {
    const supabase = getSupabase();
    const { error: err } = await supabase.schema('whatsapp_hub').from('templates').update(patch).eq('id', id);
    if (err) {
      setError(err.message);
      throw new Error(translateDbError(err.message));
    }
    await reload({ force: true });
  };

  const remove: UseTemplatesResult['remove'] = async (id) => {
    if (isStoryId(id)) return;
    const supabase = getSupabase();
    const { error: err } = await supabase.schema('whatsapp_hub').from('templates').delete().eq('id', id);
    if (err) {
      setError(err.message);
      throw new Error(translateDbError(err.message));
    }
    await reload({ force: true });
  };

  return { templates, loading, error, reload, create, update, remove };
}

// Maps the most common Postgres/PostgREST errors to actionable pt-BR messages.
function translateDbError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('duplicate key')) return 'Registro duplicado — verifique os dados informados.';
  if (lower.includes('row-level security') || lower.includes('permission denied')) return 'Você não tem permissão para esta ação.';
  if (lower.includes('violates foreign key')) return 'Não é possível concluir: há registros vinculados.';
  if (lower.includes('violates check constraint') || lower.includes('invalid input')) return 'Dados inválidos — revise os campos e tente novamente.';
  return message || 'Não foi possível concluir a operação.';
}
