import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { withTenant } from '@/lib/tenantWrite';
import {
  mapContact,
  mapDeal,
  type FeedActivity,
  type FeedContact,
  type FeedDeal,
  type FeedGoal,
  type FeedRule,
  type FeedStep,
} from '@/lib/crmFeed';

const DEAL_SELECT =
  'id, title, value, status, owner_id, created_at, contact_id, pipeline_id, contact:contact_id(name), pipeline:pipeline_id(name), stage:stage_id(name)';

function missingTable(message: string): boolean {
  return /does not exist|schema cache|Could not find the table/i.test(message);
}

export function useCrmFeed() {
  const [deals, setDeals] = useState<FeedDeal[]>([]);
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [contacts, setContacts] = useState<FeedContact[]>([]);
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [goals, setGoals] = useState<FeedGoal[]>([]);
  const [steps, setSteps] = useState<FeedStep[]>([]);
  const [rules, setRules] = useState<FeedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    const supabase = getSupabase();
    const [dealRes, actRes, contactRes, pipeRes, goalRes, stepRes, ruleRes, tagRes] = await Promise.all([
      supabase.from('deals').select(DEAL_SELECT).order('created_at', { ascending: false }).limit(500),
      supabase
        .from('crm_activities')
        .select('id, title, type, due_at, done, body, owner_id, contact:contact_id(name), deal:deal_id(pipeline:pipeline_id(name))')
        .order('due_at', { ascending: true })
        .limit(500),
      supabase.from('contacts').select('id, name, phone, email, kind, source, custom_fields').order('updated_at', { ascending: false }).limit(500),
      supabase.from('pipelines').select('id, name').eq('kind', 'comercial').order('position'),
      supabase.from('pipeline_goals').select('pipeline_id, month, target_count'),
      supabase.from('playbook_steps').select('id, pipeline_id, title, body, position').order('position'),
      supabase.from('follow_up_rules').select('id, delay_hours, sequence_order, is_active, trigger_condition').order('sequence_order'),
      supabase.from('contact_tags').select('contact_id, tag:tag_id(name)'),
    ]);

    const hard = [dealRes.error, actRes.error, contactRes.error, pipeRes.error].find(Boolean);
    if (hard) {
      setError(hard.message);
      setLoading(false);
      return;
    }

    const tagsByContact = new Map<string, { name: string }[]>();
    for (const row of (tagRes.data ?? []) as Array<{ contact_id: string; tag: { name: string } | { name: string }[] | null }>) {
      const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag;
      if (!tag) continue;
      const list = tagsByContact.get(row.contact_id) ?? [];
      list.push(tag);
      tagsByContact.set(row.contact_id, list);
    }

    setDeals((dealRes.data ?? []).map((row) => mapDeal(row as never)));
    setActivities(
      ((actRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const contact = row.contact as { name: string | null } | { name: string | null }[] | null;
        const deal = row.deal as { pipeline: { name: string } | { name: string }[] | null } | null;
        const pipeline = Array.isArray(deal?.pipeline) ? deal?.pipeline[0] : deal?.pipeline;
        const person = Array.isArray(contact) ? contact[0] : contact;
        return {
          id: String(row.id),
          title: String(row.title || 'Tarefa'),
          type: String(row.type || 'task'),
          dueAt: (row.due_at as string | null) ?? null,
          done: Boolean(row.done),
          body: String(row.body || ''),
          contactName: person?.name || 'Sem contato',
          pipelineName: pipeline?.name || '',
          ownerId: (row.owner_id as string | null) ?? null,
        };
      }),
    );
    setContacts(
      ((contactRes.data ?? []) as Array<Record<string, unknown>>).map((row) =>
        mapContact({
          id: String(row.id),
          name: (row.name as string | null) ?? null,
          phone: (row.phone as string | null) ?? null,
          email: (row.email as string | null) ?? null,
          kind: (row.kind as string | null) ?? null,
          source: (row.source as string | null) ?? null,
          custom_fields: (row.custom_fields as Record<string, unknown> | null) ?? {},
          tags: tagsByContact.get(String(row.id)) ?? [],
        }),
      ),
    );
    setPipelines((pipeRes.data ?? []) as { id: string; name: string }[]);
    setGoals(
      goalRes.error && missingTable(goalRes.error.message)
        ? []
        : ((goalRes.data ?? []) as Array<{ pipeline_id: string; month: string; target_count: number }>).map((row) => ({
            pipelineId: row.pipeline_id,
            month: row.month.slice(0, 7),
            target: row.target_count,
          })),
    );
    setSteps(
      stepRes.error && missingTable(stepRes.error.message)
        ? []
        : ((stepRes.data ?? []) as Array<{ id: string; pipeline_id: string; title: string; body: string; position: number }>).map((row) => ({
            id: row.id,
            pipelineId: row.pipeline_id,
            title: row.title,
            body: row.body,
            position: row.position,
          })),
    );
    setRules(
      ruleRes.error
        ? []
        : ((ruleRes.data ?? []) as Array<{ id: string; delay_hours: number; sequence_order: number; is_active: boolean; trigger_condition: string }>).map((row) => ({
            id: row.id,
            delayHours: row.delay_hours,
            sequence: row.sequence_order,
            active: row.is_active,
            trigger: row.trigger_condition,
          })),
    );
    if (goalRes.error && !missingTable(goalRes.error.message)) setError(goalRes.error.message);
    if (stepRes.error && !missingTable(stepRes.error.message)) setError(stepRes.error.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setActivityDone = useCallback(async (id: string, done: boolean, body?: string) => {
    const supabase = getSupabase();
    const patch: { done: boolean; body?: string } = { done };
    if (body !== undefined) patch.body = body;
    const { error: err } = await supabase.from('crm_activities').update(patch).eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    setActivities((rows) => rows.map((row) => (row.id === id ? { ...row, done, body: body ?? row.body } : row)));
  }, []);

  const addMeeting = useCallback(async (input: { title: string; dueAt: string; contactName: string }) => {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const payload = await withTenant({
      title: input.title,
      type: 'meeting',
      due_at: input.dueAt,
      done: false,
      body: 'Pendente',
      owner_id: userData.user?.id ?? null,
    });
    const { error: err } = await supabase.from('crm_activities').insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    await reload();
  }, [reload]);

  const addContact = useCallback(async (input: { name: string; phone: string; email?: string; city?: string; address?: string; list?: string }) => {
    const supabase = getSupabase();
    const payload = await withTenant({
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      kind: 'lead',
      custom_fields: { city: input.city || '', address: input.address || '' },
    });
    const { data, error: err } = await supabase.from('contacts').insert(payload).select('id').single();
    if (err || !data) {
      setError(err?.message ?? 'Não foi possível gravar o contato.');
      return;
    }
    if (input.list) {
      const tagPayload = await withTenant({ name: input.list, color: '#111827' });
      const { data: tag } = await supabase.from('tags').upsert(tagPayload, { onConflict: 'tenant_id,name' }).select('id').single();
      if (tag) {
        await supabase.from('contact_tags').insert(await withTenant({ contact_id: data.id, tag_id: tag.id }));
      }
    }
    await reload();
  }, [reload]);

  const setGoal = useCallback(async (pipelineId: string, month: string, target: number) => {
    const supabase = getSupabase();
    const payload = await withTenant({
      pipeline_id: pipelineId,
      month: `${month}-01`,
      target_count: target,
    });
    const { error: err } = await supabase.from('pipeline_goals').upsert(payload, { onConflict: 'pipeline_id,month' });
    if (err) {
      setError(err.message);
      return;
    }
    await reload();
  }, [reload]);

  const addStep = useCallback(async (pipelineId: string, title: string, body: string) => {
    const supabase = getSupabase();
    const position = steps.filter((step) => step.pipelineId === pipelineId).length;
    const payload = await withTenant({ pipeline_id: pipelineId, title, body, position });
    const { error: err } = await supabase.from('playbook_steps').insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    await reload();
  }, [reload, steps]);

  return {
    deals,
    activities,
    contacts,
    pipelines,
    goals,
    steps,
    rules,
    loading,
    error,
    reload,
    setActivityDone,
    addMeeting,
    addContact,
    setGoal,
    addStep,
  };
}
