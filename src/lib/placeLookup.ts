import { parseNominatim, parseOverpass, placeQuery, type PlaceArea, type PlaceHit } from './places';

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const USER_AGENT = 'CRM-Espelho/1.0 (prospecting map; https://crm-new-rust.vercel.app)';

async function overpassPlaces(query: string, city: string, signal: AbortSignal): Promise<PlaceHit[]> {
  for (const url of OVERPASS) {
    if (signal.aborted) return [];
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });
      if (!response.ok) continue;
      const places = parseOverpass(await response.json(), city);
      if (places.length > 0) return places;
    } catch {
      continue;
    }
  }
  return [];
}

async function nominatimPlaces(name: string, city: string): Promise<PlaceHit[]> {
  const search = new URL('https://nominatim.openstreetmap.org/search');
  search.searchParams.set('q', `${name.trim()}, ${city.trim()}, Brasil`);
  search.searchParams.set('format', 'jsonv2');
  search.searchParams.set('limit', '15');
  search.searchParams.set('addressdetails', '1');
  search.searchParams.set('extratags', '1');
  search.searchParams.set('countrycodes', 'br');
  const response = await fetch(search, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('A busca de empresas não respondeu.');
  return parseNominatim(await response.json(), city);
}

export async function findPlaces(name: string, city: string, area: PlaceArea): Promise<PlaceHit[]> {
  const query = placeQuery(name, area);
  if (!query) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const overpass = overpassPlaces(query, city, controller.signal);
  let named: PlaceHit[] = [];
  try {
    named = await nominatimPlaces(name, city);
  } catch (error) {
    const fromOverpass = await overpass;
    clearTimeout(timer);
    controller.abort();
    if (fromOverpass.length > 0) return fromOverpass;
    throw error;
  }
  const fromOverpass = await Promise.race([
    overpass,
    new Promise<PlaceHit[]>((resolve) => setTimeout(() => resolve([]), 1200)),
  ]);
  clearTimeout(timer);
  controller.abort();
  return fromOverpass.length > 0 ? fromOverpass : named;
}
