import { expect, type Page, type Route } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { EMPRESA_ID, EMPRESA_NOMBRE, perfilSimulado, responderJson } from '../helpers/sesion'
import { PERMISSIONS } from '../../src/constants/permissions'
import { PLANS_CONTENT } from '../../src/features/landing/content/plans.content'
import { RUTAS_DEL_EMBUDO } from '../helpers/catalogo'
import type {
  BillingCycle,
  SubscriptionResponse,
  SubscriptionStatus,
} from '../../src/features/suscripcion/types/suscripcion.types'

/**
 * Arnés de CAPTURA y MEDIDA de pantallas. No es una suite de regresión: no
 * compara contra ninguna línea base, no escribe en `visual/__screenshots__/` y
 * no falla por un píxel. Produce PNG + JSON para que otro agente audite.
 *
 * Vive fuera de `*.spec.ts` a propósito: `playwright.config.ts` apunta a `./e2e`
 * con el `testMatch` por defecto, así que un `.spec.ts` aquí entraría en
 * `npm run e2e` y cambiaría la suite de todo el mundo. La extensión `.uxa.ts` la
 * recoge solo `playwright.uxcapture.config.ts`.
 */

/**
 * Raíz de las capturas. Fuera del worktree: no es material del repositorio.
 *
 * <p>`UXA_CAPTURAS` la redirige para poder fotografiar el mismo árbol dos veces
 * —antes y después de un arreglo— sin pisar la tanda anterior, que es la única
 * forma de comparar.
 */
export const RAIZ_CAPTURAS =
  process.env.UXA_CAPTURAS ??
  'C:/Users/Orlando Velasquez/Documents/Proyectos/MainVetSoftware-uxaudit/_capturas/public'

export const RAIZ_SCRATCH =
  'C:/Users/ORLAND~1/AppData/Local/Temp/claude/C--Users-Orlando-Velasquez-Documents-Proyectos-MainVetSoftware/f56969b5-ac11-4b7e-87fc-3e60aee284b8/scratchpad'

/** Fragmentos por prueba; se funden después. Un JSON único con workers en paralelo se pisa. */
export const DIR_FRAGMENTOS =
  process.env.UXA_FRAGMENTOS ?? join(RAIZ_SCRATCH, 'uxa-fragmentos-public')

export interface Viewport {
  nombre: string
  width: number
  height: number
  /** Lo que hay que saber al mirar estas capturas, cuando el ancho no cae limpio. */
  nota?: string
}

/**
 * Los anchos, y por qué estos.
 *
 * <p>Los cuatro primeros son los pedidos. Los dos últimos salen de los puntos de
 * ruptura que el tenant declara de verdad, y sin ellos hay estados de maquetación
 * que ninguna captura enseña.
 */
export const VIEWPORTS: readonly Viewport[] = [
  { nombre: 'escritorio', width: 1440, height: 900 },
  {
    nombre: 'portatil',
    width: 1280,
    height: 800,
    nota: 'ESTADO ESTRECHO, no escritorio: `public/StatsRow.vue:58` usa `<= 1280px` y sí dispara a 1280.',
  },
  {
    nombre: 'tablet-h',
    width: 1024,
    height: 768,
    nota: 'El único corte que el proyecto decidió explícitamente (`viewport.store.ts:11`).',
  },
  {
    nombre: 'tablet-v',
    width: 768,
    height: 1024,
    nota:
      'ESTADO MIXTO, no reproducible en ningún dispositivo: a 768 disparan los seis SFC con ' +
      '`<= 768px` pero NO los 16 usos de `<= 760px`, incluida la primitiva `.ds-stack-mobile`. ' +
      'Media maquetación queda apilada y media no: no sirve para juzgar alineación ni espaciado. ' +
      'El estado apilado real está en `movil-ancho` (760).',
  },
  {
    nombre: 'movil-ancho',
    width: 760,
    height: 1024,
    nota: 'El corte real del apilado del tenant: `<= 760px`, donde sí dispara `.ds-stack-mobile`.',
  },
  { nombre: 'movil', width: 390, height: 844 },
]

