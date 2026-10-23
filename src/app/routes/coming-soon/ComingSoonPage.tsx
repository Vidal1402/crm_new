import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { TOP_NAV_ITEMS } from '@/app/layout/nav-config';
import { NotReadyNotice } from '@/components/NotReadyNotice';

export default function ComingSoonPage() {
  const { pathname } = useLocation();
  const item = TOP_NAV_ITEMS.find((n) => n.to === pathname);
  const title = item?.label ?? 'Este módulo';
  const Icon = item?.icon ?? Sparkles;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl glass-card flex items-center justify-center">
          <Icon className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <div className="text-label text-amber-700">Não funciona ainda</div>
          <h1 className="text-2xl font-bold text-display">{title}</h1>
        </div>
      </div>

      <NotReadyNotice title={`${title} ainda não está pronto`}>
        Isto é só o menu. Não há produto, dados nem automação aqui. Use Visão Geral, CRM, Leads,
        Pipeline, Disparos e Configurações — esses sim estão ligados.
      </NotReadyNotice>
    </div>
  );
}
