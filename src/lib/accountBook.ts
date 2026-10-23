export type AccountKind = 'lead' | 'cliente' | null;

export type AccountBucket = 'prospect' | 'active' | 'recent' | 'old';

export type AccountView = 'all' | AccountBucket;

export const ACTIVE_DAYS = 90;
export const QUIET_DAYS = 365;

export interface AccountStamp {
  kind: AccountKind;
  updatedAt: string;
}

export interface AccountTally {
  active: number;
  recent: number;
  old: number;
  prospect: number;
  monthClients: number;
}

export interface ClientRange {
  type: 'cliente';
  from: string | null;
  to: string | null;
}

export type ViewRange = { type: 'all' } | { type: 'prospect' } | ClientRange;

function shiftDays(now: Date, days: number): Date {
  const copy = new Date(now);
  copy.setDate(copy.getDate() - days);
  return copy;
}

export function monthStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function viewRange(view: AccountView, now: Date): ViewRange {
  if (view === 'all') return { type: 'all' };
  if (view === 'prospect') return { type: 'prospect' };
  if (view === 'active') return { type: 'cliente', from: shiftDays(now, ACTIVE_DAYS).toISOString(), to: null };
  if (view === 'recent') {
    return {
      type: 'cliente',
      from: shiftDays(now, QUIET_DAYS).toISOString(),
      to: shiftDays(now, ACTIVE_DAYS).toISOString(),
    };
  }
  return { type: 'cliente', from: null, to: shiftDays(now, QUIET_DAYS).toISOString() };
}

export function classifyAccount(stamp: AccountStamp, now: Date): AccountBucket {
  if (stamp.kind !== 'cliente') return 'prospect';
  const updated = new Date(stamp.updatedAt).getTime();
  if (Number.isNaN(updated)) return 'old';
  const activeFrom = shiftDays(now, ACTIVE_DAYS).getTime();
  const quietFrom = shiftDays(now, QUIET_DAYS).getTime();
  if (updated >= activeFrom) return 'active';
  if (updated >= quietFrom) return 'recent';
  return 'old';
}

export function tallyAccounts(rows: AccountStamp[], now: Date): AccountTally {
  const tally: AccountTally = { active: 0, recent: 0, old: 0, prospect: 0, monthClients: 0 };
  const start = monthStart(now).getTime();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  for (const row of rows) {
    tally[classifyAccount(row, now)] += 1;
    if (row.kind !== 'cliente') continue;
    const updated = new Date(row.updatedAt).getTime();
    if (!Number.isNaN(updated) && updated >= start && updated < next) tally.monthClients += 1;
  }
  return tally;
}

export function monthRange(now: Date): { from: string; to: string } {
  return {
    from: monthStart(now).toISOString(),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  };
}

export function monthTitle(now: Date): string {
  return now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
