import { CITY_RINGS } from './cityRings';
import { cityKey } from './geocode';

const fetched = new Map<string, [number, number][] | null>();

export function cityRing(city: string): [number, number][] | null {
  return CITY_RINGS[cityKey(city)] ?? fetched.get(cityKey(city)) ?? null;
}

function span(ring: [number, number][]) {
  const lngs = ring.map((point) => point[0]);
  const lats = ring.map((point) => point[1]);
  return { w: Math.max(...lngs) - Math.min(...lngs), h: Math.max(...lats) - Math.min(...lats) };
}

function decimate(ring: [number, number][]) {
  const step = Math.max(1, Math.ceil(ring.length / 70));
  const out = ring.filter((_, index) => index % step === 0).map(([lng, lat]) => [Number(lng.toFixed(4)), Number(lat.toFixed(4))] as [number, number]);
  if (out.length > 1 && (out[0][0] !== out.at(-1)?.[0] || out[0][1] !== out.at(-1)?.[1])) out.push(out[0]);
  return out;
}

export async function loadCityRing(city: string): Promise<[number, number][] | null> {
  const key = cityKey(city);
  if (!key) return null;
  const ready = cityRing(city);
  if (ready) return ready;
  if (fetched.has(key)) return fetched.get(key) ?? null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${city.trim()}, Brasil`)}&format=json&polygon_geojson=1&limit=5&addressdetails=1&featuretype=city`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      fetched.set(key, null);
      return null;
    }
    const rows = await response.json() as { addresstype?: string; geojson?: { type?: string; coordinates?: number[][][] | number[][][][] } }[];
    const hit = rows.find((row) => row.addresstype === 'city' && row.geojson);
    const geometry = hit?.geojson;
    const candidates = geometry?.type === 'Polygon'
      ? (geometry.coordinates as number[][][])
      : geometry?.type === 'MultiPolygon'
        ? (geometry.coordinates as number[][][][]).map((poly) => poly[0])
        : [];
    const ring = candidates.sort((a, b) => b.length - a.length)[0];
    if (!ring) {
      fetched.set(key, null);
      return null;
    }
    const shaped = decimate(ring.map(([lng, lat]) => [lng, lat]));
    const box = span(shaped);
    if (box.w > 1.5 || box.h > 1.5) {
      fetched.set(key, null);
      return null;
    }
    fetched.set(key, shaped);
    return shaped;
  } catch {
    fetched.set(key, null);
    return null;
  }
}
