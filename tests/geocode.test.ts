import assert from 'node:assert/strict';
import test from 'node:test';
import { photonPoint } from '../src/lib/geocode.ts';

test('photonPoint reads the first longitude and latitude', () => {
  assert.deepEqual(
    photonPoint({ features: [{ geometry: { coordinates: [-46.63, -23.55] } }] }),
    { lng: -46.63, lat: -23.55 },
  );
  assert.equal(photonPoint({ features: [] }), null);
  assert.equal(photonPoint({ features: [{ geometry: { coordinates: [999, 10] } }] }), null);
});
