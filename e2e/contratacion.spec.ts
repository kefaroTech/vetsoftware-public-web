import { expect, test, type Page, type Route } from '@playwright/test'
import { subtotalMensualEquivalente } from '../src/features/landing/composables/planPricing'
import { PLANS_CONTENT } from '../src/features/landing/content/plans.content'
import type {
  FirstPeriodPaymentResponse,
  WompiCheckoutConfigResponse,
  WompiPaymentMethodResponse,
  WompiPaymentSourceRequest,
} from '../src/features/suscripcion/types/pago.types'
import type {
  AcceptQuoteRequest,
  QuoteResponse,
} from '../src/features/suscripcion/types/cotizaciones.types'
import type { SubscriptionPaymentMethodResponse } from '../src/features/suscripcion/types/medios-pago.types'
import type { SubscriptionResponse } from '../src/features/suscripcion/types/suscripcion.types'
import type { PageResponse } from '../src/types/pagination'
import {
  ID_PROPUESTA,
  intencionDePropuesta,
  noEncontrado,
  sembrarIntencionDePropuesta,
  sembrarSesionDelAsistente,
} from './helpers/asistente'
import {
  enrutarEmbudoPublico,
  modulosQueReproducen,
  RUTAS_DEL_EMBUDO,
  subtotalDeSeleccion,
} from './helpers/catalogo'
import {
  CLAVE_INTENCION,
  intencion,
  intencionDeModulos,
  leerIntencion,
  sembrarIntencion,
  type Intencion,
} from './helpers/contratacion'
import {
  EMPRESA_ID,
  EMPRESA_NOMBRE,
  EMPRESA_RESPUESTA,
  enrutarApi,
  instalarSesion,
  prohibido,
  responderJson,
} from './helpers/sesion'
import { tabularHasta } from './helpers/teclado'
import { exigir } from './helpers/exigir'

/**
 * Pasos 6 y 7 del embudo — `/dashboard/contratar` y su pantalla de éxito.
 *
 * Es el paso VINCULANTE: el clic por el que entra el dinero.
 *
 * ── Qué se simula y qué no ─────────────────────────────────────────────────
 * Se simulan la sesión, `GET /companies/{id}` y **`POST /quotes/self-serve`**
 * (ver `helpers/sesion.ts`), más los tres endpoints públicos del embudo (ver
 * `helpers/catalogo.ts`). `GET /plans` sirve `plans.content.ts` **tal cual**, así
 * que el plan que se contrata sigue siendo el de verdad y esta spec puede
 * importarlo para derivar de él lo que espera, en vez de transcribir cifras que
 * caducan; lo que cambió es que ahora ese contenido viaja por el cable en vez de
 * salir de un `import` dentro del seam.
 *
 * ── Lo que cambió, y por qué esta spec se reescribió entera ────────────────
 * `activarPlan()` YA SALE A LA RED. Hasta que la línea de la oferta se nombró
 * por `code` en vez de por un `catalogItemId` que ninguna respuesta alcanzable
 * por el tenant publicaba, el endpoint tenía ruta, permiso y cero llamadores
 * posibles, y el paso 7 se pintaba con el cálculo local. Eso abre tres cosas
 * que la versión anterior no podía comprobar y que ahora tienen su propio
 * bloque: **qué cuerpo se manda**, **de quién son los importes del paso 7** y
 * **que el cobro sigue siendo una simulación**.
 *
 * ── El permiso NO es atrezo del arranque ───────────────────────────────────
 * `POST /quotes/self-serve` exige `quote.request`, y ese permiso se siembra solo
 * en nivel `FULL`: una clínica en mora queda en `READ_ONLY` y **no lo tiene**.
 * Ese es el estado normal de quien se atrasó en un pago, no un borde raro, así
 * que «sin permiso el control desaparece y en su sitio hay una frase honesta»
 * es un caso con nombre propio, más abajo.
 *
 * ── El caso que justifica media especificación ─────────────────────────────
 * §5, caso 3: si el precio se movió entre elegir y confirmar, la pantalla lo
 * dice con LAS DOS CIFRAS y **se lleva el foco al aviso**, y sin volver a
 * aceptar no sale ninguna oferta. Eso es lo que esta pantalla hace por §3.3.4
 * Error Prevention, y es todo lo que hace.
 *
 * <p><b>Lo que este fichero afirmaba de más.</b> Aquí decía que la casilla de
 * términos «se desmarca», y el caso lo comprobaba con un `not.toBeChecked()`.
 * Era verde por una razón que no era esa: cuando la deriva se detecta la casilla
 * acaba de nacer sin marcar, así que la aserción pasaba igual con la línea del
 * componente borrada — y se borró, por muerta. El caso de abajo ya no descansa
 * en ese `not.toBeChecked()`: comprueba el foco, comprueba que confirmar a
 * ciegas no manda nada, y comprueba que tras releer y aceptar la compra SÍ sale.
 *
 * ── La pasarela de pago, y qué se simula de ella ────────────────────────────
 * «Confirmar mi plan» ya no navega al paso 7: pide la oferta y deja ver el
 * bloque «Medio de pago» (`MedioDePagoWompi.vue`), que tokeniza la tarjeta
 * DIRECTO contra Wompi —con la llave pública de `checkout-config`, nunca con
 * el JWT del tenant— y solo entonces registra el medio y acepta la oferta. Esta
 * spec simula los cinco puntos de esa frontera: `GET checkout-config`,
 * `GET subscription-payment-methods`, `POST payment-sources`,
 * `POST /quotes/{id}/accept` y `GET first-period-payment`; y añade un `page.route`
 * aparte sobre `https://sandbox.wompi.co/v1/tokens/cards` —un origen distinto del
 * backend propio— para comprobar con qué credencial sale esa petición y qué NO
 * lleva. El paso 7 pasó de decir «reservado» a sondear el cobro real: sondea
 * `first-period-payment` cada 2 s hasta que Wompi responde, y esta spec ejercita
 * las tres salidas (aprobado, rechazado, y el tramo pendiente de en medio).
 */

const CONFIRMAR = 'Confirmar mi plan'

/**
 * El mismo botón cuando lo que se contrata NO es un paquete.
 *
 * <p>El rótulo ramifica por `resumen.planCode`, y no es cosmética: llamar «mi
 * plan» a una selección que el prospecto armó casilla a casilla le pone nombre de
 * paquete a algo que no eligió, en el último texto que se lee antes de firmar.
 */
const CONFIRMAR_SELECCION = 'Confirmar mi selección'

/**
 * El `<h1>` del paso vinculante.
 *
 * <p>Era «Confirma tu plan». Esta pantalla sirve por igual a un paquete del
 * catálogo y a una propuesta a medida —es el mismo acto jurídico y el mismo
 * marcado—, así que nombrarla por «plan» daba por sentada como unidad de compra
 * justo la que el resto del embudo dejó de usar. Va en una constante y no
 * repetido cinco veces porque cinco literales es exactamente como se queda uno
 * sin cambiar.
 */
const TITULO_PASO6 = 'Confirma tu contratación'

/** Lo único que hace falta para que el paso vinculante exista. Ver el encabezado. */
const PERMISOS_CONTRATAR = ['quote.request']

function planPorCodigo(code: string) {
  const plan = PLANS_CONTENT.plans.find((p) => p.code === code)
  if (!plan) throw new Error(`El contenido de planes ya no publica «${code}»`)
  return plan
}

/** El plan de la intención por defecto del helper. `PACK_CLINIC` es su código real. */
const CLINICA = planPorCodigo('PACK_CLINIC')

/**
 * El importe mensual equivalente de una selección, calculado con la MISMA
 * función que usa la aplicación.
 *
 * Es lo que se siembra en `importeVistoMensual` para que un caso no dispare el
 * aviso de deriva de precio sin querer. Derivarlo en vez de escribir «179000» es
 * lo que hace que subir un precio en `plans.content.ts` no ponga en rojo seis
 * casos que no van del precio.
 */
function vistoMensual(sedes: number, usuarios: number): number {
  // `subtotalMensualEquivalente` devuelve `number | null` —`null` es «este plan no
  // tiene precio calculable»—. Declararlo `number` a secas hacía que un `null` se
  // sembrara como importe visto y el aviso de deriva se comprobara contra nada.
  return exigir(
    subtotalMensualEquivalente(CLINICA, { ciclo: 'MENSUAL', sedes, usuarios }),
    `un subtotal mensual para ${sedes} sede(s) y ${usuarios} usuario(s)`,
  )
}

/** «179.000» a partir del número, sin transcribirlo: los grupos que pinta `formatMoney`. */
const grupos = new Intl.NumberFormat('es-CO')

/**
 * La oferta que devuelve el servidor.
 *
 * **Los importes NO son los del cálculo local a propósito**, y esa es la única
 * forma de comprobar de quién son los que se pintan en el paso 7: si alguien
 * devolviera el estimado a la pantalla de éxito, estos números desaparecerían y
 * saldrían los de la lista transcrita. El impuesto ni siquiera es el 19 % del
 * subtotal — el servidor resuelve tarifa y tramos, y este front no tiene por qué
 * saber recomponerlo.
 */
const OFERTA = {
  id: 4242,
  quoteNumber: 'COT-E2E-0001',
  billingCycle: 'MONTHLY',
  subtotalAmount: 123_456,
  discountAmount: 0,
  taxAmount: 23_457,
  totalAmount: 146_913,
  status: 'SENT',
  validUntil: '2026-09-27',
  createdDate: '2026-08-28',
  enabled: true,
}

/** El origen de Wompi que hay que enrutar APARTE de `enrutarApi`: no cuelga de `/api/v1`. */
const WOMPI_SANDBOX_URL = 'https://sandbox.wompi.co/v1'

/** `GET /payment-gateway/wompi/checkout-config`. La llave pública, no el JWT del tenant. */
const CHECKOUT_CONFIG: WompiCheckoutConfigResponse = {
  environment: 'SANDBOX',
  apiBaseUrl: WOMPI_SANDBOX_URL,
  publicKey: 'pub_test_e2e_wompi',
  acceptance: {
    token: 'tok_acceptance_e2e',
    permalink: 'https://sandbox.wompi.co/terminos-y-condiciones',
  },
  personalDataAuthorization: {
    token: 'tok_personal_data_e2e',
    permalink: 'https://sandbox.wompi.co/autorizacion-datos',
  },
}

/**
 * `POST {apiBaseUrl}/tokens/cards`, la tarjeta de prueba de Wompi (Visa, Luhn
 * válida — no es un dato real ni sirve contra ningún servidor de verdad).
 */
const TOKEN_TARJETA_WOMPI = {
  status: 'CREATED',
  data: { id: 'tok_test_1', brand: 'VISA', last_four: '4242', exp_month: '12', exp_year: '29' },
}

/** `POST /payment-gateway/wompi/payment-sources`. */
const MEDIO_PAGO_NUEVO: WompiPaymentMethodResponse = {
  paymentMethodId: 501,
  brand: 'VISA',
  lastFour: '4242',
  expiresOn: '2029-12-31',
  defaultMethod: true,
}

/**
 * Un medio de pago YA guardado y activo por defecto, para el caso que se salta la
 * tokenización. `lastFour` es distinto del de {@link MEDIO_PAGO_NUEVO} a propósito:
 * si un caso mezclara las dos rutas por error, el número que aparece en pantalla
 * delataría cuál de las dos se sirvió.
 */
