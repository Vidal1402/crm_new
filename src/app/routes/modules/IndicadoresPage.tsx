import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Plus, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ModuleHeader, fieldClass } from '@/components/modules/ModuleChrome';
import { useOperators } from '@/hooks/useOperators';
import { useSalesDashboard } from '@/hooks/useSalesDashboard';
import { brl } from '@/lib/dashboard';
import {
  INDICATOR_IDEAS,
  INDICATORS,
  STAGE_LABEL,
  addCustomIndicator,
  customReady,
  filterIndicators,
  monthPeriod,
  pinIndicator,
  readBoard,
  removeCustomIndicator,
  unpinIndicator,
  writeBoard,
  type BoardState,
  type IndicatorDef,
  type IndicatorStage,
} from '@/lib/indicatorBoard';
import { cn } from '@/lib/utils';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const TIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 };

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export default function IndicadoresPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [ownerId, setOwnerId] = useState('todos');
  const [view, setView] = useState<'paineis' | 'lista'>('paineis');
  const [compare, setCompare] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<IndicatorStage | 'todos'>('todos');
  const [draftName, setDraftName] = useState('');
  const [draftBrief, setDraftBrief] = useState('');
  const [board, setBoard] = useState<BoardState>(() => readBoard(storage()));

  const range = useMemo(() => monthPeriod(year, month), [year, month]);
  const { metrics, loading, error } = useSalesDashboard(range);
  const { operators } = useOperators();

  const persist = (next: BoardState) => {
    setBoard(next);
    const box = storage();
    if (box) writeBoard(box, next);
  };

  const people = metrics.ranking.filter((row) => ownerId === 'todos' || row.owner_id === ownerId);
  const person = people[0];
  const scopedNote = ownerId !== 'todos';
  const responseCount = metrics.firstResponse.byOwner.reduce((sum, row) => sum + row.count, 0);
  const visible = filterIndicators(query, stage);
  const sections = [...new Set(visible.map((item) => item.section))];

  const headline = (item: IndicatorDef): string => {
    if (item.id === 'perdidos') return `${metrics.lost.count} · ${brl(metrics.lost.value)}`;
    if (item.id === 'funil') return `${metrics.forecast.openCount} abertos · ${brl(metrics.forecast.value)}`;
    if (item.id === 'atividades') return `${responseCount} respostas`;
    if (item.id === 'por-pessoa') return person ? brl(person.value) : brl(0);
    if (item.kind === 'note') return 'Sem este recorte';
    return `${metrics.won.count} · ${brl(metrics.won.value)}`;
  };

  const share = async () => {
    const text = board.pinnedIds
      .map((id) => {
        const item = INDICATORS.find((entry) => entry.id === id);
        return item ? `${item.title}: ${headline(item)}` : '';
      })
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Resumo copiado.');
    } catch {
      toast.error('Não foi possível copiar o resumo.');
    }
  };

  const saveCustom = () => {
    if (!customReady(draftName, draftBrief)) return;
    persist(addCustomIndicator(board, draftName, draftBrief, `custom-${Date.now()}`));
    setDraftName('');
    setDraftBrief('');
    setCustomOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <ModuleHeader
        title="Painel principal"
        subtitle="Mês, ano e pessoa filtram a leitura. Incluir um cartão não apaga os widgets do dashboard comercial."
        extra={
          <>
            <Button type="button" variant="outline" onClick={() => setCatalogOpen(true)}>
              <Plus className="h-4 w-4" />
              Incluir no painel
            </Button>
            <Button type="button" variant="outline" onClick={() => setCustomOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Criar com texto
            </Button>
            <Button type="button" variant="ghost" onClick={() => void share()}>
              Copiar resumo
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-[#E5E7EB] bg-white p-1">
          <button
            type="button"
            className={cn('rounded-full px-3 py-1.5 text-xs', view === 'paineis' ? 'bg-[#111827] text-white' : 'text-[#6B7280]')}
            onClick={() => setView('paineis')}
          >
            Painéis
          </button>
          <button
            type="button"
            className={cn('rounded-full px-3 py-1.5 text-xs', view === 'lista' ? 'bg-[#111827] text-white' : 'text-[#6B7280]')}
            onClick={() => setView('lista')}
          >
            Lista
          </button>
        </div>
        <span className="text-xs text-[#6B7280]">Filtrar por</span>
        <select className={fieldClass} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((label, index) => (
            <option key={label} value={index + 1}>
              {label}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="todos">Todas as pessoas</option>
          {operators.map((operator) => (
            <option key={operator.user_id} value={operator.user_id}>
              {operator.name || operator.email}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
      {loading ? <p className="text-sm text-[#6B7280]">Lendo os negócios do mês…</p> : null}
      {scopedNote ? (
        <p className="text-xs text-[#6B7280]">
          Suposição: a série diária continua da conta inteira. O recorte da pessoa vale no cartão de valor por pessoa.
        </p>
      ) : null}

      {view === 'lista' ? (
        <ul className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-white">
          {board.pinnedIds.map((id) => {
            const item = INDICATORS.find((entry) => entry.id === id);
            if (!item) return null;
            return (
              <li key={id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>{item.title}</span>
                <span className="tabular-nums text-[#6B7280]">{headline(item)}</span>
              </li>
            );
          })}
          {board.custom.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              <div className="font-medium">{item.name}</div>
              <p className="text-[#6B7280]">{item.brief}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {board.pinnedIds.map((id) => {
            const item = INDICATORS.find((entry) => entry.id === id);
            if (!item) return null;
            return (
              <article key={id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                <header className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-medium">{item.title}</h2>
                    <p className="text-[12px] text-[#6B7280]">
                      {MONTHS[month - 1]} de {year}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Tirar ${item.title}`}
                    className="text-[#9CA3AF]"
                    onClick={() => persist(unpinIndicator(board, id))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </header>
                <CardBody
                  item={item}
                  wonCount={metrics.won.count}
                  wonValue={metrics.won.value}
                  lostCount={metrics.lost.count}
                  lostValue={metrics.lost.value}
                  series={metrics.won.series.map((point) => ({
                    day: point.day.slice(8),
                    valor: point.value,
                  }))}
                  people={people.map((row) => ({
                    name: operators.find((operator) => operator.user_id === row.owner_id)?.name || 'Pessoa',
                    valor: row.value,
                  }))}
                  openCount={item.id === 'atividades' ? responseCount : metrics.forecast.openCount}
                  openValue={item.id === 'atividades' ? 0 : metrics.forecast.value}
                  compare={compare}
                  forecast={metrics.forecast.value}
                />
                {item.id === 'evolucao' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <button type="button" className="rounded-full border border-[#E5E7EB] px-3 py-1" onClick={() => setCompare((on) => !on)}>
                      {compare ? 'Ocultar previsão' : 'Comparar com a previsão'}
                    </button>
                    <Link to="/metas" className="underline">
                      Definir meta
                    </Link>
                  </div>
                ) : null}
              </article>
            );
          })}
          {board.custom.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <header className="mb-2 flex items-start justify-between gap-2">
                <h2 className="text-sm font-medium">{item.name}</h2>
                <button
                  type="button"
                  aria-label={`Tirar ${item.name}`}
                  onClick={() => persist(removeCustomIndicator(board, item.id))}
                >
                  <X className="h-4 w-4 text-[#9CA3AF]" />
                </button>
              </header>
              <p className="text-sm text-[#6B7280]">{item.brief}</p>
              <p className="mt-3 text-xs text-[#9CA3AF]">
                Suposição: o texto fica guardado neste navegador. Nenhum modelo desenha o gráfico.
              </p>
            </article>
          ))}
          <button
            type="button"
            onClick={() => setCatalogOpen(true)}
            className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[#D1D5DB] text-sm text-[#6B7280]"
          >
            Incluir no painel
          </button>
        </div>
      )}

      <Dialog open={catalogOpen} onClose={() => setCatalogOpen(false)} title="Escolher um indicador" widthClass="max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(['todos', 'entrada', 'retorno', 'crescimento'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStage(value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs',
                stage === value ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#4B5563]',
              )}
            >
              {value === 'todos' ? 'Todos' : STAGE_LABEL[value]}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar um indicador"
            className={cn(fieldClass, 'ml-auto w-56')}
          />
        </div>
        {sections.length === 0 ? <p className="text-sm text-[#6B7280]">Nada com esse texto.</p> : null}
        {sections.map((section) => (
          <section key={section} className="mb-6">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{section}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {visible
                .filter((item) => item.section === section)
                .map((item) => {
                  const pinned = board.pinnedIds.includes(item.id);
                  return (
                    <article key={item.id} className="rounded-2xl border border-[#E5E7EB] p-4">
                      <div className="mb-2 flex flex-wrap gap-1">
                        {item.stages.map((itemStage) => (
                          <span key={itemStage} className="rounded-full border border-[#E5E7EB] px-2 py-0.5 text-[10px] text-[#6B7280]">
                            {STAGE_LABEL[itemStage]}
                          </span>
                        ))}
                      </div>
                      <h4 className="text-sm font-medium">{item.title}</h4>
                      <p className="mt-1 text-sm text-[#6B7280]">{item.summary}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3"
                        disabled={pinned}
                        onClick={() => persist(pinIndicator(board, item.id))}
                      >
                        {pinned ? 'Já está no painel' : 'Incluir'}
                      </Button>
                    </article>
                  );
                })}
            </div>
          </section>
        ))}
      </Dialog>

      <Dialog open={customOpen} onClose={() => setCustomOpen(false)} title="Descrever um indicador" widthClass="max-w-3xl">
        <p className="mb-4 text-xs text-[#6B7280]">Etapa 1. A etapa seguinte não foi observada, então guardar já cria o cartão.</p>
        <label className="block text-sm">
          Nome
          <input value={draftName} onChange={(e) => setDraftName(e.target.value)} className={cn(fieldClass, 'mt-1 w-full')} />
        </label>
        <label className="mt-3 block text-sm">
          O que o cartão deve mostrar
          <textarea
            value={draftBrief}
            onChange={(e) => setDraftBrief(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
          />
        </label>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {INDICATOR_IDEAS.map((idea) => (
            <button
              key={idea.name}
              type="button"
              className="rounded-xl border border-[#E5E7EB] p-3 text-left text-sm hover:bg-[#F9FAFB]"
              onClick={() => {
                setDraftName(idea.name);
                setDraftBrief(idea.brief);
              }}
            >
              <span className="font-medium">{idea.name}</span>
              <span className="mt-1 block text-[#6B7280]">{idea.brief}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="button" disabled={!customReady(draftName, draftBrief)} onClick={saveCustom}>
            Guardar indicador
          </Button>
          <Button type="button" variant="outline" onClick={() => setCustomOpen(false)}>
            Cancelar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function CardBody({
  item,
  wonCount,
  wonValue,
  lostCount,
  lostValue,
  series,
  people,
  openCount,
  openValue,
  compare,
  forecast,
}: {
  item: IndicatorDef;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  lostValue: number;
  series: { day: string; valor: number }[];
  people: { name: string; valor: number }[];
  openCount: number;
  openValue: number;
  compare: boolean;
  forecast: number;
}) {
  if (item.kind === 'note') {
    return <p className="text-sm text-[#6B7280]">{item.summary}</p>;
  }
  if (item.kind === 'split') {
    return (
      <ul className="space-y-1 text-sm text-[#6B7280]">
        <li>Faixa alta: 0</li>
        <li>Faixa média: 0</li>
        <li>Faixa baixa: 0</li>
        <li className="pt-2 text-xs">{item.summary}</li>
      </ul>
    );
  }
  if (item.kind === 'series') {
    const today = series.at(-1)?.valor ?? 0;
    return (
      <div>
        <div className="mb-2 text-lg font-semibold tabular-nums">{brl(wonValue)}</div>
        <div className="mb-2 text-xs text-[#6B7280]">Último dia da série {brl(today)}</div>
        {compare ? <div className="mb-2 text-xs text-[#6B7280]">Previsão já calculada: {brl(forecast)}</div> : null}
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            {item.id === 'por-dia' ? (
              <BarChart data={series}>
                <XAxis dataKey="day" hide />
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="valor" fill="#111827" barSize={6} />
              </BarChart>
            ) : (
              <LineChart data={series}>
                <XAxis dataKey="day" hide />
                <Tooltip contentStyle={TIP} />
                <Line dataKey="valor" stroke="#111827" dot={false} strokeWidth={2} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
  if (item.kind === 'people') {
    return (
      <div className="h-36">
        {people.length === 0 ? (
          <p className="text-sm text-[#6B7280]">Ninguém com valor neste recorte.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={people}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TIP} />
              <Bar dataKey="valor" fill="#111827" barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }
  if (item.kind === 'open') {
    return (
      <p className="text-lg font-semibold tabular-nums">
        {openCount}
        {openValue > 0 ? <span className="ml-2 text-sm font-normal text-[#6B7280]">{brl(openValue)}</span> : null}
      </p>
    );
  }
  const count = item.id === 'perdidos' ? lostCount : wonCount;
  const value = item.id === 'perdidos' ? lostValue : wonValue;
  return (
    <div>
      <div className="text-3xl font-semibold tabular-nums">{count}</div>
      <p className="text-sm text-[#6B7280]">{item.id === 'pedidos' && count === 0 ? 'Ninguém comprou neste mês.' : brl(value)}</p>
    </div>
  );
}
