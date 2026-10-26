import assert from 'node:assert/strict';
import test from 'node:test';
import { inPeriod, mapDeal } from '../src/lib/crmFeed.ts';

test('mapDeal reads the joined contact, stage and pipeline', () => {
  const deal = mapDeal({
    id: 'd1',
    title: 'Contrato',
    value: '1500.50',
    status: 'won',
    owner_id: null,
    created_at: '2026-10-02T12:00:00.000Z',
    contact_id: 'c1',
    pipeline_id: 'p1',
    contact: { name: 'Ana' },
    pipeline: [{ name: 'Comercial' }],
    stage: { name: 'Ganho' },
  });
  assert.equal(deal.contactName, 'Ana');
  assert.equal(deal.pipelineName, 'Comercial');
  assert.equal(deal.stageName, 'Ganho');
  assert.equal(deal.value, 1500.5);
  assert.equal(deal.status, 'won');
});

test('inPeriod keeps the current month and drops the previous one', () => {
  const today = new Date(2026, 9, 20);
  assert.equal(inPeriod('2026-10-03T00:00:00.000Z', 'Este mês', today), true);
  assert.equal(inPeriod('2026-09-03T00:00:00.000Z', 'Este mês', today), false);
});
