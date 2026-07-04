import { type Page, type Locator, expect } from '@playwright/test'
import { login } from './auth'

/**
 * Helpers para el wizard de Nueva Consulta.
 *
 * El wizard tiene 2 pasos:
 *   Paso 1 (Paciente): buscar/crear PROPIETARIO -> elegir/crear MASCOTA
 *   Paso 2 (Consulta): fecha, tipo, anamnesis (+ opcionales) -> Guardar
 *
 * Notas de diseño (verificadas contra el código):
 * - Inputs usan BaseField(<label for>) + BaseInput(<input id>), así que
 *   getByLabel(regex) resuelve al input real.
 * - Los selects (BaseSelect) son un <button role="combobox"> + <ul role="listbox">
 *   teleportado a body: se abren con click y la opción es role="option".
 * - Documento/teléfono/chip/peso/tamaño se SANITIZAN al teclear (los chars
 *   inválidos se eliminan), por eso los casos de error atacan longitud/valor.
 * - El botón del footer SIEMPRE está activo (no se deshabilita por campos
 *   faltantes): al hacer click, si faltan requeridos, cada paso dispara su
 *   validación animada (shake + bordes rojos + banner) y NO avanza. Mismo patrón
 *   `submitted` de los modales de acciones. Las validaciones de formato también
 *   aparecen al hacer blur del campo.
 */

export const NUEVA_CONSULTA_URL = '/dashboard/consulta/nueva'

export async function gotoNuevaConsulta(page: Page): Promise<void> {
  await login(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await page.goto(NUEVA_CONSULTA_URL)
  await expect(
    page.getByRole('heading', { name: /Quién es el propietario/ }),
  ).toBeVisible()
}

// ── Propietario ──────────────────────────────────────────────────────────────

export function ownerSearch(page: Page): Locator {
  return page.getByPlaceholder(/Buscar propietario/)
}

export async function searchOwner(page: Page, term: string): Promise<void> {
  await ownerSearch(page).fill(term)
}

/** Un término aleatorio-ish improbable de existir en la BD. */
export function unlikelyTerm(): string {
  return 'zzqx-no-existe-' + '9271'
}

export async function startCreateOwnerFromEmpty(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Registrar nuevo propietario' }).click()
  await expect(
    page.getByRole('heading', { name: 'Registrar nuevo propietario' }),
  ).toBeVisible()
}

/** El botón del footer del wizard (label cambia según el sub-estado). */
export function footerNext(page: Page, label: RegExp | string): Locator {
  return page.getByRole('button', { name: label })
}

/** Banner-guía que muestran OwnerForm/PetForm/PasoConsulta al intentar avanzar
 *  con requeridos faltantes (mismo texto en los 3). */
export const REVISA_CAMPOS_MSG = 'Revisa los campos marcados antes de continuar.'

/**
 * Verifica que un paso de FORMULARIO del wizard (crear propietario / crear
 * mascota / datos de consulta) bloqueó el avance tras click en el botón activo:
 *  1. banner-guía visible,
 *  2. al menos un control marcado inválido (`.invalid` → borde rojo + shake),
 *  3. seguimos en el mismo paso (heading esperado visible).
 */
export async function expectFormBlocked(page: Page, staysHeading: RegExp): Promise<void> {
  await expect(page.getByText(REVISA_CAMPOS_MSG)).toBeVisible()
  await expect(page.locator('.invalid').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: staysHeading })).toBeVisible()
}

/** Abre un BaseSelect por el label de su campo y elige una opción. */
export async function pickSelect(
  page: Page,
  fieldLabel: RegExp | string,
  optionName?: RegExp | string,
): Promise<void> {
  await page.getByRole('combobox', { name: fieldLabel }).click()
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  const option = optionName
    ? listbox.getByRole('option', { name: optionName })
    : listbox.getByRole('option').first()
  await option.click()
}

export interface OwnerData {
  name: string
  document: string
  phone: string
  email?: string
}

/**
 * Sufijo único por-ejecución (timestamp base36 + azar). Alfanumérico, corto,
 * apto para documentos (5–20 chars, sin espacios ni símbolos).
 */
export function uniqueSuffix(): string {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toLowerCase()
}

/** Teléfono válido aleatorio: '3' + 9 dígitos = 10 dígitos (rango 7–15). */
function randomPhone(): string {
  return '3' + String(Math.floor(100000000 + Math.random() * 900000000))
}

