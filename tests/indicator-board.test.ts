import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCustomIndicator,
  customReady,
  emptyBoard,
  filterIndicators,
  monthPeriod,
  pinIndicator,
  readBoard,
  unpinIndicator,
} from '../src/lib/indicatorBoard.ts';

test('a busca e a etapa reduzem o catálogo sem inventar item', () => {
  const todos = filterIndicators('', 'todos');
  const crescimento = filterIndicators('estado', 'crescimento');
  assert.ok(todos.length > crescimento.length);
  assert.equal(crescimento[0]?.id, 'por-estado');
  assert.equal(filterIndicators('estado', 'entrada').length, 0);
});

test('incluir duas vezes não duplica e tirar remove', () => {
  const once = pinIndicator(emptyBoard(), 'por-pessoa');
  const twice = pinIndicator(once, 'por-pessoa');
  assert.equal(once.pinnedIds.filter((id) => id === 'por-pessoa').length, 1);
  assert.equal(twice.pinnedIds.length, once.pinnedIds.length);
  assert.equal(unpinIndicator(once, 'por-pessoa').pinnedIds.includes('por-pessoa'), false);
});

test('o texto só vira cartão com nome e descrição', () => {
  assert.equal(customReady('  ', 'mostrar valor'), false);
  assert.equal(customReady('Comparar', '   '), false);
  const saved = addCustomIndicator(emptyBoard(), ' Comparar ', ' mostrar valor ', 'c1');
  assert.deepEqual(saved.custom, [{ id: 'c1', name: 'Comparar', brief: 'mostrar valor' }]);
});

test('mês de outubro começa no dia 1 e o armazenamento inválido volta ao padrão', () => {
  const period = monthPeriod(2026, 10);
  assert.equal(period.from.getMonth(), 9);
  assert.equal(period.from.getDate(), 1);
  assert.equal(period.to.getDate(), 31);
  const storage = { getItem: () => '{nao json' };
  assert.deepEqual(readBoard(storage).pinnedIds, emptyBoard().pinnedIds);
});
