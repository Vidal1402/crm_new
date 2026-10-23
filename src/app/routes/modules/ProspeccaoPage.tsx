import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ModuleHeader, Panel, fieldClass } from '@/components/modules/ModuleChrome';
import { TerritoryHeatmap, heatZoneLabel } from '@/components/modules/TerritoryHeatmap';
import { MOCK_FUNIS, MOCK_LEADS_SEED, MOCK_LISTS_SEED, type LeadRow } from '@/lib/mock/modules';
import { cn } from '@/lib/utils';

const FILL = {
  instagram: (name: string) => `@${name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14)}`,
  whatsapp: () => `+55 11 9${8000 + Math.floor(Math.random() * 1999)}-${1000 + Math.floor(Math.random() * 8999)}`,
  email: (name: string) => `contato@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
};

export default function ProspeccaoPage() {
  const [q, setQ] = useState('');
  const [funnel, setFunnel] = useState('Todos');
  const [list, setList] = useState('Todas');
  const [zone, setZone] = useState<string | null>(null);
  const [lists, setLists] = useState(MOCK_LISTS_SEED);
  const [leads, setLeads] = useState<LeadRow[]>(MOCK_LEADS_SEED);
  const [newList, setNewList] = useState('');

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        const hay = `${l.name} ${l.city} ${l.address} ${l.instagram}`.toLowerCase();
        return (
          hay.includes(q.toLowerCase()) &&
          (funnel === 'Todos' || l.funnel === funnel) &&
          (list === 'Todas' || l.list === list) &&
          (!zone || l.city === zone)
        );
      }),
    [leads, q, funnel, list, zone],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Prospecção" subtitle="Listas, mapa e canais dos leads." />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Local, endereço ou empresa"
            className={cn(fieldClass, 'h-10 w-full pl-9')}
          />
        </div>
        <select value={funnel} onChange={(e) => setFunnel(e.target.value)} className={fieldClass}>
          <option>Todos</option>
          {MOCK_FUNIS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select value={list} onChange={(e) => setList(e.target.value)} className={fieldClass}>
          <option>Todas</option>
          {lists.map((l) => (
            <option key={l.name}>{l.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            setLeads((rows) =>
              rows.map((l) =>
                l.enriched
                  ? l
                  : {
                      ...l,
                      instagram: l.instagram || FILL.instagram(l.name),
                      whatsapp: l.whatsapp || FILL.whatsapp(),
                      email: l.email || FILL.email(l.name),
                      enriched: true,
                      score: Math.min(99, l.score + 8),
                    },
              ),
            )
          }
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#111827]"
        >
          Enriquecer canais
        </button>
      </div>

      <Panel
        title="Mapa de calor · Grande SP"
        action={
          zone ? (
            <button type="button" onClick={() => setZone(null)} className="text-xs text-[#6B7280]">
              Limpar {heatZoneLabel(zone)}
            </button>
          ) : (
            <span className="text-[11px] text-[#9CA3AF]">Mapa grátis · calor + vista 3D da rua</span>
          )
        }
      >
        <TerritoryHeatmap selected={zone} onSelect={setZone} />
      </Panel>

        <Panel title="Listas">
          <label className="block cursor-pointer rounded-lg border border-[#E5E7EB] px-3 py-3 text-sm text-[#6B7280]">
            Enviar CSV ou XLSX
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLists((prev) => [{ name: file.name.replace(/\.(csv|xlsx)$/i, ''), rows: 36, status: 'Nova' }, ...prev]);
                e.target.value = '';
              }}
            />
          </label>
          <div className="mt-3 flex gap-2">
            <input
              value={newList}
              onChange={(e) => setNewList(e.target.value)}
              placeholder="Nova lista"
              className={cn(fieldClass, 'flex-1')}
            />
            <button
              type="button"
              onClick={() => {
                const name = newList.trim() || `Lista ${new Date().toLocaleDateString('pt-BR')}`;
                setLists((prev) => [{ name, rows: 0, status: 'Nova' }, ...prev]);
                setNewList('');
                setList(name);
              }}
              className="h-10 rounded-lg bg-[#111827] px-3 text-sm font-medium text-white"
            >
              Criar
            </button>
          </div>
          <ul className="mt-3 divide-y divide-[#F3F4F6] text-sm">
            {lists.map((l) => (
              <li key={l.name} className="flex items-center justify-between py-2.5">
                <span>{l.name}</span>
                <span className="text-[#6B7280]">
                  {l.rows} · {l.status}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

      <Panel title={`${filtered.length} leads`}>
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[12px] text-[#6B7280]">
              <tr>
                <th className="px-5 py-2 font-medium">Empresa</th>
                <th className="px-5 py-2 font-medium">Endereço</th>
                <th className="px-5 py-2 font-medium">Lista</th>
                <th className="px-5 py-2 font-medium">Instagram</th>
                <th className="px-5 py-2 font-medium">WhatsApp</th>
                <th className="px-5 py-2 font-medium">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.name} className="border-t border-[#F3F4F6]">
                  <td className="px-5 py-3 font-medium">{l.name}</td>
                  <td className="px-5 py-3 text-[#6B7280]">
                    {l.address}
                    <div className="text-[12px]">{l.city}</div>
                  </td>
                  <td className="px-5 py-3 text-[#6B7280]">{l.list}</td>
                  <td className="px-5 py-3">{l.instagram || '—'}</td>
                  <td className="px-5 py-3">{l.whatsapp || '—'}</td>
                  <td className="px-5 py-3">{l.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
