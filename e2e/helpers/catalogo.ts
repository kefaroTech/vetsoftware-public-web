import type { Page, Route } from '@playwright/test'
import type {
  CatalogoComercial,
  PublicCatalogCapacityResponse,
  PublicCatalogItemResponse,
  PublicCatalogPackResponse,
  PublicCatalogResponse,
} from '../../src/features/asistente/types/catalogo.types'
import { PLANS_CONTENT } from '../../src/features/landing/content/plans.content'
import {
  cestaDeCotizacion,
  modulosDelPaquete,
  type SeleccionCotizador,
} from '../../src/features/landing/composables/cotizadorLineas'
import type {
  PreviewQuoteRequest,
  QuotePreviewLineResponse,
  QuotePreviewResponse,
} from '../../src/features/landing/types/cotizacion.types'
import type { Ciclo } from '../../src/features/landing/types/plans.types'
import type { SelfServeQuoteLineRequest } from '../../src/features/suscripcion/types/cotizaciones.types'
import { responderJson } from './sesion'

/**
 * LOS TRES ENDPOINTS PÚBLICOS QUE EL EMBUDO PIDE AL MONTAR, SIMULADOS.
 *
 * ── Por qué esto tuvo que existir ──────────────────────────────────────────
 * La landing y `/planes` se probaban sin red porque `fetchPlans()` devolvía
 * contenido local. Ya no: hoy salen a `GET /plans`, a `GET /catalog` y a
 * `POST /quotes/preview` —el precio lo calcula el servidor, decisión D5— y sin
 * doble ninguna de esas dos pantallas monta con datos. Se simula la frontera
 * HTTP y nada más: router, guardas, stores, seams y componentes son los de
 * producción.
 *
 * ── Lo que este doble NO puede detectar, y hay que decirlo ─────────────────
 * Un cambio de forma en el contrato del backend. Los cuerpos están TIPADOS con
 * los tipos de producción, así que un campo que desaparezca del tipo rompe el
 * compilador; un campo que el backend renombre sin tocar el tipo lo cogen
 * `api:check` y `MatchesContract`, no esto.
 */

/** Prefijo de la API. `createApiBaseUrl` produce `<origen>/api/v1`. */
const API = '**/api/v1'

/**
 * El tipo impositivo con el que responde el doble de `/quotes/preview`.
 *
 * <p>Es el mismo 19 % que `plans.content.ts` declara para los tres paquetes, y
 * va aquí porque el importe con impuesto lo pone el SERVIDOR: sin una tasa
 * declarada, este doble tendría que devolver un impuesto inventado y la pantalla
 * lo pintaría como si el servidor lo hubiera dicho.
 */
const IVA = 0.19

/**
 * Los precios de este catálogo de prueba son los del modelo comercial real
 * (adenda D4 del handoff): la suma suelta de cada paquete supera su precio de
 * entrada —208.000/179.000, 224.000/189.000, 547.000/449.000— y esa relación es
 * la que hace existir el aviso de «los juntos salen más baratos». Con cifras
 * inventadas al azar ese aviso desaparecería y su caso pasaría en verde sin
 * ejercitar nada.
 */
function modulo(
  over: Partial<PublicCatalogItemResponse> & { code: string; name: string; monthlyAmount: number },
): PublicCatalogItemResponse {
  return {
    description: null,
    mandatory: false,
    trialDays: 30,
    annualAmount: over.monthlyAmount * 10,
    setupAmount: null,
    taxRate: 19,
    taxTreatment: 'TAXED',
    selfServiceEligible: true,
    areaCode: null,
    shortLabel: null,
    ...over,
  }
}

function capacidad(
  over: Partial<PublicCatalogCapacityResponse> & { code: string; name: string; unit: string },
): PublicCatalogCapacityResponse {
  return {
    description: null,
    mandatory: false,
    monthlyIncludedQuantity: 0,
    annualIncludedQuantity: 0,
    monthlyUnitAmount: null,
    annualUnitAmount: null,
    taxRate: 19,
    taxTreatment: 'TAXED',
    selfServiceEligible: false,
    ...over,
  }
}

