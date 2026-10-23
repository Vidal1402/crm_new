import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PLAN_ORDER, PLANS, formatPlanPrice, type CommercialPlan } from '@/lib/plans';
import { createSaasTenant, listSaasTenants, type SaasTenant } from '@/lib/saas-tenants';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<SaasTenant['status'], string> = {
  active: 'Ativo',
  paused: 'Pausado',
  cancelled: 'Cancelado',
};

export default function SaasTenantsPage() {
  const [tenants, setTenants] = useState<SaasTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<CommercialPlan>('inicial');

  const load = async () => {
    setLoading(true);
    try {
      setTenants(await listSaasTenants());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar os CRMs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    return {
      total: tenants.length,
      active: tenants.filter((t) => t.status === 'active').length,
    };
  }, [tenants]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tenant = await createSaasTenant({ name, owner_email: email, plan });
      setTenants((prev) => [...prev.filter((t) => t.id !== tenant.id), tenant]);
      setOpen(false);
      setName('');
      setEmail('');
      setPlan('inicial');
      toast.success(`CRM de ${tenant.name} criado. Convite enviado para ${tenant.owner_email}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar o CRM.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl glass-card flex items-center justify-center">
            <Building2 className="h-5 w-5 text-[var(--accent-primary)]" />
          </div>
          <div>
            <div className="text-label">Super Admin</div>
            <h1 className="text-2xl font-bold text-display">Clientes</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Crie um CRM isolado por cliente. O dono entra só no workspace dele, com o plano contratado.
            </p>
          </div>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo CRM
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-label">CRMs</div>
          <div className="text-2xl font-semibold mt-1">{counts.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-label">Ativos</div>
          <div className="text-2xl font-semibold mt-1">{counts.active}</div>
        </Card>
        <Card className="p-4 col-span-2 md:col-span-1">
          <div className="text-label">Planos</div>
          <div className="text-sm mt-1 text-[var(--color-text-secondary)]">
            Inicial {formatPlanPrice('inicial')} · Intermediário {formatPlanPrice('intermediario')} ·
            Avançado {formatPlanPrice('avancado')}
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-[var(--color-text-secondary)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : tenants.length === 0 ? (
        <Card className="p-10 text-center text-[var(--color-text-secondary)]">
          Nenhum cliente ainda. Crie o primeiro CRM.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {tenants.map((tenant) => (
            <Link key={tenant.id} to={`/saas/${tenant.id}`} className="block">
              <Card className="p-5 h-full hover:border-[rgba(34,197,94,0.2)] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{tenant.name}</h2>
                    <div className="text-xs text-[var(--color-text-secondary)] mt-1">/{tenant.slug}</div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] uppercase tracking-wide px-2 py-1 rounded-md',
                      tenant.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : tenant.status === 'paused'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-white/10 text-[var(--color-text-secondary)]',
                    )}
                  >
                    {STATUS_LABEL[tenant.status]}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-secondary)]">
                  <span>Plano {PLANS[tenant.plan].name}</span>
                  <span>{tenant.users} usuário{tenant.users === 1 ? '' : 's'}</span>
                </div>
                <div className="mt-2 text-sm truncate">{tenant.owner_email ?? 'Sem dono ainda'}</div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="Criar CRM do cliente"
        description="O dono recebe um convite. Ao entrar, vê só os dados da empresa dele, com as telas do plano."
        widthClass="max-w-2xl"
      >
        <form onSubmit={(e) => void onCreate(e)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="saas-name">Empresa</Label>
            <Input
              id="saas-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da empresa"
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saas-email">E-mail do dono (admin deste CRM)</Label>
            <Input
              id="saas-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dono@cliente.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Plano deste CRM</Label>
            <div className="grid sm:grid-cols-3 gap-3">
              {PLAN_ORDER.map((id) => {
                const p = PLANS[id];
                const selected = plan === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPlan(id)}
                    className={cn(
                      'text-left rounded-xl border p-3 transition-colors',
                      selected
                        ? 'border-[var(--accent-primary)] bg-[#E5E7EB]'
                        : 'border-[#E5E7EB] hover:bg-white',
                    )}
                  >
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                      {formatPlanPrice(id)}/mês
                    </div>
                    <ul className="mt-2 space-y-1 text-[11px] text-[var(--color-text-secondary)]">
                      {p.includes.slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar CRM
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
