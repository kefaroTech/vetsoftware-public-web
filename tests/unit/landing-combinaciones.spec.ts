import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import LandingPlans from '@/features/landing/components/LandingPlans.vue'
import type {
  PublicCatalogItemResponse,
  PublicCatalogPackResponse,
  PublicCatalogResponse,
} from '@/features/asistente/types/catalogo.types'
import type { PublicPlan } from '@/features/landing/types/plans.types'
import { http } from '@/services/http/http.client'

/**
 * LA SECCIÓN DE COMBINACIONES DE LA PORTADA.
 *
 * <p>Los paquetes dejaron de ser paquetes: son atajos que marcan varios módulos
 * de una vez. Eso mueve tres cosas de sitio y las tres se pagan en dinero o en
 * confianza si se rompen — de dónde sale la destacada, qué hace el CTA y si la
 * tarjeta avisa de que quitar una casilla SUBE el precio.
 *
 * <p>La muestra está **deliberadamente torcida** contra el overlay editorial del
 * front: aquí el servidor recomienda `PACK_SPA`, mientras `OVERLAY_EDITORIAL`
 * tiene cableado `PACK_CLINIC`. Volver a leer `PublicPlan.recommended` pone el
 * primer caso en rojo.
 */

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: '/', query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  setRefreshHandler: vi.fn(),
  setSessionClearHandler: vi.fn(),
}))

const get = vi.mocked(http.get)

function articulo(over: Partial<PublicCatalogItemResponse> = {}): PublicCatalogItemResponse {
  return {
    code: 'SCHEDULING',
    name: 'Agenda de citas',
    description: null,
    mandatory: false,
    trialDays: 30,
    monthlyAmount: 35_000,
    annualAmount: 350_000,
    setupAmount: null,
    taxRate: 19,
    taxTreatment: null,
    selfServiceEligible: true,
    areaCode: 'PATIENT_CARE',
    shortLabel: 'Agenda',
    ...over,
  }
}

function paquete(over: Partial<PublicCatalogPackResponse> = {}): PublicCatalogPackResponse {
  return {
    code: 'PACK_SPA',
    name: 'Estética y guardería',
    tagline: 'Lo mínimo para agendar, atender y cobrar el spa',
    // Menos que la suma de sus piezas (69.000 + 35.000 + 29.000 = 133.000): el
    // descuento del paquete es lo que el aviso preventivo anuncia.
    monthlyAmount: 119_000,
    annualAmount: 1_190_000,
    setupAmount: null,
    taxRate: 19,
    taxTreatment: null,
    componentCodes: ['CORE', 'CAPACITY_USER', 'SCHEDULING', 'GROOMING'],
    recommended: true,
    ...over,
  }
}

const CATALOGO: PublicCatalogResponse = {
  currency: 'COP',
  priceValidFrom: '2026-08-27',
  modules: [
    articulo({ code: 'CORE', name: 'Núcleo', mandatory: true, monthlyAmount: 69_000 }),
    articulo(),
    articulo({ code: 'GROOMING', name: 'Spa y estética', monthlyAmount: 29_000 }),
    articulo({ code: 'CLINICAL_HISTORY', name: 'Historia clínica', monthlyAmount: 49_000 }),
  ],
  capacities: [
    {
      code: 'CAPACITY_USER',
      name: 'Personas incluidas',
      description: null,
      mandatory: true,
      unit: 'USER',
      monthlyIncludedQuantity: 1,
      annualIncludedQuantity: 1,
      monthlyUnitAmount: null,
      annualUnitAmount: null,
      taxRate: 19,
      taxTreatment: null,
      selfServiceEligible: false,
    },
  ],
  oneTimeItems: [],
  packs: [
    paquete(),
    paquete({
      code: 'PACK_CLINIC',
      name: 'Consulta de barrio',
      componentCodes: ['CORE', 'CLINICAL_HISTORY'],
      recommended: false,
    }),
  ],
  requirements: [],
  areas: [{ code: 'PATIENT_CARE', name: 'Atención' }],
}

