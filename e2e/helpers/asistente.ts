import type { Page, Route } from '@playwright/test'
import type {
  AssistantProposalLineResponse,
  AssistantProposalResponse,
} from '../../src/features/asistente/types/asistente.types'
import type { PublicCatalogResponse } from '../../src/features/asistente/types/catalogo.types'
import { PLANS_CONTENT } from '../../src/features/landing/content/plans.content'
import { cotizadorDe } from './catalogo'
import { CLAVE_INTENCION } from './contratacion'
import { responderJson } from './sesion'

/**
 * El embudo de la propuesta del asistente, simulado en la frontera HTTP.
 *
 * ── Por qué se simula, y qué se sigue ejercitando de verdad ────────────────
 * El prospecto de este embudo es ANÓNIMO: sin cuenta, sin sesión y sin empresa.
 * Lo único que hace falta para recorrerlo entero es que alguien conteste cinco
 * endpoints públicos, así que se contestan aquí y el caso corre en cualquier
 * máquina sin backend, sin base de datos y sin credenciales. Lo que se ejercita
 * sigue siendo la aplicación real —router, guardas, stores, seam, componentes—;
 * lo único sustituido es la respuesta del servidor.
 *
 * <p>Y hay un motivo más fuerte que la comodidad: **hoy no hay acceso al
 * modelo**, así que contra un backend real el único desenlace observable sería
 * el determinista. Simular la frontera es la única forma de cubrir a la vez el
 * camino con modelo (`PROPOSAL`) y el que corre hoy (`DETERMINISTIC`), y de
 * cubrir el 404 del enlace caducado sin esperar a que un token expire de verdad.
 *
 * ── Lo que esto NO puede detectar, y hay que decirlo ───────────────────────
 * Un cambio de forma en el contrato del backend. Los cuerpos de aquí se escriben
 * contra los tipos de `src/features/asistente/types/`, así que un campo
 * renombrado por el backend rompería `api:check` y `MatchesContract` —no esto—.
 * Lo que sí se detecta es que este front deje de leer bien lo que ya recibe: los
 * cuerpos están TIPADOS con los tipos de producción, de modo que un campo que
 * desaparezca del tipo pone rojo el compilador, no el navegador.
 */

/** Prefijo de la API. `createApiBaseUrl` produce `<origen>/api/v1`. */
const API = '**/api/v1'

/** La forma exacta que exige `useRecuperarPropuesta` antes de salir a la red. */
const FORMA_TOKEN = /^[A-Za-z0-9_-]{43}$/

/**
 * Un token de prueba de 43 caracteres, comprobado al construirlo.
 *
 * <p>Se rellena hasta la longitud exacta en vez de escribirse a mano: un token
 * de 42 caracteres se lee igual que uno de 43 en el código fuente, y el front lo
 * descartaría antes de la red — el caso pasaría a probar la rama equivocada sin
 * decir una palabra. Si el nombre no cabe, esto revienta al importar el módulo.
 */
function tokenDePrueba(nombre: string): string {
  const token = nombre.padEnd(43, '0')
  if (!FORMA_TOKEN.test(token)) {
    throw new Error(
      `«${nombre}» no sirve como token de prueba: da ${token.length} caracteres y hacen falta 43.`,
    )
  }
  return token
}

/** El enlace del correo que SÍ tiene propuesta detrás. */
export const TOKEN_VIVO = tokenDePrueba('E2E_TOKEN_PROPUESTA_VIVA_')

/** Un token bien formado que el servidor no conoce. 404, igual que uno caducado. */
export const TOKEN_DESCONOCIDO = tokenDePrueba('E2E_TOKEN_PROPUESTA_INEXISTENTE_')

/**
 * Un token que ni siquiera tiene la forma. No debe salir a la red.
 *
 * <p>No es un caso rebuscado: es lo que produce un correo cortado por el cliente
 * de correo, o un copiado a medias desde la barra.
 */
export const TOKEN_MAL_FORMADO = 'E2E-token-cortado'

/** Los códigos del carrito de prueba. Nombres reconocibles como datos de prueba. */
export const CODIGO_NUCLEO = 'CORE'
export const CODIGO_AGENDA = 'AGENDA'
export const CODIGO_USUARIOS_EXTRA = 'EXTRA_USER'
export const CODIGO_RECOMENDADO = 'LAB'

/**
 * El motivo escrito «por el modelo».
 *
 * <p>Se exporta porque dos casos lo usan en direcciones opuestas: en el camino
 * con modelo tiene que VERSE, y en el determinista tiene que NO verse aunque el
 * servidor lo mande —`origenDe` solo rotula `IA` cuando `presentation` es
 * `PROPOSAL`, y `PropuestaLinea` solo pinta el motivo de las líneas `IA`—.
 */
