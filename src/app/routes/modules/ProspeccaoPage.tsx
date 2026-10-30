import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ModuleHeader, Panel, fieldClass } from '@/components/modules/ModuleChrome';
import { TerritoryHeatmap, type HeatZone, heatZoneLabel } from '@/components/modules/TerritoryHeatmap';
import { knownCity } from '@/lib/geocode';
import { useCrmFeed } from '@/hooks/useCrmFeed';
import { cn } from '@/lib/utils';

export default function ProspeccaoPage() {
  const feed = useCrmFeed();
  const [q, setQ] = useState('');
  const [funnel, setFunnel] = useState('Todos');
  const [list, setList] = useState('Todas');
  const [zone, setZone] = useState<string | null>(null);
  const [newList, setNewList] = useState('');
  const lists = [...new Set(feed.contacts.map((item) => item.list).filter(Boolean))];
  const zones = useMemo<HeatZone[]>(() => {
    const counts = new Map<string, number>();
    for (const contact of feed.contacts) {
      if (!contact.city) continue;
      counts.set(contact.city, (counts.get(contact.city) ?? 0) + 1);
    }
    return [...counts.entries()].flatMap(([city, leads]) => {
      const sample = feed.contacts.find((item) => item.city === city && item.lat !== null && item.lng !== null);
      const point = sample && sample.lat !== null && sample.lng !== null
        ? { lat: sample.lat, lng: sample.lng }
        : knownCity(city);
      if (!point) return [];
      return [{ city, label: city, lng: point.lng, lat: point.lat, v: Math.min(1, leads / 20), leads }];
    });
  }, [feed.contacts]);
  const filtered = feed.contacts.filter((item) => {
    const hay = `${item.name} ${item.city} ${item.address} ${item.phone} ${item.email}`.toLowerCase();
    const pipelineNames = feed.deals.filter((deal) => deal.contactId === item.id).map((deal) => deal.pipelineName);
    return hay.includes(q.toLowerCase())
      && (funnel === 'Todos' || pipelineNames.includes(funnel))
      && (list === 'Todas' || item.list === list)
      && (!zone || item.city === zone);
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
