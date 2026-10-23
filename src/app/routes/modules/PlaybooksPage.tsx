import { useMemo, useState } from 'react';
import { ModuleHeader, fieldClass } from '@/components/modules/ModuleChrome';
import { MOCK_PLAYBOOKS, MOCK_PROFILES } from '@/lib/mock/modules';
import { cn } from '@/lib/utils';

export default function PlaybooksPage() {
  const [profile, setProfile] = useState(MOCK_PROFILES[0].id);
  const allowed: readonly string[] =
    MOCK_PROFILES.find((p) => p.id === profile)?.funnels ?? MOCK_PLAYBOOKS.map((p) => p.funnel);
  const visible = useMemo(() => MOCK_PLAYBOOKS.filter((p) => allowed.includes(p.funnel)), [allowed]);
  const [activeFunnel, setActiveFunnel] = useState(visible[0]?.funnel ?? MOCK_PLAYBOOKS[0].funnel);
  const pb = MOCK_PLAYBOOKS.find((p) => p.funnel === activeFunnel && allowed.includes(p.funnel)) ?? visible[0];
  const locked = MOCK_PLAYBOOKS.filter((p) => !allowed.includes(p.funnel));

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader
        title="Playbooks"
        subtitle="O que vale para o funil em que você atua."
        extra={
          <select
            value={profile}
            onChange={(e) => {
              setProfile(e.target.value);
              const next = MOCK_PROFILES.find((p) => p.id === e.target.value);
              if (next) setActiveFunnel(next.funnels[0]);
            }}
            className={fieldClass}
          >
            {MOCK_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {visible.map((p) => (
            <button
              key={p.funnel}
              type="button"
              onClick={() => setActiveFunnel(p.funnel)}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-left text-sm',
                p.funnel === pb?.funnel ? 'bg-[#111827] text-white' : 'text-[#4B5563] hover:bg-[#F3F4F6]',
              )}
            >
              {p.funnel}
            </button>
          ))}
          {locked.map((p) => (
            <div key={p.funnel} className="px-3 py-2 text-sm text-[#D1D5DB]">
              {p.funnel}
            </div>
          ))}
        </nav>
        {pb ? (
          <article className="max-w-2xl">
            <p className="text-[12px] text-[#6B7280]">{pb.owner}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{pb.funnel}</h2>
            <ol className="mt-6 space-y-8">
              {pb.sections.map((s, i) => (
                <li key={s.title}>
                  <h3 className="text-sm font-medium">
                    {i + 1}. {s.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">{s.body}</p>
                </li>
              ))}
            </ol>
          </article>
        ) : null}
      </div>
    </div>
  );
}
