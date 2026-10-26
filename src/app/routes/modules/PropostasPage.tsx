import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Printer } from 'lucide-react';
import { usePipeline } from '@/hooks/usePipeline';
import { useOperators } from '@/hooks/useOperators';
import { LoadErrorBanner } from '@/components/LoadErrorBanner';
import { ModuleHeader, fieldClass } from '@/components/modules/ModuleChrome';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  cutoffLabel,
  groupProposals,
  listProposals,
  previousWindow,
  recentWindow,
  sameWindow,
  type ProposalQuery,
  type ProposalRow,
  type ProposalScope,
} from '@/lib/quoteLedger';
import type { Deal } from '@/types/crm';

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SCOPES: { id: ProposalScope; label: string }[] = [
  { id: 'active', label: 'Em andamento' },
  { id: 'all', label: 'Todas' },
  { id: 'open', label: 'Em elaboração' },
  { id: 'won', label: 'Fechadas' },
  { id: 'lost', label: 'Canceladas' },
];

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  uazapi: 'Uazapi',
  instagram: 'Instagram',
};

const SITUATION_LABEL: Record<ProposalRow['situation'], string> = {
  open: 'Em elaboração',
  won: 'Fechada',
  lost: 'Cancelada',
};

function toRow(deal: Deal): ProposalRow {
  return {
    id: deal.id,
    title: deal.title,
    contactName: deal.contact?.name ?? '',
    value: deal.value ?? 0,
    situation: deal.status,
    ownerId: deal.owner_id,
    channel: deal.channel ?? null,
    createdAt: deal.created_at,
  };
}

export default function PropostasPage() {
  const { pipelines, selectedId, select, deals, loading, error } = usePipeline();
  const { operators } = useOperators();
  const [query, setQuery] = useState<ProposalQuery>({ text: '', scope: 'active', ownerId: null, channel: null });
  const [today] = useState(() => new Date());
  const [period, setPeriod] = useState(() => recentWindow(new Date()));
  const recent = useMemo(() => recentWindow(today), [today]);

  const rows = useMemo(() => deals.map(toRow), [deals]);
  const listed = useMemo(() => listProposals(rows, query, period), [rows, query, period]);
  const groups = useMemo(() => groupProposals(listed, today), [listed, today]);
  const channels = useMemo(
    () => [...new Set(rows.map((row) => row.channel).filter((channel): channel is string => Boolean(channel)))],
    [rows],
  );
  const ownerName = (ownerId: string | null) =>
    operators.find((operator) => operator.user_id === ownerId)?.name ||
    operators.find((operator) => operator.user_id === ownerId)?.email ||
    'Sem responsável';

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <ModuleHeader
        title="Propostas"
        subtitle="Lista do funil comercial no último ano. O quadro de etapas continua no funil."
        extra={
          <>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer /> Imprimir lista
            </Button>
            <Link to="/funil" className={cn(buttonVariants())}>
              <FileText /> Nova proposta
            </Link>
          </>
        }
      />

      <p className="text-sm text-[#6B7280]">
        Suposição: envio a parceiro, nota fiscal e faturamento ficam de fora, porque este cadastro não tem esses campos. A
        janela de um ano segue a lista observada; o servidor não devolveu essa regra.
      </p>

      {error ? <LoadErrorBanner message={error} /> : null}

      <div className="flex flex-wrap gap-2 print:hidden">
        {pipelines.length > 1 ? (
          <select
            className={fieldClass}
            value={selectedId ?? ''}
            onChange={(event) => select(event.target.value)}
            aria-label="Funil"
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
        ) : null}
        <input
          className={`${fieldClass} min-w-56`}
          value={query.text}
          placeholder="Proposta ou contato"
          onChange={(event) => setQuery((current) => ({ ...current, text: event.target.value }))}
        />
        <select
          className={fieldClass}
          value={query.scope}
          aria-label="Situação"
          onChange={(event) => setQuery((current) => ({ ...current, scope: event.target.value as ProposalScope }))}
        >
          {SCOPES.map((scope) => (
            <option key={scope.id} value={scope.id}>
              {scope.label}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={query.ownerId ?? ''}
          aria-label="Responsável"
          onChange={(event) => setQuery((current) => ({ ...current, ownerId: event.target.value || null }))}
        >
          <option value="">Todos os responsáveis</option>
          {operators.map((operator) => (
            <option key={operator.user_id} value={operator.user_id}>
              {operator.name || operator.email}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={query.channel ?? ''}
          aria-label="Canal"
          onChange={(event) => setQuery((current) => ({ ...current, channel: event.target.value || null }))}
        >
          <option value="">Todos os canais</option>
          {channels.map((channel) => (
            <option key={channel} value={channel}>
              {CHANNEL_LABEL[channel] ?? channel}
            </option>
          ))}
        </select>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        {loading && listed.length === 0 ? (
          <p className="px-5 py-10 text-sm text-[#4B5563]">Carregando propostas…</p>
        ) : listed.length === 0 ? (
          <p className="px-5 py-10 text-sm text-[#4B5563]">Nenhuma proposta neste período com os filtros atuais.</p>
        ) : (
          groups.map((group) => (
            <div key={group.key}>
              <h2 className="border-b border-[#F3F4F6] bg-[#F9FAFB] px-5 py-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                {group.label}
              </h2>
              <ul>
                {group.rows.map((item) => (
                  <li key={item.id} className="border-b border-[#F3F4F6]">
                    <Link to={`/funil?deal=${item.id}`} className="grid gap-2 px-5 py-3 hover:bg-[#F9FAFB] sm:grid-cols-[4rem_1fr_9rem_8rem]">
                      <span className="text-sm font-medium text-[#111827]">#{item.number}</span>
                      <span>
                        <span className="block text-sm text-[#111827]">{item.title || 'Sem título'}</span>
                        <span className="block text-xs text-[#6B7280]">
                          {item.contactName || 'Sem contato'} · {ownerName(item.ownerId)}
                        </span>
                      </span>
                      <span className="text-sm text-[#4B5563]">{SITUATION_LABEL[item.situation]}</span>
                      <span className="text-sm tabular-nums text-[#111827]">{brl(item.value)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-[#4B5563]">
          <p>Nada mais antigo que {cutoffLabel(period)} nesta visão.</p>
          <div className="flex gap-2 print:hidden">
            {sameWindow(period, recent) ? null : (
              <button type="button" className="font-medium text-[#166534] hover:underline" onClick={() => setPeriod(recent)}>
                Voltar ao período recente
              </button>
            )}
            <button type="button" className="font-medium text-[#166534] hover:underline" onClick={() => setPeriod(previousWindow(period))}>
              Ver o ano anterior
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
