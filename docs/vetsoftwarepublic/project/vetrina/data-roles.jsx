/* Roles & Permissions mock data */

const VET_MODULES = [
  { id: 1, name: 'Clínica' },
  { id: 2, name: 'Catálogos' },
  { id: 3, name: 'Administración' },
];

const VET_SUB_MODULES = [
  // Clínica
  { id: 11, name: 'Consultas',           module: { id: 1, name: 'Clínica' } },
  { id: 12, name: 'Historial clínico',   module: { id: 1, name: 'Clínica' } },
  { id: 13, name: 'Vacunación',          module: { id: 1, name: 'Clínica' } },
  { id: 14, name: 'Laboratorio',         module: { id: 1, name: 'Clínica' } },
  { id: 15, name: 'Imagen diagnóstica',  module: { id: 1, name: 'Clínica' } },
  { id: 16, name: 'Cirugía',             module: { id: 1, name: 'Clínica' } },
  { id: 17, name: 'Hospitalización',     module: { id: 1, name: 'Clínica' } },
  { id: 18, name: 'Desparasitación',     module: { id: 1, name: 'Clínica' } },
  { id: 19, name: 'Planes terapéuticos',  module: { id: 1, name: 'Clínica' } },
  // Catálogos
  { id: 21, name: 'Pacientes',           module: { id: 2, name: 'Catálogos' } },
  { id: 22, name: 'Propietarios',        module: { id: 2, name: 'Catálogos' } },
  { id: 23, name: 'Tipos de consulta',   module: { id: 2, name: 'Catálogos' } },
  { id: 24, name: 'Tipos de vacuna',     module: { id: 2, name: 'Catálogos' } },
  // Administración
  { id: 31, name: 'Empleados',           module: { id: 3, name: 'Administración' } },
  { id: 32, name: 'Roles y permisos',    module: { id: 3, name: 'Administración' } },
  { id: 33, name: 'Configuración',       module: { id: 3, name: 'Administración' } },
  { id: 34, name: 'Reportes',            module: { id: 3, name: 'Administración' } },
];

// Build permissions: for each submodule, generate Ver/Crear/Editar/Eliminar permissions
const VET_PERMISSIONS = (() => {
  const out = [];
  let id = 1000;
  for (const sub of VET_SUB_MODULES) {
    for (const verb of ['Ver', 'Crear', 'Editar', 'Eliminar']) {
      out.push({
        id: ++id,
        name: `${verb} ${sub.name.toLowerCase()}`,
        subModule: { id: sub.id, name: sub.name },
      });
    }
  }
  return out;
})();

// Helpers for catalog lookup
function vetPermsBySubModule(subId) {
  return VET_PERMISSIONS.filter((p) => p.subModule.id === subId);
}

function vetMakeRolePerms(subIds, verbs = null) {
  // Returns permission objects for a role.
  // verbs = null → all 4; or e.g. ['Ver', 'Crear']
  const out = [];
  for (const sub of subIds) {
    const perms = vetPermsBySubModule(sub);
    for (const p of perms) {
      if (verbs && !verbs.some((v) => p.name.startsWith(v))) continue;
      out.push({ id: p.id });
    }
  }
  return out;
}

const ALL_CLINICAL = [11, 12, 13, 14, 15, 16, 17, 18, 19];
const READ_HISTORY = [12];

const VET_ROLES_DATA_INITIAL = [
  {
    id: 1, name: 'Administrador', code: 'ADMIN',
    color: 'amatista',
    permissions: VET_PERMISSIONS.map((p) => ({ id: p.id })),
    active: true,
  },
  {
    id: 2, name: 'Veterinario/a', code: 'VET',
    color: 'green',
    permissions: [
      ...vetMakeRolePerms(ALL_CLINICAL),
      ...vetMakeRolePerms([21, 22], ['Ver', 'Crear', 'Editar']),
    ],
    active: true,
  },
  {
    id: 3, name: 'Asistente veterinario', code: 'ASSISTANT',
    color: 'blue',
    permissions: [
      ...vetMakeRolePerms([13, 18], ['Ver', 'Crear']),
      ...vetMakeRolePerms([11], ['Ver', 'Crear']),
      ...vetMakeRolePerms(READ_HISTORY, ['Ver']),
    ],
    active: true,
  },
  {
    id: 4, name: 'Recepcionista', code: 'RECEPTION',
    color: 'amber',
    permissions: [
      ...vetMakeRolePerms([21, 22], ['Ver', 'Crear', 'Editar']),
      ...vetMakeRolePerms(READ_HISTORY, ['Ver']),
    ],
    active: true,
  },
  {
    id: 5, name: 'Auxiliar', code: 'AUX',
    color: 'gray',
    permissions: [],
    active: false,
  },
];

const VET_ROLE_COLORS_FULL = {
  amatista: {
    bg: 'var(--amatista-100)', fg: 'var(--amatista-700)',
    dot: 'var(--amatista-600)', border: 'var(--amatista-200)',
    avatarBg: 'var(--amatista-100)', avatarFg: 'var(--amatista-700)',
    headerGradient: 'linear-gradient(180deg, var(--amatista-100) 0%, var(--warm-50) 100%)',
  },
  green: {
    bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)',
    dot: 'oklch(55% 0.15 150)', border: 'oklch(88% 0.08 150)',
    avatarBg: 'oklch(94% 0.06 150)', avatarFg: 'oklch(40% 0.13 150)',
    headerGradient: 'linear-gradient(180deg, oklch(94% 0.06 150) 0%, var(--warm-50) 100%)',
  },
  blue: {
    bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)',
    dot: 'oklch(55% 0.16 240)', border: 'oklch(88% 0.06 240)',
    avatarBg: 'oklch(94% 0.04 240)', avatarFg: 'oklch(40% 0.15 240)',
    headerGradient: 'linear-gradient(180deg, oklch(94% 0.04 240) 0%, var(--warm-50) 100%)',
  },
  amber: {
    bg: 'oklch(94% 0.07 80)', fg: 'oklch(45% 0.13 70)',
    dot: 'oklch(60% 0.15 75)', border: 'oklch(88% 0.09 80)',
    avatarBg: 'oklch(94% 0.07 80)', avatarFg: 'oklch(45% 0.13 70)',
    headerGradient: 'linear-gradient(180deg, oklch(94% 0.07 80) 0%, var(--warm-50) 100%)',
  },
  gray: {
    bg: 'var(--warm-200)', fg: 'var(--warm-700)',
    dot: 'var(--warm-500)', border: 'var(--warm-300)',
    avatarBg: 'var(--warm-200)', avatarFg: 'var(--warm-700)',
    headerGradient: 'linear-gradient(180deg, var(--warm-200) 0%, var(--warm-50) 100%)',
  },
};

Object.assign(window, {
  VET_MODULES, VET_SUB_MODULES, VET_PERMISSIONS, vetPermsBySubModule,
  VET_ROLES_DATA_INITIAL, VET_ROLE_COLORS_FULL,
});