/**
 * Los catorce artículos, con los rótulos que el catálogo publica DE VERDAD:
 * changeset 403 para los tres BUNDLE y 407 para el vocabulario «negocio /
 * mascotas» de seis MODULE, tres `short_label` y el área `PATIENT_CARE`.
 *
 * <p>Manda la semilla, no `plans.content.ts`. Esa transcripción se quedó en el
 * changeset 308 y todavía dice «Núcleo: clientes y mascotas», «Caja y punto de
 * venta» y «Pack Clínica» (issue #360), así que mientras no se realinee **las
 * dos ramas del paso 6 nombran distinto el mismo módulo**: la modular lo lee de
 * aquí y la del paquete, de allí. Es la incoherencia real del producto, no un
 * despiste del doble, y por eso se reproduce en vez de taparse — ver el issue
 * #371. Alinear este fichero con el otro volvería a poner la suite en verde
 * sobre un catálogo que ya no existe, que es justo lo que no puede pasar.
 */
const MODULOS: PublicCatalogItemResponse[] = [
  modulo({
    code: 'CORE',
    name: 'Clientes y mascotas',
    monthlyAmount: 59_000,
    mandatory: true,
    shortLabel: 'Clientes y mascotas',
  }),
  modulo({
    code: 'SCHEDULING',
    name: 'Agenda de citas',
    monthlyAmount: 39_000,
    areaCode: 'PATIENT_CARE',
    shortLabel: 'Agenda',
  }),
  modulo({
    code: 'CLINICAL_HISTORY',
    name: 'Historia clínica y consultas',
    monthlyAmount: 45_000,
    areaCode: 'PATIENT_CARE',
    shortLabel: 'Historia clínica',
  }),
  modulo({
    code: 'VACCINATION_DEWORMING',
    name: 'Vacunación y desparasitación',
    monthlyAmount: 39_000,
    areaCode: 'PATIENT_CARE',
    shortLabel: 'Vacunación',
  }),
  modulo({
    code: 'GROOMING',
    name: 'Spa, estética y guardería',
    monthlyAmount: 35_000,
    areaCode: 'PATIENT_CARE',
    shortLabel: 'Spa',
  }),
  modulo({
    code: 'HOSPITALIZATION',
    name: 'Hospitalización',
    monthlyAmount: 45_000,
    areaCode: 'HOSPITAL',
  }),
  modulo({ code: 'SURGERY', name: 'Cirugía', monthlyAmount: 45_000, areaCode: 'HOSPITAL' }),
  modulo({
    code: 'LAB_IMAGING',
    name: 'Laboratorio y radiografías',
    monthlyAmount: 42_000,
    areaCode: 'HOSPITAL',
    shortLabel: 'Laboratorio',
  }),
  modulo({
    code: 'SERVICES',
    name: 'Tarifas y promociones',
    monthlyAmount: 33_000,
    areaCode: 'MONEY',
    shortLabel: 'Servicios',
  }),
  modulo({
    code: 'CASH_REGISTER',
    name: 'Caja y ventas',
    monthlyAmount: 42_000,
    trialDays: 14,
    areaCode: 'MONEY',
    shortLabel: 'Caja y ventas',
  }),
  modulo({
    code: 'OPEN_ACCOUNTS',
    name: 'Cuentas por cobrar',
    monthlyAmount: 29_000,
    trialDays: 14,
    areaCode: 'MONEY',
    shortLabel: 'Por cobrar',
  }),
  // `NEVER_FREE` en el catálogo real: `trialDays` nulo es un dato de negocio y
  // no un hueco, y es el único artículo que hace aparecer la fila «Sin prueba ·
  // se cobra desde el primer día» de `TrialLinesTable`.
  modulo({
    code: 'ELECTRONIC_INVOICING',
    name: 'Facturación electrónica DIAN',
    monthlyAmount: 24_000,
    trialDays: null,
    areaCode: 'MONEY',
    shortLabel: 'Facturación DIAN',
  }),
  modulo({
    code: 'INVENTORY',
    name: 'Inventario de productos',
    monthlyAmount: 35_000,
    trialDays: 14,
    areaCode: 'STOCK',
    shortLabel: 'Inventario',
  }),
  modulo({
    code: 'PURCHASES',
    name: 'Compras y proveedores',
    monthlyAmount: 35_000,
    trialDays: 14,
    areaCode: 'STOCK',
    shortLabel: 'Compras',
  }),
]

