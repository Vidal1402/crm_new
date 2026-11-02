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
  const round = (point: [number, number]): [number, number] => [Number(point[0].toFixed(5)), Number(point[1].toFixed(5))];
  const out: [number, number][] = [round(ring[0])];
  let last = ring[0];
  for (let index = 1; index < ring.length; index += 1) {
    const point = ring[index];
    const chord = Math.hypot(point[0] - last[0], point[1] - last[1]);
    if (index === ring.length - 1 || chord >= 0.003) {
      out.push(round(point));
      last = point;
    }
  }
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