export const MOTIVO_AGENDA = 'Lo pediste para no llevar las citas en papel (dato de prueba E2E).'

function linea(
  over: Partial<AssistantProposalLineResponse> & { code: string },
): AssistantProposalLineResponse {
  return {
    name: over.code,
    description: null,
    kind: 'MODULE',
    quantity: 1,
    unitAmount: 0,
    taxRate: null,
    taxAmount: null,
    totalAmount: null,
    trialDays: null,
    currency: 'COP',
    reason: null,
    ...over,
  }
}

/**
 * El núcleo. Con prueba, para que el primer mes no sea el total.
 *
 * <p>`totalAmount` va DISTINTO de `unitAmount` a propósito en las tres líneas:
 * es el precio con impuesto, y la tabla tiene que pintar el unitario. Si los dos
 * valieran lo mismo, cambiar `comoLinea` para leer `totalAmount` no rompería
 * nada y la prueba no diría nada sobre la decisión que este seam documenta.
 */
export const LINEA_NUCLEO = linea({
  code: CODIGO_NUCLEO,
  name: 'Núcleo E2E de prueba',
  kind: 'MODULE',
  quantity: 1,
  unitAmount: 89000,
  totalAmount: 105910,
  trialDays: 14,
})

export const LINEA_AGENDA = linea({
  code: CODIGO_AGENDA,
  name: 'Agenda E2E de prueba',
  kind: 'MODULE',
  quantity: 1,
  unitAmount: 39000,
  totalAmount: 46410,
  trialDays: 14,
  reason: MOTIVO_AGENDA,
})

/**
 * Cuatro personas de más, a 12.000 la unidad.
 *
 * <p>Es la línea que sostiene el caso de las cantidades: `unitAmount` es el
 * precio de UNA, así que sin el «× 4» en pantalla el lector ve 12.000 donde el
 * subtotal cuenta 48.000. Una mutación que dejara la cantidad en 1 —o que
 * descontara lo incluido— es exactamente la que pasaba desapercibida.
 */
export const LINEA_USUARIOS_EXTRA = linea({
  code: CODIGO_USUARIOS_EXTRA,
  name: 'Usuarios adicionales E2E',
  kind: 'CAPACITY',
  quantity: 4,
  unitAmount: 12000,
  totalAmount: 14280,
  trialDays: 0,
})

export const LINEA_RECOMENDADA = linea({
  code: CODIGO_RECOMENDADO,
  name: 'Laboratorio E2E de prueba',
  kind: 'MODULE',
  quantity: 1,
  unitAmount: 29000,
  totalAmount: 34510,
  trialDays: 14,
  reason: 'Dijiste que haces exámenes en casa (dato de prueba E2E).',
})

/**
 * Los importes del carrito completo. **Los pone el servidor y este front no los
 * recalcula**, así que aquí se escriben a mano y cuadran entre sí:
 * 89.000 + 39.000 + 4 × 12.000 = 176.000, con 19 % de impuesto.
 *
 * <p>`firstPeriodTotal` = 48.000: núcleo y agenda van de prueba, las cuatro
 * personas no.
 */
export const SUBTOTAL_COMPLETO = 176000
export const IMPUESTO_COMPLETO = 33440
export const TOTAL_COMPLETO = 209440
export const PRIMER_MES_COMPLETO = 48000

/** Sin las cuatro personas: 89.000 + 39.000, y el primer mes cae a CERO. */
export const SUBTOTAL_SIN_CAPACIDAD = 128000
export const IMPUESTO_SIN_CAPACIDAD = 24320
export const TOTAL_SIN_CAPACIDAD = 152320

/** Con el recomendado dentro: 176.000 + 29.000. */
export const SUBTOTAL_CON_RECOMENDADO = 205000
export const IMPUESTO_CON_RECOMENDADO = 38950
export const TOTAL_CON_RECOMENDADO = 243950

/** La versión que trae la propuesta recién recuperada. Viaja en cada escritura. */
export const VERSION_INICIAL = 3

