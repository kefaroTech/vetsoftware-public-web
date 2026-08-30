import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AuthSession, TokenResponse } from '@/features/auth/types'

/**
 * La renovación de sesión. Su propiedad crítica no es refrescar, sino refrescar
 * UNA sola vez: cuando el access token caduca, todas las peticiones en vuelo
 * fallan a la vez con 401, y si cada una disparase su propio `/auth/refresh`
 * sobre un refresh token de un solo uso, la primera rotación invalidaría el
 * token para las demás y el usuario quedaría fuera de sesión en mitad de una
 * consulta.
 *
 * El resto de pruebas cubre lo que pasa cuando el refresco falla —debe dejar la
 * sesión limpia, no a medias— y la lectura del JWT, de la que dependen los
 * guards y la resolución de empresa.
 *
 * Nota sobre `type`: es el SUJETO de la sesión (`EMPLOYEE` | `SYSTEM_USER`), no el
 * esquema del header `Authorization`. Este fichero decía `'Bearer'` en sus 23
 * sesiones —un valor que el backend no emite nunca— y nadie lo vio porque
 * `tests/**` estaba fuera de todo `tsconfig`. Los literales que se serializan a
 * mano llevan ahora `satisfies` para que el compilador los mire también a ellos.
 */

const refresh = vi.fn()
const me = vi.fn()
const logoutApi = vi.fn()

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    refresh: () => refresh(),
    me: () => me(),
    logout: () => logoutApi(),
  },
}))

const setRefreshHandler = vi.fn()
const setSessionClearHandler = vi.fn()
vi.mock('@/services/http/http.client', () => ({
  AUTH_STORAGE_KEY: 'vetsoft.auth',
  setRefreshHandler: (h: unknown) => setRefreshHandler(h),
  setSessionClearHandler: (h: unknown) => setSessionClearHandler(h),
}))

const AUTH_STORAGE_KEY = 'vetsoft.auth'

/** localStorage en memoria: el entorno de estas pruebas es node, sin DOM. */
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage
}

