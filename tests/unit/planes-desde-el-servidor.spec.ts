import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { componer, fetchPlans } from '@/features/landing/api/plans.source'
import LandingPlans from '@/features/landing/components/LandingPlans.vue'
import PlanesView from '@/features/landing/views/PlanesView.vue'
import type {
  PublicPlanCatalogWire,
  PublicPlanContract,
} from '@/features/landing/types/plans.types'
import { http } from '@/services/http/http.client'

/**
 * LOS PRECIOS DE `/planes` VIENEN DEL SERVIDOR, Y EL VACÍO SE DICE.
 *
 * ── El defecto que cierra ──────────────────────────────────────────────────
 * `plans.source.ts` devolvía `PLANS_CONTENT`: tres paquetes con sus importes
 * escritos a mano en el front, sin consultar ningún endpoint. Comprobado contra
 * dev, el servidor responde 200 con la lista vacía cuando no hay lista de precio
 * publicada —estado normal del negocio, no avería— y la landing seguía enseñando
 * tres precios y dejando avanzar a contratar. Nadie podía honrarlos.
 *
 * ── Por qué muerde ─────────────────────────────────────────────────────────
 * La muestra de aquí abajo NO se parece al contenido local: otros códigos, otros
 * importes y un anual que no es ningún múltiplo del mensual. Volver a servir
 * `PLANS_CONTENT` pone en rojo el primer caso por el código y el segundo por la
 * cifra; una implementación que extrapolara el anual del mensual —el defecto que
 * este repositorio ya publicó una vez en el catálogo comercial— muere en el
 * segundo.
 */

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'planes', query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  // Ver `planes-esquema-encabezados.spec.ts`: el árbol de esta pantalla llega al
  // store de `auth`, que registra sus dos manejadores en el cliente al crearse.
  setRefreshHandler: vi.fn(),
  setSessionClearHandler: vi.fn(),
}))

const get = vi.mocked(http.get)

/**
 * Un plan del CABLE. Todo lo nulable llega con valor salvo que el caso lo quite,
 * que es lo que permite que cada descarte se pruebe moviendo UN campo.
 */
function planWire(over: Partial<PublicPlanContract> = {}): PublicPlanContract {
  return {
    code: 'PACK_CLINIC',
    name: 'Pack Clínica',
    tagline: 'Lo que dice el servidor',
    monthlyFromAmount: 189000,
    // Deliberadamente torcido: no es doce ni diez mensualidades. Sin la torsión,
    // una implementación que extrapolara pasaría en verde.
    annualFromAmount: 1_733_000,
    setupAmount: 0,
    taxRate: 19,
    taxTreatment: 'TAXED',
    includes: [{ code: 'CORE', name: 'Núcleo: clientes y mascotas', trialDays: 30 }],
    capacities: [
      {
        code: 'EXTRA_USER',
        name: 'Usuario adicional',
        unit: 'USER',
        included: 2,
        monthlyExtraUnitAmount: 12000,
        annualExtraUnitAmount: 120000,
      },
    ],
    ...over,
  }
}

function catalogoWire(plans: PublicPlanContract[]): PublicPlanCatalogWire {
  return { currency: 'COP', priceValidFrom: '2026-08-27', plans }
}

/** El catálogo que dev devuelve HOY: 200, sin tarifa y sin un solo paquete. */
const SIN_TARIFA: PublicPlanCatalogWire = { currency: null, priceValidFrom: null, plans: [] }

