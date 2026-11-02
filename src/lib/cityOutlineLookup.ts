import { cityKey } from './geocode';
import { MUNICIPIOS } from './municipios';
import { matchMunicipalities, outerRing, type Municipality } from './cityOutline';

const USER_AGENT = 'CRM-Espelho/1.0 (prospecting map; https://crm-new-rust.vercel.app)';

function municipalities(): Municipality[] {
  return MUNICIPIOS.map(([id, nome, uf]) => ({ id, nome, uf }));
}

async function preferredState(city: string): Promise<string> {
  const search = new URL('https://nominatim.openstreetmap.org/search');
  search.searchParams.set('q', `${city.trim()}, Brasil`);
  search.searchParams.set('format', 'jsonv2');
  search.searchParams.set('addressdetails', '1');
  search.searchParams.set('limit', '5');
  search.searchParams.set('countrycodes', 'br');
  search.searchParams.set('featuretype', 'city');
  const response = await fetch(search, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return '';
  const rows = await response.json() as { name?: string; addresstype?: string; address?: { 'ISO3166-2-lvl4'?: string } }[];
  const key = cityKey(city);
  const hit = rows.find((row) => (row.addresstype === 'municipality' || row.addresstype === 'city') && cityKey(row.name ?? '') === key);
  return hit?.address?.['ISO3166-2-lvl4']?.slice(-2).toUpperCase() ?? '';
}

export async function cityOutline(city: string): Promise<[number, number][] | null> {
  const matches = matchMunicipalities(municipalities(), city);
  let municipality = matches.length === 1 ? matches[0] : null;
  if (!municipality && matches.length > 1) {
    const uf = await preferredState(city);
    municipality = matches.find((row) => row.uf === uf) ?? null;
  }
  if (!municipality) return null;
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${municipality.id}?formato=application/vnd.geo+json&qualidade=minima`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('malha');
  return outerRing(await response.json());
}
