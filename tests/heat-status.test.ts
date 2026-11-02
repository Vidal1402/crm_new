import assert from 'node:assert/strict';
import test from 'node:test';
import { HEAT_COLORS, contactStatusColor, countColor, hottestColor } from '../src/lib/heatStatus.ts';
import { CITY_RINGS } from '../src/lib/cityRings.ts';

function covers(ring: [number, number][], lng: number, lat: number): boolean {
  let hit = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

test('contact status reuses the existing heat colors', () => {
  assert.equal(contactStatusColor('Perdido', 'lost'), HEAT_COLORS.red);
  assert.equal(contactStatusColor('Acordo', 'open'), HEAT_COLORS.orange);
  assert.equal(contactStatusColor('Estudo', 'open'), HEAT_COLORS.yellow);
  assert.equal(contactStatusColor('Ganho', 'won'), HEAT_COLORS.green);
  assert.equal(hottestColor([HEAT_COLORS.green, HEAT_COLORS.yellow, HEAT_COLORS.red]), HEAT_COLORS.red);
  assert.equal(countColor(1), HEAT_COLORS.green);
  assert.equal(countColor(7), HEAT_COLORS.yellow);
  assert.equal(countColor(11), HEAT_COLORS.orange);
  assert.equal(countColor(16), HEAT_COLORS.red);
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
  let longest = 0;
  for (let index = 1; index < rio.length; index += 1) {
    longest = Math.max(longest, Math.hypot(rio[index][0] - rio[index - 1][0], rio[index][1] - rio[index - 1][1]));
  }
  assert.ok(longest < 0.05);
  assert.equal(covers(rio, -43.5247, -22.8222), false);
  assert.notEqual(vitoria[0][0], vila[0][0]);
});
