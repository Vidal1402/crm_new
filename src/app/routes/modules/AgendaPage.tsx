import { useMemo, useState } from 'react';
import { KpiCard, KpiRow, ModuleHeader, Panel, fieldClass } from '@/components/modules/ModuleChrome';
import { MOCK_CALENDAR_KPI, MOCK_FUNIS, MOCK_MEETINGS, MOCK_TEAM, MOCK_WEEK_DAYS, type MeetingStatus } from '@/lib/mock/modules';
import { cn } from '@/lib/utils';

export default function AgendaPage() {
  const [funnel, setFunnel] = useState('Todos');
  const [closer, setCloser] = useState('Todos');
  const [scope, setScope] = useState<'Corporativa' | 'Pessoal'>('Corporativa');
  const [meetings, setMeetings] = useState(MOCK_MEETINGS);

  const closers = MOCK_TEAM.filter((t) => t.role !== 'SDR');
  const personal = closer === 'Todos' ? closers[0]?.name : closer;

  const filtered = useMemo(() => {
    return meetings.filter((m) => {
      const fOk = funnel === 'Todos' || m.funnel === funnel;
      const cOk = scope === 'Pessoal' ? m.who === personal : closer === 'Todos' || m.who === closer;
      return fOk && cOk;
    });
  }, [meetings, funnel, closer, scope, personal]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    return [
      { label: 'Total do mês', value: MOCK_CALENDAR_KPI[0].value },
      { label: 'Confirmadas', value: String(filtered.filter((m) => m.status === 'Confirmada').length) },
      { label: 'Pendentes', value: String(filtered.filter((m) => m.status === 'Pendente').length) },
      { label: 'Pipeline', value: String(filtered.filter((m) => m.status === 'Pipeline').length || total) },
    ];
  }, [filtered]);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Agenda" subtitle="Closers, confirmação e o mês inteiro." />

      <div className="flex flex-wrap gap-2">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as typeof scope)}
          className={fieldClass}
        >
          <option>Corporativa</option>
          <option>Pessoal</option>
        </select>
        <select value={funnel} onChange={(e) => setFunnel(e.target.value)} className={fieldClass}>
          <option>Todos</option>
          {MOCK_FUNIS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select value={closer} onChange={(e) => setCloser(e.target.value)} className={fieldClass}>
          <option>Todos</option>
          {closers.map((t) => (
            <option key={t.name}>{t.name}</option>
          ))}
        </select>
      </div>

      <KpiRow>
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} />
        ))}
      </KpiRow>

      <div className="grid gap-3 md:grid-cols-5">
        {MOCK_WEEK_DAYS.map((d) => (
          <div key={d.day} className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
            <div className="text-[12px] text-[#6B7280]">{d.day}</div>
            <ul className="mt-2 space-y-2">
              {filtered
                .filter((m) => m.date === d.date)
                .map((m) => (
                  <li key={m.id} className="border-l-2 border-[#111827] pl-2 text-[12px]">
                    {m.time} {m.who.split(' ')[0]}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <Panel title="Outubro">
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-[#E5E7EB] text-[11px]">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="bg-[#F9FAFB] px-2 py-2 font-medium text-[#9CA3AF]">
              {d}
            </div>
          ))}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`e-${i}`} className="min-h-[4.5rem] bg-white" />
          ))}
          {days.map((d) => {
            const items = filtered.filter((m) => m.date === d);
            return (
              <div key={d} className="min-h-[4.5rem] bg-white p-1.5">
                <div className="text-[#9CA3AF]">{d}</div>
                {items.slice(0, 2).map((m) => (
                  <div key={m.id} className="mt-0.5 truncate rounded bg-[#ECFDF5] px-1 py-0.5 text-[#166534]">
                    {m.time}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Reuniões">
        <ul className="-mx-5 -mb-5 divide-y divide-[#F3F4F6]">
          {filtered.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <div>
                <div>{m.title}</div>
                <div className="text-[12px] text-[#6B7280]">
                  {m.time} · {m.who}
                </div>
              </div>
              <div className="flex gap-1">
                {(['Confirmada', 'Pendente', 'Pipeline'] as MeetingStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMeetings((rows) => rows.map((row) => (row.id === m.id ? { ...row, status: s } : row)))}
                    className={cn(
                      'rounded-md px-2 py-1 text-[11px]',
                      m.status === s ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
