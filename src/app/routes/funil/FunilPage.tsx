import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  GripVertical,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { usePipeline } from '@/hooks/usePipeline';
import { useOperators } from '@/hooks/useOperators';
import { withTenant } from '@/lib/tenantWrite';
import { useAppUser } from '@/app/providers/AppUserProvider';
import { LoadErrorBanner } from '@/components/LoadErrorBanner';
import { DealDrawer } from '@/components/funil/DealDrawer';
import { FunilManager } from '@/components/funil/FunilManager';
import { FunilFilter, applyDealFilter, EMPTY_FILTER, type DealFilter } from '@/components/funil/FunilFilter';
import { OriginBadge } from '@/components/origin/OriginBadge';
import { TEMPERATURE_STYLE, type ContactLite, type CustomField, type Deal, type Product, type Stage } from '@/types/crm';
import { dueBadge } from '@/lib/nextAction';
import {
  columnTotal,
  deskOwners,
  deskProducts,
  deskStages,
  EMPTY_DESK_QUERY,
  visibleCards,
  type DeskCard,
  type DeskQuery,
  type DeskState,
} from '@/lib/boardDesk';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SORT_LABEL = { recent: 'Recentes', value: 'Maior valor', name: 'Nome' } as const;
const RANGE_LABEL = { year: '12 meses', month: 'Este mês', all: 'Tudo' } as const;

type Pop = null | 'filter' | 'sort' | 'range' | 'menu' | 'create' | 'edit' | 'perms' | 'rules' | 'import' | 'move';

