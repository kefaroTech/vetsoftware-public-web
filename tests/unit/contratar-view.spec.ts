import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { CONTRATACION_INTENCION_KEY } from '@/constants/storageKeys'
import ContratarView from '@/features/contratacion/views/ContratarView.vue'
import { useResultadoContratacionStore } from '@/features/contratacion/stores/resultadoContratacion.store'
import type { EstadoPlanActual } from '@/features/suscripcion/composables/estadoSuscripcion'
import type { QuoteResponse } from '@/features/suscripcion/types/cotizaciones.types'
import type { CotizacionPreview } from '@/features/landing/types/cotizacion.types'
import { elemento, exigir } from '../helpers/exigir'

/**
 * EL PASO VINCULANTE, MONTADO.
 *
 * ── El agujero que tapa ────────────────────────────────────────────────────
 * Antes de este fichero, `ContratarView` no lo montaba **ninguna** prueba
 * unitaria: lo único que lo tocaba era el spec de Playwright, que corre en otro
 * job, necesita servidor y navegador, y no entra en `npm run test:coverage` — que
 * es la puerta que el CI mira en cada PR. Los cuatro estados que deciden si el
 * usuario puede comprar y qué ve cuando algo falla (permiso, sin precio, deriva
 * de precio, error del servidor) podían romperse sin poner nada en rojo hasta la
 * siguiente pasada de e2e.
 *
 * ── La convención que se afirma, y por qué así ─────────────────────────────
 * Sin `quote.request` el control **no existe en el DOM**; no está `disabled`. La
 * diferencia importa: un botón apagado sin motivo visible se lee como una avería
 * de la aplicación, y aquí no ha fallado nada — es una clínica en mora, que en
 * nivel `READ_ONLY` pierde ese permiso. Por eso cada caso afirma las DOS mitades:
 * el control ausente **y** que no sale ninguna petición que el gate del servidor
 * fuera a negar con un 403.
 */

const selfServe = vi.fn<(payload: unknown) => Promise<QuoteResponse>>()
const accept = vi.fn<(id: number, payload: unknown) => Promise<QuoteResponse>>()
const findById = vi.fn()
const push = vi.fn()
const replace = vi.fn()
const errorFrom = vi.fn()
const toastInfo = vi.fn()
const cargarSuscripcion = vi.fn()
const checkoutConfig = vi.fn()
const crearFuenteDePago = vi.fn()
const tokenizarTarjeta = vi.fn()
const mediosPagoListAll = vi.fn()

const permisos = ref<string[]>([])
const estadoPlanActual = ref<EstadoPlanActual>('SIN_PLAN')

vi.mock('vue-router', () => ({
  useRouter: () => ({ push, replace }),
  // `ContratarResumenTabla` y `LegalConsentCheckbox` importan `RouterLink` del
  // módulo, no del registro global: sin exportarlo aquí el doble deja el
  // componente sin resolver y la pantalla revienta al pintar el resumen.
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
  cotizacionesApi: {
    selfServe: (p: unknown) => selfServe(p),
    accept: (id: number, p: unknown) => accept(id, p),
  },
}))

vi.mock('@/features/suscripcion/api/pago.api', () => ({
  wompiApi: {
    checkoutConfig: () => checkoutConfig(),
    crearFuenteDePago: (p: unknown) => crearFuenteDePago(p),
    primerPago: vi.fn(),
  },
  tokenizarTarjeta: (apiBaseUrl: string, publicKey: string, tarjeta: unknown) =>
    tokenizarTarjeta(apiBaseUrl, publicKey, tarjeta),
}))

// El medio de pago se lee del store real de `suscripcion` (no se dobla el store, solo su API):
// `MedioDePagoWompi` decide si tokeniza o si ofrece el medio por defecto según lo que este
// endpoint devuelva, y una página vacía es la rama que la mayoría de estos casos necesita.
vi.mock('@/features/suscripcion/api/medios-pago.api', () => ({
  mediosPagoApi: {
    listAll: () => mediosPagoListAll(),
    findById: vi.fn(),
    setDefault: vi.fn(),
    revoke: vi.fn(),
    create: vi.fn(),
  },
}))

