import { storyModuleData } from './story.ts';

const STORY = storyModuleData();

export const MOCK_PERIODS = ['Hoje', '7 dias', '15 dias', 'Este mês', 'Mês anterior'] as const;

export const MOCK_FUNIS = ['Outbound SP', 'Inbound Nacional', 'Enterprise', 'Parcerias'] as const;

export const PERIOD_FACTOR: Record<(typeof MOCK_PERIODS)[number], number> = {
  Hoje: 0.06,
  '7 dias': 0.28,
  '15 dias': 0.52,
  'Este mês': 1,
  'Mês anterior': 0.91,
};

export function scaleInt(n: number, period: string) {
  const f = PERIOD_FACTOR[period as (typeof MOCK_PERIODS)[number]] ?? 1;
  return Math.max(0, Math.round(n * f));
}

export function brInt(n: number) {
  return n.toLocaleString('pt-BR');
}

export const MOCK_KPI_BASE = STORY.kpis;

export const MOCK_TOUCHPOINTS = STORY.touches;

export const MOCK_VOLUME = STORY.volume;

export type TeamMember = {
  name: string;
  role: string;
  team: string;
  funnel: (typeof MOCK_FUNIS)[number];
  esteira: number;
  trabalhadas: number;
  qualificadas: number;
  agendadas: number;
  negociacoes: number;
  vendas: number;
  notion: number;
  perdidos: number;
  meta: number;
};

export const MOCK_TEAM: TeamMember[] = STORY.team;

export const MOCK_TEAMS = MOCK_FUNIS.map((funnel) => {
  const members = MOCK_TEAM.filter((member) => member.funnel === funnel);
  const sum = (key: keyof TeamMember) => members.reduce((total, member) => total + (typeof member[key] === 'number' ? (member[key] as number) : 0), 0);
  return {
    name: `Time ${funnel}`,
    funnel,
    members: members.length,
    esteira: sum('esteira'),
    vendas: sum('vendas'),
    agendadas: sum('agendadas'),
    perdidos: sum('perdidos'),
    meta: members.length ? Math.round(sum('meta') / members.length) : 0,
  };
});

export type MeetingStatus = 'Confirmada' | 'Pendente' | 'Pipeline';

export const MOCK_MEETINGS: { id: string; time: string; date: number; title: string; who: string; funnel: (typeof MOCK_FUNIS)[number]; status: MeetingStatus }[] = STORY.meetings;

export type LeadRow = {
  name: string;
  city: string;
  address: string;
  funnel: (typeof MOCK_FUNIS)[number];
  list: string;
  instagram: string;
  whatsapp: string;
  email: string;
  score: number;
  enriched: boolean;
};

export const MOCK_LEADS_SEED: LeadRow[] = STORY.leads;

export const MOCK_LISTS_SEED = STORY.lists;

export const MOCK_HEAT_ZONES = STORY.heat;

export const MOCK_TASKS = STORY.tasks;

export const MOCK_CADENCE_STEPS = ['D1 toque', 'D2 valor', 'D3 follow-up', 'D5 prova', 'D7 breakup'];

export const MOCK_CADENCE = STORY.cadence;

export const MOCK_KANBAN = STORY.kanban;

export const MOCK_PIE = STORY.pie;

export const MOCK_GOALS = STORY.goals;

export const MOCK_MONTH_RANKING = STORY.months;

export const MOCK_FUNNEL_OPS = STORY.funnels;

export const MOCK_CHATS = STORY.chats;

export const MOCK_THREADS: Record<string, { from: 'them' | 'us'; text: string }[]> = STORY.threads;

export const MOCK_CALENDAR_KPI = STORY.calendarKpi;

export const MOCK_WEEK_DAYS = STORY.week;

export const MOCK_PROFILES = [
  { id: 'admin', label: 'Admin (todos os funis)', funnels: [...MOCK_FUNIS] },
  { id: 'sdr', label: 'SDR — Outbound SP', funnels: ['Outbound SP'] as const },
  { id: 'closer', label: 'Closer — Enterprise', funnels: ['Enterprise'] as const },
  { id: 'hunter', label: 'Hunter — Inbound Nacional', funnels: ['Inbound Nacional'] as const },
];

export const MOCK_PLAYBOOKS = [
  {
    funnel: 'Outbound SP',
    owner: 'Bruno Lima',
    sections: [
      { title: 'ICP e territórios', body: 'Clínicas e academias na Grande SP com 8+ unidades. Território: zona sul e Campinas.' },
      { title: 'Script de ligação D1', body: 'Abertura em 12s, gancho de volume de leads e CTA de 15 min no calendário.' },
      { title: 'Objeções de preço', body: 'Ancorar no CAC atual. Oferecer piloto de 30 dias no Outbound SP.' },
      { title: 'Handoff SDR → Closer', body: 'Notas no funil e um áudio curto no WhatsApp interno.' },
    ],
  },
  {
    funnel: 'Inbound Nacional',
    owner: 'Elena Rocha',
    sections: [
      { title: 'SLA de 5 minutos', body: 'Todo lead de formulário entra na fila de WhatsApp em até 5 min úteis.' },
      { title: 'Qualificação', body: 'Orçamento, autoridade, necessidade e prazo no card do funil.' },
      { title: 'WhatsApp na janela de 24h', body: 'Usar modelo aprovado fora da janela. Sem texto livre depois de 24h.' },
      { title: 'Agendamento', body: 'Quem fecha recebe o evento com a origem da lista.' },
    ],
  },
  {
    funnel: 'Enterprise',
    owner: 'Ana Souza',
    sections: [
      { title: 'Vários interlocutores', body: 'Mapear quatro pessoas: quem defende, financeiro, operação e tecnologia.' },
      { title: 'Mapa de influência', body: 'Atualizar poder e interesse a cada reunião.' },
      { title: 'Conta de retorno', body: 'Leads vezes conversão vezes ticket, menos o custo atual.' },
      { title: 'Comitê de compra', body: 'Nove slides. Decisão em no máximo duas reuniões.' },
    ],
  },
  {
    funnel: 'Parcerias',
    owner: 'Carla Mendes',
    sections: [
      { title: 'Acordo de indicação', body: 'Divisão 20/80 nos 12 primeiros meses.' },
      { title: 'Ação conjunta', body: 'Um encontro mensal e a lista compartilhada.' },
      { title: 'Divisão da receita', body: 'Repasse no dia 10.' },
      { title: 'Revisão trimestral', body: 'Volume indicado, qualidade e cancelamento.' },
    ],
  },
];
