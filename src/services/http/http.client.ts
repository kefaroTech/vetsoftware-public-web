import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ProblemDetail } from '@/types/api.types'
import { popLoader, pushLoader } from '@/composables/useGlobalLoader'
import { createApiBaseUrl } from './api-base-url'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalLoader?: boolean
    /** Marca interna: la request ya se reintentó tras un refresh (evita bucles). */
    _retry?: boolean
    /** Marca interna: esta request incrementó el loader y debe decrementarlo una sola vez. */
    _loaderPushed?: boolean
    /** Marca interna: reintentos por fallo de red o 5xx ya consumidos. */
    _networkRetries?: number
  }
}

export const AUTH_STORAGE_KEY = 'vetsoft.auth'
export const SESSION_REPLACED_NOTICE_KEY = 'vetsoft.auth.session-replaced'

/**
 * Sin timeout, una petición que nunca resuelve deja el contador del loader
 * incrementado para siempre: la Huella se queda latiendo sobre el overlay y la
 * única salida es recargar la página. Con wifi compartido —el escenario normal
 * de una clínica— eso no es un caso de borde.
 *
 * 20 s es holgado para el CRUD de la aplicación, pero NO para todo: hay
 * operaciones cuyo presupuesto en el servidor es legítimamente mayor, y para
 * esas se usan las constantes de abajo por llamada. Un timeout global corto
 * sobre ellas no protegería al usuario: abortaría la petición en el navegador
 * mientras el backend sigue trabajando, dejando al operario sin el resultado de
 * algo que sí ocurrió.
 */
export const DEFAULT_TIMEOUT_MS = 20_000

/**
 * Emisión y transmisión de documentos electrónicos. El backend habla con el
 * proveedor DIAN con 15 s de connect + 60 s de read (DianHttpConfig), así que
 * una transmisión puede tardar legítimamente hasta 75 s. Cortar antes deja al
 * cajero sin saber si la factura salió, habiendo consumido el consecutivo.
 */
export const DIAN_TIMEOUT_MS = 90_000

/**
 * Subidas de adjuntos y descargas de informes/PDF. El backend admite hasta
 * 25 MB por archivo; a la velocidad de subida real de una clínica, 20 s no
 * alcanzan ni para una fracción.
 */
export const TRANSFER_TIMEOUT_MS = 120_000

/** Reintentos ante fallo de red o 5xx, solo para GET. */
const MAX_NETWORK_RETRIES = 2
const RETRY_BACKOFF_MS = 300

export const http = axios.create({
  baseURL: createApiBaseUrl(import.meta.env.VITE_API_URL),
  headers: { 'Content-Type': 'application/json' },
  timeout: DEFAULT_TIMEOUT_MS,
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
//
// Y debe persistir la sesión ANTES de resolver: el reintento vuelve a pasar por
// el interceptor de request, que relee el token del storage. Si resolviera sin
// persistir, la petición se reintentaría con el token viejo y volvería a dar 401.
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
  if (!config.skipGlobalLoader) {
    pushLoader()
    config._loaderPushed = true
  }
  return config
})

/**
 * Decrementa el loader exactamente una vez por petición que lo incrementó. La
 * marca vive en la config, no en el interceptor, por dos motivos: el reintento
 * vuelve a pasar por el interceptor de request y así queda balanceado, y un
 * error sin `config` —rechazo antes de enviar— ya no decrementa lo que nunca
 * subió, que era lo que podía retirar el velo con otra petición aún en vuelo.
 */
function releaseLoader(config: InternalAxiosRequestConfig | undefined): void {
  if (!config?._loaderPushed) return
  config._loaderPushed = false
  popLoader()
}

/**
 * Un GET es idempotente, así que reintentarlo es seguro y tapa el corte de red
 * momentáneo. Lo que NO se reintenta es el timeout: hacerlo multiplicaría por
 * tres el tiempo que la interfaz pasa bloqueada, que es justo lo que este
 * cambio viene a evitar.
 */
function shouldRetry(error: AxiosError, config: InternalAxiosRequestConfig): boolean {
  if (config.method?.toLowerCase() !== 'get') return false
  if ((config._networkRetries ?? 0) >= MAX_NETWORK_RETRIES) return false
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) return false
  const status = error.response?.status
  return status === undefined || status >= 500
}

http.interceptors.response.use(
  (response) => {
    releaseLoader(response.config)
    return response
  },
  async (error: AxiosError) => {
    const original = error.config
    releaseLoader(original)

    // Cancelación deliberada del llamador: no es un fallo de la aplicación.
    if (axios.isCancel(error)) return Promise.reject(error)

    if (original && shouldRetry(error, original)) {
      const attempt = (original._networkRetries ?? 0) + 1
      original._networkRetries = attempt
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * 2 ** (attempt - 1)))
      return http(original)
    }

    const status = error.response?.status
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
