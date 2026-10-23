import { STORAGE_KEYS } from './constants.ts';

export type IndicatorStage = 'entrada' | 'retorno' | 'crescimento';
export type IndicatorKind = 'total' | 'series' | 'people' | 'split' | 'open' | 'note';

export interface IndicatorDef {
  id: string;
  title: string;
  summary: string;
  section: string;
  stages: readonly IndicatorStage[];
  kind: IndicatorKind;
}

export const STAGE_LABEL: Record<IndicatorStage, string> = {
  entrada: 'Entrada',
  retorno: 'Retorno',
  crescimento: 'Crescimento',
};

export const INDICATORS: readonly IndicatorDef[] = [
  {
    id: 'carteira',
    title: 'Carteira no período',
    summary: 'Quantos negócios foram ganhos. A separação entre ativo, parado e prospect não está nesta consulta.',
    section: 'Carteira',
    stages: ['retorno'],
    kind: 'total',
  },
  {
    id: 'concentracao',
    title: 'Concentração de clientes',
    summary: 'Três faixas de participação. Suposição: a base não classifica essas faixas, então elas ficam em zero.',
    section: 'Carteira',
    stages: ['retorno'],
    kind: 'split',
  },
  {
    id: 'pedidos',
    title: 'Quem comprou no mês',
    summary: 'Negócios ganhos no mês escolhido. Em zero, o painel diz que ninguém comprou.',
    section: 'Movimento',
    stages: ['entrada', 'retorno'],
    kind: 'total',
  },
  {
    id: 'evolucao',
    title: 'Evolução do valor',
    summary: 'Valor ganho em cada dia do mês, com o total e a previsão já calculada no dashboard.',
    section: 'Vendas',
    stages: ['crescimento'],
    kind: 'series',
  },
  {
    id: 'por-dia',
    title: 'Valor por dia',
    summary: 'O mesmo recorte diário, em barras.',
    section: 'Vendas',
    stages: ['crescimento'],
    kind: 'series',
  },
  {
    id: 'por-pessoa',
    title: 'Valor por pessoa',
    summary: 'Compara o valor ganho de cada pessoa no mês.',
    section: 'Vendas',
    stages: ['crescimento'],
    kind: 'people',
  },
  {
    id: 'total-periodo',
    title: 'Valor do período',
    summary: 'Soma do que foi ganho no mês.',
    section: 'Vendas',
    stages: ['crescimento'],
    kind: 'total',
  },
  {
    id: 'perdidos',
    title: 'Negócios perdidos',
    summary: 'Quantidade e valor marcados como perdidos no mês.',
    section: 'Movimento',
    stages: ['entrada'],
    kind: 'total',
  },
  {
    id: 'funil',
    title: 'Negócios ainda abertos',
    summary: 'Contagem e valor em aberto que o dashboard já projeta.',
    section: 'Movimento',
    stages: ['entrada', 'crescimento'],
    kind: 'open',
  },
  {
    id: 'atividades',
    title: 'Volume de respostas',
    summary: 'Quantas primeiras respostas entraram na média do período.',
    section: 'Atividades',
    stages: ['entrada', 'retorno', 'crescimento'],
    kind: 'open',
  },
  {
    id: 'por-estado',
    title: 'Valor por estado',
    summary: 'Suposição: não há estado gravado nos negócios, então o cartão não desenha mapa.',
    section: 'Vendas',
    stages: ['crescimento'],
    kind: 'note',
  },
  {
    id: 'por-produto',
    title: 'Valor por produto',
    summary: 'Suposição: este painel não lê a linha de produto da venda.',
    section: 'Vendas',
    stages: ['crescimento'],
    kind: 'note',
  },
];

export const DEFAULT_PINNED = ['evolucao', 'carteira', 'pedidos', 'concentracao'] as const;

export interface CustomIndicator {
  id: string;
  name: string;
  brief: string;
}

export interface BoardState {
  pinnedIds: string[];
  custom: CustomIndicator[];
}

export interface IndicatorIdea {
  name: string;
  brief: string;
}

export const INDICATOR_IDEAS: readonly IndicatorIdea[] = [
  {
    name: 'Comparar anos',
    brief: 'Mostrar o valor ganho deste mês ao lado do mesmo mês no ano anterior.',
  },
  {
    name: 'Quem mais comprou',
    brief: 'Listar as contas com maior valor ganho nos últimos três meses.',
  },
  {
    name: 'Quem ficou parado',
    brief: 'Listar pessoas do time sem negócio ganho nos últimos trinta dias.',
  },
  {
    name: 'Andamento dos pedidos',
    brief: 'Agrupar os negócios abertos pela etapa atual do funil.',
  },
];

const catalogIds = new Set(INDICATORS.map((item) => item.id));

export function filterIndicators(query: string, stage: IndicatorStage | 'todos'): IndicatorDef[] {
  const needle = query.trim().toLocaleLowerCase('pt-BR');
  return INDICATORS.filter((item) => {
    if (stage !== 'todos' && !item.stages.includes(stage)) return false;
    if (!needle) return true;
    return (
      item.title.toLocaleLowerCase('pt-BR').includes(needle) ||
      item.summary.toLocaleLowerCase('pt-BR').includes(needle)
    );
  });
}

export function monthPeriod(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59);
  return { from, to };
}

export function emptyBoard(): BoardState {
  return { pinnedIds: [...DEFAULT_PINNED], custom: [] };
}

export function readBoard(storage: Pick<Storage, 'getItem'> | null): BoardState {
  if (!storage) return emptyBoard();
  const raw = storage.getItem(STORAGE_KEYS.indicatorBoard);
  if (!raw) return emptyBoard();
  try {
    const parsed = JSON.parse(raw) as Partial<BoardState>;
    const pinnedIds = Array.isArray(parsed.pinnedIds)
      ? parsed.pinnedIds.filter((id): id is string => typeof id === 'string' && catalogIds.has(id))
      : [...DEFAULT_PINNED];
    const custom = Array.isArray(parsed.custom)
      ? parsed.custom.filter(
          (item): item is CustomIndicator =>
            !!item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            item.name.trim().length > 0 &&
            typeof item.brief === 'string',
        )
      : [];
    return { pinnedIds, custom };
  } catch {
    return emptyBoard();
  }
}

export function writeBoard(storage: Pick<Storage, 'setItem'>, board: BoardState): void {
  storage.setItem(STORAGE_KEYS.indicatorBoard, JSON.stringify(board));
}

export function pinIndicator(board: BoardState, id: string): BoardState {
  if (!catalogIds.has(id) || board.pinnedIds.includes(id)) return board;
  return { ...board, pinnedIds: [...board.pinnedIds, id] };
}

export function unpinIndicator(board: BoardState, id: string): BoardState {
  return { ...board, pinnedIds: board.pinnedIds.filter((item) => item !== id) };
}

export function customReady(name: string, brief: string): boolean {
  return name.trim().length > 0 && brief.trim().length > 0;
}

export function addCustomIndicator(board: BoardState, name: string, brief: string, id: string): BoardState {
  if (!customReady(name, brief)) return board;
  return {
    ...board,
    custom: [...board.custom, { id, name: name.trim(), brief: brief.trim() }],
  };
}

export function removeCustomIndicator(board: BoardState, id: string): BoardState {
  return { ...board, custom: board.custom.filter((item) => item.id !== id) };
}
