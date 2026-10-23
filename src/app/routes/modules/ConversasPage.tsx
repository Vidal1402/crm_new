import { useMemo, useState } from 'react';
import { ModuleHeader, fieldClass } from '@/components/modules/ModuleChrome';
import { MOCK_CHATS, MOCK_THREADS } from '@/lib/mock/modules';
import { cn } from '@/lib/utils';

const CHANNELS = ['Todos', 'WhatsApp', 'Instagram', 'E-mail'] as const;
const STATUSES = ['Todas', 'Aberta', 'Pendente', 'Resolvida'] as const;

export default function ConversasPage() {
  const [active, setActive] = useState(MOCK_CHATS[0]?.id ?? '');
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>('Todos');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('Todas');
  const [chats, setChats] = useState(MOCK_CHATS);

  const list = useMemo(
    () => chats.filter((c) => (channel === 'Todos' || c.channel === channel) && (status === 'Todas' || c.status === status)),
    [chats, channel, status],
  );
  const chat = chats.find((c) => c.id === active) ?? list[0];
  const thread = chat ? MOCK_THREADS[chat.id] ?? [] : [];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ModuleHeader title="Conversas" subtitle="WhatsApp, Instagram e e-mail na mesma fila." />

      <div className="flex flex-wrap gap-2">
        <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className={fieldClass}>
          {CHANNELS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={fieldClass}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {!chat ? (
        <p className="text-sm text-[#6B7280]">Nada neste filtro.</p>
      ) : (
        <div className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)] lg:grid-cols-[280px_minmax(0,1fr)_220px]">
          <aside className="border-b border-[#E5E7EB] lg:border-b-0 lg:border-r">
            <ul className="divide-y divide-[#F3F4F6]">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActive(c.id)}
                    className={cn('w-full px-4 py-3 text-left', c.id === chat.id ? 'bg-[#F9FAFB]' : 'hover:bg-[#FAFAFA]')}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-[11px] text-[#9CA3AF]">{c.time}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">{c.preview}</p>
                    <div className="mt-1 text-[11px] text-[#9CA3AF]">
                      {c.channel}
                      {c.unread > 0 ? ` · ${c.unread}` : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <section className="flex min-h-[360px] flex-col border-b border-[#E5E7EB] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3">
              <div>
                <div className="text-sm font-medium">{chat.name}</div>
                <div className="text-[12px] text-[#6B7280]">{chat.assignee}</div>
              </div>
              <select
                value={chat.status}
                onChange={(e) => setChats((rows) => rows.map((r) => (r.id === chat.id ? { ...r, status: e.target.value as typeof r.status } : r)))}
                className="h-8 rounded-md border border-[#E5E7EB] px-2 text-xs"
              >
                {STATUSES.filter((s) => s !== 'Todas').map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2 p-4">
              {thread.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                    m.from === 'us' ? 'ml-auto bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#111827]',
                  )}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div className="border-t border-[#F3F4F6] p-3">
              <input disabled className={cn(fieldClass, 'h-10 w-full bg-[#F9FAFB] text-[#9CA3AF]')} placeholder="Mensagem" />
            </div>
          </section>
          <aside className="space-y-4 p-4 text-sm">
            <div>
              <div className="text-[12px] text-[#6B7280]">WhatsApp</div>
              <div>{chat.phone || '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[#6B7280]">Instagram</div>
              <div>{chat.ig || '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[#6B7280]">E-mail</div>
              <div className="break-all">{chat.email || '—'}</div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
