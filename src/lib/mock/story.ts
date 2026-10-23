import { classifyAccount, tallyAccounts, type AccountView } from '../accountBook.ts';
import type { Campaign } from '../../types/campaigns.ts';
import type { Deal, Pipeline, Stage, Temperature } from '../../types/crm.ts';
import type { Template } from '../../types/templates.ts';
import type { ContactWithTags } from '../../types/db.ts';
import type { ConversationWithContact, Message } from '../../types/inbox.ts';

export type StoryFunnel = 'Outbound SP' | 'Inbound Nacional' | 'Enterprise' | 'Parcerias';
export type StoryOutcome = 'entered' | 'won' | 'lost' | 'open';

export interface StoryPerson {
  id: string;
  name: string;
  role: string;
  team: string;
  funnel: StoryFunnel;
}

export interface StoryLine {
  from: 'them' | 'us';
  text: string;
}

export interface StoryAccount {
  id: string;
  company: string;
  person: string;
  city: string;
  address: string;
  funnel: StoryFunnel;
  list: string;
  instagram: string;
  phone: string;
  email: string;
  cnpj: string;
  score: number;
  enriched: boolean;
  kind: 'lead' | 'cliente';
  ownerId: string;
  product: string;
  value: number;
  stage: 'Novo' | 'Qualificando' | 'Agendado' | 'Negociação' | 'Ganho' | 'Perdido';
  outcome: StoryOutcome;
  dayOffset: number;
  updatedOffset: number;
  activity: string;
  channel: 'whatsapp' | 'instagram' | null;
  traffic: 'organico' | 'pago' | 'manual';
  origin: string;
  campaign: string | null;
  content: string | null;
  lostReason: string | null;
  temperature: Temperature;
  responseHours: number;
  chat?: {
    channelLabel: 'WhatsApp' | 'Instagram' | 'E-mail';
    preview: string;
    time: string;
    unread: number;
    status: 'Aberta' | 'Pendente' | 'Resolvida';
    lines: StoryLine[];
  };
  meeting?: { time: string; dayOffset: number; title: string; status: 'Confirmada' | 'Pendente' | 'Pipeline' };
  task?: { task: string; type: string; due: string; status: string };
  cadence?: { step: number; status: string };
}

export const STORY_PEOPLE: StoryPerson[] = [
  { id: 'story-ana', name: 'Ana Souza', role: 'Closer', team: 'Enterprise', funnel: 'Enterprise' },
  { id: 'story-bruno', name: 'Bruno Lima', role: 'SDR', team: 'Outbound SP', funnel: 'Outbound SP' },
  { id: 'story-carla', name: 'Carla Mendes', role: 'Closer', team: 'Parcerias', funnel: 'Parcerias' },
  { id: 'story-diego', name: 'Diego Alves', role: 'SDR', team: 'Outbound SP', funnel: 'Outbound SP' },
  { id: 'story-elena', name: 'Elena Rocha', role: 'Hunter', team: 'Inbound Nacional', funnel: 'Inbound Nacional' },
];