/**
 * Propietario VÁLIDO y ÚNICO por llamada. Úsalo en todo caso que ESCRIBE en la
 * BD (crear propietario) para no chocar con el documento de un registro previo.
 * Solo usá datos fijos cuando el caso pruebe justamente un conflicto (p. ej.
 * dos clientes con el mismo documento).
 */
export function randomOwner(overrides: Partial<OwnerData> = {}): OwnerData {
  const s = uniqueSuffix()
  return {
    name: `Propietario E2E ${s}`,
    document: `E2E${s}`.slice(0, 20),
    phone: randomPhone(),
    email: '',
    ...overrides,
  }
}

/**
 * Fixture FIJO — solo para casos que NO escriben en la BD (p. ej. precargar un
 * nombre y luego cancelar). Para crear propietarios usá {@link randomOwner}.
 */
export const validOwner: OwnerData = {
  name: 'Paciente E2E Test',
  document: 'E2E12345',
  phone: '3001234567',
  email: '',
}

/**
 * Rellena el formulario de propietario con datos válidos y la cascada geo
 * (país -> estado -> ciudad) eligiendo la primera opción disponible.
 * DEPENDE de que el backend tenga catálogo geográfico sembrado.
 */
export async function fillValidOwner(page: Page, data: OwnerData = randomOwner()): Promise<void> {
  await page.getByLabel(/Nombre completo/).fill(data.name)
  await page.getByLabel(/Documento de identidad/).fill(data.document)
  await page.getByLabel(/Teléfono/).fill(data.phone)
  if (data.email) await page.getByLabel(/Email/).fill(data.email)
  await pickSelect(page, /Tipo de documento/) // primera opción (Cédula de ciudadanía)
  await page.getByRole('radio', { name: 'Natural' }).click()
  await pickSelect(page, /País/)
  await pickSelect(page, /Estado/)
  await pickSelect(page, /Ciudad/)
}

/**
 * Crea un propietario nuevo por la UI y lo deja seleccionado (para poder
 * llegar a la sección de mascota / paso 2). Escribe datos reales en la BD.
 */
export async function createAndSelectOwner(
  page: Page,
  data: OwnerData = randomOwner(),
): Promise<OwnerData> {
  await startCreateOwnerFromEmpty(page)
  await fillValidOwner(page, data)
  await footerNext(page, 'Guardar propietario').click()
  // Tras crear, aparece la sección de mascota.
  await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
  return data
}

/**
 * Crea propietario + mascota nuevos (datos aleatorios únicos), deja la mascota
 * seleccionada y devuelve ambos datos. Útil para sembrar un "paciente" reutilizable.
 */
export async function createOwnerWithPet(
  page: Page,
): Promise<{ owner: OwnerData; pet: PetData }> {
  const owner = await createAndSelectOwner(page)
  await startCreatePet(page)
  const pet = randomPet()
  await fillValidPet(page, pet)
  await footerNext(page, 'Guardar mascota').click()
  await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
  return { owner, pet }
}

/**
 * Busca un propietario EXISTENTE por su documento, lo selecciona, elige su
 * mascota por nombre y avanza al paso 2 (consulta) — con el draft LIMPIO (sin
 * procedimientos), reutilizando entidades ya creadas en la BD. Es también el
 * flujo real de "paciente recurrente".
 */
