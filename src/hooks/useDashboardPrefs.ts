import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAppUser } from '@/app/providers/AppUserProvider';
import { WIDGETS, type WidgetKey } from '@/lib/dashboard';
import { cacheFresh, peekCache, setCache } from '@/lib/queryCache';

interface PrefRow {
  id: string;
  user_id: string | null;
  widget_key: string;
  visible: boolean;
  position: number;
}

// Visibilidade efetiva: default da instância (user_id NULL) sobrescrito pela
// preferência do usuário. Sem registro → visível. Toggles gravam por usuário.
const PREFS_KEY = 'dashboardPrefs';

export function useDashboardPrefs() {
  const { userId } = useAppUser();
  const cached = peekCache<PrefRow[]>(PREFS_KEY);
  const [rows, setRows] = useState<PrefRow[]>(() => cached ?? []);
  const [loading, setLoading] = useState(() => !cached);

  const reload = useCallback(async (opts?: { force?: boolean }) => {
    if (!opts?.force && cacheFresh(PREFS_KEY) && peekCache(PREFS_KEY)) {
      setRows(peekCache<PrefRow[]>(PREFS_KEY)!);
      setLoading(false);
      return;
    }
    if (!peekCache(PREFS_KEY)) setLoading(true);
    const supabase = getSupabase();
    // RLS já restringe a "minhas linhas + defaults".
    const { data } = await supabase.from('dashboard_preferences').select('*');
    const next = (data ?? []) as PrefRow[];
    setCache(PREFS_KEY, next);
    setRows(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const { visibleMap, myRowByKey } = useMemo(() => {
    const defaults = new Map<string, boolean>();
    const mine = new Map<string, PrefRow>();
    for (const r of rows) {
      if (r.user_id === null) defaults.set(r.widget_key, r.visible);
      else if (r.user_id === userId) mine.set(r.widget_key, r);
    }
    const map = {} as Record<WidgetKey, boolean>;
    for (const w of WIDGETS) {
      const mineRow = mine.get(w.key);
      if (mineRow) map[w.key] = mineRow.visible;
      else if (defaults.has(w.key)) map[w.key] = defaults.get(w.key)!;
      else map[w.key] = true;
    }
    return { visibleMap: map, myRowByKey: mine };
  }, [rows, userId]);

  const toggle = useCallback(
    async (key: WidgetKey): Promise<string | null> => {
      if (!userId) return null;
      const next = !visibleMap[key];
      const supabase = getSupabase();
      const existing = myRowByKey.get(key);
      if (existing) {
        setRows((cur) => {
          const rowsNext = cur.map((r) => (r.id === existing.id ? { ...r, visible: next } : r));
          setCache(PREFS_KEY, rowsNext);
          return rowsNext;
        });
        await supabase.from('dashboard_preferences').update({ visible: next }).eq('id', existing.id);
        return existing.id;
      }
      const { data, error } = await supabase
        .from('dashboard_preferences')
        .insert({ user_id: userId, widget_key: key, visible: next })
        .select('*')
        .single();
      if (error || !data) return null;
      const row = data as PrefRow;
      setRows((cur) => {
        const rowsNext = [...cur, row];
        setCache(PREFS_KEY, rowsNext);
        return rowsNext;
      });
      return row.id;
    },
    [userId, visibleMap, myRowByKey],
  );

  return { visibleMap, toggle, loading, reload };
}
