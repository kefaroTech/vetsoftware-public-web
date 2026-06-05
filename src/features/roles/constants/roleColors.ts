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
    headerGradient:
      'linear-gradient(180deg, var(--amatista-100) 0%, var(--warm-50) 100%)',
  },
  green: {
    bg: 'oklch(94% 0.06 150)',
    fg: 'oklch(40% 0.13 150)',
    dot: 'oklch(55% 0.15 150)',
    border: 'oklch(88% 0.08 150)',
    avatarBg: 'oklch(94% 0.06 150)',
    avatarFg: 'oklch(40% 0.13 150)',
    headerGradient:
      'linear-gradient(180deg, oklch(94% 0.06 150) 0%, var(--warm-50) 100%)',
  },
  blue: {
    bg: 'oklch(94% 0.04 240)',
    fg: 'oklch(40% 0.15 240)',
    dot: 'oklch(55% 0.16 240)',
    border: 'oklch(88% 0.06 240)',
    avatarBg: 'oklch(94% 0.04 240)',
    avatarFg: 'oklch(40% 0.15 240)',
    headerGradient:
      'linear-gradient(180deg, oklch(94% 0.04 240) 0%, var(--warm-50) 100%)',
  },
  amber: {
    bg: 'oklch(94% 0.07 80)',
    fg: 'oklch(45% 0.13 70)',
    dot: 'oklch(60% 0.15 75)',
    border: 'oklch(88% 0.09 80)',
    avatarBg: 'oklch(94% 0.07 80)',
    avatarFg: 'oklch(45% 0.13 70)',
    headerGradient:
      'linear-gradient(180deg, oklch(94% 0.07 80) 0%, var(--warm-50) 100%)',
  },
  gray: {
    bg: 'var(--warm-200)',
    fg: 'var(--warm-700)',
    dot: 'var(--warm-500)',
    border: 'var(--warm-300)',
    avatarBg: 'var(--warm-200)',
    avatarFg: 'var(--warm-700)',
    headerGradient:
      'linear-gradient(180deg, var(--warm-200) 0%, var(--warm-50) 100%)',
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