describe('El seam de los planes pide el catálogo al servidor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('pide `GET /plans` y devuelve lo que el servidor manda, no el contenido local', async () => {
    get.mockResolvedValue({
      data: catalogoWire([planWire({ code: 'PACK_DEL_SERVIDOR' })]),
    } as never)

    const catalogo = await fetchPlans()

    expect(get).toHaveBeenCalledWith('/plans', expect.objectContaining({ skipGlobalLoader: true }))
    // Si alguien vuelve a enchufar `PLANS_CONTENT`, aquí saldrían los tres
    // `PACK_SPA` / `PACK_CLINIC` / `PACK_FULL` y este caso se pone rojo.
    expect(catalogo.plans.map((p) => p.code)).toEqual(['PACK_DEL_SERVIDOR'])
    expect(catalogo.currency).toBe('COP')
    expect(catalogo.priceValidFrom).toBe('2026-08-27')
  })

  it('los importes son los del servidor, y el anual NO se deriva del mensual', () => {
    const { plans } = componer(catalogoWire([planWire()]))

    expect(plans[0]?.monthlyFromAmount).toBe(189000)
    expect(plans[0]?.annualFromAmount).toBe(1_733_000)
    expect(plans[0]?.taxRate).toBe(19)
    expect(plans[0]?.capacities[0]?.annualExtraUnitAmount).toBe(120000)
  })

  it('`recommended` lo pone la capa editorial, porque el contrato no lo trae', () => {
    const { plans } = componer(
      catalogoWire([planWire({ code: 'PACK_SPA' }), planWire({ code: 'PACK_CLINIC' })]),
    )

    expect(plans.find((p) => p.code === 'PACK_SPA')?.recommended).toBe(false)
    expect(plans.find((p) => p.code === 'PACK_CLINIC')?.recommended).toBe(true)
  })

  it('el `tagline` del servidor pasa tal cual, salvo el de `PACK_FULL`', () => {
    const { plans } = componer(
      catalogoWire([
        planWire({ code: 'PACK_SPA', tagline: 'Núcleo, agenda, servicios, spa y caja' }),
        // La semilla publica aquí una nota interna de modelado; enseñarla en la
        // pantalla donde alguien decide una compra es el defecto que el overlay
        // tapa mientras la semilla no se corrija.
        planWire({
          code: 'PACK_FULL',
          tagline: 'Todo el producto: quince piezas enumeradas, sin anidar paquetes',
        }),
      ]),
    )

    expect(plans.find((p) => p.code === 'PACK_SPA')?.tagline).toBe(
      'Núcleo, agenda, servicios, spa y caja',
    )
    expect(plans.find((p) => p.code === 'PACK_FULL')?.tagline).toBe(
      'Todo el producto, de la historia clínica a la facturación DIAN',
    )
  })

  it('un plan sin `tagline` se publica sin descripción, no se descarta', () => {
    const { plans } = componer(catalogoWire([planWire({ tagline: null })]))

    expect(plans).toHaveLength(1)
    expect(plans[0]?.tagline).toBe('')
  })

  // Los tres descartes, uno por campo. Ver la nota de `publicable`: un plan
  // tarifado en un solo ciclo se pintaría con `—` y dejaría contratar igual.
  it.each([
    ['sin precio mensual', { monthlyFromAmount: null }],
    ['sin precio anual', { annualFromAmount: null }],
    ['sin tipo impositivo', { taxRate: null }],
  ])('un plan %s no se publica', (_caso, hueco) => {
    const { plans } = componer(catalogoWire([planWire(hueco as Partial<PublicPlanContract>)]))

    expect(plans).toEqual([])
  })

  it('un campo OMITIDO por el servidor descarta igual que un `null` explícito', () => {
    // springdoc declara estos campos opcionales, así que la respuesta puede no
    // traerlos. Un `=== null` a secas los dejaría pasar como `undefined` y el
    // `NaN` aparecería en pantalla.
    const cojo = planWire()
    delete (cojo as Partial<PublicPlanContract>).monthlyFromAmount

    expect(componer(catalogoWire([cojo])).plans).toEqual([])
  })

  it('un importe que no es un número se trata como ausente, y no se cuela a la pantalla', () => {
    // No es una hipótesis: serializar `BigDecimal` como texto es una opción de
    // configuración de Jackson, y `'189000'` pasa cualquier comprobación de
    // «no es nulo» para llegar luego a `precioBase()`, que promete `number`.
    // Un importe que no es un número es un importe que no hay.
    const raro = planWire({ monthlyFromAmount: '189000' as unknown as number })

    expect(componer(catalogoWire([raro])).plans).toEqual([])
  })

  it('`setupAmount` ausente NO descarta: esta pantalla no lo pinta', () => {
    const { plans } = componer(catalogoWire([planWire({ setupAmount: null })]))

    expect(plans).toHaveLength(1)
    expect(plans[0]?.code).toBe('PACK_CLINIC')
  })

  it('el catálogo sin tarifa compone un catálogo vacío, y no revienta', () => {
    const catalogo = componer(SIN_TARIFA)

    expect(catalogo.plans).toEqual([])
    expect(catalogo.currency).toBeNull()
    expect(catalogo.priceValidFrom).toBeNull()
  })
})

const PublicLayoutFalso = { template: '<div><slot /></div>' }

