import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Loader2, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppUser } from '@/app/providers/AppUserProvider';
import {
  invitePlatformAdmin,
  listPlatformAdmins,
  revokePlatformAdmin,
  type PlatformAdmin,
} from '@/lib/saas-tenants';

export default function SaasAdminsPage() {
  const { userId } = useAppUser();
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setAdmins(await listPlatformAdmins());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar os Super Admins.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await invitePlatformAdmin(email);
      toast.success(`Convite de Super Admin enviado para ${email}.`);
      setEmail('');
      setAdmins(await listPlatformAdmins());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível convidar.');
    } finally {
      setSaving(false);
    }
  };

  const onRevoke = async (id: string) => {
    setSaving(true);
    try {
      await revokePlatformAdmin(id);
      setAdmins((prev) => prev.filter((a) => a.user_id !== id));
      toast.success('Super Admin removido.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl glass-card flex items-center justify-center">
          <Shield className="h-5 w-5 text-[var(--accent-primary)]" />
        </div>
        <div>
          <div className="text-label">Super Admin</div>
          <h1 className="text-2xl font-bold text-display">Acesso à plataforma</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Quem está aqui cria CRMs de clientes. Admin de um cliente não entra nesta área.
          </p>
        </div>
      </div>

      <Card className="space-y-4">
        <form onSubmit={(e) => void onInvite(e)} className="space-y-3">
          <Label htmlFor="platform-email">Convidar Super Admin</Label>
          <div className="flex gap-2">
            <Input
              id="platform-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
            />
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Dar acesso
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <ul className="space-y-2">
            {admins.map((admin) => (
              <li
                key={admin.user_id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm truncate">{admin.email}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {admin.user_id === userId ? 'Você' : 'Super Admin'}
                  </div>
                </div>
                {admin.user_id !== userId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover Super Admin"
                    disabled={saving}
                    onClick={() => void onRevoke(admin.user_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