/**
 * Los cuatro ejes, en las DOS formas que el modelo distingue.
 *
 * <p>`CAPACITY_*` trae lo incluido y no se vende suelto; `EXTRA_*` cobra las
 * unidades de más y tiene `included_quantity = 0`. `incluidasDelEje` suma uno a
 * lo del primero —así lo calcula el backend— y da 1 sede y 2 personas, que es lo
 * que la portada promete y lo que declaran las `capacities` de `plans.content.ts`.
 */
const CAPACIDADES: PublicCatalogCapacityResponse[] = [
  capacidad({ code: 'CAPACITY_BRANCH', name: 'Sede incluida', unit: 'BRANCH' }),
  capacidad({
    code: 'CAPACITY_USER',
    name: 'Usuario incluido',
    unit: 'USER',
    monthlyIncludedQuantity: 1,
    annualIncludedQuantity: 1,
  }),
  capacidad({
    code: 'EXTRA_BRANCH',
    name: 'Sede adicional',
    unit: 'BRANCH',
    monthlyUnitAmount: 35_000,
    annualUnitAmount: 350_000,
    selfServiceEligible: true,
  }),
  capacidad({
    code: 'EXTRA_USER',
    name: 'Usuario adicional',
    unit: 'USER',
    monthlyUnitAmount: 12_000,
    annualUnitAmount: 120_000,
    selfServiceEligible: true,
  }),
]

function paquete(
  code: string,
  name: string,
  monthlyAmount: number,
  modulos: string[],
  recommended = false,
): PublicCatalogPackResponse {
  return {
    code,
    name,
    tagline: null,
    monthlyAmount,
    annualAmount: monthlyAmount * 10,
    setupAmount: 0,
    taxRate: 19,
    taxTreatment: 'TAXED',
    // El núcleo y los dos `CAPACITY_*` van en los tres paquetes, y son
    // exactamente lo que `modulosDelPaquete` descarta al comparar contra las
    // casillas. Omitirlos aquí haría pasar por accidente el caso que comprueba
    // que se descartan.
    componentCodes: ['CORE', ...modulos, 'CAPACITY_BRANCH', 'CAPACITY_USER'],
    recommended,
  }
}

export const CATALOGO_EMBUDO: PublicCatalogResponse = {
  currency: 'COP',
  priceValidFrom: '2026-08-27',
  modules: MODULOS,
  capacities: CAPACIDADES,
  oneTimeItems: [],
  packs: [
    paquete('PACK_SPA', 'Estética y guardería', 179_000, [
      'SCHEDULING',
      'GROOMING',
      'SERVICES',
      'CASH_REGISTER',
    ]),
    paquete(
      'PACK_CLINIC',
      'Consulta de barrio',
      189_000,
      ['SCHEDULING', 'CLINICAL_HISTORY', 'VACCINATION_DEWORMING', 'CASH_REGISTER'],
      true,
    ),
    paquete(
      'PACK_FULL',
      'Clínica completa',
      449_000,
      MODULOS.filter((m) => !m.mandatory).map((m) => m.code),
    ),
  ],
  requirements: [],
  areas: [
    { code: 'PATIENT_CARE', name: 'Atención a las mascotas' },
    { code: 'HOSPITAL', name: 'Hospital y quirófano' },
    { code: 'MONEY', name: 'Mostrador y dinero' },
    { code: 'STOCK', name: 'Inventario y compras' },
  ],
}

/**
 * El catálogo tal como lo ven las pantallas, con el precio del ciclo resuelto.
 *
 * ── Por qué esto no llama a `componer`, que es quien lo hace de verdad ──────
 * `catalogo.source.ts` importa el cliente HTTP, y ese módulo evalúa
 * `import.meta.env.VITE_API_URL` al cargarse. Una spec de Playwright se ejecuta
 * en Node, donde `import.meta.env` no existe: importar el seam revienta el
 * fichero entero con «Cannot read properties of undefined», antes de que ningún
 * caso llegue a correr. Es la misma razón por la que el resto de helpers de esta
 * carpeta solo importan tipos y funciones puras.
 *
 * <p>Esta proyección se usa **solo para derivar lo que la prueba siembra** —los
 * módulos de un paquete y el subtotal que el usuario vio—, nunca para afirmar
 * nada: lo que las pantallas componen es el `componer` de verdad, alimentado por
 * el mismo {@link CATALOGO_EMBUDO} a través de la ruta simulada.
 */
