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

export function meteoPoint(data: {
  results?: { latitude?: number; longitude?: number; country_code?: string }[];
}): { lat: number; lng: number } | null {
  const rows = data.results ?? [];
  const hit = rows.find((row) => row.country_code === 'BR') ?? rows[0];
  if (!hit || !Number.isFinite(hit.latitude) || !Number.isFinite(hit.longitude)) return null;
  const lat = hit.latitude as number;
  const lng = hit.longitude as number;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

const KNOWN: Record<string, { lat: number; lng: number }> = {
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  vitoria: { lat: -20.3194, lng: -40.3378 },
  'vila velha': { lat: -20.3297, lng: -40.2925 },
  niteroi: { lat: -22.8832, lng: -43.1034 },
  'sao paulo': { lat: -23.5505, lng: -46.6333 },
};

export function cityKey(city: string): string {
  return city.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function knownCity(city: string): { lat: number; lng: number } | null {
  const pieces = city.split(/[,/|]| - /).map((part) => cityKey(part)).filter(Boolean);
  for (const piece of [cityKey(city), ...pieces]) {
    const hit = KNOWN[piece];
    if (hit) return hit;
  }
  return null;
}

export async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  const key = cityKey(city);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  const known = knownCity(city);
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=5&language=pt&format=json`;
    const response = await fetch(url);
    if (response.ok) {
      const point = meteoPoint(await response.json());
      if (point) {
        cache.set(key, point);
        return point;
      }
    }
  } catch {
    // The known city still places the contact when the request fails.
  }
  if (known) {
    cache.set(key, known);
    return known;
  }
  return null;
}
