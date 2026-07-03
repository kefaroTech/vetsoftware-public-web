import { type Page, type Locator, expect } from '@playwright/test'
import { login } from './auth'
import {
  fillValidOwner,
  fillValidPet,
  createInSearchable,
  uniqueSuffix,
  randomOwner,
  type OwnerData,
} from './consulta'

/**
 * Helpers para las pantallas de PROCEDIMIENTOS de Acciones Clínicas accedidas
 * por el menú principal (independientes de una consulta).
 *
 * Cada pantalla (`/dashboard/acciones/<x>`) es:
 *   1. GATE: PatientCascadePicker → buscar/crear propietario + elegir/crear mascota.
 *   2. Una vez con paciente, breadcrumb + tabla (ListBody) + botón "Nueva X".
 *   3. "Nueva X" abre un FormModal con el paciente FIJO (preSelectedAnimal).
 *
 * Notas verificadas contra el código:
 * - El picker (gate) y sus forms inline de propietario/mascota son los mismos
 *   componentes del wizard → se reutilizan fillValidOwner/fillValidPet.
 * - Dentro de los FormModals, BaseField NO cablea `<label for>` al control, así
 *   que getByLabel NO resuelve: se ubican los campos por su `.field` (hasText) y
 *   el input/textarea interno. Los catálogos creables son SearchableSelect.
 * - El botón de guardar del modal SIEMPRE está activo; al click con requeridos
 *   faltantes salta la validación (`.field .error` + `.invalid`) y no guarda.
 */

export type AccionKey =
  | 'laboratorio'
  | 'imagen'
  | 'vacunacion'
  | 'hospitalizacion'
  | 'desparasitacion'
  | 'cirugia'
  | 'spa'

export const ACCIONES: Record<
  AccionKey,
  { path: string; nueva: RegExp; dialog: RegExp; label: string; endpoint: string }
> = {
  laboratorio: {
    path: '/dashboard/acciones/laboratorio',
    nueva: /Nueva solicitud/,
    dialog: /Nueva solicitud de laboratorio/,
    label: 'Laboratorio',
    endpoint: '/laboratory-tests',
  },
  imagen: {
    path: '/dashboard/acciones/imagen',
    nueva: /Nuevo estudio/,
    dialog: /Nuevo estudio de imagen/,
    label: 'Imagen diagnóstica',
    endpoint: '/diagnostic-imagings',
  },
  vacunacion: {
    path: '/dashboard/acciones/vacunacion',
    nueva: /Nueva vacunación/,
    dialog: /Nueva vacunación/,
    label: 'Vacunación',
    endpoint: '/vaccinations',
  },
  hospitalizacion: {
    path: '/dashboard/acciones/hospitalizacion',
    nueva: /Nueva hospitalización/,
    dialog: /Nueva hospitalización/,
    label: 'Hospitalización',
    endpoint: '/hospitalizations',
  },
  desparasitacion: {
    path: '/dashboard/acciones/desparasitacion',
    nueva: /Nueva desparasitación/,
    dialog: /Nueva desparasitación/,
    label: 'Desparasitación',
    endpoint: '/dewormings',
  },
  cirugia: {
    path: '/dashboard/acciones/cirugia',
    nueva: /Nueva cirugía/,
    dialog: /Nueva cirugía/,
    label: 'Cirugía',
    endpoint: '/surgeries',
  },
  spa: {
    path: '/dashboard/acciones/spa',
    nueva: /Nuevo servicio/,
    dialog: /Nuevo servicio de spa/,
    label: 'Spa',
    endpoint: '/spas',
  },
}

/**
 * Ejecuta `action` (p. ej. click en Guardar) y espera el POST del procedimiento,
 * aseverando que el servicio respondió con un código HTTP 2xx (creación exitosa).
 * Devuelve el status para asserts extra.
 */
export async function expectCreated(
  page: Page,
  endpoint: string,
  action: () => Promise<void>,
): Promise<number> {
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes(endpoint),
      { timeout: 15000 },
    ),
    action(),
  ])
  const status = res.status()
  expect(status, `POST ${endpoint} debe responder 2xx`).toBeGreaterThanOrEqual(200)
  expect(status, `POST ${endpoint} debe responder 2xx`).toBeLessThan(300)
  return status
}

