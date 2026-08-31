import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { CONTRATACION_INTENCION_KEY } from '@/constants/storageKeys'
import { activarPlan, fetchResumenPropuesta } from '@/features/contratacion/api/contratacion.source'
import { useContratacionStore } from '@/features/contratacion/stores/contratacion.store'
import ContratarView from '@/features/contratacion/views/ContratarView.vue'
import type {
  IntencionPropuesta,
  ResumenPropuesta,
} from '@/features/contratacion/types/contratacion.types'
import type { Propuesta } from '@/features/asistente/types/asistente.types'
import type { EstadoPlanActual } from '@/features/suscripcion/composables/estadoSuscripcion'
import type { QuoteResponse } from '@/features/suscripcion/types/cotizaciones.types'
import { elemento } from '../helpers/exigir'

/**
 * LA PROPUESTA A MEDIDA, DENTRO DEL EMBUDO DE CONTRATACIÓN.
 *
 * ── El agujero que tapa ────────────────────────────────────────────────────
 * Hasta ahora el embudo solo sabía de UN plan (`IntencionContratacion.planCode`)
 * y el panel del asistente enseñaba un aviso en lugar del botón de continuar,
 * porque un botón cuyo carrito desaparece en la pantalla siguiente es peor que
 * la ausencia del botón. Este fichero prueba las tres afirmaciones que ahora
 * sostienen ese botón:
 *
 *  1. La intención sabe expresar **una referencia a una propuesta**, y la sabe
 *     leer del almacenamiento sin confundirla con un plan (ni romper las que ya
 *     estaban escritas con la forma anterior).
 *  2. El paso vinculante **relee la propuesta del servidor** y adopta sus
 *     líneas y sus totales sin recalcular nada. Es la única forma de que una
 *     propuesta editada entre medias no se cotice como estaba.
 *  3. Cuando la propuesta no se puede recuperar, se dice **cuál de las dos
 *     cosas pasó** y no se manda ninguna petición.
 */

const selfServe = vi.fn<(payload: unknown) => Promise<QuoteResponse>>()
const findById = vi.fn()
const conocePropuesta = vi.fn<(id: string) => boolean>()
const releerPropuesta = vi.fn()
const push = vi.fn()
const replace = vi.fn()
const cargarSuscripcion = vi.fn()

const permisos = ref<string[]>([])
const estadoPlanActual = ref<EstadoPlanActual>('SIN_PLAN')

vi.mock('vue-router', () => ({
  useRouter: () => ({ push, replace }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({
    me: ref({ permissions: permisos.value, branchIds: [] }),
    companyId: ref(7),
  }),
}))

vi.mock('@/features/suscripcion/composables/useSuscripcion', () => ({
  useSuscripcion: () => ({ estadoPlanActual, load: cargarSuscripcion }),
}))

vi.mock('@/features/empresa/api/company.api', () => ({
  companyApi: { findById: (id: number) => findById(id) },
}))

vi.mock('@/features/suscripcion/api/cotizaciones.api', () => ({
  cotizacionesApi: { selfServe: (p: unknown) => selfServe(p) },
}))

// El seam de los planes se dobla por el mismo motivo que el del asistente, y
// desde que `plans.source.ts` pide `GET /plans` ya no es opcional: sin doble, el
// `usePlanes()` de `usePasoContratar` se queda sin catálogo y la vista no llega
// a pintarse. `PLANS_CONTENT` es la muestra realista.
vi.mock('@/features/landing/api/plans.source', async () => {
  const { PLANS_CONTENT } = await import('@/features/landing/content/plans.content')
  return { fetchPlans: () => Promise.resolve(PLANS_CONTENT) }
})

// El seam del asistente se dobla ENTERO: lo que aquí se prueba es qué hace el
// embudo con lo que ese seam devuelve, no cómo habla el seam con la red (eso lo
// prueba `asistente-seam.spec.ts` y `asistente-sesion-persistida.spec.ts`).
vi.mock('@/features/asistente/api/asistente.source', () => ({
  conocePropuesta: (id: string) => conocePropuesta(id),
  releerPropuesta: (id: string) => releerPropuesta(id),
  // El lector del 404 NO se dobla con un `vi.fn()`: es la función real, porque
  // lo que este fichero afirma es que un 404 del servidor acaba en
  // `PROPUESTA_NO_DISPONIBLE`, y un doble que devolviera `true` a cualquier cosa
  // haría pasar el caso sin comprobar nada del `status`.
  esPropuestaNoEncontrada: (e: unknown) =>
    (e as { response?: { status?: number } })?.response?.status === 404,
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    errorFrom: vi.fn(),
    warnFrom: vi.fn(),
    remove: vi.fn(),
  }),
}))