const API = '**/api/v1'

/** Todos los permisos declarados: sin ellos el guard devuelve media app al tablero. */
export const TODOS_LOS_PERMISOS: string[] = Object.values(PERMISSIONS)

/**
 * El plan activo de las pantallas privadas.
 *
 * `estadoPlanActual` mira `status` contra la lista de vigentes; `ACTIVE` es la
 * que deja al tenant con plan y evita que el guard de `/planes` intervenga.
 */
const SUSCRIPCION_ACTIVA: SubscriptionResponse = {
  id: 1,
  subscriptionNumber: 'SUB-E2E-0001',
  companyId: EMPRESA_ID,
  billingCycle: 'MONTHLY' as BillingCycle,
  status: 'ACTIVE' as SubscriptionStatus,
  current: true,
  startDate: '2026-01-01',
  currentPeriodStart: '2026-09-01',
  currentPeriodEnd: '2026-09-30',
  nextBillingDate: '2026-10-01',
  autoRenew: true,
  createdDate: '2026-01-01T08:00:00Z',
  enabled: true,
}

/** Igual que en `sesion.ts`: `/branches` devuelve ARRAY, y el id casa con `branchIds: [1]`. */
const SEDES = [
  {
    id: 1,
    name: 'Sede E2E de prueba',
    code: 'E2E-1',
    address: null,
    phone: null,
    city: { id: 1, name: 'Bogotá D.C.' },
    active: true,
  },
]

const PAGINA_VACIA = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 }

/** 80 caracteres exactos: el desbordamiento y la elipsis no se provocan con texto corto. */
const TEXTO_LARGO =
  'Control posquirúrgico con seguimiento prolongado del paciente E2E de prueba nº 3'

/** Un importe de nueve cifras, para que la columna de dinero tenga que ensancharse. */
const NUMERO_GRANDE = 128_450_900

/**
 * Una fila genérica con la unión de los campos que pintan los listados del
 * tenant. Es una aproximación declarada, no el contrato: sirve para que la
 * tabla tenga ancho, filas y texto que desborde, que es lo que se mide aquí.
 * Determinista por completo — ni `Date.now()` ni aleatorio.
 */