function propuesta(over: Partial<AssistantProposalResponse> = {}): AssistantProposalResponse {
  return {
    token: TOKEN_VIVO,
    presentation: 'PROPOSAL',
    // Fecha FIJA y lejana, nunca derivada de hoy: este campo no se pinta en
    // ninguna pantalla, así que anclarlo al reloj solo añadiría una forma de que
    // la prueba se pusiera roja sola un martes cualquiera.
    expiresAt: '2099-01-01T00:00:00Z',
    version: VERSION_INICIAL,
    lines: [LINEA_NUCLEO, LINEA_AGENDA, LINEA_USUARIOS_EXTRA],
    recommendations: [LINEA_RECOMENDADA],
    discardedLines: 0,
    currency: 'COP',
    subtotal: SUBTOTAL_COMPLETO,
    taxes: IMPUESTO_COMPLETO,
    total: TOTAL_COMPLETO,
    firstPeriodTotal: PRIMER_MES_COMPLETO,
    packOffer: null,
    refinementsLeft: 3,
    recalculated: true,
    ...over,
  }
}

/** La propuesta completa que devuelve el enlace del correo. */
export function propuestaViva(over: Partial<AssistantProposalResponse> = {}) {
  return propuesta(over)
}

/** La misma, sin la línea de capacidad y con el primer mes a cero. */
export function propuestaSinCapacidad() {
  return propuesta({
    version: VERSION_INICIAL + 1,
    lines: [LINEA_NUCLEO, LINEA_AGENDA],
    subtotal: SUBTOTAL_SIN_CAPACIDAD,
    taxes: IMPUESTO_SIN_CAPACIDAD,
    total: TOTAL_SIN_CAPACIDAD,
    // CERO, y no `null`: todo lo que queda está de prueba. Son dos afirmaciones
    // distintas y la pantalla tiene que distinguirlas.
    firstPeriodTotal: 0,
  })
}

/** La completa más el recomendado, ya dentro del carrito. */
export function propuestaConRecomendado() {
  return propuesta({
    version: VERSION_INICIAL + 1,
    lines: [LINEA_NUCLEO, LINEA_AGENDA, LINEA_USUARIOS_EXTRA, LINEA_RECOMENDADA],
    recommendations: [],
    subtotal: SUBTOTAL_CON_RECOMENDADO,
    taxes: IMPUESTO_CON_RECOMENDADO,
    total: TOTAL_CON_RECOMENDADO,
  })
}

/**
 * El camino que corre HOY: sin acceso al modelo, el servidor devuelve el carrito
 * determinista.
 *
 * <p>Lleva `reason` en la agenda **a propósito**, aunque el modelo no haya
 * escrito nada: es el control de que la pantalla no rotula como sugerencia lo
 * que el servidor no llamó sugerencia. Con `presentation: 'DETERMINISTIC'` esas
 * líneas son `BASE`, y una línea `BASE` no pinta motivo.
 */
export function propuestaDeterminista() {
  return propuesta({
    presentation: 'DETERMINISTIC',
    version: 1,
    lines: [LINEA_NUCLEO, LINEA_AGENDA],
    recommendations: [],
    subtotal: SUBTOTAL_SIN_CAPACIDAD,
    taxes: IMPUESTO_SIN_CAPACIDAD,
    total: TOTAL_SIN_CAPACIDAD,
    firstPeriodTotal: 0,
  })
}

/**
 * Un catálogo público mínimo pero VÁLIDO.
 *
 * <p>`/planes` lo pide al montar y su ausencia pinta un banner de error que no
 * tiene nada que ver con lo que estos casos comprueban. Se sirve con dos módulos
 * y un eje para que el bloque manual exista sin robar protagonismo.
 */
export const CATALOGO: PublicCatalogResponse = {
  currency: 'COP',
  priceValidFrom: '2026-01-01',
  modules: [
    {
      code: CODIGO_NUCLEO,
      name: 'Núcleo E2E de prueba',
      description: 'El mínimo estructural de toda cuenta.',
      mandatory: true,
      trialDays: 14,
      monthlyAmount: 89000,
      annualAmount: 890000,
      setupAmount: null,
      taxRate: null,
      taxTreatment: null,
      selfServiceEligible: true,
      areaCode: null,
      shortLabel: 'Núcleo',
    },
    {
      code: CODIGO_AGENDA,
      name: 'Agenda E2E de prueba',
      description: 'Citas y recordatorios.',
      mandatory: false,
      trialDays: 14,
      monthlyAmount: 39000,
      annualAmount: 390000,
      setupAmount: null,
      taxRate: null,
      taxTreatment: null,
      selfServiceEligible: true,
      areaCode: 'PATIENT_CARE',
      shortLabel: 'Agenda de citas',
    },
    {
      code: CODIGO_RECOMENDADO,
      name: 'Laboratorio E2E de prueba',
      description: 'Exámenes en casa.',
      mandatory: false,
      trialDays: 14,
      monthlyAmount: 29000,
      annualAmount: 290000,
      setupAmount: null,
      taxRate: null,
      taxTreatment: null,
      selfServiceEligible: true,
      areaCode: 'HOSPITAL',
      shortLabel: 'Laboratorio',
    },
  ],
  capacities: [
    {
      code: CODIGO_USUARIOS_EXTRA,
      name: 'Usuarios adicionales E2E',
      description: 'Personas de más sobre lo incluido.',
      mandatory: false,
      unit: 'USER',
      monthlyIncludedQuantity: 1,
      annualIncludedQuantity: 1,
      monthlyUnitAmount: 12000,
      annualUnitAmount: 120000,
      taxRate: null,
      taxTreatment: null,
      selfServiceEligible: false,
    },
  ],
  oneTimeItems: [],
  packs: [],
  requirements: [],
  areas: [
    { code: 'PATIENT_CARE', name: 'Atención a los pacientes' },
    { code: 'HOSPITAL', name: 'Hospital y quirófano' },
  ],
}

