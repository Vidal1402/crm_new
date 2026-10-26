import { useMemo, useState } from 'react';
import { ModuleHeader, Panel, fieldClass } from '@/components/modules/ModuleChrome';
import { useCrmFeed } from '@/hooks/useCrmFeed';
import { useOperators } from '@/hooks/useOperators';
import { cn } from '@/lib/utils';

const TYPES = ['Todas', 'Ligação', 'E-mail', 'WhatsApp', 'Reunião', 'Tarefa'] as const;
const STATUSES = ['Todos', 'A fazer', 'Concluída'] as const;

function typeLabel(type: string): (typeof TYPES)[number] {
  if (type === 'call') return 'Ligação';
  if (type === 'meeting') return 'Reunião';
  if (type === 'followup') return 'WhatsApp';
  if (type === 'note') return 'E-mail';
  return 'Tarefa';
}

export default function OperacaoPage() {
  const feed = useCrmFeed();
  const { operators } = useOperators();
  const [type, setType] = useState<(typeof TYPES)[number]>('Todas');
  const [funnel, setFunnel] = useState('Todos');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('Todos');
  const owner = (id: string | null) => operators.find((item) => item.user_id === id)?.name || operators.find((item) => item.user_id === id)?.email || 'Sem dono';

  const tasks = useMemo(
    () => feed.activities.filter((item) => {
      const label = typeLabel(item.type);
      const state = item.done ? 'Concluída' : 'A fazer';
      return (type === 'Todas' || label === type) && (funnel === 'Todos' || item.pipelineName === funnel) && (status === 'Todos' || state === status);
    }),
    [feed.activities, type, funnel, status],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Operação" subtitle="Tarefas e cadências gravadas na conta." />
      {feed.error ? <p className="text-sm text-[#DC2626]">{feed.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className={fieldClass}>
          {TYPES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={funnel} onChange={(event) => setFunnel(event.target.value)} className={fieldClass}>
          <option>Todos</option>
          {feed.pipelines.map((item) => <option key={item.id}>{item.name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={fieldClass}>
          {STATUSES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <Panel title="Tarefas">
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[12px] text-[#6B7280]">
              <tr>
                <th className="px-5 py-2 font-medium">Tarefa</th>
                <th className="px-5 py-2 font-medium">Tipo</th>
                <th className="px-5 py-2 font-medium">Funil</th>
                <th className="px-5 py-2 font-medium">Dono</th>
                <th className="px-5 py-2 font-medium">Prazo</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((item) => (
                <tr key={item.id} className="border-t border-[#F3F4F6]">
                  <td className="px-5 py-3">
                    <div>{item.title}</div>
                    <div className="text-[12px] text-[#6B7280]">{item.contactName}</div>
                  </td>
                  <td className="px-5 py-3 text-[#6B7280]">{typeLabel(item.type)}</td>
                  <td className="px-5 py-3 text-[#6B7280]">{item.pipelineName || '—'}</td>
                  <td className="px-5 py-3">{owner(item.ownerId)}</td>
                  <td className="px-5 py-3 text-[#6B7280]">{item.dueAt ? new Date(item.dueAt).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-5 py-3">
                    <select
                      value={item.done ? 'Concluída' : 'A fazer'}
                      onChange={(event) => void feed.setActivityDone(item.id, event.target.value === 'Concluída')}
                      className="h-8 rounded-md border border-[#E5E7EB] px-2 text-xs"
                    >
                      <option>A fazer</option>
                      <option>Concluída</option>
                    </select>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 ? <tr><td className="px-5 py-4 text-[#6B7280]" colSpan={6}>Nenhuma tarefa neste filtro.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Cadência">
        <div className="space-y-3">
          {feed.rules.length === 0 ? <p className="text-sm text-[#6B7280]">Nenhuma regra de follow-up gravada.</p> : null}
          {feed.rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between text-sm">
              <span>{rule.trigger} · {rule.delayHours}h · passo {rule.sequence}</span>
              <span className={cn('text-[12px]', rule.active ? 'text-[#166534]' : 'text-[#6B7280]')}>{rule.active ? 'Ativa' : 'Pausada'}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
