import { cityKey } from './geocode';
import { outerRing } from './cityOutline';

const USER_AGENT = 'CRM-Espelho/1.0 (prospecting map; https://crm-new-rust.vercel.app)';

type OutlineRow = {
  name?: string;
  addresstype?: string;
  category?: string;
  geojson?: unknown;
};

export async function cityOutline(city: string): Promise<[number, number][] | null> {
  const key = cityKey(city);
  if (!key) return null;
  const search = new URL('https://nominatim.openstreetmap.org/search');
  search.searchParams.set('q', `${city.trim()}, Brasil`);
  search.searchParams.set('format', 'jsonv2');
  search.searchParams.set('polygon_geojson', '1');
  search.searchParams.set('polygon_threshold', '0.001');
  search.searchParams.set('limit', '5');
  search.searchParams.set('addressdetails', '1');
  search.searchParams.set('countrycodes', 'br');
  search.searchParams.set('featuretype', 'city');
  const response = await fetch(search, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('nominatim');
  const rows = await response.json() as OutlineRow[];
  const matches = rows.filter((row) => (row.addresstype === 'municipality' || row.addresstype === 'city') && row.category !== 'place' && cityKey(row.name ?? '') === key && row.geojson);
  const hit = matches.find((row) => row.addresstype === 'municipality') ?? matches[0];
  return hit ? outerRing(hit.geojson) : null;
}