/** Clave del espejo de sesiones del seam. Ver `constants/storageKeys.ts`. */
export const CLAVE_SESIONES_ASISTENTE = 'vs.asistente.propuestas.v1'

/** El identificador opaco que `registrar()` asigna a la primera propuesta. */
export const ID_PROPUESTA = 'p-1'

/**
 * Siembra el espejo de `asistente.source.ts`: `{ id opaco → token }`.
 *
 * <p>La clave va literal porque `constants/storageKeys.ts` importa por alias
 * `@/…` y Playwright no lo resuelve — el mismo motivo, escrito en el mismo sitio,
 * que `helpers/contratacion.ts`. La atadura entre este literal y la constante
 * real la pone `tests/unit/`, que afirma el valor exacto.
 *
 * <p>Sin esto, `conocePropuesta()` devuelve `false` y la banda de continuación
 * de la landing NO se pinta: es la guarda que impide prometer «seguimos donde lo
 * dejaste» en un dispositivo que ya no puede releer nada.
 */
export async function sembrarSesionDelAsistente(
  page: Page,
  { id = ID_PROPUESTA, token = TOKEN_VIVO }: { id?: string; token?: string } = {},
): Promise<void> {
  const espejo = {
    contador: 1,
    filas: [
      {
        id,
        token,
        codigos: [CODIGO_NUCLEO, CODIGO_AGENDA, CODIGO_USUARIOS_EXTRA],
        manuales: [],
      },
    ],
  }
  await page.addInitScript(([clave, json]) => window.localStorage.setItem(clave, json), [
    CLAVE_SESIONES_ASISTENTE,
    JSON.stringify(espejo),
  ] as const)
}

/** Una intención de contratación cuyo origen es una PROPUESTA, no un paquete. */
export interface IntencionDePropuesta {
  origen: 'PROPUESTA'
  propuestaId: string
  ciclo: 'MENSUAL' | 'ANUAL'
  sedes: number
  usuarios: number
  importeVistoMensual: number
  selloRevisadoEl: string
  creadaEn: string
  descartada: boolean
}

/**
 * La intención de propuesta, con la forma que `parseIntencion` acepta.
 *
 * <p>`creadaEn` se calcula desde el reloj —y no se escribe una fecha fija— por
 * el único motivo por el que eso es correcto: la intención CADUCA a los 30 días
 * (`INTENCION_MAX_DIAS`), así que una fecha quemada convertiría el caso en una
 * bomba de relojería que se pondría roja sola. Es lo contrario de anclar una
 * afirmación a la fecha de hoy: aquí lo frágil sería el literal.
 */
export function intencionDePropuesta(
  over: Partial<IntencionDePropuesta> = {},
): IntencionDePropuesta {
  return {
    origen: 'PROPUESTA',
    propuestaId: ID_PROPUESTA,
    ciclo: 'MENSUAL',
    sedes: 2,
    usuarios: 5,
    importeVistoMensual: SUBTOTAL_COMPLETO,
    // No se compara con nada en este embudo: la deriva de precio se evalúa en el
    // paso vinculante, que estas pruebas no recorren.
    selloRevisadoEl: '2026-08-28',
    creadaEn: new Date().toISOString(),
    descartada: false,
    ...over,
  }
}

export async function sembrarIntencionDePropuesta(
  page: Page,
  valor: IntencionDePropuesta = intencionDePropuesta(),
): Promise<void> {
  await page.addInitScript(([clave, json]) => window.localStorage.setItem(clave, json), [
    CLAVE_INTENCION,
    JSON.stringify(valor),
  ] as const)
}

