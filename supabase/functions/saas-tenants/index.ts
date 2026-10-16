// Console Super Admin: CRMs por plano, acesso de clientes e Super Admins.
// Somente JWT role=super_admin (ou linha em platform_admins).

import { requireSuperAdmin, AuthError } from '../_shared/auth.ts';
import { getAdminClient, getAuthAdminClient } from '../_shared/supabase-admin.ts';
import { getCredential, setCredential } from '../_shared/credentials.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';

const PLANS = new Set(['inicial', 'intermediario', 'avancado']);
const STATUSES = new Set(['active', 'paused', 'cancelled']);

type PlanId = 'inicial' | 'intermediario' | 'avancado';
type TenantStatus = 'active' | 'paused' | 'cancelled';

function slugify(raw: string): string {
  const s = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'cliente';
}

function isValidEmail(email: string): boolean {
  return email.length > 3 && email.length <= 254 && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email);
}

function isValidAppUrl(u: string): boolean {
  return /^https:\/\/[^\s/]+\.[^\s/]+/.test(u) && !/localhost|127\.0\.0\.1/i.test(u);
}

async function resolveRedirect(bodyUrl: string | undefined): Promise<string | undefined> {
  const credUrl = (await getCredential('app_url'))?.replace(/\/$/, '') || '';
  const trimmed = (bodyUrl ?? '').trim().replace(/\/$/, '');
  const appUrl = (isValidAppUrl(trimmed) ? trimmed : '') || (isValidAppUrl(credUrl) ? credUrl : '');
  if (appUrl && appUrl !== credUrl) {
    try {
      await setCredential('app_url', appUrl);
    } catch (err) {
      console.error('saas-tenants: failed to persist app_url', err);
    }
  }
  return appUrl ? `${appUrl}/invite` : undefined;
}

async function listTenants() {
  const db = getAdminClient();
  const { data: tenants, error } = await db
    .from('tenants')
    .select('id, slug, name, status, owner_email, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const { data: subs } = await db.from('tenant_subscriptions').select('tenant_id, plan_id, status');
  const { data: users } = await db.from('app_users').select('tenant_id');

  const subByTenant = new Map((subs ?? []).map((s: { tenant_id: string; plan_id: string; status: string }) => [s.tenant_id, s]));
  const countByTenant = new Map<string, number>();
  for (const row of users ?? []) {
    const tid = (row as { tenant_id: string }).tenant_id;
    countByTenant.set(tid, (countByTenant.get(tid) ?? 0) + 1);
  }

  return (tenants ?? []).map((t: {
    id: string;
    slug: string;
    name: string;
    status: string;
    owner_email: string | null;
    created_at: string;
  }) => {
    const sub = subByTenant.get(t.id);
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      owner_email: t.owner_email,
      created_at: t.created_at,
      plan: sub?.plan_id ?? 'inicial',
      subscription_status: sub?.status ?? t.status,
      users: countByTenant.get(t.id) ?? 0,
    };
  });
}

async function createTenant(body: {
  name?: string;
  slug?: string;
  owner_email?: string;
  plan?: string;
  app_url?: string;
}) {
  const name = (body.name ?? '').trim();
  const ownerEmail = (body.owner_email ?? '').trim().toLowerCase();
  const plan = (body.plan ?? 'inicial') as PlanId;
  if (name.length < 2 || name.length > 80) {
    return jsonResponse({ ok: false, error: 'Informe o nome da empresa (2 a 80 caracteres).' }, { status: 400 });
  }
  if (!isValidEmail(ownerEmail)) {
    return jsonResponse({ ok: false, error: 'E-mail do dono inválido.' }, { status: 400 });
  }
  if (!PLANS.has(plan)) {
    return jsonResponse({ ok: false, error: 'Plano inválido.' }, { status: 400 });
  }

  let slug = slugify(body.slug?.trim() || name);
  const db = getAdminClient();
  const auth = getAuthAdminClient();

  for (let i = 0; i < 8; i++) {
    const { data: clash } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
    if (!clash) break;
    slug = `${slugify(name).slice(0, 32)}-${i + 2}`;
  }

  const { data: tenant, error: tenantErr } = await db
    .from('tenants')
    .insert({ slug, name, status: 'active', owner_email: ownerEmail })
    .select('id, slug, name, status, owner_email, created_at')
    .single();
  if (tenantErr || !tenant) {
    return jsonResponse(
      { ok: false, error: tenantErr?.message ?? 'Não foi possível criar o CRM.' },
      { status: 400 },
    );
  }

  const tenantId = (tenant as { id: string }).id;

  const { error: subErr } = await db.from('tenant_subscriptions').insert({
    tenant_id: tenantId,
    plan_id: plan,
    status: 'active',
  });
  if (subErr) {
    await db.from('tenants').delete().eq('id', tenantId);
    return jsonResponse({ ok: false, error: subErr.message }, { status: 400 });
  }

  const { error: seedErr } = await db.rpc('seed_tenant_workspace', { p_tenant: tenantId });
  if (seedErr) {
    console.error('saas-tenants seed', seedErr);
  }

  const redirectTo = await resolveRedirect(body.app_url);
  const { data: invited, error: inviteErr } = await auth.auth.admin.inviteUserByEmail(ownerEmail, {
    data: {
      invited_role: 'admin',
      invited_to_tenant: tenantId,
    },
    ...(redirectTo ? { redirectTo } : {}),
  });

  if (inviteErr) {
    const raw = inviteErr.message ?? '';
    let userMessage = raw;
    if (/already.*registered|User already registered/i.test(raw)) {
      userMessage = 'Já existe um usuário com esse e-mail. Use outro e-mail para o dono deste CRM.';
    } else if (/invalid email|invalid format/i.test(raw)) {
      userMessage = 'E-mail do dono inválido.';
    }
    await db.from('tenants').delete().eq('id', tenantId);
    return jsonResponse({ ok: false, error: userMessage }, { status: inviteErr.status ?? 400 });
  }

  return jsonResponse({
    ok: true,
    tenant: {
      id: tenantId,
      slug: (tenant as { slug: string }).slug,
      name,
      status: 'active',
      owner_email: ownerEmail,
      created_at: (tenant as { created_at: string }).created_at,
      plan,
      subscription_status: 'active',
      users: invited.user?.id ? 1 : 0,
    },
  });
}

