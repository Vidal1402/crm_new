import assert from 'node:assert/strict';
import test from 'node:test';
import { canReuseRedeploy } from '../api/redeployGate.ts';

test('a checkpoint without this project id does not skip the Espelho redeploy', () => {
  assert.equal(canReuseRedeploy(null, 'prj_espelho'), false);
  assert.equal(
    canReuseRedeploy({ deployment_id: 'dpl_main', project_id: 'prj_main' }, 'prj_espelho'),
    false,
  );
  assert.equal(canReuseRedeploy({ deployment_id: 'dpl_old' }, 'prj_espelho'), false);
});

test('a checkpoint for this project can be reused', () => {
  assert.equal(
    canReuseRedeploy({ deployment_id: 'dpl_espelho', project_id: 'prj_espelho' }, 'prj_espelho'),
    true,
  );
});
