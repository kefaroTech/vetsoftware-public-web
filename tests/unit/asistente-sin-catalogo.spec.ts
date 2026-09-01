import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { olvidarSesiones } from '@/features/asistente/api/asistente.source'
import AsistenteCaidoAviso from '@/features/asistente/components/AsistenteCaidoAviso.vue'
import AsistentePanel from '@/features/asistente/components/AsistentePanel.vue'
import CatalogoManual from '@/features/asistente/components/CatalogoManual.vue'
import type { GrupoConArticulos } from '@/features/asistente/composables/useCatalogoComercial'
import { usePropuestaStore } from '@/features/asistente/stores/propuesta.store'
import type { AssistantProposalResponse } from '@/features/asistente/types/asistente.types'
import type {
  ArticuloCatalogo,
  CatalogoComercial,
  PublicCatalogResponse,
} from '@/features/asistente/types/catalogo.types'
import { http } from '@/services/http/http.client'

/**
 * CUANDO NO HAY NADA QUE VENDER.
 *
 * ── El defecto que fija ────────────────────────────────────────────────────
 * Sin lista de precios publicada, `GET /catalog` responde **200 con todo
 * vacío** —es un estado normal del negocio, no una avería— y el asistente
 * responde con el token a `null`, que el seam clasifica como `NO_DISPONIBLE` y
 * la pantalla como `ASISTENTE_CAIDO`. Lo que veía entonces un visitante era:
 *
 *  1. un banner que le ofrecía **armar su plan a mano aquí abajo**, y
 *  2. justo debajo, el encabezado «¿Te falta algo? Añádelo tú» **sobre nada**,
 *     porque `grupos` filtra fuera todo grupo sin artículos y no había ninguna
 *     rama de lista vacía.
 *
 * Una instrucción imposible y un hueco, en la pantalla que decide la compra.
 * No parece una avería por el asistente: lo parece por la pantalla.
 *
 * ── Por qué muerde de verdad ───────────────────────────────────────────────
 * El último caso recorre la cadena entera —cuerpo de la respuesta →
 * `comoResultado` → estado del store → prop del panel → marcado— y los cinco
 * primeros aíslan cada mitad para que, cuando se ponga rojo, se sepa cuál. Y
 * cada afirmación va con su contrapeso: un componente que pintara el estado
 * vacío SIEMPRE pasaría el primer caso y sería igual de deshonesto al revés.
 */

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  // Igual que en `asistente-origen.spec.ts`: el árbol del panel llega hasta el
  // store de `auth`, que registra sus dos manejadores en el cliente al crearse.
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
 * La respuesta LITERAL de dev con el catálogo sin publicar. Copiada del cuerpo
 * real, no inventada: es la forma que hay que soportar.
 */
const CATALOGO_VACIO: PublicCatalogResponse = {
  currency: null,
  priceValidFrom: null,
  modules: [],
  capacities: [],
  oneTimeItems: [],
  packs: [],
  requirements: [],
}

const CATALOGO_CON_MODULO: PublicCatalogResponse = {
  ...CATALOGO_VACIO,
  currency: 'COP',
  modules: [
    {
      code: 'CLINICAL_HISTORY',
      name: 'Historia clínica',
      description: 'El expediente del paciente',
      mandatory: false,
      trialDays: null,
      monthlyAmount: 49000,
      annualAmount: 490000,
      setupAmount: null,
      taxRate: 19,
      taxTreatment: null,
      selfServiceEligible: true,
    },
  ],
}

/** El cuerpo del asistente sin tarifa: token nulo y el rótulo nuevo. */
const SIN_CATALOGO: AssistantProposalResponse = {
  token: null,
  presentation: 'NO_CATALOG',
  expiresAt: null,
  version: null,
  lines: [],
  recommendations: [],
  discardedLines: null,
  currency: null,
  subtotal: null,
  taxes: null,
  total: null,
  firstPeriodTotal: null,
  packOffer: null,
  refinementsLeft: null,
  recalculated: null,
}

const ARTICULO: ArticuloCatalogo = {
  code: 'CLINICAL_HISTORY',
  nombre: 'Historia clínica',
  descripcion: 'El expediente del paciente',
  grupo: 'CLINICA',
  importe: 49000,
  trialDays: null,
  obligatorio: false,
  vendible: true,
}

function catalogo(articulos: ArticuloCatalogo[]): CatalogoComercial {
  return {
    currency: articulos.length > 0 ? 'COP' : null,
    priceValidFrom: null,
    articulos,
    capacidades: [],
    paquetes: [],
    arcos: [],
  }
}