function plan(over: Partial<PublicPlan> = {}): PublicPlan {
  return {
    code: 'PACK_SPA',
    name: 'Estética y guardería',
    tagline: 'Lo mínimo para agendar, atender y cobrar el spa',
    monthlyFromAmount: 119_000,
    annualFromAmount: 1_190_000,
    setupAmount: 0,
    taxRate: 19,
    taxTreatment: 'TAXED',
    recommended: false,
    includes: [],
    capacities: [
      {
        code: 'EXTRA_USER',
        name: 'Persona adicional',
        unit: 'USER',
        included: 2,
        monthlyExtraUnitAmount: 12_000,
        annualExtraUnitAmount: 120_000,
      },
      {
        code: 'EXTRA_BRANCH',
        name: 'Sede adicional',
        unit: 'BRANCH',
        included: 1,
        monthlyExtraUnitAmount: 35_000,
        annualExtraUnitAmount: 350_000,
      },
    ],
    ...over,
  }
}

/**
 * `PACK_CLINIC` es el que `OVERLAY_EDITORIAL` marca a mano, así que se le pone
 * `recommended: true` en el prop: si la tarjeta volviera a leerlo, la insignia
 * caería aquí y no donde el servidor la puso.
 */
const PLANES: PublicPlan[] = [
  plan(),
  plan({ code: 'PACK_CLINIC', name: 'Consulta de barrio', recommended: true }),
]

interface Props {
  plans: PublicPlan[]
  loading: boolean
  error: unknown
  loaded: boolean
}

async function montar(props: Partial<Props> = {}) {
  const wrapper = mount(LandingPlans, {
    props: { plans: PLANES, loading: false, error: null, loaded: true, ...props },
  })
  await flushPromises()
  return wrapper
}

/**
 * `Intl` separa el símbolo de la cifra con un espacio DURO, así que un literal
 * escrito a mano con espacio normal no casaría nunca.
 */
function texto(valor: string | undefined): string {
  return (valor ?? '').replace(/\s/g, ' ')
}

