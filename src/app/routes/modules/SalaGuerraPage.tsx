import { useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard, KpiRow, ModuleHeader, Panel, PeriodPills } from '@/components/modules/ModuleChrome';
import { useCrmFeed } from '@/hooks/useCrmFeed';
import { useOperators } from '@/hooks/useOperators';
import { inPeriod } from '@/lib/crmFeed';

const PERIODS = ['Hoje', '7 dias', '15 dias', 'Este mês', 'Mês anterior'] as const;
const TIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 };

export default function SalaGuerraPage() {
  const feed = useCrmFeed();
  const { operators } = useOperators();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('Este mês');
  const deals = feed.deals.filter((deal) => inPeriod(deal.createdAt, period));
  const tasks = feed.activities.filter((item) => item.dueAt && inPeriod(item.dueAt, period));
  const kpis = [
    { key: 'abertos', label: 'Em aberto', value: deals.filter((deal) => deal.status === 'open').length },
    { key: 'ganhos', label: 'Ganhos', value: deals.filter((deal) => deal.status === 'won').length },
    { key: 'perdidos', label: 'Perdidos', value: deals.filter((deal) => deal.status === 'lost').length },
    { key: 'tarefas', label: 'Tarefas', value: tasks.length },
    { key: 'reunioes', label: 'Reuniões', value: tasks.filter((item) => item.type === 'meeting').length },
  ];
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
  const ownerName = (id: string | null) => operators.find((item) => item.user_id === id)?.name || operators.find((item) => item.user_id === id)?.email || 'Sem dono';

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Sala de guerra" subtitle="Entradas e saídas do período, lidas do banco." extra={<PeriodPills value={period} onChange={(value) => setPeriod(value as typeof period)} options={PERIODS} />} />
      <KpiRow>
        {kpis.map((item) => <KpiCard key={item.key} label={item.label} value={String(item.value)} />)}
      </KpiRow>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Panel title="Volume do período">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} barCategoryGap={10}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="ganhos" fill="#111827" barSize={8} />
                <Bar dataKey="abertos" fill="#22C55E" barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Reuniões">
          <ul className="space-y-4">
            {feed.activities.filter((item) => item.type === 'meeting').slice(0, 4).map((item) => (
              <li key={item.id} className="text-sm">
                <div className="text-[12px] text-[#6B7280]">{item.dueAt ? new Date(item.dueAt).toLocaleString('pt-BR') : 'Sem horário'} · {item.done ? 'Confirmada' : 'Pendente'}</div>
                <div className="font-medium">{item.title}</div>
                <div className="text-[12px] text-[#6B7280]">{ownerName(item.ownerId)}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Time">
        <table className="w-full text-sm">
          <thead className="text-left text-[12px] text-[#6B7280]">
            <tr>
              <th className="py-2 font-medium">Nome</th>
              <th className="py-2 font-medium">Abertos</th>
              <th className="py-2 font-medium">Ganhos</th>
              <th className="py-2 font-medium">Perdidos</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((operator) => {
              const owned = deals.filter((deal) => deal.ownerId === operator.user_id);
              return (
                <tr key={operator.user_id} className="border-t border-[#F3F4F6]">
                  <td className="py-2.5">{operator.name || operator.email}</td>
                  <td className="py-2.5 tabular-nums">{owned.filter((deal) => deal.status === 'open').length}</td>
                  <td className="py-2.5 tabular-nums">{owned.filter((deal) => deal.status === 'won').length}</td>
                  <td className="py-2.5 tabular-nums">{owned.filter((deal) => deal.status === 'lost').length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