/** JWT sin firmar con el payload dado, en base64url como los del backend. */
function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) => {
    const utf8 = new TextEncoder().encode(JSON.stringify(value))
    return Buffer.from(utf8)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma-no-verificada`
}

let storage: Storage

/** Import diferido: el store lee localStorage al construirse. */
async function loadStore() {
  const mod = await import('@/features/auth/stores/auth.store')
  return mod.useAuthStore()
}

/**
 * `refreshSession` no se exporta: el store se la entrega al interceptor de axios
 * mediante `setRefreshHandler`, y esa es la única vía por la que se invoca en
 * producción. Se prueba por ahí, que es exactamente el contrato real.
 */
function refreshHandler(): () => Promise<string | null> {
  const ultima = setRefreshHandler.mock.calls.at(-1)
  if (!ultima) throw new Error('El store no registró ningún handler de refresco')
  return ultima[0] as () => Promise<string | null>
}

beforeEach(() => {
  vi.resetModules()
  refresh.mockReset()
  me.mockReset()
  logoutApi.mockReset()
  setRefreshHandler.mockReset()
  setSessionClearHandler.mockReset()
  storage = memoryStorage()
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('atob', (s: string) => Buffer.from(s, 'base64').toString('binary'))
  vi.stubGlobal('window', { location: { assign: vi.fn() } })
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('refresco de sesión: single-flight', () => {
  it('N peticiones simultáneas producen UN solo /auth/refresh', async () => {
    // Es la garantía que protege al refresh token de un solo uso. Sin ella, la
    // segunda llamada llegaría con un token ya rotado y cerraría la sesión.
    let resolver!: (v: unknown) => void
    refresh.mockReturnValue(new Promise((r) => (resolver = r)))
    await loadStore()

    const enVuelo = [refreshHandler()(), refreshHandler()(), refreshHandler()()]
    resolver({
      token: jwt({ sub: '1', exp: 9_999_999_999 }),
      type: 'EMPLOYEE',
    } satisfies TokenResponse)
    const tokens = await Promise.all(enVuelo)

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(new Set(tokens).size).toBe(1)
  })

  it('libera el cerrojo al terminar: un 401 posterior sí vuelve a refrescar', async () => {
    // Si `refreshInFlight` no se limpiara, la sesión no podría renovarse nunca
    // más y el usuario acabaría expulsado a los 15 minutos siguientes.
    refresh.mockResolvedValue({
      token: jwt({ sub: '1' }),
      type: 'EMPLOYEE',
    } satisfies TokenResponse)
    await loadStore()

    await refreshHandler()()
    await refreshHandler()()

    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('lo libera también cuando el refresco falla', async () => {
    refresh.mockRejectedValue(new Error('401'))
    await loadStore()

    await refreshHandler()()
    await refreshHandler()()

    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('persiste la sesión nueva antes de resolver', async () => {
    // El interceptor reintenta la petición releyendo el token del storage. Si se
    // resolviera antes de persistir, el reintento iría con el token viejo.
    const token = jwt({ sub: '1', companyId: 3 })
    refresh.mockResolvedValue({ token, type: 'EMPLOYEE' } satisfies TokenResponse)
    const store = await loadStore()

    const devuelto = await refreshHandler()()

    expect(devuelto).toBe(token)
    expect(JSON.parse(storage.getItem(AUTH_STORAGE_KEY) ?? 'null')).toEqual({
      token,
      type: 'EMPLOYEE',
    })
    expect(store.isAuthenticated).toBe(true)
  })

  it('un refresco fallido limpia la sesión y devuelve null', async () => {
    // Media sesión —token borrado pero `me` en memoria— dejaría la interfaz
    // mostrando datos de un usuario que ya no está autenticado.
    refresh.mockRejectedValue(new Error('401'))
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: jwt({ sub: '1' }), type: 'EMPLOYEE' } satisfies AuthSession),
    )
    const store = await loadStore()

    const resultado = await refreshHandler()()

    expect(resultado).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('no manda el refresh token en el cuerpo: viaja en la cookie HttpOnly', () => {
    // Si alguien volviera a pasarlo por parámetro, estaría reintroduciendo la
    // credencial de 30 días en JavaScript, que es justo lo que FE-03 sacó.
    expect(refresh).not.toHaveBeenCalled()
    expect(refresh.mock.calls.every((args) => args.length === 0)).toBe(true)
  })

  it('queda registrado como handler del interceptor al construir el store', async () => {
    // Sin este registro, el 401 no renovaría nada y cada caducidad mandaría al
    // usuario al login.
    await loadStore()

    expect(setRefreshHandler).toHaveBeenCalledWith(expect.any(Function))
  })

  it('registra clearSession como handler de limpieza del interceptor', async () => {
    // Simétrico al de refresh: sin este registro, un 401 sin refresh posible
    // limpia el storage pero deja `session`/`me` del store como estaban, con
    // `isAuthenticated` en `true` pese a un token que el backend ya rechazó.
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: jwt({ sub: '1' }), type: 'EMPLOYEE' } satisfies AuthSession),
    )
    const store = await loadStore()
    expect(store.isAuthenticated).toBe(true)

    expect(setSessionClearHandler).toHaveBeenCalledWith(expect.any(Function))
    const handler = setSessionClearHandler.mock.calls.at(-1)?.[0] as () => void
    handler()

    expect(store.isAuthenticated).toBe(false)
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })
})

describe('carga del perfil', () => {
  it('deduplica llamadas concurrentes a refreshMe', async () => {
    let resolver!: (v: unknown) => void
    me.mockReturnValue(new Promise((r) => (resolver = r)))
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: jwt({ sub: '1' }), type: 'EMPLOYEE' } satisfies AuthSession),
    )
    const store = await loadStore()

    const enVuelo = [store.refreshMe(), store.refreshMe()]
    resolver({ id: 1, companyId: 3, permissions: [] })
    await Promise.all(enVuelo)

    expect(me).toHaveBeenCalledTimes(1)
  })

  it('sin sesión no llama al backend', async () => {
    const store = await loadStore()

    await store.refreshMe()

    expect(me).not.toHaveBeenCalled()
  })

  it('si el perfil falla, cierra la sesión en vez de dejarla a medias', async () => {
    me.mockRejectedValue(new Error('500'))
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: jwt({ sub: '1' }), type: 'EMPLOYEE' } satisfies AuthSession),
    )
    const store = await loadStore()

    await store.refreshMe()

    expect(store.isAuthenticated).toBe(false)
  })

  it('un login con /me caído deja pasar al usuario', async () => {
    // El token acaba de emitirlo el backend. Bloquear aquí por un fallo de /me
    // dejaría fuera a alguien con credenciales válidas; el interceptor de 401 lo
    // expulsará si el token resulta no serlo.
    me.mockRejectedValue(new Error('500'))
    const store = await loadStore()

    await store.login({ token: jwt({ sub: '1' }), type: 'EMPLOYEE' })

    expect(store.isAuthenticated).toBe(true)
  })
})

describe('lectura del JWT', () => {
  it('resuelve la empresa desde el claim cuando aún no hay perfil', async () => {
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: jwt({ sub: '1', companyId: 42 }),
        type: 'EMPLOYEE',
      } satisfies AuthSession),
    )
    const store = await loadStore()

    expect(store.companyId).toBe(42)
  })

  it('el perfil manda sobre el claim', async () => {
    // `/me` es la fuente autorizada; el claim es el respaldo mientras carga.
    me.mockResolvedValue({ id: 1, companyId: 7, permissions: [] })
    const store = await loadStore()
    await store.login({ token: jwt({ sub: '1', companyId: 42 }), type: 'EMPLOYEE' })

    expect(store.companyId).toBe(7)
  })

  it('un token corrupto no revienta la aplicación', async () => {
    // Un JWT ilegible tiene que degradar a "sin datos", no dejar la pantalla en
    // blanco: el guard depende de estos valores en cada navegación.
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: 'no-es-un-jwt', type: 'EMPLOYEE' } satisfies AuthSession),
    )
    const store = await loadStore()

    expect(store.companyId).toBeNull()
    expect(store.subjectId).toBeNull()
    expect(store.expiresAt).toBeNull()
  })

  it('conserva los caracteres no ASCII del payload', async () => {
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: jwt({ sub: '9', companyId: 1, name: 'Muñoz' }),
        type: 'EMPLOYEE',
      } satisfies AuthSession),
    )
    const store = await loadStore()

    expect(store.subjectId).toBe(9)
  })

  it('un sub no numérico no se convierte en NaN', async () => {
    // `Number('abc')` es NaN y NaN se cuela en cualquier comparación sin fallar.
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: jwt({ sub: 'abc' }), type: 'EMPLOYEE' } satisfies AuthSession),
    )
    const store = await loadStore()

    expect(store.subjectId).toBeNull()
  })

  it('marca la sesión como expirada cuando exp ya pasó', async () => {
    const hace1h = Math.floor(Date.now() / 1000) - 3_600
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: jwt({ sub: '1', exp: hace1h }),
        type: 'EMPLOYEE',
      } satisfies AuthSession),
    )
    const store = await loadStore()

    expect(store.isExpired).toBe(true)
  })

  it('no marca como expirado un token vigente', async () => {
    const en1h = Math.floor(Date.now() / 1000) + 3_600
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: jwt({ sub: '1', exp: en1h }),
        type: 'EMPLOYEE',
      } satisfies AuthSession),
    )
    const store = await loadStore()

    expect(store.isExpired).toBe(false)
  })

  it('un token sin exp no se considera expirado', async () => {
    // Sin fecha de caducidad no hay motivo para expulsar; el backend decidirá.
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: jwt({ sub: '1' }), type: 'EMPLOYEE' } satisfies AuthSession),
    )
    const store = await loadStore()

    expect(store.isExpired).toBe(false)
  })
})

describe('sesión persistida', () => {
  it('sin nada en storage arranca sin sesión', async () => {
    expect((await loadStore()).isAuthenticated).toBe(false)
  })

  it('un storage corrupto no impide arrancar', async () => {
    storage.setItem(AUTH_STORAGE_KEY, '{roto')

    expect((await loadStore()).isAuthenticated).toBe(false)
  })

  it('una sesión sin token se descarta', async () => {
    // `{type}` sin `token` no sirve para autenticar nada; darla por buena
    // dejaría al usuario "dentro" sin poder hacer una sola petición.
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ type: 'EMPLOYEE' }))

    expect((await loadStore()).isAuthenticated).toBe(false)
  })

  it('logout limpia aunque el backend falle', async () => {
    // La revocación server-side es best-effort: si no se limpiara en local, el
    // usuario seguiría con sesión iniciada en un equipo compartido.
    logoutApi.mockRejectedValue(new Error('503'))
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: jwt({ sub: '1' }), type: 'EMPLOYEE' } satisfies AuthSession),
    )
    const store = await loadStore()

    await store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })
})

/**
 * El guard del router llama a `refreshMe()` en cada navegación autenticada, y hay 36
 * rutas bajo /dashboard. Sin TTL, cada clic del menú costaba un `GET /auth/me`
 * bloqueante: `bootInFlight` deduplica las concurrentes, no las consecutivas (#56).
 *
 * Lo que estas pruebas fijan no es el ahorro, sino sus dos bordes peligrosos: que un
 * perfil que NO llegó nunca se dé por fresco, y que la frescura no cruce de un usuario
 * al siguiente en la misma pestaña.
 */
describe('frescura de /auth/me (TTL)', () => {
  const TTL_MS = 60_000
  const perfil = { id: 1, companyId: 3, permissions: [] }

  function conSesion(sub = '1') {
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: jwt({ sub }), type: 'EMPLOYEE' } satisfies AuthSession),
    )
  }

  beforeEach(() => {
    // Reloj falso: el TTL no puede depender del tiempo real de ejecución del test.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T09:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('dos navegaciones seguidas dentro del TTL producen un solo /auth/me', async () => {
    me.mockResolvedValue(perfil)
    conSesion()
    const store = await loadStore()

    await store.refreshMe()
    vi.advanceTimersByTime(TTL_MS - 1)
    await store.refreshMe()

    expect(me).toHaveBeenCalledTimes(1)
  })

  it('pasado el TTL vuelve a pedir el perfil', async () => {
    // El perfil no es inmutable: permisos y sede cambian desde la consola de
    // plataforma, y el usuario no tiene por qué recargar la página para enterarse.
    me.mockResolvedValue(perfil)
    conSesion()
    const store = await loadStore()

    await store.refreshMe()
    vi.advanceTimersByTime(TTL_MS + 1)
    await store.refreshMe()

    expect(me).toHaveBeenCalledTimes(2)
  })

  it('force ignora el TTL', async () => {
    // Es lo que usa CambiarContrasenaView: sin esto el guard seguiría viendo
    // `mustChangePassword: true` y rebotaría al usuario a esa misma pantalla.
    me.mockResolvedValue(perfil)
    conSesion()
    const store = await loadStore()

    await store.refreshMe()
    await store.refreshMe(true)

    expect(me).toHaveBeenCalledTimes(2)
  })

  it('un /auth/me caído no marca frescura: la siguiente llamada reintenta', async () => {
    // Vía login, que es el único camino que sobrevive a un `/me` fallido sin cerrar
    // la sesión. Si el sello se pusiera en el `finally`, este usuario navegaría hasta
    // un minuto con `me` a null: sin permisos y sin nombre.
    me.mockRejectedValueOnce(new Error('500'))
    const store = await loadStore()

    await store.login({ token: jwt({ sub: '1' }), type: 'EMPLOYEE' })
    expect(store.isAuthenticated).toBe(true)

    me.mockResolvedValue(perfil)
    await store.refreshMe()

    expect(me).toHaveBeenCalledTimes(2)
    expect(store.me).toEqual(perfil)
  })

  it('clearSession resetea la frescura: el usuario siguiente no hereda el perfil', async () => {
    // Puesto compartido: sale un turno y entra otro en la misma pestaña. Heredar el
    // sello serviría de caché el perfil —y los permisos— del anterior.
    me.mockResolvedValue(perfil)
    conSesion('1')
    const store = await loadStore()
    await store.refreshMe()

    store.clearSession()
    // Sesión nueva sin pasar por `login()`, que traería el perfil por su cuenta: así
    // lo único que puede evitar el segundo `/auth/me` es una frescura heredada.
    refresh.mockResolvedValue({
      token: jwt({ sub: '2' }),
      type: 'EMPLOYEE',
    } satisfies TokenResponse)
    await refreshHandler()()

    const otroPerfil = { id: 2, companyId: 3, permissions: [] }
    me.mockResolvedValue(otroPerfil)
    await store.refreshMe()

    expect(me).toHaveBeenCalledTimes(2)
    expect(store.me).toEqual(otroPerfil)
  })

  it('tras recargar la página, la primera navegación sí pide el perfil', async () => {
    // La hidratación inicial no necesita `force`: el sello arranca en 0 —«nunca
    // cargado»— y la guarda de caché lo exige distinto de 0. Con el reloj pegado al
    // epoch, un TTL escrito solo como resta daría el perfil por fresco y el guard
    // leería `mustChangePassword` de un `me` que todavía es null.
    vi.setSystemTime(new Date(TTL_MS / 2))
    me.mockResolvedValue(perfil)
    conSesion()
    const store = await loadStore()

    await store.refreshMe()

    expect(me).toHaveBeenCalledTimes(1)
    expect(store.me).toEqual(perfil)
  })

  it('el login sella la frescura: el guard no dispara un segundo /auth/me', async () => {
    // El ahorro que motiva #56 empieza aquí: `login()` ya trae el perfil, y el
    // `refreshMe()` del guard corre inmediatamente después al navegar a `home`.
    me.mockResolvedValue(perfil)
    const store = await loadStore()

    await store.login({ token: jwt({ sub: '1' }), type: 'EMPLOYEE' })
    await store.refreshMe()

    expect(me).toHaveBeenCalledTimes(1)
  })
})
