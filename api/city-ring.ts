import { cityOutline } from './city-outline.js';

type ApiRequest = {
  method?: string;
  query?: { city?: string | string[] };
  body?: { city?: unknown };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};

function cityOf(req: ApiRequest): string {
  const query = req.query?.city;
  if (typeof query === 'string') return query;
  if (Array.isArray(query) && typeof query[0] === 'string') return query[0];
  return typeof req.body?.city === 'string' ? req.body.city : '';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
  const city = cityOf(req).trim();
  if (city.length < 2) return res.status(400).json({ ring: null });
  try {
    return res.status(200).json({ ring: await cityOutline(city) });
  } catch {
    return res.status(502).json({ ring: null });
  }
}