function montarVista() {
  return mount(PlanesView, {
    shallow: true,
    global: { stubs: { PublicLayout: PublicLayoutFalso } },
  })
}

describe('`/planes` dice la verdad cuando el servidor no tiene tarifa', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('con paquetes, encabeza y ofrece el configurador', async () => {
    get.mockResolvedValue({ data: catalogoWire([planWire()]) } as never)

    const wrapper = montarVista()
    await flushPromises()

    expect(wrapper.get('#paquetes-h2').text()).toBe('O parte de una combinación conocida')
    expect(wrapper.find('[data-testid="planes-vacio"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'PlanesCombinaciones' }).exists()).toBe(true)
  })

  it('sin tarifa, no promete un precio ni manda a contratar', async () => {
    get.mockResolvedValue({ data: SIN_TARIFA } as never)

    const wrapper = montarVista()
    await flushPromises()

    // El encabezado también cambia: «O parte de una combinación conocida» sobre un
    // hueco es una instrucción que la pantalla no puede cumplir.
    expect(wrapper.get('#paquetes-h2').text()).toBe('Todavía no hay paquetes publicados')

    const aviso = wrapper.get('[data-testid="planes-vacio"]')
    // Se ANUNCIA. Sin esto, quien navega con lector espera una lista que no viene.
    expect(aviso.attributes('role')).toBe('status')
    expect(aviso.text()).toContain('soporte@vetsoftware.co')

    // Y no queda ni un camino a contratar un importe que nadie puede honrar.
    expect(wrapper.findComponent({ name: 'PlanesCombinaciones' }).exists()).toBe(false)
  })

  it('mientras la petición está en vuelo NO afirma que no haya paquetes', async () => {
    // La rama vieja (`plans.length === 0` a secas) se cumplía en el primer
    // render, porque `usePlanes` pide el catálogo en su `onMounted` y hasta que
    // la respuesta no vuelve la lista está vacía. Con red detrás eso es un
    // parpadeo de «no hay paquetes» sobre un catálogo que llega después.
    get.mockReturnValue(new Promise(() => {}) as never)

    const wrapper = montarVista()
    await flushPromises()

    expect(wrapper.find('[data-testid="planes-vacio"]').exists()).toBe(false)
    expect(wrapper.get('#paquetes-h2').text()).toBe('O parte de una combinación conocida')
  })

  it('un fallo de red manda su propio mensaje, no el del vacío', async () => {
    // «No pudimos cargarlo» y «no hay nada publicado» son dos frases distintas, y
    // solo la primera ofrece hacer algo.
    get.mockRejectedValue(new Error('sin red'))

    const wrapper = montarVista()
    await flushPromises()

    expect(wrapper.find('[data-testid="planes-vacio"]').exists()).toBe(false)
    expect(wrapper.get('.pub-error').text()).toContain('No pudimos cargar los planes')
  })
})

describe('La portada tampoco afirma el vacío antes de tiempo', () => {
  /**
   * `LandingPlans` tenía el MISMO `v-else-if="plans.length === 0"` sin guarda, y
   * el corte a red lo convirtió de inofensivo en visible: `usePlanes()` pide el
   * catálogo en su `onMounted`, que corre después del primer render, así que
   * entre el montaje y la respuesta `loading` es `false` y la lista está vacía.
   * Con contenido local eso duraba un microtask; con un viaje de red se pinta,
   * y es la portada.
   */
  function montarSeccion(loaded: boolean, plans: ReturnType<typeof componer>['plans'] = []) {
    return mount(LandingPlans, {
      shallow: true,
      props: { plans, loading: false, error: null, loaded },
    })
  }

  it('con el catálogo aún sin volver, NO dice que no haya paquetes', () => {
    expect(montarSeccion(false).find('[data-testid="landing-planes-vacio"]').exists()).toBe(false)
  })

  it('con el catálogo ya vuelto y vacío, lo dice y lo anuncia', () => {
    const aviso = montarSeccion(true).get('[data-testid="landing-planes-vacio"]')

    expect(aviso.attributes('role')).toBe('status')
    expect(aviso.text()).toContain('soporte@vetsoftware.co')
  })

  it('con paquetes no se pinta el vacío', () => {
    const { plans } = componer(catalogoWire([planWire()]))

    expect(montarSeccion(true, plans).find('[data-testid="landing-planes-vacio"]').exists()).toBe(
      false,
    )
  })
})
