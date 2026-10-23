const DEFAULT_STALE_MS = 60_000;

type Entry = { data: unknown; at: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export function peekCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  return entry ? (entry.data as T) : undefined;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, at: Date.now() });
}

export function cacheFresh(key: string, staleMs = DEFAULT_STALE_MS): boolean {
  const entry = store.get(key);
  return Boolean(entry) && Date.now() - entry!.at < staleMs;
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    inflight.clear();
    return;
  }
  for (const key of [...store.keys()]) {
    if (key === prefix || key.startsWith(prefix)) store.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key === prefix || key.startsWith(prefix)) inflight.delete(key);
  }
}

export function clearQueryCache(): void {
  invalidateCache();
}

export async function fetchIfStale<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { force?: boolean; staleMs?: number },
): Promise<{ data: T; skipped: boolean }> {
  const staleMs = opts?.staleMs ?? DEFAULT_STALE_MS;
  if (!opts?.force && cacheFresh(key, staleMs)) {
    const cached = peekCache<T>(key);
    if (cached !== undefined) return { data: cached, skipped: true };
  }
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) {
    return { data: await pending, skipped: false };
  }
  const request = fetcher()
    .then((data) => {
      setCache(key, data);
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });
  inflight.set(key, request);
  return { data: await request, skipped: false };
}
