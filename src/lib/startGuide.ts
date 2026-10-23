import { STORAGE_KEYS } from './constants.ts';

export const TRACKED_STEP_IDS = ['funnel', 'whatsapp', 'team', 'inbox'] as const;
export type TrackedStepId = (typeof TRACKED_STEP_IDS)[number];

export interface GuideStep {
  id: TrackedStepId | 'goals' | 'playbooks' | 'agenda';
  title: string;
  hint: string;
  to: string;
  group: 'core' | 'extra';
  required: boolean;
}

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    id: 'funnel',
    title: 'Criar um funil comercial',
    hint: 'Funil → Gerenciar funis. Sem isso o WhatsApp não consegue jogar leads no kanban.',
    to: '/funil',
    group: 'core',
    required: true,
  },
  {
    id: 'whatsapp',
    title: 'Conectar um número WhatsApp',
    hint: 'Configurações → Credenciais. Zernio (oficial) ou Uazapi (não oficial).',
    to: '/settings/profile',
    group: 'core',
    required: true,
  },
  {
    id: 'team',
    title: 'Convidar a equipe',
    hint: 'Opcional. Configurações → Equipe. O e-mail sai pelo Auth do Supabase.',
    to: '/settings/profile',
    group: 'core',
    required: false,
  },
  {
    id: 'inbox',
    title: 'Receber a primeira mensagem de teste',
    hint: 'De outro celular, envie um WhatsApp para o número conectado e responda na Caixa.',
    to: '/inbox',
    group: 'core',
    required: false,
  },
  {
    id: 'goals',
    title: 'Marcar a meta do período',
    hint: 'Opcional. A tela de metas guarda o número que o time está perseguindo.',
    to: '/metas',
    group: 'extra',
    required: false,
  },
  {
    id: 'playbooks',
    title: 'Ler o roteiro do funil',
    hint: 'Opcional. O playbook descreve o que fazer em cada etapa, sem gravar conclusão.',
    to: '/playbooks',
    group: 'extra',
    required: false,
  },
  {
    id: 'agenda',
    title: 'Deixar a próxima conversa na agenda',
    hint: 'Opcional. A agenda mostra o compromisso; este roteiro não marca presença.',
    to: '/agenda',
    group: 'extra',
    required: false,
  },
];

export type GuideProgress = Record<TrackedStepId, boolean>;

type FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function coreSteps(): GuideStep[] {
  return GUIDE_STEPS.filter((step) => step.group === 'core');
}

export function isTrackedStep(id: GuideStep['id']): id is TrackedStepId {
  return (TRACKED_STEP_IDS as readonly string[]).includes(id);
}

export function countTrackedDone(progress: GuideProgress): { done: number; total: number } {
  const tracked = coreSteps();
  return {
    done: tracked.filter((step) => isTrackedStep(step.id) && progress[step.id]).length,
    total: tracked.length,
  };
}

export function firstOpenTracked(progress: GuideProgress): GuideStep | null {
  return coreSteps().find((step) => isTrackedStep(step.id) && !progress[step.id]) ?? null;
}

export function readFlag(storage: Pick<Storage, 'getItem'> | null, key: string): boolean {
  if (!storage) return false;
  return storage.getItem(key) === '1';
}

export function writeFlag(storage: FlagStorage, key: string, on: boolean): void {
  if (on) storage.setItem(key, '1');
  else storage.removeItem(key);
}

export function guideEnded(storage: Pick<Storage, 'getItem'> | null): boolean {
  return readFlag(storage, STORAGE_KEYS.setupChecklistDismissed);
}

export function noticeDismissed(storage: Pick<Storage, 'getItem'> | null): boolean {
  return readFlag(storage, STORAGE_KEYS.startGuideNoticeDismissed);
}