const MEDIO_GUARDADO: SubscriptionPaymentMethodResponse = {
  id: 900,
  companyId: EMPRESA_ID,
  methodKind: 'CARD',
  gateway: 'WOMPI',
  brand: 'VISA',
  lastFour: '1234',
  expiresOn: '2030-01-31',
  mandateStatus: 'ACTIVE',
  mandateEvidence: 'evidence-e2e',
  authorizedAt: '2026-01-01T00:00:00Z',
  defaultMethod: true,
  createdDate: '2026-01-01',
}

function paginaMediosPago(
  medios: SubscriptionPaymentMethodResponse[] = [],
): PageResponse<SubscriptionPaymentMethodResponse> {
  return { content: medios, page: 0, pageSize: 50, totalElements: medios.length, totalPages: 1 }
}

/**
 * `GET /payment-gateway/wompi/first-period-payment`, con la secuencia de estados
 * que hay que servir en cada llamada sucesiva. Con un solo elemento resuelve a la
 * primera: el sondeo con su intervalo real de 2 s solo hace falta ejercitarlo en
 * el caso dedicado a él, no en cada uno de los que solo necesitan llegar al paso 7.
 */
function primerPagoSondeo(
  secuencia: FirstPeriodPaymentResponse['status'][],
): (route: Route) => Promise<void> {
  let llamada = 0
  return (route: Route) => {
    const status = secuencia[Math.min(llamada, secuencia.length - 1)] ?? 'NOT_ATTEMPTED'
    llamada += 1
    const respuesta: FirstPeriodPaymentResponse = {
      status,
      amount: status === 'APPROVED' ? OFERTA.totalAmount : null,
      currency: status === 'APPROVED' ? 'COP' : null,
      gatewayReference: status === 'APPROVED' ? 'e2e-ref-1' : null,
      attemptedAt: status === 'NOT_ATTEMPTED' ? null : '2026-09-06T00:00:00Z',
    }
    return responderJson(route, respuesta)
  }
}

/**
 * Las rutas del bloque «Medio de pago», comunes a todo lo que atraviesa el paso 6
 * hasta el paso 7. Van en una función y no repetidas en cada `enrutarApi`: son
 * las mismas cinco para el caso feliz y solo cambian por lo que cada caso quiere
 * observar o forzar.
 */
function rutasPagoWompi(
  over: {
    mediosGuardados?: SubscriptionPaymentMethodResponse[]
    checkoutConfig?: (route: Route) => Promise<void> | void
    primerPago?: (route: Route) => Promise<void> | void
    onPaymentSource?: (cuerpo: WompiPaymentSourceRequest) => void
    onAccept?: (cuerpo: AcceptQuoteRequest) => void
  } = {},
): Record<string, (route: Route) => Promise<void> | void> {
  return {
    '/subscription-payment-methods*': (route: Route) =>
      responderJson(route, paginaMediosPago(over.mediosGuardados ?? [])),
    '/payment-gateway/wompi/checkout-config':
      over.checkoutConfig ?? ((route: Route) => responderJson(route, CHECKOUT_CONFIG)),
    '/payment-gateway/wompi/payment-sources': (route: Route) => {
      over.onPaymentSource?.(route.request().postDataJSON() as WompiPaymentSourceRequest)
      return responderJson(route, MEDIO_PAGO_NUEVO, 201)
    },
    '/quotes/*/accept': (route: Route) => {
      over.onAccept?.(route.request().postDataJSON() as AcceptQuoteRequest)
      const aceptada: QuoteResponse = { ...OFERTA, status: 'ACCEPTED' }
      return responderJson(route, aceptada, 200)
    },
    '/payment-gateway/wompi/first-period-payment':
      over.primerPago ?? primerPagoSondeo(['APPROVED']),
  }
}

/**
 * Los tres estados de `GET /subscriptions/current`, que son TRES y no dos.
 *
 * <p>Es la señal que decide si el cliente autenticado puede volver al escaparate
 * (`allowClientWithoutPlan`, en el guard del router) y si el paso 6 le deja
 * seguir. `DESCONOCIDO` —un 403 del rol sin `subscription.read`, o un fallo de
 * red— **no** es «no tiene plan»: colapsarlo con `SIN_PLAN` cerraría la puerta a
 * quien quizá no lo tiene, y colapsarlo con `CON_PLAN` la abriría a quien ya
 * contrató. Por eso los tres se enrutan explícitamente y ninguno queda al azar
 * de lo que devuelva el comodín.
 */
type EstadoDelPlan = 'SIN_PLAN' | 'CON_PLAN' | 'DESCONOCIDO'

/**
 * Un plan VIGENTE con la forma del contrato. `ACTIVE` está en `VIGENTES`, y `origin: 'QUOTE'`
 * es lo que lo distingue de un alta sin plan contratado (ver `CONTRATO_INICIAL`, debajo).
 */
const PLAN_VIGENTE: SubscriptionResponse = {
  id: 55,
  subscriptionNumber: 'SUS-E2E-0001',
  companyId: EMPRESA_ID,
  billingCycle: 'MONTHLY',
  status: 'ACTIVE',
  current: true,
  startDate: '2026-01-01',
  autoRenew: true,
  createdDate: '2026-01-01',
  enabled: true,
  origin: 'QUOTE',
}

/**
 * El contrato mínimo estructural que el alta de una empresa firma siempre: vigente por
 * `status`, pero `origin: 'INITIAL'` dice que no hay ningún plan contratado. `estadoPlanActual`
 * lo trata como `SIN_PLAN`, así que una empresa recién dada de alta sigue pudiendo entrar a
 * `/planes`.
 */
const CONTRATO_INICIAL: SubscriptionResponse = {
  ...PLAN_VIGENTE,
  id: 56,
  subscriptionNumber: 'SUS-E2E-0002',
  origin: 'INITIAL',
}

/**
 * El 404 de «esta clínica no tiene plan», que es el estado NORMAL de todo el que
 * recorre este embudo. Es un desenlace, no una avería: el store lo lee como
 * `notFound` y `estadoPlanActual` da `SIN_PLAN`.
 */
const SIN_PLAN_404 = {
  status: 404,
  title: 'Not Found',
  detail: 'La empresa no tiene una suscripción vigente.',
}

function suscripcionSegun(estado: EstadoDelPlan) {
  return (route: Route): Promise<void> => {
    if (estado === 'CON_PLAN') return responderJson(route, PLAN_VIGENTE)
    // 403 con `problem+json`: el rol sin `subscription.read`. NO es «sin plan».
    if (estado === 'DESCONOCIDO') return prohibido(route)
    return responderJson(route, SIN_PLAN_404, 404)
  }
}

/** Lo que el paso 7 pintaría si recompusiera el total en local en vez de creer al servidor. */
const TOTAL_ESTIMADO_LOCAL = Math.round(CLINICA.monthlyFromAmount * (1 + CLINICA.taxRate / 100))

/** El cuerpo de `POST /quotes/self-serve`, espejo de `SelfServeQuoteRequest`. */
interface CuerpoEnviado {
  clientRequestId: string
  billingCycle: string
  lines: { code: string; quantity: number }[]
}

/**
 * Lo que la prueba ve de la petición: el cuerpo y cuántas veces salió.
 *
 * <p>`paymentSource` y `accept` son opcionales porque no todos los sitios que
 * construyen una `Captura` pasan por {@link entrarAlPaso6} (`irAPlanes`, más
 * abajo, arma la suya a mano): solo se rellenan cuando la ruta de pago está
 * cableada, y los casos que no llegan a pagar no los necesitan.
 */
interface Captura {
  cuerpo: CuerpoEnviado | null
  llamadas: number
  /** El cuerpo de `POST /payment-gateway/wompi/payment-sources`, o `null` si no se llamó. */
  paymentSource?: WompiPaymentSourceRequest | null
  /** El cuerpo de `POST /quotes/{id}/accept`, o `null` si no se llamó. */
  accept?: AcceptQuoteRequest | null
}

interface OpcionesPaso6 {
  /** Por defecto, el mínimo que hace existir el botón. `[]` es la clínica en mora. */
  permisos?: string[]
  /**
   * Por defecto `SIN_PLAN`, que es el estado de todo el que llega hasta aquí.
   *
   * <p>Antes esto caía en el comodín, que devuelve una página vacía: un objeto
   * sin `status`, que `planVigente` lee como «no vigente» y acaba dando
   * `SIN_PLAN` **por accidente**. Salía el mismo verde, pero por una casualidad
   * de la forma del comodín y no porque nadie hubiera decidido nada — y el día
   * que el comodín cambiara, media suite se pondría roja sin motivo aparente.
   */
  estadoDelPlan?: EstadoDelPlan
  /** Por defecto ninguno: el caso normal tokeniza una tarjeta nueva. */
  mediosGuardados?: SubscriptionPaymentMethodResponse[]
  /** Para forzar `checkout-config` caído (409/503: «todavía no está disponible»). */
  checkoutConfig?: (route: Route) => Promise<void> | void
  /** Por defecto aprueba a la primera. Ver {@link primerPagoSondeo}. */
  primerPago?: (route: Route) => Promise<void> | void
  /**
   * `POST {apiBaseUrl}/tokens/cards`. Por defecto responde {@link TOKEN_TARJETA_WOMPI}.
   *
   * <p>Va como opción de {@link entrarAlPaso6} y no como un `page.route` aparte en cada
   * caso que quisiera inspeccionarla: dos `page.route` sobre el mismo patrón se resuelven
   * en el ORDEN INVERSO al de registro, así que uno declarado por el caso ANTES de entrar
   * al paso 6 quedaría tapado por el que registraría `entrarAlPaso6` después. Con una sola
   * declaración, el caso que quiere mirar la petición pasa su propia función aquí.
   */
  tokenizar?: (route: Route) => Promise<void> | void
}

/**
 * Entra al paso 6 con la sesión, la intención y la API simuladas, y devuelve el
 * espejo de lo que se mande a `/quotes/self-serve`.
 *
 * El permiso va por defecto porque sin él **el control no existe** (no está
 * deshabilitado: no está), y un caso que quisiera pulsarlo fallaría con «no
 * encuentro el botón» sin decir por qué. El caso que comprueba justamente eso lo
 * pide vacío a propósito.
 */