export async function selectExistingOwnerAndPet(
  page: Page,
  owner: OwnerData,
  petName: string,
): Promise<void> {
  await login(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await page.goto(NUEVA_CONSULTA_URL)
  await searchOwner(page, owner.document)
  // Solo las filas de resultado (.row); excluye el botón "¿No encuentras a "<query>"?"
  // (.not-found), cuyo texto también contiene el documento buscado.
  await page
    .locator('.results')
    .locator('button.row', { hasText: owner.document })
    .first()
    .click()
  await page.getByRole('button').filter({ hasText: petName }).first().click()
  await footerNext(page, 'Continuar a la consulta').click()
  await expect(page.getByRole('heading', { name: /Datos de la consulta/ })).toBeVisible()
}

// ── Mascota ──────────────────────────────────────────────────────────────────

export interface PetData {
  name: string
  weight: string
}

export const validPet: PetData = { name: 'Firulais E2E', weight: '5.4' }

/**
 * Mascota VÁLIDA y ÚNICA por llamada. Úsala en todo caso que ESCRIBE en la BD.
 * No se envía `code`: el backend lo permite null (ya no hay unicidad ni autogen).
 */
export function randomPet(overrides: Partial<PetData> = {}): PetData {
  return { name: `Mascota E2E ${uniqueSuffix()}`, weight: '5.4', ...overrides }
}

/** Abre el formulario de mascota (desde estado vacío o desde la lista). */
export async function startCreatePet(page: Page): Promise<void> {
  const primeraVez = page.getByRole('button', { name: 'Registrar primera mascota' })
  const nueva = page.getByRole('button', { name: 'Nueva mascota' })
  if (await primeraVez.isVisible().catch(() => false)) {
    await primeraVez.click()
  } else {
    await nueva.click()
  }
  await expect(page.getByRole('heading', { name: 'Registrar nueva mascota' })).toBeVisible()
}

/**
 * Elige una fecha de nacimiento válida (pasada) en el DateInput (vue-datepicker,
 * `editable=false`): abre el calendario, retrocede un año y clickea el primer
 * día seleccionable del mes mostrado.
 */
export async function pickBirthDate(page: Page): Promise<void> {
  await page.getByLabel(/Fecha de nacimiento/).click()
  const panel = page.locator('.mx-datepicker-main')
  await expect(panel).toBeVisible()
  await panel.locator('.mx-btn-icon-double-left').click() // -1 año ⇒ nunca futura
  await panel
    .locator('.mx-table-date .cell:not(.not-current-month):not(.disabled)')
    .first()
    .click()
  await expect(panel).toBeHidden()
}

/**
 * Rellena SOLO los 6 campos REQUERIDOS de la mascota (nombre, especie, raza,
 * color, género, estado reproductivo) — deja fuera los OPCIONALES (fecha de
 * nacimiento, peso, unidad de peso, tamaño, tipo). Con esto "Guardar mascota"
 * valida OK al click (el botón siempre está activo). DEPENDE de catálogos sembrados.
 */
export async function fillRequiredPet(page: Page, data: PetData = randomPet()): Promise<void> {
  await page.getByLabel(/^Nombre/).fill(data.name)
  await pickSelect(page, /Especie/)
  await pickSelect(page, /Raza/)
  await pickSelect(page, /Color/)
  await pickSelect(page, /Género/, 'Macho')
  await page.getByRole('radio', { name: 'Desconocido' }).click()
}

/**
 * Rellena la mascota con datos VÁLIDOS y ÚNICOS (requeridos + peso, por
 * realismo) y deja "Guardar mascota" habilitado. No carga chip → `code` va null.
 */
export async function fillValidPet(page: Page, data: PetData = randomPet()): Promise<void> {
  await fillRequiredPet(page, data)
  await page.getByLabel(/^Peso/).fill(data.weight)
}

// ── Paso 2: consulta ─────────────────────────────────────────────────────────

export function anamnesis(page: Page): Locator {
  return page.getByPlaceholder(/Motivo de consulta/)
}

/**
 * Auditoría "gráfica" del marcador de obligatorio: recorre los BaseField (`.field`)
 * visibles y separa las etiquetas que muestran el asterisco `*` (`.required`) de
 * las que no. Sirve para verificar que el `*` marca EXACTAMENTE los campos
 * obligatorios y ninguno de los opcionales. Devuelve ambos sets ordenados.
 */
export async function asteriskAudit(
  page: Page,
): Promise<{ required: string[]; optional: string[] }> {
  const fields = page.locator('.field:visible')
  const n = await fields.count()
  const required: string[] = []
  const optional: string[] = []
  for (let i = 0; i < n; i++) {
    const f = fields.nth(i)
    const label = (await f.locator('label.label').first().innerText().catch(() => ''))
      .replace('*', '')
      .trim()
    if (!label) continue
    const hasStar = (await f.locator('label.label .required').count()) > 0
    ;(hasStar ? required : optional).push(label)
  }
  return { required: required.sort(), optional: optional.sort() }
}

/**
 * Rastrea las respuestas de ESCRITURA del API (`/api/…`, métodos no-GET) y
 * permite asertar que TODAS dieron un código HTTP exitoso (< 400). Sirve para
 * verificar de punta a punta que los servicios respondieron OK. Instálalo al
 * inicio del test (antes de disparar acciones) y llamá `assertAllOk()` al final.
 */
export function trackApiWrites(page: Page): { assertAllOk: () => void } {
  const failures: string[] = []
  page.on('response', (res) => {
    const method = res.request().method()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return
    if (!res.url().includes('/api/')) return
    if (res.status() >= 400) {
      failures.push(`${method} ${new URL(res.url()).pathname} → ${res.status()}`)
    }
  })
  return {
    assertAllOk() {
      expect(failures, `Respuestas de escritura con error:\n${failures.join('\n')}`).toEqual([])
    },
  }
}

/** Confirma el modal de "¿Guardar la consulta?" que abre el botón "Guardar consulta". */
export async function confirmarGuardarConsulta(page: Page): Promise<void> {
  await footerNext(page, 'Guardar consulta').click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'Confirmar y guardar' }).click()
}

