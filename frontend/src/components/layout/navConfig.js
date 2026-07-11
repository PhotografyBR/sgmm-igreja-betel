import {
  LayoutDashboard, CalendarDays, CalendarCheck, CheckSquare,
  FolderOpen, BarChart3, Users, ShieldCheck, UserCircle, ScrollText,
} from 'lucide-react';

// Definição única de navegação. Cada item pode exigir uma permissão (perm).
// Sem perm = visível para qualquer usuário logado.
// "mobile: true" marca os itens que aparecem na barra inferior do celular.
export const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { to: '/',      icon: LayoutDashboard, label: 'Dashboard',       mobile: true },
      { to: '/escalas',        icon: CalendarDays,    label: 'Escalas',          perm: 'schedules.view', mobile: true },
      { to: '/minhas-escalas', icon: CalendarCheck,   label: 'Minhas Escalas',   perm: 'myschedules.view', mobile: true },
      { to: '/tarefas',        icon: CheckSquare,     label: 'Tarefas',          perm: 'tasks.view', mobile: true },
      { to: '/midias',    icon: FolderOpen,      label: 'Repositório',      perm: 'media.view', mobile: true },
      { to: '/relatorios',     icon: BarChart3,       label: 'Relatórios',       perm: 'reports.view' },
    ],
  },
  {
    label: 'Conta',
    items: [
      { to: '/usuarios', icon: Users,       label: 'Usuários', perm: 'users.view' },
      { to: '/grupos',   icon: ShieldCheck, label: 'Grupos',   perm: 'groups.manage' },
      { to: '/logs',     icon: ScrollText,  label: 'Log de Uso', adminOnly: true },
      { to: '/perfil',   icon: UserCircle,  label: 'Meu Perfil', mobile: true },
    ],
  },
];

// Um item é visível se: não exige nada, ou o usuário tem a permissão,
// ou (adminOnly) o usuário é o admin master.
function podeVer(item, can, isAdmin) {
  if (item.adminOnly) return !!isAdmin;
  return !item.perm || can(item.perm);
}

// Resolve quais itens o usuário pode ver, com base no helper can().
export function visibleSections(can, isAdmin = false) {
  return NAV_SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => podeVer(item, can, isAdmin)),
    }))
    .filter(section => section.items.length > 0);
}

// Lista plana só com os itens marcados para o mobile que o usuário pode ver.
export function mobileItems(can, isAdmin = false) {
  return NAV_SECTIONS
    .flatMap(s => s.items)
    .filter(item => item.mobile && podeVer(item, can, isAdmin));
}
