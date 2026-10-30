import assert from 'node:assert/strict';
import test from 'node:test';
import { CITY_RINGS } from '../src/lib/cityRings.ts';
import { fillContacts, leadCount, nicheTag, parseNominatim, parseOverpass, parsePhoton, placeQuery, readHomepageLinks, ringBox, type PlaceHit } from '../src/lib/places.ts';

test('a niche query asks for the category inside the city', () => {
  const rio = ringBox(CITY_RINGS['rio de janeiro']);
  assert.ok(rio);
  const query = placeQuery('padaria', rio!, 5);
  assert.ok(query);
  assert.match(query!, /\["shop"="bakery"\]/);
  assert.match(query!, /around:12000/);
  assert.match(query!, /out center 5/);
  assert.equal(leadCount(5), 5);
  assert.equal(leadCount(80), 30);
  assert.equal(leadCount(''), 10);
  assert.equal(nicheTag('Salão')?.value, 'hairdresser');
  const unknown = placeQuery('Café. Colombo', rio!);
  assert.match(unknown!, /Café\\\. Colombo/);
  assert.equal(placeQuery('ab', rio!), null);
  const wide = placeQuery('padaria', { lat: -22.9, lng: -43.2, south: -23, west: -45, north: -20, east: -40 });
  assert.match(wide!, /around:12000/);
  assert.doesNotMatch(wide!, /-45/);
});

test('a city ring wider than the city is rejected', () => {
  assert.equal(ringBox([[-46, -23], [-40, -23], [-40, -20], [-46, -20]]), null);
});

test('parseOverpass keeps several businesses from one niche', () => {
  const places = parseOverpass({
    elements: [
      { lat: -22.91, lon: -43.18, tags: { name: 'Padaria Catete', phone: '+55 21 2558-0001', 'addr:street': 'Rua do Catete', 'addr:city': 'Rio de Janeiro' } },
      { center: { lat: -22.92, lon: -43.19 }, tags: { name: 'Padaria Napoles', 'addr:city': 'Rio de Janeiro' } },
      { lat: -22.93, lon: -43.17, tags: { name: 'Padaria do Raphael', 'addr:city': 'Rio de Janeiro' } },
      { tags: { name: 'Sem ponto' } },
    ],
  }, 'Rio de Janeiro');
  assert.deepEqual(places.map((place) => place.name), ['Padaria Catete', 'Padaria Napoles', 'Padaria do Raphael']);
  assert.equal(places[0].phone, '+55 21 2558-0001');
  assert.equal(places[0].city, 'Rio de Janeiro');
});

test('parseOverpass respects the requested limit and reads contact links', () => {
  const places = parseOverpass({
    elements: [
      {
        lat: -22.91, lon: -43.18,
        tags: {
          name: 'Padaria Catete',
          phone: '+55 21 2558-0001',
          email: 'contato@padaria.test',
          'contact:instagram': 'https://www.instagram.com/padariacatete',
          'contact:linkedin': 'https://www.linkedin.com/company/padaria-catete',
          'addr:city': 'Rio de Janeiro',
        },
      },
      { lat: -22.92, lon: -43.19, tags: { name: 'Padaria Napoles', 'addr:city': 'Rio de Janeiro' } },
      { lat: -22.93, lon: -43.17, tags: { name: 'Padaria do Raphael', 'addr:city': 'Rio de Janeiro' } },
      { lat: -22.94, lon: -43.16, tags: { name: 'Padaria Abaeté', 'addr:city': 'Rio de Janeiro' } },
    ],
  }, 'Rio de Janeiro', 2);
  assert.deepEqual(places.map((place) => place.name), ['Padaria Catete', 'Padaria Napoles']);
  assert.equal(places[0].email, 'contato@padaria.test');
  assert.equal(places[0].instagram, 'https://www.instagram.com/padariacatete');
  assert.equal(places[0].linkedin, 'https://www.linkedin.com/company/padaria-catete');
  assert.equal(places[1].email, '');
  assert.equal(places[1].instagram, '');
  assert.equal(places[1].linkedin, '');
});

test('fillContacts keeps a phone and website that the map index omitted', () => {
  const bare = {
    name: 'Confeitaria Colombo',
    city: 'Rio de Janeiro',
    address: 'Rua Gonçalves Dias, 32',
    phone: '',
    email: '',
    instagram: '',
    linkedin: '',
    website: '',
    lat: -22.9,
    lng: -43.17,
  } satisfies PlaceHit;
  const filled = fillContacts(bare, { phone: '+55 21 2505 1500', 'contact:website': 'www.confeitariacolombo.com.br' });
  assert.equal(filled.phone, '+55 21 2505 1500');
  assert.equal(filled.website, 'https://www.confeitariacolombo.com.br/');
  assert.equal(filled.email, '');
});

test('readHomepageLinks keeps only the contact links on the page', () => {
  const found = readHomepageLinks('<a href="mailto:oi@padaria.test">mail</a><a href="https://www.instagram.com/padariacatete">ig</a><a href="https://www.linkedin.com/company/padaria-catete">li</a><a href="https://example.com/sobre">sobre</a>');
  assert.equal(found.email, 'oi@padaria.test');
  assert.equal(found.instagram, 'https://www.instagram.com/padariacatete');
  assert.equal(found.linkedin, 'https://www.linkedin.com/company/padaria-catete');
});

test('parsePhoton drops a road and keeps the shops', () => {
  const places = parsePhoton({
    features: [
      { geometry: { coordinates: [-43.18, -22.91] }, properties: { name: 'Padaria Catete', osm_key: 'shop', osm_value: 'bakery', city: 'Rio de Janeiro', street: 'Rua do Catete' } },
      { geometry: { coordinates: [-43.19, -22.92] }, properties: { name: 'Padaria Napoles', osm_key: 'shop', city: 'Rio de Janeiro' } },
      { geometry: { coordinates: [-43.2, -22.9] }, properties: { name: 'Rua da Padaria', osm_key: 'highway', city: 'Rio de Janeiro' } },
    ],
  }, 'Rio de Janeiro');
  assert.deepEqual(places.map((place) => place.name), ['Padaria Catete', 'Padaria Napoles']);
  assert.equal(places[0].address, 'Rua do Catete');
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
