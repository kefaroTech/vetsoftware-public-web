import type { RoleColor } from '../types'

export interface RoleColorTokens {
  bg: string
  fg: string
  dot: string
  border: string
  avatarBg: string
  avatarFg: string
  headerGradient: string
}

export const ROLE_COLORS: Record<RoleColor, RoleColorTokens> = {
  amatista: {
    bg: 'var(--amatista-100)',
    fg: 'var(--amatista-700)',
    dot: 'var(--amatista-600)',
    border: 'var(--amatista-200)',
    avatarBg: 'var(--amatista-100)',
    avatarFg: 'var(--amatista-700)',
    headerGradient: 'linear-gradient(180deg, var(--amatista-100) 0%, var(--warm-50) 100%)',
  },
  green: {
    bg: 'var(--success-bg)',
    fg: 'var(--success-fg)',
    dot: 'var(--success-dot)',
    border: 'var(--success-200, var(--compras-ok-bg))',
    avatarBg: 'var(--success-bg)',
    avatarFg: 'var(--success-fg)',
    headerGradient: 'linear-gradient(180deg, var(--success-bg) 0%, var(--warm-50) 100%)',
  },
  blue: {
    bg: 'var(--navy-100, var(--amatista-50))',
    fg: 'var(--navy-700, var(--amatista-600))',
    dot: 'var(--navy-600, var(--amatista-500))',
    border: 'var(--navy-200, var(--amatista-200))',
    avatarBg: 'var(--navy-100, var(--amatista-50))',
    avatarFg: 'var(--navy-700, var(--amatista-600))',
    headerGradient:
      'linear-gradient(180deg, var(--navy-100, var(--amatista-50)) 0%, var(--warm-50) 100%)',
  },
  amber: {
    bg: 'var(--warning-50)',
    fg: 'var(--warning-900)',
    dot: 'var(--warning-border)',
    border: 'var(--warning-200)',
    avatarBg: 'var(--warning-50)',
    avatarFg: 'var(--warning-900)',
    headerGradient: 'linear-gradient(180deg, var(--warning-50) 0%, var(--warm-50) 100%)',
  },
  gray: {
    bg: 'var(--warm-200)',
    fg: 'var(--warm-700)',
    dot: 'var(--warm-500)',
    border: 'var(--warm-300)',
    avatarBg: 'var(--warm-200)',
    avatarFg: 'var(--warm-700)',
    headerGradient: 'linear-gradient(180deg, var(--warm-200) 0%, var(--warm-50) 100%)',
  },
}

const ROLE_COLOR_BY_CODE: Record<string, RoleColor> = {
  admin: 'amatista',
  vet: 'green',
  assistant: 'blue',
  reception: 'amber',
  aux: 'gray',
}

export function pickRoleColor(role: { id: number; code?: string }): RoleColor {
  const code = role.code?.trim().toLowerCase()
  return (code && ROLE_COLOR_BY_CODE[code]) || 'gray'
}
