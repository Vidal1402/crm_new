export type ProposalSituation = 'open' | 'won' | 'lost';

export type ProposalScope = 'active' | 'all' | ProposalSituation;

export interface ProposalRow {
  id: string;
  title: string;
  contactName: string;
  value: number;
  situation: ProposalSituation;
  ownerId: string | null;
  channel: string | null;
  createdAt: string;
}

export interface ProposalQuery {
  text: string;
  scope: ProposalScope;
  ownerId: string | null;
  channel: string | null;
}

export interface LedgerWindow {
  from: Date;
  to: Date;
}

export interface ListedProposal extends ProposalRow {
  number: number;
}

export interface ProposalGroup {
  key: string;
  label: string;
  rows: ListedProposal[];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function recentWindow(today: Date): LedgerWindow {
  const end = startOfDay(today);
  const from = new Date(end);
  from.setFullYear(from.getFullYear() - 1);
  const to = new Date(end);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

export function previousWindow(current: LedgerWindow): LedgerWindow {
  const from = new Date(current.from);
  from.setFullYear(from.getFullYear() - 1);
  return { from, to: new Date(current.from) };
}

export function sameWindow(a: LedgerWindow, b: LedgerWindow): boolean {
  return a.from.getTime() === b.from.getTime() && a.to.getTime() === b.to.getTime();
}

function inWindow(createdAt: string, window: LedgerWindow): boolean {
  const created = new Date(createdAt);
  return created >= window.from && created < window.to;
}

export function listProposals(rows: ProposalRow[], query: ProposalQuery, window: LedgerWindow): ListedProposal[] {
  const text = query.text.trim().toLowerCase();
  const matched = rows.filter((row) => {
    if (!inWindow(row.createdAt, window)) return false;
    if (query.scope === 'active' && row.situation === 'lost') return false;
    if (query.scope !== 'active' && query.scope !== 'all' && row.situation !== query.scope) return false;
    if (query.ownerId && row.ownerId !== query.ownerId) return false;
    if (query.channel && row.channel !== query.channel) return false;
    if (!text) return true;
    return `${row.title} ${row.contactName}`.toLowerCase().includes(text);
  });
  matched.sort((a, b) => {
    const byDate = +new Date(b.createdAt) - +new Date(a.createdAt);
    return byDate || a.id.localeCompare(b.id);
  });
  return matched.map((row, index) => ({ ...row, number: index + 1 }));
}

function dayKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function groupProposals(rows: ListedProposal[], today: Date): ProposalGroup[] {
  const todayKey = dayKey(startOfDay(today).toISOString());
  const groups: ProposalGroup[] = [];
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    const current = groups[groups.length - 1];
    if (!current || current.key !== key) {
      const [year, month, day] = key.split('-');
      groups.push({
        key,
        label: key === todayKey ? 'Hoje' : `${day}/${month}/${year}`,
        rows: [row],
      });
    } else {
      current.rows.push(row);
    }
  }
  return groups;
}

export function cutoffLabel(window: LedgerWindow): string {
  const date = window.from;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
