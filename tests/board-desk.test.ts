import test from 'node:test';
import assert from 'node:assert/strict';
import { columnTotal, createDesk, EMPTY_DESK_QUERY, visibleCards } from '../src/lib/boardDesk.ts';

const today = new Date(2026, 9, 21);

test('o funil principal nasce com as mesmas contas do restante do CRM', () => {
  const desk = createDesk(today);
  const cards = visibleCards(desk.cards, 'desk-captacao', EMPTY_DESK_QUERY, today);
  assert.equal(desk.groups.length, 3);
  assert.ok(cards.some((card) => card.contact === 'Marina Costa' && card.stageKey === 'ganho'));
  assert.ok(cards.some((card) => card.contact === 'Ricardo Pires' && card.stageKey === 'perdido'));
  assert.equal(columnTotal(cards.filter((card) => card.stageKey === 'ganho')), 4800 + 2100 + 9000);
});

test('último ano esconde conta antiga e a busca acha a empresa pelo produto', () => {
  const desk = createDesk(today);
  const aged = {
    ...desk.cards[0],
    id: 'antiga',
    contact: 'Conta antiga',
    occurredOn: '2020-01-01',
  };
  const year = visibleCards([aged, ...desk.cards], 'desk-captacao', EMPTY_DESK_QUERY, today);
  assert.equal(year.some((card) => card.id === 'antiga'), false);
  const found = visibleCards(desk.cards, 'desk-captacao', { ...EMPTY_DESK_QUERY, text: 'kit inicial' }, today);
  assert.ok(found.every((card) => card.product === 'Kit inicial'));
});

test('situação perdida e ordenação por valor', () => {
  const desk = createDesk(today);
  const lost = visibleCards(desk.cards, 'desk-captacao', { ...EMPTY_DESK_QUERY, status: 'lost' }, today);
  assert.deepEqual(lost.map((card) => card.contact), ['Ricardo Pires']);
  const byValue = visibleCards(desk.cards, 'desk-captacao', { ...EMPTY_DESK_QUERY, sort: 'value' }, today);
  assert.ok(byValue[0].value >= byValue[1].value);
});