async function entrarAlPaso6(
  page: Page,
  over: Partial<Intencion> = {},
  opciones: OpcionesPaso6 = {},
): Promise<Captura> {
  const captura: Captura = { cuerpo: null, llamadas: 0, paymentSource: null, accept: null }

  await instalarSesion(page)
  await sembrarIntencion(page, intencion(over))
  await enrutarApi(
    page,
    {
      // Los tres públicos van SIEMPRE, incluso en los casos que no salen de esta
      // pantalla: las dos ramas del plan piden `POST /quotes/preview` para el
      // precio real —el paquete solo cuando el estimado local no tiene ningún
      // hueco, la modular siempre—, la modular además `GET /catalog`, y los
      // cuatro «Cambiar» acaban en `/planes`, que necesita los tres. Sin ellos
      // caen en el comodín, que devuelve una página vacía, y el fallo que se ve
      // es «no encuentro el resumen» en una pantalla que sí montó.
      ...RUTAS_DEL_EMBUDO,
      '/companies/*': EMPRESA_RESPUESTA,
      '/subscriptions/current': suscripcionSegun(opciones.estadoDelPlan ?? 'SIN_PLAN'),
      // 201 y no 200: es lo que devuelve el endpoint, también en el reintento
      // idempotente con la misma `clientRequestId`.
      '/quotes/self-serve': (route: Route) => {
        captura.llamadas += 1
        captura.cuerpo = route.request().postDataJSON() as CuerpoEnviado
        return responderJson(route, OFERTA, 201)
      },
      // El bloque «Medio de pago» los pide en cuanto la oferta existe: sin ellos,
      // `MedioDePagoWompi` monta sobre un `checkout-config` con la forma del
      // comodín y revienta leyendo `config.acceptance.permalink`.
      ...rutasPagoWompi({
        mediosGuardados: opciones.mediosGuardados,
        checkoutConfig: opciones.checkoutConfig,
        primerPago: opciones.primerPago,
        onPaymentSource: (cuerpo) => {
          captura.paymentSource = cuerpo
        },
        onAccept: (cuerpo) => {
          captura.accept = cuerpo
        },
      }),
    },
    { permisos: opciones.permisos ?? PERMISOS_CONTRATAR },
  )
  // Un origen distinto del backend propio: `enrutarApi` solo enruta `**/api/v1/**`.
  await page.route(
    `${WOMPI_SANDBOX_URL}/tokens/cards`,
    opciones.tokenizar ?? ((route: Route) => responderJson(route, TOKEN_TARJETA_WOMPI)),
  )
  await page.goto('/dashboard/contratar')
  await expect(page.getByRole('heading', { level: 1, name: TITULO_PASO6 })).toBeVisible()

  return captura
}

/**
 * Rellena el formulario de tarjeta NUEVA del bloque «Medio de pago» y lo envía.
 *
 * <p>La tarjeta es la de prueba de Wompi (Visa, Luhn válida): no es un dato real
 * y no sirve contra ningún servidor de verdad. Asume que el bloque ya está
 * pintado —`confirmar()` lo espera antes de llamar aquí— y que no hay un medio
 * guardado por defecto, que es la rama que prueba {@link pagarConMedioGuardado}.
 */
async function pagarConTarjetaNueva(
  page: Page,
  correo = 'acepta.paga.e2e@example.com',
): Promise<void> {
  const paso = page.getByTestId('paso-contratar')
  await paso.getByRole('textbox', { name: 'Número de tarjeta' }).fill('4242 4242 4242 4242')
  await paso.getByRole('textbox', { name: 'Vencimiento (MM/AA)' }).fill('12/29')
  await paso.getByRole('textbox', { name: 'CVC' }).fill('123')
  await paso.getByRole('textbox', { name: 'Nombre del titular' }).fill('Prueba E2E')
  await paso.getByRole('textbox', { name: 'Correo de quien acepta y paga' }).fill(correo)
  await paso.getByRole('checkbox', { name: 'Acepto los' }).check()
  await paso.getByRole('checkbox', { name: 'Autorizo el tratamiento' }).check()
  await paso.getByRole('button', { name: 'Guardar tarjeta y pagar' }).click()
}

/** La otra rama del bloque de pago: paga con el medio que ya existía por defecto. */
async function pagarConMedioGuardado(
  page: Page,
  correo = 'acepta.paga.e2e@example.com',
): Promise<void> {
  const paso = page.getByTestId('paso-contratar')
  await paso.getByRole('textbox', { name: 'Correo de quien acepta y paga' }).fill(correo)
  await paso.getByRole('button', { name: /^Pagar con la tarjeta terminada en/ }).click()
}

/**
 * Marca los términos, confirma y paga con una tarjeta nueva. Espera al paso 7,
 * que es el estado observable.
 */
async function confirmar(page: Page, rotulo: string = CONFIRMAR): Promise<void> {
  const paso = page.getByTestId('paso-contratar')
  await paso.getByRole('checkbox').check()
  await paso.getByRole('button', { name: rotulo }).click()
  await expect(paso.getByRole('heading', { level: 2, name: 'Medio de pago' })).toBeVisible()
  await pagarConTarjetaNueva(page)
  await expect(page).toHaveURL(/\/dashboard\/contratar\/exito$/)
}

test.describe('Paso 6 — el paso vinculante', () => {
  test('resume la clínica, el plan y las fechas de prueba por línea', async ({ page }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    // El nombre y el NIT vienen del servidor.
    await expect(paso).toContainText(EMPRESA_NOMBRE)
    await expect(paso).toContainText('900123456-7')

    // La prueba vence POR LÍNEA, no por contrato. Caja tiene 14 días y Agenda
    // 30 dentro del mismo plan, así que la tabla tiene que enseñar las dos.
    // Los nombres van COMPLETOS: «Caja» y «Agenda» a secas pasaban por subcadena
    // y habrían seguido pasando con el módulo renombrado a cualquier cosa que
    // empezara igual.
    //
    // Y son los de `plans.content.ts`, NO los del catálogo: en la rama del
    // paquete la tabla de pruebas se arma con los `includes` del plan. Por eso
    // aquí sigue diciendo «Caja y punto de venta» mientras la rama modular ya
    // dice «Caja y ventas» — la transcripción se quedó en el changeset 308
    // (issue #360) y el catálogo va por el 407.
    await expect(paso).toContainText('Caja y punto de venta')
    await expect(paso).toContainText('Agenda de citas')

    // Al entrar en el paso el foco va al `<h1>`: tras un `router.push` se queda
    // en el `<body>` y el lector empieza a leer desde la navegación otra vez.
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PASO6 })).toBeFocused()
  })

  test('conserva la semántica del paso', async ({ page }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    // ── El indicador de progreso, AFIRMADO aparte de la instantánea ─────────
    // Y no por redundancia: la instantánea ARIA de Playwright **no serializa
    // `aria-current`**, así que un indicador con los cuatro pasos marcados como
    // actual —o con ninguno— la deja idéntica. Lo que convierte una fila de
    // puntos en un progreso para un lector de pantalla es exactamente ese
    // atributo, y esto es lo único que puede verlo.
    const progreso = paso.getByRole('navigation', { name: 'Progreso de la contratación' })
    await expect(progreso.getByRole('listitem')).toHaveCount(4)
    await expect(progreso.locator('li[aria-current="step"]')).toHaveCount(1)
    await expect(progreso.locator('li[aria-current="step"]')).toContainText('Confirmar')

    await expect(paso).toMatchAriaSnapshot({ name: 'contratar-paso6.aria.yml' })
  })

  test('sin aceptar los términos no activa, y el resumen de errores lo dice igual que el campo', async ({
    page,
  }) => {
    const captura = await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    // Se activa con el TECLADO y no con `click()`: el botón lleva
    // `aria-disabled` en vez de `disabled` —a propósito, para no salirse del
    // orden de tabulación— y Playwright lo da por no accionable, así que un
    // `click()` se queda esperando a que se «habilite» y el rojo no señalaría a
    // nada. Enter sobre el botón enfocado es además el gesto exacto que §D.6
    // existe para permitir: llegar hasta él con el teclado y que conteste.
    const boton = paso.getByRole('button', { name: CONFIRMAR })
    await boton.focus()
    await page.keyboard.press('Enter')

    // Sigue en el paso 6: no ha pasado nada.
    await expect(page).toHaveURL(/\/dashboard\/contratar$/)

    const resumen = page.getByRole('alert').filter({ hasText: 'problema' })
    await expect(resumen).toBeVisible()
    // El foco va al resumen: si se queda en el botón, quien usa lector de
    // pantalla no se entera de que hay un error arriba.
    await expect(resumen).toBeFocused()

    // GOV.UK: texto LITERAL, no reformulado. Es lo que permite reconocer el
    // error de arriba como el mismo de abajo.
    const texto = 'Tienes que aceptar los Términos para continuar.'
    await expect(resumen.getByRole('link', { name: texto })).toBeVisible()

    // Y el ancla mueve el FOCO al control, no solo el hash.
    await resumen.getByRole('link', { name: texto }).click()
    await expect(paso.getByRole('checkbox')).toBeFocused()

    // Y NADA salió hacia el servidor. Antes esto no se podía afirmar porque no
    // había servidor al que salir; ahora lo hay, y «no activa» sin esta línea
    // solo dice que la pantalla no cambió de URL.
    expect(captura.llamadas, 'un consentimiento no dado no puede haber pedido una oferta').toBe(0)
  })

  test('el botón bloqueado sigue tabulable y dice por qué, en pantalla', async ({ page }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')
    const boton = paso.getByRole('button', { name: CONFIRMAR })

    // `aria-disabled` y NO `disabled`: el atributo nativo lo sacaría del orden de
    // tabulación, y quien llega con el teclado se quedaría delante de un botón
    // que no responde y sin nada que le diga qué falta (§2.4.3 / §3.3.1).
    await expect(boton).toHaveAttribute('aria-disabled', 'true')
    await expect(boton).not.toHaveAttribute('disabled')
    await boton.focus()
    await expect(boton).toBeFocused()

    // El motivo se resuelve de verdad y se comprueba que se VE: un
    // `aria-describedby` que apunta a nada se lee igual de bien en el marcado, y
    // un motivo solo para lector deja al resto mirando un botón muerto.
    const id = exigir(await boton.getAttribute('aria-describedby'), 'el motivo del bloqueo')
    const motivo = page.locator(`#${id}`)
    await expect(motivo).toBeVisible()
    await expect(motivo).toHaveText('Marca la casilla de arriba para poder confirmar.')

    await paso.getByRole('checkbox').check()
    await expect(boton).not.toHaveAttribute('aria-disabled', 'true')
    await expect(motivo).toHaveCount(0)
  })

  test('la casilla marcada lleva al paso 7, paga con Wompi y dice que el pago quedó aprobado', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    await confirmar(page)

    const exito = page.getByTestId('contratacion-exito')
    const titulo = exito.getByRole('heading', { level: 1 })

    // El `<h1>` CUENTA los módulos en vez de nombrar el paquete, porque sirve
    // por igual a la rama modular, donde no hay ninguno que nombrar. El número
    // se deriva de los `includes` del contenido y no se transcribe: un módulo
    // más en el paquete cambiaría la frase, y un «5» quemado dejaría este caso
    // rojo por algo que no es un fallo.
    await expect(titulo).toContainText(`Contrataste tu plan con ${CLINICA.includes.length} módulos`)
    await expect(titulo).toBeFocused()

    // El paquete se nombra ahora en la bajada. Que siga estando en algún sitio es
    // lo que impide que la pantalla de éxito deje de decir QUÉ se compró.
    await expect(exito).toContainText(CLINICA.name)
    await expect(exito).toContainText(EMPRESA_NOMBRE)

    // El cobro ya es real: con Wompi aprobando a la primera, el plan queda
    // activo de verdad, y el título de la pestaña dice lo mismo que la insignia.
    await expect(exito).toContainText('Pago aprobado')
    await expect(exito).toContainText('Pago aprobado: tu plan está activo.')
    await expect(page).toHaveTitle('Pago aprobado — Lumbre')
  })

  test('la intención se descarta al contratar: el enganche del login no vuelve a disparar', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    await confirmar(page)

    const guardada = await leerIntencion(page)
    expect(guardada?.descartada, 'sin esto, el guard reabre el embudo').toBe(true)
  })

  test('«Ahora no» no borra la intención: la marca, y sale al tablero', async ({ page }) => {
    const captura = await entrarAlPaso6(page)
    await page.getByTestId('paso-contratar').getByRole('button', { name: 'Ahora no' }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    const guardada = await leerIntencion(page)
    // Borrarla haría que el enganche del login volviera a disparar en la
    // siguiente navegación, y eso es una jaula.
    expect(guardada, 'descartar NO es borrar').not.toBeNull()
    expect(guardada?.descartada).toBe(true)
    expect(captura.llamadas, 'salir del embudo no pide ninguna oferta').toBe(0)
  })
})

