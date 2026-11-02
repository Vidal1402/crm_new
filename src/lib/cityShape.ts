import { CITY_RINGS } from './cityRings';
import { cityKey } from './geocode';

const fetched = new Map<string, [number, number][] | null>();

export function cityRing(city: string): [number, number][] | null {
  return CITY_RINGS[cityKey(city)] ?? fetched.get(cityKey(city)) ?? null;
}

const pending = new Map<string, Promise<[number, number][] | null>>();

export async function loadCityRing(city: string): Promise<[number, number][] | null> {
  const key = cityKey(city);
  if (!key) return null;
  const ready = cityRing(city);
  if (ready) return ready;
  if (fetched.has(key)) return fetched.get(key) ?? null;
  const running = pending.get(key);
  if (running) return running;
  const task = fetch(`/api/city-ring?city=${encodeURIComponent(city.trim())}`)
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as { ring?: [number, number][] };
      const ring = Array.isArray(data.ring) && data.ring.length >= 3 ? data.ring : null;
      fetched.set(key, ring);
      return ring;
    })
    .catch(() => null)
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
