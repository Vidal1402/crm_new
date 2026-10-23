import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cutoffLabel,
  groupProposals,
  listProposals,
  previousWindow,
  recentWindow,
  type ProposalQuery,
  type ProposalRow,
} from '../src/lib/quoteLedger.ts';

const today = new Date(2026, 9, 19, 22, 0, 0);
const query: ProposalQuery = { text: '', scope: 'active', ownerId: null, channel: null };

function row(partial: Partial<ProposalRow> & Pick<ProposalRow, 'id' | 'createdAt' | 'situation'>): ProposalRow {
  return {
    title: 'Proposta',
    contactName: 'Contato',
    value: 0,
    ownerId: 'op-1',
    channel: 'whatsapp',
    ...partial,
  };
}

test('o período recente guarda um ano e o dia do corte fica só nele', () => {
  const recent = recentWindow(today);
  const older = previousWindow(recent);
  const rows = [
    row({ id: 'edge', createdAt: new Date(2025, 9, 19, 8).toISOString(), situation: 'open' }),
    row({ id: 'before', createdAt: new Date(2025, 9, 18, 8).toISOString(), situation: 'open' }),
    row({ id: 'lost', createdAt: new Date(2026, 9, 1, 8).toISOString(), situation: 'lost' }),
    row({ id: 'won', createdAt: new Date(2026, 9, 19, 9).toISOString(), situation: 'won' }),
  ];
  const listed = listProposals(rows, query, recent);
  assert.deepEqual(listed.map((item) => item.id), ['won', 'edge']);
  assert.equal(listed[0]?.number, 1);
  assert.equal(listProposals(rows, query, older).map((item) => item.id).join(), 'before');
  assert.equal(cutoffLabel(recent), '19/10/2025');
});

test('a busca olha título e contato, e canal vazio não passa no filtro de canal', () => {
  const recent = recentWindow(today);
  const rows = [
    row({ id: 'a', title: 'Kit', contactName: 'Ana', createdAt: new Date(2026, 8, 2).toISOString(), situation: 'open', channel: null }),
    row({ id: 'b', title: 'Outra', contactName: 'Bruno', createdAt: new Date(2026, 8, 2).toISOString(), situation: 'open' }),
  ];
  assert.deepEqual(listProposals(rows, { ...query, text: 'ana' }, recent).map((item) => item.id), ['a']);
  assert.equal(listProposals(rows, { ...query, channel: 'whatsapp' }, recent).length, 1);
  const groups = groupProposals(listProposals(rows, query, recent), today);
  assert.equal(groups[0]?.label, '02/09/2026');
  const todayGroups = groupProposals(
    listProposals([row({ id: 'h', createdAt: today.toISOString(), situation: 'open' })], query, recent),
    today,
  );
  assert.equal(todayGroups[0]?.label, 'Hoje');
});
