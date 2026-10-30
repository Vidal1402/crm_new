export interface FeedDeal {
  id: string;
  title: string;
  value: number;
  status: 'open' | 'won' | 'lost';
  stageName: string;
  pipelineId: string;
  pipelineName: string;
  contactId: string;
  contactName: string;
  ownerId: string | null;
  createdAt: string;
}

export interface FeedActivity {
  id: string;
  title: string;
  type: string;
  dueAt: string | null;
  done: boolean;
  body: string;
  contactName: string;
  pipelineName: string;
  ownerId: string | null;
}

export interface FeedContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  kind: string | null;
  source: string | null;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  list: string;
}

export interface FeedGoal {
  pipelineId: string;
  month: string;
  target: number;
}

export interface FeedStep {
  id: string;
  pipelineId: string;
  title: string;
  body: string;
  position: number;
}

export interface FeedRule {
  id: string;
  delayHours: number;
  sequence: number;
  active: boolean;
  trigger: string;
}

type DealRow = {
  id: string;
  title: string;
  value: number | string | null;
  status: string;
  owner_id: string | null;
  created_at: string;
  contact_id: string;
  pipeline_id: string | null;
  contact: { name: string | null } | { name: string | null }[] | null;
  pipeline: { name: string } | { name: string }[] | null;
  stage: { name: string } | { name: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function goalFunnelRows(
  pipelines: { id: string; name: string }[],
  deals: { pipelineId: string; pipelineName: string }[],
): { id: string; name: string }[] {
  const rows = new Map<string, string>();
  for (const pipeline of pipelines) {
    if (pipeline.id) rows.set(pipeline.id, pipeline.name || 'Funil');
  }
  for (const deal of deals) {
    if (!deal.pipelineId || rows.has(deal.pipelineId)) continue;
    rows.set(deal.pipelineId, deal.pipelineName || 'Funil');
  }
  return [...rows.entries()].map(([id, name]) => ({ id, name }));
}

export function mapDeal(row: DealRow): FeedDeal {
  const status = row.status === 'won' || row.status === 'lost' ? row.status : 'open';
  return {
    id: row.id,
    title: row.title,
    value: Number(row.value) || 0,
    status,
    stageName: one(row.stage)?.name ?? 'Sem etapa',
    pipelineId: row.pipeline_id ?? '',
    pipelineName: one(row.pipeline)?.name ?? 'Sem funil',
    contactId: row.contact_id,
    contactName: one(row.contact)?.name || row.title,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

function coord(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function mapContact(row: {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  kind?: string | null;
  source?: string | null;
  custom_fields?: Record<string, unknown> | null;
  tags?: { name: string }[];
}): FeedContact {
  const fields = row.custom_fields ?? {};
  return {
    id: row.id,
    name: row.name || 'Sem nome',
    phone: row.phone || '',
    email: row.email || '',
    kind: row.kind ?? null,
    source: row.source ?? null,
    city: typeof fields.city === 'string' ? fields.city : '',
    address: typeof fields.address === 'string' ? fields.address : '',
    lat: coord(fields.lat),
    lng: coord(fields.lng),
    list: row.tags?.[0]?.name ?? '',
  };
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function inPeriod(iso: string, period: string, today = new Date()): boolean {
  const day = new Date(iso);
  if (Number.isNaN(day.getTime())) return false;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === 'Hoje') return dayKey(iso) === dayKey(start.toISOString());
  if (period === '7 dias') return day >= new Date(start.getFullYear(), start.getMonth(), start.getDate() - 6);
  if (period === '15 dias') return day >= new Date(start.getFullYear(), start.getMonth(), start.getDate() - 14);
  if (period === 'Mês anterior') {
    const from = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const to = new Date(start.getFullYear(), start.getMonth(), 1);
    return day >= from && day < to;
  }
  return day >= new Date(start.getFullYear(), start.getMonth(), 1);
}
