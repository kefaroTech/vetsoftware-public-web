import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test'
import { login } from './helpers/auth'
import { exigir } from './helpers/exigir'

/**
 * E2E EXHAUSTIVO del flujo de REGISTRO de una veterinaria y del sistema de roles.
 *
 * TODO ES REAL (nada mockeado): registra la empresa contra el backend, crea el
 * admin, crea empleados reales por rol, y entra con cada uno. Las aserciones de
 * "qué debe ver cada rol" son DATA-DRIVEN: se leen los permisos REALES del usuario
 * desde `GET /auth/me` (misma fuente que usa la UI) y se compara la visibilidad del
 * sidebar y el acceso a rutas contra el gating real del front.
 *
 * PRERREQUISITOS (asumidos, ver proporsal/*.md):
 *  - Backend con el registro que instancia TODOS los base roles (dueño solo ADMIN).
 *  - Catálogo base sembrado: base_roles (ADMIN mandatory + los 6) + base_permissions
 *    + membership_sub_modules de BASIC (seed_base_roles.sql ya corrido).
 *
 * Nota: los tests NO se ablandan para pasar. Si algo falla, es un hallazgo real.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Gating del front (extraído de AppSidebar.vue + router/index.ts). `admin.all`
// hace bypass de todo (useAuthorization.can). Cada entrada define:
//  - label: texto del botón de nav (para verificar visibilidad en el sidebar)
//  - path : ruta para probar acceso directo (guard de ruta)
//  - gate : predicado sobre el set de permisos REALES del usuario
// ─────────────────────────────────────────────────────────────────────────────
type Perms = Set<string>
const has = (p: Perms, c: string) => p.has('admin.all') || p.has(c)
const hasAny = (p: Perms, cs: string[]) => p.has('admin.all') || cs.some((c) => p.has(c))

const ACCIONES_CREATE = [
  'laboratoryTest.create',
  'diagnosticimaging.create',
  'vaccination.create',
  'hospitalization.create',
  'deworming.create',
  'surgery.create',
  'spa.create',
]
const TIENDA_READ = ['product.read', 'service.read', 'promotion.read', 'tax.read']

/** Botones de nav de primer nivel que SÍ están gated por permiso (Agenda y Consulta no lo están). */
const SIDEBAR_GATES: { label: string; gate: (p: Perms) => boolean }[] = [
  { label: 'Procedimientos', gate: (p) => hasAny(p, ACCIONES_CREATE) },
  { label: 'Bandeja de muestras', gate: (p) => has(p, 'laboratoryTest.read') },
  { label: 'Pacientes internados', gate: (p) => has(p, 'hospitalization.read') },
  { label: 'Tienda', gate: (p) => hasAny(p, TIENDA_READ) },
  { label: 'Cuentas abiertas', gate: (p) => has(p, 'openAccount.read') },
  { label: 'Facturación electrónica', gate: (p) => has(p, 'electronicbilling.create') },
  { label: 'Documentos', gate: (p) => has(p, 'electronicbilling.create') },
  { label: 'Reportes', gate: (p) => has(p, 'electronicbilling.create') },
  { label: 'Empleados', gate: (p) => has(p, 'employee.read') },
  { label: 'Roles y permisos', gate: (p) => has(p, 'rolePermissions.read') },
  { label: 'Medicamentos', gate: (p) => has(p, 'prescription.create') },
]