const GRUPO_CLINICA: GrupoConArticulos = {
  clave: 'CLINICA',
  titulo: 'La clínica',
  articulos: [ARTICULO],
}

function montarCatalogoManual(grupos: GrupoConArticulos[], cat: CatalogoComercial | null) {
  return mount(CatalogoManual, {
    shallow: true,
    props: {
      grupos,
      catalogo: cat,
      seleccionados: [],
      sugerenciasDescartadas: [],
      ciclo: 'MENSUAL' as const,
    },
  })
}

describe('El catálogo manual dice cuándo no tiene nada que ofrecer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('el catálogo que llegó vacío deja un estado vacío, y no un hueco', () => {
    const wrapper = montarCatalogoManual([], catalogo([]))

    const vacio = wrapper.find('[data-testid="catalogo-vacio"]')
    expect(vacio.exists()).toBe(true)
    expect(vacio.text()).toContain('Todavía no hay módulos publicados')
    // Un estado vacío es CONTENIDO, no la ausencia de contenido: sin esto, quien
    // navega con lector se queda esperando una lista que nunca va a llegar.
    expect(vacio.attributes('role')).toBe('status')
    // Y hay una salida real dentro del propio vacío, no solo la mala noticia.
    expect(vacio.find('a[href="mailto:soporte@vetsoftware.co"]').exists()).toBe(true)
    // El encabezado deja de dar una instrucción que la pantalla no puede
    // cumplir. «Añádelo tú» sobre un vacío es el mismo hueco, en negrita.
    expect(wrapper.get('#catalogo-h2').text()).toBe('Todavía no hay módulos que añadir')
    expect(wrapper.find('.cman-grupos').exists()).toBe(false)
  })

  it('con módulos publicados no aparece ni el estado vacío ni su encabezado', () => {
    const wrapper = montarCatalogoManual([GRUPO_CLINICA], catalogo([ARTICULO]))

    expect(wrapper.find('[data-testid="catalogo-vacio"]').exists()).toBe(false)
    expect(wrapper.get('#catalogo-h2').text()).toBe('¿Te falta algo? Añádelo tú')
    expect(wrapper.find('.cman-grupos').exists()).toBe(true)
  })

  it('mientras el catálogo no ha llegado NO afirma que no haya nada', () => {
    // El contrapeso del primer caso. Con la petición en vuelo el catálogo es
    // `null` y los grupos están vacíos igual: una condición que solo mirara la
    // lista pintaría «no hay módulos» durante media pantalla de carga y se
    // desmentiría sola al llegar la respuesta.
    const wrapper = montarCatalogoManual([], null)

    expect(wrapper.find('[data-testid="catalogo-vacio"]').exists()).toBe(false)
    expect(wrapper.get('#catalogo-h2').text()).toBe('¿Te falta algo? Añádelo tú')
  })
})

