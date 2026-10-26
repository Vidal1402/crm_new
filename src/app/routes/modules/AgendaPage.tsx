import { useMemo, useState } from 'react';
import { KpiCard, KpiRow, ModuleHeader, Panel, fieldClass } from '@/components/modules/ModuleChrome';
import { useCrmFeed } from '@/hooks/useCrmFeed';
import { useOperators } from '@/hooks/useOperators';
import { cn } from '@/lib/utils';

const STATUSES = ['Confirmada', 'Pendente'] as const;

export default function AgendaPage() {
  const feed = useCrmFeed();
  const { operators } = useOperators();
  const [funnel, setFunnel] = useState('Todos');
  const [closer, setCloser] = useState('Todos');
  const meetings = feed.activities.filter((item) => item.type === 'meeting');
  const names = [...new Set(meetings.map((item) => operators.find((operator) => operator.user_id === item.ownerId)?.name || 'Sem dono'))];

  const filtered = useMemo(() => meetings.filter((item) => {
    const who = operators.find((operator) => operator.user_id === item.ownerId)?.name || 'Sem dono';
    return (funnel === 'Todos' || item.pipelineName === funnel) && (closer === 'Todos' || who === closer);
  }), [meetings, funnel, closer, operators]);

  const now = new Date();
  const monthMeetings = filtered.filter((item) => item.dueAt && new Date(item.dueAt).getMonth() === now.getMonth());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Agenda" subtitle="Reuniões gravadas em atividades da conta." />
      <div className="flex flex-wrap gap-2">
        <select value={funnel} onChange={(event) => setFunnel(event.target.value)} className={fieldClass}>
          <option>Todos</option>
          {feed.pipelines.map((item) => <option key={item.id}>{item.name}</option>)}
        </select>
        <select value={closer} onChange={(event) => setCloser(event.target.value)} className={fieldClass}>
          <option>Todos</option>
          {names.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>
      <KpiRow>
        <KpiCard label="Total do mês" value={String(monthMeetings.length)} />
        <KpiCard label="Confirmadas" value={String(filtered.filter((item) => item.done).length)} />
        <KpiCard label="Pendentes" value={String(filtered.filter((item) => !item.done).length)} />
        <KpiCard label="No filtro" value={String(filtered.length)} />
      </KpiRow>
      <div className="grid gap-3 md:grid-cols-7">
        {week.map((day) => (
          <div key={day.toISOString()} className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
            <div className="text-[12px] text-[#6B7280]">{day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}</div>
            <ul className="mt-2 space-y-2">
              {filtered.filter((item) => item.dueAt && item.dueAt.slice(0, 10) === day.toISOString().slice(0, 10)).map((item) => (
                <li key={item.id} className="border-l-2 border-[#111827] pl-2 text-[12px]">{item.title}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Panel title={now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-[#E5E7EB] text-[11px]">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, index) => (
            <div key={`${label}-${index}`} className="bg-[#F9FAFB] px-2 py-2 font-medium text-[#9CA3AF]">{label}</div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, index) => <div key={`empty-${index}`} className="min-h-[4.5rem] bg-white" />)}
          {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
            const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const items = filtered.filter((item) => item.dueAt?.slice(0, 10) === key);
            return (
              <div key={day} className="min-h-[4.5rem] bg-white p-1.5">
                <div className="text-[#9CA3AF]">{day}</div>
                {items.slice(0, 2).map((item) => <div key={item.id} className="mt-0.5 truncate rounded bg-[#ECFDF5] px-1 py-0.5 text-[#166534]">{item.title}</div>)}
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Reuniões">
        <ul className="-mx-5 -mb-5 divide-y divide-[#F3F4F6]">
          {filtered.map((item) => {
            const who = operators.find((operator) => operator.user_id === item.ownerId)?.name || 'Sem dono';
            const state = item.done ? 'Confirmada' : 'Pendente';
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <div>{item.title}</div>
                  <div className="text-[12px] text-[#6B7280]">{item.dueAt ? new Date(item.dueAt).toLocaleString('pt-BR') : 'Sem horário'} · {who}</div>
                </div>
                <div className="flex gap-1">
                  {STATUSES.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => void feed.setActivityDone(item.id, label === 'Confirmada', label)}
                      className={cn('rounded-md px-2 py-1 text-[11px]', state === label ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
          {filtered.length === 0 ? <li className="px-5 py-4 text-sm text-[#6B7280]">Nenhuma reunião gravada.</li> : null}
        </ul>
      </Panel>
    </div>
  );
}
