import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { cacheFresh, peekCache, setCache } from '@/lib/queryCache';

export interface ZernioNumber {
  display_phone_number: string | null;
  verified_name: string | null;
  messaging_limit_tier: string | null;
  quality_rating: string | null;
  health_status: string | null;
}

interface NumberStatus {
  connected: boolean;
  number: ZernioNumber | null;
}

// Lê o status do número WhatsApp (tier/quality/health) via Edge Function
// zernio-number-status. Usado pelo widget do dashboard.
const NUMBER_STATUS_KEY = 'numberStatus';

export function useNumberStatus() {
  const cached = peekCache<NumberStatus>(NUMBER_STATUS_KEY);
  const [status, setStatus] = useState<NumberStatus | null>(() => cached ?? null);
  const [loading, setLoading] = useState(() => !cached);

  useEffect(() => {
    if (cacheFresh(NUMBER_STATUS_KEY) && peekCache(NUMBER_STATUS_KEY)) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.functions.invoke('zernio-number-status', { body: {} });
        if (!cancelled && data?.ok) {
          const next = { connected: Boolean(data.connected), number: data.number ?? null };
          setCache(NUMBER_STATUS_KEY, next);
          setStatus(next);
        }
      } catch {
        // Widget é informativo; falha não bloqueia o dashboard.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, loading };
}
