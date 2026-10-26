import { useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard, KpiRow, ModuleHeader, Panel } from '@/components/modules/ModuleChrome';
import { useCrmFeed } from '@/hooks/useCrmFeed';

const TIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 };
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function MetasPage() {
  const feed = useCrmFeed();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const inMonth = (iso: string) => iso.slice(0, 7) === month;
  const won = feed.deals.filter((deal) => deal.status === 'won' && inMonth(deal.createdAt));
  const lost = feed.deals.filter((deal) => deal.status === 'lost' && inMonth(deal.createdAt));
  const target = feed.goals.filter((goal) => goal.month === month).reduce((sum, goal) => sum + goal.target, 0);
  const pct = target === 0 ? 0 : Math.round((won.length / target) * 100);
  const months = MONTHS.map((label, index) => {
    const key = `${now.getFullYear()}-${String(index + 1).padStart(2, '0')}`;
    return {
      month: label,
      feito: feed.deals.filter((deal) => deal.status === 'won' && deal.createdAt.slice(0, 7) === key).length,
      perdidos: feed.deals.filter((deal) => deal.status === 'lost' && deal.createdAt.slice(0, 7) === key).length,
    };
  });
  const funnels = feed.pipelines.map((pipeline) => {
    const rows = feed.deals.filter((deal) => deal.pipelineId === pipeline.id);
    return {
      id: pipeline.id,
      name: pipeline.name,
      meta: feed.goals.find((goal) => goal.pipelineId === pipeline.id && goal.month === month)?.target ?? 0,
      totais: rows.length,
      vendas: rows.filter((deal) => deal.status === 'won' && inMonth(deal.createdAt)).length,
      perdidos: rows.filter((deal) => deal.status === 'lost' && inMonth(deal.createdAt)).length,
      abertos: rows.filter((deal) => deal.status === 'open').length,
    };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Metas" subtitle={`${now.toLocaleDateString('pt-BR', { month: 'long' })} · negócios ganhos contra a meta gravada.`} />
      {feed.error ? <p className="text-sm text-[#DC2626]">{feed.error}</p> : null}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <div className="text-[12px] text-[#6B7280]">Meta do mês</div>
        <div className="mt-1 text-[2.75rem] font-semibold tracking-tight leading-none">{pct}%</div>
        <p className="mt-2 text-sm text-[#6B7280]">{won.length} de {target} vendas</p>
        <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#F3F4F6]">
          <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
      <KpiRow>
        <KpiCard label="Meta" value={String(target)} />
        <KpiCard label="Totais" value={String(feed.deals.filter((deal) => inMonth(deal.createdAt)).length)} />
        <KpiCard label="Vendas" value={String(won.length)} />
        <KpiCard label="Perdidos" value={String(lost.length)} />
      </KpiRow>
      <Panel title="Meses">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months}>
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
                <th className="px-5 py-2 font-medium">Abertos</th>
                <th className="px-5 py-2 font-medium">Vendas</th>
                <th className="px-5 py-2 font-medium">Perdidos</th>
              </tr>
            </thead>
            <tbody>
              {funnels.map((row) => (
                <tr key={row.id} className="border-t border-[#F3F4F6]">
                  <td className="px-5 py-3">{row.name}</td>
                  <td className="px-5 py-3">
                    <input
                      value={drafts[row.id] ?? String(row.meta)}
                      onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                      onBlur={() => {
                        const value = Number(drafts[row.id] ?? row.meta);
                        if (Number.isFinite(value)) void feed.setGoal(row.id, month, value);
                      }}
                      className="w-16 rounded-md border border-[#E5E7EB] px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-5 py-3 tabular-nums">{row.totais}</td>
                  <td className="px-5 py-3 tabular-nums">{row.abertos}</td>
                  <td className="px-5 py-3 tabular-nums">{row.vendas}</td>
                  <td className="px-5 py-3 tabular-nums">{row.perdidos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
