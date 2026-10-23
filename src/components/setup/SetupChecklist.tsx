import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Circle, ListChecks, X } from 'lucide-react';
import { useAppUser } from '@/app/providers/AppUserProvider';
import { useSetupProgress, type SetupStepId } from '@/hooks/useSetupProgress';
import { STORAGE_KEYS } from '@/lib/constants';
import { coreSteps, guideEnded, isTrackedStep, writeFlag, type GuideStep } from '@/lib/startGuide';

const STEPS: GuideStep[] = coreSteps();

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return guideEnded(window.localStorage);
}

export function SetupChecklist() {
  const { tenantRole: role } = useAppUser();
  const progress = useSetupProgress();
  const [hidden, setHidden] = useState(isDismissed);

  if (role !== 'admin' || hidden) return null;
  if (progress.loading) return null;

  const done: Record<SetupStepId, boolean> = {
    funnel: progress.funnelReady,
    whatsapp: progress.whatsappReady,
    team: progress.teamReady,
    inbox: progress.inboxReady,
  };
  const requiredDone = STEPS.filter((s) => s.required).every((s) => isTrackedStep(s.id) && done[s.id]);
  if (requiredDone && progress.inboxReady && progress.teamReady) return null;

  const completed = STEPS.filter((s) => isTrackedStep(s.id) && done[s.id]).length;

  const dismiss = () => {
    writeFlag(window.localStorage, STORAGE_KEYS.setupChecklistDismissed, true);
    setHidden(true);
  };

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#E5E7EB]">
            <ListChecks className="h-5 w-5 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Primeiros passos</h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              {completed} de {STEPS.length} concluídos. O deploy já está no ar; falta ligar o uso.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar checklist"
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="space-y-2">
        {STEPS.map((step, index) => {
          const ok = isTrackedStep(step.id) && done[step.id];
          return (
            <li key={step.id}>
              <Link
                to={step.to}
                className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 transition hover:border-[rgba(34,197,94,0.2)]"
              >
                <span className="mt-0.5">
                  {ok ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                      {index + 1}.
                    </span>
                    <span
                      className={`text-sm font-medium ${ok ? 'text-[var(--color-text-secondary)] line-through' : 'text-[var(--color-text-primary)]'}`}
                    >
                      {step.title}
                    </span>
                    {!step.required && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        opcional
                      </span>
                    )}
                  </span>
                  {!ok && (
                    <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">{step.hint}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