/**
 * El cuerpo de `POST /quotes/self-serve`.
 *
 * Este bloque es el que no podía existir antes, y es el que protege una factura.
 * `lineasDeContratacion` toma tres decisiones y las tres tienen una cifra
 * detrás; las tres se comprueban aquí contra el JSON que de verdad sale por el
 * cable, y no contra la función en un unitario, porque lo que se afirma es que
 * la pantalla la llama con lo que el usuario eligió.
 */
test.describe('El cuerpo que viaja a POST /quotes/self-serve', () => {
  test('el paquete viaja por su `code`, y va una sola línea cuando nada se pasa de lo incluido', async ({
    page,
  }) => {
    // La intención por defecto: 1 sede y 1 persona, que es JUSTO el mínimo
    // estructural que la plataforma concede (1 sede, 2 personas). Nada se pasa de
    // lo incluido, así que no hay línea de capacidad que mandar.
    const captura = await entrarAlPaso6(page)
    await confirmar(page)

    expect(captura.llamadas).toBe(1)
    expect(captura.cuerpo?.lines).toEqual([{ code: CLINICA.code, quantity: 1 }])
  })

  test('los módulos del paquete NO viajan como línea: cobrarlos aparte los cobra dos veces', async ({
    page,
  }) => {
    const captura = await entrarAlPaso6(page)
    await confirmar(page)

    // `findPublishedIdByCode` acepta sin rechistar un `MODULE` que cuelgue de un
    // paquete publicado, así que el servidor los resolvería y los facturaría: su
    // precio YA está dentro del precio de entrada del paquete
    // (`bundle_components`). Es un cobro doble de verdad, no una diferencia de
    // redondeo, y además es la única forma de que el total del servidor se
    // separe del estimado que el usuario acaba de aceptar.
    const enviados = (captura.cuerpo?.lines ?? []).map((l) => l.code)
    for (const modulo of CLINICA.includes) {
      expect(enviados, `«${modulo.code}» es un componente del paquete, no una línea`).not.toContain(
        modulo.code,
      )
    }
  })

  test('al pasar de lo incluido, la línea de capacidad viaja con la cantidad EXTRA', async ({
    page,
  }) => {
    const sedes = 3 // el mínimo estructural incluye 1
    const usuarios = 12 // el mínimo estructural incluye 2
    const captura = await entrarAlPaso6(page, {
      sedes,
      usuarios,
      importeVistoMensual: vistoMensual(sedes, usuarios),
    })
    await confirmar(page)

    const lineas = captura.cuerpo?.lines ?? []
    expect(lineas).toContainEqual({ code: CLINICA.code, quantity: 1 })

    // `EXTRA_*` tiene `included_quantity = 0`: el servidor cobra tal cual lo
    // que reciba en la línea, así que mandar el total contratado cobraría dos
    // veces lo incluido.
    for (const capacidad of CLINICA.capacities) {
      const contratada = capacidad.unit === 'BRANCH' ? sedes : usuarios
      expect(contratada, 'el caso deja de probar nada si no supera lo incluido').toBeGreaterThan(
        capacidad.included,
      )
      expect(lineas).toContainEqual({
        code: capacidad.code,
        quantity: contratada - capacidad.included,
      })
    }

    expect(lineas).toHaveLength(1 + CLINICA.capacities.length)
  })

  /**
   * Qué ve el cliente cuando `POST /quotes/self-serve` rechaza la oferta: ni
   * paso 7 ni intención descartada, para poder reintentar.
   */
  test('cuando el servidor rechaza la capacidad, el cliente NO acaba en el paso 7 creyendo que compró', async ({
    page,
  }) => {
    const sedes = 3
    const usuarios = 12
    let llamadas = 0

    await instalarSesion(page)
    await sembrarIntencion(
      page,
      intencion({ sedes, usuarios, importeVistoMensual: vistoMensual(sedes, usuarios) }),
    )
    await enrutarApi(
      page,
      {
        ...RUTAS_DEL_EMBUDO,
        '/companies/*': EMPRESA_RESPUESTA,
        '/quotes/self-serve': (route: Route) => {
          llamadas += 1
          return responderJson(
            route,
            {
              status: 400,
              error: 'Bad Request',
              message: 'Unknown or unavailable catalog item code',
              path: '/api/v1/quotes/self-serve',
            },
            400,
          )
        },
      },
      { permisos: PERMISOS_CONTRATAR },
    )
    await page.goto('/dashboard/contratar')
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PASO6 })).toBeVisible()

    const paso = page.getByTestId('paso-contratar')
    await paso.getByRole('checkbox').check()
    await paso.getByRole('button', { name: CONFIRMAR }).click()

    // Salió la petición y volvió rechazada.
    await expect(paso).toContainText('No pudimos registrar tu contratación')
    expect(llamadas).toBe(1)

    // Y lo que NO pasó: no hay paso 7, no hay bloque de pago que tokenizar y la
    // intención sigue viva para poder reintentar. Un cliente que ve la pantalla
    // de éxito sobre una oferta que el servidor rechazó es el peor final posible
    // de este embudo.
    await expect(page).toHaveURL(/\/dashboard\/contratar$/)
    await expect(page.getByTestId('contratacion-exito')).toHaveCount(0)
    const guardada = await leerIntencion(page)
    expect(guardada?.descartada, 'una contratación fallida no descarta la intención').toBe(false)
  })

  test('la capacidad que NO se pasa de lo incluido se queda fuera del cuerpo', async ({ page }) => {
    // Justo lo incluido, ni una más: el servidor no emitiría renglón por ella
    // (`billableQuantity` da 0), pero el traductor sí exige que exista fila de
    // precio en el ciclo pedido, y una capacidad sin ella hunde la oferta ENTERA
    // con un mensaje que no dice cuál falló. Una línea que no cobra nada solo
    // puede hacer daño.
    const sedes = CLINICA.capacities.find((c) => c.unit === 'BRANCH')?.included ?? 1
    const usuarios = CLINICA.capacities.find((c) => c.unit === 'USER')?.included ?? 1
    const captura = await entrarAlPaso6(page, {
      sedes,
      usuarios,
      importeVistoMensual: vistoMensual(sedes, usuarios),
    })
    await confirmar(page)

    expect(captura.cuerpo?.lines).toEqual([{ code: CLINICA.code, quantity: 1 }])
  })

  test('el ciclo viaja con el vocabulario del contrato, no con el rótulo de la pantalla', async ({
    page,
  }) => {
    // `MENSUAL`/`ANUAL` son el rótulo de un selector; por el cable van
    // `MONTHLY`/`ANNUAL`. `importeVistoMensual` se normaliza a mensual, así que
    // elegir el ciclo anual no dispara por sí solo el aviso de deriva.
    const captura = await entrarAlPaso6(page, { ciclo: 'ANUAL' })
    await confirmar(page)

    expect(captura.cuerpo?.billingCycle).toBe('ANNUAL')
  })

  test('lleva llave de idempotencia, y cabe en los 64 caracteres del contrato', async ({
    page,
  }) => {
    // Es lo que hace que un doble clic —o una segunda pestaña— no cree dos
    // ofertas: el servidor devuelve la primera con el mismo 201.
    const captura = await entrarAlPaso6(page)
    await confirmar(page)

    const llave = captura.cuerpo?.clientRequestId ?? ''
    expect(llave.length).toBeGreaterThan(0)
    expect(llave.length).toBeLessThanOrEqual(64)
  })

  test('la empresa NO viaja en el cuerpo: la pone el servidor desde el principal', async ({
    page,
  }) => {
    const captura = await entrarAlPaso6(page)
    await confirmar(page)

    // `isMyCompany` compara la empresa consigo misma porque el controlador la
    // deriva de `authz.currentCompanyId()`. Mandarla desde el cliente sería
    // ofrecer un campo que el servidor ignora y que la próxima persona que lea
    // esto creería que se respeta.
    expect(Object.keys(captura.cuerpo ?? {}).sort()).toEqual([
      'billingCycle',
      'clientRequestId',
      'lines',
    ])
  })
})

/**
 * LA RAMA MODULAR — `CORE` + cada módulo marcado, o el paquete cuando coincide.
 *
 * <p>Hasta aquí, los tres casos del bloque de arriba cubrían la MISMA rama: la
 * del paquete. La modular —la que el rediseño acaba de abrir y la única que
 * existe cuando el prospecto marca casillas una a una— no la tocaba ningún caso
 * de extremo a extremo, y sí la cubría un unitario
 * (`tests/unit/contratacion-lineas.spec.ts`). La diferencia entre los dos es
 * exactamente lo que este bloque añade: el unitario comprueba que la función
 * devuelve las líneas buenas, y esto comprueba que **la pantalla la llama con lo
 * que el usuario eligió**.
 *
 * <p>El escenario concreto que protege: alguien cambia la condición con la que
 * se elige rama —hoy es `planCode`— y la modular empieza a mandar el paquete
 * **y** sus componentes. El servidor lo rechaza con un `INVALID_INPUT` cuyo
 * cuerpo no dice qué línea sobró, así que el prospecto ve «No pudimos registrar
 * tu contratación» en el clic vinculante, después de haberse registrado y
 * verificado el correo.
 */
