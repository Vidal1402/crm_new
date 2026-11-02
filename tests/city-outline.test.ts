import assert from 'node:assert/strict';
import test from 'node:test';
import { matchMunicipalities, outerRing } from '../src/lib/cityOutline.ts';

const rows = [
  { id: 3550308, nome: 'São Paulo', uf: 'SP' },
  { id: 3106200, nome: 'Belo Horizonte', uf: 'MG' },
  { id: 2201903, nome: 'Bom Jesus', uf: 'PI' },
  { id: 2401503, nome: 'Bom Jesus', uf: 'RN' },
];

test('a municipality outline keeps the city polygon', () => {
  const ring = outerRing({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[-46.8, -23.8], [-46.4, -23.8], [-46.4, -23.4], [-46.7, -23.5], [-46.8, -23.8]]],
    },
  });
  assert.ok(ring);
  assert.ok(ring!.length >= 4);
  const lngs = ring!.map((point) => point[0]);
  assert.ok(Math.max(...lngs) - Math.min(...lngs) < 1);
});

test('a municipality outline keeps a notch instead of cutting into the neighbor', () => {
  const coordinates: [number, number][] = [[0, 0]];
  for (let step = 1; step <= 40; step += 1) coordinates.push([step * 0.001, 0]);
  coordinates.push([0.02, 0.05], [0.021, 0.05], [0.021, 0]);
  for (let step = 22; step <= 80; step += 1) coordinates.push([step * 0.001, 0]);
  coordinates.push([0, 0]);
  const ring = outerRing({ type: 'Polygon', coordinates: [coordinates] });
  assert.ok(ring?.some((point) => point[1] > 0.04));
});
test('an exact city name matches one municipality and a state name matches none', () => {
  assert.deepEqual(matchMunicipalities(rows, 'São Paulo').map((row) => row.id), [3550308]);
  assert.deepEqual(matchMunicipalities(rows, 'Belo Horizonte').map((row) => row.uf), ['MG']);
  assert.deepEqual(matchMunicipalities(rows, 'Minas Gerais'), []);
  assert.deepEqual(matchMunicipalities(rows, 'Bom Jesus, PI').map((row) => row.uf), ['PI']);
  assert.equal(matchMunicipalities(rows, 'Bom Jesus').length, 2);
});
