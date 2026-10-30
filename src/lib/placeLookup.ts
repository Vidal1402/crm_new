import { leadCount, nicheTag, parseNominatim, parseOverpass, parsePhoton, placeQuery, readHomepageLinks, type PlaceArea, type PlaceHit } from './places';

export { nicheTag };

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const USER_AGENT = 'CRM-Espelho/1.0 (prospecting map; https://crm-new-rust.vercel.app)';

async function overpassPlaces(query: string, city: string, limit: number, signal: AbortSignal): Promise<PlaceHit[]> {
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
      const places = parseOverpass(await response.json(), city, limit);
      if (places.length > 0) return places;
    } catch {
      continue;
    }
  }
  return [];
}

async function photonPlaces(niche: string, city: string, area: PlaceArea, limit: number): Promise<PlaceHit[]> {
  const search = new URL('https://photon.komoot.io/api/');
  search.searchParams.set('q', niche.trim());
  search.searchParams.set('lat', String(area.lat));
  search.searchParams.set('lon', String(area.lng));
  search.searchParams.set('limit', String(limit));
  const tag = nicheTag(niche);
  if (tag) search.searchParams.set('osm_tag', `${tag.key}:${tag.value}`);
  const response = await fetch(search, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('A busca de empresas não respondeu.');
  return parsePhoton(await response.json(), city, limit);
}

async function nominatimPlaces(name: string, city: string, limit: number): Promise<PlaceHit[]> {
  const search = new URL('https://nominatim.openstreetmap.org/search');
  search.searchParams.set('q', `${name.trim()}, ${city.trim()}, Brasil`);
  search.searchParams.set('format', 'jsonv2');
  search.searchParams.set('limit', String(limit));
  search.searchParams.set('addressdetails', '1');
  search.searchParams.set('extratags', '1');
  search.searchParams.set('countrycodes', 'br');
  const response = await fetch(search, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('A busca de empresas não respondeu.');
  return parseNominatim(await response.json(), city, limit);
}

async function readHomepage(hit: PlaceHit): Promise<PlaceHit> {
  if ((hit.email && hit.instagram && hit.linkedin) || !hit.website) return hit;
  try {
    const response = await fetch(hit.website, {
      headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return hit;
    const html = (await response.text()).slice(0, 200000);
    const found = readHomepageLinks(html);
    return {
      ...hit,
      email: hit.email || found.email,
      instagram: hit.instagram || found.instagram,
      linkedin: hit.linkedin || found.linkedin,
    };
  } catch {
    return hit;
  }
}

function pickList(overpass: PlaceHit[], listed: PlaceHit[], named: PlaceHit[]): PlaceHit[] {
  if (overpass.length >= 2) return overpass;
  if (listed.length >= 2) return listed;
  if (named.length >= 2) return named;
  return overpass.length ? overpass : listed.length ? listed : named;
}

export async function findPlaces(niche: string, city: string, area: PlaceArea, limit: unknown = 10): Promise<PlaceHit[]> {
  const count = leadCount(limit);
  const query = placeQuery(niche, area, count);
  if (!query) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const overpass = overpassPlaces(query, city, count, controller.signal);
  let listed: PlaceHit[] = [];
  try {
    listed = await photonPlaces(niche, city, area, count);
  } catch {
    listed = [];
  }
  const fromOverpass = await Promise.race([
    overpass,
    new Promise<PlaceHit[]>((resolve) => setTimeout(() => resolve([]), 1500)),
  ]);
  clearTimeout(timer);
  controller.abort();
  let chosen: PlaceHit[] = [];
  if (fromOverpass.length >= 2 || listed.length >= 2) chosen = pickList(fromOverpass, listed, []);
  else {
    try {
      const named = await nominatimPlaces(niche, city, count);
      chosen = pickList(fromOverpass, listed, named);
    } catch (error) {
      if (fromOverpass.length > 0 || listed.length > 0) chosen = pickList(fromOverpass, listed, []);
      else throw error;
    }
  }
  return Promise.all(chosen.slice(0, count).map((hit) => readHomepage(hit)));
}
