export type PlaceHit = {
  name: string;
  city: string;
  address: string;
  phone: string;
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

export function placeQuery(niche: string, area: PlaceArea): string | null {
  const raw = niche.trim();
  if (raw.length < 3 || raw.length > 60) return null;
  const clause = areaClause(area);
  if (!clause) return null;
  const tag = nicheTag(raw);
  const filter = tag ? `["${tag.key}"="${tag.value}"]` : `["name"~"${escapeOverpass(raw)}",i]`;
  return `[out:json][timeout:12];\nnwr${filter}${clause};\nout center 15;`;
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

function take(hits: PlaceHit[], fallbackCity: string): PlaceHit[] {
  const seen = new Set<string>();
  const unique = hits.filter((hit) => {
    const key = `${cityName(hit.name)}|${hit.lat.toFixed(4)}|${hit.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const wanted = cityName(fallbackCity);
  const same = unique.filter((hit) => cityName(hit.city) === wanted);
  return (same.length > 0 ? same : unique).slice(0, 15);
}

export function parseOverpass(data: unknown, fallbackCity: string): PlaceHit[] {
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
      phone: text(tags.phone) || text(tags['contact:phone']) || text(tags['contact:mobile']),
      lat,
      lng,
    });
  }
  return take(hits, fallbackCity);
}

export function parseNominatim(data: unknown, fallbackCity: string): PlaceHit[] {
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
      phone: text(tags.phone) || text(tags['contact:phone']),
      lat,
      lng,
    });
  }
  return take(hits, fallbackCity);
}

const SKIP_KEYS = new Set(['highway', 'boundary', 'place', 'waterway', 'natural', 'landuse']);

export function parsePhoton(data: unknown, fallbackCity: string): PlaceHit[] {
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
      phone: text(props.phone) || text(props['contact:phone']),
      lat,
      lng,
    });
  }
  return take(hits, fallbackCity);
}