/** El cuerpo de una petición, tipado y sin `!`: si no lo hay, se dice cuál. */
export function cuerpoDe<T>(route: Route): T {
  const crudo = route.request().postData()
  if (crudo === null) {
    throw new Error(
      `La petición ${route.request().method()} ${route.request().url()} no llevó cuerpo.`,
    )
  }
  return JSON.parse(crudo) as T
}

/** 404 con la forma que el front sabe leer. Es «no existe» **y** «caducó». */
export function noEncontrado(route: Route): Promise<void> {
  return responderJson(
    route,
    { status: 404, title: 'Not Found', detail: 'La propuesta no existe o caducó.' },
    404,
  )
}

/** Lo que el enrutado devuelve para que el caso pueda auditar la red. */
export interface RedDelAsistente {
  /**
   * Toda petición que llegó al comodín, es decir, que NINGUNA ruta declarada
   * previó.
   *
   * <p>Existe porque el comodín tiene que contestar algo, y lo que conteste se
   * confunde con un caso legítimo: un 404 de comodín se lee exactamente igual
   * que «el enlace caducó», y el caso del enlace caducado pasaría en verde sin
   * haber ejercitado nada. Por eso el comodín devuelve **500** —un estado que
   * ninguna rama de esta feature trata— y además deja el rastro aquí, para que
   * el caso pueda afirmar que la lista está vacía.
   */
  inesperadas: string[]
  /** Las llamadas al asistente, en orden, para contar y para afirmar ausencias. */
  llamadas: string[]
}

/**
 * Cómo se contesta una ruta.
 *
 * <p>Siempre una FUNCIÓN, nunca «un cuerpo o una función». La unión con
 * `unknown` que uno escribe sin pensar colapsa a `unknown`, y entonces el
 * parámetro `route` de cada retrollamada pierde su tipo contextual y llega a
 * `implicitly has an 'any' type` — que en este repositorio es un error de
 * compilación, no un aviso. Un cuerpo fijo se escribe
 * `(route) => responderJson(route, cuerpo)`, que además deja a la vista el
 * estado con el que se responde.
 */
export type RespuestaDeRuta = (route: Route) => Promise<void> | void

/**
 * Enruta la API pública del embudo.
 *
 * <p>El comodín se registra PRIMERO a propósito: Playwright resuelve la ruta
 * registrada más tarde, así que lo específico declarado después gana.
 *
 * @param rutas
 *            patrones RELATIVOS a `/api/v1` (por ejemplo `/assistant/proposal*`),
 *            con la función que contesta cada uno.
 */
export async function enrutarEmbudo(
  page: Page,
  rutas: Record<string, RespuestaDeRuta> = {},
): Promise<RedDelAsistente> {
  const red: RedDelAsistente = { inesperadas: [], llamadas: [] }

  await page.route(`${API}/**`, (route) => {
    if (route.request().method() !== 'OPTIONS') {
      red.inesperadas.push(`${route.request().method()} ${route.request().url()}`)
    }
    return responderJson(route, { status: 500, title: 'Ruta no prevista por la prueba' }, 500)
  })

  // `*` y no a secas: el glob de Playwright se compara contra la URL COMPLETA,
  // así que un patrón sin comodín final no casa con `?ciclo=…` si algún día lo
  // lleva, y la petición caería en el comodín de 500 sin decir por qué.
  await page.route(`${API}/catalog*`, (route) => responderJson(route, CATALOGO))

  // La portada y `/planes` piden además el catálogo de paquetes y la cotización:
  // el precio del embudo lo calcula el servidor, no este front. Se cotiza contra
  // `CATALOGO` —el que sirve la ruta de arriba— y no contra el del embudo, para
  // que el desglose no nombre artículos que estas pantallas no tienen.
  await page.route(`${API}/plans`, (route) => responderJson(route, PLANS_CONTENT))
  await page.route(`${API}/quotes/preview`, cotizadorDe(CATALOGO))

  await page.route(`${API}/assistant/**`, (route) => {
    if (route.request().method() !== 'OPTIONS') {
      red.llamadas.push(`${route.request().method()} ${route.request().url()}`)
      red.inesperadas.push(`${route.request().method()} ${route.request().url()}`)
    }
    return responderJson(route, { status: 500, title: 'Llamada al asistente no prevista' }, 500)
  })

  for (const [patron, respuesta] of Object.entries(rutas)) {
    await page.route(`${API}${patron}`, (route) => {
      if (route.request().method() === 'OPTIONS') {
        return responderJson(route, {})
      }
      red.llamadas.push(`${route.request().method()} ${route.request().url()}`)
      return respuesta(route)
    })
  }

  return red
}
