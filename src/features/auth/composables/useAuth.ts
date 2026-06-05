import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth.store'

/** Wrapper sobre el store de Pinia `auth` (mantiene la API previa de useAuth). */
export function useAuth() {
  const store = useAuthStore()
  const { session, isAuthenticated, me, bootLoading, companyId, subjectId } =
    storeToRefs(store)
  return {
    session,
    isAuthenticated,
    me,
    bootLoading,
    companyId,
    subjectId,
    login: store.login,
    logout: store.logout,
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
