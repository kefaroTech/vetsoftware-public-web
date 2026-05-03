import axios, { AxiosError } from 'axios'
import type { ProblemDetail } from '@/types/api.types'

export const AUTH_STORAGE_KEY = 'vetsoft.auth'

export const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

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
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''
    const isLoginCall = url.includes('/auth/login/')
    if (status === 401 && !isLoginCall) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
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

export function getProblemDetailFieldErrors(
  error: unknown,
): Record<string, string> {
  if (!(error instanceof AxiosError)) return {}
  const pd = error.response?.data as ProblemDetail | undefined
  if (!pd?.errors) return {}
  return pd.errors.reduce<Record<string, string>>((acc, e) => {
    acc[e.field] = e.message
    return acc
  }, {})
}