async function updateTenant(body: { id?: string; status?: string; plan?: string }) {
  const id = body.id ?? '';
  if (!id) return jsonResponse({ ok: false, error: 'id obrigatório.' }, { status: 400 });

  const db = getAdminClient();
  const { data: existing } = await db.from('tenants').select('id, slug').eq('id', id).maybeSingle();
  if (!existing) return jsonResponse({ ok: false, error: 'CRM não encontrado.' }, { status: 404 });

  if (body.status) {
    if (!STATUSES.has(body.status)) {
      return jsonResponse({ ok: false, error: 'Status inválido.' }, { status: 400 });
    }
    const status = body.status as TenantStatus;
    const { error } = await db.from('tenants').update({ status }).eq('id', id);
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 400 });
    await db.from('tenant_subscriptions').update({ status, updated_at: new Date().toISOString() }).eq('tenant_id', id);
  }

  if (body.plan) {
    if (!PLANS.has(body.plan)) {
      return jsonResponse({ ok: false, error: 'Plano inválido.' }, { status: 400 });
    }
    const plan = body.plan as PlanId;
    const { error } = await db
      .from('tenant_subscriptions')
      .update({ plan_id: plan, updated_at: new Date().toISOString() })
      .eq('tenant_id', id);
    if (error) return jsonResponse({ ok: false, error: error.message }, { status: 400 });
    await db.from('app_users').update({ commercial_plan: plan }).eq('tenant_id', id);
  }

  const all = await listTenants();
  return jsonResponse({ ok: true, tenant: all.find((t) => t.id === id) ?? null });
}

async function listMembers(tenantId: string) {
  const db = getAdminClient();
  const auth = getAuthAdminClient();
  const { data: rows, error } = await db
    .from('app_users')
    .select('user_id, role, accepted_at, commercial_plan')
    .eq('tenant_id', tenantId);
  if (error) throw error;

  const members = [];
  for (const row of rows ?? []) {
    const r = row as { user_id: string; role: string; accepted_at: string | null; commercial_plan: string };
    const { data } = await auth.auth.admin.getUserById(r.user_id);
    members.push({
      user_id: r.user_id,
      role: r.role,
      accepted_at: r.accepted_at,
      commercial_plan: r.commercial_plan,
      email: data.user?.email ?? null,
    });
  }
  return members;
}

function inviteMessage(raw: string): string {
  if (/already.*registered|User already registered/i.test(raw)) {
    return 'Já existe um usuário com esse e-mail.';
  }
  if (/invalid email|invalid format/i.test(raw)) return 'E-mail inválido.';
  if (/rate limit/i.test(raw)) return 'Muitos convites. Aguarde e tente de novo.';
  return raw || 'Não foi possível enviar o convite.';
}

async function inviteToTenant(body: {
  tenant_id?: string;
  email?: string;
  role?: string;
  app_url?: string;
}) {
  const tenantId = body.tenant_id ?? '';
  const email = (body.email ?? '').trim().toLowerCase();
  const role = body.role === 'admin' ? 'admin' : body.role === 'operator' ? 'operator' : '';
  if (!tenantId) return jsonResponse({ ok: false, error: 'tenant_id obrigatório.' }, { status: 400 });
  if (!isValidEmail(email)) return jsonResponse({ ok: false, error: 'E-mail inválido.' }, { status: 400 });
  if (!role) return jsonResponse({ ok: false, error: 'Papel inválido (admin ou operator).' }, { status: 400 });

  const db = getAdminClient();
  const { data: tenant } = await db.from('tenants').select('id').eq('id', tenantId).maybeSingle();
  if (!tenant) return jsonResponse({ ok: false, error: 'CRM não encontrado.' }, { status: 404 });

  const redirectTo = await resolveRedirect(body.app_url);
  const { data, error } = await getAuthAdminClient().auth.admin.inviteUserByEmail(email, {
    data: { invited_role: role, invited_to_tenant: tenantId },
    ...(redirectTo ? { redirectTo } : {}),
  });
  if (error) {
    return jsonResponse({ ok: false, error: inviteMessage(error.message ?? '') }, { status: error.status ?? 400 });
  }
  return jsonResponse({ ok: true, user_id: data.user?.id ?? null, email, role });
}

