import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { storyOperators } from '@/lib/mock/story';
import { cacheFresh, peekCache, setCache } from '@/lib/queryCache';

export interface Operator {
  user_id: string;
  email: string;
  name?: string | null;
  role: 'admin' | 'operator';
}

// Lista os membros da instância (via RPC list_operators) para o seletor de
// atribuição de conversas.
const OPERATORS_KEY = 'operators';

export function useOperators() {
  const cached = peekCache<Operator[]>(OPERATORS_KEY);
  const [operators, setOperators] = useState<Operator[]>(() => cached ?? []);
  const [loading, setLoading] = useState(() => !cached);

  useEffect(() => {
    if (cacheFresh(OPERATORS_KEY) && peekCache(OPERATORS_KEY)) return;
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase.schema('whatsapp_hub').rpc('list_operators');
      if (!cancelled) {
        const next = (data ?? []) as Operator[];
        const list = next.length > 0 ? next : storyOperators();
        setCache(OPERATORS_KEY, list);
        setOperators(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { operators, loading };
}
