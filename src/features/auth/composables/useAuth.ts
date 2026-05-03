import { computed, ref } from 'vue'
import { AUTH_STORAGE_KEY } from '@/services/http/http.client'
import type { AuthSession } from '../types'

interface JwtClaims {
  sub?: string
  companyId?: number
  exp?: number
  iat?: number
  type?: string
}

function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    )
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(json) as JwtClaims
  } catch {
    return null
  }
}

function loadInitial(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (parsed?.token && parsed?.type) {
      return { token: parsed.token, type: parsed.type }
    }
    return null
  } catch {
    return null
  }
}

const session = ref<AuthSession | null>(loadInitial())

const claims = computed<JwtClaims | null>(() =>
  session.value ? decodeJwt(session.value.token) : null,
)

export function useAuth() {
  function login(next: AuthSession) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
    session.value = next
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    session.value = null
  }

  return {
    session: computed(() => session.value),
    isAuthenticated: computed(() => session.value !== null),
    companyId: computed<number | null>(() => claims.value?.companyId ?? null),
    subjectId: computed<number | null>(() => {
      const sub = claims.value?.sub
      if (sub == null) return null
      const n = Number(sub)
      return Number.isFinite(n) ? n : null
    }),
    login,
    logout,
  }
}

export function getToken(): string | null {
  return session.value?.token ?? null
}

export function getCurrentCompanyId(): number | null {
  return claims.value?.companyId ?? null
}