export const STORY_ACCOUNTS: StoryAccount[] = [
  {
    id: 'aurora', company: 'Clínica Aurora', person: 'Marina Costa', city: 'São Paulo — Jardins', address: 'Rua Augusta, 2100',
    funnel: 'Inbound Nacional', list: 'Clínicas SP — Out 26', instagram: '@clinicaaurora', phone: '+55 11 98888-1200',
    email: 'contato@aurora.example', cnpj: '00.000.000/0001-91', score: 92, enriched: true, kind: 'cliente', ownerId: 'story-elena',
    product: 'Plano anual', value: 4800, stage: 'Ganho', outcome: 'won', dayOffset: -1, updatedOffset: -1, activity: 'Proposta',
    channel: 'whatsapp', traffic: 'organico', origin: 'instagram', campaign: null, content: 'Post carrossel', lostReason: null,
    temperature: 'Quente', responseHours: 1,
    chat: { channelLabel: 'WhatsApp', preview: 'Fechamos o plano anual. Preciso da nota.', time: '09:15', unread: 0, status: 'Resolvida', lines: [
      { from: 'them', text: 'Marina, da Clínica Aurora. O plano anual fecha este mês?' },
      { from: 'us', text: 'Fecha sim. Mando o resumo de R$ 4.800.' },
      { from: 'them', text: 'Fechamos o plano anual. Preciso da nota.' },
    ] },
    meeting: { time: '09:30', dayOffset: -1, title: 'Fechamento — Clínica Aurora', status: 'Confirmada' },
    task: { task: 'Enviar nota do plano anual', type: 'E-mail', due: 'Hoje 10:00', status: 'Concluída' },
    cadence: { step: 4, status: 'Ativo' },
  },
  {
    id: 'norte', company: 'Studio Norte Fit', person: 'Ricardo Pires', city: 'Campinas — Cambuí', address: 'Av. Norte-Sul, 440',
    funnel: 'Outbound SP', list: 'Clínicas SP — Out 26', instagram: '@nortfit', phone: '+55 19 97777-4411',
    email: 'oi@nortfit.example', cnpj: '00.000.000/0001-82', score: 81, enriched: true, kind: 'lead', ownerId: 'story-bruno',
    product: 'Kit inicial', value: 900, stage: 'Perdido', outcome: 'lost', dayOffset: -2, updatedOffset: -2, activity: 'Visita',
    channel: 'instagram', traffic: 'pago', origin: 'instagram_ads', campaign: 'Outubro clínicas', content: 'Anúncio academia',
    lostReason: 'Preço', temperature: 'Frio', responseHours: 5,
    chat: { channelLabel: 'Instagram', preview: 'O kit inicial ficou acima do que podemos.', time: '13:08', unread: 0, status: 'Pendente', lines: [
      { from: 'them', text: 'Ricardo, do Studio Norte Fit. Vi o anúncio do kit inicial.' },
      { from: 'us', text: 'O kit é R$ 900. Posso mostrar o que entra.' },
      { from: 'them', text: 'O kit inicial ficou acima do que podemos.' },
    ] },
    task: { task: 'Registrar perda por preço', type: 'Ligação', due: 'Ontem 16:00', status: 'Concluída' },
    cadence: { step: 4, status: 'Pausa' },
  },
  {
    id: 'eduka', company: 'Eduka Labs', person: 'Paulo Neri', city: 'São Paulo — Pinheiros', address: 'Rua dos Pinheiros, 750',
    funnel: 'Enterprise', list: 'Edtechs nacionais', instagram: '@edukalabs', phone: '+55 11 97777-3300',
    email: 'leads@eduka.example', cnpj: '00.000.000/0001-73', score: 88, enriched: false, kind: 'cliente', ownerId: 'story-ana',
    product: 'Plano anual', value: 6200, stage: 'Negociação', outcome: 'open', dayOffset: -3, updatedOffset: -3, activity: 'Retorno',
    channel: 'whatsapp', traffic: 'pago', origin: 'google_ads', campaign: 'Edtechs outubro', content: 'Busca plano', lostReason: null,
    temperature: 'Morno', responseHours: 3,
    chat: { channelLabel: 'WhatsApp', preview: 'Paulo pediu o plano anual para o comitê.', time: '11:40', unread: 1, status: 'Aberta', lines: [
      { from: 'them', text: 'Paulo, da Eduka Labs. O plano anual de R$ 6.200 entra no comitê sexta.' },
      { from: 'us', text: 'Ana leva a revisão. Te confirmo o horário.' },
    ] },
    meeting: { time: '11:00', dayOffset: 0, title: 'Comitê — Eduka Labs', status: 'Pendente' },
    task: { task: 'Revisar plano anual da Eduka', type: 'E-mail', due: 'Hoje 11:30', status: 'A fazer' },
    cadence: { step: 2, status: 'Ativo' },
  },
  {
    id: 'odonto', company: 'Odonto Prime', person: 'Lívia Prado', city: 'Santos — Gonzaga', address: 'Av. Ana Costa, 88',
    funnel: 'Inbound Nacional', list: 'Clínicas SP — Out 26', instagram: '', phone: '+55 13 96666-9001',
    email: 'livia@odonto.example', cnpj: '00.000.000/0001-64', score: 74, enriched: false, kind: 'cliente', ownerId: 'story-elena',
    product: 'Kit inicial', value: 1500, stage: 'Agendado', outcome: 'open', dayOffset: -5, updatedOffset: -5, activity: 'Visita',
    channel: 'whatsapp', traffic: 'organico', origin: 'whatsapp', campaign: null, content: 'Indicação', lostReason: null,
    temperature: 'Morno', responseHours: 2,
    meeting: { time: '15:30', dayOffset: 1, title: 'Demo — Odonto Prime', status: 'Confirmada' },
    task: { task: 'Confirmar demo do kit inicial', type: 'WhatsApp', due: 'Amanhã 09:00', status: 'Em andamento' },
    cadence: { step: 1, status: 'Ativo' },
  },
  {
    id: 'fit', company: 'Fit House', person: 'Caio Mello', city: 'São Paulo — Moema', address: 'Av. Ibirapuera, 3103',
    funnel: 'Outbound SP', list: 'Clínicas SP — Out 26', instagram: '', phone: '+55 11 95555-2211',
    email: 'contato@fithouse.example', cnpj: '00.000.000/0001-55', score: 55, enriched: false, kind: 'lead', ownerId: 'story-diego',
    product: 'Kit inicial', value: 400, stage: 'Novo', outcome: 'entered', dayOffset: -4, updatedOffset: -4, activity: 'Cadastro',
    channel: null, traffic: 'manual', origin: 'manual', campaign: null, content: null, lostReason: null,
    temperature: 'Frio', responseHours: 8,
    task: { task: 'Primeira ligação do kit', type: 'Ligação', due: 'Hoje 17:00', status: 'A fazer' },
    cadence: { step: 0, status: 'Ativo' },
  },
  {
    id: 'labs', company: 'Labs.io', person: 'Renata Luz', city: 'São Paulo — Vila Olímpia', address: 'Rua Funchal, 418',
    funnel: 'Enterprise', list: 'Edtechs nacionais', instagram: '@labsio', phone: '+55 11 91111-0002',
    email: 'renata@labs.example', cnpj: '00.000.000/0001-46', score: 79, enriched: true, kind: 'cliente', ownerId: 'story-ana',
    product: 'Plano anual', value: 2100, stage: 'Ganho', outcome: 'won', dayOffset: -6, updatedOffset: -6, activity: 'Proposta',
    channel: 'whatsapp', traffic: 'pago', origin: 'linkedin_ads', campaign: 'Edtechs outubro', content: 'Anúncio Labs', lostReason: null,
    temperature: 'Quente', responseHours: 4,
    task: { task: 'Onboarding do plano anual', type: 'Reunião', due: 'Hoje 15:00', status: 'Em andamento' },
    cadence: { step: 3, status: 'Ativo' },
  },
  {
    id: 'casa', company: 'Casa Verde Imóveis', person: 'Helena Dias', city: 'Guarulhos — Centro', address: 'Rua Timóteo Penteado, 12',
    funnel: 'Parcerias', list: 'Imobiliárias litoral', instagram: '@casaverdeimoveis', phone: '+55 11 94444-3322',
    email: 'helena@casaverde.example', cnpj: '00.000.000/0001-37', score: 67, enriched: true, kind: 'cliente', ownerId: 'story-carla',
    product: 'Implantação', value: 3000, stage: 'Negociação', outcome: 'open', dayOffset: -3, updatedOffset: -3, activity: 'Retorno',
    channel: 'instagram', traffic: 'organico', origin: 'instagram', campaign: null, content: 'Story parceria', lostReason: null,
    temperature: 'Morno', responseHours: 6,
    chat: { channelLabel: 'E-mail', preview: 'Helena quer ajustar a implantação de R$ 3.000.', time: '16:05', unread: 1, status: 'Aberta', lines: [
      { from: 'them', text: 'Helena, da Casa Verde. A implantação de R$ 3.000 precisa de um split.' },
      { from: 'us', text: 'Carla revisa o acordo e te devolve amanhã.' },
    ] },
    meeting: { time: '16:45', dayOffset: -2, title: 'Parceria — Casa Verde Imóveis', status: 'Pipeline' },
    task: { task: 'Reunião da implantação', type: 'Reunião', due: 'Amanhã 16:00', status: 'A fazer' },
    cadence: { step: 3, status: 'Ativo' },
  },
  {
    id: 'hub', company: 'United Hub', person: 'Otávio Lang', city: 'São Paulo — Pinheiros', address: 'Rua Harmonia, 90',
    funnel: 'Enterprise', list: 'Edtechs nacionais', instagram: '@unitedhub', phone: '+55 11 93333-8080',
    email: 'otavio@hub.example', cnpj: '00.000.000/0001-28', score: 90, enriched: true, kind: 'cliente', ownerId: 'story-ana',
    product: 'Plano anual', value: 9000, stage: 'Ganho', outcome: 'won', dayOffset: -20, updatedOffset: -400, activity: 'Proposta',
    channel: 'whatsapp', traffic: 'manual', origin: 'manual', campaign: null, content: null, lostReason: null,
    temperature: 'Quente', responseHours: 2,
  },
];

