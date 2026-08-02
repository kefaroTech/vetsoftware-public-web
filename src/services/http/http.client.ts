import axios, { AxiosError } from 'axios'
import type { ProblemDetail } from '@/types/api.types'
import { popLoader, pushLoader } from '@/composables/useGlobalLoader'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalLoader?: boolean
    /** Marca interna: la request ya se reintentó tras un refresh (evita bucles). */
    _retry?: boolean
  }
}

export const AUTH_STORAGE_KEY = 'vetsoft.auth'
export const SESSION_REPLACED_NOTICE_KEY = 'vetsoft.auth.session-replaced'

export const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

/** Limpia el token y fuerza el ir a login (hard redirect). Usado cuando el refresh no es posible. */
function redirectToLogin() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// Handler de refresh registrado por el store de auth. Se inyecta así (en vez de importar el
// store aquí) para no crear un ciclo http.client ↔ store. Devuelve el nuevo access token, o
// `null` si el refresh falló. Debe deduplicar llamadas concurrentes (single-flight).
type RefreshHandler = () => Promise<string | null>
let refreshHandler: RefreshHandler | null = null
export function setRefreshHandler(handler: RefreshHandler) {
  refreshHandler = handler
}

http.interceptors.request.use((config) => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (raw) {
    try {
      const session = JSON.parse(raw) as { token?: string }
      if (session.token) {
        config.headers.set('Authorization', `Bearer ${session.token}`)
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }
  if (!config.skipGlobalLoader) pushLoader()
  return config
})

http.interceptors.response.use(
  (response) => {
    if (!response.config.skipGlobalLoader) popLoader()
    return response
  },
  async (error: AxiosError) => {
    if (!error.config?.skipGlobalLoader) popLoader()
    const status = error.response?.status
    const original = error.config
    const url = original?.url ?? ''
    const code = getProblemDetailCode(error)

    if (status === 401 && code === 'SESSION_REPLACED') {
      sessionStorage.setItem(
        SESSION_REPLACED_NOTICE_KEY,
        'Tu cuenta se inició en otro dispositivo.',
      )
    }

    // Las llamadas de auth no entran al flujo de refresh (evita recursión).
    const isAuthCall =
      url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')

    if (status === 401 && original && !isAuthCall) {
      // Solo el access expirado se intenta refrescar; token inválido/revocado → a login.
      if (code === 'TOKEN_EXPIRED' && !original._retry && refreshHandler) {
        original._retry = true
        const newToken = await refreshHandler()
        if (newToken) {
          original.headers.set('Authorization', `Bearer ${newToken}`)
          return http(original)
        }
      }
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

export function getProblemDetailMessage(error: unknown, fallback = 'Error inesperado'): string {
  if (error instanceof AxiosError) {
    const pd = error.response?.data as ProblemDetail | undefined
    if (pd?.detail) return pd.detail
    if (pd?.title) return pd.title
    if (error.message) return error.message
  }
  return fallback
}

/** Código de negocio del `ProblemDetail` (`pd.code`), o `null` si no aplica. */
export function getProblemDetailCode(error: unknown): string | null {
  if (error instanceof AxiosError) {
    const pd = error.response?.data as ProblemDetail | undefined
    if (pd?.code) return pd.code
  }
  return null
}

/**
 * `true` si el backend respondió 409 por optimistic locking (`@Version`): dos
 * operaciones tocaron la misma entidad versionada a la vez. El llamador debería
 * recargar datos frescos y permitir reintentar sobre el estado actual.
 */
export function isConcurrencyConflict(error: unknown): boolean {
  return getProblemDetailCode(error) === 'CONCURRENT_MODIFICATION'
}

export function getProblemDetailFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AxiosError)) return {}
  const pd = error.response?.data as ProblemDetail | undefined
  if (!pd?.errors) return {}
  return pd.errors.reduce<Record<string, string>>((acc, e) => {
    acc[e.field] = e.message
    return acc
  }, {})
}
