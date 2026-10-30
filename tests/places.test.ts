import assert from 'node:assert/strict';
import test from 'node:test';
import { CITY_RINGS } from '../src/lib/cityRings.ts';
import { parseNominatim, parseOverpass, placeQuery, ringBox } from '../src/lib/places.ts';

test('placeQuery stays inside the named city and escapes the name', () => {
  const rio = ringBox(CITY_RINGS['rio de janeiro']);
  assert.ok(rio);
  const query = placeQuery('Café. Colombo', rio!);
  assert.ok(query);
  assert.match(query!, /Café\\\. Colombo/);
  assert.match(query!, /out center 15/);
  assert.equal(placeQuery('ab', rio!), null);
  const wide = placeQuery('Padaria', { lat: -22.9, lng: -43.2, south: -23, west: -45, north: -20, east: -40 });
  assert.match(wide!, /around:12000/);
  assert.doesNotMatch(wide!, /-45/);
});

test('a city ring wider than the city is rejected', () => {
  assert.equal(ringBox([[-46, -23], [-40, -23], [-40, -20], [-46, -20]]), null);
});

test('parseOverpass reads the shop name, phone and center', () => {
  const places = parseOverpass({
    elements: [
      {
        center: { lat: -22.905, lon: -43.179 },
        tags: { name: 'Confeitaria Colombo', phone: '+55 21 2505-1500', 'addr:street': 'Rua Gonçalves Dias', 'addr:housenumber': '32', 'addr:city': 'Rio de Janeiro' },
      },
      { tags: { name: 'Sem ponto' } },
    ],
  }, 'Rio de Janeiro');
  assert.equal(places.length, 1);
  assert.equal(places[0].name, 'Confeitaria Colombo');
  assert.equal(places[0].phone, '+55 21 2505-1500');
  assert.equal(places[0].address, 'Rua Gonçalves Dias, 32');
  assert.equal(places[0].city, 'Rio de Janeiro');
});

test('parseNominatim keeps the city from the address', () => {
  const places = parseNominatim([
    {
      name: 'Confeitaria Colombo',
      lat: '-22.9051703',
      lon: '-43.1787441',
      address: { city: 'Rio de Janeiro', road: 'Rua Gonçalves Dias', house_number: '32' },
      extratags: {},
    },
  ], 'Rio de Janeiro');
  assert.equal(places[0].city, 'Rio de Janeiro');
  assert.equal(places[0].lat, -22.9051703);
  assert.equal(places[0].address, 'Rua Gonçalves Dias, 32');
});