/** Rutas guardadas (meta.permission en router/index.ts) → acceso directo permitido/bloqueado. */
const ROUTE_GATES: { path: string; gate: (p: Perms) => boolean }[] = [
  { path: '/dashboard/consulta/nueva', gate: (p) => has(p, 'consultation.create') },
  { path: '/dashboard/acciones/laboratorio', gate: (p) => has(p, 'laboratoryTest.create') },
  { path: '/dashboard/acciones/imagen', gate: (p) => has(p, 'diagnosticimaging.create') },
  { path: '/dashboard/acciones/vacunacion', gate: (p) => has(p, 'vaccination.create') },
  { path: '/dashboard/acciones/hospitalizacion', gate: (p) => has(p, 'hospitalization.create') },
  { path: '/dashboard/acciones/desparasitacion', gate: (p) => has(p, 'deworming.create') },
  { path: '/dashboard/acciones/cirugia', gate: (p) => has(p, 'surgery.create') },
  { path: '/dashboard/acciones/spa', gate: (p) => has(p, 'spa.create') },
  { path: '/dashboard/laboratorio', gate: (p) => has(p, 'laboratoryTest.read') },
  { path: '/dashboard/hospital', gate: (p) => has(p, 'hospitalization.read') },
  { path: '/dashboard/tienda/inventario', gate: (p) => has(p, 'product.read') },
  { path: '/dashboard/tienda/servicios', gate: (p) => has(p, 'service.read') },
  { path: '/dashboard/tienda/promociones', gate: (p) => has(p, 'promotion.read') },
  { path: '/dashboard/tienda/impuestos', gate: (p) => has(p, 'tax.read') },
  { path: '/dashboard/cuentas', gate: (p) => has(p, 'openAccount.read') },
  { path: '/dashboard/facturacion/documentos', gate: (p) => has(p, 'electronicbilling.create') },
  { path: '/dashboard/facturacion/reportes', gate: (p) => has(p, 'electronicbilling.create') },
  { path: '/dashboard/facturacion/habilitacion', gate: (p) => has(p, 'electronicbilling.create') },
  { path: '/dashboard/empleados', gate: (p) => has(p, 'employee.read') },
  { path: '/dashboard/roles', gate: (p) => has(p, 'rolePermissions.read') },
  { path: '/dashboard/catalogos/medicamentos', gate: (p) => has(p, 'prescription.create') },
]

// Los 6 roles base (nombre = como se siembra en base_roles; ver seed_base_roles.sql).
const BASE_ROLE_NAMES = ['Veterinario', 'Recepcionista', 'Auxiliar', 'Cajero', 'Tienda', 'Estetica']

// Invariantes de diseño: permisos que un rol NO debe tener (más allá del gating
// data-driven de la UI). Opción A: el Cajero NO maneja facturación electrónica
// (DIAN) → no debe tener estos permisos, y por tanto no ve Facturación
// electrónica / Documentos / Reportes. Si a un cajero le vuelven a poner DIAN,
// este test lo caza (recuerda correr seed_base_roles.sql + remove_cajero_dian.sql).
const FORBIDDEN_PERMS: Record<string, string[]> = {
  // Opción A: cajero sin facturación electrónica (DIAN).
  Cajero: ['electronicbilling.create', 'electronicbilling.read', 'salesreport.read'],
  // Estética sin acceso a la tienda (no ve/gestiona el catálogo).
  Estetica: [
    'product.read',
    'service.read',
    'promotion.read',
    'tax.read',
    'productCategory.read',
    'serviceCategory.read',
  ],
}
/** Ítems del sidebar que ciertos roles NO deben ver (aserción explícita adicional). */
const FORBIDDEN_ITEMS: Record<string, string[]> = {
  Cajero: ['Facturación electrónica', 'Documentos', 'Reportes'],
  Estetica: ['Tienda'],
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
// Contador monotónico + tiempo + azar → sufijo numérico ÚNICO por llamada (evita
// choques de identificador/código/email tanto dentro de un run como entre runs).
let __seq = 0
function uniqueSuffix(): string {
  __seq += 1
  const t = Date.now().toString().slice(-7)
  const s = (__seq % 100).toString().padStart(2, '0')
  const r = Math.floor(Math.random() * 90 + 10)
  return `${t}${s}${r}` // 11 dígitos
}

/** Cadena de N letras al azar (para nombres). El código de empleado que autogenera
 *  el backend descarta dígitos y usa las LETRAS del nombre → hay que variar letras. */
function randomAlpha(n: number): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let out = ''
  for (let i = 0; i < n; i++) out += A[Math.floor(Math.random() * A.length)]
  return out
}

const PASSWORD = 'Empleado1234*'

