import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSupabaseCredentials,
  getSupabaseCredentials,
  isSupabaseConfigured,
  setSupabaseCredentials,
  type SupabaseCredentials,
} from '@/lib/supabase';
import { credentialsFromPublicConfig } from '@/lib/publicConfig';

// ----------------------------------------------------------------------------
// SupabaseProvider
// ----------------------------------------------------------------------------
// Single source of truth for whether the app is bootstrapped. All children can
// ask `configured` and react accordingly (the router uses it to gate routes).
// Writes flow through `saveCredentials` / `clearCredentials` so the internal
// cached client is reset in lockstep with localStorage.
// ----------------------------------------------------------------------------

interface SupabaseContextValue {
  configured: boolean;
  credentials: SupabaseCredentials | null;
  saveCredentials: (creds: SupabaseCredentials) => void;
  clearCredentials: () => void;
}

export const SupabaseContext = createContext<SupabaseContextValue | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(() => isSupabaseConfigured());
  const [credentials, setCredentials] = useState<SupabaseCredentials | null>(
    () => getSupabaseCredentials(),
  );
  // Build sem as variáveis ainda pode achar a URL e a chave anon no runtime.
  // Enquanto isso não responde, não deixamos o roteador cair no wizard.
  const [probeDone, setProbeDone] = useState(() => isSupabaseConfigured());

  useEffect(() => {
    if (isSupabaseConfigured()) {
      setProbeDone(true);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setProbeDone(true);
    }, 4000);
    void fetch('/api/public-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled) return;
        const creds = credentialsFromPublicConfig(body);
        if (!creds) return;
        setSupabaseCredentials(creds);
        setCredentials(creds);
        setConfigured(true);
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timer);
        if (!cancelled) setProbeDone(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const saveCredentials = useCallback((creds: SupabaseCredentials) => {
    setSupabaseCredentials(creds);
    setCredentials(creds);
    setConfigured(true);
  }, []);

  const clearCredentials = useCallback(() => {
    clearSupabaseCredentials();
    setCredentials(null);
    setConfigured(false);
  }, []);

  const value = useMemo<SupabaseContextValue>(
    () => ({ configured, credentials, saveCredentials, clearCredentials }),
    [configured, credentials, saveCredentials, clearCredentials],
  );

  if (!probeDone) return null;

  return (
    <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
  );
}
