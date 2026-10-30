export type PlaceHit = {
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  instagram: string;
  linkedin: string;
  website: string;
  lat: number;
  lng: number;
};

export type PlaceArea = {
  lat: number;
  lng: number;
  south?: number;
  west?: number;
  north?: number;
  east?: number;
};

export function escapeOverpass(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\"]/g, '\\$&');
}

const NICHES: Record<string, { key: string; value: string }> = {
  padaria: { key: 'shop', value: 'bakery' },
  restaurante: { key: 'amenity', value: 'restaurant' },
  farmacia: { key: 'amenity', value: 'pharmacy' },
  dentista: { key: 'amenity', value: 'dentist' },
  academia: { key: 'leisure', value: 'fitness_centre' },
  mercado: { key: 'shop', value: 'supermarket' },
  'pet shop': { key: 'shop', value: 'pet' },
  oficina: { key: 'shop', value: 'car_repair' },
  salao: { key: 'shop', value: 'hairdresser' },
};

export function nicheKey(niche: string): string {
  return niche.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function nicheTag(niche: string): { key: string; value: string } | null {
  return NICHES[nicheKey(niche)] ?? null;
}

export function ringBox(ring: [number, number][]): PlaceArea | null {
  if (ring.length < 3) return null;
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const [lng, lat] of ring) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  if (east - west > 1.5 || north - south > 1.5 || east <= west || north <= south) return null;
  return { lat: (south + north) / 2, lng: (west + east) / 2, south, west, north, east };
}

function areaClause(area: PlaceArea): string | null {
  if (!Number.isFinite(area.lat) || !Number.isFinite(area.lng)) return null;
  if (area.lat < -90 || area.lat > 90 || area.lng < -180 || area.lng > 180) return null;
  const { south, west, north, east } = area;
  const boxed = [south, west, north, east].every((value) => Number.isFinite(value));
  if (boxed && north! > south! && east! > west! && north! - south! <= 0.2 && east! - west! <= 0.2) {
    return `(${south},${west},${north},${east})`;
  }
  return `(around:12000,${area.lat},${area.lng})`;
}

export function leadCount(value: unknown): number {
  if (value === undefined || value === null || value === '') return 10;
  const number = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(number)) return 10;
  return Math.min(30, Math.max(1, Math.trunc(number)));
}