/** Espera a que el loader global (que intercepta clicks) desaparezca. */
async function waitLoaderGone(page: Page): Promise<void> {
  await page
    .locator('.page-loader')
    .waitFor({ state: 'detached', timeout: 20_000 })
    .catch(() => {})
}

/**
 * Selecciona una opción de un v-select de Vuetify. `label` es el texto (base, sin
 * asterisco) del campo. Clickea el `.v-field` (no el input, que está tapado) tras
 * esperar el loader global. Espera a que carguen los items (cascada geográfica).
 */
async function vSelect(page: Page, label: string, which: 'first' | string): Promise<void> {
  await waitLoaderGone(page)
  const input = page.locator('.v-input', { hasText: label }).first()
  await input.locator('.v-field').click()
  const options = page.locator('.v-overlay-container .v-list-item')
  await options.first().waitFor({ state: 'visible', timeout: 15_000 })
  if (which === 'first') await options.first().click()
  else await page.locator('.v-overlay-container .v-list-item', { hasText: which }).first().click()
  await options
    .first()
    .waitFor({ state: 'hidden' })
    .catch(() => {})
}

interface RegisteredCompany {
  identifier: string
  adminName: string
  adminEmail: string
}

interface SignupValues {
  identifier: string
  companyName: string
  fiscalEmail: string
  adminName: string
  adminEmail: string
}

/**
 * Genera valores de signup RANDOM. Clave: el backend AUTOGENERA el código del
 * empleado admin a partir de las LETRAS del nombre-empresa (prefijo) y del
 * nombre-admin (sufijo), descartando dígitos. Por eso el nombre del admin lleva
 * 10 letras al azar → su código autogenerado es único y no choca en runs repetidos
 * (antes "Dueño"/"Veterinaria QA" fijos daban siempre "VQ-DUENO" → Duplicate entry).
 */
function buildSignupValues(): SignupValues {
  const s = uniqueSuffix()
  return {
    identifier: `9${s}`.slice(0, 12), // NIT numérico 5–15 dígitos, único
    companyName: `Vet ${randomAlpha(4)} ${s}`,
    fiscalEmail: `fiscal.${s}@vetqa.test`,
    adminName: `${randomAlpha(5)} ${randomAlpha(5)}`, // sufijo del código admin = 10 letras únicas
    adminEmail: `admin.${s}@vetqa.test`,
  }
}

/** Rellena el formulario de signup (sin enviar) con los valores dados. */
async function fillSignup(page: Page, v: SignupValues): Promise<void> {
  await page.goto('/registro')
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
  // Empresa (documentType queda en NIT por defecto).
  await page.getByLabel('Número de documento *').fill(v.identifier)
  await page.getByLabel('Razón social *').fill(v.companyName)
  await vSelect(page, 'Régimen tributario', 'first')
  await page.getByLabel('Correo fiscal *').fill(v.fiscalEmail)
  await page.getByLabel('Dirección (opcional)').fill('Calle QA 123')
  await page.getByLabel('Teléfono de contacto (opcional)').fill('3001234567')
  // Cascada geográfica real (seed 022): primer país → primer estado → primera ciudad.
  await vSelect(page, 'País', 'first')
  await vSelect(page, 'Estado / Departamento', 'first')
  await vSelect(page, 'Ciudad', 'first')
  // Usuario administrador.
  await page.getByLabel('Nombre completo *').fill(v.adminName)
  await page.getByLabel('Email *').fill(v.adminEmail)
  await page.getByLabel('Contraseña *').fill(PASSWORD)
  await waitLoaderGone(page)
}

/** Rellena y envía el signup real. Deja la sesión iniciada como admin en el dashboard. */
async function registerCompany(page: Page): Promise<RegisteredCompany> {
  const v = buildSignupValues()
  await fillSignup(page, v)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  // Auto-login → dashboard.
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  await expect(page.locator('.sidebar')).toBeVisible()
  return { identifier: v.identifier, adminName: v.adminName, adminEmail: v.adminEmail }
}

