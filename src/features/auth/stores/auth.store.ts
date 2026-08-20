import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { setRefreshHandler } from '@/services/http/http.client'
import { storageService } from '@/services/storage/storage.service'
import { authApi } from '../api/auth.api'
import { decodeJwt } from '../utils/jwt'
import type { AuthSession, MeResponse } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(storageService.getSession())
  const me = ref<MeResponse | null>(null)
  const bootLoading = ref(false)
  let bootInFlight: Promise<void> | null = null

  const claims = computed(() => (session.value ? decodeJwt(session.value.token) : null))

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

  // `exp` del JWT en milisegundos (el claim viene en segundos epoch).
  const expiresAt = computed<number | null>(() =>
    claims.value?.exp ? claims.value.exp * 1000 : null,
  )
  // Expiración proactiva en cliente: permite expulsar/refrescar sin esperar al 401.
  const isExpired = computed<boolean>(
    () => expiresAt.value !== null && Date.now() >= expiresAt.value,
  )

  async function fetchMe(): Promise<void> {
    try {
      me.value = await authApi.me()
    } catch {
      me.value = null
      throw new Error('No se pudo cargar el perfil del usuario')
    }
  }

  async function login(next: AuthSession) {
    storageService.setSession(next)
    session.value = next
    try {
      await fetchMe()
    } catch {
      // si falla /me con un token recién emitido, dejamos al user navegar — el
      // interceptor de 401 lo sacará si el token resulta inválido.
    }
  }

  /** Limpia sesión y storage sin redirigir (útil para expiración proactiva vía router). */
  function clearSession() {
    // `clearVolatile()` y no `clearSession()`: borra las credenciales Y todo lo que
    // cada app haya registrado como propio de la sesión (el borrador de «Nueva
    // consulta», la sede activa). Conserva las preferencias del dispositivo —el ancho
    // del rollo de la impresora— y el aviso SESSION_REPLACED.
    //
    // Cubre los tres caminos por los que se pierde la sesión, no solo el logout
    // explícito: un `/auth/refresh` fallido y un `/auth/me` fallido acaban aquí, y el
    // segundo termina en un `router.push` a /login SIN recarga de página. Si esos dos
    // solo borrasen `AUTH_STORAGE_KEY`, el defecto de #68 seguiría vivo por la puerta
    // de atrás: el siguiente usuario entraría en la misma pestaña y se encontraría el
    // borrador del anterior. Es la misma decisión que ya toma `redirectToLogin()` en
    // el cliente HTTP.
    storageService.clearVolatile()
    session.value = null
    me.value = null
  }

  async function logout() {
    // Logout server-side (best-effort): revoca los refresh tokens del usuario. Aunque falle,
    // limpiamos la sesión local igual.
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    clearSession()
    window.location.assign('/login')
  }

  // Single-flight: si varias requests 401 llegan a la vez, comparten un único /auth/refresh.
  let refreshInFlight: Promise<string | null> | null = null

  /**
   * Rota el refresh token y actualiza la sesión; devuelve el nuevo access token
   * o null si falla.
   *
   * Ya no comprueba antes si hay refresh token: vive en una cookie HttpOnly y
   * este código no puede verla. La ausencia la resuelve el servidor con un 401,
   * que aquí acaba en clearSession(). Un viaje de red de más en el único caso en
   * que la sesión ya estaba perdida.
   */
  async function refreshSession(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight
    refreshInFlight = authApi
      .refresh()
      .then((res) => {
        const next: AuthSession = {
          token: res.token,
          type: res.type,
        }
        storageService.setSession(next)
        session.value = next
        return res.token
      })
      .catch(() => {
        clearSession()
        return null
      })
      .finally(() => {
        refreshInFlight = null
      })
    return refreshInFlight
  }

  // El interceptor de axios usa este handler para refrescar ante un 401 TOKEN_EXPIRED.
  setRefreshHandler(refreshSession)

  async function refreshMe(): Promise<void> {
    if (!session.value) return
    if (bootInFlight) return bootInFlight
    bootLoading.value = true
    bootInFlight = fetchMe()
      .catch(() => {
        clearSession()
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
    expiresAt,
    isExpired,
    login,
    logout,
    clearSession,
    refreshMe,
  }
})