function filaGenerica(indice: number): Record<string, unknown> {
  const n = indice + 1
  const nombre = n === 3 ? TEXTO_LARGO : `Registro E2E de prueba ${String(n).padStart(2, '0')}`
  const importe = n === 5 ? NUMERO_GRANDE : 25_000 * n
  return {
    id: n,
    code: `E2E-${String(n).padStart(3, '0')}`,
    name: nombre,
    fullName: nombre,
    itemName: nombre,
    description: n === 3 ? TEXTO_LARGO : `Descripción E2E ${n}`,
    notes: n === 3 ? TEXTO_LARGO : null,
    status: n % 4 === 0 ? 'PENDING' : 'ACTIVE',
    state: n % 4 === 0 ? 'PENDING' : 'ACTIVE',
    active: n % 5 !== 0,
    enabled: n % 5 !== 0,
    type: 'PRODUCT',
    categoryName: `Categoría E2E ${(n % 3) + 1}`,
    quantity: n,
    stock: n * 3,
    price: importe,
    unitPrice: importe,
    unitAmount: importe,
    amount: importe,
    total: importe,
    totalAmount: importe,
    subtotalAmount: importe,
    balance: importe,
    currency: 'COP',
    date: `2026-09-${String((n % 28) + 1).padStart(2, '0')}`,
    createdDate: `2026-09-${String((n % 28) + 1).padStart(2, '0')}T09:15:00Z`,
    createdAt: `2026-09-${String((n % 28) + 1).padStart(2, '0')}T09:15:00Z`,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    email: `e2e${n}@ejemplo-de-prueba.co`,
    phone: `30012345${String(n).padStart(2, '0')}`,
    documentNumber: `1000${String(n).padStart(5, '0')}`,
    identifier: `900123${String(n).padStart(3, '0')}-7`,
    ownerName: `Propietario E2E ${n}`,
    petName: `Mascota E2E ${n}`,
    animalName: `Mascota E2E ${n}`,
    speciesName: 'Canino',
    breedName: 'Criollo',
    employeeName: `Empleado E2E ${n}`,
    branchName: 'Sede E2E de prueba',
    number: `FE-${String(n).padStart(4, '0')}`,
    invoiceNumber: `FE-${String(n).padStart(4, '0')}`,

    // Los resúmenes anidados. Media docena de vistas leen `fila.supplier.name` o
    // `fila.owner.id` directamente en la plantilla, sin guarda: sin el objeto, el
    // render lanza y se lleva el árbol, que es el mismo fallo que el comodín.
    company: { id: EMPRESA_ID, name: EMPRESA_NOMBRE, legalName: EMPRESA_NOMBRE, code: 'E2E' },
    branch: { id: 1, name: 'Sede E2E de prueba', code: 'E2E-1' },
    supplier: { id: n, name: `Proveedor E2E ${n}`, code: `PRV-${n}`, taxId: '900123456-7' },
    owner: { id: n, name: `Propietario E2E ${n}`, code: `OWN-${n}`, documentNumber: `1000${n}` },
    customer: { id: n, name: `Propietario E2E ${n}`, code: `OWN-${n}` },
    animal: { id: n, name: `Mascota E2E ${n}`, code: `PET-${n}` },
    product: { id: n, name: nombre, code: `E2E-${n}` },
    service: { id: n, name: nombre, code: `E2E-${n}` },
    tax: { id: 1, name: 'IVA 19 %', code: 'IVA19', rate: 19, percentage: 19 },
    category: { id: (n % 3) + 1, name: `Categoría E2E ${(n % 3) + 1}`, code: `CAT-${n % 3}` },
    createdBy: { id: 1, name: 'Empleado E2E de prueba', code: 'E2E-001' },
    employee: { id: 1, name: 'Empleado E2E de prueba', code: 'E2E-001' },

    // Colecciones anidadas. `roles` pinta `rol.permissions.length` y `cuentas`
    // recorre sus cargos: un `undefined` aquí revienta igual que arriba.
    permissions: [],
    lines: [],
    items: [],
    charges: [],
    debts: [],
    modules: [],
    subModules: [],
    version: 1,

    // `serviceCategory` y `productCategory` son los nombres REALES del resumen
    // anidado en `tienda`; `category` a secas no lo lee nadie.
    serviceCategory: {
      id: (n % 3) + 1,
      name: `Categoría E2E ${(n % 3) + 1}`,
      code: `CAT-${n % 3}`,
    },
    productCategory: {
      id: (n % 3) + 1,
      name: `Categoría E2E ${(n % 3) + 1}`,
      code: `CAT-${n % 3}`,
    },
    taxTreatment: 'TAXED',

    // `StockView` es plano y no anida producto: nombra sus columnas con prefijo.
    productId: n,
    productName: nombre,
    productCode: `E2E-${String(n).padStart(3, '0')}`,
    branchId: 1,
    minStock: 5,
    lowStock: n % 7 === 0,

    // La línea de tiempo agrupa por `eventDate.slice(0, 7)` y busca el icono en
    // `EVENT_TYPES[eventType]`: los dos son obligatorios y el enum es cerrado.
    eventType: 'CONSULTATION',
    eventDate: `2026-09-${String((n % 28) + 1).padStart(2, '0')}`,
  }
}

/** Los tipos de evento clínico son un enum cerrado: un valor inventado no tiene icono. */
const RESUMEN_HISTORIA = [
  { type: 'CONSULTATION', count: 12 },
  { type: 'VACCINATION', count: 5 },
  { type: 'SURGERY', count: 2 },
  { type: 'DEWORMING', count: 3 },
]

const FILAS_LLENO = 25

const PAGINA_LLENA = {
  content: Array.from({ length: FILAS_LLENO }, (_, i) => filaGenerica(i)),
  page: 0,
  pageSize: FILAS_LLENO,
  totalElements: FILAS_LLENO,
  totalPages: 1,
}

