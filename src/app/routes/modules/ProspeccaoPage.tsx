import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { ModuleHeader, Panel, fieldClass } from '@/components/modules/ModuleChrome';
import { TerritoryHeatmap, type HeatZone, heatZoneLabel } from '@/components/modules/TerritoryHeatmap';
import { knownCity, cityKey, sameCity, geocodeCity } from '@/lib/geocode';
import { cityRing, loadCityRing } from '@/lib/cityShape';
import { HEAT_COLORS, contactStatusColor, hottestColor } from '@/lib/heatStatus';
import { ringBox, type PlaceHit } from '@/lib/places';
import { normalizePhone } from '@/lib/phone';
import { useCrmFeed } from '@/hooks/useCrmFeed';
import { cn } from '@/lib/utils';

export default function ProspeccaoPage() {
  const feed = useCrmFeed();
  const [q, setQ] = useState('');
  const [funnel, setFunnel] = useState('Todos');
  const [list, setList] = useState('Todas');
  const [zone, setZone] = useState<string | null>(null);
  const [newList, setNewList] = useState('');
  const [niche, setNiche] = useState('');
  const [companyCity, setCompanyCity] = useState('Rio de Janeiro');
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [extraRings, setExtraRings] = useState<Record<string, [number, number][]>>({});
  const triedRings = useRef(new Set<string>());
  const lists = [...new Set(feed.contacts.map((item) => item.list).filter(Boolean))];
  const cityNames = [...new Set(feed.contacts.map((item) => item.city).filter(Boolean))].sort().join('|');
  useEffect(() => {
    const missing = cityNames.split('|').filter((city) => city && !cityRing(city) && !triedRings.current.has(city));
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const city of missing.slice(0, 6)) {
        triedRings.current.add(city);
        const ring = await loadCityRing(city);
        if (cancelled || !ring) continue;
        setExtraRings((current) => ({ ...current, [cityKey(city)]: ring }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cityNames]);
  useEffect(() => {
    if (zone) setCompanyCity(zone);
  }, [zone]);
  const hitKey = (hit: PlaceHit) => `${hit.name}|${hit.lat.toFixed(4)}|${hit.lng.toFixed(4)}`;
  async function searchNiche() {
    const wanted = niche.trim();
    const city = companyCity.trim();
    if (wanted.length < 3 || !city) {
      setSearchError('Digite a cidade e o nicho.');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const point = knownCity(city) ?? await geocodeCity(city);
      if (!point) {
        setSearchError('Não achei essa cidade.');
        setHits([]);
        return;
      }
      const box = ringBox(cityRing(city) ?? []);
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: wanted, city, lat: point.lat, lng: point.lng, ...(box ?? {}) }),
      });
      const data = await response.json() as { places?: PlaceHit[]; knownNiche?: boolean; error?: string };
      if (!response.ok) {
        setSearchError(data.error || 'A busca de empresas não respondeu. Tente de novo.');
        setHits([]);
        return;
      }
      const places = data.places ?? [];
      setHits(places);
      setPhones(Object.fromEntries(places.map((hit) => [hitKey(hit), hit.phone])));
      if (places.length === 0) {
        setSearchError(data.knownNiche
          ? 'Nenhuma empresa desse nicho nessa cidade.'
          : 'Esse nicho não está na lista (padaria, restaurante, farmácia, dentista, academia, mercado, pet shop, oficina, salão). Nada com esse nome nessa cidade.');
      }
    } catch {
      setSearchError('A busca de empresas não respondeu. Tente de novo.');
      setHits([]);
    } finally {
      setSearching(false);
    }
  }
  const zones = useMemo<HeatZone[]>(() => {
    const counts = new Map<string, { label: string; leads: number }>();
    for (const contact of feed.contacts) {
      const key = cityKey(contact.city);
      if (!key) continue;
      const row = counts.get(key) ?? { label: contact.city.trim(), leads: 0 };
      row.leads += 1;
      counts.set(key, row);
    }
    return [...counts.entries()].flatMap(([key, bucket]) => {
      const city = bucket.label;
      const sample = feed.contacts.find((item) => cityKey(item.city) === key && item.lat !== null && item.lng !== null);
      const point = sample && sample.lat !== null && sample.lng !== null
        ? { lat: sample.lat, lng: sample.lng }
        : knownCity(key);
      if (!point) return [];
      const colors = feed.deals
        .filter((deal) => feed.contacts.some((item) => item.id === deal.contactId && cityKey(item.city) === key))
        .map((deal) => contactStatusColor(deal.stageName, deal.status));
      return [{
        city,
        label: city,
        lng: point.lng,
        lat: point.lat,
        v: Math.min(1, bucket.leads / 20),
        leads: bucket.leads,
        color: colors.length > 0 ? hottestColor(colors) : HEAT_COLORS.green,
        ring: cityRing(key) ?? extraRings[key],
      }];
    });
  }, [feed.contacts, feed.deals, extraRings]);
  const filtered = feed.contacts.filter((item) => {
    const hay = `${item.name} ${item.city} ${item.address} ${item.phone} ${item.email}`.toLowerCase();
    const pipelineNames = feed.deals.filter((deal) => deal.contactId === item.id).map((deal) => deal.pipelineName);
    return hay.includes(q.toLowerCase())
      && (funnel === 'Todos' || pipelineNames.includes(funnel))
      && (list === 'Todas' || item.list === list)
      && (!zone || sameCity(item.city, zone));
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Prospecção" subtitle="Contatos gravados na conta. O CSV pede nome e telefone." />
      {feed.error ? <p className="text-sm text-[#DC2626]">{feed.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Nome, telefone ou cidade" className={cn(fieldClass, 'h-10 w-full pl-9')} />
        </div>
        <select value={funnel} onChange={(event) => setFunnel(event.target.value)} className={fieldClass}>
          <option>Todos</option>
          {feed.pipelines.map((item) => <option key={item.id}>{item.name}</option>)}
        </select>
        <select value={list} onChange={(event) => setList(event.target.value)} className={fieldClass}>
          <option>Todas</option>
          {lists.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>
      <Panel title="Buscar por nicho" action={<span className="text-[11px] text-[#9CA3AF]">OpenStreetMap</span>}>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void searchNiche();
          }}
        >
          <input value={companyCity} onChange={(event) => setCompanyCity(event.target.value)} placeholder="Cidade" className={cn(fieldClass, 'w-48')} />
          <input value={niche} onChange={(event) => setNiche(event.target.value)} placeholder="Nicho, ex. padaria" className={cn(fieldClass, 'min-w-[220px] flex-1')} />
          <button type="submit" disabled={searching} className="h-10 rounded-lg bg-[#111827] px-3 text-sm font-medium text-white disabled:opacity-60">
            {searching ? 'Buscando' : 'Buscar'}
          </button>
        </form>
        {searchError ? <p className="mt-3 text-sm text-[#DC2626]">{searchError}</p> : null}
        <ul className="mt-3 divide-y divide-[#F3F4F6] text-sm">
          {hits.map((hit) => {
            const key = hitKey(hit);
            const draft = phones[key] ?? '';
            const ready = normalizePhone(draft).ok;
            return (
              <li key={key} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-[180px] flex-1">
                  <div className="font-medium text-[#111827]">{hit.name}</div>
                  <div className="text-[12px] text-[#6B7280]">{[hit.address, hit.city].filter(Boolean).join(' · ') || hit.city}</div>
                </div>
                <input
                  value={draft}
                  onChange={(event) => setPhones((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder="Telefone para gravar"
                  className={cn(fieldClass, 'w-48')}
                />
                <button
                  type="button"
                  disabled={!ready || saved[key] !== undefined}
                  onClick={() => {
                    const parsed = normalizePhone(draft);
                    if (!parsed.ok) return;
                    setSaved((current) => ({ ...current, [key]: false }));
                    void feed.addContact({
                      name: hit.name,
                      phone: parsed.e164,
                      city: hit.city || companyCity.trim(),
                      address: hit.address,
                      lat: hit.lat,
                      lng: hit.lng,
                      list: list === 'Todas' ? newList.trim() : list,
                    }).then((ok) => {
                      setSaved((current) => {
                        const next = { ...current };
                        if (ok) next[key] = true;
                        else delete next[key];
                        return next;
                      });
                    });
                  }}
                  className="h-10 rounded-lg bg-[#111827] px-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saved[key] === true ? 'Gravado' : saved[key] === false ? 'Gravando' : 'Gravar'}
                </button>
              </li>
            );
          })}
        </ul>
        {hits.length > 0 ? <p className="text-[12px] text-[#6B7280]">Sem telefone no mapa, digite um número válido para gravar. O contato entra na cidade e no mapa.</p> : null}
      </Panel>
      <Panel
        title="Mapa"
        action={zone ? <button type="button" onClick={() => setZone(null)} className="text-xs text-[#6B7280]">Limpar {heatZoneLabel(zone)}</button> : <span className="text-[11px] text-[#9CA3AF]">Cidades dos contatos</span>}
      >
        <TerritoryHeatmap selected={zone} onSelect={setZone} zones={zones} />
        {zones.length === 0 && feed.contacts.some((item) => item.city) ? (
          <p className="mt-2 text-xs text-[#6B7280]">Localizando as cidades no mapa.</p>
        ) : null}
      </Panel>
      <Panel title="Listas">
        <label className="block cursor-pointer rounded-lg border border-[#E5E7EB] px-3 py-3 text-sm text-[#6B7280]">
          Enviar CSV (nome, telefone, e-mail, cidade)
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void file.text().then(async (text) => {
                const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
                for (const line of lines.slice(lines[0]?.toLowerCase().includes('nome') ? 1 : 0)) {
                  const [name, phone, email, city] = line.split(/[;,]/).map((part) => part.trim());
                  if (!name || !phone) continue;
                  await feed.addContact({ name, phone, email, city, list: list === 'Todas' ? newList.trim() : list });
                }
              });
              event.target.value = '';
            }}
          />
        </label>
        <div className="mt-3 flex gap-2">
          <input value={newList} onChange={(event) => setNewList(event.target.value)} placeholder="Nova lista" className={cn(fieldClass, 'flex-1')} />
          <button type="button" onClick={() => { if (newList.trim()) setList(newList.trim()); }} className="h-10 rounded-lg bg-[#111827] px-3 text-sm font-medium text-white">Usar</button>
        </div>
        <ul className="mt-3 divide-y divide-[#F3F4F6] text-sm">
          {lists.map((name) => {
            const rows = feed.contacts.filter((item) => item.list === name).length;
            return <li key={name} className="flex items-center justify-between py-2.5"><span>{name}</span><span className="text-[#6B7280]">{rows}</span></li>;
          })}
        </ul>
      </Panel>
      <Panel title={`${filtered.length} contatos`}>
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[12px] text-[#6B7280]">
              <tr>
                <th className="px-5 py-2 font-medium">Nome</th>
                <th className="px-5 py-2 font-medium">Cidade</th>
                <th className="px-5 py-2 font-medium">Lista</th>
                <th className="px-5 py-2 font-medium">Telefone</th>
                <th className="px-5 py-2 font-medium">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-[#F3F4F6]">
                  <td className="px-5 py-3 font-medium">{item.name}</td>
                  <td className="px-5 py-3 text-[#6B7280]">{item.city || item.address || '—'}</td>
                  <td className="px-5 py-3 text-[#6B7280]">{item.list || '—'}</td>
                  <td className="px-5 py-3">{item.phone || '—'}</td>
                  <td className="px-5 py-3">{item.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
