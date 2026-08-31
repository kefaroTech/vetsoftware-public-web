import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import router from '@/router'
import { useContratacion } from '@/features/contratacion/composables/useContratacion'
import type { EstadoPlanActual } from '@/features/suscripcion/composables/estadoSuscripcion'

/**
 * `/planes` PARA UN CLIENTE QUE TODAVÍA NO HA CONTRATADO.
 *
 * ── El defecto que cierra ──────────────────────────────────────────────────
 * El paso vinculante (`/dashboard/contratar`) cuelga de `/dashboard`, así que
 * quien lo ve está autenticado. `/planes` era `guestOnly` a secas, así que quien
 * llegaba ahí y quería cambiar lo que iba a contratar acababa en el tablero **sin
 * un solo aviso**, ni pulsando un enlace ni tecleando la URL. Y la pantalla ya
 * prometía por escrito esa salida («vuelve a armarla desde el mismo equipo»).
 *
 * ── Por qué las dos ramas, siempre ─────────────────────────────────────────
 * Un guard que deja pasar a TODO el mundo también pone en verde la prueba de
 * «el cliente sin plan entra». La afirmación que de verdad protege la excepción
 * es la contraria: quien ya contratό sigue sin entrar. Las dos, o ninguna vale.
 *
 * <p>Y una tercera que no es simetría sino la regla que evita el falso negativo
 * más caro: `DESCONOCIDO` —403 por rol sin `subscription.read`, o la red caída—
 * **no** es «no tiene plan», y no puede cerrar la puerta. Mismo criterio que
 * `usePasoContratar.cargar()`.
 */

const autenticado = ref(false)
const estadoPlanActual = ref<EstadoPlanActual>('SIN_PLAN')
const cargarSuscripcion = vi.fn<(force?: boolean) => Promise<void>>()
const refreshMe = vi.fn<() => Promise<void>>()
const toastInfo = vi.fn()

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: autenticado,
    // El guard lee `mustChangePassword` antes de cualquier otra puerta, y
    // `useAuthorization` lee `permissions`/`branchIds` de este mismo objeto.
    me: ref({ mustChangePassword: false, permissions: [], branchIds: [] }),
    refreshMe,
  }),
}))

vi.mock('@/features/suscripcion/composables/useSuscripcion', () => ({
  useSuscripcion: () => ({ estadoPlanActual, load: cargarSuscripcion }),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    info: toastInfo,
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    errorFrom: vi.fn(),
    warnFrom: vi.fn(),
    remove: vi.fn(),
  }),
}))

describe('router: `/planes` con sesión iniciada', () => {
  beforeEach(async () => {
    localStorage.clear()
    vi.clearAllMocks()
    cargarSuscripcion.mockResolvedValue(undefined)
    refreshMe.mockResolvedValue(undefined)
    autenticado.value = false
    estadoPlanActual.value = 'SIN_PLAN'
    // El router es un singleton entre pruebas: se vuelve a un punto neutral.
    await router.replace({ path: '/' })
  })

  it('deja entrar al cliente autenticado que todavía no tiene plan', async () => {
    autenticado.value = true
    estadoPlanActual.value = 'SIN_PLAN'

    await router.push('/planes')

    expect(router.currentRoute.value.name).toBe('planes')
    // Y el dato se le pide AL SERVIDOR en cada apertura, no a la caché: sin el
    // `true` bastaría con haber mirado el plan una vez al arrancar la sesión.
    expect(cargarSuscripcion).toHaveBeenCalledWith(true)
  })

  it('sigue mandando al tablero a quien ya contrató, pero DICIÉNDOLO', async () => {
    autenticado.value = true
    estadoPlanActual.value = 'CON_PLAN'

    await router.push('/planes')

    expect(router.currentRoute.value.name).toBe('home')
    // El silencio era la mitad del defecto. Un redirect mudo se lee como que la
    // aplicación se rompió, no como una decisión.
    expect(toastInfo).toHaveBeenCalledWith(
      'Tu clínica ya tiene un plan activo',
      expect.stringContaining('Mi suscripción'),
    )
  })

  it('deja entrar cuando el estado del plan es DESCONOCIDO (403 o red caída)', async () => {
    autenticado.value = true
    estadoPlanActual.value = 'DESCONOCIDO'

    await router.push('/planes')

    expect(router.currentRoute.value.name).toBe('planes')
    // Y no se le miente: no se afirma nada sobre un plan que no se pudo leer.
    expect(toastInfo).not.toHaveBeenCalled()
  })

  it('no le pregunta nada al servidor cuando no hay sesión', async () => {
    autenticado.value = false

    await router.push('/planes')

    expect(router.currentRoute.value.name).toBe('planes')
    expect(cargarSuscripcion).not.toHaveBeenCalled()
  })

  it('la excepción es de `/planes`, no de la zona pública entera', async () => {
    // `/registro` es `guestOnly` SIN `allowClientWithoutPlan`. Si el guard se
    // hubiera relajado en general —y no ruta a ruta— esta prueba sería la única
    // que lo notaría: el resto pasa igual con las dos implementaciones.
    autenticado.value = true
    estadoPlanActual.value = 'SIN_PLAN'

    await router.push('/registro')

    expect(router.currentRoute.value.name).toBe('home')
    expect(cargarSuscripcion).not.toHaveBeenCalled()
  })
})

describe('embudo: a dónde lleva «continuar» tras elegir', () => {
  beforeEach(() => {
    localStorage.clear()
    autenticado.value = false
  })

  /**
   * Sin esto, dejar entrar al cliente en `/planes` solo habría movido el
   * callejón un paso más adelante: las dos salidas de la pantalla —el
   * configurador de paquetes y el asistente— empujaban fijo a `signup`, que es
   * `guestOnly` y lo habría devuelto al tablero en silencio otra vez.
   */
  it('lleva al prospecto al registro', () => {
    autenticado.value = false
    expect(useContratacion().destinoTrasElegir.value).toBe('signup')
  })

  it('lleva al cliente con sesión directo al paso vinculante', () => {
    autenticado.value = true
    expect(useContratacion().destinoTrasElegir.value).toBe('contratar')
  })
})