export type Estado = 'vacio' | 'lleno'

/**
 * Los endpoints que devuelven un ARRAY PELADO, no una página.
 *
 * <p>El comodín sirve `PageResponse` a todo lo no previsto, y un store que hace
 * `.filter()` sobre un objeto revienta **dentro de un watcher**: el árbol entero
 * deja de pintarse y el síntoma no señala a la causa. Es la misma razón por la
 * que `sesion.ts` tuvo que sacar `/branches` del comodín; la lista de abajo es
 * el resto de la familia, leída de la firma de cada `http.get<T[]>`.
 *
 * <p>Cada patrón lleva `*` final para admitir la cadena de consulta. El glob de
 * Playwright no cruza `/`, así que `/products*` casa `/products?x=1` y NO casa
 * `/products/search`, que sí es una página.
 */
const ENDPOINTS_ARRAY = [
  '/products',
  '/products/disabled',
  '/product-categories',
  '/services',
  '/services/disabled',
  '/service-categories',
  '/promotions',
  '/taxes',
  '/taxes/disabled',
  '/cash-sessions/open',
  '/cash-terminals',
  '/modules',
  '/sub-modules',
  '/permissions/by-company',
  '/roles/by-company',
  '/economic-activities',
  '/numbering-resolutions',
  '/system-configurations',
  '/suppliers',
  '/employees',
  '/employees/by-company',
  '/clinical-history',
  '/appointments',
  '/company-settings',
  '/consultation-types',
  '/countries',
  '/countries/*/states',
  '/states/*/cities',
  '/species/*/breeds',
  '/species/*/animal-colors',
  '/medicaments/available',
  '/medicaments/disabled',
  '/spas',
  '/surgeries',
  '/vaccinations',
  '/dewormings',
  '/diagnostic-imagings',
  '/diagnostic-imaging-types',
  '/laboratory-tests',
  '/hospitalizations/by-company',
  '/animals/by-owner/*',
  '/animals/*/weight-records',

  '/inventory/products/*/lots',
  '/product-charge-open-accounts/by-open-account/*',
  '/service-charge-open-accounts/by-open-account/*',
  '/general-charge-open-accounts/by-open-account/*',
  '/debt-open-accounts/by-open-account/*',
]

/**
 * Los endpoints que devuelven UNA entidad o UN agregado, tampoco una página.
 *
 * <p>Los agregados llevan su forma real —leída del tipo— porque lo que la
 * pantalla pinta son sus listas internas y sus totales: servirles un objeto
 * genérico dejaría el mismo `undefined.length` que el comodín.
 */
function entidadesDe(estado: Estado): Record<string, unknown> {
  const filas = estado === 'lleno' ? PAGINA_LLENA.content : []
  return {
    '/inventory/alerts': { lowStock: filas, expiring: [] },
    '/inventory/valuation': {
      totalValue: NUMERO_GRANDE,
      totalUnits: 348,
      byProduct: filas.map((f) => ({
        productId: f.id,
        productName: f.name,
        productCode: f.code,
        quantity: f.quantity,
        value: f.amount,
      })),
    },
    '/sales-reports/sales-book': {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      entries: filas,
      taxByRate: [],
      recaudoByMeans: [],
      totals: {
        subtotal: NUMERO_GRANDE,
        taxAmount: 0,
        total: NUMERO_GRANDE,
        documentCount: filas.length,
      },
    },
    '/sales-reports/reconciliation': {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      total: filas.length,
      validados: filas.length,
      rechazados: 0,
      contingencia: 0,
      pendientes: 0,
      needsAttention: [],
    },
    '/purchase-reports/purchase-book': {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      entries: filas,
      totals: {
        subtotal: NUMERO_GRANDE,
        taxAmount: 0,
        withholdingAmount: 0,
        total: NUMERO_GRANDE,
        documentCount: filas.length,
      },
    },
    '/supplier-invoices/aging': { asOf: '2026-09-04', suppliers: filas, totals: {} },
    '/open-accounts/summary': {
      openCount: filas.length,
      closedCount: 0,
      totalOutstanding: estado === 'lleno' ? NUMERO_GRANDE : 0,
    },
    '/company-tax-profile': filaGenerica(0),
    '/withholding-configs': filaGenerica(0),
  }
}

