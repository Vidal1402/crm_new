export type AppFlavor = 'espelho' | 'producao';

/** Só o projeto crm-unix é o MEGACRM. Qualquer outro deploy, inclusive produção na Vercel, é o Espelho do localhost. */
export function flavorForProject(projectName: string, explicitChannel = ''): AppFlavor {
  const raw = explicitChannel.trim().toLowerCase();
  if (raw === 'producao' || raw === 'production') return 'producao';
  if (raw === 'espelho') return 'espelho';
  return projectName === 'crm-unix' ? 'producao' : 'espelho';
}

export function homePathFor(flavor: AppFlavor, isSuperAdmin: boolean): string {
  if (flavor === 'espelho') return '/funil';
  return isSuperAdmin ? '/saas' : '/funil';
}

export function appFlavor(): AppFlavor {
  const raw = (import.meta.env.VITE_APP_CHANNEL as string | undefined)?.trim().toLowerCase();
  if (raw === 'producao' || raw === 'production') return 'producao';
  if (raw === 'espelho') return 'espelho';
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'crm-unix.vercel.app') return 'producao';
  }
  return 'espelho';
}

export function isCrmEspelho(): boolean {
  return appFlavor() === 'espelho';
}

export function appProductName(): string {
  return isCrmEspelho() ? 'CRM Espelho' : 'MEGACRM';
}

export function appProductHint(): string {
  return isCrmEspelho()
    ? 'Mesmo banco do CRM de produção. Código da branch SaaS.'
    : 'CRM de produção';
}