const OFERTA: QuoteResponse = {
  id: 91,
  quoteNumber: 'COT-2026-0091',
  subtotalAmount: 214_000,
  taxAmount: 40_660,
  totalAmount: 254_660,
  validUntil: '2026-09-14',
  status: 'SENT',
}

/**
 * Una propuesta del servidor con **tres líneas y unas cifras que la suma de las
 * líneas NO produce**.
 *
 * <p>El desajuste es deliberado: `39.000 + 25.000 × 3 = 114.000`, y el subtotal
 * dice `214.000`. Si alguien reintrodujera un `reduce` sobre los importes, la
 * prueba que compara contra el subtotal del servidor se pondría roja en vez de
 * seguir verde por coincidencia aritmética.
 */
function propuesta(over: Partial<Propuesta> = {}): Propuesta {
  return {
    id: 'p-1',
    version: 4,
    lineas: [
      {
        code: 'CORE',
        nombre: 'Núcleo',
        descripcion: 'Lo mínimo de toda cuenta',
        origen: 'IA',
        tipo: 'MODULE',
        cantidad: 1,
        importe: 39_000,
        trialDays: 30,
        motivo: 'Lo necesitas para todo lo demás',
        notaRequisito: null,
        requeridoPor: null,
      },
      {
        code: 'AGENDA',
        nombre: 'Agenda',
        descripcion: 'Citas y recordatorios',
        origen: 'MANUAL',
        tipo: 'MODULE',
        cantidad: 1,
        importe: 29_000,
        trialDays: 14,
        motivo: null,
        notaRequisito: null,
        requeridoPor: null,
      },
      {
        code: 'EXTRA_USER',
        nombre: 'Personas adicionales',
        descripcion: 'Más allá de las incluidas',
        origen: 'IA',
        tipo: 'CAPACITY',
        cantidad: 3,
        importe: 25_000,
        trialDays: null,
        motivo: null,
        notaRequisito: null,
        requeridoPor: null,
      },
    ],
    recomendados: [],
    capacidades: [],
    totales: {
      subtotal: 214_000,
      impuesto: 40_660,
      tasaImpuesto: null,
      total: 254_660,
      ciclo: 'MENSUAL',
      primerMes: 0,
    },
    oferta: null,
    descartadas: 0,
    ajustesRestantes: 2,
    recalculado: false,
    ...over,
  }
}

function intencionDePropuesta(over: Partial<IntencionPropuesta> = {}): IntencionPropuesta {
  return {
    origen: 'PROPUESTA',
    propuestaId: 'p-1',
    ciclo: 'MENSUAL',
    sedes: 1,
    usuarios: 4,
    importeVistoMensual: 214_000,
    selloRevisadoEl: '2026-08-29',
    creadaEn: new Date().toISOString(),
    descartada: false,
    ...over,
  }
}

function sembrar(intencion: unknown): void {
  window.localStorage.setItem(CONTRATACION_INTENCION_KEY, JSON.stringify(intencion))
}

const STUBS = { RouterLink: { props: ['to'], template: '<a><slot /></a>' } }

async function montar() {
  const wrapper = mount(ContratarView, { global: { stubs: STUBS } })
  // Tres vueltas: el catálogo, la suscripción y el resumen encadenan promesas.
  await flushPromises()
  await flushPromises()
  await flushPromises()
  return wrapper
}

/**
 * El rótulo del **único control que compromete el dinero**, localizado por lo
 * que ES —el botón grande y primario del bloque de acciones— y no por el texto
 * que se espera leer en él. Buscarlo por «Confirmar mi …» convertiría un rótulo
 * equivocado en un «no lo encuentro», que es un fallo distinto y peor: dice que
 * falta el botón cuando lo que falla es lo que dice.
 */
function rotuloVinculante(wrapper: Awaited<ReturnType<typeof montar>>): string {
  const botones = wrapper.findAll('button.ds-btn--lg')
  return elemento(botones, 0, 'el botón vinculante del paso 6').text().trim()
}

