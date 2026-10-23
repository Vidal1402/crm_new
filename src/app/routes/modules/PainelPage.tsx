import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarRange, Download, Plus, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { brl } from '@/lib/dashboard';
import { STORAGE_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  buildSnapshot,
  defaultWindow,
  sampleRows,
  type BoardCard,
  type BoardFocus,
  type BoardMode,
  type BoardWindow,
} from '@/lib/periodBoard';

const MODES: { id: BoardMode; label: string }[] = [
  { id: 'comercial', label: 'Comercial' },
  { id: 'atendimento', label: 'Atendimento' },
  { id: 'tarefas', label: 'Tarefas' },
];

const CARDS: { key: BoardFocus; label: string; icon: typeof Plus; tone: string }[] = [
  { key: 'entered', label: 'Entraram', icon: Plus, tone: 'text-[#111827]' },
  { key: 'won', label: 'Ganhos', icon: TrendingUp, tone: 'text-[#16A34A]' },
  { key: 'lost', label: 'Perdidos', icon: TrendingDown, tone: 'text-[#DC2626]' },
  { key: 'open', label: 'Em andamento', icon: Activity, tone: 'text-[#6B7280]' },
  { key: 'total', label: 'No período', icon: BarChart3, tone: 'text-[#111827]' },
];

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const TIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 };

function shortDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

function longDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

