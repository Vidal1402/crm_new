import {
  LayoutDashboard,
  Inbox,
  Settings,
  type LucideIcon,
  Building2,
  Shield,
  BookOpen,
  LineChart,
  PieChart,
  MapPin,
  ListChecks,
  FileText,
  Target,
  CalendarDays,
  Compass,
  Users,
  Gauge,
  SquareKanban,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  comingSoon?: boolean;
}

export const PLATFORM_NAV_ITEMS: NavItem[] = [
  { to: '/saas', label: 'Clientes', icon: Building2, comingSoon: true },
  { to: '/saas/admins', label: 'Acesso', icon: Shield, comingSoon: true },
];

export const TOP_NAV_ITEMS: NavItem[] = [
  { to: '/funil', label: 'Funil', icon: SquareKanban },
  { to: '/painel', label: 'Painel', icon: Gauge },
  { to: '/prospeccao', label: 'Prospecção', icon: MapPin },
  { to: '/sala-de-guerra', label: 'Sala de Guerra', icon: LayoutDashboard },
  { to: '/operacao', label: 'Operação', icon: ListChecks },
  { to: '/propostas', label: 'Propostas', icon: FileText },
  { to: '/contacts', label: 'Contatos', icon: Users },
  { to: '/performance', label: 'Performance', icon: LineChart },
  { to: '/indicadores', label: 'Indicadores', icon: PieChart },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/conversas', label: 'Conversas', icon: Inbox },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/playbooks', label: 'Playbooks', icon: BookOpen },
  { to: '/roteiro', label: 'Roteiro', icon: Compass },
  { to: '/settings/profile', label: 'Configurações', icon: Settings },
];

export const NAV_ITEMS: NavItem[] = TOP_NAV_ITEMS;
