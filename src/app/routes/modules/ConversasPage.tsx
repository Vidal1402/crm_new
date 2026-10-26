import { useState } from 'react';
import { ModuleHeader, fieldClass } from '@/components/modules/ModuleChrome';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useOperators } from '@/hooks/useOperators';
import { cn } from '@/lib/utils';

const CHANNELS = ['Todos', 'WhatsApp', 'Instagram', 'E-mail'] as const;
const STATUSES = ['Todas', 'Aberta', 'Pendente', 'Resolvida'] as const;

function channelLabel(channel: string): (typeof CHANNELS)[number] {
  if (channel === 'instagram') return 'Instagram';
  if (channel === 'email') return 'E-mail';
  return 'WhatsApp';
}

function statusLabel(status: string): 'Aberta' | 'Pendente' | 'Resolvida' {
  if (status === 'closed') return 'Resolvida';
  if (status === 'ai_active') return 'Pendente';
  return 'Aberta';
}

function statusValue(label: string): 'human_active' | 'ai_active' | 'closed' {
  if (label === 'Resolvida') return 'closed';
  if (label === 'Pendente') return 'ai_active';
  return 'human_active';
}

export default function ConversasPage() {
  const { conversations, setStatus } = useConversations();
  const { operators } = useOperators();
  const [active, setActive] = useState('');
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>('Todos');
  const [status, setStatusFilter] = useState<(typeof STATUSES)[number]>('Todas');
  const [draft, setDraft] = useState('');
  const selected = active || conversations[0]?.id || null;
  const thread = useMessages(selected);

  const chats = conversations.map((item) => ({
    id: item.id,
    name: item.contact?.name || 'Sem nome',
    time: item.last_message_at ? new Date(item.last_message_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
    preview: item.lastMessagePreview || '',
    channel: channelLabel(item.channel),
    unread: item.unread_count,
    status: statusLabel(item.status),
    assignee: operators.find((operator) => operator.user_id === item.assigned_to)?.name || 'Sem responsável',
    phone: item.contact?.phone || '',
    email: item.contact?.email || '',
  }));
  const list = chats.filter((item) => (channel === 'Todos' || item.channel === channel) && (status === 'Todas' || item.status === status));
  const chat = chats.find((item) => item.id === active) ?? list[0];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ModuleHeader title="Conversas" subtitle="Fila gravada no banco. A mensagem sai pela função de envio da conta." />
      <div className="flex flex-wrap gap-2">
        <select value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)} className={fieldClass}>
          {CHANNELS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatusFilter(event.target.value as typeof status)} className={fieldClass}>
          {STATUSES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {!chat ? (
        <p className="text-sm text-[#6B7280]">Nenhuma conversa neste filtro.</p>
      ) : (
        <div className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white lg:grid-cols-[280px_minmax(0,1fr)_220px]">
          <aside className="border-b border-[#E5E7EB] lg:border-b-0 lg:border-r">
            <ul className="divide-y divide-[#F3F4F6]">
              {list.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setActive(item.id)} className={cn('w-full px-4 py-3 text-left', item.id === chat.id ? 'bg-[#F9FAFB]' : 'hover:bg-[#FAFAFA]')}>
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-[11px] text-[#9CA3AF]">{item.time}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">{item.preview}</p>
                    <div className="mt-1 text-[11px] text-[#9CA3AF]">{item.channel}{item.unread > 0 ? ` · ${item.unread}` : ''}</div>
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
                onChange={(event) => void setStatus(chat.id, statusValue(event.target.value))}
                className="h-8 rounded-md border border-[#E5E7EB] px-2 text-xs"
              >
                {STATUSES.filter((item) => item !== 'Todas').map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-2 p-4">
              {thread.messages.map((message) => (
                <div key={message.id} className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', message.direction === 'outbound' ? 'ml-auto bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#111827]')}>
                  {message.content}
                </div>
              ))}
            </div>
            <form
              className="border-t border-[#F3F4F6] p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const text = draft.trim();
                if (!text || !selected) return;
                void thread.sendText(text, false);
                setDraft('');
              }}
            >
              <input value={draft} onChange={(event) => setDraft(event.target.value)} className={cn(fieldClass, 'h-10 w-full')} placeholder="Mensagem" />
            </form>
          </section>
          <aside className="space-y-4 p-4 text-sm">
            <div>
              <div className="text-[12px] text-[#6B7280]">Telefone</div>
              <div>{chat.phone || '—'}</div>
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
