import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ModuleHeader, Panel, PeriodPills, fieldClass } from '@/components/modules/ModuleChrome';
import { useCrmFeed } from '@/hooks/useCrmFeed';
import { useOperators } from '@/hooks/useOperators';

const VIEWS = ['Kanban', 'Pizza', 'Barras', 'Linhas', 'Dispersão'] as const;
const INK = ['#111827', '#6B7280', '#22C55E', '#D1D5DB'];
const TIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 };

export default function PerformancePage() {
  const feed = useCrmFeed();
  const { operators } = useOperators();
  const [view, setView] = useState<(typeof VIEWS)[number]>('Kanban');
  const [mode, setMode] = useState('Individual');
  const [funnel, setFunnel] = useState('Todos');
  const deals = feed.deals.filter((deal) => funnel === 'Todos' || deal.pipelineName === funnel);
  const people = useMemo(() => operators.map((operator) => {
    const owned = deals.filter((deal) => deal.ownerId === operator.user_id);
    return {
      name: operator.name || operator.email,
      vendas: owned.filter((deal) => deal.status === 'won').length,
      esteira: owned.filter((deal) => deal.status === 'open').reduce((sum, deal) => sum + deal.value, 0),
    };
  }), [operators, deals]);
  const teams = useMemo(() => feed.pipelines.filter((pipeline) => funnel === 'Todos' || pipeline.name === funnel).map((pipeline) => {
    const rows = feed.deals.filter((deal) => deal.pipelineId === pipeline.id);
    return {
      name: pipeline.name,
      vendas: rows.filter((deal) => deal.status === 'won').length,
      esteira: rows.filter((deal) => deal.status === 'open').reduce((sum, deal) => sum + deal.value, 0),
    };
  }), [feed.pipelines, feed.deals, funnel]);
  const ranking = mode === 'Individual' ? people : teams;
  const stages = [...new Set(deals.map((deal) => deal.stageName))];
  const days = useMemo(() => {
    const bucket = new Map<string, { ganhos: number; abertos: number }>();
    for (const deal of deals) {
      const day = deal.createdAt.slice(5, 10);
      const slot = bucket.get(day) ?? { ganhos: 0, abertos: 0 };
      if (deal.status === 'won') slot.ganhos += 1;
      else slot.abertos += 1;
      bucket.set(day, slot);
    }
    return [...bucket.entries()].map(([day, slot]) => ({ day, ...slot }));
  }, [deals]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader
        title="Performance"
        subtitle="Pessoas e funis a partir dos negócios gravados."
        extra={<><PeriodPills value={mode} onChange={setMode} options={['Individual', 'Por equipe']} /><PeriodPills value={view} onChange={(value) => setView(value as typeof view)} options={VIEWS} /></>}
      />
      <select value={funnel} onChange={(event) => setFunnel(event.target.value)} className={fieldClass}>
        <option>Todos</option>
        {feed.pipelines.map((item) => <option key={item.id}>{item.name}</option>)}
      </select>
      {view === 'Kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {stages.map((stage) => {
            const cards = deals.filter((deal) => deal.stageName === stage);
            return (
              <div key={stage} className="w-52 shrink-0">
                <div className="mb-2 text-[12px] text-[#6B7280]">{stage} · {cards.length}</div>
                <div className="space-y-2">
                  {cards.map((card) => (
                    <div key={card.id} className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm">
                      <div>{card.contactName}</div>
                      <div className="text-[12px] text-[#6B7280]">{card.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {view === 'Pizza' ? (
        <Panel>
          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ranking} dataKey="vendas" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="none">
                  {ranking.map((item) => <Cell key={item.name} fill={INK[ranking.indexOf(item) % INK.length]} />)}
                </Pie>
                <Tooltip contentStyle={TIP} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}
      {view === 'Barras' ? (
        <Panel>
          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ranking}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="vendas" fill="#111827" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="esteira" fill="#D1D5DB" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}
      {view === 'Linhas' ? (
        <Panel>
          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={days}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Line type="monotone" dataKey="ganhos" stroke="#111827" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="abertos" stroke="#22C55E" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}
      {view === 'Dispersão' ? (
        <Panel>
          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <XAxis type="number" dataKey="esteira" name="Esteira" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis type="number" dataKey="vendas" name="Vendas" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Scatter data={ranking} fill="#111827" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}
      <Panel title="Ranking">
        <ol className="-mx-5 -mb-5 divide-y divide-[#F3F4F6]">
          {[...ranking].sort((a, b) => b.vendas - a.vendas).map((item, index) => (
            <li key={item.name} className="flex items-center justify-between px-5 py-3 text-sm">
              <span>{index + 1}. {item.name}</span>
              <span className="tabular-nums text-[#6B7280]">{item.vendas} vendas</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