test.describe('El cuerpo modular que viaja a POST /quotes/self-serve', () => {
  /**
   * Los módulos que reproducen `PACK_CLINIC`, DERIVADOS del catálogo.
   *
   * <p>Transcribir los cuatro códigos dejaría este bloque verde el día que el
   * paquete gane un componente: la selección dejaría de coincidir, la cesta
   * pasaría a ser modular y el caso que afirma «esto se cotiza como paquete»
   * estaría probando justo lo contrario sin decirlo.
   */
  const MODULOS_DEL_PAQUETE = modulosQueReproducen('PACK_CLINIC')

  /** Los códigos de los tres paquetes publicados. Ninguno puede aparecer en la rama modular. */
  const PAQUETES = PLANS_CONTENT.plans.map((p) => p.code)

  /**
   * Entra al paso 6 con una intención SIN paquete.
   *
   * <p>`importeVistoMensual` se deriva de la misma cesta que el doble va a
   * cotizar. Es lo que evita que salte el aviso de deriva de precio, que aquí no
   * sería un hallazgo sino ruido: en esta rama no hay lista de precio local con
   * la que recalcular el importe, así que una cifra escrita a mano diverge del
   * servidor en cuanto se toca un precio del catálogo de prueba.
   */
  function entrarConModulos(page: Page, modulos: string[]): Promise<Captura> {
    const seleccion = { modulos, sedes: 1, usuarios: 1 }
    return entrarAlPaso6(
      page,
      intencionDeModulos(modulos, subtotalDeSeleccion(seleccion, 'MENSUAL')),
    )
  }

  test('sin paquete viajan el núcleo y cada módulo marcado, y ningún código de paquete', async ({
    page,
  }) => {
    const captura = await entrarConModulos(page, ['SCHEDULING', 'CASH_REGISTER'])
    const paso = page.getByTestId('paso-contratar')

    // El botón lo dice antes de pulsarlo: no hay ningún plan que nombrar.
    await expect(paso.getByRole('button', { name: CONFIRMAR_SELECCION })).toBeVisible()
    // Y el importe que se pinta es el del servidor, no uno recalculado en local:
    // si lo fuera, no coincidiría con el que se sembró y saltaría el aviso.
    await expect(page.getByRole('alert').filter({ hasText: 'El precio cambió' })).toHaveCount(0)

    await confirmar(page, CONFIRMAR_SELECCION)

    expect(captura.llamadas).toBe(1)
    const lineas = captura.cuerpo?.lines ?? []

    // El núcleo entra SIEMPRE, aunque nadie lo marque: es el mínimo estructural
    // (`is_core`), y sin él el servidor cotizaría módulos sueltos sobre nada.
    expect(lineas).toContainEqual({ code: 'CORE', quantity: 1 })
    expect(lineas).toContainEqual({ code: 'SCHEDULING', quantity: 1 })
    expect(lineas).toContainEqual({ code: 'CASH_REGISTER', quantity: 1 })

    // Ni un código de paquete. Un paquete junto a una pieza suya son dos cobros
    // por lo mismo, y aquí ni siquiera hay paquete que reproducir: mandarlo
    // cobraría trece módulos a quien marcó dos.
    const codigos = lineas.map((l) => l.code)
    for (const paquete of PAQUETES) {
      expect(
        codigos,
        `«${paquete}» no lo eligió nadie: la selección no lo reproduce`,
      ).not.toContain(paquete)
    }

    // Y nada más: 1 sede y 1 persona caben en lo incluido, así que no hay línea
    // de capacidad. Sin esta cuenta, una línea de más pasaría desapercibida.
    expect(lineas).toHaveLength(3)
  })

  test('cuando los módulos reproducen un paquete viaja el paquete, y ni una pieza suya', async ({
    page,
  }) => {
    // El modelo híbrido (decisión D4): los paquetes llevan entre un 14 % y un
    // 18 % de descuento sobre la suma de sus piezas, así que cotizar las piezas
    // de una combinación que existe como paquete le subiría el precio al cliente
    // en silencio. Quien lo decide es `paqueteQueCoincide`, LA MISMA función que
    // compuso la cesta que se cotizó: dos criterios distintos —uno para cotizar y
    // otro para contratar— enseñarían un precio y cobrarían otro.
    const captura = await entrarConModulos(page, [...MODULOS_DEL_PAQUETE])
    await confirmar(page, CONFIRMAR_SELECCION)

    expect(captura.cuerpo?.lines).toEqual([{ code: 'PACK_CLINIC', quantity: 1 }])

    // Explícito además de la igualdad de arriba: es la afirmación que se leería
    // en el informe el día que alguien añada los componentes «para que el
    // servidor sepa qué activar».
    const codigos = (captura.cuerpo?.lines ?? []).map((l) => l.code)
    for (const modulo of MODULOS_DEL_PAQUETE) {
      expect(codigos, `«${modulo}» ya está dentro del precio de entrada del paquete`).not.toContain(
        modulo,
      )
    }
    expect(codigos).not.toContain('CORE')
  })

  test('conserva la semántica del paso, con el desglose que solo tiene esta rama', async ({
    page,
  }) => {
    // `ELECTRONIC_INVOICING` es `NEVER_FREE` en el catálogo, y es el único
    // artículo que hace aparecer la fila «Sin prueba · se cobra desde el primer
    // día». Sin él, la instantánea no fotografiaría la distinción entre «no tiene
    // prueba» y «su prueba acaba hoy», que es la promesa que la tabla existe para
    // no hacer en falso.
    await entrarConModulos(page, ['SCHEDULING', 'CASH_REGISTER', 'ELECTRONIC_INVOICING'])

    await expect(page.getByTestId('paso-contratar')).toMatchAriaSnapshot({
      name: 'contratar-paso6-modular.aria.yml',
    })
  })
})

/** Paso 7 — de quién son los importes, y qué NO ha pasado todavía. */
test.describe('Paso 7 — manda el servidor', () => {
  test('pinta los importes de la oferta, no el estimado que se recalcularía en local', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    await confirmar(page)
    const exito = page.getByTestId('contratacion-exito')

    // El TOTAL del servidor, con el sufijo que dice que el impuesto va dentro:
    // «IVA incluido» es una afirmación tributaria y solo puede acompañar a la
    // cifra que de verdad lo lleva, nunca a una base gravable.
    await expect(exito).toContainText(grupos.format(OFERTA.totalAmount))
    await expect(exito).toContainText('IVA incluido')

    // El desglose ya NO se pinta aquí: la base gravable y el impuesto se ven en
    // el paso 6, ANTES de confirmar, que es cuando el comprador los necesita.
    // Repetir un subtotal al lado de un total rotulado «IVA incluido» publicaría
    // dos cifras sin decir cuál se cobra.
    await expect(exito).not.toContainText(grupos.format(OFERTA.subtotalAmount))
    await expect(exito).not.toContainText(grupos.format(OFERTA.taxAmount))

    // Y NO el que saldría de la lista de precio transcrita. Sin esta línea, un
    // `??` puesto al revés en `activarPlan` —el estimado ganando al servidor—
    // pasaría desapercibido: los dos números se leen igual de bien en pantalla.
    await expect(exito).not.toContainText(grupos.format(TOTAL_ESTIMADO_LOCAL))
  })

  test('el número de la oferta y su vigencia se pintan: hacen accionable el «escríbenos»', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    await confirmar(page)
    const exito = page.getByTestId('contratacion-exito')

    await expect(exito).toContainText(OFERTA.quoteNumber)
    // La vigencia, ENTERA. Un «27» y un «2026» sueltos ya salen en la tabla de
    // fechas de prueba, así que afirmarlos por separado pasaría igual con la
    // vigencia sin pintar: la fecha completa es lo único que solo puede venir de
    // `validUntil`.
    await expect(exito).toContainText('27 de septiembre, 2026')
  })

  /**
   * El cobro ya NO es una simulación: `SettleNewContractService` reacciona a la
   * oferta aceptada y el paso 7 sondea el desenlace real en vez de darlo por
   * hecho. Este bloque cubre las tres salidas de ese sondeo.
   */
  test('el pago aprobado activa el plan de verdad, y lo dice sin ambigüedad', async ({ page }) => {
    await entrarAlPaso6(page)
    await confirmar(page)
    const exito = page.getByTestId('contratacion-exito')

    await expect(exito).toContainText('Pago aprobado')
    await expect(exito).toContainText('Pago aprobado: tu plan está activo.')
    await expect(page).toHaveTitle('Pago aprobado — Lumbre')

    // El aviso de «no se ha cobrado nada» era verdad en el modo demostración y
    // dejó de serlo: si sobreviviera aquí, la pantalla mentiría sobre un cargo
    // que Wompi sí hizo.
    await expect(exito).not.toContainText('Modo demostración')
    await expect(exito).not.toContainText('no se ha cobrado nada')
  })

  test('el pago rechazado lo dice, y ofrece actualizar el medio de pago', async ({ page }) => {
    await entrarAlPaso6(page, {}, { primerPago: primerPagoSondeo(['DECLINED']) })
    await confirmar(page)
    const exito = page.getByTestId('contratacion-exito')

    await expect(exito).toContainText('Pago rechazado')
    await expect(exito).toContainText('No pudimos cobrar tu tarjeta.')
    await expect(exito.getByRole('link', { name: 'Actualiza tu medio de pago' })).toBeVisible()
    await expect(page).toHaveTitle('Pago rechazado — Lumbre')

    // Y no se afirma lo contrario: un rechazo no es una aprobación a medias.
    await expect(exito).not.toContainText('Pago aprobado')
  })

  /**
   * El tramo pendiente de en medio, el único que necesita el intervalo real del
   * sondeo (2 s): con `PENDING` primero y `APPROVED` después, `sondear()` tiene
   * que preguntar dos veces y no una, y la pantalla tiene que reflejar las dos
   * respuestas en el orden en que llegaron.
   */
  test('mientras Wompi confirma con el banco, la pantalla pasa de «Confirmando» a «Pago aprobado»', async ({
    page,
  }) => {
    await entrarAlPaso6(page, {}, { primerPago: primerPagoSondeo(['PENDING', 'APPROVED']) })
    await confirmar(page)
    const exito = page.getByTestId('contratacion-exito')

    await expect(exito).toContainText('Confirmando tu pago')
    await expect(exito).toContainText('Estamos confirmando el pago con tu banco; te avisaremos.')
    await expect(page).toHaveTitle('Confirmando tu pago — Lumbre')

    // El segundo sondeo llega ~2 s después: el timeout de la aserción cubre esa
    // espera real, no un `waitForTimeout` a ciegas.
    await expect(exito).toContainText('Pago aprobado', { timeout: 6000 })
    await expect(page).toHaveTitle('Pago aprobado — Lumbre')
  })
})

test.describe('§5 caso 3 — el precio cambió mientras decidía', () => {
  test('el aviso aparece, se lleva el foco, y no se compra sin volver a aceptar', async ({
    page,
  }) => {
    // El importe que se vio: uno que el catálogo no va a devolver. Es lo que le
    // pasa a quien eligió antes de que se moviera la lista de precio.
    const captura = await entrarAlPaso6(page, { importeVistoMensual: 111_111 })
    const paso = page.getByTestId('paso-contratar')

    const aviso = page.getByRole('alert').filter({ hasText: 'El precio cambió' })
    await expect(aviso).toBeVisible()
    await expect(aviso).toBeFocused()

    // Las dos cifras, la de antes y la de ahora, para que la decisión se pueda
    // tomar sin salir de la pantalla. La de ahora se deriva del contenido: un
    // cambio de precio no debe poner en rojo un caso que va de otra cosa.
    await expect(aviso).toContainText(grupos.format(111_111))
    await expect(aviso).toContainText(grupos.format(vistoMensual(1, 1)))

    // La casilla está sin marcar. Es el estado con el que el usuario se
    // encuentra el aviso — no la prueba de una salvaguarda: cuando la deriva se
    // detecta, la casilla acaba de aparecer. Ver la cabecera del fichero.
    await expect(paso.getByRole('checkbox')).not.toBeChecked()

    // ESTA es la afirmación que sí tiene puerta: no hay atajo. Confirmar sin
    // aceptar los importes NUEVOS no pide ninguna oferta.
    // Con el teclado, y por lo mismo que en «sin aceptar los términos no
    // activa»: con la casilla sin marcar el botón está `aria-disabled` y
    // Playwright no lo pulsa, pero el usuario sí puede.
    const boton = paso.getByRole('button', { name: CONFIRMAR })
    await boton.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/dashboard\/contratar$/)
    expect(captura.llamadas).toBe(0)

    // Y la otra mitad, que sin ella lo de arriba lo cumpliría también una
    // pantalla rota: la deriva es un badén, no un muro. Quien lee las cifras
    // nuevas y las acepta, compra — y compra UNA vez.
    await confirmar(page)
    expect(captura.llamadas).toBe(1)
    expect(captura.cuerpo?.lines).toEqual([{ code: 'PACK_CLINIC', quantity: 1 }])
  })

  test('sin deriva no hay aviso: el caso feliz no paga el precio del raro', async ({ page }) => {
    await entrarAlPaso6(page)
    await expect(page.getByRole('alert').filter({ hasText: 'El precio cambió' })).toHaveCount(0)
  })
})

