import assert from 'node:assert/strict';
import test from 'node:test';
import { HEAT_COLORS, contactStatusColor, hottestColor } from '../src/lib/heatStatus.ts';
import { CITY_RINGS } from '../src/lib/cityRings.ts';

test('contact status reuses the existing heat colors', () => {
  assert.equal(contactStatusColor('Perdido', 'lost'), HEAT_COLORS.red);
  assert.equal(contactStatusColor('Acordo', 'open'), HEAT_COLORS.orange);
  assert.equal(contactStatusColor('Estudo', 'open'), HEAT_COLORS.yellow);
  assert.equal(contactStatusColor('Ganho', 'won'), HEAT_COLORS.green);
  assert.equal(hottestColor([HEAT_COLORS.green, HEAT_COLORS.yellow, HEAT_COLORS.red]), HEAT_COLORS.red);
});

test('saved rings are cities, not the state of Rio', () => {
  const rio = CITY_RINGS['rio de janeiro'];
  const vitoria = CITY_RINGS.vitoria;
  const vila = CITY_RINGS['vila velha'];
  assert.ok(rio && rio.length > 10);
  assert.ok(vitoria && vila);
  const lngs = rio.map((point) => point[0]);
  const width = Math.max(...lngs) - Math.min(...lngs);
  assert.ok(width < 1.2);
  assert.notEqual(vitoria[0][0], vila[0][0]);
});
