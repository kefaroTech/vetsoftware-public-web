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
  green: { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.16 150)' },
  blue: { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)', dot: 'oklch(55% 0.16 240)' },
  amber: { bg: 'oklch(94% 0.07 80)', fg: 'oklch(45% 0.13 70)', dot: 'oklch(65% 0.13 75)' },
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
