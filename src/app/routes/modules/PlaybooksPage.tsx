import { useMemo, useState } from 'react';
import { ModuleHeader, fieldClass } from '@/components/modules/ModuleChrome';
import { useCrmFeed } from '@/hooks/useCrmFeed';
import { cn } from '@/lib/utils';

export default function PlaybooksPage() {
  const feed = useCrmFeed();
  const [pipelineId, setPipelineId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const activeId = pipelineId || feed.pipelines[0]?.id || '';
  const pipeline = feed.pipelines.find((item) => item.id === activeId);
  const steps = useMemo(
    () => feed.steps.filter((step) => step.pipelineId === activeId).sort((a, b) => a.position - b.position),
    [feed.steps, activeId],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <ModuleHeader title="Playbooks" subtitle="Passos gravados por funil. Só a sessão da conta lê e grava." />
      {feed.error ? <p className="text-sm text-[#DC2626]">{feed.error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {feed.pipelines.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPipelineId(item.id)}
              className={cn('w-full rounded-lg px-3 py-2 text-left text-sm', item.id === activeId ? 'bg-[#111827] text-white' : 'text-[#4B5563] hover:bg-[#F3F4F6]')}
            >
              {item.name}
            </button>
          ))}
        </nav>
        <article className="max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight">{pipeline?.name ?? 'Nenhum funil'}</h2>
          <ol className="mt-6 space-y-8">
            {steps.map((step, index) => (
              <li key={step.id}>
                <h3 className="text-sm font-medium">{index + 1}. {step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">{step.body}</p>
              </li>
            ))}
            {steps.length === 0 ? <li className="text-sm text-[#6B7280]">Este funil ainda não tem passos.</li> : null}
          </ol>
          <form
            className="mt-8 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!activeId || !title.trim()) return;
              void feed.addStep(activeId, title.trim(), body.trim());
              setTitle('');
              setBody('');
            }}
          >
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título do passo" className={fieldClass} />
            <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="O que a equipe faz neste passo" className="min-h-24 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white">Gravar passo</button>
          </form>
        </article>
      </div>
    </div>
  );
}