/** Lee los permisos reales del usuario logueado desde /auth/me (capturando la red). */
async function readPermissionsViaMe(page: Page): Promise<Perms> {
  // Fuerza una recarga del dashboard para garantizar un /auth/me fresco.
  const meProm = page.waitForResponse(
    (r) => r.url().includes('/auth/me') && r.request().method() === 'GET' && r.ok(),
    { timeout: 20_000 },
  )
  await page.goto('/dashboard')
  const body = (await (await meProm).json()) as { permissions?: string[] }
  return new Set<string>(body.permissions ?? [])
}

/** Crea un empleado real con un único rol asignado. Devuelve sus credenciales. */
async function createEmployee(
  adminPage: Page,
  roleName: string,
): Promise<{ code: string; password: string }> {
  const suffix = uniqueSuffix()
  const code = `E${suffix}`.slice(0, 20)
  // Se asume que adminPage ya está en /dashboard/empleados (lo hace el beforeAll una vez).
  await adminPage.getByRole('button', { name: 'Nuevo empleado' }).click()
  const dialog = adminPage.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Los BaseInput de este modal no reciben id (BaseField sin slot #default), así que
  // se ubican por placeholder (estables y únicos).
  await dialog.getByPlaceholder('Mariana Soto Quispe').fill(`Empleado ${roleName} ${suffix}`)
  await dialog.getByPlaceholder('VET-001').fill(code)
  await dialog.getByPlaceholder('mariana.soto@vetrina.com').fill(`emp.${suffix}@vetqa.test`)
  await dialog.getByPlaceholder('••••••••').fill(PASSWORD)
  // Selecciona EXCLUSIVAMENTE el rol correspondiente (tile de RoleSelectorGrid).
  const roleTile = dialog.getByRole('button', { name: roleName })
  await roleTile.click()
  await expect(roleTile, `el tile del rol "${roleName}" debe quedar seleccionado`).toHaveClass(
    /selected/,
  )
  await dialog.getByRole('button', { name: 'Crear empleado' }).click()
  // Al crear, el form cierra y se abre el drawer del empleado (selectedId). Confirmamos
  // el cierre del form (su botón submit desaparece) y cerramos el drawer con Escape.
  await expect(
    adminPage.getByRole('button', { name: 'Crear empleado' }),
    `el empleado "${roleName}" debe crearse (el form debe cerrarse)`,
  ).toBeHidden({ timeout: 15_000 })
  await adminPage.keyboard.press('Escape')
  await expect(adminPage.getByRole('button', { name: 'Nuevo empleado' })).toBeVisible({
    timeout: 10_000,
  })
  return { code, password: PASSWORD }
}

/** Adjunta un colector de respuestas HTTP con status >= 400 (para asegurar 0 errores). */
function trackHttpErrors(page: Page): { drain: () => { url: string; status: number }[] } {
  const bad: { url: string; status: number }[] = []
  page.on('response', (r) => {
    const s = r.status()
    // 401 lo maneja el interceptor (refresh); no lo contamos como error de servicio.
    if (s >= 400 && s !== 401) bad.push({ url: new URL(r.url()).pathname, status: s })
  })
  return {
    drain: () => {
      const copy = [...bad]
      bad.length = 0
      return copy
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preflight: que la falta de backend FALLE, y no cuelgue
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Esta suite es la única que conduce un navegador real en su preparación: el
 * `beforeAll` registra una empresa rellenando el formulario, y todas sus esperas
 * son de interfaz —`toBeVisible`, `waitForURL`, la cascada geográfica—. Sin
 * backend ninguna de ellas falla: se agotan una detrás de otra contra pantallas
 * que nunca se pueblan, y `npx playwright test` se queda ahí hasta que alguien lo
 * mata. Un test que cuelga es peor que uno que falla: el que falla se ve, y el
 * que cuelga se lleva por delante la pasada entera —ni siquiera llega a escribir
 * un código de salida—.
 *
 * <p>El patrón correcto ya estaba en el repositorio: `agenda`, `caja` y `kardex`
 * empiezan su preparación por una petición de API, así que con el backend caído
 * mueren en segundos con un estado que se lee. Esto es lo mismo, reducido a lo
 * único que hace falta comprobar: que hay algo escuchando detrás del proxy.
 */
const API = '/api/v1'

/** Suficiente para un backend arrancando y despreciable frente a los 240 s del hook. */
const PREFLIGHT_TIMEOUT_MS = 10_000

const SIN_BACKEND =
  'Falta el backend. Esta suite registra una empresa REAL contra él (nada mockeado), ' +
  'así que sin backend no hay nada que probar. Levanta el backend y su base de datos, ' +
  'y vuelve a correrla.'

/**
 * Falla —rápido y diciendo por qué— si no hay backend detrás del proxy `/api`
 * del dev server.
 *
 * <p>`GET /auth/me` sin credenciales es la sonda: no escribe nada, no necesita
 * sesión y distingue las dos cosas que hay que distinguir. Con backend arriba
 * responde 401/403 —da igual cuál—; con el backend caído, el proxy de Vite no
 * tiene a quién reenviar y devuelve 5xx, o la petición ni siquiera sale. Por eso
 * el corte está en 500 y no en «respondió 200».
 */
async function exigirBackendArriba(ctx: APIRequestContext): Promise<void> {
  let status: number
  try {
    const res = await ctx.get(`${API}/auth/me`, {
      failOnStatusCode: false,
      timeout: PREFLIGHT_TIMEOUT_MS,
    })
    status = res.status()
  } catch (causa) {
    // El `cause` va adjunto y no interpolado: el informe de Playwright enseña la
    // cadena entera, así que el ECONNREFUSED con su puerto sobrevive al mensaje.
    throw new Error(`${SIN_BACKEND} (la petición ni siquiera llegó a salir)`, { cause: causa })
  }
  if (status >= 500) {
    throw new Error(`${SIN_BACKEND} (GET ${API}/auth/me respondió ${status} por el proxy)`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite (serial: se registra 1 empresa y se reutiliza)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registro de veterinaria + roles base + visibilidad por permiso', () => {
  // Sin 'serial': un fallo de un rol NO salta los demás (queremos ver TODOS los
  // hallazgos). La empresa + empleados se crean una vez en beforeAll (correr con
  // --workers=1 para un solo registro compartido y máxima eficiencia).
  test.setTimeout(120_000)

  let browserRef: Browser
  let adminCtx: BrowserContext
  let adminPage: Page
  let company: RegisteredCompany
  let adminPerms: Perms
  const employeeByRole: Record<string, { code: string; password: string }> = {}

  test.beforeAll(async ({ browser, playwright }, testInfo) => {
    test.setTimeout(240_000) // registro real + lectura /me + 6 empleados: sube el timeout del hook
    // Lo PRIMERO, antes de abrir un solo contexto de navegador: ver el comentario
    // de `exigirBackendArriba`. El contexto de API hereda el `baseURL` del
    // proyecto, así que la ruta relativa sale por el proxy `/api` del dev server.
    const sonda = await playwright.request.newContext({ baseURL: testInfo.project.use.baseURL })
    try {
      await exigirBackendArriba(sonda)
    } finally {
      await sonda.dispose()
    }
    browserRef = browser
    adminCtx = await browser.newContext()
    adminPage = await adminCtx.newPage()
    company = await registerCompany(adminPage)
    adminPerms = await readPermissionsViaMe(adminPage)
    // Crea un empleado por cada rol base (para entrar luego como cada uno).
    await adminPage.goto('/dashboard/empleados')
    await expect(adminPage.getByRole('button', { name: 'Nuevo empleado' })).toBeVisible()
    for (const roleName of BASE_ROLE_NAMES) {
      employeeByRole[roleName] = await createEmployee(adminPage, roleName)
    }
  })

  test.afterAll(async () => {
    await adminCtx?.close()
  })

  // ── 1) La empresa y el admin quedan registrados y logueados ────────────────
  test('registro: la empresa y el admin se crean y el admin queda logueado en el dashboard', async () => {
    await adminPage.goto('/dashboard')
    await expect(adminPage.locator('.sidebar')).toBeVisible()
    // El admin (dueño) debe poder ver TODAS las secciones gated (tiene admin.all o el set completo).
    for (const { label, gate } of SIDEBAR_GATES) {
      const shouldSee = gate(adminPerms)
      expect(
        shouldSee,
        `admin debería tener acceso a "${label}" (perms: ${[...adminPerms].join(',')})`,
      ).toBe(true)
      await expect(
        adminPage.getByRole('button', { name: label }),
        `el admin debe ver "${label}" en el sidebar`,
      ).toBeVisible()
    }
  })

  // ── 2) Se crearon ADMIN + los 6 roles base ─────────────────────────────────
  test('roles base: se crean ADMIN + los 6 (Veterinario, Recepcionista, Auxiliar, Cajero, Tienda, Estetica)', async () => {
    await adminPage.goto('/dashboard/roles')
    await expect(adminPage.getByRole('heading', { name: /Roles/ })).toBeVisible()
    for (const roleName of BASE_ROLE_NAMES) {
      await expect(
        adminPage.getByText(roleName, { exact: true }).first(),
        `debe existir el rol base "${roleName}"`,
      ).toBeVisible()
    }
    // Debe haber al menos 7 roles (ADMIN + 6).
    const roleCards = adminPage.locator('[data-role-card], .role-card')
    // Fallback robusto: contar las tarjetas por nombre conocido no aplica a ADMIN;
    // se valida que además del set base exista al menos una tarjeta más (ADMIN).
    const count = await roleCards.count()
    if (count > 0)
      expect(count, 'debe haber ADMIN + los 6 roles base (>=7)').toBeGreaterThanOrEqual(7)
  })

  // ── 3) El dueño quedó asignado SOLO al rol ADMIN ───────────────────────────
  test('registro: el dueño (admin) queda asignado únicamente al rol ADMIN, no a los base', async () => {
    await adminPage.goto('/dashboard/empleados')
    await expect(adminPage.getByText(company.adminName).first()).toBeVisible()
    // La fila del dueño NO debe mostrar ninguno de los 6 roles base (solo ADMIN).
    // Se acota al contenedor tipo "fila" más cercano que contiene el nombre del dueño.
    const ownerRow = adminPage
      .locator('li, tr, [class*="row"], [class*="item"], [class*="empleado"]', {
        hasText: company.adminName,
      })
      .first()
    for (const roleName of BASE_ROLE_NAMES) {
      await expect(
        ownerRow.getByText(roleName, { exact: true }),
        `el dueño NO debe estar en el rol "${roleName}" (solo ADMIN)`,
      ).toHaveCount(0)
    }
  })

  // ── 3b) Registro con identificador de empresa DUPLICADO → rechazado ────────
  test('registro duplicado: reintentar con un identificador de empresa ya usado devuelve 400 y NO auto-loguea', async () => {
    const ctx = await browserRef.newContext()
    const page = await ctx.newPage()
    try {
      // Todos los valores random EXCEPTO el identificador, que se reusa del registro previo.
      const dup = buildSignupValues()
      dup.identifier = company.identifier
      await fillSignup(page, dup)
      const respProm = page.waitForResponse(
        (r) => r.url().includes('/register') && r.request().method() === 'POST',
        { timeout: 20_000 },
      )
      await page.getByRole('button', { name: 'Crear cuenta' }).click()
      const resp = await respProm
      expect(resp.status(), 'registrar con identificador duplicado debe devolver 400').toBe(400)
      // No debe auto-loguear: permanece en /registro y muestra el banner de error
      // (el v-alert de submitError; se filtra por texto para no chocar con los
      // mensajes de campo que Vuetify también expone como role="alert").
      await expect(page, 'no debe entrar al dashboard con identificador duplicado').toHaveURL(
        /\/registro/,
      )
      await expect(
        page.locator('.v-alert').filter({ hasText: /in use|uso|No se pudo crear/i }),
        'debe mostrarse el error de duplicidad en el signup',
      ).toBeVisible()
    } finally {
      await ctx.close()
    }
  })

  // ── 4) Por cada rol base: login real + visibilidad data-driven + rutas + sin errores HTTP ──
  for (const roleName of BASE_ROLE_NAMES) {
    test(`rol "${roleName}": ve exactamente lo que sus permisos permiten, accede a lo suyo, se le bloquea el resto y no hay errores HTTP`, async () => {
      // `expect(...).toBeTruthy()` corta la ejecución pero no estrecha el tipo, así
      // que `creds.code` seguía siendo un acceso sobre `posible undefined`.
      const creds = exigir(
        employeeByRole[roleName],
        `el empleado de "${roleName}" (debió crearse en beforeAll)`,
      )

      const ctx = await browserRef.newContext()
      const page = await ctx.newPage()
      const http = trackHttpErrors(page)
      try {
        // Login real como el empleado del rol.
        const meProm = page.waitForResponse(
          (r) => r.url().includes('/auth/me') && r.request().method() === 'GET' && r.ok(),
          { timeout: 20_000 },
        )
        await login(page, creds.code, creds.password)
        await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
        const perms = new Set<string>(
          ((await (await meProm).json()) as { permissions?: string[] }).permissions ?? [],
        )
        expect(
          perms.size,
          `el rol "${roleName}" debe tener al menos 1 permiso real`,
        ).toBeGreaterThan(0)

        // (a0) INVARIANTE DE DISEÑO: permisos que el rol NO debe tener.
        //   - Cajero → sin facturación electrónica (DIAN, Opción A).
        //   - Estetica → sin acceso a la tienda (product/service/... read).
        for (const forbidden of FORBIDDEN_PERMS[roleName] ?? []) {
          expect(
            perms.has(forbidden),
            `rol "${roleName}": NO debe tener el permiso "${forbidden}" (decisión de diseño; corre seed_base_roles.sql + remove_cajero_dian.sql / remove_spa_tienda.sql)`,
          ).toBe(false)
        }
        // Aserción explícita: ítems del sidebar que este rol NO debe ver
        // (Cajero → facturación electrónica; Estetica → Tienda).
        for (const label of FORBIDDEN_ITEMS[roleName] ?? []) {
          await expect(
            page.getByRole('button', { name: label }),
            `rol "${roleName}": "${label}" NO debe verse (decisión de diseño)`,
          ).toHaveCount(0)
        }

        // (a) VISIBILIDAD DEL SIDEBAR = permisos reales (data-driven).
        await expect(page.locator('.sidebar')).toBeVisible()
        for (const { label, gate } of SIDEBAR_GATES) {
          const expected = gate(perms)
          await expect(
            page.getByRole('button', { name: label }),
            `rol "${roleName}": "${label}" debe estar ${expected ? 'VISIBLE' : 'OCULTO'} (perms reales)`,
          ).toHaveCount(expected ? 1 : 0)
        }

        // (b) ACCESO A RUTAS: permitidas cargan (URL se mantiene); prohibidas redirigen a home.
        for (const { path, gate } of ROUTE_GATES) {
          const allowed = gate(perms)
          http.drain() // limpia el colector para medir SOLO esta navegación
          await page.goto(path)
          await page.waitForLoadState('networkidle').catch(() => {})
          if (allowed) {
            await expect(page, `rol "${roleName}": debería PODER entrar a ${path}`).toHaveURL(
              new RegExp(path.replace(/[/]/g, '\\/')),
            )
            // (c) SIN ERRORES HTTP en una pantalla permitida.
            const errs = http.drain()
            expect(
              errs,
              `rol "${roleName}": ${path} no debe producir respuestas HTTP >= 400 → ${JSON.stringify(errs)}`,
            ).toEqual([])
          } else {
            // El guard redirige a /dashboard (home) cuando falta el permiso.
            await expect(
              page,
              `rol "${roleName}": NO debería entrar a ${path} (debe redirigir a /dashboard)`,
            ).toHaveURL(/\/dashboard$/)
          }
        }
      } finally {
        await ctx.close()
      }
    })
  }
})
