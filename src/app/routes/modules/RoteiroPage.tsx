import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Circle, Play, X } from 'lucide-react';
import { ModuleHeader } from '@/components/modules/ModuleChrome';
import { Button } from '@/components/ui/button';
import { useAppUser } from '@/app/providers/AppUserProvider';
import { useSetupProgress } from '@/hooks/useSetupProgress';
import { STORAGE_KEYS } from '@/lib/constants';
import {
  GUIDE_STEPS,
  countTrackedDone,
  firstOpenTracked,
  guideEnded,
  isTrackedStep,
  noticeDismissed,
  writeFlag,
  type GuideProgress,
} from '@/lib/startGuide';
import { cn } from '@/lib/utils';

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export default function RoteiroPage() {
  const progress = useSetupProgress();
  const { tenantId } = useAppUser();
  const [ended, setEnded] = useState(() => guideEnded(browserStorage()));
  const [noticeHidden, setNoticeHidden] = useState(() => noticeDismissed(browserStorage()));
  const [openId, setOpenId] = useState<string | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);

  const tracked: GuideProgress = {
    funnel: progress.funnelReady,
    whatsapp: progress.whatsappReady,
    team: progress.teamReady,
    inbox: progress.inboxReady,
  };
  const counts = countTrackedDone(tracked);
  const next = firstOpenTracked(tracked);

  const endGuide = () => {
    const storage = browserStorage();
    if (!storage) return;
    writeFlag(storage, STORAGE_KEYS.setupChecklistDismissed, true);
    setEnded(true);
  };

  const reopen = () => {
    const storage = browserStorage();
    if (!storage) return;
    writeFlag(storage, STORAGE_KEYS.setupChecklistDismissed, false);
    setEnded(false);
  };

  const hideNotice = () => {
    const storage = browserStorage();
    if (!storage) return;
    writeFlag(storage, STORAGE_KEYS.startGuideNoticeDismissed, true);
    setNoticeHidden(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ModuleHeader
        title="Roteiro de entrada"
        subtitle="Os itens começam fechados. Abra só o que for usar agora. Encerrar esconde a lista neste navegador."
      />

      {ended ? (
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <h2 className="text-sm font-medium text-[#111827]">Roteiro encerrado neste navegador</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Suposição: reabrir não avisa o servidor. O registro fica só neste navegador.
          </p>
          <Button type="button" variant="outline" className="mt-4" onClick={reopen}>
            Mostrar de novo
          </Button>
        </section>
      ) : (
        <>
          {noticeHidden ? null : (
            <section className="flex items-start justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div>
                <p className="text-sm font-medium text-[#111827]">Percorra a lista com o time, se quiser.</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Fechar este aviso não encerra o roteiro. Suposição: não há destino externo para este convite.
                </p>
                {next ? (
                  <Link to={next.to} className="mt-3 inline-block text-sm font-medium text-[#111827] underline">
                    Ir para o próximo item em aberto
                  </Link>
                ) : (
                  <p className="mt-3 text-sm text-[#6B7280]">Os itens acompanhados já estão feitos.</p>
                )}
              </div>
              <button type="button" aria-label="Fechar aviso" onClick={hideNotice} className="text-[#6B7280]">
                <X className="h-4 w-4" />
              </button>
            </section>
          )}

          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <button
              type="button"
              className="flex items-center gap-3 text-left"
              aria-expanded={mediaOpen}
              onClick={() => setMediaOpen((open) => !open)}
            >
              <span className="grid h-10 w-10 place-items-center rounded-full border border-[#E5E7EB]">
                <Play className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-[#111827]">Orientação em vídeo</span>
                <span className="block text-xs text-[#6B7280]">O arquivo não foi visto na observação.</span>
              </span>
            </button>
            {mediaOpen ? (
              <p className="mt-4 text-sm leading-relaxed text-[#6B7280]">
                Suposição: esta versão não incorpora um player. O passo a passo está no texto de cada item.
              </p>
            ) : null}
          </section>

          <p className="text-sm text-[#6B7280]">
            {progress.loading
              ? 'Conferindo o que já existe na conta…'
              : `${counts.done} de ${counts.total} itens acompanhados estão feitos. Os extras não entram nessa conta.`}
          </p>

          <ol className="space-y-2">
            {GUIDE_STEPS.map((step, index) => {
              const trackedDone = isTrackedStep(step.id) && tracked[step.id];
              const open = openId === step.id;
              const label = step.group === 'extra' ? 'Extra' : String(index + 1);
              return (
                <li key={step.id} className="rounded-2xl border border-[#E5E7EB] bg-white">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : step.id)}
                  >
                    <span className="w-10 shrink-0 text-xs font-semibold text-[#6B7280]">{label}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm font-medium', trackedDone && 'text-[#6B7280] line-through')}>
                        {step.title}
                      </span>
                    </span>
                    {step.group === 'extra' ? (
                      <span className="text-[11px] text-[#9CA3AF]">sem conferência</span>
                    ) : trackedDone ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-[#D1D5DB]" />
                    )}
                    <ChevronDown className={cn('h-4 w-4 text-[#6B7280] transition', open && 'rotate-180')} />
                  </button>
                  {open ? (
                    <div className="border-t border-[#F3F4F6] px-4 py-3">
                      <p className="text-sm text-[#6B7280]">{step.hint}</p>
                      <Link to={step.to} className="mt-2 inline-block text-sm font-medium text-[#111827] underline">
                        Abrir a tela
                      </Link>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#9CA3AF]">
              {tenantId ? `Conta ${tenantId}` : 'Conta ainda sem identificador nesta sessão.'}
            </p>
            <Button type="button" variant="outline" onClick={endGuide}>
              Encerrar roteiro
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