export default function FunilPage() {
  const funil = usePipeline();
  const { pipelines, select, pipeline, stages, deals, loading, error, reload, moveDeal, createDeal, createPipeline } = funil;
  const { tenantRole: role } = useAppUser();
  const { operators } = useOperators();
  const today = useMemo(() => new Date(), []);

  const [desk, setDesk] = useState<DeskState>({ groups: [], boards: [], cards: [] });
  const [boardId, setBoardId] = useState('');
  const [query, setQuery] = useState<DeskQuery>(EMPTY_DESK_QUERY);
  const [draft, setDraft] = useState<DeskQuery>(EMPTY_DESK_QUERY);
  const [railText, setRailText] = useState('');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [pop, setPop] = useState<Pop>(null);
  const [form, setForm] = useState({ name: '', description: '', group: 'Comercial' });
  const [importText, setImportText] = useState('');
  const [moveTo, setMoveTo] = useState('entrada');
  const [access, setAccess] = useState<string[]>(() => deskOwners());

  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);
  const [filter, setFilter] = useState<DealFilter>(EMPTY_FILTER);

  const board = desk.boards.find((item) => item.id === boardId) ?? desk.boards[0];
  const mock = Boolean(board) && desk.boards.some((item) => item.id === boardId);
  const shown = useMemo(
    () => (board ? visibleCards(desk.cards, board.id, query, today) : []),
    [desk.cards, board, query, today],
  );
  const filteredDeals = useMemo(() => {
    const base = applyDealFilter(deals, filter);
    const needleText = query.text.trim().toLowerCase();
    if (!needleText) return base;
    return base.filter((deal) => `${deal.title} ${deal.contact?.name ?? ''}`.toLowerCase().includes(needleText));
  }, [deals, filter, query.text]);
  const openDeal = useMemo(() => deals.find((deal) => deal.id === openDealId) ?? null, [deals, openDealId]);
  const livePipelines = pipelines.filter((item) => item.id !== 'story-pipe');
  const needle = railText.trim().toLowerCase();

  useEffect(() => {
    if (pipeline?.id) setBoardId((current) => current || pipeline.id);
  }, [pipeline?.id]);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const dealParam = searchParams.get('deal');
    if (dealParam && deals.some((deal) => deal.id === dealParam)) setOpenDealId(dealParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals]);

  useEffect(() => {
    const supabase = getSupabase();
    void supabase.from('contacts').select('id, name, phone').order('name').limit(500)
      .then(({ data }) => setContacts((data ?? []) as ContactLite[]));
    void supabase.from('custom_fields').select('*').order('position')
      .then(({ data }) => setCustomFields((data ?? []) as CustomField[]));
    void supabase.from('products').select('id, name').order('name')
      .then(({ data }) => setProductCatalog((data ?? []) as Product[]));
  }, []);

  function patchCards(ids: string[], change: Partial<DeskCard>) {
    setDesk((prev) => ({
      ...prev,
      cards: prev.cards.map((card) => (ids.includes(card.id) ? { ...card, ...change } : card)),
    }));
  }

  function applyBatch(kind: 'won' | 'lost' | 'restore' | 'delete' | 'move') {
    if (mock) {
      const ids = shown.map((card) => card.id);
      if (kind === 'delete') {
        setDesk((prev) => ({ ...prev, cards: prev.cards.filter((card) => !ids.includes(card.id)) }));
      } else if (kind === 'won') patchCards(ids, { stageKey: 'ganho', status: 'won' });
      else if (kind === 'lost') patchCards(ids, { stageKey: 'perdido', status: 'lost' });
      else if (kind === 'restore') patchCards(ids, { stageKey: 'entrada', status: 'open' });
      else patchCards(ids, { stageKey: moveTo, status: moveTo === 'ganho' ? 'won' : moveTo === 'perdido' ? 'lost' : 'open' });
      setPop(null);
      return;
    }
    const target = kind === 'won'
      ? stages.find((stage) => stage.is_won)
      : kind === 'lost'
        ? stages.find((stage) => stage.is_lost)
        : stages.find((stage) => stage.id === moveTo) ?? stages.find((stage) => !stage.is_won && !stage.is_lost);
    if (kind === 'delete' || !target) {
      setPop(null);
      return;
    }
    for (const deal of filteredDeals) void moveDeal(deal.id, target.id);
    setPop(null);
  }

  function saveBoard() {
    const name = form.name.trim();
    if (!name) return;
    const group = form.group.trim() || 'Comercial';
    if (pop === 'edit' && mock) {
      setDesk((prev) => ({
        ...prev,
        groups: prev.groups.includes(group) ? prev.groups : [...prev.groups, group],
        boards: prev.boards.map((item) => item.id === board.id
          ? { ...item, name, description: form.description.trim(), group }
          : item),
      }));
    } else if (pop === 'create') {
      void createPipeline(name).then((created) => {
        if (created) {
          select(created.id);
          setBoardId(created.id);
        }
      });
    }
    setPop(null);
  }

  const title = mock ? board.name : (pipeline?.name ?? 'Funil');
  const subtitle = mock ? board.description : 'Negócios da conta ligada';

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
      <aside className="flex w-[250px] shrink-0 flex-col border-r border-[#E5E7EB]">
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="text-base font-semibold text-[#111827]">Funis</h2>
        </div>
        <div className="px-3">
          <label className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-[#6B7280]" />
            <input
              value={railText}
              onChange={(event) => setRailText(event.target.value)}
              placeholder="Buscar funil"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => { setForm({ name: '', description: '', group: 'Comercial' }); setPop('create'); }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Novo funil
          </button>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto px-2 pb-4">
          {desk.groups.map((group) => {
            const items = desk.boards.filter((item) => item.group === group && item.name.toLowerCase().includes(needle));
            if (needle && items.length === 0) return null;
            const shut = closed[group];
            return (
              <div key={group} className="mt-2">
                <button
                  type="button"
                  onClick={() => setClosed((prev) => ({ ...prev, [group]: !prev[group] }))}
                  className="flex w-full items-center gap-1 px-2 py-1 text-xs font-semibold text-[#6B7280]"
                >
                  {shut ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {group}
                </button>
                {!shut && items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBoardId(item.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                      item.id === boardId ? 'bg-[#F3F4F6] font-semibold text-[#111827]' : 'text-[#4B5563] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
          {livePipelines.length > 0 && (
            <div className="mt-3">
              <div className="px-2 py-1 text-xs font-semibold text-[#6B7280]">Desta conta</div>
              {livePipelines.filter((item) => item.name.toLowerCase().includes(needle)).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setBoardId(item.id); select(item.id); }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                    item.id === boardId ? 'bg-[#F3F4F6] font-semibold text-[#111827]' : 'text-[#4B5563] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-[#111827]">{title}</h1>
              <p className="truncate text-sm text-[#6B7280]">{subtitle}</p>
            </div>
            <label className="flex min-w-[180px] items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2">
              <Search className="h-4 w-4 text-[#6B7280]" />
              <input
                value={query.text}
                onChange={(event) => setQuery((prev) => ({ ...prev, text: event.target.value }))}
                placeholder="Buscar..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <div className="relative">
              <button type="button" onClick={() => { setDraft(query); setPop(pop === 'filter' ? null : 'filter'); }} className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm">
                <Filter className="h-4 w-4" /> Filtros
              </button>
              {pop === 'filter' && (
                <FilterPopover
                  draft={draft}
                  owners={operators.map((operator) => operator.name || operator.email)}
                  products={deskProducts(desk.cards)}
                  onChange={setDraft}
                  onClear={() => { setDraft(EMPTY_DESK_QUERY); setQuery(EMPTY_DESK_QUERY); setPop(null); }}
                  onApply={() => { setQuery(draft); setPop(null); }}
                />
              )}
            </div>
            <div className="relative">
              <button type="button" onClick={() => setPop(pop === 'sort' ? null : 'sort')} className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm">
                <ArrowUpDown className="h-4 w-4" /> Ordenação
              </button>
              {pop === 'sort' && (
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-lg">
                  {(Object.keys(SORT_LABEL) as Array<keyof typeof SORT_LABEL>).map((key) => (
                    <button key={key} type="button" onClick={() => { setQuery((prev) => ({ ...prev, sort: key })); setPop(null); }} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#F3F4F6]">
                      {SORT_LABEL[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button type="button" onClick={() => setPop(pop === 'menu' ? null : 'menu')} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {pop === 'menu' && (
                <MenuPanel
                  onPick={(next) => {
                    if (next === 'edit') {
                      setForm({ name: title, description: subtitle, group: mock ? board.group : 'Comercial' });
                      setPop(mock ? 'edit' : null);
                      if (!mock) setManageOpen(true);
                    } else if (next === 'print') {
                      setPop(null);
                      window.print();
                    } else if (next === 'copy' && mock) {
                      const id = `desk-copy-${Date.now()}`;
                      setDesk((prev) => ({
                        ...prev,
                        boards: [...prev.boards, { ...board, id, name: `${board.name} cópia` }],
                        cards: [
                          ...prev.cards,
                          ...prev.cards.filter((card) => card.boardId === board.id).map((card) => ({ ...card, id: `${card.id}-${id}`, boardId: id })),
                        ],
                      }));
                      setBoardId(id);
                      setPop(null);
                    } else if (next === 'delete-board' && mock && desk.boards.length > 1) {
                      setDesk((prev) => ({
                        ...prev,
                        boards: prev.boards.filter((item) => item.id !== board.id),
                        cards: prev.cards.filter((card) => card.boardId !== board.id),
                      }));
                      setBoardId(desk.boards.find((item) => item.id !== board.id)?.id ?? 'desk-captacao');
                      setPop(null);
                    } else if (next === 'won' || next === 'lost' || next === 'restore' || next === 'delete') {
                      applyBatch(next);
                    } else if (next === 'perms' || next === 'rules' || next === 'import' || next === 'move') {
                      setPop(next);
                    }
                  }}
                />
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-[#6B7280]">Ordem</span>
            <button type="button" onClick={() => setPop(pop === 'sort' ? null : 'sort')} className="font-medium text-[#111827] underline decoration-[#E5E7EB] underline-offset-4">
              {SORT_LABEL[query.sort]}
            </button>
            <span className="text-[#6B7280]">Intervalo</span>
            <button type="button" onClick={() => setPop(pop === 'range' ? null : 'range')} className="font-medium text-[#111827] underline decoration-[#E5E7EB] underline-offset-4">
              {RANGE_LABEL[query.range]}
            </button>
            {pop === 'range' && (
              <span className="relative">
                <span className="absolute left-0 z-20 mt-6 w-36 rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-lg">
                  {(Object.keys(RANGE_LABEL) as Array<keyof typeof RANGE_LABEL>).map((key) => (
                    <button key={key} type="button" onClick={() => { setQuery((prev) => ({ ...prev, range: key })); setPop(null); }} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#F3F4F6]">
                      {RANGE_LABEL[key]}
                    </button>
                  ))}
                </span>
              </span>
            )}
            {!mock && (
              <FunilFilter deals={deals} customFields={customFields} productCatalog={productCatalog} value={filter} onChange={setFilter} />
            )}
            {role === 'admin' && !mock && (
              <button type="button" onClick={() => setManageOpen(true)} className="inline-flex items-center gap-2 text-sm text-[#4B5563]">
                <Settings2 className="h-4 w-4" /> Ajustar etapas
              </button>
            )}
          </div>
            <p className="mt-2 text-xs text-[#6B7280]">
              Os cartões e os totais vêm dos negócios gravados neste funil.
            </p>
        </header>

        {error && !mock && <div className="px-5 pt-3"><LoadErrorBanner message={error} onRetry={() => void reload()} /></div>}

        <div className="flex flex-1 gap-3 overflow-x-auto bg-[#F3F4F6] p-4">
          {mock ? deskStages(board.id).map((stage) => {
            const list = shown.filter((card) => card.stageKey === stage.key);
            return (
              <ColumnShell
                key={stage.id}
                name={stage.name}
                tone={stage.tone}
                total={columnTotal(list)}
                count={list.length}
                onAdd={() => setAdding(stage.key)}
              >
                <div
                  className="flex-1 space-y-2"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!dragId) return;
                    patchCards([dragId], { stageKey: stage.key, status: stage.key === 'ganho' ? 'won' : stage.key === 'perdido' ? 'lost' : 'open' });
                    setDragId(null);
                  }}
                >
                  {list.map((card) => (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={() => setDragId(card.id)}
                      onClick={() => { if (deals.some((deal) => deal.id === card.id)) setOpenDealId(card.id); }}
                      className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white p-3"
                    >
                      <div className="truncate text-sm font-semibold text-[#111827]">{card.contact}</div>
                      <div className="truncate text-xs text-[#6B7280]">{card.product}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#111827]">{brl(card.value)}</span>
                        <span className="text-[#6B7280]">{card.owner}</span>
                      </div>
                    </article>
                  ))}
                  {adding === stage.key && (
                    <LocalAdd
                      onCancel={() => setAdding(null)}
                      onSave={(titleText, value) => {
                        setDesk((prev) => ({
                          ...prev,
                          cards: [...prev.cards, {
                            id: `desk-card-${Date.now()}`,
                            boardId: board.id,
                            stageKey: stage.key,
                            title: titleText,
                            contact: titleText,
                            owner: access[0] ?? 'Sem dono',
                            product: titleText,
                            value,
                            status: stage.key === 'ganho' ? 'won' : stage.key === 'perdido' ? 'lost' : 'open',
                            occurredOn: new Date().toISOString().slice(0, 10),
                            tag: 'lead',
                          }],
                        }));
                        setAdding(null);
                      }}
                    />
                  )}
                </div>
              </ColumnShell>
            );
          }) : loading ? (
            <div className="text-sm text-[#6B7280]">Carregando funil...</div>
          ) : stages.map((stage) => {
            const list = filteredDeals.filter((deal) => deal.stage_id === stage.id);
            const total = list.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
            return (
              <ColumnShell key={stage.id} name={stage.name} tone={stage.color || '#6B7280'} total={total} count={list.length} onAdd={() => setAdding(stage.id)}>
                <div
                  className="flex-1 space-y-2"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => { if (dragId) void moveDeal(dragId, stage.id); setDragId(null); }}
                >
                  {list.map((deal) => (
                    <DealCard key={deal.id} deal={deal} onDragStart={() => setDragId(deal.id)} onOpen={() => setOpenDealId(deal.id)} />
                  ))}
                  {adding === stage.id && (
                    <AddDealForm
                      contacts={contacts}
                      onCancel={() => setAdding(null)}
                      onSubmit={async (input) => { await createDeal({ ...input, stage_id: stage.id }); setAdding(null); }}
                    />
                  )}
                </div>
              </ColumnShell>
            );
          })}
        </div>
      </section>

      {(pop === 'create' || pop === 'edit') && (
        <Modal title={pop === 'create' ? 'Novo funil' : 'Ajustar funil'} onClose={() => setPop(null)}>
          <label className="block text-sm font-medium text-[#111827]">Nome
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#111827]" placeholder="Como a equipe chama este funil" />
          </label>
          <label className="mt-3 block text-sm font-medium text-[#111827]">Descrição
            <input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#111827]" placeholder="Para que serve" />
          </label>
          <label className="mt-3 block text-sm font-medium text-[#111827]">Grupo
            <input value={form.group} onChange={(event) => setForm((prev) => ({ ...prev, group: event.target.value }))} list="desk-groups" className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#111827]" placeholder="Escolha ou escreva um grupo" />
            <datalist id="desk-groups">{desk.groups.map((group) => <option key={group} value={group} />)}</datalist>
          </label>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={saveBoard} className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white">Guardar</button>
          </div>
        </Modal>
      )}

      {pop === 'perms' && (
        <Modal title="Quem acessa" onClose={() => setPop(null)}>
          <p className="text-sm text-[#6B7280]">Suposição: a lista de acesso fica neste navegador. A matriz do servidor não foi vista.</p>
          <ul className="mt-3 space-y-2">
            {deskOwners().map((name) => (
              <li key={name}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={access.includes(name)}
                    onChange={() => setAccess((prev) => prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name])}
                  />
                  {name}
                </label>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {pop === 'rules' && (
        <Modal title="Regras da etapa" onClose={() => setPop(null)}>
          <p className="text-sm text-[#6B7280]">Suposição: sair de uma etapa não exige campo extra. As etapas deste funil são as colunas visíveis.</p>
          <ul className="mt-3 space-y-1 text-sm text-[#111827]">
            {(mock ? deskStages(board.id) : stages).map((stage) => <li key={stage.id}>{stage.name}</li>)}
          </ul>
        </Modal>
      )}

      {pop === 'import' && (
        <Modal title="Trazer lista" onClose={() => setPop(null)}>
          <p className="text-sm text-[#6B7280]">Suposição: um nome por linha vira um cartão na primeira coluna. O formato de arquivo não foi visto.</p>
          <textarea value={importText} onChange={(event) => setImportText(event.target.value)} className="mt-3 h-32 w-full rounded-lg border border-[#E5E7EB] p-2 text-sm outline-none" />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  const lines = importText.split('\n').map((line) => line.trim()).filter(Boolean);
                  const stage = stages[0];
                  if (!stage || !pipeline) return;
                  const supabase = getSupabase();
                  for (const line of lines) {
                    const [name, phone] = line.split(/[;,]/).map((part) => part.trim());
                    if (!name || !phone) continue;
                    const { data: contact } = await supabase
                      .from('contacts')
                      .insert(await withTenant({ name, phone, kind: 'lead' }))
                      .select('id')
                      .single();
                    if (contact) await createDeal({ title: name, contact_id: contact.id, value: 0, stage_id: stage.id });
                  }
                  setImportText('');
                  setPop(null);
                  await reload();
                })();
              }}
              className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white"
            >
              Incluir
            </button>
          </div>
        </Modal>
      )}

      {pop === 'move' && (
        <Modal title="Mover cartões visíveis" onClose={() => setPop(null)}>
          <select value={moveTo} onChange={(event) => setMoveTo(event.target.value)} className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm">
            {(mock ? deskStages(board.id) : stages).map((stage) => (
              <option key={stage.id} value={mock ? stage.id.replace(`${board.id}-`, '') : stage.id}>{stage.name}</option>
            ))}
          </select>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => applyBatch('move')} className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white">Mover</button>
          </div>
        </Modal>
      )}

      {openDeal && (
        <DealDrawer deal={openDeal} stages={stages} pipelines={pipelines} isAdmin={role === 'admin'} onClose={() => setOpenDealId(null)} onStageChange={moveDeal} onChanged={reload} />
      )}
      {manageOpen && <FunilManager funil={funil} onClose={() => setManageOpen(false)} />}
    </div>
  );
}

function ColumnShell({
  name, tone, total, count, onAdd, children,
}: {
  name: string;
  tone: string;
  total: number;
  count: number;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[520px] w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
      <div className="h-1" style={{ background: tone }} />
      <div className="flex items-start justify-between px-3 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone }} />
          {name}
        </span>
        <span className="text-right text-xs text-[#6B7280]">
          <span className="block font-medium text-[#111827]">{brl(total)}</span>
          {count === 0 ? 'Sem cartão' : `${count} cartão${count === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3">{children}</div>
      <button type="button" onClick={onAdd} className="border-t border-[#E5E7EB] py-3 text-center text-sm text-[#6B7280] hover:text-[#111827]">
        + Incluir cartão
      </button>
    </div>
  );
}

function FilterPopover({
  draft, owners, products, onChange, onClear, onApply,
}: {
  draft: DeskQuery;
  owners: string[];
  products: string[];
  onChange: (next: DeskQuery) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  const [openRow, setOpenRow] = useState<string | null>('owner');
  const rows: Array<{ id: string; label: string; wired: boolean }> = [
    { id: 'tag', label: 'Etiqueta', wired: true },
    { id: 'product', label: 'Item', wired: true },
    { id: 'owner', label: 'Responsável', wired: true },
    { id: 'status', label: 'Situação', wired: true },
    { id: 'range', label: 'Período', wired: true },
    { id: 'move', label: 'Movimento', wired: false },
    { id: 'created', label: 'Criação', wired: false },
    { id: 'closed', label: 'Fechamento', wired: false },
    { id: 'channel', label: 'Canal', wired: false },
    { id: 'extra', label: 'Extra do cartão', wired: false },
    { id: 'lead', label: 'Extra do contato', wired: false },
    { id: 'reason', label: 'Motivo', wired: false },
    { id: 'min', label: 'Mínimo', wired: true },
    { id: 'max', label: 'Máximo', wired: true },
  ];
  return (
    <div className="absolute right-0 z-30 mt-1 w-[320px] rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-lg">
      {rows.map((row) => (
        <div key={row.id} className="border-b border-[#F3F4F6]">
          <button type="button" onClick={() => setOpenRow(openRow === row.id ? null : row.id)} className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm">
            <Plus className="h-3.5 w-3.5 text-[#6B7280]" />
            <span className="flex-1">{row.label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6B7280]" />
          </button>
          {openRow === row.id && (
            <div className="px-2 pb-2">
              {row.id === 'owner' && <Select value={draft.owner} onChange={(value) => onChange({ ...draft, owner: value })} options={['', ...owners]} />}
              {row.id === 'product' && <Select value={draft.product} onChange={(value) => onChange({ ...draft, product: value })} options={['', ...products]} />}
              {row.id === 'status' && <Select value={draft.status} onChange={(value) => onChange({ ...draft, status: value as DeskQuery['status'] })} options={['', 'open', 'won', 'lost']} labels={['Todas', 'Em aberto', 'Ganho', 'Perdido']} />}
              {row.id === 'tag' && <Select value={draft.tag} onChange={(value) => onChange({ ...draft, tag: value })} options={['', 'cliente', 'lead']} labels={['Todas', 'Cliente', 'Lead']} />}
              {row.id === 'range' && <Select value={draft.range} onChange={(value) => onChange({ ...draft, range: value as DeskQuery['range'] })} options={['year', 'month', 'all']} labels={['12 meses', 'Este mês', 'Tudo']} />}
              {row.id === 'min' && <input value={draft.min} onChange={(event) => onChange({ ...draft, min: event.target.value })} placeholder="0" className="w-full rounded-md border border-[#E5E7EB] px-2 py-1 text-sm" />}
              {row.id === 'max' && <input value={draft.max} onChange={(event) => onChange({ ...draft, max: event.target.value })} placeholder="0" className="w-full rounded-md border border-[#E5E7EB] px-2 py-1 text-sm" />}
              {!row.wired && <p className="text-xs text-[#6B7280]">Suposição: este eixo não tem regra própria. Use a busca do topo.</p>}
            </div>
          )}
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onClear} className="flex-1 rounded-lg border border-[#E5E7EB] py-2 text-sm">Limpar</button>
        <button type="button" onClick={onApply} className="flex-1 rounded-lg bg-[#111827] py-2 text-sm font-semibold text-white">Aplicar</button>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, labels }: { value: string; onChange: (value: string) => void; options: string[]; labels?: string[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-[#E5E7EB] px-2 py-1 text-sm">
      {options.map((option, index) => <option key={option || 'all'} value={option}>{labels?.[index] || option || 'Todos'}</option>)}
    </select>
  );
}

function MenuPanel({ onPick }: { onPick: (action: 'edit' | 'perms' | 'rules' | 'copy' | 'move' | 'won' | 'lost' | 'restore' | 'delete' | 'print' | 'import' | 'delete-board') => void }) {
  const item = 'block w-full rounded-md px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#F3F4F6]';
  return (
    <div className="absolute right-0 z-30 mt-1 flex w-[440px] gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg">
      <div className="flex-1">
        <div className="px-3 pb-1 text-[10px] font-semibold tracking-wide text-[#6B7280]">PRINCIPAIS</div>
        <button type="button" className={item} onClick={() => onPick('edit')}>Ajustar funil</button>
        <button type="button" className={item} onClick={() => onPick('perms')}>Quem acessa</button>
        <button type="button" className={item} onClick={() => onPick('rules')}>Regras da etapa</button>
      </div>
      <div className="flex-1">
        <div className="px-3 pb-1 text-[10px] font-semibold tracking-wide text-[#6B7280]">OUTROS</div>
        <button type="button" className={item} onClick={() => onPick('copy')}>Copiar funil</button>
        <button type="button" className={item} onClick={() => onPick('move')}>Mover visíveis</button>
        <button type="button" className={item} onClick={() => onPick('won')}>Marcar ganhos</button>
        <button type="button" className={item} onClick={() => onPick('lost')}>Marcar perdas</button>
        <button type="button" className={item} onClick={() => onPick('restore')}>Restaurar</button>
        <button type="button" className={item} onClick={() => onPick('delete')}>Apagar visíveis</button>
        <button type="button" className={item} onClick={() => onPick('print')}>Imprimir</button>
        <button type="button" className={item} onClick={() => onPick('import')}>Trazer lista</button>
        <button type="button" className={item} onClick={() => onPick('delete-board')}>Excluir funil</button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827]">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-[#6B7280]"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LocalAdd({ onSave, onCancel }: { onSave: (title: string, value: number) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(event) => { event.preventDefault(); if (!title.trim()) return; onSave(title.trim(), Number(value) || 0); }}
      className="space-y-2 rounded-lg border border-[#E5E7EB] bg-white p-2"
    >
      <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome do cartão" className="w-full rounded-md border border-[#E5E7EB] px-2 py-1 text-sm outline-none" />
      <input value={value} onChange={(event) => setValue(event.target.value)} type="number" placeholder="Valor" className="w-full rounded-md border border-[#E5E7EB] px-2 py-1 text-sm outline-none" />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-md bg-[#111827] px-2 py-1 text-xs font-semibold text-white">Guardar</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs"><X className="h-3 w-3" /></button>
      </div>
    </form>
  );
}

function DealCard({
  deal,
  onDragStart,
  onOpen,
}: {
  deal: Deal;
  onDragStart: () => void;
  onOpen: () => void;
}) {
  const draggedRef = useRef(false);
  const leadName = deal.contact?.name?.trim() || deal.contact?.phone || 'Sem nome';
  const temp = TEMPERATURE_STYLE[deal.temperature];

  return (
    <div
      draggable
      onDragStart={() => { draggedRef.current = true; onDragStart(); }}
      onDragEnd={() => { window.setTimeout(() => { draggedRef.current = false; }, 50); }}
      onClick={() => { if (!draggedRef.current) onOpen(); }}
      className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[#111827]">{leadName}</div>
          <div className="truncate text-xs text-[#6B7280]">
            {deal.products && deal.products.length > 0
              ? `${deal.products[0].name}${deal.products.length > 1 ? ' e outros' : ''}`
              : deal.title}
          </div>
        </div>
        {temp && (
          <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${temp.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${temp.dot}`} />
            {temp.label}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#111827]">{brl(Number(deal.value) || 0)}</span>
        <div className="flex items-center gap-1">
          <OriginBadge deal={deal} />
          {deal.lead_type === 'Cliente' && (
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#111827]">Cliente</span>
          )}
        </div>
      </div>
      {deal.tags && deal.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {deal.tags.slice(0, 3).map((tag) => (
            <span key={tag.id} className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] text-[#4B5563]">{tag.name}</span>
          ))}
        </div>
      )}
      {deal.next_action && (
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${dueBadge(deal.next_action.due_at).className}`}>
            <Clock className="h-2.5 w-2.5" />
            {dueBadge(deal.next_action.due_at).short}
          </span>
        </div>
      )}
    </div>
  );
}

function AddDealForm({
  contacts,
  onSubmit,
  onCancel,
}: {
  contacts: ContactLite[];
  onSubmit: (input: { title: string; contact_id: string; value?: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputCls = 'w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-sm outline-none focus:border-[#111827]';

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim() || !contactId) return;
        setBusy(true);
        await onSubmit({ title: title.trim(), contact_id: contactId, value: Number(value) || 0 });
        setBusy(false);
      }}
      className="space-y-2 rounded-lg border border-[#E5E7EB] bg-white p-2"
    >
      <select value={contactId} onChange={(event) => setContactId(event.target.value)} className={inputCls}>
        <option value="">Contato…</option>
        {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name ?? contact.phone}</option>)}
      </select>
      <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título" className={inputCls} />
      <input value={value} onChange={(event) => setValue(event.target.value)} type="number" step="0.01" placeholder="Valor" className={inputCls} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="flex-1 rounded-md bg-[#111827] px-2 py-1 text-xs font-semibold text-white disabled:opacity-60">{busy ? 'Salvando…' : 'Guardar'}</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs"><X className="h-3 w-3" /></button>
      </div>
    </form>
  );
}

export type FunilController = ReturnType<typeof usePipeline>;
export type { Stage };