export function catalogoDe(ciclo: Ciclo): CatalogoComercial {
  const anual = ciclo === 'ANUAL'
  return {
    currency: CATALOGO_EMBUDO.currency,
    priceValidFrom: CATALOGO_EMBUDO.priceValidFrom,
    articulos: CATALOGO_EMBUDO.modules.map((m) => ({
      code: m.code,
      nombre: m.name,
      descripcion: m.description ?? '',
      grupo: null,
      importe: anual ? m.annualAmount : m.monthlyAmount,
      trialDays: m.trialDays,
      obligatorio: m.mandatory,
      vendible: m.selfServiceEligible,
      areaCode: m.areaCode,
      shortLabel: m.shortLabel,
    })),
    capacidades: CATALOGO_EMBUDO.capacities.map((c) => ({
      code: c.code,
      nombre: c.name,
      unit: c.unit,
      incluido: (anual ? c.annualIncludedQuantity : c.monthlyIncludedQuantity) ?? 0,
      vendible: c.selfServiceEligible,
    })),
    paquetes: CATALOGO_EMBUDO.packs.map((p) => ({
      code: p.code,
      nombre: p.name,
      tagline: p.tagline,
      importe: anual ? p.annualAmount : p.monthlyAmount,
      componentes: p.componentCodes,
      recommended: p.recommended,
    })),
    arcos: [],
    areas: CATALOGO_EMBUDO.areas.map((a) => ({ code: a.code, nombre: a.name })),
  }
}

/**
 * Los módulos que reproducen un paquete EXACTAMENTE, derivados del catálogo.
 *
 * <p>Se derivan y no se transcriben: la lista transcrita seguiría verde el día
 * que el paquete gane un componente, y el caso que afirma «estos módulos se
 * cotizan como paquete» pasaría a probar lo contrario sin decirlo.
 */
export function modulosQueReproducen(code: string, ciclo: Ciclo = 'MENSUAL'): string[] {
  const catalogo = catalogoDe(ciclo)
  const paq = catalogo.paquetes.find((p) => p.code === code)
  if (!paq) throw new Error(`El catálogo de prueba no publica el paquete «${code}»`)
  return modulosDelPaquete(paq, catalogo)
}

function articulosDe(catalogo: PublicCatalogResponse): PublicCatalogItemResponse[] {
  return [...catalogo.modules, ...catalogo.oneTimeItems]
}

function importeUnitario(
  catalogo: PublicCatalogResponse,
  code: string,
  ciclo: Ciclo,
): number | null {
  const anual = ciclo === 'ANUAL'
  const art = articulosDe(catalogo).find((m) => m.code === code)
  if (art) return anual ? art.annualAmount : art.monthlyAmount
  const paq = catalogo.packs.find((p) => p.code === code)
  if (paq) return anual ? paq.annualAmount : paq.monthlyAmount
  const cap = catalogo.capacities.find((c) => c.code === code)
  if (cap) return anual ? cap.annualUnitAmount : cap.monthlyUnitAmount
  return null
}

function nombreDe(catalogo: PublicCatalogResponse, code: string): string {
  return (
    articulosDe(catalogo).find((m) => m.code === code)?.name ??
    catalogo.packs.find((p) => p.code === code)?.name ??
    catalogo.capacities.find((c) => c.code === code)?.name ??
    code
  )
}

function renglon(
  catalogo: PublicCatalogResponse,
  linea: SelfServeQuoteLineRequest,
  ciclo: Ciclo,
): QuotePreviewLineResponse & { grossAmount: number } {
  const unitario = importeUnitario(catalogo, linea.code, ciclo) ?? 0
  const bruto = unitario * linea.quantity
  return {
    code: linea.code,
    name: nombreDe(catalogo, linea.code),
    contractedQuantity: linea.quantity,
    // Cero, y no lo que trae el tramo de entrada: la cesta que llega aquí ya
    // manda en los `EXTRA_*` solo las unidades que pasan de lo incluido
    // (`unidadesExtra`), así que descontarlo otra vez sería descontarlo dos veces.
    includedQuantity: 0,
    quantity: linea.quantity,
    unitAmount: unitario,
    grossAmount: bruto,
    taxRate: 19,
    taxTreatment: 'TAXED',
    taxAmount: Math.round(bruto * IVA),
    lineTotal: bruto + Math.round(bruto * IVA),
  }
}