export default function PainelPage() {
  const [today] = useState(() => new Date());
  const rows = useMemo(() => sampleRows(today), [today]);
  const [period, setPeriod] = useState<BoardWindow>(() => defaultWindow(new Date()));
  const [mode, setMode] = useState<BoardMode>('comercial');
  const [focus, setFocus] = useState<BoardFocus>('entered');
  const [metric, setMetric] = useState<'value' | 'count'>('value');
  const [guide, setGuide] = useState(() => localStorage.getItem(STORAGE_KEYS.periodBoardNotice) !== '1');
  const snap = useMemo(() => buildSnapshot(rows, mode, period, focus), [rows, mode, period, focus]);
  const showValue = metric === 'value';

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-[#111827]">Painel</h1>
          <p className="text-sm text-[#6B7280]">Resumo do período. Os números são um exemplo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827]">
            <CalendarRange className="h-4 w-4 text-[#6B7280]" />
            <input
              type="date"
              aria-label="Início"
              value={period.from}
              onChange={(event) => setPeriod((current) => ({ ...current, from: event.target.value }))}
              className="bg-transparent outline-none"
            />
            <span className="text-[#9CA3AF]">–</span>
            <input
              type="date"
              aria-label="Fim"
              value={period.to}
              onChange={(event) => setPeriod((current) => ({ ...current, to: event.target.value }))}
              className="bg-transparent outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#111827]"
          >
            <Download className="h-4 w-4" />
            Exportar visão
          </button>
          <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={cn(
                  'h-10 px-3 text-sm font-medium',
                  mode === item.id ? 'bg-[#111827] text-white' : 'text-[#374151] hover:bg-[#F9FAFB]',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <p className="text-xs text-[#6B7280]">
        Suposição: oito dias na abertura, porque foi o intervalo da tela. O cartão marcado filtra o gráfico, as listas e a
        tabela. Com “No período”, pessoas e produtos continuam só com o que foi ganho. Exportar imprime a página.
      </p>

      {guide ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-[#4B5563]">
          <span>
            Período de {longDay(period.from)} a {longDay(period.to)}.
          </span>
          <button
            type="button"
            className="font-medium text-[#166534]"
            onClick={() => {
              localStorage.setItem(STORAGE_KEYS.periodBoardNotice, '1');
              setGuide(false);
            }}
          >
            Não mostrar de novo
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {CARDS.map((item) => {
          const card = snap.cards.find((entry) => entry.key === item.key) as BoardCard;
          const Icon = item.icon;
          const selected = focus === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFocus(item.key)}
              className={cn(
                'flex items-start justify-between rounded-xl bg-white px-4 py-4 text-left shadow-[0_1px_2px_rgba(17,24,39,0.04)]',
                selected ? 'border-2 border-[#111827]' : 'border border-[#E5E7EB]',
              )}
            >
              <span>
                <span className="block text-sm text-[#6B7280]">{item.label}</span>
                <span className="mt-3 block text-[1.65rem] font-semibold leading-none tabular-nums text-[#111827]">
                  {brl(card.value)}
                </span>
                <span className="mt-2 block text-xs text-[#9CA3AF]">{card.count} registros</span>
              </span>
              <Icon className={cn('mt-6 h-5 w-5', item.tone)} />
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        <section className="min-h-[360px] rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <PanelHead title="Por dia" metric={metric} onMetric={setMetric} />
          <div className="mt-2 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snap.days.map((day) => ({ ...day, label: shortDay(day.day) }))} margin={{ left: 8, right: 8, top: 12 }}>
                <CartesianGrid stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(value) => (showValue ? brl(Number(value)) : String(value))}
                />
                <Tooltip contentStyle={TIP} formatter={(value) => (showValue ? brl(Number(value)) : String(value))} />
                <Line type="monotone" dataKey={showValue ? 'value' : 'count'} stroke="#111827" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="flex min-h-[360px] flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <PanelHead title="Parte de cada pessoa" metric={metric} onMetric={setMetric} />
          <RankList
            empty={snap.owners.length === 0}
            rows={snap.owners.map((owner) => ({
              name: owner.name,
              label: showValue ? `${owner.share}%` : String(owner.count),
            }))}
          />
        </section>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="flex min-h-[220px] flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <h2 className="text-sm font-semibold text-[#111827]">Produtos que mais pesam</h2>
          <RankList
            empty={snap.products.length === 0}
            rows={snap.products.map((product) => ({
              name: product.name,
              label: showValue ? brl(product.value) : String(product.count),
            }))}
          />
        </section>
        <section className="flex min-h-[220px] flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <h2 className="text-sm font-semibold text-[#111827]">Pessoas que mais fecharam</h2>
          <RankList
            empty={snap.owners.length === 0}
            rows={snap.owners.map((owner) => ({
              name: owner.name,
              label: showValue ? brl(owner.value) : String(owner.count),
            }))}
          />
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-center text-[13px] text-[#9CA3AF]">
            <tr>
              {['Contato', 'Tipo', 'Produto', 'Atividade', 'Responsável', 'Etapa', 'Data'].map((label) => (
                <th key={label} className="px-3 py-3 font-normal">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snap.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="border-t border-[#F3F4F6] px-3 py-4 text-center text-sm text-[#111827]">
                  Nada neste recorte.
                </td>
              </tr>
            ) : (
              snap.rows.map((row) => (
                <tr key={row.id} className="border-t border-[#F3F4F6] text-[#374151]">
                  <td className="px-3 py-3 text-left">{row.contact}</td>
                  <td className="px-3 py-3 text-center">{row.kind}</td>
                  <td className="px-3 py-3 text-center">{row.product}</td>
                  <td className="px-3 py-3 text-center">{row.activity}</td>
                  <td className="px-3 py-3 text-center">{row.owner}</td>
                  <td className="px-3 py-3 text-center">{row.stage}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{shortDay(row.occurredOn)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function PanelHead({
  title,
  metric,
  onMetric,
}: {
  title: string;
  metric: 'value' | 'count';
  onMetric: (metric: 'value' | 'count') => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-[#111827]">{title}</h2>
        <p className="text-xs text-[#9CA3AF]">{metric === 'value' ? 'Pelo valor' : 'Pela quantidade'}</p>
      </div>
      <select
        aria-label={`Medida de ${title}`}
        value={metric}
        onChange={(event) => onMetric(event.target.value as 'value' | 'count')}
        className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-xs text-[#374151]"
      >
        <option value="value">Valor</option>
        <option value="count">Quantidade</option>
      </select>
    </div>
  );
}

function RankList({ rows, empty }: { rows: { name: string; label: string }[]; empty: boolean }) {
  if (empty) {
    return <p className="grid flex-1 place-items-center text-sm text-[#374151]">Nada neste recorte.</p>;
  }
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.name} className="flex items-center justify-between text-sm text-[#111827]">
          <span>{row.name}</span>
          <span className="tabular-nums text-[#4B5563]">{row.label}</span>
        </li>
      ))}
    </ul>
  );
}
