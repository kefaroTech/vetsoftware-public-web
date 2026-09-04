export type KnownRoleId = 'admin' | 'vet' | 'assistant' | 'reception' | 'aux'

export type RoleColor = 'amatista' | 'green' | 'blue' | 'amber' | 'gray'

export interface RoleColorTokens {
  bg: string
  fg: string
  dot: string
}

export interface RoleDefinition {
  id: KnownRoleId
  name: string
  description: string
  permissions: string[]
  color: RoleColor
}

export const ROLES: readonly RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso total al sistema, configuración y reportes.',
    permissions: [
      'Gestionar empleados y roles',
      'Configurar la clínica',
      'Ver todos los reportes financieros',
      'Acceso completo a historiales',
      'Gestionar inventario y precios',
    ],
    color: 'amatista',
  },
  {
    id: 'vet',
    name: 'Veterinario/a',
    description: 'Atención clínica · puede crear consultas, recetas y diagnósticos.',
    permissions: [
      'Crear y editar consultas',
      'Acceso a historial clínico',
      'Emitir recetas y solicitudes',
      'Programar cirugías y hospitalización',
      'Ver agenda propia',
    ],
    color: 'green',
  },
  {
    id: 'assistant',
    name: 'Asistente veterinario',
    description: 'Apoyo clínico · vacunas, curaciones y desparasitación.',
    permissions: [
      'Registrar vacunaciones y desparasitaciones',
      'Acceso a historial clínico (lectura)',
      'Crear consultas básicas',
      'Gestionar agenda',
    ],
    color: 'blue',
  },
  {
    id: 'reception',
    name: 'Recepcionista',
    description: 'Atención al público · agendamiento y facturación básica.',
    permissions: [
      'Crear propietarios y mascotas',
      'Gestionar agenda',
      'Emitir comprobantes',
      'Acceso a historial (solo lectura)',
    ],
    color: 'amber',
  },
  {
    id: 'aux',
    name: 'Auxiliar',
    description: 'Apoyo operativo · limpieza, inventario y soporte general.',
    permissions: ['Registrar movimientos de inventario', 'Tareas operativas'],
    color: 'gray',
  },
] as const

export const ROLE_COLORS: Record<RoleColor, RoleColorTokens> = {
  amatista: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)', dot: 'var(--amatista-600)' },
  green: { bg: 'var(--success-bg)', fg: 'var(--success-fg)', dot: 'var(--success-dot)' },
  blue: {
    bg: 'var(--navy-100, var(--amatista-50))',
    fg: 'var(--navy-700, var(--amatista-600))',
    dot: 'var(--navy-600, var(--amatista-500))',
  },
  amber: { bg: 'var(--warning-50)', fg: 'var(--warning-900)', dot: 'var(--warning-border)' },
  gray: { bg: 'var(--warm-200)', fg: 'var(--warm-700)', dot: 'var(--warm-500)' },
}

const NEUTRAL_TOKENS: RoleColorTokens = ROLE_COLORS.gray

export function findKnownRole(code: string): RoleDefinition | null {
  const norm = code.trim().toLowerCase()
  return ROLES.find((r) => r.id === norm) ?? null
}

export function colorsForCode(code: string): RoleColorTokens {
  const known = findKnownRole(code)
  return known ? ROLE_COLORS[known.color] : NEUTRAL_TOKENS
}
