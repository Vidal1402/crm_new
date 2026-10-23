import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countTrackedDone,
  firstOpenTracked,
  guideEnded,
  noticeDismissed,
  writeFlag,
  type GuideProgress,
} from '../src/lib/startGuide.ts';
import { STORAGE_KEYS } from '../src/lib/constants.ts';

function memory() {
  const bag = new Map<string, string>();
  return {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => {
      bag.set(key, value);
    },
    removeItem: (key: string) => {
      bag.delete(key);
    },
  };
}

const empty: GuideProgress = {
  funnel: false,
  whatsapp: false,
  team: false,
  inbox: false,
};

test('itens extras não entram na conta do roteiro', () => {
  const counts = countTrackedDone({ ...empty, funnel: true, whatsapp: true });
  assert.deepEqual(counts, { done: 2, total: 4 });
});

test('o próximo item é o primeiro acompanhado ainda aberto', () => {
  const next = firstOpenTracked({ ...empty, funnel: true });
  assert.equal(next?.id, 'whatsapp');
  assert.equal(firstOpenTracked({ funnel: true, whatsapp: true, team: true, inbox: true }), null);
});

test('encerrar o roteiro não fecha o aviso, e reabrir só limpa o encerramento', () => {
  const storage = memory();
  writeFlag(storage, STORAGE_KEYS.startGuideNoticeDismissed, true);
  writeFlag(storage, STORAGE_KEYS.setupChecklistDismissed, true);
  assert.equal(guideEnded(storage), true);
  assert.equal(noticeDismissed(storage), true);
  writeFlag(storage, STORAGE_KEYS.setupChecklistDismissed, false);
  assert.equal(guideEnded(storage), false);
  assert.equal(noticeDismissed(storage), true);
});