beforeEach(() => {
  window.localStorage.clear()
  selfServe.mockReset().mockResolvedValue(OFERTA)
  findById.mockReset().mockResolvedValue({ id: 7, name: 'Clínica Norte', identifier: '900123456' })
  conocePropuesta.mockReset().mockReturnValue(true)
  releerPropuesta.mockReset().mockResolvedValue({ clase: 'PROPUESTA', propuesta: propuesta() })
  push.mockReset()
  replace.mockReset()
  cargarSuscripcion.mockReset().mockResolvedValue(undefined)
  permisos.value = ['quote.request']
  estadoPlanActual.value = 'SIN_PLAN'
})

describe('la intención sabe expresar una propuesta', () => {
  it('va y vuelve del espejo con su referencia, y sin ningún `planCode`', () => {
    const store = useContratacionStore()
    store.guardarPropuesta(
      'p-7',
      { ciclo: 'MENSUAL', sedes: 2, usuarios: 9 },
      214_000,
      '2026-08-29',
    )

    // Segunda instancia, leyendo del espejo: es lo que ocurre tras una recarga.
    const crudo = window.localStorage.getItem(CONTRATACION_INTENCION_KEY)
    expect(crudo).toBeTruthy()
    const leida = JSON.parse(crudo as string) as Record<string, unknown>
    expect(leida.origen).toBe('PROPUESTA')
    expect(leida.propuestaId).toBe('p-7')
    expect(leida.planCode).toBeUndefined()
    // Y ni una línea ni un total: lo que se guarda es la referencia, no el carrito.
    expect(leida.lineas).toBeUndefined()
    expect(leida.total).toBeUndefined()
  })

  it('una intención de propuesta SIN referencia se descarta entera', () => {
    // Sin `propuestaId` no hay nada que releer, y sin relectura no hay líneas ni
    // importes. Aceptarla dejaría al paso 6 con una intención vigente que no
    // puede resumir, y al usuario mirando un embudo que no avanza.
    sembrar({ ...intencionDePropuesta(), propuestaId: '' })
    const store = useContratacionStore()
    store.hidratar()
    expect(store.intencion).toBeNull()
  })

  it('la forma ANTERIOR, sin `origen`, se sigue leyendo como plan', () => {
    // Hay navegadores con una intención escrita antes de que existiera la unión.
    // Descartarla haría que quien eligió su plan ayer y vuelve hoy tras
    // verificar el correo se encontrara el selector otra vez — la conversión
    // exacta que el enganche del login existe para no perder.
    sembrar({
      planCode: 'PACK_CLINIC',
      ciclo: 'MENSUAL',
      sedes: 1,
      usuarios: 1,
      importeVistoMensual: 189_000,
      selloRevisadoEl: '2026-08-29',
      creadaEn: new Date().toISOString(),
      descartada: false,
    })
    const store = useContratacionStore()
    store.hidratar()
    expect(store.intencion?.origen).toBe('PLAN')
    expect(store.vigente).not.toBeNull()
  })
})

