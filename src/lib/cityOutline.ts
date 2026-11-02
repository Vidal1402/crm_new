export type Municipality = { id: number; nome: string; uf: string };

function cityKey(city: string): string {
  return city.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const UF = new Set(['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt', 'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'rs', 'sc', 'se', 'sp', 'to']);

export function splitCity(city: string): { name: string; uf: string } {
  const trimmed = city.trim();
  const match = trimmed.match(/^(.*?)(?:\s*[,\-/]\s*)([A-Za-z]{2})$/);
  if (match && UF.has(match[2].toLowerCase())) return { name: match[1].trim(), uf: match[2].toUpperCase() };
  return { name: trimmed, uf: '' };
}

export function matchMunicipalities(rows: Municipality[], city: string): Municipality[] {
  const { name, uf } = splitCity(city);
  const key = cityKey(name);
  if (!key) return [];
  return rows.filter((row) => cityKey(row.nome) === key && (!uf || row.uf === uf));
}

function decimate(ring: [number, number][]): [number, number][] {
  const step = Math.max(1, Math.ceil(ring.length / 80));
  const out = ring.filter((_, index) => index % step === 0).map(([lng, lat]) => [Number(lng.toFixed(4)), Number(lat.toFixed(4))] as [number, number]);
  if (out.length > 1 && (out[0][0] !== out.at(-1)?.[0] || out[0][1] !== out.at(-1)?.[1])) out.push(out[0]);
  return out;
}

function asGeometry(value: unknown): { type?: string; coordinates?: unknown } | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as { type?: string; geometry?: unknown; features?: { geometry?: unknown }[]; coordinates?: unknown };
  if (row.type === 'FeatureCollection') return asGeometry(row.features?.[0]?.geometry);
  if (row.type === 'Feature') return asGeometry(row.geometry);
  if (row.type === 'Polygon' || row.type === 'MultiPolygon') return row;
  return null;
}

export function outerRing(value: unknown): [number, number][] | null {
  const geometry = asGeometry(value);
  if (!geometry) return null;
  const candidates = geometry.type === 'Polygon'
    ? (geometry.coordinates as number[][][])
    : geometry.type === 'MultiPolygon'
      ? (geometry.coordinates as number[][][][]).map((poly) => poly[0])
      : [];
  const ring = [...candidates].filter((item) => Array.isArray(item) && item.length >= 3).sort((a, b) => b.length - a.length)[0];
  if (!ring) return null;
  const shaped = decimate(ring.map(([lng, lat]) => [lng, lat]));
  return shaped.length >= 3 ? shaped : null;
}