/**
 * Sube (vía API REST real) un archivo de resultado a una solicitud de
 * laboratorio, autenticando con el token de la sesión del navegador (Bearer en
 * localStorage). Se usa para sembrar el "documento de resultado ya cargado" que
 * luego se ve/descarga desde el detalle. Asevera que el POST responda 2xx.
 */
export async function uploadLabResultFile(
  page: Page,
  laboratoryTestId: number,
  fileName: string,
  buffer: Buffer,
  mimeType = 'application/pdf',
): Promise<void> {
  const raw = await page.evaluate(() => localStorage.getItem('vetsoft.auth'))
  const token = raw ? ((JSON.parse(raw) as { token?: string }).token ?? '') : ''
  const res = await page.request.post('/api/v1/laboratory-test-files', {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      laboratoryTestId: String(laboratoryTestId),
      file: { name: fileName, mimeType, buffer },
    },
  })
  expect(res.ok(), `POST /laboratory-test-files → ${res.status()}`).toBeTruthy()
}

export const PICKER_SEARCH = /Buscar por nombre, documento o email/

export async function gotoAccion(page: Page, key: AccionKey): Promise<void> {
  await login(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await page.goto(ACCIONES[key].path)
  await expect(page.getByPlaceholder(PICKER_SEARCH)).toBeVisible()
}

// ── Picker (gate) ────────────────────────────────────────────────────────────

export interface SeededPatient {
  owner: OwnerData
  petName: string
}

/**
 * Crea (inline en el picker) un propietario y una mascota nuevos y los deja
 * seleccionados (el gate se resuelve → desaparece el buscador). Escribe datos
 * reales y únicos en la BD. Devuelve owner + nombre de mascota para reusar.
 */
export async function pickerCreateOwnerAndPet(page: Page): Promise<SeededPatient> {
  // Propietario nuevo
  await page.getByRole('button', { name: /Crear propietario nuevo/ }).first().click()
  const owner = randomOwner()
  await fillValidOwner(page, owner)
  await page.getByRole('button', { name: 'Crear y seleccionar' }).click()
  // Mascota nueva (propietario recién creado no tiene mascotas → estado vacío)
  const petName = `Mascota ACC ${uniqueSuffix()}`
  await page.getByRole('button', { name: /Registrar mascota nueva/ }).click()
  await fillValidPet(page, { name: petName, weight: '6.2' })
  await page.getByRole('button', { name: 'Crear y seleccionar' }).click()
  // El gate resuelve la selección → el buscador desaparece.
  await expect(page.getByPlaceholder(PICKER_SEARCH)).toBeHidden()
  return { owner, petName }
}

/** Selecciona un paciente EXISTENTE en el gate por documento del dueño + nombre de mascota. */
export async function pickerSelectExisting(
  page: Page,
  ownerDoc: string,
  petName: string,
): Promise<void> {
  await page.getByPlaceholder(PICKER_SEARCH).fill(ownerDoc)
  await page.locator('button.result', { hasText: ownerDoc }).first().click()
  await page.locator('button.animal-card', { hasText: petName }).first().click()
  await expect(page.getByPlaceholder(PICKER_SEARCH)).toBeHidden()
}

// ── Modal (Nueva X) ──────────────────────────────────────────────────────────

/** Abre el modal "Nueva X" de la pantalla y devuelve el dialog visible. */
export async function openNueva(page: Page, key: AccionKey): Promise<Locator> {
  await page.getByRole('button', { name: ACCIONES[key].nueva }).first().click()
  const dialog = page.getByRole('dialog', { name: ACCIONES[key].dialog })
  await expect(dialog).toBeVisible()
  return dialog
}

/** El botón primario de guardar del modal abierto (label varía; siempre empieza por "Guardar"). */
export function modalSave(page: Page): Locator {
  return page.getByRole('dialog').getByRole('button', { name: /^Guardar/ })
}

/**
 * Tras crear un procedimiento NUEVO, todas las pantallas abren el modal de
 * facturación integrada ("Facturación · <X>"). El registro ya quedó guardado
 * antes de abrirlo; aquí lo cerramos con "Cancelar" (saltar facturación) para
 * volver a la lista.
 */
export async function dismissBilling(page: Page): Promise<void> {
  const billing = page.getByRole('dialog', { name: /Facturación/ })
  await expect(billing).toBeVisible()
  await billing.getByRole('button', { name: 'Cancelar' }).click()
  await expect(billing).toBeHidden()
}

/** Input/textarea de un campo del modal, ubicado por el texto de su `.field`. */
export function modalControl(page: Page, fieldLabel: string): Locator {
  return page
    .getByRole('dialog')
    .locator('.field', { hasText: fieldLabel })
    .locator('input, textarea')
    .first()
}

/**
 * Auditoría gráfica del `*` DENTRO del modal abierto: separa las etiquetas de
 * campo que muestran `*` (`.required`) de las que no. (Espejo de asteriskAudit
 * pero scopeado al dialog.)
 */
export async function modalAsteriskAudit(
  page: Page,
): Promise<{ required: string[]; optional: string[] }> {
  const fields = page.getByRole('dialog').locator('.field:visible')
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

// ── Fill de datos VÁLIDOS por procedimiento ──────────────────────────────────
// Cada uno crea (inline) los catálogos que necesita con nombre único, así que no
// dependen de catálogos sembrados. Rellenan SOLO lo obligatorio (los opcionales
// se prueban aparte).

export const FILLERS: Record<AccionKey, (page: Page) => Promise<void>> = {
  async laboratorio(page) {
    await createInSearchable(page, 'Tipo de examen', `Examen E2E ${uniqueSuffix()}`)
    // Cantidad viene con default "1" (válido). Diagnóstico presuntivo:
    await modalControl(page, 'Diagnóstico presuntivo').fill('Sospecha de anemia regenerativa')
  },
  async imagen(page) {
    await createInSearchable(page, 'Tipo de estudio', `Estudio E2E ${uniqueSuffix()}`)
    await modalControl(page, 'Región / protocolo').fill('Tórax proyección lateral')
    await modalControl(page, 'Signos clínicos').fill('Disnea y tos seca de 3 días')
    await modalControl(page, 'Diagnóstico').fill('Descartar patrón bronquial')
  },
  async vacunacion(page) {
    await createInSearchable(page, 'Tipo de vacuna', `Vacuna E2E ${uniqueSuffix()}`)
    await modalControl(page, 'Lote').fill(`LOT-${uniqueSuffix()}`)
  },
  async hospitalizacion(page) {
    await modalControl(page, 'Razón de ingreso').fill('Observación post-quirúrgica 24h')
  },
  async desparasitacion(page) {
    await modalControl(page, 'Producto').fill('Endogard Plus')
    await modalControl(page, 'Dosis').fill('1 comprimido por 10 kg')
  },
  async cirugia(page) {
    await createInSearchable(page, 'Tipo de cirugía', `Cirugía E2E ${uniqueSuffix()}`)
    await modalControl(page, 'Descripción del procedimiento').fill(
      'Ovariohisterectomía electiva sin complicaciones',
    )
  },
  async spa(page) {
    await createInSearchable(page, 'Tipo de servicio', `Servicio E2E ${uniqueSuffix()}`)
    await modalControl(page, 'Motivo').fill('Mantenimiento mensual')
    await modalControl(page, 'Detalles').fill('Baño con shampoo hipoalergénico y corte sanitario')
    await modalControl(page, 'Observaciones').fill('Paciente tranquilo durante el servicio')
  },
}

/** Los `*` obligatorios esperados en cada modal (para la auditoría gráfica). */
export const EXPECTED_REQUIRED: Record<AccionKey, string[]> = {
  laboratorio: ['Cantidad', 'Diagnóstico presuntivo', 'Fecha', 'Tipo de examen'],
  imagen: ['Diagnóstico', 'Fecha', 'Región / protocolo', 'Signos clínicos', 'Tipo de estudio'],
  vacunacion: ['Fecha de aplicación', 'Lote', 'Tipo de vacuna'],
  hospitalizacion: ['Fecha de registro', 'Inicio', 'Razón de ingreso', 'Tipo'],
  desparasitacion: ['Dosis', 'Fecha', 'Producto', 'Tipo'],
  cirugia: ['Descripción del procedimiento', 'Fecha', 'Tipo de cirugía'],
  spa: ['Detalles', 'Fecha', 'Motivo', 'Observaciones', 'Tipo de servicio'],
}