describe('el resumen del paso 6 se lo pide al SERVIDOR', () => {
  it('adopta los totales tal cual, sin recalcularlos desde las líneas', async () => {
    const resultado = await fetchResumenPropuesta({
      intencion: intencionDePropuesta(),
      companyId: 7,
      estadoPlanActual: 'SIN_PLAN',
    })

    expect(resultado.clase).toBe('RESUMEN')
    const resumen = (resultado as { resumen: ResumenPropuesta }).resumen
    // La suma de las líneas da 114.000; el servidor dice 214.000. Gana el servidor.
    expect(resumen.subtotal).toBe(214_000)
    expect(resumen.impuesto).toBe(40_660)
    expect(resumen.total).toBe(254_660)
    // Y el tipo impositivo se queda a `null`, porque el contrato no lo publica:
    // deducir un «19 %» del `taxRate` por línea, cuya escala no está declarada,
    // es equivocarse por un factor de cien en la pantalla que decide una compra.
    expect(resumen.tasaImpuesto).toBeNull()
  })

  it('el ciclo es el que declaró el SERVIDOR, no el que el usuario tenga elegido', async () => {
    // El asistente cotiza en mensual y lo dice en `totales.ciclo`. Si el resumen
    // copiara el ciclo de la intención, esta propuesta saldría rotulada «Total
    // por año» sobre unos importes mensuales — la mentira concreta que el store
    // del asistente existe para no contar, contada en el paso vinculante.
    const resultado = await fetchResumenPropuesta({
      intencion: intencionDePropuesta({ ciclo: 'ANUAL' }),
      companyId: 7,
      estadoPlanActual: 'SIN_PLAN',
    })
    const resumen = (resultado as { resumen: ResumenPropuesta }).resumen
    expect(resumen.ciclo).toBe('MENSUAL')
  })

  it('trae las líneas con su clase, para que una capacidad no pase por módulo', async () => {
    const resultado = await fetchResumenPropuesta({
      intencion: intencionDePropuesta(),
      companyId: 7,
      estadoPlanActual: 'SIN_PLAN',
    })
    const resumen = (resultado as { resumen: ResumenPropuesta }).resumen
    expect(resumen.lineas.map((l) => l.code)).toEqual(['CORE', 'AGENDA', 'EXTRA_USER'])
    expect(resumen.lineas.find((l) => l.code === 'EXTRA_USER')?.tipo).toBe('CAPACITY')
    expect(resumen.lineas.find((l) => l.code === 'EXTRA_USER')?.cantidad).toBe(3)
  })

  it('sin sesión local dice PERDIDA y NO manda ninguna petición', async () => {
    conocePropuesta.mockReturnValue(false)

    const resultado = await fetchResumenPropuesta({
      intencion: intencionDePropuesta(),
      companyId: 7,
      estadoPlanActual: 'SIN_PLAN',
    })

    expect(resultado.clase).toBe('PROPUESTA_PERDIDA')
    // La comprobación es LOCAL y va antes del viaje: sin token no hay petición
    // que hacer, y tampoco se lee la empresa para nada.
    expect(releerPropuesta).not.toHaveBeenCalled()
    expect(findById).not.toHaveBeenCalled()
  })

  it('si el servidor no la devuelve, dice NO_DISPONIBLE y no inventa un carrito vacío', async () => {
    releerPropuesta.mockResolvedValue({ clase: 'NO_DISPONIBLE' })

    const resultado = await fetchResumenPropuesta({
      intencion: intencionDePropuesta(),
      companyId: 7,
      estadoPlanActual: 'SIN_PLAN',
    })

    expect(resultado.clase).toBe('PROPUESTA_NO_DISPONIBLE')
  })

  it('una propuesta CADUCADA (404) es NO_DISPONIBLE, no una excepción que nadie atrapa', async () => {
    // Desde que la lectura por token tiene caducidad real, este 404 es un
    // desenlace normal: el prospecto vuelve al paso 6 dos días después. Antes la
    // excepción atravesaba `fetchResumenPropuesta`, salía de
    // `usePasoContratar.cargar()` —que no tiene `try`— y dejaba `cargando` en
    // `true` para siempre: la pantalla que decide la compra, girando sin decir
    // nada. Si alguien quita el `catch`, este caso muere con el 404 sin atrapar.
    releerPropuesta.mockRejectedValue({ response: { status: 404 } })

    const resultado = await fetchResumenPropuesta({
      intencion: intencionDePropuesta(),
      companyId: 7,
      estadoPlanActual: 'SIN_PLAN',
    })

    expect(resultado.clase).toBe('PROPUESTA_NO_DISPONIBLE')
  })

  it('un 500 SÍ sube: no es un desenlace del usuario y no se disfraza de propuesta ausente', async () => {
    // El contrapeso del caso anterior. Atrapar todo convertiría cualquier avería
    // del servidor en «tu propuesta ya no está», que manda al prospecto a
    // escribirlo todo otra vez sin motivo.
    releerPropuesta.mockRejectedValue({ response: { status: 500 } })

    await expect(
      fetchResumenPropuesta({
        intencion: intencionDePropuesta(),
        companyId: 7,
        estadoPlanActual: 'SIN_PLAN',
      }),
    ).rejects.toMatchObject({ response: { status: 500 } })
  })
})

