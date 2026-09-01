import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { olvidarSesiones } from '@/features/asistente/api/asistente.source'
import AsistenteEntrada from '@/features/asistente/components/AsistenteEntrada.vue'
import AsistenteLimiteAviso from '@/features/asistente/components/AsistenteLimiteAviso.vue'
import AsistentePanel from '@/features/asistente/components/AsistentePanel.vue'
import { usePropuestaStore } from '@/features/asistente/stores/propuesta.store'
import { http } from '@/services/http/http.client'

/**
 * CUANDO SE AGOTA EL CUPO.
 *
 * ── El defecto que fija ────────────────────────────────────────────────────
 * El servidor respondía 429 y la pantalla decía «El asistente no está
 * disponible ahora mismo, y todavía no hay módulos publicados… Puedes empezar
 * por uno de nuestros paquetes, aquí abajo». Dos cosas mal a la vez:
 *
 *  1. le hablaba de **módulos** a quien había agotado su **cupo**, y
 *  2. el 429 caía en el `catch` genérico de `generar` y **sumaba a `fallos`**,
 *     así que **dos límites seguidos degradaban la pantalla de verdad** a
 *     `ASISTENTE_CAIDO` — una avería inventada sobre un asistente que funciona.
 *
 * El segundo es el grave, y es el que sostiene el caso «dos límites seguidos».
 * Sin él, cualquiera puede volver a meter el 429 en el contador sin que nada se
 * ponga rojo: el primer intento seguiría diciendo la frase correcta.
 *
 * ── Los contrapesos ────────────────────────────────────────────────────────
 * Cada afirmación va con la suya en la dirección contraria: un 500 **sí** tiene
 * que contar como fallo (si no, una rama que tratara todo como límite pasaría
 * los dos primeros casos), y sin `Retry-After` la pantalla **no** puede
 * inventarse un plazo.
 */

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  // Igual que en `asistente-sin-catalogo.spec.ts`: el árbol del panel llega
  // hasta el store de `auth`, que registra sus dos manejadores al crearse.
  setRefreshHandler: vi.fn(),
  setSessionClearHandler: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'planes', query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

const get = vi.mocked(http.get)
const post = vi.mocked(http.post)

/**
 * La forma del rechazo de axios ante el 429, con el cuerpo REAL del servidor.
 *
 * <p>El `detail` viene en inglés a propósito en esta fixture: es el literal que
 * emite el backend, y está aquí para que se vea que la pantalla no lo pinta
 * nunca. Ninguna afirmación de este fichero lo mira, y la rama se decide por
 * `status`.
 */
function limite(retryAfter?: string) {
  return {
    response: {
      status: 429,
      headers: retryAfter === undefined ? {} : { 'retry-after': retryAfter },
      data: {
        status: 429,
        title: 'Too Many Requests',
        detail: 'Too many proposal requests. Try again later.',
      },
    },
  }
}

/** Una avería de verdad, para el contrapeso. */
const AVERIA = { response: { status: 500, headers: {}, data: { status: 500 } } }

async function pedirPropuesta(rechazo: unknown) {
  const store = usePropuestaStore()
  store.texto = 'Clínica de barrio, consulta general y vacunas'
  store.email = 'ana@clinica.co'
  post.mockRejectedValueOnce(rechazo)
  await store.generar([])
  return store
}

function montarAviso(sinPaquetes: boolean, espera: 'HORA' | 'DIA' | null) {
  return mount(AsistenteLimiteAviso, { props: { sinPaquetes, espera } })
}

describe('Un 429 es un límite alcanzado, y no una avería', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    olvidarSesiones()
  })

  it('deja la pantalla en LIMITE_ALCANZADO', async () => {
    const store = await pedirPropuesta(limite())

    expect(store.estado).toBe('LIMITE_ALCANZADO')
    // Y el texto del prospecto sigue intacto: es lo que el aviso le promete.
    expect(store.texto).toBe('Clínica de barrio, consulta general y vacunas')
  })

  it('NO incrementa `fallos`: dos límites seguidos no degradan la pantalla', async () => {
    const store = await pedirPropuesta(limite())
    expect(store.fallos).toBe(0)

    post.mockRejectedValueOnce(limite())
    await store.generar([])

    // Esta es la afirmación que impide que vuelva la degradación. Con el 429
    // contando como fallo, aquí habría `ASISTENTE_CAIDO` y un aviso que habla
    // de módulos a quien agotó su cupo.
    expect(store.fallos).toBe(0)
    expect(store.estado).toBe('LIMITE_ALCANZADO')
  })

  it('pero un 500 sí cuenta como fallo, y a los dos degrada', async () => {
    // El contrapeso. Una rama que tratara cualquier error como límite pasaría
    // los dos casos anteriores y rompería la degradación de verdad.
    const store = await pedirPropuesta(AVERIA)
    expect(store.fallos).toBe(1)
    expect(store.estado).toBe('ERROR_MODELO')

    post.mockRejectedValueOnce(AVERIA)
    await store.generar([])

    expect(store.fallos).toBe(2)
    expect(store.estado).toBe('ASISTENTE_CAIDO')
  })

  it('lee `Retry-After` cuando llega, y no se inventa el plazo cuando no', async () => {
    const store = await pedirPropuesta(limite('3600'))
    expect(store.esperaLimite).toBe('HORA')

    post.mockRejectedValueOnce(limite('86400'))
    await store.generar([])
    expect(store.esperaLimite).toBe('DIA')

    // Hoy la cabecera no cruza el CORS: sin ella no hay plazo que decir.
    post.mockRejectedValueOnce(limite())
    await store.generar([])
    expect(store.esperaLimite).toBe(null)

    // Y una fecha HTTP —la otra forma legal de `Retry-After`— tampoco se
    // adivina: cae al mismo «no lo sabemos».
    post.mockRejectedValueOnce(limite('Wed, 21 Oct 2026 07:28:00 GMT'))
    await store.generar([])
    expect(store.esperaLimite).toBe(null)
  })
})

