import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PLAN_ORDER, PLANS, formatPlanPrice, type CommercialPlan } from '@/lib/plans';
import {
  inviteSaasMember,
  listSaasMembers,
  listSaasTenants,
  revokeSaasMember,
  updateSaasTenant,
  type SaasMember,
  type SaasTenant,
  type TenantStatus,
} from '@/lib/saas-tenants';
import { cn } from '@/lib/utils';

export default function SaasTenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<SaasTenant | null>(null);
  const [members, setMembers] = useState<SaasMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('admin');
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [all, people] = await Promise.all([listSaasTenants(), listSaasMembers(id)]);
      setTenant(all.find((t) => t.id === id) ?? null);
      setMembers(people);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar este CRM.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patch = async (partial: { plan?: CommercialPlan; status?: TenantStatus }) => {
    if (!tenant) return;
    setSaving(true);
    try {
      const next = await updateSaasTenant({ id: tenant.id, ...partial });
      if (next) setTenant(next);
      toast.success('CRM atualizado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar.');
    } finally {
      setSaving(false);
    }
  };

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setInviting(true);
    try {
      await inviteSaasMember({ tenant_id: tenant.id, email, role });
      toast.success(`Convite enviado para ${email}.`);
      setEmail('');
      setMembers(await listSaasMembers(tenant.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível convidar.');
    } finally {
      setInviting(false);
    }
  };

  const onRevoke = async (userId: string) => {
    if (!tenant) return;
    setSaving(true);
    try {
      await revokeSaasMember({ tenant_id: tenant.id, user_id: userId });
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success('Acesso removido.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-[var(--color-text-secondary)]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <p className="text-[var(--color-text-secondary)]">CRM não encontrado.</p>
        <Button type="button" variant="secondary" onClick={() => navigate('/saas')}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/saas"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos os CRMs
      </Link>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl glass-card flex items-center justify-center">
          <Building2 className="h-5 w-5 text-[var(--accent-primary)]" />
        </div>
        <div>
          <div className="text-label">/{tenant.slug}</div>
          <h1 className="text-2xl font-bold text-display">{tenant.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{tenant.owner_email}</p>
        </div>
      </div>

      <Card>
        <div className="text-label">Plano</div>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-4">
          Define quais telas o time deste cliente vê. Inbox, funil e WhatsApp entram no Inicial.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {PLAN_ORDER.map((planId) => {
            const p = PLANS[planId];
            const selected = tenant.plan === planId;
            return (
              <button
                key={planId}
                type="button"
                disabled={saving}
                onClick={() => void patch({ plan: planId })}
                className={cn(
                  'text-left rounded-xl border p-3 transition-colors disabled:opacity-50',
                  selected
                    ? 'border-[var(--accent-primary)] bg-[#E5E7EB]'
                    : 'border-[#E5E7EB] hover:bg-white',
                )}
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {formatPlanPrice(planId)}/mês
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <div className="text-label">Acesso deste CRM</div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Admin do cliente gerencia o workspace. Operador atende. Isso não dá acesso à plataforma.
          </p>
        </div>
        <form onSubmit={(e) => void onInvite(e)} className="grid sm:grid-cols-[1fr_140px_auto] gap-2">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@cliente.com"
          />
          <select
            className="h-11 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'operator')}
          >
            <option value="admin">Admin do CRM</option>
            <option value="operator">Operador</option>
          </select>
          <Button type="submit" disabled={inviting}>
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Dar acesso
          </Button>
        </form>
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm truncate">{m.email ?? m.user_id}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {m.role === 'admin' ? 'Admin do CRM' : 'Operador'}
                  {m.accepted_at ? '' : ' · convite pendente'}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover acesso"
                disabled={saving}
                onClick={() => void onRevoke(m.user_id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {members.length === 0 ? (
            <li className="text-sm text-[var(--color-text-secondary)]">Nenhum usuário neste CRM ainda.</li>
          ) : null}
        </ul>
      </Card>

      <Card className="space-y-3">
        <div className="text-label">Status</div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Pausar ou cancelar não apaga os dados. O cliente continua isolado neste app.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={tenant.status === 'active' ? 'default' : 'secondary'}
            disabled={saving}
            onClick={() => void patch({ status: 'active' })}
          >
            Ativar
          </Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void patch({ status: 'paused' })}>
            Pausar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => void patch({ status: 'cancelled' })}
          >
            Cancelar assinatura
          </Button>
        </div>
      </Card>
    </div>
  );
}
