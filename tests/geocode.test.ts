import assert from 'node:assert/strict';
import test from 'node:test';
import { knownCity, meteoPoint, photonPoint } from '../src/lib/geocode.ts';

test('photonPoint reads the first longitude and latitude', () => {
  assert.deepEqual(
    photonPoint({ features: [{ geometry: { coordinates: [-46.63, -23.55] } }] }),
    { lng: -46.63, lat: -23.55 },
  );
  assert.equal(photonPoint({ features: [] }), null);
  assert.equal(photonPoint({ features: [{ geometry: { coordinates: [999, 10] } }] }), null);
});

test('meteoPoint prefers the Brazilian city', () => {
  assert.deepEqual(
    meteoPoint({
      results: [
        { latitude: 42.85, longitude: -2.67, country_code: 'ES' },
        { latitude: -20.31944, longitude: -40.33778, country_code: 'BR' },
      ],
    }),
    { lat: -20.31944, lng: -40.33778 },
  );
  assert.equal(meteoPoint({ results: [] }), null);
});

test('knownCity places Rio and Vitória without a request', () => {
  assert.deepEqual(knownCity('Rio de Janeiro'), { lat: -22.9068, lng: -43.1729 });
  assert.deepEqual(knownCity('Vitória'), { lat: -20.3194, lng: -40.3378 });
  assert.equal(knownCity('Cidade Inventada'), null);
});