/** Detalle por id: el registro existe en los dos estados, o la pantalla no es fotografiable. */
const DETALLES = ['/open-accounts/*', '/owners/*', '/animals/*', '/products/*', '/services/*']

/** Vuelven a ser PÁGINA aunque casen con un patrón de detalle. */
const PAGINAS_QUE_GANAN = ['/owners/search', '/products/search', '/services/search']

/**
 * Enruta la API para la zona PRIVADA en los dos estados.
 *
 * <p>El orden replica el de `enrutarApi`: el comodín primero —Playwright resuelve
 * la ruta registrada más tarde—, y después lo específico. `/branches` no puede
 * caer en el comodín porque `branch.store` hace `.filter()` sobre la respuesta y
 * un objeto de página revienta el árbol dentro de un watcher.
 */
export async function enrutarApiPrivada(
  page: Page,
  estado: Estado,
  perfil: { mustChangePassword?: boolean } = {},
): Promise<void> {
  const cuerpo = estado === 'lleno' ? PAGINA_LLENA : PAGINA_VACIA
  const lista = estado === 'lleno' ? PAGINA_LLENA.content : []
  await page.route(`${API}/**`, (route: Route) => responderJson(route, cuerpo))

  for (const patron of ENDPOINTS_ARRAY) {
    await page.route(`${API}${patron}*`, (route: Route) => responderJson(route, lista))
  }
  for (const patron of DETALLES) {
    await page.route(`${API}${patron}`, (route: Route) => responderJson(route, filaGenerica(0)))
  }
  for (const [patron, respuesta] of Object.entries(entidadesDe(estado))) {
    await page.route(`${API}${patron}*`, (route: Route) => responderJson(route, respuesta))
  }
  for (const patron of PAGINAS_QUE_GANAN) {
    await page.route(`${API}${patron}*`, (route: Route) => responderJson(route, cuerpo))
  }
  // La historia clínica va con el enum real de tipos: el resumen alimenta el
  // recuento por tipo y la línea de tiempo busca su icono por ese valor.
  await page.route(`${API}/animals/*/clinical-history/summary*`, (route: Route) =>
    responderJson(route, estado === 'lleno' ? RESUMEN_HISTORIA : []),
  )
  await page.route(`${API}/animals/*/clinical-history*`, (route: Route) =>
    responderJson(route, {
      ...cuerpo,
      content: (estado === 'lleno' ? PAGINA_LLENA.content : []).map((f, i) => ({
        ...f,
        // El módulo mantiene el índice dentro del array, pero el tipo indexado no lo
        // sabe: `noUncheckedIndexedAccess` lo da como opcional igualmente.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        eventType: RESUMEN_HISTORIA[i % RESUMEN_HISTORIA.length]!.type,
      })),
    }),
  )

  // `CashSessionView | ''`: la cadena vacía es «no hay caja abierta», que es el
  // estado vacío legítimo y no un fallo.
  await page.route(`${API}/cash-sessions/current*`, (route: Route) =>
    responderJson(route, estado === 'lleno' ? filaGenerica(0) : ''),
  )

  await page.route(`${API}/auth/me`, (route: Route) =>
    responderJson(
      route,
      perfilSimulado({
        permisos: TODOS_LOS_PERMISOS,
        mustChangePassword: perfil.mustChangePassword ?? false,
      }),
    ),
  )
  await page.route(`${API}/branches`, (route: Route) => responderJson(route, SEDES))
  await page.route(`${API}/subscriptions/current`, (route: Route) =>
    responderJson(route, SUSCRIPCION_ACTIVA),
  )
}

/** El catálogo público vacío: `GET /plans` responde 200 con lista vacía, nunca 404. */
const CATALOGO_SIN_PLANES = { currency: null, priceValidFrom: null, plans: [] }

