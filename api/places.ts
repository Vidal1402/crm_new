import { findPlaces } from './place-search.js';

type PlaceArea = {
  lat: number;
  lng: number;
  south?: number;
  west?: number;
  north?: number;
  east?: number;
};

type ApiRequest = {
  method?: string;
  body?: {
    name?: unknown;
    city?: unknown;
    lat?: unknown;
    lng?: unknown;
    south?: unknown;
    west?: unknown;
    north?: unknown;
    east?: unknown;
  };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};

function num(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) ? number : undefined;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const lat = num(body.lat);
  const lng = num(body.lng);
  if (name.length < 3 || !city || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Informe a empresa e a cidade.' });
  }
  const area: PlaceArea = { lat, lng, south: num(body.south), west: num(body.west), north: num(body.north), east: num(body.east) };
  try {
    const places = await findPlaces(name, city, area);
    return res.status(200).json({ places });
  } catch {
    return res.status(502).json({ error: 'A busca de empresas não respondeu. Tente de novo.' });
  }
}
