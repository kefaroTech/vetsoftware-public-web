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
 * - El botón del footer se DESHABILITA hasta completar los requeridos; las
 *   validaciones de formato aparecen al hacer blur del campo.
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
export async function fillValidOwner(page: Page, data: OwnerData = validOwner): Promise<void> {
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
export async function createAndSelectOwner(page: Page, data: OwnerData = validOwner): Promise<void> {
  await startCreateOwnerFromEmpty(page)
  await fillValidOwner(page, data)
  await footerNext(page, 'Guardar propietario').click()
  // Tras crear, aparece la sección de mascota.
  await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
}

// ── Mascota ──────────────────────────────────────────────────────────────────

export interface PetData {
  name: string
  weight: string
}

export const validPet: PetData = { name: 'Firulais E2E', weight: '5.4' }

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

// ── Paso 2: consulta ─────────────────────────────────────────────────────────

export function anamnesis(page: Page): Locator {
  return page.getByPlaceholder(/Motivo de consulta/)
}
