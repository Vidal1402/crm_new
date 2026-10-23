import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ModuleHeader, Panel, PeriodPills, fieldClass } from '@/components/modules/ModuleChrome';
import { MOCK_FUNIS, MOCK_KANBAN, MOCK_PIE, MOCK_TEAM, MOCK_TEAMS, MOCK_VOLUME } from '@/lib/mock/modules';

const VIEWS = ['Kanban', 'Pizza', 'Barras', 'Linhas', 'Área', 'Dispersão'] as const;
const INK = ['#111827', '#6B7280', '#22C55E', '#D1D5DB'];
const TIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 };

export default function PerformancePage() {
  const [view, setView] = useState<(typeof VIEWS)[number]>('Kanban');
  const [mode, setMode] = useState('Individual');
  const [funnel, setFunnel] = useState('Todos');

  const people = useMemo(() => MOCK_TEAM.filter((p) => funnel === 'Todos' || p.funnel === funnel), [funnel]);
  const teams = useMemo(() => MOCK_TEAMS.filter((t) => funnel === 'Todos' || t.funnel === funnel), [funnel]);
  const ranking = mode === 'Individual' ? people : teams;
  const barData =
    mode === 'Individual'
      ? people.map((t) => ({ name: t.name.split(' ')[0], vendas: t.vendas, esteira: t.esteira }))
      : teams.map((t) => ({ name: t.funnel.split(' ')[0], vendas: t.vendas, esteira: t.esteira }));
  const scatterData = mode === 'Individual' ? people : teams;
  const kanban = useMemo(
    () => MOCK_KANBAN.map((col) => ({ ...col, cards: col.cards.filter((c) => funnel === 'Todos' || c.funnel === funnel) })),
    [funnel],
  );
  const pie =
    mode === 'Individual'
      ? people.map((p) => ({ name: p.name.split(' ')[0], value: p.vendas || 1 }))
      : MOCK_PIE.filter((p) => funnel === 'Todos' || p.name === funnel);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader
        title="Performance"
        subtitle="Pessoa ou equipe, no funil que você escolher."
        extra={
          <>
            <PeriodPills value={mode} onChange={setMode} options={['Individual', 'Por equipe']} />
            <PeriodPills value={view} onChange={(v) => setView(v as typeof view)} options={VIEWS} />
          </>
        }
      />

      <select value={funnel} onChange={(e) => setFunnel(e.target.value)} className={fieldClass}>
        <option>Todos os funis</option>
        {MOCK_FUNIS.map((f) => (
          <option key={f}>{f}</option>
        ))}
      </select>

      {view === 'Kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {kanban.map((col) => (
            <div key={col.stage} className="w-52 shrink-0">
              <div className="mb-2 text-[12px] text-[#6B7280]">
                {col.stage} · {col.cards.length}
              </div>
              <div className="space-y-2">
                {col.cards.map((c) => (
                  <div key={c.name} className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm">
                    <div>{c.name}</div>
                    <div className="text-[12px] text-[#6B7280]">{c.owner}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {view === 'Pizza' ? (
        <Panel>
          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="none">
                  {pie.map((_, i) => (
                    <Cell key={i} fill={INK[i % INK.length]} />
                  ))}
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
              <BarChart data={barData}>
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
              <LineChart data={MOCK_VOLUME}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Line type="monotone" dataKey="ligacoes" stroke="#111827" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="whatsapp" stroke="#22C55E" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}

      {view === 'Área' ? (
        <Panel>
          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_VOLUME}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Area type="monotone" dataKey="ligacoes" stroke="#111827" fill="#111827" fillOpacity={0.06} />
              </AreaChart>
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
                <Tooltip contentStyle={TIP} cursor={{ stroke: '#E5E7EB' }} />
                <Scatter data={scatterData} fill="#111827" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}

      <Panel title="Ranking">
        <ol className="-mx-5 -mb-5 divide-y divide-[#F3F4F6]">
          {[...ranking]
            .sort((a, b) => b.vendas - a.vendas)
            .map((p, i) => (
              <li key={p.name} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  {i + 1}. {p.name}
                </span>
                <span className="tabular-nums text-[#6B7280]">{p.vendas} vendas</span>
              </li>
            ))}
        </ol>
      </Panel>
    </div>
  );
}
