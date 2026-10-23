import { useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard, KpiRow, ModuleHeader, Panel, PeriodPills } from '@/components/modules/ModuleChrome';
import {
  MOCK_KPI_BASE,
  MOCK_MEETINGS,
  MOCK_PERIODS,
  MOCK_TEAM,
  MOCK_TOUCHPOINTS,
  MOCK_VOLUME,
  brInt,
  scaleInt,
} from '@/lib/mock/modules';

const KPI_KEYS = ['esteira', 'trabalhadas', 'qualificadas', 'agendadas', 'negociacoes', 'vendas', 'notion', 'perdidos'] as const;
const TIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 };

export default function SalaGuerraPage() {
  const [period, setPeriod] = useState('Este mês');
  const kpis = useMemo(
    () => MOCK_KPI_BASE.map((k) => ({ ...k, display: brInt(scaleInt(k.value, period)) })),
    [period],
  );
  const touches = useMemo(
    () => MOCK_TOUCHPOINTS.map((t) => ({ ...t, display: scaleInt(t.value, period === 'Hoje' ? 'Este mês' : 'Hoje') })),
    [period],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader
        title="Sala de guerra"
        subtitle="Entradas, saídas e o time no mesmo recorte."
        extra={<PeriodPills value={period} onChange={setPeriod} options={MOCK_PERIODS} />}
      />

      <KpiRow>
        {kpis.map((k) => (
          <KpiCard key={k.key} label={k.label} value={k.display} delta={k.delta} />
        ))}
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Panel title="Volume do período">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_VOLUME} barCategoryGap={10}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="ligacoes" fill="#111827" barSize={8} />
                <Bar dataKey="emails" fill="#9CA3AF" barSize={8} />
                <Bar dataKey="whatsapp" fill="#22C55E" barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Hoje">
          <ul className="space-y-3 text-sm">
            {touches.map((t) => (
              <li key={t.label} className="flex justify-between">
                <span className="text-[#6B7280]">{t.label}</span>
                <span className="tabular-nums">{t.display}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Panel title="Time">
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="text-left text-[12px] text-[#6B7280]">
                <tr>
                  <th className="px-5 py-2 font-medium">Nome</th>
                  {KPI_KEYS.map((k) => (
                    <th key={k} className="px-2 py-2 font-medium">
                      {MOCK_KPI_BASE.find((x) => x.key === k)?.label.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_TEAM.map((p) => (
                  <tr key={p.name} className="border-t border-[#F3F4F6]">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ECFDF5] text-[11px] font-semibold text-[#166534]">
                          {p.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </span>
                        <span>
                          <div>{p.name}</div>
                          <div className="text-[12px] text-[#6B7280]">{p.role}</div>
                        </span>
                      </div>
                    </td>
                    {KPI_KEYS.map((k) => (
                      <td key={k} className="px-2 py-2.5 tabular-nums text-[#111827]">
                        {scaleInt(p[k], period)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Reuniões">
          <ul className="space-y-4">
            {MOCK_MEETINGS.slice(0, 4).map((m) => (
              <li key={m.id} className="text-sm">
                <div className="text-[12px] text-[#6B7280]">
                  {m.time} · {m.status}
                </div>
                <div className="font-medium">{m.title}</div>
                <div className="text-[12px] text-[#6B7280]">{m.who}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
