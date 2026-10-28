import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard, KpiRow, ModuleHeader, Panel } from '@/components/modules/ModuleChrome';
import { useCrmFeed } from '@/hooks/useCrmFeed';
import { goalFunnelRows } from '@/lib/crmFeed';

const TIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 };
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function MetasPage() {
  const feed = useCrmFeed();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [goalDraft, setGoalDraft] = useState('0');
  const [editingGoal, setEditingGoal] = useState(false);
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
  const funnelList = goalFunnelRows(feed.pipelines, feed.deals);
  const funnels = funnelList.map((pipeline) => {
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
  const singleGoal = funnels.length <= 1;

  useEffect(() => {
    if (!editingGoal) setGoalDraft(String(target));
  }, [target, editingGoal]);

  async function saveGoal(raw = goalDraft) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || !singleGoal) return;
    const current = funnels[0];
    if (current) {
      if (value === current.meta) return;
      await feed.setGoal(current.id, month, value);
      return;
    }
    if (value === target) return;
    const pipelineId = await feed.ensurePipeline('Comercial');
    if (!pipelineId) return;
    await feed.setGoal(pipelineId, month, value);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Metas" subtitle={`${now.toLocaleDateString('pt-BR', { month: 'long' })} · negócios ganhos contra a meta gravada.`} />
      {feed.error ? <p className="text-sm text-[#DC2626]">{feed.error}</p> : null}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <label htmlFor="meta-mes" className="text-[12px] text-[#6B7280]">Meta do mês</label>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <input
            id="meta-mes"
            inputMode="numeric"
            aria-label="Meta de vendas do mês"
            value={singleGoal ? goalDraft : String(target)}
            disabled={!singleGoal}
            onFocus={() => setEditingGoal(true)}
            onChange={(event) => setGoalDraft(event.target.value.replace(/[^\d]/g, ''))}
            onBlur={() => {
              setEditingGoal(false);
              void saveGoal();
            }}
            className="w-28 rounded-md border border-[#E5E7EB] px-3 py-2 text-[2rem] font-semibold tracking-tight text-[#111827] disabled:bg-white"
          />
          {singleGoal ? (
            <button type="button" onClick={() => void saveGoal()} className="mb-1 rounded-md bg-[#111827] px-3 py-2 text-sm text-white">
              Gravar
            </button>
          ) : null}
          <div className="mb-1 text-[2rem] font-semibold tracking-tight leading-none text-[#111827]">{pct}%</div>
        </div>
        <p className="mt-2 text-sm text-[#6B7280]">
          {singleGoal
            ? `${won.length} de ${target} vendas. Digite a quantidade e grave.`
            : `${won.length} de ${target} vendas. Ajuste a meta de cada funil na tabela.`}
        </p>
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
              {funnels.length === 0 ? (
                <tr className="border-t border-[#F3F4F6]">
                  <td colSpan={6} className="px-5 py-4 text-sm text-[#6B7280]">
                    Nenhum funil nesta conta. A meta gravada acima cria o funil comercial.
                  </td>
                </tr>
              ) : null}
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