async function revokeMember(body: { tenant_id?: string; user_id?: string }, callerId: string) {
  const tenantId = body.tenant_id ?? '';
  const userId = (body.user_id ?? '').trim();
  if (!tenantId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return jsonResponse({ ok: false, error: 'tenant_id e user_id obrigatórios.' }, { status: 400 });
  }
  if (userId === callerId) {
    return jsonResponse({ ok: false, error: 'Você não pode remover a si mesmo.' }, { status: 400 });
  }

  const db = getAdminClient();
  const { data: member } = await db
    .from('app_users')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!member) return jsonResponse({ ok: false, error: 'Usuário não pertence a este CRM.' }, { status: 404 });

  await db.from('app_users').delete().eq('user_id', userId);
  const { error } = await getAuthAdminClient().auth.admin.deleteUser(userId);
  if (error) return jsonResponse({ ok: false, error: error.message }, { status: 400 });
  return jsonResponse({ ok: true, user_id: userId });
}

async function listPlatformAdmins() {
  const { data, error } = await getAdminClient()
    .from('platform_admins')
    .select('user_id, email, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function invitePlatformAdmin(body: { email?: string; app_url?: string }) {
  const email = (body.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) return jsonResponse({ ok: false, error: 'E-mail inválido.' }, { status: 400 });

  const redirectTo = await resolveRedirect(body.app_url);
  const { data, error } = await getAuthAdminClient().auth.admin.inviteUserByEmail(email, {
    data: { invited_role: 'super_admin' },
    ...(redirectTo ? { redirectTo } : {}),
  });
  if (error) {
    return jsonResponse({ ok: false, error: inviteMessage(error.message ?? '') }, { status: error.status ?? 400 });
  }
  return jsonResponse({ ok: true, user_id: data.user?.id ?? null, email });
}

async function revokePlatformAdmin(body: { user_id?: string }, callerId: string) {
  const userId = (body.user_id ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return jsonResponse({ ok: false, error: 'user_id inválido.' }, { status: 400 });
  }
  if (userId === callerId) {
    return jsonResponse({ ok: false, error: 'Você não pode remover o próprio Super Admin.' }, { status: 400 });
  }
  const db = getAdminClient();
  const { count } = await db.from('platform_admins').select('user_id', { count: 'exact', head: true });
  if ((count ?? 0) <= 1) {
    return jsonResponse({ ok: false, error: 'Precisa restar pelo menos um Super Admin.' }, { status: 400 });
  }
  await db.from('platform_admins').delete().eq('user_id', userId);
  await getAuthAdminClient().auth.admin.updateUserById(userId, {
    app_metadata: { role: 'operator' },
  });
  return jsonResponse({ ok: true, user_id: userId });
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const caller = await requireSuperAdmin(req);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = typeof body.action === 'string' ? body.action : 'list';

    if (action === 'list') {
      const tenants = await listTenants();
      return jsonResponse({ ok: true, tenants, live: true });
    }
    if (action === 'create') {
      return await createTenant(body as {
        name?: string;
        slug?: string;
        owner_email?: string;
        plan?: string;
        app_url?: string;
      });
    }
    if (action === 'update') {
      return await updateTenant(body as { id?: string; status?: string; plan?: string });
    }
    if (action === 'members') {
      const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id : '';
      if (!tenantId) return jsonResponse({ ok: false, error: 'tenant_id obrigatório.' }, { status: 400 });
      const members = await listMembers(tenantId);
      return jsonResponse({ ok: true, members });
    }
    if (action === 'invite') {
      return await inviteToTenant(body as { tenant_id?: string; email?: string; role?: string; app_url?: string });
    }
    if (action === 'revoke') {
      return await revokeMember(body as { tenant_id?: string; user_id?: string }, caller.userId);
    }
    if (action === 'list_platform_admins') {
      const admins = await listPlatformAdmins();
      return jsonResponse({ ok: true, admins });
    }
    if (action === 'invite_platform_admin') {
      return await invitePlatformAdmin(body as { email?: string; app_url?: string });
    }
    if (action === 'revoke_platform_admin') {
      return await revokePlatformAdmin(body as { user_id?: string }, caller.userId);
    }

    return jsonResponse({ ok: false, error: 'Ação inválida.' }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResponse({ ok: false, error: err.message }, { status: err.status });
    }
    console.error('saas-tenants error', err);
    return jsonResponse(
      { ok: false, error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    );
  }
});