/**
 * Enruta la zona pública. El estado `vacio` sirve el catálogo sin planes, que es
 * el estado que la portada tiene escrito y que ninguna captura ha mirado nunca.
 */
export async function enrutarApiPublica(page: Page, estado: Estado): Promise<void> {
  await page.route(`${API}/**`, (route: Route) =>
    responderJson(route, { status: 501, title: 'Ruta no prevista por el arnés' }, 501),
  )
  for (const [patron, respuesta] of Object.entries(RUTAS_DEL_EMBUDO)) {
    await page.route(`${API}${patron}`, respuesta)
  }
  if (estado === 'vacio') {
    await page.route(`${API}/plans`, (route: Route) => responderJson(route, CATALOGO_SIN_PLANES))
  } else {
    await page.route(`${API}/plans`, (route: Route) => responderJson(route, PLANS_CONTENT))
  }
}

/**
 * Bloquea las fuentes remotas. La reposición desde disco NO va aquí: un
 * `addInitScript` corre antes de que el analizador haya creado
 * `document.documentElement`, así que inyectar la hoja ahí lanza
 * `appendChild of null` y deja la página con la pila de respaldo del sistema —
 * y `document.fonts.check()` no lo delata, porque devuelve `true` para toda
 * familia que no tenga ninguna `@font-face` declarada.
 */
export async function prepararFuentes(page: Page): Promise<void> {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
}

export interface EstadoFuentes {
  declaradas: number
  sinCargar: string[]
}

/**
 * Repone las fuentes del producto desde disco, con la hoja que ya usa la suite
 * visual — Vite la sirve en `/visual/fonts.css` y sus `url()` relativas
 * resuelven contra ese directorio.
 *
 * Devuelve cuántas caras quedaron declaradas: `declaradas: 0` significa que la
 * hoja no llegó y la captura está fotografiando otra tipografía.
 */
async function reponerFuentes(page: Page): Promise<EstadoFuentes> {
  try {
    await page.addStyleTag({ url: '/visual/fonts.css' })
  } catch {
    return { declaradas: 0, sinCargar: ['no se pudo inyectar /visual/fonts.css'] }
  }
  return page.evaluate(async () => {
    const caras = [...document.fonts]
    await Promise.allSettled(caras.map((cara) => cara.load()))
    await document.fonts.ready
    return {
      declaradas: caras.length,
      sinCargar: [...document.fonts]
        .filter((cara) => cara.status !== 'loaded')
        .map((cara) => `${cara.family} ${cara.style} ${cara.weight}`),
    }
  })
}