describe('la oferta que se manda lleva las líneas de la PROPUESTA', () => {
  it('manda cada línea con su cantidad, y ninguna del catálogo de paquetes', async () => {
    const resultado = await fetchResumenPropuesta({
      intencion: intencionDePropuesta(),
      companyId: 7,
      estadoPlanActual: 'SIN_PLAN',
    })
    const resumen = (resultado as { resumen: ResumenPropuesta }).resumen

    await activarPlan({ resumen, clientRequestId: 'k-propuesta' })

    expect(selfServe).toHaveBeenCalledTimes(1)
    const cuerpo = selfServe.mock.calls[0]?.[0] as {
      lines: { code: string; quantity: number }[]
      billingCycle: string
      clientRequestId: string
    }
    // Las tres, con sus cantidades. Mandar menos aceptaría una compra distinta
    // de la que el usuario acaba de confirmar en pantalla.
    expect(cuerpo.lines).toEqual([
      { code: 'CORE', quantity: 1 },
      { code: 'AGENDA', quantity: 1 },
      { code: 'EXTRA_USER', quantity: 3 },
    ])
    // Ni un `PACK_*`: la propuesta no pasa por `lineasDeContratacion`.
    expect(cuerpo.lines.some((l) => l.code.startsWith('PACK_'))).toBe(false)
    expect(cuerpo.billingCycle).toBe('MONTHLY')
    expect(cuerpo.clientRequestId).toBe('k-propuesta')
  })

  it('el resultado se rotula como propuesta, no como un plan con nombre raro', async () => {
    const resultado = await fetchResumenPropuesta({
      intencion: intencionDePropuesta(),
      companyId: 7,
      estadoPlanActual: 'SIN_PLAN',
    })
    const resumen = (resultado as { resumen: ResumenPropuesta }).resumen

    const activado = await activarPlan({ resumen, clientRequestId: 'k' })

    expect(activado.origen).toBe('PROPUESTA')
    expect(activado.titulo).toBe('Tu propuesta a medida')
    // Y los importes son los del SERVIDOR, no los del resumen.
    expect(activado.subtotal).toBe(OFERTA.subtotalAmount)
    expect(activado.total).toBe(OFERTA.totalAmount)
  })
})

describe('el paso 6, montado, con una intención de propuesta', () => {
  it('pinta las líneas del servidor y el botón vinculante', async () => {
    sembrar(intencionDePropuesta())
    const wrapper = await montar()

    const texto = wrapper.text()
    expect(texto).toContain('Núcleo')
    expect(texto).toContain('Agenda')
    // La capacidad se rotula como lo que es, y no como un módulo más.
    expect(texto).toContain('Personas adicionales (capacidad)')
    expect(rotuloVinculante(wrapper)).toBe('Confirmar mi propuesta')
  })

  it('el botón vinculante NO le nombra un paquete que este cliente nunca eligió', async () => {
    // El defecto que cierra esta prueba: el h1 y el título de la ruta ya decían
    // «Confirma tu contratación» —renombrados justo porque la pantalla sirve por
    // igual un paquete y una propuesta a medida—, y la pantalla de éxito ya
    // ramifica («Listo. Tu propuesta a medida está reservada»). El botón, que es
    // el único control que compromete el dinero, seguía diciendo «Confirmar mi
    // plan» INCONDICIONALMENTE: a quien había descrito su clínica con sus
    // palabras y no tocó un paquete en toda la sesión, lo último que leía antes
    // de firmar le nombraba un paquete.
    //
    // Las dos mitades hacen falta. La primera sola pasaría con un rótulo neutro;
    // la segunda sola pasaría con un botón que desapareciera del DOM.
    sembrar(intencionDePropuesta())
    const wrapper = await montar()

    expect(rotuloVinculante(wrapper)).toBe('Confirmar mi propuesta')
    expect(wrapper.text(), 'la palabra «plan» no aparece en el control').not.toContain(
      'Confirmar mi plan',
    )
  })

  it('una propuesta EDITADA desde que se trajo sale como deriva, con las dos cifras', async () => {
    // El prospecto pulsó «continuar» viendo 214.000 y luego quitó una línea en
    // otra pestaña. Lo que el paso 6 relee vale 180.000. La pantalla no cambia
    // el importe en silencio: lo dice, con lo de antes y lo de ahora.
    releerPropuesta.mockResolvedValue({
      clase: 'PROPUESTA',
      propuesta: propuesta({
        totales: {
          subtotal: 180_000,
          impuesto: 34_200,
          tasaImpuesto: null,
          total: 214_200,
          ciclo: 'MENSUAL',
          primerMes: 0,
        },
      }),
    })
    sembrar(intencionDePropuesta({ importeVistoMensual: 214_000 }))

    const wrapper = await montar()

    const texto = wrapper.text()
    expect(texto).toContain('214.000')
    expect(texto).toContain('180.000')
  })

  it('sin la sesión de la propuesta se dice por qué, y se ofrece el selector', async () => {
    conocePropuesta.mockReturnValue(false)
    sembrar(intencionDePropuesta())

    const wrapper = await montar()

    expect(wrapper.find('[data-testid="propuesta-perdida"]').exists()).toBe(true)
    // Y NO se manda nada: no hay nada que cotizar.
    expect(selfServe).not.toHaveBeenCalled()
    // La intención NO se descarta: el prospecto no ha renunciado a nada.
    expect(useContratacionStore().vigente).not.toBeNull()
  })
})