/** Lo que este doble cobraría por una cesta. Es la cifra que la pantalla publica. */
export function subtotalDeLaCesta(lineas: SelfServeQuoteLineRequest[], ciclo: Ciclo): number {
  return lineas.reduce((total, l) => total + renglon(CATALOGO_EMBUDO, l, ciclo).grossAmount, 0)
}

/**
 * El subtotal de una selección de módulos, compuesto con la MISMA cesta que
 * compone la aplicación.
 *
 * <p>Existe para sembrar `importeVistoMensual` sin transcribir una cifra: lo que
 * el paso 6 compara es el importe que el usuario vio contra el que devuelve la
 * cotización, así que una cifra escrita a mano dispararía el aviso de deriva en
 * cuanto cualquier precio de este fichero cambiara — y media prueba fallaría por
 * un motivo que no tiene nada que ver con lo que dice comprobar.
 */
export function subtotalDeSeleccion(seleccion: SeleccionCotizador, ciclo: Ciclo): number {
  return subtotalDeLaCesta(cestaDeCotizacion(seleccion, catalogoDe(ciclo)).lineas, ciclo)
}

/**
 * Contesta `POST /quotes/preview` con el desglose que sale del catálogo que se
 * le dé.
 *
 * <p>Toma el catálogo por parámetro porque no hay uno solo: esta carpeta sirve
 * dos —el del embudo y el mínimo del asistente— y una suite que cotizara contra
 * un catálogo distinto del que le sirve `GET /catalog` pintaría importes de
 * artículos que su pantalla no tiene.
 */
export function cotizadorDe(catalogo: PublicCatalogResponse): (route: Route) => Promise<void> {
  return (route) => {
    const cuerpo = route.request().postDataJSON() as PreviewQuoteRequest
    const ciclo: Ciclo = cuerpo.billingCycle === 'ANNUAL' ? 'ANUAL' : 'MENSUAL'
    const lines = cuerpo.lines.map((l) => renglon(catalogo, l, ciclo))
    const subtotalAmount = lines.reduce((total, l) => total + l.grossAmount, 0)
    const taxAmount = lines.reduce((total, l) => total + (l.taxAmount ?? 0), 0)

    const respuesta: QuotePreviewResponse = {
      currency: 'COP',
      billingCycle: cuerpo.billingCycle,
      lines,
      subtotalAmount,
      discountAmount: 0,
      taxAmount,
      totalAmount: subtotalAmount + taxAmount,
    }
    return responderJson(route, respuesta)
  }
}

/**
 * Los tres endpoints, con el patrón RELATIVO a `/api/v1` que espera
 * `enrutarApi`.
 *
 * <p>`/catalog*` lleva comodín final a propósito: el glob de Playwright se
 * compara contra la URL COMPLETA, así que un patrón sin él dejaría de casar el
 * día que la petición lleve `?ciclo=…` y caería en el comodín sin decir por qué.
 */
export const RUTAS_DEL_EMBUDO: Record<string, (route: Route) => Promise<void>> = {
  '/plans': (route) => responderJson(route, PLANS_CONTENT),
  '/catalog*': (route) => responderJson(route, CATALOGO_EMBUDO),
  '/quotes/preview': cotizadorDe(CATALOGO_EMBUDO),
}

/**
 * Enruta el embudo para una pantalla PÚBLICA, sin sesión.
 *
 * <p>El comodín se registra primero y contesta **501**: Playwright resuelve la
 * ruta declarada más tarde, así que lo específico gana, y un estado que ninguna
 * rama de estas pantallas trata es lo único que impide que una petición no
 * prevista se confunda con una respuesta legítima.
 */
export async function enrutarEmbudoPublico(page: Page): Promise<void> {
  await page.route(`${API}/**`, (route) =>
    responderJson(route, { status: 501, title: 'Ruta no prevista por la prueba' }, 501),
  )
  for (const [patron, respuesta] of Object.entries(RUTAS_DEL_EMBUDO)) {
    await page.route(`${API}${patron}`, respuesta)
  }
}
