import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth.store'

/**
 * Ruta interna a la que volver tras autenticar (el `?redirect=` de la URL de
 * login), o `null` si `value` no es una ruta interna válida.
 *
 * Solo se acepta una ruta de la propia SPA. Sin este filtro, `?redirect=`
 * sería un open redirect: quien controla el enlace de login legítimo —el
 * dominio real, con TLS válido— decide a dónde aterriza el usuario tras
 * autenticarse.
 *
 *  - Debe empezar por "/": descarta cualquier URL absoluta (un origen ajeno
 *    completo, esquema y dominio incluidos).
 *  - No puede empezar por "//": el navegador la resuelve como protocol-relative
 *    contra el host que siga, es decir, otro dominio (`//evil.com`).
 *  - No puede contener ":": descarta un esquema explícito en medio de la ruta
 *    (`/x:javascript:alert(1)`, `/\evil.com`) y cualquier URL con puerto o
 *    esquema disfrazada de ruta.
 */
export function sanitizeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.includes(':')) return null
  return value
}

/** Wrapper sobre el store de Pinia `auth` (mantiene la API previa de useAuth). */
export function useAuth() {
  const store = useAuthStore()
  const { session, isAuthenticated, me, bootLoading, companyId, subjectId, isExpired } =
    storeToRefs(store)
  return {
    session,
    isAuthenticated,
    me,
    bootLoading,
    companyId,
    subjectId,
    isExpired,
    login: store.login,
    logout: store.logout,
    clearSession: store.clearSession,
    refreshMe: store.refreshMe,
  }
}

// Accesores no-reactivos usados fuera de componentes (interceptores axios).
export function getToken(): string | null {
  return useAuthStore().session?.token ?? null
}

export function getCurrentCompanyId(): number | null {
  return useAuthStore().companyId
}

export function getCurrentPermissions(): string[] {
  return useAuthStore().me?.permissions ?? []
}
