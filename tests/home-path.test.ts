import assert from 'node:assert/strict';
import test from 'node:test';
import { flavorForProject, homePathFor } from '../src/lib/app-flavor.ts';

test('crm-new stays the localhost Espelho and opens the funnel', () => {
  assert.equal(flavorForProject('crm-new', ''), 'espelho');
  assert.equal(flavorForProject('crm-unix', ''), 'producao');
  assert.equal(homePathFor('espelho', true), '/funil');
  assert.equal(homePathFor('producao', true), '/saas');
});
