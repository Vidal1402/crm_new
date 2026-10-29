const cache = new Map<string, { lat: number; lng: number } | null>();

export function photonPoint(data: {
  features?: { geometry?: { coordinates?: number[] } }[];
}): { lat: number; lng: number } | null {
  const coordinates = data.features?.[0]?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  const key = city.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(`${city.trim()}, Brasil`)}&limit=1&lang=pt`;
    const response = await fetch(url);
    if (!response.ok) {
      cache.set(key, null);
      return null;
    }
    const point = photonPoint(await response.json());
    cache.set(key, point);
    return point;
  } catch {
    cache.set(key, null);
    return null;
  }
}