const previsualizarCotizacion = vi.fn<(args: unknown) => Promise<CotizacionPreview>>()

vi.mock('@/features/landing/api/cotizacion.source', () => ({
  previsualizarCotizacion: (args: unknown) => previsualizarCotizacion(args),
}))

// El seam de los planes se dobla, y ahora HAY QUE doblarlo: desde que
// `plans.source.ts` pide `GET /plans` en vez de devolver contenido local, esta
// pantalla depende del catálogo por red, y sin doble el `usePlanes()` de
// `usePasoContratar` no resolvía `PACK_CLINIC` y la vista entera no se pintaba.
// Se devuelve `PLANS_CONTENT`, que es justo su papel nuevo: la transcripción de
// referencia contrastada contra las semillas, aquí de muestra realista. Lo que
// este fichero prueba es el embudo, no cómo habla el seam con la red — eso lo
// prueba `planes-desde-el-servidor.spec.ts`.
vi.mock('@/features/landing/api/plans.source', async () => {
  const { PLANS_CONTENT } = await import('@/features/landing/content/plans.content')
  return { fetchPlans: () => Promise.resolve(PLANS_CONTENT) }
})

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    info: toastInfo,
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    errorFrom,
    warnFrom: vi.fn(),
    remove: vi.fn(),
  }),
}))

const OFERTA: QuoteResponse = {
  id: 55,
  quoteNumber: 'COT-2026-0055',
  subtotalAmount: 777_321,
  taxAmount: 147_690,
  totalAmount: 925_011,
  validUntil: '2026-09-13',
  status: 'SENT',
}

/** El precio de lista de `PACK_CLINIC` con 1 sede y 1 persona, sin impuesto. */
const SUBTOTAL_MENSUAL_PACK_CLINIC = 189_000

/** El preview del servidor para esa misma selección: mismo subtotal, para no introducir deriva. */
const PREVIEW_PACK_CLINIC: CotizacionPreview = {
  moneda: 'COP',
  ciclo: 'MENSUAL',
  lineas: [
    {
      code: 'PACK_CLINIC',
      nombre: 'Pack Clínica',
      contratadas: 1,
      incluidas: 1,
      cobradas: 1,
      importeUnitario: SUBTOTAL_MENSUAL_PACK_CLINIC,
      importe: SUBTOTAL_MENSUAL_PACK_CLINIC,
      taxRate: 19,
      taxTreatment: 'TAXED',
      impuesto: 35_910,
      total: 224_910,
    },
  ],
  subtotal: SUBTOTAL_MENSUAL_PACK_CLINIC,
  descuento: 0,
  impuesto: 35_910,
  total: 224_910,
}

const CHECKOUT_CONFIG = {
  environment: 'SANDBOX' as const,
  apiBaseUrl: 'https://sandbox.wompi.co/v1',
  publicKey: 'pub_test_abc',
  acceptance: { token: 'acc-token', permalink: 'https://wompi.co/acceptance' },
  personalDataAuthorization: { token: 'pda-token', permalink: 'https://wompi.co/pda' },
}

const TOKEN_TARJETA = {
  id: 'tok_test_1',
  brand: 'VISA',
  last_four: '4242',
  exp_month: '08',
  exp_year: '29',
}

const MEDIO_REGISTRADO = {
  paymentMethodId: 1,
  brand: 'VISA',
  lastFour: '4242',
  expiresOn: '2029-08-31',
  defaultMethod: true,
}

function sembrarIntencion(importeVistoMensual: number | null = SUBTOTAL_MENSUAL_PACK_CLINIC) {
  window.localStorage.setItem(
    CONTRATACION_INTENCION_KEY,
    JSON.stringify({
      planCode: 'PACK_CLINIC',
      ciclo: 'MENSUAL',
      sedes: 1,
      usuarios: 1,
      importeVistoMensual,
      selloRevisadoEl: '2026-08-29',
      creadaEn: new Date().toISOString(),
      descartada: false,
    }),
  )
}

const STUBS = {
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}

async function montar(opciones: { attachTo?: HTMLElement } = {}) {
  const wrapper = mount(ContratarView, { global: { stubs: STUBS }, ...opciones })
  // Tres vueltas: el catálogo, la suscripción y el resumen encadenan promesas.
  await flushPromises()
  await flushPromises()
  await flushPromises()
  return wrapper
}

