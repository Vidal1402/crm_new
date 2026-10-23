import assert from 'node:assert/strict';
import test from 'node:test';
import { STORY_ACCOUNTS, STORY_PEOPLE } from '../src/lib/mock/story.ts';
import { buildSnapshot, defaultWindow, sampleRows } from '../src/lib/periodBoard.ts';

const today = new Date(2026, 9, 21);

function comercialInWindow() {
  const window = defaultWindow(today);
  return sampleRows(today).filter(
    (row) => row.mode === 'comercial' && row.occurredOn >= window.from && row.occurredOn <= window.to,
  );
}

test('a janela padrão tem oito dias e ignora o que ficou antes', () => {
  const window = defaultWindow(today);
  assert.equal(window.from, '2026-10-14');
  assert.equal(window.to, '2026-10-21');
  const snap = buildSnapshot(sampleRows(today), 'comercial', window);
  assert.equal(snap.rows.some((row) => row.contact === 'United Hub'), false);
  const rows = comercialInWindow();
  const won = rows.filter((row) => row.outcome === 'won').reduce((sum, row) => sum + row.value, 0);
  assert.equal(snap.cards.find((card) => card.key === 'won')?.value, won);
  assert.equal(snap.cards.find((card) => card.key === 'total')?.count, rows.length);
  assert.equal(snap.days.length, 8);
  assert.equal(snap.days[0]?.value, 0);
});

test('produtos e pessoas usam só o que foi ganho', () => {
  const snap = buildSnapshot(sampleRows(today), 'comercial', defaultWindow(today));
  assert.deepEqual(snap.products.map((item) => item.name), ['Plano anual']);
  assert.equal(snap.owners[0]?.name, 'Elena Rocha');
  assert.ok(snap.owners.every((owner) => STORY_PEOPLE.some((person) => person.name === owner.name)));
});

test('o cartão marcado limita a lista e mantém os cinco totais', () => {
  const snap = buildSnapshot(sampleRows(today), 'comercial', defaultWindow(today), 'entered');
  const rows = comercialInWindow();
  assert.equal(snap.rows.length, rows.filter((row) => row.outcome === 'entered').length);
  assert.equal(snap.cards.find((card) => card.key === 'total')?.count, rows.length);
  assert.equal(snap.products[0]?.name, 'Kit inicial');
});

test('um modo sem linhas fica zerado', () => {
  const snap = buildSnapshot(sampleRows(today), 'tarefas', { from: '2020-01-01', to: '2020-01-02' });
  assert.equal(snap.rows.length, 0);
  assert.equal(snap.owners.length, 0);
  assert.equal(snap.products.length, 0);
  assert.equal(snap.cards.every((card) => card.count === 0 && card.value === 0), true);
});

test('as mesmas contas aparecem no painel, nos contatos e no funil', () => {
  const companies = new Set(STORY_ACCOUNTS.map((account) => account.company));
  for (const row of sampleRows(today)) assert.equal(companies.has(row.contact), true);
  const people = new Set(STORY_PEOPLE.map((person) => person.name));
  for (const row of sampleRows(today)) assert.equal(people.has(row.owner), true);
  assert.equal(comercialInWindow().length, STORY_ACCOUNTS.filter((account) => account.dayOffset >= -7).length);
});
