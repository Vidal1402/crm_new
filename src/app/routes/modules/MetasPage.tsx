import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard, KpiRow, ModuleHeader, Panel } from '@/components/modules/ModuleChrome';
import { MOCK_FUNNEL_OPS, MOCK_GOALS, MOCK_MONTH_RANKING } from '@/lib/mock/modules';

const TIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 };

export default function MetasPage() {
  const monthDone = MOCK_GOALS.reduce((s, g) => s + g.feito, 0);
  const monthGoal = MOCK_GOALS.reduce((s, g) => s + g.meta, 0);
  const monthLost = MOCK_GOALS.reduce((s, g) => s + g.perdidos, 0);
  const monthTotais = MOCK_GOALS.reduce((s, g) => s + g.totais, 0);
  const pct = Math.round((monthDone / monthGoal) * 100);
  const combined = MOCK_FUNNEL_OPS.reduce(
    (acc, f) => ({
      meta: acc.meta + f.meta,
      totais: acc.totais + f.totais,
      vendas: acc.vendas + f.vendas,
      perdidos: acc.perdidos + f.perdidos,
      agendadas: acc.agendadas + f.agendadas,
    }),
    { meta: 0, totais: 0, vendas: 0, perdidos: 0, agendadas: 0 },
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Metas" subtitle="Outubro · todos os funis juntos." />

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[12px] text-[#6B7280]">Meta do mês</div>
            <div className="mt-1 text-[2.75rem] font-semibold tracking-tight leading-none">{pct}%</div>
            <p className="mt-2 text-sm text-[#6B7280]">
              {monthDone} de {monthGoal} vendas
            </p>
          </div>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#F3F4F6]">
            <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <KpiRow>
        <KpiCard label="Meta" value={String(monthGoal)} />
        <KpiCard label="Totais" value={String(monthTotais)} />
        <KpiCard label="Vendas" value={String(monthDone)} />
        <KpiCard label="Perdidos" value={String(monthLost)} />
      </KpiRow>

      <Panel title="Meses">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MOCK_MONTH_RANKING}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TIP} />
              <Bar dataKey="feito" fill="#111827" radius={[3, 3, 0, 0]} barSize={16} />
              <Bar dataKey="perdidos" fill="#D1D5DB" radius={[3, 3, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Funis">
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[12px] text-[#6B7280]">
              <tr>
                <th className="px-5 py-2 font-medium">Funil</th>
                <th className="px-5 py-2 font-medium">Meta</th>
                <th className="px-5 py-2 font-medium">Totais</th>
                <th className="px-5 py-2 font-medium">Agendadas</th>
                <th className="px-5 py-2 font-medium">Vendas</th>
                <th className="px-5 py-2 font-medium">Perdidos</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_FUNNEL_OPS.map((f) => (
                <tr key={f.funnel} className="border-t border-[#F3F4F6]">
                  <td className="px-5 py-3">{f.funnel}</td>
                  <td className="px-5 py-3 tabular-nums">{f.meta}</td>
                  <td className="px-5 py-3 tabular-nums">{f.totais}</td>
                  <td className="px-5 py-3 tabular-nums">{f.agendadas}</td>
                  <td className="px-5 py-3 tabular-nums">{f.vendas}</td>
                  <td className="px-5 py-3 tabular-nums text-[#6B7280]">{f.perdidos}</td>
                </tr>
              ))}
              <tr className="border-t border-[#E5E7EB] text-sm font-medium">
                <td className="px-5 py-3">Todos</td>
                <td className="px-5 py-3">{combined.meta}</td>
                <td className="px-5 py-3">{combined.totais}</td>
                <td className="px-5 py-3">{combined.agendadas}</td>
                <td className="px-5 py-3">{combined.vendas}</td>
                <td className="px-5 py-3">{combined.perdidos}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