/** Congela transiciones y el cursor: una captura con el caret parpadeando no es comparable. */
export async function congelarAnimaciones(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      transition: none !important;
      animation: none !important;
      caret-color: transparent !important;
      scroll-behavior: auto !important;
    }`,
  })
}

export const velo = (page: Page) => page.locator('[role="alert"][aria-busy="true"]')

/**
 * Espera al estado observable, nunca a un reloj.
 *
 * El velo global aparece a los `SHOW_DELAY_MS` = 200 ms y, una vez visible, se
 * mantiene `MIN_VISIBLE_MS` = 300 ms más allá de la última respuesta: entre que
 * la pantalla está pintada y el velo se retira hay una ventana de hasta 300 ms
 * en la que la captura saldría tapada.
 */
export async function esperarPantallaQuieta(page: Page): Promise<{ fuentes: EstadoFuentes }> {
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForLoadState('networkidle', { timeout: 8_000 })
  } catch {
    // Una pantalla con sondeo abierto nunca llega a `networkidle`. No es motivo
    // para descartar su captura: se sigue con lo que ya esté pintado.
  }
  await expect(velo(page)).toBeHidden({ timeout: 15_000 })
  await congelarAnimaciones(page)
  const fuentes = await reponerFuentes(page)
  await page.evaluate(() => {
    document.querySelector('.app-content')?.scrollTo({ top: 0, behavior: 'auto' })
    window.scrollTo({ top: 0, behavior: 'auto' })
  })
  return { fuentes }
}

export interface RutaDescubierta {
  path: string
  name: string | null
  permission: string | null
  permissionsAny: string[] | null
  requiresAuth: boolean
  guestOnly: boolean
  allowClientWithoutPlan: boolean
  hasComponent: boolean
}

/** El inventario sale del router REAL ya montado, no de parsear el `.ts`. */
export async function inventarioDeRutas(page: Page): Promise<RutaDescubierta[]> {
  return page.evaluate(() => {
    const contenedor = document.querySelector('#app') as unknown as {
      __vue_app__?: { config: { globalProperties: Record<string, unknown> } }
    }
    const app = contenedor.__vue_app__
    if (!app) throw new Error('la aplicación no está montada en #app')
    const router = app.config.globalProperties.$router as {
      getRoutes: () => {
        path: string
        name?: string | symbol | null
        meta?: Record<string, unknown>
        components?: Record<string, unknown> | null
      }[]
    }
    return router.getRoutes().map((r) => ({
      path: r.path,
      name: typeof r.name === 'string' ? r.name : null,
      permission: (r.meta?.permission as string | undefined) ?? null,
      permissionsAny: (r.meta?.permissionsAny as string[] | undefined) ?? null,
      requiresAuth: r.meta?.requiresAuth === true,
      guestOnly: r.meta?.guestOnly === true,
      allowClientWithoutPlan: r.meta?.allowClientWithoutPlan === true,
      hasComponent: Object.keys(r.components ?? {}).length > 0,
    }))
  })
}

/**
 * Valores de los parámetros de ruta. Se declaran aquí y se reportan: las
 * pantallas de detalle se abren con el id 1, que es el de la primera fila de
 * `filaGenerica`, así que en el estado `lleno` el registro existe en el doble.
 */
export const PARAMETROS: Record<string, string> = {
  ownerId: '1',
  petId: '1',
  accountId: '1',
  id: '1',
}

export function concretar(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?\*?\??/g, (_, nombre: string) => {
    return PARAMETROS[nombre] ?? '1'
  })
}

export function slugDe(path: string): string {
  if (path === '/') return 'landing'
  return (
    path
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'raiz'
  )
}

export interface Incidencia {
  tipo: string
  detalle: string
}

/** Consola y red por ruta. Se enganchan una vez y se vacían antes de cada `goto`. */
export function engancharDiagnostico(page: Page): {
  reiniciar: () => void
  volcar: () => { consola: Incidencia[]; red: Incidencia[] }
} {
  let consola: Incidencia[] = []
  let red: Incidencia[] = []

  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return
    consola.push({ tipo: msg.type(), detalle: msg.text().slice(0, 400) })
  })
  page.on('pageerror', (err) => {
    consola.push({ tipo: 'pageerror', detalle: `${err.name}: ${err.message}`.slice(0, 400) })
  })
  page.on('requestfailed', (req) => {
    red.push({
      tipo: 'requestfailed',
      detalle: `${req.method()} ${req.url().slice(0, 200)} — ${req.failure()?.errorText ?? ''}`,
    })
  })
  page.on('response', (res) => {
    if (res.status() < 400) return
    red.push({ tipo: `http-${res.status()}`, detalle: res.url().slice(0, 200) })
  })

  return {
    reiniciar: () => {
      consola = []
      red = []
    },
    volcar: () => ({ consola: consola.slice(0, 40), red: red.slice(0, 40) }),
  }
}

export function escribirFragmento(nombre: string, datos: unknown): void {
  const destino = join(DIR_FRAGMENTOS, `${nombre}.json`)
  mkdirSync(dirname(destino), { recursive: true })
  writeFileSync(destino, JSON.stringify(datos, null, 2), 'utf8')
}

export function escribirJson(rutaAbsoluta: string, datos: unknown): void {
  mkdirSync(dirname(rutaAbsoluta), { recursive: true })
  writeFileSync(rutaAbsoluta, JSON.stringify(datos, null, 2), 'utf8')
}
