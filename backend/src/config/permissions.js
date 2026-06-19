// ─── Catálogo central de permissões do SGMM ─────────────────────────────────
// Cada permissão é uma chave "area.acao". O frontend usa o mesmo catálogo
// para montar a tela de grupos, então mantenha os dois lados em sincronia.

const PERMISSIONS = [
  // Escalas
  { key: 'schedules.view',    area: 'Escalas',     label: 'Ver escalas' },
  { key: 'schedules.manage',  area: 'Escalas',     label: 'Criar e editar escalas' },
  // Minhas escalas (voluntário)
  { key: 'myschedules.view',  area: 'Minhas Escalas', label: 'Ver e responder às próprias escalas' },
  // Tarefas
  { key: 'tasks.view',        area: 'Tarefas',     label: 'Ver tarefas' },
  { key: 'tasks.manage',      area: 'Tarefas',     label: 'Criar e editar tarefas' },
  // Repositório de mídia
  { key: 'media.view',        area: 'Repositório', label: 'Ver repositório de mídia' },
  { key: 'media.upload',      area: 'Repositório', label: 'Enviar e remover mídia' },
  // Relatórios
  { key: 'reports.view',      area: 'Relatórios',  label: 'Ver relatórios' },
  // Usuários e acessos
  { key: 'users.view',        area: 'Usuários',    label: 'Ver lista de usuários' },
  { key: 'users.manage',      area: 'Usuários',    label: 'Criar, editar e remover usuários' },
  { key: 'groups.manage',     area: 'Acessos',     label: 'Gerenciar grupos e níveis de acesso' },
];

const ALL_KEYS = PERMISSIONS.map(p => p.key);

// Permissões padrão por papel, usadas quando o usuário NÃO está em nenhum grupo.
// O admin (master) sempre tem tudo, independente de grupo.
const ROLE_DEFAULTS = {
  admin: [...ALL_KEYS],
  secretaria: [
    'schedules.view', 'schedules.manage',
    'tasks.view', 'tasks.manage',
    'media.view', 'media.upload',
    'reports.view',
    'users.view',
  ],
  pastoral: [
    'schedules.view',
    'tasks.view', 'tasks.manage',
    'media.view',
    'reports.view',
    'users.view',
  ],
  voluntario: [
    'myschedules.view',
    'tasks.view',
    'media.view',
  ],
  editor: [
    'schedules.view',
    'tasks.view', 'tasks.manage',
    'media.view', 'media.upload',
    'myschedules.view',
  ],
};

// Resolve a lista efetiva de permissões de um usuário.
// Regra: admin = tudo. Senão, se tiver groupId válido, usa as permissões do grupo.
// Sem grupo, cai no default do role.
function resolvePermissions(user, groups = []) {
  if (!user) return [];
  if (user.role === 'admin') return [...ALL_KEYS];

  if (user.groupId) {
    const group = groups.find(g => g.id === user.groupId);
    if (group && Array.isArray(group.permissions)) {
      return group.permissions.filter(k => ALL_KEYS.includes(k));
    }
  }
  return ROLE_DEFAULTS[user.role] || [];
}

function hasPermission(user, groups, key) {
  return resolvePermissions(user, groups).includes(key);
}

module.exports = { PERMISSIONS, ALL_KEYS, ROLE_DEFAULTS, resolvePermissions, hasPermission };
