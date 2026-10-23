import { useMemo, useState } from 'react';
import { ModuleHeader, Panel, fieldClass } from '@/components/modules/ModuleChrome';
import { MOCK_CADENCE, MOCK_CADENCE_STEPS, MOCK_FUNIS, MOCK_TASKS } from '@/lib/mock/modules';
import { cn } from '@/lib/utils';

const TYPES = ['Todas', 'Ligação', 'E-mail', 'LinkedIn', 'WhatsApp', 'Reunião'] as const;
const STATUSES = ['Todos', 'A fazer', 'Em andamento', 'Concluída'] as const;

export default function OperacaoPage() {
  const [type, setType] = useState<(typeof TYPES)[number]>('Todas');
  const [funnel, setFunnel] = useState('Todos');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('Todos');
  const [taskState, setTaskState] = useState(MOCK_TASKS);

  const tasks = useMemo(
    () =>
      taskState.filter(
        (t) =>
          (type === 'Todas' || t.type === type) &&
          (funnel === 'Todos' || t.funnel === funnel) &&
          (status === 'Todos' || t.status === status),
      ),
    [taskState, type, funnel, status],
  );
  const cadence = useMemo(() => MOCK_CADENCE.filter((c) => funnel === 'Todos' || c.funnel === funnel), [funnel]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Operação" subtitle="Tarefas do time e cadência ativa." />

      <div className="flex flex-wrap gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={fieldClass}>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={funnel} onChange={(e) => setFunnel(e.target.value)} className={fieldClass}>
          <option>Todos</option>
          {MOCK_FUNIS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={fieldClass}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
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
              {tasks.map((t) => (
                <tr key={`${t.lead}-${t.task}`} className="border-t border-[#F3F4F6]">
                  <td className="px-5 py-3">
                    <div>{t.task}</div>
                    <div className="text-[12px] text-[#6B7280]">{t.lead}</div>
                  </td>
                  <td className="px-5 py-3 text-[#6B7280]">{t.type}</td>
                  <td className="px-5 py-3 text-[#6B7280]">{t.funnel}</td>
                  <td className="px-5 py-3">{t.owner}</td>
                  <td className="px-5 py-3 text-[#6B7280]">{t.due}</td>
                  <td className="px-5 py-3">
                    <select
                      value={t.status}
                      onChange={(e) =>
                        setTaskState((rows) =>
                          rows.map((r) => (r.lead === t.lead && r.task === t.task ? { ...r, status: e.target.value } : r)),
                        )
                      }
                      className="h-8 rounded-md border border-[#E5E7EB] px-2 text-xs"
                    >
                      {STATUSES.filter((s) => s !== 'Todos').map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Cadência">
        <div className="space-y-5">
          {cadence.map((c) => (
            <div key={c.lead}>
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span>
                  {c.lead}
                  <span className="ml-2 text-[12px] text-[#6B7280]">{c.funnel}</span>
                </span>
                <span className="text-[12px] text-[#6B7280]">{c.status}</span>
              </div>
              <div className="flex gap-px overflow-hidden rounded-md bg-[#E5E7EB]">
                {MOCK_CADENCE_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={cn(
                      'flex-1 px-2 py-2 text-center text-[11px]',
                      i === c.step ? 'bg-[#111827] text-white' : i < c.step ? 'bg-[#F3F4F6] text-[#111827]' : 'bg-white text-[#9CA3AF]',
                    )}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