export function placeQuery(niche: string, area: PlaceArea, limit: unknown = 10): string | null {
  const raw = niche.trim();
  if (raw.length < 3 || raw.length > 60) return null;
  const clause = areaClause(area);
  if (!clause) return null;
  const tag = nicheTag(raw);
  const filter = tag ? `["${tag.key}"="${tag.value}"]` : `["name"~"${escapeOverpass(raw)}",i]`;
  return `[out:json][timeout:12];\nnwr${filter}${clause};\nout center ${leadCount(limit)};`;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function coord(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function cityName(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function emailOf(value: string): string {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function profileUrl(value: string, host: 'instagram.com' | 'linkedin.com'): string {
  const raw = value.trim();
  if (!raw) return '';
  const linked = /^https?:\/\//i.test(raw) ? raw : raw.includes(`${host}/`) ? `https://${raw.replace(/^\/\//, '')}` : '';
  if (linked) {
    try {
      const url = new URL(linked);
      const name = url.hostname.replace(/^www\./, '');
      if (name !== host && !name.endsWith(`.${host}`)) return '';
      return url.toString();
    } catch {
      return '';
    }
  }
  if (host !== 'instagram.com') return '';
  const handle = raw.replace(/^@/, '');
  if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return '';
  return `https://www.instagram.com/${handle}`;
}

function publicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  const parts = host.split('.').map((part) => Number(part));
  if (parts.length === 4 && parts.every((part) => part >= 0 && part <= 255)) {
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)) return false;
  }
  return true;
}

function siteOf(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (!url.hostname.includes('.') || !publicHost(url.hostname)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function contactFields(tags: Record<string, unknown>) {
  return {
    phone: text(tags.phone) || text(tags['contact:phone']) || text(tags['contact:mobile']),
    email: emailOf(text(tags.email) || text(tags['contact:email'])),
    instagram: profileUrl(text(tags['contact:instagram']) || text(tags.instagram), 'instagram.com'),
    linkedin: profileUrl(text(tags['contact:linkedin']) || text(tags.linkedin), 'linkedin.com'),
    website: siteOf(text(tags.website) || text(tags['contact:website'])),
  };
}

function take(hits: PlaceHit[], fallbackCity: string, limit: unknown): PlaceHit[] {
  const seen = new Set<string>();
  const unique = hits.filter((hit) => {
    const key = `${cityName(hit.name)}|${hit.lat.toFixed(4)}|${hit.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const wanted = cityName(fallbackCity);
  const same = unique.filter((hit) => cityName(hit.city) === wanted);
  return (same.length > 0 ? same : unique).slice(0, leadCount(limit));
}

export function readHomepageLinks(html: string): { email: string; instagram: string; linkedin: string } {
  const mailto = html.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const instagram = html.match(/https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|reel\/|reels\/|explore\/|stories\/)[A-Za-z0-9._]+/i);
  const linkedin = html.match(/https?:\/\/(?:[\w.-]+\.)?linkedin\.com\/(?:company|in|school)\/[A-Za-z0-9._%-]+/i);
  return {
    email: mailto ? emailOf(mailto[1]) : '',
    instagram: instagram ? profileUrl(instagram[0], 'instagram.com') : '',
    linkedin: linkedin ? profileUrl(linkedin[0], 'linkedin.com') : '',
  };
}

export function parseOverpass(data: unknown, fallbackCity: string, limit: unknown = 10): PlaceHit[] {
  const elements = (data as { elements?: unknown })?.elements;
  if (!Array.isArray(elements)) return [];
  const hits: PlaceHit[] = [];
  for (const element of elements) {
    const row = element as {
      lat?: unknown;
      lon?: unknown;
      center?: { lat?: unknown; lon?: unknown };
      tags?: Record<string, unknown>;
    };
    const tags = row.tags ?? {};
    const name = text(tags.name);
    const lat = coord(row.lat) ?? coord(row.center?.lat);
    const lng = coord(row.lon) ?? coord(row.center?.lon);
    if (!name || lat === null || lng === null) continue;
    const street = [text(tags['addr:street']), text(tags['addr:housenumber'])].filter(Boolean).join(', ');
    hits.push({
      name,
      city: text(tags['addr:city']) || fallbackCity.trim(),
      address: street,
      ...contactFields(tags),
      lat,
      lng,
    });
  }
  return take(hits, fallbackCity, limit);
}

export function parseNominatim(data: unknown, fallbackCity: string, limit: unknown = 10): PlaceHit[] {
  if (!Array.isArray(data)) return [];
  const hits: PlaceHit[] = [];
  for (const element of data) {
    const row = element as {
      name?: unknown;
      lat?: unknown;
      lon?: unknown;
      address?: Record<string, unknown>;
      extratags?: Record<string, unknown>;
    };
    const address = row.address ?? {};
    const name = text(row.name) || text(address.amenity);
    const lat = coord(row.lat);
    const lng = coord(row.lon);
    if (!name || lat === null || lng === null) continue;
    const tags = row.extratags ?? {};
    hits.push({
      name,
      city: text(address.city) || text(address.town) || text(address.municipality) || fallbackCity.trim(),
      address: [text(address.road), text(address.house_number)].filter(Boolean).join(', '),
      ...contactFields(tags),
      lat,
      lng,
    });
  }
  return take(hits, fallbackCity, limit);
}

const SKIP_KEYS = new Set(['highway', 'boundary', 'place', 'waterway', 'natural', 'landuse']);

export function parsePhoton(data: unknown, fallbackCity: string, limit: unknown = 10): PlaceHit[] {
  const features = (data as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];
  const hits: PlaceHit[] = [];
  for (const feature of features) {
    const row = feature as {
      geometry?: { coordinates?: unknown[] };
      properties?: Record<string, unknown>;
    };
    const props = row.properties ?? {};
    if (SKIP_KEYS.has(text(props.osm_key))) continue;
    const name = text(props.name);
    const coordinates = row.geometry?.coordinates ?? [];
    const lng = coord(coordinates[0]);
    const lat = coord(coordinates[1]);
    if (!name || lat === null || lng === null) continue;
    hits.push({
      name,
      city: text(props.city) || fallbackCity.trim(),
      address: [text(props.street), text(props.housenumber)].filter(Boolean).join(', '),
      ...contactFields(props),
      lat,
      lng,
    });
  }
  return take(hits, fallbackCity, limit);
}