const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function isStoryId(id: string | null | undefined): boolean {
  return Boolean(id && id.startsWith('story-'));
}

export function storyDate(today: Date, offset: number): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 15, 0, 0, 0);
}

export function storyDay(today: Date, offset: number): string {
  const date = storyDate(today, offset);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function storyOwnerName(ownerId: string | null | undefined): string | null {
  return STORY_PEOPLE.find((person) => person.id === ownerId)?.name ?? null;
}

function personName(ownerId: string): string {
  return storyOwnerName(ownerId) ?? 'Sem responsável';
}

function dealStatus(outcome: StoryOutcome): Deal['status'] {
  if (outcome === 'won') return 'won';
  if (outcome === 'lost') return 'lost';
  return 'open';
}

export function storyBoardRows(today: Date) {
  const comercial = STORY_ACCOUNTS.map((account) => ({
    id: `story-deal-${account.id}`,
    mode: 'comercial' as const,
    contact: account.company,
    kind: account.kind === 'cliente' ? 'Cliente' : 'Prospect',
    product: account.product,
    activity: account.activity,
    owner: personName(account.ownerId),
    stage: account.stage,
    occurredOn: storyDay(today, account.dayOffset),
    value: account.value,
    outcome: account.outcome,
  }));
  const atendimento = STORY_ACCOUNTS.filter((account) => account.chat).map((account) => ({
    id: `story-chat-${account.id}`,
    mode: 'atendimento' as const,
    contact: account.company,
    kind: account.kind === 'cliente' ? 'Cliente' : 'Prospect',
    product: account.product,
    activity: 'Conversa',
    owner: personName(account.ownerId),
    stage: account.chat?.status === 'Resolvida' ? 'Resolvido' : 'Aberto',
    occurredOn: storyDay(today, account.dayOffset),
    value: 0,
    outcome: 'open' as const,
  }));
  const tarefas = STORY_ACCOUNTS.filter((account) => account.task).map((account) => ({
    id: `story-task-${account.id}`,
    mode: 'tarefas' as const,
    contact: account.company,
    kind: account.kind === 'cliente' ? 'Cliente' : 'Prospect',
    product: account.product,
    activity: account.task?.type ?? 'Tarefa',
    owner: personName(account.ownerId),
    stage: account.task?.status ?? 'A fazer',
    occurredOn: storyDay(today, account.dayOffset),
    value: 0,
    outcome: 'entered' as const,
  }));
  return [...comercial, ...atendimento, ...tarefas];
}

function contactOf(account: StoryAccount, today: Date): ContactWithTags {
  const created = storyDate(today, account.dayOffset).toISOString();
  const updated = storyDate(today, account.updatedOffset).toISOString();
  return {
    id: `story-${account.id}`,
    phone: account.phone,
    name: account.company,
    email: account.email,
    kind: account.kind,
    instagram_id: account.instagram || null,
    source: account.channel ?? 'manual',
    first_seen_at: created,
    custom_fields: { contato: account.person, cnpj: account.cnpj, cidade: account.city, empresa: account.company },
    created_at: created,
    updated_at: updated,
    tags: [{ id: `story-tag-${account.funnel}`, name: account.funnel, color: '#111827', created_at: created, updated_at: updated }],
    traffic_type: account.traffic,
  };
}

export function storyContacts(today = new Date()): ContactWithTags[] {
  return STORY_ACCOUNTS.map((account) => contactOf(account, today));
}

export function storyBook(today = new Date()) {
  return tallyAccounts(
    storyContacts(today).map((contact) => ({ kind: contact.kind ?? null, updatedAt: contact.updated_at })),
    today,
  );
}

export function filterStoryContacts(input: {
  search?: string;
  source?: string | null;
  book?: AccountView;
  sort?: 'recent' | 'oldest' | 'name' | 'first_seen';
  page?: number;
  pageSize?: number;
  today?: Date;
}): { contacts: ContactWithTags[]; total: number } {
  const today = input.today ?? new Date();
  const book = input.book ?? 'all';
  const search = (input.search ?? '').trim().toLowerCase();
  let rows = storyContacts(today).filter((contact) => {
    if (book !== 'all' && classifyAccount({ kind: contact.kind ?? null, updatedAt: contact.updated_at }, today) !== book) return false;
    if (input.source && contact.source !== input.source) return false;
    if (!search) return true;
    const bag = `${contact.name ?? ''} ${contact.phone ?? ''} ${contact.email ?? ''} ${String(contact.custom_fields.cnpj ?? '')} ${String(contact.custom_fields.contato ?? '')}`.toLowerCase();
    return bag.includes(search);
  });
  const sort = input.sort ?? 'recent';
  rows = [...rows].sort((a, b) => {
    if (sort === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
    if (sort === 'oldest') return a.created_at.localeCompare(b.created_at);
    if (sort === 'first_seen') return (b.first_seen_at ?? '').localeCompare(a.first_seen_at ?? '');
    return b.created_at.localeCompare(a.created_at);
  });
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 25;
  return { contacts: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length };
}

function stageOf(pipelineId: string, name: StoryAccount['stage'], position: number, won: boolean, lost: boolean, probability: number): Stage {
  return {
    id: `story-stage-${position}`,
    pipeline_id: pipelineId,
    name,
    position,
    is_won: won,
    is_lost: lost,
    color: null,
    probability,
    ai_criteria: null,
    created_at: storyDate(new Date(), -30).toISOString(),
  };
}

const STAGE_PROBABILITY: Record<StoryAccount['stage'], number> = {
  Novo: 10,
  Qualificando: 25,
  Agendado: 40,
  Negociação: 60,
  Ganho: 100,
  Perdido: 0,
};

export function storyStages(pipelineId: string): Stage[] {
  return [
    stageOf(pipelineId, 'Novo', 0, false, false, 10),
    stageOf(pipelineId, 'Qualificando', 1, false, false, 25),
    stageOf(pipelineId, 'Agendado', 2, false, false, 40),
    stageOf(pipelineId, 'Negociação', 3, false, false, 60),
    stageOf(pipelineId, 'Ganho', 4, true, false, 100),
    stageOf(pipelineId, 'Perdido', 5, false, true, 0),
  ];
}

function toDeal(account: StoryAccount, today: Date, pipelineId: string, stageId: string | null): Deal {
  const created = storyDate(today, account.dayOffset);
  const createdIso = created.toISOString();
  const status = dealStatus(account.outcome);
  const responded = new Date(created.getTime() + account.responseHours * 3600000).toISOString();
  return {
    id: `story-deal-${account.id}`,
    contact_id: `story-${account.id}`,
    pipeline_id: pipelineId,
    stage_id: stageId,
    title: account.company,
    value: account.value,
    currency: 'BRL',
    status,
    expected_close: status === 'open' ? storyDay(today, 7) : null,
    won_at: status === 'won' ? createdIso : null,
    lost_at: status === 'lost' ? createdIso : null,
    lost_reason: account.lostReason,
    owner_id: account.ownerId,
    lead_type: account.kind === 'cliente' ? 'Cliente' : 'Lead',
    temperature: account.temperature,
    last_purchase_at: status === 'won' ? createdIso : null,
    first_contact_at: createdIso,
    first_response_at: responded,
    utm_source: account.origin,
    utm_medium: account.traffic,
    utm_campaign: account.campaign,
    utm_content: account.content,
    utm_term: null,
    traffic_type: account.traffic,
    origin_channel: account.origin,
    attribution_method: 'manual',
    created_at: createdIso,
    updated_at: storyDate(today, account.updatedOffset).toISOString(),
    contact: { id: `story-${account.id}`, name: account.company, phone: account.phone, email: account.email },
    tags: [],
    products: [{ id: `story-product-${account.product}`, name: account.product }],
    next_action: account.task
      ? { id: `story-task-${account.id}`, due_at: storyDate(today, 1).toISOString(), type: account.task.type === 'Ligação' ? 'call' : account.task.type === 'Reunião' ? 'meeting' : 'task' }
      : null,
    field_values: {},
    channel: account.channel,
  };
}

function stageFor(account: StoryAccount, stages: Stage[]): string | null {
  const named = stages.find((stage) => stage.name === account.stage);
  if (named) return named.id;
  if (account.outcome === 'won') return stages.find((stage) => stage.is_won)?.id ?? null;
  if (account.outcome === 'lost') return stages.find((stage) => stage.is_lost)?.id ?? null;
  return stages.find((stage) => !stage.is_won && !stage.is_lost)?.id ?? stages[0]?.id ?? null;
}

export function storyDeals(today: Date, pipelineId: string, stages: Stage[]): Deal[] {
  return STORY_ACCOUNTS.map((account) => toDeal(account, today, pipelineId, stageFor(account, stages)));
}

export function storyWorkspace(today = new Date()): { pipeline: Pipeline; stages: Stage[]; deals: Deal[] } {
  const pipeline: Pipeline = {
    id: 'story-pipe',
    name: 'Comercial',
    kind: 'comercial',
    position: 0,
    is_default: true,
    created_at: storyDate(today, -30).toISOString(),
  };
  const stages = storyStages(pipeline.id);
  return { pipeline, stages, deals: storyDeals(today, pipeline.id, stages) };
}

export function storyDealsOn(pipelineId: string, stages: Stage[], today = new Date()): Deal[] {
  const usable = stages.length > 0 ? stages : storyStages(pipelineId);
  return storyDeals(today, pipelineId, usable);
}

export function storyConversations(today = new Date()): ConversationWithContact[] {
  return STORY_ACCOUNTS.filter((account) => account.chat).map((account) => {
    const at = storyDate(today, account.dayOffset).toISOString();
    const channel = account.chat?.channelLabel === 'Instagram' ? 'instagram' : 'whatsapp';
    return {
      id: `story-conv-${account.id}`,
      contact_id: `story-${account.id}`,
      whatsapp_channel_id: null,
      number: null,
      status: account.chat?.status === 'Resolvida' ? 'closed' : 'human_active',
      assigned_to: account.ownerId,
      assigned_at: at,
      active_deal_id: `story-deal-${account.id}`,
      ai_paused: true,
      channel,
      last_message_at: at,
      unread_count: account.chat?.unread ?? 0,
      pinned_note: `${account.person} · ${account.product}`,
      archived: false,
      closed_at: account.chat?.status === 'Resolvida' ? at : null,
      created_at: at,
      updated_at: at,
      contact: {
        id: `story-${account.id}`,
        phone: account.phone,
        name: account.company,
        email: account.email,
        custom_fields: { contato: account.person, empresa: account.company },
      },
      lastMessagePreview: account.chat?.preview ?? null,
      tagIds: [],
      lastInboundAt: at,
    };
  });
}

export function storyMessages(conversationId: string, today = new Date()): Message[] {
  const account = STORY_ACCOUNTS.find((item) => conversationId === `story-conv-${item.id}`);
  if (!account?.chat) return [];
  return account.chat.lines.map((line, index) => ({
    id: `story-msg-${account.id}-${index}`,
    conversation_id: conversationId,
    direction: line.from === 'them' ? 'inbound' : 'outbound',
    sender_type: line.from === 'them' ? 'contact' : 'operator',
    sender_id: line.from === 'us' ? account.ownerId : null,
    content_type: 'text',
    content: line.text,
    media_url: null,
    zernio_message_id: null,
    meta_status: 'read',
    is_private_note: false,
    created_at: new Date(storyDate(today, account.dayOffset).getTime() + index * 60000).toISOString(),
  }));
}

export function storyOpenDeals(contactId: string, today = new Date()) {
  return storyDealsOn('story-pipe', storyStages('story-pipe'), today)
    .filter((deal) => deal.contact_id === contactId && deal.status === 'open')
    .map((deal) => ({ id: deal.id, title: deal.title, status: deal.status, stage_id: deal.stage_id }));
}

export function storyProfile(contactId: string, today = new Date()) {
  const contact = storyContacts(today).find((item) => item.id === contactId) ?? null;
  const deals = contact
    ? storyDealsOn('story-pipe', storyStages('story-pipe'), today).filter((deal) => deal.contact_id === contactId)
    : [];
  const account = STORY_ACCOUNTS.find((item) => `story-${item.id}` === contactId);
  const timeline = [
    ...(account?.chat?.lines ?? []).map((line, index) => ({
      id: `story-line-${account?.id}-${index}`,
      at: new Date(storyDate(today, account?.dayOffset ?? 0).getTime() + index * 60000).toISOString(),
      kind: line.from === 'them' ? 'in' as const : 'out' as const,
      label: line.from === 'them' ? account?.person ?? 'Cliente' : personName(account?.ownerId ?? ''),
      text: line.text,
    })),
    ...(account?.task
      ? [{
          id: `story-task-line-${account.id}`,
          at: storyDate(today, account.dayOffset).toISOString(),
          kind: 'task' as const,
          label: account.task.type,
          text: account.task.task,
          done: account.task.status === 'Concluída',
        }]
      : []),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  return { contact, deals, timeline };
}

export function storyTimeline(contactId: string, today = new Date()) {
  const profile = storyProfile(contactId, today);
  const byDay = new Map<string, { id: string; kind: 'conversa' | 'nota' | 'ganho' | 'perdido' | 'tarefa_concluida' | 'tarefa_agendada'; label: string; text: string; at: string }[]>();
  for (const item of profile.timeline) {
    const date = item.at.slice(0, 10);
    const list = byDay.get(date) ?? [];
    list.push({
      id: item.id,
      kind: item.kind === 'task' ? (item.done ? 'tarefa_concluida' : 'tarefa_agendada') : 'conversa',
      label: item.label,
      text: item.text,
      at: item.at,
    });
    byDay.set(date, list);
  }
  for (const deal of profile.deals) {
    if (deal.status !== 'won' && deal.status !== 'lost') continue;
    const at = (deal.status === 'won' ? deal.won_at : deal.lost_at) ?? deal.created_at;
    const date = at.slice(0, 10);
    const list = byDay.get(date) ?? [];
    list.push({
      id: `story-close-${deal.id}`,
      kind: deal.status === 'won' ? 'ganho' : 'perdido',
      label: deal.status === 'won' ? 'Ganho' : 'Perdido',
      text: `${deal.title} · ${deal.products?.[0]?.name ?? ''}`,
      at,
    });
    byDay.set(date, list);
  }
  return [...byDay.entries()]
    .map(([date, entries]) => ({ date, entries }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function storyOperators() {
  return STORY_PEOPLE.map((person) => ({
    user_id: person.id,
    email: `${person.id.replace('story-', '')}@equipe.example`,
    name: person.name,
    role: 'operator' as const,
  }));
}

export function storyMetrics(range: { from: Date; to: Date }, today = new Date()) {
  const deals = storyDealsOn('story-pipe', storyStages('story-pipe'), today);
  const inRange = (iso: string | null) => {
    if (!iso) return false;
    const at = new Date(iso).getTime();
    return at >= range.from.getTime() && at <= range.to.getTime();
  };
  const won = deals.filter((deal) => deal.status === 'won' && inRange(deal.won_at));
  const lost = deals.filter((deal) => deal.status === 'lost' && inRange(deal.lost_at));
  const open = deals.filter((deal) => deal.status === 'open');
  const dayMs = 86400000;
  const days = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / dayMs));
  const seriesFor = (rows: Deal[], at: (deal: Deal) => string | null) => {
    const points = [];
    for (let index = 0; index < days; index += 1) {
      const day = new Date(range.from.getTime() + index * dayMs).toISOString().slice(0, 10);
      const hit = rows.filter((deal) => (at(deal) ?? '').slice(0, 10) === day);
      points.push({ day, value: hit.reduce((sum, deal) => sum + (deal.value ?? 0), 0), count: hit.length });
    }
    return points;
  };
  const rank = new Map<string, { value: number; count: number }>();
  for (const deal of won) {
    const current = rank.get(deal.owner_id ?? '') ?? { value: 0, count: 0 };
    current.value += deal.value ?? 0;
    current.count += 1;
    rank.set(deal.owner_id ?? '', current);
  }
  const forecastValue = open.reduce((sum, deal) => {
    const account = STORY_ACCOUNTS.find((item) => deal.id === `story-deal-${item.id}`);
    const probability = account ? STAGE_PROBABILITY[account.stage] : 10;
    return sum + (deal.value ?? 0) * (probability / 100);
  }, 0);
  const countNamed = (rows: Deal[], pick: (deal: Deal) => string | null) => {
    const map = new Map<string, number>();
    for (const deal of rows) {
      const key = pick(deal);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, value: 0, count })).sort((a, b) => b.count - a.count);
  };
  const response = deals
    .map((deal) => ({ owner: deal.owner_id, ms: deal.first_response_at && deal.first_contact_at ? +new Date(deal.first_response_at) - +new Date(deal.first_contact_at) : null }))
    .filter((item): item is { owner: string | null; ms: number } => item.ms != null && item.ms >= 0);
  const avg = (rows: { owner: string | null; ms: number }[]) => {
    if (!rows.length) return { avgMs: null as number | null, byOwner: [] as { owner_id: string | null; ms: number | null; count: number }[] };
    const grouped = new Map<string | null, { total: number; count: number }>();
    for (const row of rows) {
      const current = grouped.get(row.owner) ?? { total: 0, count: 0 };
      current.total += row.ms;
      current.count += 1;
      grouped.set(row.owner, current);
    }
    return {
      avgMs: Math.round(rows.reduce((sum, row) => sum + row.ms, 0) / rows.length),
      byOwner: [...grouped.entries()].map(([owner_id, item]) => ({ owner_id, ms: Math.round(item.total / item.count), count: item.count })),
    };
  };
  const created = deals.filter((deal) => inRange(deal.created_at));
  return {
    won: { count: won.length, value: won.reduce((sum, deal) => sum + (deal.value ?? 0), 0), series: seriesFor(won, (deal) => deal.won_at) },
    lost: {
      count: lost.length,
      value: lost.reduce((sum, deal) => sum + (deal.value ?? 0), 0),
      series: seriesFor(lost, (deal) => deal.lost_at),
      reasons: countNamed(lost, (deal) => deal.lost_reason?.trim() || 'Sem motivo'),
    },
    ranking: [...rank.entries()].map(([owner_id, item]) => ({ owner_id, ...item })).sort((a, b) => b.value - a.value),
    forecast: { value: Math.round(forecastValue), openCount: open.length },
    firstResponse: avg(response),
    closeTime: avg(won.flatMap((deal) => (deal.won_at ? [{ owner: deal.owner_id, ms: +new Date(deal.won_at) - +new Date(deal.created_at) }] : []))),
    origin: {
      hasData: created.some((deal) => deal.traffic_type || deal.origin_channel || deal.utm_campaign),
      traffic: countNamed(created, (deal) => deal.traffic_type),
      channel: countNamed(created, (deal) => deal.origin_channel),
      campaign: countNamed(created, (deal) => deal.utm_campaign),
      ads: countNamed(created.filter((deal) => deal.traffic_type === 'pago'), (deal) => deal.utm_content),
      organicPosts: countNamed(created.filter((deal) => deal.traffic_type === 'organico'), (deal) => deal.utm_content),
    },
  };
}

export function storyModuleData(today = new Date()) {
  const owner = (id: string) => personName(id);
  const team = STORY_PEOPLE.map((person) => {
    const rows = STORY_ACCOUNTS.filter((account) => account.ownerId === person.id);
    const vendas = rows.filter((account) => account.outcome === 'won').length;
    return {
      name: person.name,
      role: person.role,
      team: person.team,
      funnel: person.funnel,
      esteira: rows.length,
      trabalhadas: rows.filter((account) => account.task || account.chat || account.meeting).length,
      qualificadas: rows.filter((account) => account.score >= 75).length,
      agendadas: rows.filter((account) => account.meeting).length,
      negociacoes: rows.filter((account) => account.outcome === 'open').length,
      vendas,
      notion: vendas,
      perdidos: rows.filter((account) => account.outcome === 'lost').length,
      meta: rows.length ? Math.round((vendas / rows.length) * 100) : 0,
    };
  });
  const sum = (key: 'esteira' | 'trabalhadas' | 'qualificadas' | 'agendadas' | 'negociacoes' | 'vendas' | 'notion' | 'perdidos') =>
    team.reduce((total, person) => total + person[key], 0);
  const kpis = [
    { key: 'esteira', label: 'Leads na esteira', value: sum('esteira'), delta: `${sum('esteira')} contas`, inOut: 'in' as const },
    { key: 'trabalhadas', label: 'Contas trabalhadas', value: sum('trabalhadas'), delta: `${sum('trabalhadas')} com atividade`, inOut: 'in' as const },
    { key: 'qualificadas', label: 'Qualificadas', value: sum('qualificadas'), delta: `${sum('qualificadas')} acima de 75`, inOut: 'in' as const },
    { key: 'agendadas', label: 'Agendadas', value: sum('agendadas'), delta: `${sum('agendadas')} reuniões`, inOut: 'in' as const },
    { key: 'negociacoes', label: 'Negociações', value: sum('negociacoes'), delta: `${sum('negociacoes')} abertas`, inOut: 'in' as const },
    { key: 'vendas', label: 'Vendas', value: sum('vendas'), delta: `${sum('vendas')} ganhas`, inOut: 'out' as const },
    { key: 'notion', label: 'Integrados na carteira', value: sum('notion'), delta: `${sum('notion')} fechadas`, inOut: 'out' as const },
    { key: 'perdidos', label: 'Perdidos', value: sum('perdidos'), delta: `${sum('perdidos')} perdidas`, inOut: 'out' as const },
  ];
  const volume = Array.from({ length: 14 }, (_, index) => {
    const offset = index - 13;
    const day = storyDate(today, offset);
    const rows = STORY_ACCOUNTS.filter((account) => account.dayOffset === offset);
    return {
      day: `${day.getDate()}/${String(day.getMonth() + 1).padStart(2, '0')}`,
      ligacoes: rows.filter((account) => account.task?.type === 'Ligação').length,
      emails: rows.filter((account) => account.task?.type === 'E-mail' || account.chat?.channelLabel === 'E-mail').length,
      linkedin: rows.filter((account) => account.origin === 'linkedin_ads').length,
      whatsapp: rows.filter((account) => account.channel === 'whatsapp' || account.task?.type === 'WhatsApp').length,
    };
  });
  const touches = [
    { key: 'total', label: 'Total do período', value: volume.reduce((total, day) => total + day.ligacoes + day.emails + day.linkedin + day.whatsapp, 0) },
    { key: 'ligacoes', label: 'Ligações', value: volume.reduce((total, day) => total + day.ligacoes, 0) },
    { key: 'emails', label: 'E-mails enviados', value: volume.reduce((total, day) => total + day.emails, 0) },
    { key: 'linkedin', label: 'Abordagens via LinkedIn', value: volume.reduce((total, day) => total + day.linkedin, 0) },
    { key: 'whatsapp', label: 'Interações via WhatsApp', value: volume.reduce((total, day) => total + day.whatsapp, 0) },
  ];
  const meetings = STORY_ACCOUNTS.filter((account) => account.meeting).map((account) => ({
    id: `story-meet-${account.id}`,
    time: account.meeting!.time,
    date: storyDate(today, account.meeting!.dayOffset).getDate(),
    title: account.meeting!.title,
    who: owner(account.ownerId),
    funnel: account.funnel,
    status: account.meeting!.status,
  }));
  const day = today.getDay();
  const monday = day === 0 ? -6 : 1 - day;
  const week = [0, 1, 2, 3, 4].map((index) => {
    const date = storyDate(today, monday + index);
    return { day: `${WEEKDAY[date.getDay()]} ${date.getDate()}`, date: date.getDate() };
  });
  const lists = ['Clínicas SP — Out 26', 'Imobiliárias litoral', 'Edtechs nacionais'].map((name) => {
    const rows = STORY_ACCOUNTS.filter((account) => account.list === name);
    const enriched = rows.filter((account) => account.enriched).length;
    return { name, rows: rows.length, status: enriched === rows.length ? 'Enriquecida' : enriched === 0 ? 'Nova' : 'Parcial' };
  });
  const goals = team.map((person) => ({
    name: person.name,
    funnel: person.funnel,
    meta: person.vendas + person.negociacoes + 1,
    feito: person.vendas,
    perdidos: person.perdidos,
    totais: person.esteira,
  }));
  const won = STORY_ACCOUNTS.filter((account) => account.outcome === 'won').length;
  const lost = STORY_ACCOUNTS.filter((account) => account.outcome === 'lost').length;
  return {
    kpis,
    touches,
    volume,
    team,
    meetings,
    week,
    calendarKpi: [
      { label: 'Total do mês', value: String(meetings.length) },
      { label: 'Reuniões confirmadas', value: String(meetings.filter((meeting) => meeting.status === 'Confirmada').length) },
      { label: 'Pendentes', value: String(meetings.filter((meeting) => meeting.status === 'Pendente').length) },
      { label: 'Pipeline de agendamentos', value: String(meetings.filter((meeting) => meeting.status === 'Pipeline').length) },
    ],
    leads: STORY_ACCOUNTS.map((account) => ({
      name: account.company,
      city: account.city,
      address: account.address,
      funnel: account.funnel,
      list: account.list,
      instagram: account.instagram,
      whatsapp: account.phone,
      email: account.email,
      score: account.score,
      enriched: account.enriched,
    })),
    lists,
    tasks: STORY_ACCOUNTS.filter((account) => account.task).map((account) => ({
      lead: account.company,
      task: account.task!.task,
      type: account.task!.type,
      funnel: account.funnel,
      owner: owner(account.ownerId),
      due: account.task!.due,
      status: account.task!.status,
    })),
    cadence: STORY_ACCOUNTS.filter((account) => account.cadence).map((account) => ({
      lead: account.company,
      step: account.cadence!.step,
      funnel: account.funnel,
      status: account.cadence!.status,
    })),
    kanban: (['Novo', 'Qualificando', 'Agendado', 'Negociação', 'Ganho', 'Perdido'] as const).map((stage) => ({
      stage,
      cards: STORY_ACCOUNTS.filter((account) => account.stage === stage).map((account) => ({
        name: account.company,
        funnel: account.funnel,
        owner: owner(account.ownerId),
      })),
    })),
    pie: (['Outbound SP', 'Inbound Nacional', 'Enterprise', 'Parcerias'] as const).map((name) => ({
      name,
      value: STORY_ACCOUNTS.filter((account) => account.funnel === name).length,
    })),
    goals,
    months: [
      { month: 'Jun', meta: won + 2, feito: Math.max(1, won - 1), perdidos: lost },
      { month: 'Jul', meta: won + 2, feito: won, perdidos: lost },
      { month: 'Ago', meta: won + 1, feito: Math.max(1, won - 1), perdidos: lost + 1 },
      { month: 'Set', meta: won + 1, feito: won, perdidos: lost },
      { month: 'Out', meta: won + lost, feito: won, perdidos: lost },
    ],
    funnels: (['Outbound SP', 'Inbound Nacional', 'Enterprise', 'Parcerias'] as const).map((funnel) => {
      const rows = STORY_ACCOUNTS.filter((account) => account.funnel === funnel);
      return {
        funnel,
        meta: rows.filter((account) => account.outcome !== 'lost').length,
        totais: rows.length,
        vendas: rows.filter((account) => account.outcome === 'won').length,
        perdidos: rows.filter((account) => account.outcome === 'lost').length,
        agendadas: rows.filter((account) => account.meeting).length,
      };
    }),
    chats: STORY_ACCOUNTS.filter((account) => account.chat).map((account) => ({
      id: `story-conv-${account.id}`,
      name: account.company,
      channel: account.chat!.channelLabel,
      preview: account.chat!.preview,
      time: account.chat!.time,
      unread: account.chat!.unread,
      status: account.chat!.status,
      assignee: owner(account.ownerId),
      phone: account.phone,
      email: account.email,
      ig: account.instagram,
    })),
    threads: Object.fromEntries(
      STORY_ACCOUNTS.filter((account) => account.chat).map((account) => [`story-conv-${account.id}`, account.chat!.lines]),
    ),
    heat: [
      { label: 'Jardins', city: 'São Paulo — Jardins', v: 0.95, lng: -46.6695, lat: -23.5874 },
      { label: 'Pinheiros', city: 'São Paulo — Pinheiros', v: 0.88, lng: -46.7019, lat: -23.5674 },
      { label: 'Vila Olímpia', city: 'São Paulo — Vila Olímpia', v: 0.8, lng: -46.6872, lat: -23.5951 },
      { label: 'Moema', city: 'São Paulo — Moema', v: 0.72, lng: -46.6621, lat: -23.6018 },
      { label: 'Cambuí', city: 'Campinas — Cambuí', v: 0.55, lng: -47.0552, lat: -22.8927 },
      { label: 'Gonzaga', city: 'Santos — Gonzaga', v: 0.48, lng: -46.3334, lat: -23.9672 },
      { label: 'Centro GRU', city: 'Guarulhos — Centro', v: 0.4, lng: -46.5333, lat: -23.4544 },
    ].map((zone) => ({ ...zone, leads: STORY_ACCOUNTS.filter((account) => account.city === zone.city).length })),
  };
}

export function mergeById<T extends { id: string }>(sample: T[], live: T[]): T[] {
  const seen = new Set(live.map((row) => row.id));
  return [...sample.filter((row) => !seen.has(row.id)), ...live];
}

export function storyTags(today = new Date()) {
  const at = storyDate(today, -30).toISOString();
  return (['Outbound SP', 'Inbound Nacional', 'Enterprise', 'Parcerias'] as const).map((name) => ({
    id: `story-tag-${name}`,
    name,
    color: '#111827',
    created_at: at,
    updated_at: at,
  }));
}

export function storyProducts(today = new Date()) {
  const at = storyDate(today, -12).toISOString();
  return [
    { id: 'story-product-Plano anual', name: 'Plano anual', product_type: 'consultoria' as const, quantity: null, created_at: at },
    { id: 'story-product-Kit inicial', name: 'Kit inicial', product_type: 'mentoria' as const, quantity: null, created_at: at },
    { id: 'story-product-Implantação', name: 'Implantação', product_type: 'app' as const, quantity: null, created_at: at },
  ];
}

export function storyMembers(today = new Date()) {
  const at = storyDate(today, -15).toISOString();
  return STORY_PEOPLE.map((person) => ({
    id: `story-member-${person.id}`,
    role: person.role === 'Closer' ? 'admin' as const : 'operator' as const,
    user_id: person.id,
    email: `${person.id.replace('story-', '')}@equipe.example`,
    accepted_at: at,
  }));
}

export function storyTemplates(today = new Date()): Template[] {
  const at = storyDate(today, -8).toISOString();
  return [
    {
      id: 'story-tpl-plano',
      name: 'plano_anual',
      category: 'marketing' as const,
      language: 'pt_BR',
      status: 'approved' as const,
      meta_template_id: null,
      meta_template_status: 'approved',
      header_type: 'none' as const,
      header_content: null,
      body: 'Olá {{1}}, o plano anual da {{2}} está em R$ {{3}}. Posso te mostrar hoje?',
      footer: 'Responda SAIR para não receber.',
      buttons: [{ type: 'quick_reply' as const, text: 'Quero ver' }],
      variables: { '1': 'contato', '2': 'empresa', '3': 'valor' },
      submitted_at: at,
      approved_at: at,
      created_at: at,
      updated_at: at,
    },
    {
      id: 'story-tpl-kit',
      name: 'kit_inicial',
      category: 'utility' as const,
      language: 'pt_BR',
      status: 'approved' as const,
      meta_template_id: null,
      meta_template_status: 'approved',
      header_type: 'text' as const,
      header_content: 'Kit inicial',
      body: 'Olá {{1}}, o kit inicial continua disponível. Quer o horário de amanhã?',
      footer: null,
      buttons: [],
      variables: { '1': 'contato' },
      submitted_at: at,
      approved_at: at,
      created_at: at,
      updated_at: at,
    },
  ];
}

export function storyCampaigns(today = new Date()): Campaign[] {
  const created = storyDate(today, -2).toISOString();
  return [
    {
      id: 'story-camp-plano',
      name: 'Plano anual — clínicas',
      template_id: 'story-tpl-plano',
      status: 'completed' as const,
      scheduled_at: null,
      audience_filter: { all: false, tag_ids: ['story-tag-Inbound Nacional'] },
      variable_mapping: { '1': { source: 'custom_field' as const, field: 'contato' } },
      total_contacts: 3,
      sent: 3,
      delivered: 3,
      read: 2,
      replied: 1,
      failed: 0,
      started_at: created,
      completed_at: storyDate(today, -1).toISOString(),
      created_at: created,
      updated_at: created,
    },
    {
      id: 'story-camp-kit',
      name: 'Kit inicial — academias',
      template_id: 'story-tpl-kit',
      status: 'sending' as const,
      scheduled_at: null,
      audience_filter: { all: false, tag_ids: ['story-tag-Outbound SP'] },
      variable_mapping: {},
      total_contacts: 2,
      sent: 1,
      delivered: 1,
      read: 0,
      replied: 0,
      failed: 0,
      started_at: storyDate(today, 0).toISOString(),
      completed_at: null,
      created_at: storyDate(today, 0).toISOString(),
      updated_at: storyDate(today, 0).toISOString(),
    },
  ];
}

export function storyLinks(today = new Date()) {
  const at = storyDate(today, -4).toISOString();
  return [
    {
      id: 'story-utm-clinicas',
      base_url: 'https://exemplo.local/clinicas',
      utm_source: 'instagram',
      utm_medium: 'pago',
      utm_campaign: 'Outubro clínicas',
      utm_content: 'Anúncio academia',
      utm_term: null,
      final_url: 'https://exemplo.local/clinicas?utm_source=instagram&utm_campaign=Outubro+clínicas',
      label: 'Outubro clínicas',
      slug: 'clinicas',
      destination_type: 'instagram' as const,
      wa_number: null,
      wa_message: null,
      created_by: 'story-elena',
      created_at: at,
    },
    {
      id: 'story-utm-edtech',
      base_url: 'https://exemplo.local/plano',
      utm_source: 'google',
      utm_medium: 'pago',
      utm_campaign: 'Edtechs outubro',
      utm_content: 'Busca plano',
      utm_term: null,
      final_url: 'https://exemplo.local/plano?utm_source=google&utm_campaign=Edtechs+outubro',
      label: 'Edtechs outubro',
      slug: 'edtechs',
      destination_type: 'landing' as const,
      wa_number: null,
      wa_message: null,
      created_by: 'story-ana',
      created_at: at,
    },
  ];
}

export function storyNotices(today = new Date()) {
  return [
    {
      id: 'story-notice-aurora',
      user_id: 'story-elena',
      type: 'new_message' as const,
      conversation_id: 'story-conv-aurora',
      message_id: 'story-msg-aurora-2',
      title: 'Clínica Aurora',
      body: 'Fechamos o plano anual. Preciso da nota.',
      is_read: false,
      created_at: storyDate(today, -1).toISOString(),
    },
    {
      id: 'story-notice-eduka',
      user_id: 'story-ana',
      type: 'handoff' as const,
      conversation_id: 'story-conv-eduka',
      message_id: null,
      title: 'Eduka Labs',
      body: 'Paulo pediu o plano anual para o comitê.',
      is_read: false,
      created_at: storyDate(today, -3).toISOString(),
    },
    {
      id: 'story-notice-norte',
      user_id: 'story-bruno',
      type: 'mention' as const,
      conversation_id: 'story-conv-norte',
      message_id: null,
      title: 'Studio Norte Fit',
      body: 'Perdido por preço. Kit inicial de R$ 900.',
      is_read: true,
      created_at: storyDate(today, -2).toISOString(),
    },
  ];
}

export function storyDispatch(days: number, today = new Date()) {
  const campaigns = storyCampaigns(today).map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    total_contacts: campaign.total_contacts,
    sent: campaign.sent,
    delivered: campaign.delivered,
    read: campaign.read,
    replied: campaign.replied,
    failed: campaign.failed,
    created_at: campaign.created_at,
  }));
  const volume = Array.from({ length: days }, (_, index) => {
    const offset = index - (days - 1);
    const accounts = STORY_ACCOUNTS.filter((account) => account.dayOffset === offset);
    return {
      day: storyDay(today, offset),
      inbound: accounts.filter((account) => account.chat).length,
      outbound: accounts.filter((account) => account.task).length,
    };
  });
  const chats = STORY_ACCOUNTS.filter((account) => account.chat);
  const closed = chats.filter((account) => account.chat?.status === 'Resolvida').length;
  return {
    campaigns,
    volumeByDay: volume,
    conversationStatus: {
      ai_active: 0,
      human_active: chats.length - closed,
      closed,
      total: chats.length,
    },
  };
}
