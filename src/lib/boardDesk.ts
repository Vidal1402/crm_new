import { STORY_ACCOUNTS, STORY_PEOPLE, storyDay, storyOwnerName } from './mock/story.ts';

/** Colunas do quadro. Nomes nossos; a ordem segue um funil de seis passos. */
export const DESK_STAGES = [
  { key: 'entrada', name: 'Entrada', tone: '#6B7280' },
  { key: 'estudo', name: 'Estudo', tone: '#111827' },
  { key: 'oferta', name: 'Oferta', tone: '#22C55E' },
  { key: 'acordo', name: 'Acordo', tone: '#F59E0B' },
  { key: 'ganho', name: 'Ganho', tone: '#16A34A' },
  { key: 'perdido', name: 'Perdido', tone: '#DC2626' },
] as const;

const STAGE_OF: Record<string, string> = {
  Novo: 'entrada',
  Qualificando: 'estudo',
  Agendado: 'oferta',
  'Negociação': 'acordo',
  Ganho: 'ganho',
  Perdido: 'perdido',
};

export interface DeskBoard {
  id: string;
  name: string;
  description: string;
  group: string;
}

export interface DeskCard {
  id: string;
  boardId: string;
  stageKey: string;
  title: string;
  contact: string;
  owner: string;
  product: string;
  value: number;
  status: 'open' | 'won' | 'lost';
  occurredOn: string;
  tag: string;
}

export interface DeskState {
  groups: string[];
  boards: DeskBoard[];
  cards: DeskCard[];
}

export type DeskSort = 'recent' | 'value' | 'name';
export type DeskRange = 'year' | 'month' | 'all';

export interface DeskQuery {
  text: string;
  sort: DeskSort;
  range: DeskRange;
  owner: string;
  product: string;
  status: '' | 'open' | 'won' | 'lost';
  tag: string;
  min: string;
  max: string;
}

export const EMPTY_DESK_QUERY: DeskQuery = {
  text: '',
  sort: 'recent',
  range: 'year',
  owner: '',
  product: '',
  status: '',
  tag: '',
  min: '',
  max: '',
};

function stagesFor(boardId: string) {
  return DESK_STAGES.map((stage) => ({ ...stage, id: `${boardId}-${stage.key}` }));
}

export function stageId(boardId: string, key: string): string {
  return `${boardId}-${key}`;
}

export function createDesk(today: Date): DeskState {
  const boards: DeskBoard[] = [
    {
      id: 'desk-captacao',
      name: 'Captação de contas',
      description: 'Novas contas até o fechamento',
      group: 'Comercial',
    },
    {
      id: 'desk-parcerias',
      name: 'Parcerias em curso',
      description: 'Acordos com quem indica',
      group: 'Comercial',
    },
    {
      id: 'desk-entrega',
      name: 'Acompanhamento',
      description: 'O que já foi vendido e precisa de entrega',
      group: 'Entrega',
    },
    {
      id: 'desk-pauta',
      name: 'Pauta do mês',
      description: 'Peças e datas de conteúdo',
      group: 'Conteúdo',
    },
  ];
  const cards: DeskCard[] = STORY_ACCOUNTS.map((account) => ({
    id: `story-deal-${account.id}`,
    boardId: 'desk-captacao',
    stageKey: STAGE_OF[account.stage] ?? 'entrada',
    title: account.product,
    contact: account.person,
    owner: storyOwnerName(account.ownerId) ?? 'Sem dono',
    product: account.product,
    value: account.value,
    status: account.outcome === 'won' || account.outcome === 'lost' ? account.outcome : 'open',
    occurredOn: storyDay(today, account.dayOffset),
    tag: account.kind,
  }));
  return { groups: ['Comercial', 'Entrega', 'Conteúdo'], boards, cards };
}

export function deskStages(boardId: string) {
  return stagesFor(boardId);
}

function inRange(day: string, range: DeskRange, today: Date): boolean {
  if (range === 'all') return true;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (range === 'month') start.setDate(1);
  else start.setFullYear(start.getFullYear() - 1);
  const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return day >= iso && day <= storyDay(today, 0);
}

/** Cartões visíveis de um funil. Suposição: "último ano" é 365 dias e a soma da coluna é a soma dos cartões visíveis. */
export function visibleCards(cards: DeskCard[], boardId: string, query: DeskQuery, today: Date): DeskCard[] {
  const text = query.text.trim().toLowerCase();
  const min = query.min.trim() === '' ? null : Number(query.min);
  const max = query.max.trim() === '' ? null : Number(query.max);
  const rows = cards.filter((card) => {
    if (card.boardId !== boardId) return false;
    if (!inRange(card.occurredOn, query.range, today)) return false;
    if (query.owner && card.owner !== query.owner) return false;
    if (query.product && card.product !== query.product) return false;
    if (query.status && card.status !== query.status) return false;
    if (query.tag && card.tag !== query.tag) return false;
    if (min != null && !Number.isNaN(min) && card.value < min) return false;
    if (max != null && !Number.isNaN(max) && card.value > max) return false;
    if (!text) return true;
    return `${card.title} ${card.contact} ${card.product} ${card.owner}`.toLowerCase().includes(text);
  });
  const sorted = [...rows];
  if (query.sort === 'value') sorted.sort((a, b) => b.value - a.value);
  else if (query.sort === 'name') sorted.sort((a, b) => a.contact.localeCompare(b.contact, 'pt-BR'));
  else sorted.sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1));
  return sorted;
}

export function columnTotal(cards: DeskCard[]): number {
  return cards.reduce((sum, card) => sum + card.value, 0);
}

export function deskOwners(): string[] {
  return STORY_PEOPLE.map((person) => person.name);
}

export function deskProducts(cards: DeskCard[]): string[] {
  return [...new Set(cards.map((card) => card.product))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