test.describe('§5 caso 2 — se perdió la intención', () => {
  test('no es un error del usuario, así que no se pinta como tal: hay selector', async ({
    page,
  }) => {
    await instalarSesion(page)
    await enrutarApi(
      page,
      {
        ...RUTAS_DEL_EMBUDO,
        '/companies/*': EMPRESA_RESPUESTA,
        '/subscriptions/current': suscripcionSegun('SIN_PLAN'),
      },
      { permisos: PERMISOS_CONTRATAR },
    )
    await page.goto('/dashboard/contratar')

    const paso = page.getByTestId('paso-contratar')

    // El subtítulo nombra PRIMERO el camino a medida y deja el paquete como
    // alternativa. Decía «Vamos a elegir el plan de tu clínica», y esa frase
    // daba por sentado que lo que se elige es un paquete — justo la unidad de
    // compra que el embudo dejó de usar cuando el texto libre pasó a ser lo
    // primero que se toca.
    await expect(paso).toContainText(
      'Cuéntanos qué necesitas y te lo armamos, o elige uno de nuestros paquetes.',
    )
    // Nada de banner rojo: quien perdió un borrador no cometió ningún fallo.
    await expect(paso.getByRole('alert')).toHaveCount(0)

    // Y esta es la TERCERA rama de `subtituloRecuperacion`, la de «no había
    // ninguna intención». Las otras dos —la propuesta perdida y la que el
    // servidor ya no devuelve— tienen su propio aviso, y aquí no se pinta
    // ninguno: sin esto, un `v-if` mal escrito enseñaría «tu propuesta se armó
    // en otro dispositivo» a quien nunca armó ninguna.
    await expect(paso.getByTestId('propuesta-perdida')).toHaveCount(0)
    await expect(paso.getByTestId('propuesta-no-disponible')).toHaveCount(0)

    // La salida a medida está también aquí: los tres subtítulos la ofrecen.
    await expect(paso.getByTestId('volver-planes')).toBeVisible()

    // Y el selector funciona: eligiendo aquí se llega al resumen.
    await paso.getByRole('button', { name: /^Continuar con / }).click()
    await expect(paso.getByRole('checkbox')).toBeVisible()
  })
})

/**
 * La frontera de permiso, como CASO y no como atrezo.
 *
 * Una clínica en mora queda en `READ_ONLY` y pierde `quote.request`, que solo se
 * siembra en nivel `FULL`. Sin esta comprobación el resultado sería el peor
 * posible: el botón más importante del embudo, pulsado, girando y devolviendo un
 * 403 sin explicación a alguien cuyo único problema es una factura pendiente.
 */
test.describe('Sin `quote.request` no hay paso vinculante', () => {
  test('el control está AUSENTE, no deshabilitado, y en su sitio hay una frase que explica', async ({
    page,
  }) => {
    await entrarAlPaso6(page, {}, { permisos: [] })
    const paso = page.getByTestId('paso-contratar')

    // El resumen sigue estando: se puede leer lo que costaría, que es
    // información legítima. Lo que no está es el clic vinculante.
    await expect(paso).toContainText(EMPRESA_NOMBRE)

    // AUSENTE. Un botón deshabilitado sin motivo visible se lee como un fallo de
    // la aplicación, y esta afirmación es justo la que se rompería si alguien
    // «arreglara» esto poniéndole un `:disabled`.
    await expect(paso.getByRole('button', { name: CONFIRMAR })).toHaveCount(0)
    await expect(paso.getByRole('checkbox')).toHaveCount(0)

    // Pedir que se acepten unos términos para después no dejar continuar es la
    // peor forma posible de comunicar una falta de permiso.
    await expect(paso.getByText('He leído y acepto los')).toHaveCount(0)

    // En su lugar, quién puede hacerlo y qué hacer, sin nombrar el código del
    // permiso, que al usuario no le dice nada.
    await expect(paso.getByText('Tu usuario no puede confirmar la contratación')).toBeVisible()
    await expect(paso.getByRole('link', { name: 'soporte@kefaro.tech' }).first()).toBeVisible()

    // `role="status"`, NUNCA `alert`: no ha fallado nada, es el estado de la
    // cuenta. Un `alert` corta la locución en curso para dar una noticia que no
    // es una noticia.
    await expect(paso.getByRole('alert')).toHaveCount(0)
    await expect(
      paso.locator('[role="status"]').filter({ hasText: 'no puede confirmar' }),
    ).toHaveCount(1)
  })

  test('«Ahora no» sigue estando: quien no puede contratar tiene que poder salir', async ({
    page,
  }) => {
    const captura = await entrarAlPaso6(page, {}, { permisos: [] })
    const paso = page.getByTestId('paso-contratar')

    await paso.getByRole('button', { name: 'Ahora no' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    // Y en todo el recorrido no salió ni una petición que el servidor fuera a
    // rechazar con un 403.
    expect(captura.llamadas, 'no se pide una oferta que el gate va a negar').toBe(0)
  })
})

test.describe('Recorrido de solo teclado', () => {
  /**
   * Va en dos tramos, y el corte no es una comodidad: entre el paso 4 y el 5 hay
   * un salto de verificación por CORREO (auto-registro Opción B del backend) que
   * ninguna prueba de navegador puede recorrer sin buzón. Los dos tramos sí son
   * continuos y sin ratón, que es lo que la especificación pide comprobar.
   */
  test('tramo público: del enlace de salto hasta elegir plan en /planes', async ({ page }) => {
    // Este tramo no pasa por `entrarAlPaso6`, así que se enruta aparte: la
    // portada pide los tres endpoints públicos al montar y sin ellos no pinta ni
    // una tarjeta, con lo que el fallo sería «no encuentro el enlace» en una
    // pantalla que sí montó.
    await enrutarEmbudoPublico(page)
    await page.goto('/')

    const salto = page.getByRole('link', { name: 'Saltar al contenido' })
    await tabularHasta(page, salto, { maximo: 2 })
    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()

    // Desde el contenido, atravesando el cotizador —que es lo primero que se
    // toca en el hero: las áreas plegables, el desplegable del relato, los dos
    // contadores y el envío—, hasta el CTA de la combinación recomendada. Cada
    // parada: visible,
    // sin perder el foco y sin retroceder en el documento, que es lo que
    // `tabularHasta` comprueba en cada tecla y lo que hace que este tramo valga.
    //
    // El CTA se acota por TARJETA y no por rótulo: las tres dicen «Marcar estos
    // módulos» a propósito —lo que las distingue es su `aria-describedby`— así
    // que localizar por nombre resolvería tres enlaces y fallaría con «strict
    // mode violation», que no señala a la causa.
    const cta = page
      .locator('#planes')
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { level: 3, name: 'Pack Clínica', exact: true }) })
      .getByRole('link')
    await tabularHasta(page, cta)
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/planes\?plan=PACK_CLINIC/)

    const continuar = page.getByRole('button', { name: 'Crear mi cuenta' })
    // El botón lleva `aria-disabled` y NO `disabled`, para seguir siendo
    // enfocable: pulsarlo antes de que llegue el catálogo es un clic que no hace
    // nada, y el fallo se leería como «no navegó».
    await expect(continuar).not.toHaveAttribute('aria-disabled', 'true')
    await tabularHasta(page, continuar)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/registro\?plan=PACK_CLINIC/)
  })

  test('tramo autenticado: del inicio del paso 6 hasta pagar con Wompi, todo con teclado', async ({
    page,
  }) => {
    const captura = await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    // El foco arranca en el `<h1>`, que es donde lo dejó la pantalla al montar.
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PASO6 })).toBeFocused()

    const casilla = paso.getByRole('checkbox')
    await tabularHasta(page, casilla)
    await page.keyboard.press('Space')
    await expect(casilla).toBeChecked()

    const boton = paso.getByRole('button', { name: CONFIRMAR })
    await tabularHasta(page, boton)
    await page.keyboard.press('Enter')

    // La oferta ya se pidió: sigue en el paso 6, con el bloque de pago servido.
    await expect(page).toHaveURL(/\/dashboard\/contratar$/)
    await expect(paso.getByRole('heading', { level: 2, name: 'Medio de pago' })).toBeVisible()
    expect(captura.llamadas, 'el teclado tiene que pedir la oferta igual que el ratón').toBe(1)

    // El resto del bloque de pago, también sin ratón: los campos se rellenan
    // directamente (lo que importa aquí es que el foco no se pierda al tabular
    // entre ellos, no la mecánica de tecleo carácter a carácter) y las dos
    // casillas y el envío sí pasan por `tabularHasta`.
    const numero = paso.getByRole('textbox', { name: 'Número de tarjeta' })
    await tabularHasta(page, numero)
    await numero.fill('4242 4242 4242 4242')
    await paso.getByRole('textbox', { name: 'Vencimiento (MM/AA)' }).fill('12/29')
    await paso.getByRole('textbox', { name: 'CVC' }).fill('123')
    await paso.getByRole('textbox', { name: 'Nombre del titular' }).fill('Prueba E2E')
    await paso
      .getByRole('textbox', { name: 'Correo de quien acepta y paga' })
      .fill('acepta.paga.e2e@example.com')

    const terminos = paso.getByRole('checkbox', { name: 'Acepto los' })
    await tabularHasta(page, terminos)
    await page.keyboard.press('Space')
    await expect(terminos).toBeChecked()

    const datos = paso.getByRole('checkbox', { name: 'Autorizo el tratamiento' })
    await tabularHasta(page, datos)
    await page.keyboard.press('Space')
    await expect(datos).toBeChecked()

    const pagar = paso.getByRole('button', { name: 'Guardar tarjeta y pagar' })
    await tabularHasta(page, pagar)
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/dashboard\/contratar\/exito$/)
  })
})

/**
 * El `<h1>` de `/planes`, que es a donde salen TODAS las salidas del paso 6.
 *
 * <p>Va en una constante y no repetido en los ocho casos que entran aquí porque
 * ocho literales es exactamente como se queda uno sin cambiar, que es el mismo
 * criterio de {@link TITULO_PASO6}.
 */
const TITULO_PLANES = 'Tu plan, con el precio exacto'

/**
 * LOS CUATRO «CAMBIAR» DEL PASO VINCULANTE, PULSADOS.
 *
 * <p>Estaban **fotografiados en la instantánea ARIA y no los pulsaba nadie**, y
 * eso no es una laguna cualquiera: durante meses apuntaron a una ruta que
 * devolvía al usuario al tablero **en silencio**. `/planes` era `guestOnly` a
 * secas y esta pantalla cuelga de `/dashboard`, así que quien la ve está
 * autenticado y el guard lo rebotaba sin decir una palabra. La instantánea
 * seguía verde todo ese tiempo, y no por descuido de quien la generó: una
 * instantánea de accesibilidad comprueba que el enlace EXISTE y tiene nombre
 * —las dos cosas eran ciertas— y no puede comprobar a dónde te deja al pulsarlo.
 *
 * <p>Son además la mitad de *corregir* de WCAG §3.3.4 Error Prevention (Legal,
 * Financial, Data): la vía «Confirmed» exige un mecanismo para revisar,
 * confirmar y **corregir** antes de finalizar. Un «Cambiar» que echa del embudo
 * no corrige nada; es el mecanismo de corrección roto, en la pantalla que decide
 * el dinero.
 *
 * <p>El control positivo de estos cuatro casos es el bloque siguiente: ahí se
 * demuestra que el guard SÍ sabe rebotar, con `CON_PLAN`. Sin eso, «no acabé en
 * el tablero» podría estar pasando porque el guard no llega a correr.
 */