describe('Las combinaciones de la portada', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    get.mockResolvedValue({ data: CATALOGO } as never)
  })

  it('la destacada la decide el servidor, no el overlay editorial del front', async () => {
    const tarjetas = (await montar()).findAll('[data-testid="plan-card"]')

    expect(tarjetas).toHaveLength(2)
    expect(tarjetas[0]?.find('.pub-badge').exists()).toBe(true)
    expect(tarjetas[0]?.get('.pub-badge').text()).toBe('La que más eligen')
    // El que el front cablea a mano NO lleva insignia: la marca es del catálogo.
    expect(tarjetas[1]?.find('.pub-badge').exists()).toBe(false)
  })

  it('el realce de la recomendada no es solo el borde de color', async () => {
    const tarjetas = (await montar()).findAll('[data-testid="plan-card"]')

    expect(tarjetas[0]?.classes()).toContain('pub-plan-card--featured')
    expect(tarjetas[0]?.get('h3').attributes('aria-describedby')).toBe(
      tarjetas[0]?.get('.pub-badge').attributes('id'),
    )
  })

  it('el CTA siembra los módulos del paquete, y nada más', async () => {
    const wrapper = await montar()

    await wrapper.findAll('[data-testid="plan-card-cta"]')[0]?.trigger('click')

    // Ni `CORE` ni la capacidad: no son casillas, y mandarlas rompería la cesta.
    expect(wrapper.emitted('sembrar')?.[0]).toEqual([['SCHEDULING', 'GROOMING'], 'MENSUAL'])
  })

  it('el rótulo del CTA nombra su propio plan, y por eso los tres se distinguen', async () => {
    const tarjetas = (await montar()).findAll('[data-testid="plan-card"]')

    // `landing-comercial-y-contratacion.md:826` pide un único control cuyo texto
    // nombre el plan. El nombre va en el texto VISIBLE y no en un `aria-label`,
    // que dejaría el nombre accesible sin el rótulo y rompería §2.5.3 Label in
    // Name; el `aria-describedby` al `<h3>` se conserva aparte.
    const rotulos = tarjetas.map((tarjeta) => {
      const nombre = tarjeta.get('h3').text()
      expect(tarjeta.get('[data-testid="plan-card-cta"]').text()).toBe(`Marcar los de ${nombre}`)
      return tarjeta.get('[data-testid="plan-card-cta"]').text()
    })

    // El defecto que esto cierra: tres rótulos idénticos en una comparación de
    // tres columnas obligan a volver a subir la vista para saber qué se elige.
    expect(new Set(rotulos).size).toBe(tarjetas.length)
  })

  it('el conteo de módulos concuerda en singular', async () => {
    const conteos = (await montar()).findAll('[data-testid="plan-card-conteo"]')

    expect(conteos[0]?.text()).toBe('Clientes y mascotas + 2 módulos')
    // El prototipo escribía «+ 1 módulos» con el plural clavado.
    expect(conteos[1]?.text()).toBe('Clientes y mascotas + 1 módulo')
  })

  it('avisa de que quitar un módulo sube el precio, con las cifras del catálogo', async () => {
    const avisos = (await montar()).findAll('[data-testid="plan-card-descuento"]')

    // Las dos cifras llevan el IVA dentro, como la que se pinta arriba: comparar
    // un precio con impuesto contra una suma sin él daría un ahorro inventado.
    expect(texto(avisos[0]?.text())).toBe(
      'Los 2 juntos salen más baratos: $ 141.610 en vez de $ 158.270. Si quitas uno, se cobran por separado.',
    )
    // Con un solo módulo no hay combinación que romper, así que no hay aviso.
    expect(avisos).toHaveLength(1)
  })

  it('la nota interpola el núcleo, lo incluido y las unidades adicionales', async () => {
    const nota = texto((await montar()).get('[data-testid="landing-planes-nota"]').text())

    expect(nota).toBe(
      'Todas parten de clientes y mascotas ($ 69.000 al mes) con 2 personas y 1 sede. ' +
        'Cada sede adicional cuesta $ 35.000 al mes y cada persona adicional $ 12.000 al mes.',
    )
  })

  it('la lista de módulos lleva su precio y cierra con el recordatorio', async () => {
    const puntos = (await montar())
      .findAll('[data-testid="plan-card"]')[0]
      ?.findAll('.land-plan-list li')
      .map((li) => texto(li.text()))

    expect(puntos).toEqual([
      'Agenda de citas · $ 35.000',
      'Spa y estética · $ 29.000',
      'Quita en el siguiente paso lo que no uses',
    ])
  })
})

describe('El camino no se corta cuando no hay combinaciones', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    get.mockResolvedValue({ data: CATALOGO } as never)
  })

  it('un fallo de red pinta el error CON reintento, y no la rejilla', async () => {
    const wrapper = await montar({ error: new Error('sin red') })

    expect(wrapper.get('.pub-error').text()).toContain('No pudimos cargar los planes')
    expect(wrapper.find('[data-testid="plan-card"]').exists()).toBe(false)

    await wrapper.get('.land-retry').trigger('click')
    expect(wrapper.emitted('reintentar')).toHaveLength(1)
  })

  it('mientras carga lo dice, y no afirma el vacío', async () => {
    const wrapper = await montar({ loading: true })

    expect(wrapper.get('.land-plans-loading').text()).toBe('Cargando los planes…')
    expect(wrapper.find('[data-testid="landing-planes-vacio"]').exists()).toBe(false)
  })

  it('con el catálogo vuelto y vacío, lo anuncia y deja una vía de contacto', async () => {
    const aviso = (await montar({ plans: [] })).get('[data-testid="landing-planes-vacio"]')

    expect(aviso.attributes('role')).toBe('status')
    expect(aviso.text()).toContain('soporte@kefaro.tech')
  })

  it('sin el catálogo comercial la tarjeta sigue en pie, sin desglose', async () => {
    get.mockRejectedValue(new Error('catálogo caído'))

    const wrapper = await montar()

    expect(wrapper.findAll('[data-testid="plan-card"]')).toHaveLength(2)
    expect(wrapper.find('[data-testid="plan-card-conteo"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="plan-card-descuento"]').exists()).toBe(false)
  })
})
