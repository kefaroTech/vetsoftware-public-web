import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AUTH_STORAGE_KEY } from '@/services/http/http.client'
import { authApi } from '../api/auth.api'
import type { AuthSession, MeResponse } from '../types'

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

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(loadInitial())
  const me = ref<MeResponse | null>(null)
  const bootLoading = ref(false)
  let bootInFlight: Promise<void> | null = null

  const claims = computed<JwtClaims | null>(() =>
    session.value ? decodeJwt(session.value.token) : null,
  )

  const isAuthenticated = computed(() => session.value !== null)
  const companyId = computed<number | null>(
    () => me.value?.companyId ?? claims.value?.companyId ?? null,
  )
  const subjectId = computed<number | null>(() => {
    if (me.value) return me.value.id
    const sub = claims.value?.sub
    if (sub == null) return null
    const n = Number(sub)
    return Number.isFinite(n) ? n : null
  })

  async function fetchMe(): Promise<void> {
    try {
      me.value = await authApi.me()
    } catch {
      me.value = null
      throw new Error('No se pudo cargar el perfil del usuario')
    }
  }

  async function login(next: AuthSession) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
    session.value = next
    try {
      await fetchMe()
    } catch {
      // si falla /me con un token recién emitido, dejamos al user navegar — el
      // interceptor de 401 lo sacará si el token resulta inválido.
    }
  }

  function logout() {
    try { localStorage.clear() } catch { /* ignore */ }
    try { sessionStorage.clear() } catch { /* ignore */ }
    session.value = null
    me.value = null
    window.location.assign('/login')
  }

  async function refreshMe(): Promise<void> {
    if (!session.value) return
    if (bootInFlight) return bootInFlight
    bootLoading.value = true
    bootInFlight = fetchMe()
      .catch(() => {
        try { localStorage.clear() } catch { /* ignore */ }
        try { sessionStorage.clear() } catch { /* ignore */ }
        session.value = null
        me.value = null
      })
      .finally(() => {
        bootLoading.value = false
        bootInFlight = null
      })
    return bootInFlight
  }

  return {
    session,
    me,
    bootLoading,
    isAuthenticated,
    companyId,
    subjectId,
    login,
    logout,
    refreshMe,
  }
})