test.describe('Los cuatro «Cambiar» — pulsados, no fotografiados', () => {
  const CAMBIAR = [
    'Cambiar el plan',
    'Cambiar el ciclo de pago',
    'Cambiar el número de sedes',
    'Cambiar el número de personas',
  ] as const

  for (const nombre of CAMBIAR) {
    test(`«${nombre}» deja al cliente en /planes con su selección puesta`, async ({ page }) => {
      await entrarAlPaso6(page)
      const paso = page.getByTestId('paso-contratar')

      // `exact: true` porque el nombre accesible se compone del «Cambiar»
      // visible más el resto en `.ds-sr-only`, y el emparejamiento por nombre de
      // rol es por subcadena: sin él, el día que alguien añada una quinta fila
      // que empiece igual, esto resolvería dos enlaces y fallaría con «strict
      // mode violation», que no señala a la causa.
      await paso.getByRole('link', { name: nombre, exact: true }).click()

      // LA AFIRMACIÓN QUE FALTABA. Si el guard vuelve a rebotar, esto dice
      // «esperaba /planes y estoy en /dashboard», que sí señala a la causa.
      await expect(page).toHaveURL(/\/planes\?plan=PACK_CLINIC&ciclo=MENSUAL&sedes=1&usuarios=1$/)

      // Y la pantalla llegó a PINTARSE, que es lo segundo que una instantánea
      // del origen no podía decir: una URL correcta sobre un árbol que no monta
      // es exactamente igual de inútil que un rebote.
      await expect(page.getByRole('heading', { level: 1, name: TITULO_PLANES })).toBeVisible()

      // Con la selección dentro: volver a elegir sin lo ya elegido obliga a
      // rehacer el trabajo, que es la otra forma de que «Cambiar» no corrija.
      await expect(page.getByRole('spinbutton', { name: /sedes/i })).toHaveValue('1')
      await expect(page.getByRole('spinbutton', { name: /personas|usuarios/i })).toHaveValue('1')
    })
  }

  /**
   * ⚠️ DESACTIVADO PORQUE DESCRIBE UN DEFECTO ABIERTO, no porque sea inestable.
   * https://github.com/kefaroTech/vetsoftware-public-web/issues/298
   *
   * <p>Lo que afirma es lo correcto y hoy NO se cumple: la vuelta descarta los
   * módulos marcados y siembra los del paquete recomendado, así que quien pulsa
   * «Cambiar» acaba comprando `PACK_CLINIC` a 189.000 en vez de núcleo + dos
   * módulos a 140.000. Medido: la intención vuelve con los cuatro códigos del
   * paquete en vez de los dos que se sembraron.
   *
   * <p>Se queda escrito y no se borra: es el criterio de cierre de #298 —quitarle
   * el `fixme` es la comprobación— y es la otra mitad de §3.3.4 «corregir», la que
   * la rama del paquete no puede cubrir porque allí la consulta sí lleva código.
   */
  test.fixme('«Cambiar» desde una selección MODULAR vuelve con los módulos que se eligieron', async ({
    page,
  }) => {
    const modulos = ['SCHEDULING', 'CASH_REGISTER']
    await entrarAlPaso6(
      page,
      intencionDeModulos(
        modulos,
        subtotalDeSeleccion({ modulos, sedes: 1, usuarios: 1 }, 'MENSUAL'),
      ),
    )

    await page
      .getByTestId('paso-contratar')
      .getByRole('link', { name: 'Cambiar el número de sedes', exact: true })
      .click()
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PLANES })).toBeVisible()

    // Se afirma sobre la intención y no sobre las casillas: lo que se guarda es
    // exactamente lo que va a viajar en la oferta del paso vinculante, así que
    // una casilla bien pintada sobre una intención mal guardada seguiría siendo
    // una compra distinta de la que el prospecto ve.
    const continuar = page.getByRole('button', { name: 'Ir a confirmar' })
    await expect(continuar).not.toHaveAttribute('aria-disabled', 'true')
    await continuar.click()
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PASO6 })).toBeVisible()

    const guardada = await leerIntencion(page)
    expect(
      exigir(guardada, 'guardada').modulos.slice().sort(),
      'volver a corregir no puede cambiar lo que se compra',
    ).toEqual([...modulos].sort())
  })
})

/**
 * EL RODEO DECLARADO DEL GUARD: `guestOnly` + `allowClientWithoutPlan`.
 *
 * <p>Tres ramas, y las tres tienen que probarse **porque un guardián que deja
 * pasar a todo el mundo también «funciona» si solo se prueba la rama que pasa**.
 * La de `CON_PLAN` es además el control positivo de las otras dos: demuestra que
 * este mismo guard sabe rebotar, así que cuando `SIN_PLAN` y `DESCONOCIDO` no
 * rebotan es porque se decidió, y no porque nadie esté mirando.
 */
test.describe('/planes con sesión — las tres ramas del guard', () => {
  async function irAPlanes(page: Page, estado: EstadoDelPlan, consulta = ''): Promise<Captura> {
    const captura: Captura = { cuerpo: null, llamadas: 0, paymentSource: null, accept: null }
    await instalarSesion(page)
    await enrutarApi(
      page,
      {
        // `/planes` pide los tres al montar y sin ellos no pinta ni una casilla:
        // el fallo sería un banner de error que no tiene nada que ver con lo que
        // estos casos comprueban, y no señalaría a la causa.
        ...RUTAS_DEL_EMBUDO,
        '/companies/*': EMPRESA_RESPUESTA,
        '/subscriptions/current': suscripcionSegun(estado),
        '/quotes/self-serve': (route: Route) => {
          captura.llamadas += 1
          captura.cuerpo = route.request().postDataJSON() as CuerpoEnviado
          return responderJson(route, OFERTA, 201)
        },
        // El único caso de este bloque que llega a pagar («el cliente sin plan
        // elige un paquete aquí y CONTRATA») entra al paso 6 desde aquí, así que
        // necesita el mismo bloque de pago que `entrarAlPaso6`.
        ...rutasPagoWompi({
          onPaymentSource: (cuerpo) => {
            captura.paymentSource = cuerpo
          },
          onAccept: (cuerpo) => {
            captura.accept = cuerpo
          },
        }),
      },
      { permisos: PERMISOS_CONTRATAR },
    )
    await page.route(`${WOMPI_SANDBOX_URL}/tokens/cards`, (route: Route) =>
      responderJson(route, TOKEN_TARJETA_WOMPI),
    )
    await page.goto(`/planes${consulta}`)
    return captura
  }

  test('SIN_PLAN entra: es el caso que este rodeo existe para arreglar', async ({ page }) => {
    await irAPlanes(page, 'SIN_PLAN')

    await expect(page).toHaveURL(/\/planes$/)
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PLANES })).toBeVisible()

    // Y la pantalla reconoce que quien la mira tiene sesión: ofrecerle «¿Ya
    // tienes cuenta? Inicia sesión» sería falso, y sin este enlace su única
    // vuelta al tablero sería el botón «atrás» del navegador — `PublicLayout` no
    // trae la navegación de la aplicación.
    await expect(page.getByRole('link', { name: 'Volver a mi tablero' })).toBeVisible()
  })

  test('un contrato de alta (`origin: INITIAL`) entra igual que SIN_PLAN', async ({ page }) => {
    // El alta firma un contrato mínimo vigente por `status`, pero sin plan contratado. Si el
    // guard mirara solo `planVigente` esto rebotaría al tablero como `CON_PLAN`, y ninguna
    // empresa recién dada de alta podría contratar su primer plan real.
    await instalarSesion(page)
    await enrutarApi(
      page,
      {
        ...RUTAS_DEL_EMBUDO,
        '/companies/*': EMPRESA_RESPUESTA,
        '/subscriptions/current': (route: Route) => responderJson(route, CONTRATO_INICIAL),
      },
      { permisos: PERMISOS_CONTRATAR },
    )
    await page.goto('/planes')

    await expect(page).toHaveURL(/\/planes$/)
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PLANES })).toBeVisible()
  })

  test('CON_PLAN rebota al tablero, y lo DICE', async ({ page }) => {
    await irAPlanes(page, 'CON_PLAN')

    await expect(page).toHaveURL(/\/dashboard$/)

    // El silencio era la mitad del defecto: el usuario pulsaba y aterrizaba en
    // otro sitio sin ninguna explicación, así que volvía a pulsar. El aviso va
    // como `info` —no ha fallado nada— y nombra la pantalla donde SÍ puede ver
    // su plan, que solo es una promesa cierta porque `CON_PLAN` implica que la
    // lectura respondió OK y por tanto el rol tiene `subscription.read`.
    const aviso = page.getByRole('status').filter({ hasText: 'Tu clínica ya tiene un plan activo' })
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText('Puedes verlo en «Mi suscripción».')

    // Y no se coló ni un trozo del escaparate.
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PLANES })).toHaveCount(0)
  })

  test('DESCONOCIDO entra: un 403 del rol NO es «no tiene plan»', async ({ page }) => {
    await irAPlanes(page, 'DESCONOCIDO')

    // Es la tercera rama, deliberada: echar de aquí a quien quizá no tiene plan
    // por un dato que no podemos leer es peor que dejarle pasar. Que el caso de
    // arriba SÍ rebote es lo que demuestra que esto no es el guard sin ejecutar.
    await expect(page).toHaveURL(/\/planes$/)
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PLANES })).toBeVisible()

    // Y sin el aviso del caso anterior: no se afirma lo que no se sabe.
    await expect(
      page.getByRole('status').filter({ hasText: 'Tu clínica ya tiene un plan activo' }),
    ).toHaveCount(0)
  })

  test('el cliente sin plan elige un paquete aquí y CONTRATA, sin pasar por el registro', async ({
    page,
  }) => {
    // El embudo entero del cliente a medio camino, en un solo caso: el guard le
    // deja entrar, `destinoTrasElegir` le manda al paso vinculante en vez de a
    // `signup` —que es `guestOnly` y le habría devuelto al tablero, el mismo
    // callejón movido un paso más adelante— y el paso vinculante acepta.
    const captura = await irAPlanes(
      page,
      'SIN_PLAN',
      '?plan=PACK_CLINIC&ciclo=MENSUAL&sedes=1&usuarios=1',
    )

    // Con sesión el botón nombra el paso vinculante, no el alta: ya tiene cuenta.
    const continuar = page.getByRole('button', { name: 'Ir a confirmar' })
    await expect(continuar).not.toHaveAttribute('aria-disabled', 'true')
    await continuar.click()

    // NO a `/registro`: ya tiene cuenta. Esta es la afirmación que separa el
    // arreglo completo de una versión que solo hubiera tocado el guard.
    await expect(page).toHaveURL(/\/dashboard\/contratar$/)
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PASO6 })).toBeVisible()

    await confirmar(page)
    expect(captura.llamadas, 'el camino del cliente autenticado tiene que pedir la oferta').toBe(1)
    expect(captura.cuerpo?.lines).toEqual([{ code: CLINICA.code, quantity: 1 }])
  })
})

/**
 * §5, CASO 2b — LA PROPUESTA A MEDIDA QUE NO SE PUEDE PINTAR.
 *
 * <p>No aparecía en ninguna spec, y es donde vivía el aviso que **prometía una
 * salida imposible**: «puedes volver a contárnoslo desde este equipo» encima de
 * una pantalla que no tenía ningún enlace a `/planes`, y que aunque lo hubiera
 * tenido habría rebotado al tablero por el mismo guard del bloque de arriba.
 *
 * <p>Son DOS ramas y no una porque las salidas del usuario son distintas:
 * `PERDIDA` se arregla volviendo a armarla en este dispositivo —la propuesta
 * sigue viva en el servidor, lo que falta es la credencial local—, y
 * `NO_DISPONIBLE` no, porque el servidor ya no la devuelve. Cada caso comprueba
 * que la OTRA no se pinta: colapsarlas mandaría a la mitad de la gente a repetir
 * un camino que no lleva a ningún sitio.
 */