/** El botón vinculante, buscado por su rótulo y no por una clase de CSS. */
function botonConfirmar(wrapper: Awaited<ReturnType<typeof montar>>) {
  return wrapper.findAll('button').filter((b) => b.text().includes('Confirmar mi plan'))
}

/**
 * Rellena el formulario de `MedioDePagoWompi` con una tarjeta válida, marca las dos casillas de
 * Wompi y pulsa «Guardar tarjeta y pagar». Asume que ya se pidió la oferta (`oferta` no es
 * `null`) y que `mediosPagoListAll` devolvió una página SIN medio por defecto — si lo hubiera,
 * este formulario no se pintaría.
 */
async function pagarConTarjetaValida(wrapper: Awaited<ReturnType<typeof montar>>) {
  await flushPromises() // GET checkout-config + GET subscription-payment-methods

  await wrapper.find('input[placeholder="4242 4242 4242 4242"]').setValue('4242424242424242')
  await wrapper.find('input[placeholder="08/29"]').setValue('0829')
  await wrapper.find('input[placeholder="123"]').setValue('123')
  await wrapper.find('input[placeholder="Como aparece en la tarjeta"]').setValue('Ana Gómez')
  await wrapper.find('input[type="email"]').setValue('admin@clinica.com')
  const casillas = wrapper.findAll('input[type="checkbox"]')
  await elemento(casillas, 0, 'casilla de términos de Wompi').setValue(true)
  await elemento(casillas, 1, 'casilla de datos personales de Wompi').setValue(true)

  // `trigger('click')` sobre el botón no basta en JSDOM: no siempre dispara el `submit` del
  // `<form>` que envuelve. Se dispara el `submit` directamente, igual que el navegador real.
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  window.localStorage.clear()
  selfServe.mockReset().mockResolvedValue(OFERTA)
  previsualizarCotizacion.mockReset().mockResolvedValue(PREVIEW_PACK_CLINIC)
  accept.mockReset().mockResolvedValue({ ...OFERTA, status: 'ACCEPTED' })
  findById.mockReset().mockResolvedValue({ id: 7, name: 'Clínica Norte', identifier: '900123456' })
  checkoutConfig.mockReset().mockResolvedValue(CHECKOUT_CONFIG)
  crearFuenteDePago.mockReset().mockResolvedValue(MEDIO_REGISTRADO)
  tokenizarTarjeta.mockReset().mockResolvedValue(TOKEN_TARJETA)
  mediosPagoListAll.mockReset().mockResolvedValue({
    content: [],
    page: 0,
    pageSize: 50,
    totalElements: 0,
    totalPages: 0,
  })
  push.mockReset()
  replace.mockReset()
  errorFrom.mockReset()
  toastInfo.mockReset()
  cargarSuscripcion.mockReset().mockResolvedValue(undefined)
  permisos.value = ['quote.request']
  estadoPlanActual.value = 'SIN_PLAN'
  sembrarIntencion()
})