describe('El aviso del asistente caído no promete lo que no hay', () => {
  it('sin catálogo retira la salida que no existe y conserva la que sí', () => {
    const wrapper = mount(AsistenteCaidoAviso, {
      props: { catalogoVacio: true, sinPaquetes: false },
    })

    const texto = wrapper.get('[data-testid="asistente-caido"]').text()
    expect(texto).not.toContain('armar tu plan tú mismo')
    expect(texto).toContain('todavía no hay módulos publicados')
    // Los paquetes siguen ahí en esta rama porque `sinPaquetes` es `false`: hay
    // lista publicada. Retirarlos «por simetría» dejaría al visitante sin la
    // única compra que en ese momento puede hacer.
    expect(texto).toContain('paquetes')
  })

  it('con catálogo ofrece la lista de precios, y NO promete armar nada', () => {
    const wrapper = mount(AsistenteCaidoAviso, {
      props: { catalogoVacio: false, sinPaquetes: false },
    })

    const texto = wrapper.get('[data-testid="asistente-caido"]').text()
    // Sin propuesta, marcar una casilla del catálogo no hace nada:
    // `empujarCarrito` sale en su primera línea por `if (!actual ...) return`.
    // El catálogo de la degradación es una lista de precios, no un
    // configurador, y el texto no puede prometer lo contrario.
    expect(texto).not.toContain('armar tu plan tú mismo')
    expect(texto).toContain('los módulos con su precio')
    expect(texto).toContain('paquetes')
  })

  it('sin paquetes publicados deja de mandar a una sección vacía', () => {
    // El defecto que reintrodujo la puerta de al lado: desde `e48e9e0` los
    // planes vienen de `GET /plans` y pueden llegar vacíos, así que «empieza por
    // uno de nuestros paquetes, aquí abajo» podía leerse justo encima de
    // «Todavía no hay paquetes publicados».
    const wrapper = mount(AsistenteCaidoAviso, {
      props: { catalogoVacio: true, sinPaquetes: true },
    })

    const texto = wrapper.get('[data-testid="asistente-caido"]').text()
    expect(texto).not.toContain('empezar por uno de nuestros paquetes')
    expect(texto).not.toContain('los módulos con su precio')
    // La frase habla de lo que se puede CONTRATAR y no de lo que hay publicado,
    // y esa palabra es la que la hace cierta también en la combinación que sí
    // ocurre: sin paquetes pero con módulos publicados abajo. «No hay nada
    // publicado con precio» sería mentira ahí; esto no, porque en la
    // degradación esos módulos no se pueden contratar solos.
    expect(texto).toContain('ningún paquete que puedas contratar por aquí')
    // La salida que sí existe cuando no queda ninguna otra: una persona.
    expect(
      wrapper
        .find('[data-testid="asistente-caido"] a[href="mailto:soporte@vetsoftware.co"]')
        .exists(),
    ).toBe(true)
  })

  it('con módulos publicados pero sin paquetes, la frase sigue siendo cierta', () => {
    // La combinación que obligó a redactarla así, y NO es teórica:
    // `plans.source.ts` descarta entero (`publicable`) el paquete tarifado en un
    // solo ciclo, así que puede haber tarifa con módulos y sin paquetes. Con la
    // frase anterior —«todavía no hay nada publicado con precio»— este caso
    // decía una mentira comprobable: los módulos con su precio están ahí abajo.
    const wrapper = mount(AsistenteCaidoAviso, {
      props: { catalogoVacio: false, sinPaquetes: true },
    })

    const texto = wrapper.get('[data-testid="asistente-caido"]').text()
    expect(texto).toContain('ningún paquete que puedas contratar por aquí')
    expect(texto).not.toContain('nada publicado con precio')
    // Y tampoco los ofrece: sin propuesta, marcar una casilla no hace nada.
    expect(texto).not.toContain('los módulos con su precio')
  })

  it('es `status` y no `alert`: no ha fallado nada que atender ahora mismo', () => {
    const wrapper = mount(AsistenteCaidoAviso, {
      props: { catalogoVacio: true, sinPaquetes: false },
    })

    expect(wrapper.get('[data-testid="asistente-caido"]').attributes('role')).toBe('status')
  })
})

describe('La pantalla entera, con el asistente caído y el catálogo sin publicar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    olvidarSesiones()
  })

  async function panel(respuestaCatalogo: PublicCatalogResponse) {
    get.mockResolvedValue({ data: respuestaCatalogo } as never)
    const store = usePropuestaStore()
    store.texto = 'Clínica de barrio, consulta general y vacunas'
    store.email = 'ana@clinica.co'
    post.mockResolvedValueOnce({ data: SIN_CATALOGO } as never)
    await store.generar([])

    const wrapper = mount(AsistentePanel, {
      shallow: true,
      props: { sinPaquetes: false },
      global: { stubs: { AsistenteCaidoAviso: false, CatalogoManual: false } },
    })
    await flushPromises()
    return wrapper
  }

  it('ni el banner manda a un sitio vacío ni el catálogo deja un hueco', async () => {
    const wrapper = await panel(CATALOGO_VACIO)

    // El caso no pasa por la puerta falsa de una pantalla en otro estado.
    expect(usePropuestaStore().estado).toBe('ASISTENTE_CAIDO')

    const aviso = wrapper.get('[data-testid="asistente-caido"]')
    expect(aviso.text()).not.toContain('armar tu plan tú mismo')
    expect(wrapper.find('[data-testid="catalogo-vacio"]').exists()).toBe(true)
  })

  it('con el catálogo publicado el banner vuelve a ofrecer las dos salidas', async () => {
    const wrapper = await panel(CATALOGO_CON_MODULO)

    expect(usePropuestaStore().estado).toBe('ASISTENTE_CAIDO')
    expect(wrapper.get('[data-testid="asistente-caido"]').text()).toContain(
      'los módulos con su precio',
    )
    expect(wrapper.find('[data-testid="catalogo-vacio"]').exists()).toBe(false)
  })
})
