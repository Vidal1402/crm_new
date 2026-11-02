import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

let known: boolean | null = null;

export function useWhatsappConnected(): boolean | null {
  const [connected, setConnected] = useState<boolean | null>(known);

  useEffect(() => {
    let cancelled = false;
    void getSupabase()
      .from('whatsapp_channels')
      .select('id, connected, enabled')
      .then(({ data, error }) => {
        if (cancelled) return;
        const rows = (data ?? []) as { connected: boolean; enabled: boolean }[];
        known = !error && rows.some((row) => row.connected && row.enabled);
        setConnected(known);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return connected;
}
