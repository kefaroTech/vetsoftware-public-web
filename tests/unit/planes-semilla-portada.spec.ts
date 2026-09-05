import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { fetchCatalogo } from '@/features/asistente/api/catalogo.source'
import { useSeleccionPortadaStore } from '@/features/landing/stores/seleccionPortada.store'
import PlanesView from '@/features/landing/views/PlanesView.vue'
import type { PublicPlanCatalogWire } from '@/features/landing/types/plans.types'
import { http } from '@/services/http/http.client'
import { catalogoEmbudo } from '../helpers/catalogo-embudo'

/**
 * LO QUE SE MARCÓ EN LA PORTADA SOBREVIVE A «VER PROPUESTA».
 *
 * <p>`/planes` montaba su cotizador y lo sembraba desde el paquete recomendado,
 * así que las casillas que el visitante acababa de tocar en el hero se perdían
 * en el primer salto. Un valor por defecto que no sobrevive a la navegación no
 * es un valor por defecto (#374).
 *
 * ── Los tres caminos que no pueden cambiar ─────────────────────────────────
 * Entrar a `/planes` por URL directa —sin pasar por la portada— sigue sembrando
 * desde el paquete recomendado; `?plan=` sigue mandando, que es lo que pulsan
 * las tarjetas de combinación y la banda de reanudar; y la entrega se consume,
 * para que una visita posterior no reviva una selección que ya no es de nadie.
 */

const ruta = vi.hoisted(() => ({ query: {} as Record<string, string> }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'planes', query: ruta.query }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  // El árbol de esta pantalla llega al store de `auth`, que registra sus dos
  // manejadores en el cliente al crearse.
  setRefreshHandler: vi.fn(),
  setSessionClearHandler: vi.fn(),
}))

vi.mock('@/features/asistente/api/catalogo.source', () => ({ fetchCatalogo: vi.fn() }))

const get = vi.mocked(http.get)
const traerCatalogo = vi.mocked(fetchCatalogo)

/** `PACK_CLINIC` es el que la capa editorial marca como recomendado. */
const PLANES: PublicPlanCatalogWire = {
  currency: 'COP',
  priceValidFrom: '2026-08-27',
  plans: [
    {
      code: 'PACK_CLINIC',
      name: 'Pack Clínica',
      tagline: 'Lo que dice el servidor',
      monthlyFromAmount: 189_000,
      annualFromAmount: 1_733_000,
      setupAmount: 0,
      taxRate: 19,
      taxTreatment: 'TAXED',
      includes: [{ code: 'CORE', name: 'Núcleo: clientes y mascotas', trialDays: 30 }],
      capacities: [],
    },
  ],
}

/** Los módulos del paquete recomendado: lo que se siembra cuando nadie trae nada. */
const DEL_PAQUETE = ['SCHEDULING', 'CLINICAL_HISTORY']

async function montar() {
  const wrapper = mount(PlanesView, {
    shallow: true,
    global: { stubs: { PublicLayout: { template: '<div><slot /></div>' } } },
  })
  await flushPromises()
  return wrapper
}

/** La selección con la que la pantalla queda, leída donde se pinta. */
function seleccionDe(wrapper: Awaited<ReturnType<typeof montar>>): string[] {
  return [...(wrapper.findComponent({ name: 'PlanesTarjetaModulos' }).props('modulos') as string[])]
}

describe('`/planes` siembra con lo que trae el visitante, no con lo que él no eligió', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ruta.query = {}
    get.mockResolvedValue({ data: PLANES } as never)
    traerCatalogo.mockResolvedValue(catalogoEmbudo())
  })

  it('la selección de la portada llega y le gana al paquete recomendado', async () => {
    useSeleccionPortadaStore().entregar(['CASH_REGISTER'])

    const wrapper = await montar()

    expect(seleccionDe(wrapper)).toEqual(['CASH_REGISTER'])
    // El paquete recomendado sigue publicado; lo que ya no hace es sembrar.
    expect(seleccionDe(wrapper)).not.toContain('CLINICAL_HISTORY')
  })

  it('entrar directo por URL, sin pasar por la portada, sigue sembrando el paquete recomendado', async () => {
    const wrapper = await montar()

    expect(seleccionDe(wrapper)).toEqual(DEL_PAQUETE)
  })

  it('quitarlo todo en la portada llega como tal: ninguna casilla vuelve sola', async () => {
    // Una lista vacía es una decisión del visitante; `null` sería no venir de la
    // portada. Si las dos se trataran igual, quitar las cuatro casillas y
    // continuar le devolvería marcado el paquete recomendado.
    useSeleccionPortadaStore().entregar([])

    const wrapper = await montar()

    expect(seleccionDe(wrapper)).toEqual([])
  })

  it('`?plan=` sigue mandando: es un paquete recién pulsado, no una selección vieja', async () => {
    ruta.query = { plan: 'PACK_CLINIC' }
    useSeleccionPortadaStore().entregar(['CASH_REGISTER'])

    const wrapper = await montar()

    expect(seleccionDe(wrapper)).toEqual(DEL_PAQUETE)
  })

  it('la entrega se consume: la visita siguiente vuelve a sembrar el paquete', async () => {
    useSeleccionPortadaStore().entregar(['CASH_REGISTER'])

    expect(seleccionDe(await montar())).toEqual(['CASH_REGISTER'])
    expect(useSeleccionPortadaStore().modulos).toBeNull()
    expect(seleccionDe(await montar())).toEqual(DEL_PAQUETE)
  })
})