describe('El aviso del límite lo dice con su nombre', () => {
  it('con paquetes publicados ofrece esperar o empezar por un paquete', () => {
    const aviso = montarAviso(false, null).get('[data-testid="asistente-limite"]')

    const texto = aviso.text()
    expect(texto).toContain('Has alcanzado el límite de propuestas')
    // «No es un fallo» va primero, y no es cortesía: sin ella el visitante
    // asume que el problema era su texto y lo reescribe gastando un intento que
    // ya no tiene.
    expect(texto).toContain('No es un fallo')
    expect(texto).toContain('Lo que escribiste sigue ahí arriba, tal como lo dejaste.')
    expect(texto).toContain('volver a intentarlo más tarde')
    expect(texto).toContain('uno de nuestros paquetes, aquí abajo')
  })

  it('sin paquetes publicados no manda a una sección vacía: manda a una persona', () => {
    const wrapper = montarAviso(true, null)
    const aviso = wrapper.get('[data-testid="asistente-limite"]')

    const texto = aviso.text()
    expect(texto).toContain('Has alcanzado el límite de propuestas')
    expect(texto).toContain('No es un fallo')
    expect(texto).toContain('te armamos el plan a mano')
    expect(texto).not.toContain('paquetes, aquí abajo')
    expect(wrapper.find('a[href="mailto:soporte@vetsoftware.co"]').exists()).toBe(true)
  })

  it('es `status` y no `alert`: no hay nada que atender ahora mismo', () => {
    // Se afirma el rol y NUNCA el color: el tono es una decisión de diseño que
    // se lee en la clase, y una prueba que la fije convierte cada retoque
    // visual en un test rojo sin haber roto nada.
    const aviso = montarAviso(false, null).get('[data-testid="asistente-limite"]')

    expect(aviso.attributes('role')).toBe('status')
  })

  it('no ofrece un botón de reintentar, que fallaría de forma determinista', () => {
    expect(montarAviso(false, null).find('button').exists()).toBe(false)
    expect(montarAviso(true, null).find('button').exists()).toBe(false)
  })

  it('dice el plazo cuando el servidor lo dijo, y solo entonces', () => {
    expect(montarAviso(false, 'HORA').text()).toContain('volver a intentarlo dentro de una hora')
    expect(montarAviso(false, 'DIA').text()).toContain('volver a intentarlo mañana')
    // Tres límites simultáneos y el front no sabe cuál saltó: «en una hora»
    // sería mentira en dos de los tres casos.
    expect(montarAviso(false, null).text()).toContain('volver a intentarlo más tarde')
  })
})

describe('La pantalla entera, con el cupo agotado', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    olvidarSesiones()
    get.mockResolvedValue({ data: { currency: 'COP', modules: [], packs: [] } } as never)
  })

  it('pinta el aviso del límite y NO el del asistente caído', async () => {
    await pedirPropuesta(limite())

    const wrapper = mount(AsistentePanel, {
      shallow: true,
      props: { sinPaquetes: false },
      global: { stubs: { AsistenteLimiteAviso: false } },
    })
    await flushPromises()

    expect(usePropuestaStore().estado).toBe('LIMITE_ALCANZADO')
    expect(wrapper.find('[data-testid="asistente-limite"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="asistente-caido"]').exists()).toBe(false)
    // El cuadro de texto sigue montado: es lo que hace cierta la frase «lo que
    // escribiste sigue ahí arriba», y es también por dónde puede reintentar
    // quien quiera, sin que le invitemos a hacerlo.
    expect(wrapper.findComponent(AsistenteEntrada).exists()).toBe(true)
  })
})
