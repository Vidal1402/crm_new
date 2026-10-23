import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyAccount, monthTitle, tallyAccounts, viewRange } from '../src/lib/accountBook.ts';

const now = new Date(2026, 9, 20, 12, 0, 0);

test('quem não é cliente fica prospect, e o cliente segue o prazo de alteração', () => {
  assert.equal(classifyAccount({ kind: 'lead', updatedAt: now.toISOString() }, now), 'prospect');
  assert.equal(classifyAccount({ kind: null, updatedAt: now.toISOString() }, now), 'prospect');
  assert.equal(classifyAccount({ kind: 'cliente', updatedAt: new Date(2026, 9, 1).toISOString() }, now), 'active');
  assert.equal(classifyAccount({ kind: 'cliente', updatedAt: new Date(2026, 5, 1).toISOString() }, now), 'recent');
  assert.equal(classifyAccount({ kind: 'cliente', updatedAt: new Date(2024, 1, 1).toISOString() }, now), 'old');
  assert.equal(classifyAccount({ kind: 'cliente', updatedAt: 'sem-data' }, now), 'old');
});

test('a carteira do mês não conta prospect nem cliente alterado no mês anterior', () => {
  const tally = tallyAccounts(
    [
      { kind: 'lead', updatedAt: now.toISOString() },
      { kind: 'cliente', updatedAt: new Date(2026, 9, 3).toISOString() },
      { kind: 'cliente', updatedAt: new Date(2026, 8, 30).toISOString() },
    ],
    now,
  );
  assert.equal(tally.prospect, 1);
  assert.equal(tally.monthClients, 1);
  assert.equal(tally.active, 2);
  assert.match(monthTitle(now), /2026/);
});

test('a visão recente começa onde a ativa termina', () => {
  const active = viewRange('active', now);
  const recent = viewRange('recent', now);
  assert.equal(active.type, 'cliente');
  assert.equal(recent.type, 'cliente');
  if (active.type === 'cliente' && recent.type === 'cliente') {
    assert.equal(recent.to, active.from);
    assert.equal(active.to, null);
  }
  assert.deepEqual(viewRange('all', now), { type: 'all' });
  assert.deepEqual(viewRange('prospect', now), { type: 'prospect' });
});