test.describe('§5 caso 2b — la propuesta a medida que no se puede pintar', () => {
  /** Lo que hay hoy en el espejo de la intención, sin fingir que trae `planCode`. */
  async function intencionCruda(page: Page): Promise<{ descartada: boolean } | null> {
    const crudo = await page.evaluate(
      (clave) => window.localStorage.getItem(clave),
      CLAVE_INTENCION,
    )
    return crudo ? (JSON.parse(crudo) as { descartada: boolean }) : null
  }

  /**
   * Entra al paso 6 con una intención de PROPUESTA que el servidor no va a
   * devolver, y cuenta cuántas veces se le preguntó. Esa cuenta es la mitad de
   * cada uno de los dos casos: es lo que separa «la guarda local cortó antes de
   * la red» de «nadie está mirando».
   */
  async function entrarConPropuesta(
    page: Page,
    { conSesion }: { conSesion: boolean },
  ): Promise<{ llamadas: number }> {
    const asistente = { llamadas: 0 }

    await instalarSesion(page)
    await sembrarIntencionDePropuesta(page, intencionDePropuesta())
    if (conSesion) await sembrarSesionDelAsistente(page, { id: ID_PROPUESTA })

    await enrutarApi(
      page,
      {
        ...RUTAS_DEL_EMBUDO,
        '/companies/*': EMPRESA_RESPUESTA,
        '/subscriptions/current': suscripcionSegun('SIN_PLAN'),
        // 404: «no existe» y «caducó» colapsados a propósito por el servidor,
        // para no ser un oráculo de tokens.
        '/assistant/proposal*': (route: Route) => {
          asistente.llamadas += 1
          return noEncontrado(route)
        },
      },
      { permisos: PERMISOS_CONTRATAR },
    )
    await page.goto('/dashboard/contratar')
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PASO6 })).toBeVisible()

    return asistente
  }

  test('PERDIDA: sin el token en este equipo no se pregunta al servidor, y la salida existe de verdad', async ({
    page,
  }) => {
    const asistente = await entrarConPropuesta(page, { conSesion: false })
    const paso = page.getByTestId('paso-contratar')

    const aviso = paso.getByTestId('propuesta-perdida')
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText('se armó en otro dispositivo o navegador')

    // `status` y no `alert`: el usuario no cometió ningún fallo y el sistema no
    // se rompió. Un banner rojo aquí es la forma más rápida de que se vaya.
    await expect(aviso).toHaveAttribute('role', 'status')
    await expect(paso.getByRole('alert')).toHaveCount(0)

    // Y NO la otra rama. Las dos frases prometen cosas distintas, así que
    // pintarlas indistintamente sería peor que no pintar ninguna.
    await expect(paso.getByTestId('propuesta-no-disponible')).toHaveCount(0)

    // La pregunta es LOCAL y va antes del viaje: sin token no hay petición que
    // hacer. El control positivo de este cero es el caso siguiente, donde con
    // token la cuenta vale 1 — «no llamó» y «no lo compruebo» dan el mismo verde.
    expect(asistente.llamadas, 'se preguntó por una propuesta sin tener con qué').toBe(0)

    // ── LO QUE HASTA HOY ERA UNA PROMESA IMPOSIBLE ──────────────────────────
    // El subtítulo ofrece volver a contarlo, y hasta ahora eso no se podía hacer
    // ni tecleando la URL: `/planes` era `guestOnly` y esta pantalla exige
    // sesión, así que el guard devolvía al tablero en silencio. El enlace existe
    // y FUNCIONA — y pulsarlo es la única forma de saberlo.
    await expect(paso).toContainText('Puedes volver a contarnos qué necesitas desde este equipo')
    await paso.getByTestId('volver-planes').click()
    await expect(page).toHaveURL(/\/planes$/)
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PLANES })).toBeVisible()
  })

  test('NO_DISPONIBLE: el servidor ya no la devuelve, y la intención NO se descarta', async ({
    page,
  }) => {
    const asistente = await entrarConPropuesta(page, { conSesion: true })
    const paso = page.getByTestId('paso-contratar')

    const aviso = paso.getByTestId('propuesta-no-disponible')
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText('ya no está disponible')
    await expect(aviso).toHaveAttribute('role', 'status')
    await expect(paso.getByRole('alert')).toHaveCount(0)
    await expect(paso.getByTestId('propuesta-perdida')).toHaveCount(0)

    // El CONTROL POSITIVO del cero del caso anterior: con el token en el equipo
    // sí se sale a la red, exactamente una vez.
    expect(asistente.llamadas, 'con token en el equipo tiene que preguntarse').toBe(1)

    // Esta rama no promete recuperar LA propuesta perdida, así que ofrece la
    // salida que sí existe: escribir a soporte.
    await expect(aviso.getByRole('link', { name: 'soporte@kefaro.tech' })).toBeVisible()

    // Y la intención sigue viva. Descartarla apagaría además el enganche del
    // login para siempre: el prospecto no ha renunciado a nada, solo ha caducado
    // una propuesta.
    const guardada = await intencionCruda(page)
    expect(guardada, 'una propuesta caducada no borra la intención').not.toBeNull()
    expect(guardada?.descartada, 'no renunció a nada: no se descarta').toBe(false)

    // La misma salida real que la otra rama: armar una nueva sí se puede siempre.
    await paso.getByTestId('volver-planes').click()
    await expect(page).toHaveURL(/\/planes$/)
    await expect(page.getByRole('heading', { level: 1, name: TITULO_PLANES })).toBeVisible()
  })
})

/**
 * EL BLOQUE DE PAGO — a quién le llega la tarjeta, y a quién no.
 *
 * <p>`MedioDePagoWompi.vue` tokeniza DIRECTO contra Wompi con una instancia de
 * axios propia: a nuestro backend solo tienen que llegar un `cardToken` y los
 * cuatro campos no sensibles de la tarjeta (marca, últimos cuatro, vencimiento).
 * Este bloque es la prueba de esa frontera, no una prueba de unidad de
 * `tokenizarTarjeta` —ya cubierta en `tests/unit/tokenizar-tarjeta.spec.ts`—: lo
 * que se afirma aquí es que la PANTALLA, con la tarjeta que un usuario
 * escribiría, no deja escapar el número ni el CVC por ningún sitio observable
 * desde fuera del componente: ni el cable hacia nuestro API, ni el
 * almacenamiento del navegador.
 */
test.describe('El bloque de pago — la tarjeta y el CVC solo llegan a Wompi', () => {
  test('tokeniza con la llave pública de Wompi, nunca con el JWT del tenant, y no deja rastro en nuestro API ni en el almacenamiento', async ({
    page,
  }) => {
    const autorizacionRecibida: string[] = []
    const captura = await entrarAlPaso6(
      page,
      {},
      {
        tokenizar: (route: Route) => {
          autorizacionRecibida.push(route.request().headers()['authorization'] ?? '')
          return responderJson(route, TOKEN_TARJETA_WOMPI)
        },
      },
    )
    await confirmar(page)

    // La credencial que salió hacia Wompi es SU llave pública — nunca la sesión
    // del tenant. Si `tokenizarTarjeta` usara por error el cliente `http` del
    // repo en vez de su propia instancia de axios, aquí llegaría el JWT
    // simulado en su lugar.
    expect(autorizacionRecibida).toEqual([`Bearer ${CHECKOUT_CONFIG.publicKey}`])

    const NUMERO_SIN_ESPACIOS = '4242424242424242'
    const NUMERO_CON_ESPACIOS = '4242 4242 4242 4242'

    // Lo que SÍ le llega a nuestro API: nunca el número completo ni el CVC como
    // valor propio, en ninguno de los dos cuerpos que sí viajan al backend.
    for (const cuerpo of [captura.paymentSource, captura.accept]) {
      const crudo = JSON.stringify(cuerpo ?? {})
      expect(crudo).not.toContain(NUMERO_SIN_ESPACIOS)
      expect(crudo).not.toContain(NUMERO_CON_ESPACIOS)
      expect(crudo, 'el CVC no es un campo del contrato: no puede viajar como valor').not.toContain(
        '"123"',
      )
    }
    expect(captura.paymentSource?.lastFour).toBe('4242')

    // Y tampoco sobrevive en el navegador: ni el store de auth ni el espejo de
    // la intención guardan nada de la tarjeta, así que una recarga a medio pagar
    // no puede filtrarla desde `localStorage` ni desde `sessionStorage`.
    const almacenamiento = await page.evaluate(() => ({
      local: { ...window.localStorage },
      session: { ...window.sessionStorage },
    }))
    const crudoAlmacenamiento = JSON.stringify(almacenamiento)
    expect(crudoAlmacenamiento).not.toContain(NUMERO_SIN_ESPACIOS)
    expect(crudoAlmacenamiento).not.toContain(NUMERO_CON_ESPACIOS)
    expect(crudoAlmacenamiento).not.toContain('"123"')
  })
})

/**
 * CUANDO YA HAY UN MEDIO DE PAGO ACTIVO — se salta la tokenización entera.
 *
 * Es la rama de `medioPorDefecto` en `MedioDePagoWompi.vue`: con un medio WOMPI
 * `ACTIVE` y `defaultMethod`, el bloque ofrece pagar con él directamente y ni
 * siquiera pinta el formulario de tarjeta nueva. `lastFour` es el de
 * {@link MEDIO_GUARDADO} (1234) y no el de la tarjeta de prueba que usa el resto
 * de la spec (4242): si algo tokenizara por error, el número que aparece en
 * pantalla lo delataría.
 */
test.describe('Con un medio de pago ya guardado, se paga sin tokenizar nada', () => {
  test('ofrece pagar con la tarjeta guardada y no llama a tokens/cards', async ({ page }) => {
    const llamadasTokenize: number[] = []
    const captura = await entrarAlPaso6(
      page,
      {},
      {
        mediosGuardados: [MEDIO_GUARDADO],
        tokenizar: (route: Route) => {
          llamadasTokenize.push(1)
          return responderJson(route, TOKEN_TARJETA_WOMPI)
        },
      },
    )
    const paso = page.getByTestId('paso-contratar')
    await paso.getByRole('checkbox').check()
    await paso.getByRole('button', { name: CONFIRMAR }).click()

    const boton = paso.getByRole('button', { name: 'Pagar con la tarjeta terminada en 1234' })
    await expect(boton).toBeVisible()
    // Y el formulario de tarjeta nueva ni se pinta: no hay nada que rellenar.
    await expect(paso.getByRole('textbox', { name: 'Número de tarjeta' })).toHaveCount(0)

    await pagarConMedioGuardado(page)

    await expect(page).toHaveURL(/\/dashboard\/contratar\/exito$/)
    expect(
      llamadasTokenize,
      'con un medio activo por defecto no hace falta tokenizar nada',
    ).toHaveLength(0)
    expect(captura.paymentSource, 'el medio ya existe: no se registra uno nuevo').toBeNull()
    expect(captura.accept?.acceptedByEmail).toBe('acepta.paga.e2e@example.com')

    const exito = page.getByTestId('contratacion-exito')
    await expect(exito).toContainText('Pago aprobado')
  })
})