describe('la puerta del permiso `quote.request`', () => {
  it('sin el permiso el control está AUSENTE del DOM, no deshabilitado', async () => {
    // Las dos afirmaciones son distintas y hacen falta las dos: si alguien
    // «arreglara» esto poniendo `:disabled="!puedeContratar"`, la primera
    // seguiría pasando con `toHaveLength(1)` y solo esta lo cazaría.
    permisos.value = []
    const wrapper = await montar()

    expect(botonConfirmar(wrapper)).toHaveLength(0)
    expect(wrapper.find('input[type="checkbox"]').exists(), 'ni casilla que aceptar').toBe(false)
    // Y no queda ningún botón deshabilitado haciéndose pasar por el control.
    expect(wrapper.findAll('button[disabled]')).toHaveLength(0)
  })

  it('sin el permiso se dice quién puede hacerlo, en `status` y no en `alert`', async () => {
    permisos.value = []
    const wrapper = await montar()

    const aviso = wrapper.find('[role="status"]')
    expect(aviso.exists()).toBe(true)
    expect(aviso.text()).toContain('no puede confirmar la contratación')
    // `alert` corta la locución en curso para dar una noticia que no lo es: no
    // ha fallado nada, es el estado de la cuenta.
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('sin el permiso NO sale ninguna petición, ni siquiera saliendo del embudo', async () => {
    // La segunda mitad del gate. El control ausente evita el clic; esto evita que
    // cualquier otro camino de la pantalla mande una oferta que el servidor va a
    // negar con un 403.
    permisos.value = []
    const wrapper = await montar()

    const ahoraNo = wrapper.findAll('button').find((b) => b.text().includes('Ahora no'))
    expect(ahoraNo, '«Ahora no» sigue estando: hay que poder salir').toBeDefined()
    await exigir(ahoraNo, 'ahoraNo').trigger('click')
    await flushPromises()

    expect(selfServe).not.toHaveBeenCalled()
  })

  it('con el permiso el control SÍ está, y con él la casilla de términos', async () => {
    // El control del caso anterior: sin esto, un fallo que escondiera el botón
    // para todo el mundo pasaría las tres pruebas de arriba en verde.
    const wrapper = await montar()

    expect(botonConfirmar(wrapper)).toHaveLength(1)
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('el botón vinculante nombra el PAQUETE cuando el cliente eligió un paquete', async () => {
    // La otra mitad de la ramificación del rótulo (la de la propuesta la afirma
    // `contratacion-propuesta.spec.ts`). Hacen falta las dos: quien «arreglara»
    // el rótulo poniendo «Confirmar mi propuesta» a secas, o un neutro
    // «Confirmar la contratación», dejaría la otra prueba en verde y solo esta
    // lo cazaría.
    const wrapper = await montar()

    const boton = elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)')
    expect(boton.text().trim()).toBe('Confirmar mi plan')
    expect(wrapper.text(), 'no se le ofrece una propuesta que no pidió').not.toContain(
      'Confirmar mi propuesta',
    )
  })
})

describe('la casilla de términos es una puerta, no un adorno', () => {
  it('sin marcarla no se manda nada y se dice qué falta', async () => {
    const wrapper = await montar()

    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    expect(selfServe, 'no se pide la oferta sin aceptar los términos').not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Tienes que aceptar los Términos para continuar')
  })

  it('marcada, pide la oferta y muestra el bloque de pago — no navega todavía', async () => {
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    expect(selfServe).toHaveBeenCalledTimes(1)
    expect(elemento(selfServe.mock.calls, 0, 'selfServe.mock.calls')[0]).toMatchObject({
      billingCycle: 'MONTHLY',
      lines: [{ code: 'PACK_CLINIC', quantity: 1 }],
    })
    // El acto de pedir la oferta ya NO navega ni guarda nada: eso es lo que hace
    // que un fallo posterior de `accept` no obligue a pedir una segunda oferta.
    expect(push).not.toHaveBeenCalled()
    expect(useResultadoContratacionStore().resultado).toBeNull()
    expect(wrapper.text()).toContain('Medio de pago')
  })

  it('pagada, acepta la oferta y navega al éxito con los importes DEL SERVIDOR', async () => {
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    await pagarConTarjetaValida(wrapper)

    expect(tokenizarTarjeta).toHaveBeenCalledWith(
      CHECKOUT_CONFIG.apiBaseUrl,
      CHECKOUT_CONFIG.publicKey,
      expect.objectContaining({ number: '4242424242424242', cvc: '123' }),
    )
    expect(crearFuenteDePago).toHaveBeenCalledWith({
      cardToken: TOKEN_TARJETA.id,
      acceptanceToken: CHECKOUT_CONFIG.acceptance.token,
      personalDataAuthToken: CHECKOUT_CONFIG.personalDataAuthorization.token,
      brand: TOKEN_TARJETA.brand,
      lastFour: TOKEN_TARJETA.last_four,
      expMonth: 8,
      expYear: 29,
    })
    expect(accept).toHaveBeenCalledWith(55, { acceptedByEmail: 'admin@clinica.com' })
    expect(push).toHaveBeenCalledWith({ name: 'contratar-exito' })

    // Y lo que la pantalla de éxito va a leer son las cifras de la oferta, no el
    // estimado local: 777.321 no es 189.000 y no hay forma de llegar a él
    // calculando.
    const guardado = useResultadoContratacionStore().resultado
    expect(guardado?.subtotal).toBe(777_321)
    expect(guardado?.subtotal).not.toBe(SUBTOTAL_MENSUAL_PACK_CLINIC)
    expect(guardado?.cotizacionNumero).toBe('COT-2026-0055')
    expect(guardado?.pago).toBeNull()
  })

  it('si `accept` falla, no navega y reabre el botón sin volver a tokenizar', async () => {
    accept.mockRejectedValueOnce(new Error('502'))
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()
    await pagarConTarjetaValida(wrapper)

    expect(push).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('no pudimos confirmar el pago')

    // El botón vuelve al reposo: `restablecer()` lo reabre sin que el padre haya
    // vuelto a pedirle a `MedioDePagoWompi` que tokenice nada.
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(tokenizarTarjeta).toHaveBeenCalledTimes(1)
  })

  it('la llave de idempotencia se genera UNA vez por pantalla, y sobrevive a un reintento', async () => {
    // Es lo que hace que un reintento tras un fallo no cree dos ofertas. El primer
    // envío falla —el botón vuelve al reposo, con la oferta todavía sin pedir— y
    // el segundo tiene que llevar LA MISMA llave.
    selfServe.mockRejectedValueOnce(new Error('502'))
    const wrapper = await montar()
    await wrapper.find('input[type="checkbox"]').setValue(true)

    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    expect(selfServe).toHaveBeenCalledTimes(2)
    const llaves = selfServe.mock.calls.map(
      (c) => (c[0] as { clientRequestId: string }).clientRequestId,
    )
    expect(llaves[0]).toBeTruthy()
    expect(new Set(llaves).size, 'la misma llave en los dos envíos').toBe(1)
  })
})

describe('§5 caso 3 · el precio se movió mientras decidía', () => {
  it('el aviso lleva LAS DOS cifras, y la casilla se ve sin marcar', async () => {
    // 150.000 es lo que el usuario vio; 189.000 es el precio de lista de hoy.
    // Sin las dos cifras el aviso no puede ser verdad: «el precio cambió» sin
    // decir de cuánto a cuánto no permite decidir nada.
    sembrarIntencion(150_000)
    const wrapper = await montar()

    const aviso = wrapper.find('[role="alert"]')
    expect(aviso.exists(), 'la deriva SÍ es una noticia: va en `alert`').toBe(true)
    expect(aviso.text()).toContain('El precio cambió desde que lo elegiste')
    expect(aviso.text()).toMatch(/150[.,]000/)
    expect(aviso.text()).toMatch(/189[.,]000/)

    // La casilla está sin marcar, y este caso ya NO pretende que eso demuestre
    // una salvaguarda. Lo dice como estado: es lo que el usuario se encuentra.
    //
    // La línea `aceptaTerminos.value = false` que vivía en `cargar()` y que tres
    // docblocks vendían como «la mitad que hace cumplir §3.3.4» era inalcanzable
    // —la casilla no está pintada cuando la comparación corre— y se quitó. Lo
    // que de verdad protege la decisión son las dos afirmaciones de los casos
    // siguientes: el aviso se lleva el FOCO, y sin marcar no sale nada.
    expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('el aviso se lleva el FOCO, que es la mitad de §3.3.4 que esta pantalla sí tiene', async () => {
    // Y esta afirmación SÍ tiene puerta. El orden dentro de `cargar()` es lo que
    // la sostiene: el velo (`cargando`) tiene que caer ANTES de la comparación,
    // porque mientras vale `true` la plantilla pinta «Cargando tu resumen…»,
    // `PriceDriftNotice` no existe todavía y `driftRef` es `null` — el `focus()`
    // no llamaba a nadie. El aviso salía sin foco y quien navega con lector de
    // pantalla no se enteraba de que el precio había cambiado.
    //
    // Hace falta `attachTo`: sin el árbol en el documento, `focus()` no mueve
    // `document.activeElement` y la comprobación pasaría por no mirar nada.
    sembrarIntencion(150_000)
    const wrapper = await montar({ attachTo: document.body })

    const aviso = wrapper.find('[role="alert"]')
    expect(aviso.exists()).toBe(true)
    expect(document.activeElement, 'el foco va al aviso, no se queda donde estaba').toBe(
      aviso.element,
    )

    wrapper.unmount()
  })

  it('con la deriva en pantalla, confirmar a ciegas no manda nada', async () => {
    // El desenlace observable: quien ve el aviso no puede completar la compra
    // sin volver a leer y volver a aceptar. Esta SÍ se rompe si alguien deja
    // pasar la confirmación con la casilla sin marcar.
    sembrarIntencion(150_000)
    const wrapper = await montar()

    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    expect(selfServe).not.toHaveBeenCalled()
  })

  it('sin deriva no hay aviso: el caso feliz no paga el precio del raro', async () => {
    const wrapper = await montar()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('un preview MÁS BARATO que lo visto no avisa: la escalera por volumen solo baja', async () => {
    // 300.000 es lo que el usuario vio en `/planes` con el tramo de entrada;
    // `PREVIEW_PACK_CLINIC` cotiza 189.000, más barato por el descuento de
    // volumen del servidor. Eso no es una noticia que avisar.
    sembrarIntencion(300_000)
    const wrapper = await montar()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('El precio cambió')
  })

  it('sin importe guardado NO se inventa una comparación', async () => {
    // Una intención vieja o corrupta deja `importeVistoMensual` en `null`. Un
    // lado vacío no es deriva: es un hueco. Comparar contra `0` sacaba el aviso
    // «Cuando lo elegiste: $ 0» contra una cifra que nadie vio nunca.
    sembrarIntencion(null)
    const wrapper = await montar()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('El precio cambió')
  })
})

describe('cuando el servidor rechaza la oferta', () => {
  it('el fallo se cuenta DENTRO de la pantalla, con la traza, y no se navega', async () => {
    // Un toast se va solo, y este es el clic más importante del embudo. El texto
    // afirma además las dos cosas que el usuario necesita saber para no repetir
    // la compra por miedo: no se cambió nada y no se cobró nada.
    selfServe.mockRejectedValue(new Error('500'))
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    const banner = wrapper.find('[role="alert"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('No pudimos registrar tu contratación')
    expect(banner.text()).toContain('no se te ha cobrado nada')
    expect(
      push,
      'no se lleva al usuario a una pantalla de éxito que no ocurrió',
    ).not.toHaveBeenCalled()

    // Y el aviso va por `errorFrom`, que es lo que conserva el `X-Trace-Id`:
    // escribir el texto a mano en el `catch` tira la traza y soporte no
    // correlaciona nada.
    expect(errorFrom).toHaveBeenCalledTimes(1)
    expect(
      elemento(errorFrom.mock.calls, 0, 'errorFrom.mock.calls')[1],
      'el objeto de error entero, no su mensaje',
    ).toBeInstanceOf(Error)
  })

  it('el botón vuelve al reposo: se puede reintentar', async () => {
    // Dejarlo `disabled` para siempre después de un fallo de red convierte un
    // error recuperable en un embudo muerto.
    selfServe.mockRejectedValue(new Error('red caída'))
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    expect(
      elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').attributes('disabled'),
    ).toBeUndefined()
    expect(elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').text()).toContain(
      'Confirmar mi plan',
    )
  })

  it('el fallo NO consume la intención: el usuario sigue teniendo su elección', async () => {
    // `marcarContratada()` descarta la intención para que el enganche del login
    // no reabra el embudo. Llamarlo en el camino de error dejaría al usuario sin
    // oferta Y sin selección guardada, y volver a entrar le pediría elegir otra
    // vez.
    selfServe.mockRejectedValue(new Error('500'))
    const wrapper = await montar()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)').trigger('click')
    await flushPromises()

    const crudo = window.localStorage.getItem(CONTRATACION_INTENCION_KEY)
    expect(crudo).not.toBeNull()
    expect(JSON.parse(exigir(crudo, 'crudo')).descartada).toBe(false)
    expect(useResultadoContratacionStore().resultado).toBeNull()
  })
})

describe('§5 caso 6 · la empresa ya tiene plan', () => {
  it('no se le ofrece otro: aviso `info`, intención descartada y fuera del embudo', async () => {
    // `CON_PLAN` es la señal REAL del servidor. La bandera en memoria que había
    // antes volvía a `false` en cada recarga, así que este caso solo saltaba si
    // el usuario acababa de contratar en esa misma pestaña.
    estadoPlanActual.value = 'CON_PLAN'
    await montar()

    expect(toastInfo).toHaveBeenCalledTimes(1)
    expect(elemento(toastInfo.mock.calls, 0, 'toastInfo.mock.calls')[0]).toContain(
      'ya tiene un plan activo',
    )
    expect(replace).toHaveBeenCalledWith({ name: 'home' })
    expect(
      JSON.parse(
        exigir(
          window.localStorage.getItem(CONTRATACION_INTENCION_KEY),
          'window.localStorage.getItem(CONTRATACION_INTENCION_KEY)',
        ),
      ).descartada,
    ).toBe(true)
  })

  it('un `DESCONOCIDO` NO cierra la puerta, pero tampoco se calla', async () => {
    // Un 403 del rol sin `subscription.read` llega como `DESCONOCIDO`. Echar del
    // embudo a quien QUIZÁ no tiene plan por un permiso que no podemos leer es
    // peor que dejarle seguir; dejarle creer que se comprobó, también.
    estadoPlanActual.value = 'DESCONOCIDO'
    const wrapper = await montar()

    expect(replace).not.toHaveBeenCalled()
    expect(botonConfirmar(wrapper), 'sigue pudiendo contratar').toHaveLength(1)
    expect(wrapper.text()).toContain('No pudimos comprobar si tu negocio ya tiene un plan')
  })
})

describe('§D.6 · el botón bloqueado por la casilla legal', () => {
  it('es el ÚNICO bloqueo que deja el botón puesto: enfocable, con el motivo a la vista', async () => {
    // Con los otros dos motivos (sin permiso, sin precio) el control desaparece
    // y en su sitio va `ConfirmarBloqueadoNotice`, porque el usuario no puede
    // resolverlos. Este sí: se resuelve marcando la casilla que tiene encima.
    const wrapper = await montar()
    const boton = elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)')

    expect(
      boton.attributes('disabled'),
      '`disabled` lo saca del orden de tabulación y deja al teclado sin saber qué falta',
    ).toBeUndefined()
    expect(boton.attributes('aria-disabled')).toBe('true')

    const idMotivo = boton.attributes('aria-describedby')
    expect(idMotivo).toBeTruthy()
    const motivo = wrapper.get(`[id="${idMotivo}"]`)
    expect(motivo.text()).toContain('Marca la casilla de arriba')
    expect(motivo.classes(), 'el motivo es visible, no solo para el lector').not.toContain(
      'ds-sr-only',
    )
  })

  it('marcada la casilla, el bloqueo y su motivo desaparecen', async () => {
    const wrapper = await montar()
    await wrapper.find('input[type="checkbox"]').setValue(true)

    const boton = elemento(botonConfirmar(wrapper), 0, 'botonConfirmar(wrapper)')
    expect(boton.attributes('aria-disabled')).toBeUndefined()
    expect(boton.attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Marca la casilla de arriba')
  })
})

describe('lo que la pantalla afirma antes de que se firme', () => {
  it('el bloque del negocio se rotula «Tu negocio» y trae el nombre y el NIT del resumen', async () => {
    const wrapper = await montar()

    expect(wrapper.findAll('h2').map((h) => h.text())).toContain('Tu negocio')
    expect(wrapper.text()).toContain('Clínica Norte')
    expect(wrapper.text()).toContain('NIT 900123456')
  })

  it('la letra pequeña acota lo que se reserva, y conserva las dos frases que ya tenía', async () => {
    // La frase del alcance se AÑADE: las otras dos cubren dónde están los
    // documentos legales (Ley 1581 de 2012) y cómo darse de baja, y ninguna de
    // las dos la dice la nueva.
    const texto = (await montar()).text()

    expect(texto).toContain('con los precios de esta pantalla, y solo')
    expect(texto).toContain('Si algo cambia antes de la activación te lo decimos')
    expect(texto).toContain('Los dos documentos están enlazados en la casilla de arriba')
    expect(texto).toContain('Si quieres darte de baja antes de que empiece el cobro')
  })
})
