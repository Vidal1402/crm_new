import { storyBoardRows } from './mock/story.ts';

export type BoardMode = 'comercial' | 'atendimento' | 'tarefas';

export type BoardOutcome = 'entered' | 'won' | 'lost' | 'open';

export interface BoardRow {
  id: string;
  mode: BoardMode;
  contact: string;
  kind: string;
  product: string;
  activity: string;
  owner: string;
  stage: string;
  occurredOn: string;
  value: number;
  outcome: BoardOutcome;
}

export interface BoardWindow {
  from: string;
  to: string;
}

export interface BoardCard {
  key: 'entered' | 'won' | 'lost' | 'open' | 'total';
  value: number;
  count: number;
}

export type BoardFocus = BoardOutcome | 'total';

export interface BoardSnapshot {
  cards: BoardCard[];
  days: { day: string; value: number; count: number }[];
  owners: { name: string; value: number; count: number; share: number }[];
  products: { name: string; value: number; count: number }[];
  rows: BoardRow[];
}

function shift(today: Date, days: number): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
}

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function defaultWindow(today: Date): BoardWindow {
  return { from: dayKey(shift(today, -7)), to: dayKey(shift(today, 0)) };
}

function eachDay(window: BoardWindow): string[] {
  const [year, month, day] = window.from.split('-').map(Number);
  const cursor = new Date(year, month - 1, day);
  const days: string[] = [];
  while (dayKey(cursor) <= window.to) {
    days.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function sum(rows: BoardRow[]): BoardCard['value'] {
  return rows.reduce((total, row) => total + row.value, 0);
}

export function buildSnapshot(
  rows: BoardRow[],
  mode: BoardMode,
  window: BoardWindow,
  focus: BoardFocus = 'total',
): BoardSnapshot {
  const selected = rows
    .filter((row) => row.mode === mode && row.occurredOn >= window.from && row.occurredOn <= window.to)
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || a.id.localeCompare(b.id));
  const of = (outcome: BoardOutcome) => selected.filter((row) => row.outcome === outcome);
  const cards: BoardCard[] = [
    { key: 'entered', value: sum(of('entered')), count: of('entered').length },
    { key: 'won', value: sum(of('won')), count: of('won').length },
    { key: 'lost', value: sum(of('lost')), count: of('lost').length },
    { key: 'open', value: sum(of('open')), count: of('open').length },
    { key: 'total', value: sum(selected), count: selected.length },
  ];
  const visible = focus === 'total' ? selected : of(focus);
  const ranked = focus === 'total' ? of('won') : visible;
  const byDay = new Map<string, { value: number; count: number }>();
  for (const row of visible) {
    const current = byDay.get(row.occurredOn) ?? { value: 0, count: 0 };
    current.value += row.value;
    current.count += 1;
    byDay.set(row.occurredOn, current);
  }
  const days = eachDay(window).map((day) => ({ day, value: byDay.get(day)?.value ?? 0, count: byDay.get(day)?.count ?? 0 }));
  const rankedValue = sum(ranked);
  const ownerValue = new Map<string, { value: number; count: number }>();
  for (const row of ranked) {
    const current = ownerValue.get(row.owner) ?? { value: 0, count: 0 };
    current.value += row.value;
    current.count += 1;
    ownerValue.set(row.owner, current);
  }
  const owners = [...ownerValue.entries()]
    .map(([name, item]) => ({
      name,
      ...item,
      share: rankedValue === 0 ? 0 : Math.round((item.value / rankedValue) * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  const productValue = new Map<string, { value: number; count: number }>();
  for (const row of ranked) {
    const current = productValue.get(row.product) ?? { value: 0, count: 0 };
    current.value += row.value;
    current.count += 1;
    productValue.set(row.product, current);
  }
  const products = [...productValue.entries()]
    .map(([name, item]) => ({ name, ...item }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  return { cards, days, owners, products, rows: visible };
}

export function sampleRows(today: Date): BoardRow[] {
  return storyBoardRows(today);
}