/**
 * Cierra el flujo de guardado: confirma el modal "¿Guardar la consulta?", luego
 * atraviesa el modal de FACTURACIÓN integrado, y espera la pantalla de éxito.
 *  - 'solo-guardar' (default): elige "Solo guardar la consulta" (sin cobro).
 *  - 'abrir-cuenta': confirma "Guardar y abrir cuenta" (crea cuenta + cargo "Consulta").
 */
export async function guardarConsulta(
  page: Page,
  modo: 'solo-guardar' | 'abrir-cuenta' = 'solo-guardar',
): Promise<void> {
  await confirmarGuardarConsulta(page)
  const billing = page.getByRole('dialog', { name: /Facturación/ })
  await expect(billing).toBeVisible()
  if (modo === 'solo-guardar') {
    await billing.getByRole('button', { name: /Solo guardar la consulta/ }).click()
    // Consulta ya guardada → el primario en "solo guardar" dice "Salir".
    await billing.getByRole('button', { name: 'Salir' }).click()
  } else {
    // Destino por defecto 'new' con el servicio "Consulta" precargado (autoConsulta).
    await billing.getByRole('button', { name: /Guardar y abrir cuenta/ }).click()
  }
  await expect(page).toHaveURL(/exito|consulta-nueva-exito/)
}

// ── Paso 2: procedimientos (modales de acciones rápidas) ─────────────────────

/**
 * Abre el modal de una acción rápida (procedimiento) clickeando su tile por el
 * texto del label, y devuelve el `dialog` (ya visible) para encadenar asserts.
 * `tile` matchea el nombre accesible del botón-tile (label + subtítulo).
 */
export async function openQuickAction(
  page: Page,
  tile: RegExp,
  dialogTitle: string | RegExp,
): Promise<Locator> {
  await page.getByRole('button', { name: tile }).click()
  const dialog = page.getByRole('dialog', { name: dialogTitle })
  await expect(dialog).toBeVisible()
  return dialog
}

/**
 * Crea (inline) y selecciona un valor en un `SearchableSelect` (dropdown de
 * catálogo creable) dentro del modal abierto, ubicándolo por el label de su
 * BaseField. Escribe un tipo de catálogo NUEVO en la BD con nombre único, así
 * que el caso no depende de que el catálogo esté sembrado.
 */
export async function createInSearchable(
  page: Page,
  fieldLabel: string,
  name: string,
): Promise<void> {
  const field = page.getByRole('dialog').locator('.field', { hasText: fieldLabel }).first()
  await field.locator('button.trigger').click()
  await field.getByPlaceholder(/Buscar/).fill(name)
  // El botón "Crear" abre el form de creación en @mousedown y se desmonta en el
  // acto; un `.click()` de Playwright reintenta y termina cerrando el panel. Por
  // eso disparamos SOLO el mousedown (como el press de un usuario real).
  // `startCreate` ya precarga el campo "Nombre" con lo tecleado en la búsqueda.
  await field.getByRole('button', { name: /^Crear/ }).dispatchEvent('mousedown')
  await field.getByRole('button', { name: 'Crear y seleccionar' }).click()
  // El trigger debe quedar mostrando el valor creado → confirma que se seleccionó
  // (si el POST de creación fallara, el panel seguiría abierto en el placeholder).
  await expect(field.locator('button.trigger')).toContainText(name)
}

/**
 * Llena (sin guardar) los campos requeridos de un medicamento en el modal de receta.
 * El diagnóstico ya NO se captura en la receta (se toma de la consulta), por eso no se llena aquí.
 * `opts.diagnosis` se mantiene por compatibilidad pero se ignora.
 */
export async function fillReceta(
  page: Page,
  opts: { diagnosis?: string; medName?: string } = {},
): Promise<void> {
  const d = page.getByRole('dialog', { name: 'Nueva receta' })
  await d.getByLabel(/Nombre del medicamento/).first().fill(opts.medName ?? 'Amoxicilina')
  await d.getByLabel(/Presentación/).first().fill('Comprimido 250 mg')
  await d.getByLabel(/Cantidad/).first().fill('14')
  await d.getByLabel(/Posología/).first().fill('1 comp. cada 12h por 7 días')
}
