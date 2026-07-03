import { type Page, type Locator, expect } from '@playwright/test'
import { EMPLOYEE_CODE, PASSWORD } from './auth'
import {
  NUEVA_CONSULTA_URL,
  createAndSelectOwner,
  createOwnerWithPet,
  startCreatePet,
  fillValidPet,
  footerNext,
  pickSelect,
  anamnesis,
  openQuickAction,
  fillReceta,
  createInSearchable,
  randomPet,
  uniqueSuffix,
  type OwnerData,
} from './consulta'

/**
 * Helpers para la HISTORIA CLÍNICA (`/dashboard/consulta/historial`).
 *
 * REGLA DEL PROYECTO: todos los casos apuntan a los SERVICIOS REALES vía la API
 * REST (nada de mocks/`page.route`). Como la historia clínica es un flujo de
 * LECTURA, primero SEMBRAMOS datos reales con el wizard de Nueva Consulta
 * (propietario + mascota + consulta con procedimientos) y luego navegamos la
 * pantalla de historia, que consume:
 *
 *   Paso 1 (OwnerStep):   GET /owners/search
 *   Paso 2 (PetStep):     GET /animals/by-owner/:id
 *   Paso 3 (HistoryStep): GET /animals/:id/clinical-history
 *                         GET /animals/:id/weight-records
 *                         GET /{recurso}/:id            (detalle de cada evento)
 *                         GET /animals/:id/clinical-history/export.pdf
 *
 * Por eso este suite es `[data]`: requiere el backend arriba con catálogos
 * sembrados y E2E_PASSWORD (login real, igual que consulta/acciones).
 */

export const HISTORIAL_URL = '/dashboard/consulta/historial'

/** JSON donde historia.setup.ts persiste el paciente sembrado (lo lee la spec). */
export const PATIENT_FIXTURE_PATH = 'e2e/.artifacts/historia-patient.json'

/** Anamnesis fija del sembrado — la reusamos para asertar el detalle de la consulta. */
export const ANAMNESIS_SEED =
  'Historia clínica E2E: control anual del paciente, sin signos de alarma.'
/** Lote de la vacuna sembrada — lo asertamos en el detalle de la vacunación. */
export const VACC_LOT_SEED = 'LOTE-E2E-001'

export interface SeededPatient {
  owner: OwnerData
  petName: string
  ownerId: string
  petId: string
}

export function ownerSearchInput(page: Page): Locator {
  return page.getByPlaceholder(/Buscar por nombre, documento o email/)
}
export function weightPanel(page: Page): Locator {
  return page.locator('.wpanel')
}

/** El historial de peso arranca colapsado: lo despliega (click en "Ver historial
 *  de peso") y espera a que el panel sea visible. */
export async function openWeightPanel(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ver historial de peso' }).click()
  const wp = weightPanel(page)
  await expect(wp).toBeVisible()
  // El panel se monta on-demand y carga /weight-records; esperamos a que el
  // loader desaparezca para que los conteos de registros sean estables.
  await expect(wp.locator('.wp-loading')).toHaveCount(0)
}
export function historyUrl(ownerId: string, petId: string): string {
  return `${HISTORIAL_URL}/${ownerId}/mascotas/${petId}`
}
export function petStepUrl(ownerId: string): string {
  return `${HISTORIAL_URL}/${ownerId}/mascotas`
}

/**
 * Observa (sin mockear) las respuestas POST reales para capturar los IDs que
 * asigna el backend a propietario y mascota — necesarios para los casos de
 * deep-link (navegar directo al paso 3 por URL).
 */
function captureIds(page: Page): { ownerId: string; petId: string } {
  const ids = { ownerId: '', petId: '' }
  page.on('response', async (res) => {
    if (res.request().method() !== 'POST') return
    const path = new URL(res.url()).pathname
    try {
      if (path.endsWith('/owners')) ids.ownerId = String((await res.json()).id)
      else if (path.endsWith('/animals')) ids.petId = String((await res.json()).id)
    } catch {
      /* respuesta no-JSON: la ignoramos */
    }
  })
  return ids
}

/**
 * Login REAL resistente al arranque en FRÍO del dev-server. Cuando Vite compila
 * los módulos on-demand, Vue puede no haber enganchado aún el submit del v-form
 * cuando se hace click → el POST de login no dispara y quedamos en `/`. Este
 * login RE-LLENA los campos y RE-CLICKEA hasta que la navegación a /dashboard
 * ocurre (una vez la app está hidratada, el primer click ya funciona).
 */
async function robustLogin(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const code = page.getByLabel('Código de empleado *', { exact: true })
  const btn = page.getByRole('button', { name: 'Iniciar sesión' })
  // `/` es guestOnly: si YA hay sesión, redirige a /dashboard (no hay form).
  await Promise.race([
    btn.waitFor({ state: 'visible' }).catch(() => {}),
    page.waitForURL(/\/dashboard/, { timeout: 8000 }).catch(() => {}),
  ])
  if (page.url().includes('/dashboard')) return // ya autenticado
  const pass = page.getByLabel('Contraseña *', { exact: true })
  await expect(async () => {
    if (page.url().includes('/dashboard')) return
    await code.fill(EMPLOYEE_CODE)
    await pass.fill(PASSWORD)
    await btn.click()
    // Espera generosa por intento: bajo el burst de 14 logins simultáneos el
    // POST puede tardar; esperar poco re-clickea y spamea logins de más.
    await page.waitForURL(/\/dashboard/, { timeout: 12_000 })
  }).toPass({ timeout: 60_000 })
}

/** robustLogin + abre el wizard de Nueva Consulta en el paso 1 (propietario). */
async function robustLoginAndOpenWizard(page: Page): Promise<void> {
  await robustLogin(page)
  await page.goto(NUEVA_CONSULTA_URL)
  await expect(
    page.getByRole('heading', { name: /Quién es el propietario/ }),
  ).toBeVisible({ timeout: 30_000 })
}

/**
 * Siembra un paciente CON historia clínica contra el backend real: crea
 * propietario + mascota (con peso inicial) y guarda una consulta con receta y
 * vacunación. Eso genera eventos reales de tipo CONSULTATION + PRESCRIPTION +
 * VACCINATION. Devuelve datos + los IDs reales capturados.
 */
export async function seedPatientWithHistory(page: Page): Promise<SeededPatient> {
  const ids = captureIds(page)
  await robustLoginAndOpenWizard(page)
  const owner = await createAndSelectOwner(page)
  await startCreatePet(page)
  const pet = randomPet()
  await fillValidPet(page, pet)
  await footerNext(page, 'Guardar mascota').click()
  await footerNext(page, 'Continuar a la consulta').click()

  await pickSelect(page, /Tipo de consulta/)
  await anamnesis(page).fill(ANAMNESIS_SEED)

  // Receta (medicamentos) → evento PRESCRIPTION.
  let d = await openQuickAction(page, /Receta/, 'Nueva receta')
  await fillReceta(page)
  await d.getByRole('button', { name: 'Guardar receta' }).click()
  await expect(d).toBeHidden()

  // Vacunación (catálogo creable) → evento VACCINATION.
  d = await openQuickAction(page, /Vacunación/, 'Aplicar vacuna')
  await createInSearchable(page, 'Tipo de vacuna', `Antirrábica E2E ${uniqueSuffix()}`)
  await d.getByLabel(/Lote/).fill(VACC_LOT_SEED)
  await d.getByRole('button', { name: 'Registrar vacunación' }).click()
  await expect(d).toBeHidden()

  // Guardado tolerante a carga (no usamos guardarConsulta para poder ampliar el
  // timeout del modal de facturación, que bajo contención puede tardar > 5s).
  await footerNext(page, 'Guardar consulta').click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'Confirmar y guardar' }).click()
  const billing = page.getByRole('dialog', { name: /Facturación/ })
  await expect(billing).toBeVisible({ timeout: 20_000 })
  await billing.getByRole('button', { name: /Solo guardar la consulta/ }).click()
  await billing.getByRole('button', { name: 'Guardar consulta' }).click()
  await expect(page).toHaveURL(/exito|consulta-nueva-exito/, { timeout: 20_000 })

  return { owner, petName: pet.name, ownerId: ids.ownerId, petId: ids.petId }
}

/**
 * Siembra un propietario SIN mascotas (para el estado vacío del paso 2) y
 * devuelve su documento. Usa su propia página/sesión.
 */
export async function seedEmptyOwner(page: Page): Promise<string> {
  await robustLoginAndOpenWizard(page)
  const owner = await createAndSelectOwner(page)
  return owner.document
}

/**
 * Siembra un paciente SIMPLE (propietario + mascota con peso inicial) SIN
 * consulta. Útil para los casos de escritura de peso (aislado del paciente
 * compartido para no interferir con los conteos de otros tests en paralelo).
 * Deja la sesión iniciada y la app en el wizard.
 */
export async function seedPlainPatient(page: Page): Promise<SeededPatient> {
  const ids = captureIds(page)
  await robustLoginAndOpenWizard(page)
  const { owner, pet } = await createOwnerWithPet(page)
  return { owner, petName: pet.name, ownerId: ids.ownerId, petId: ids.petId }
}

/** Login real (robusto al arranque en frío) + abre el paso 1 de la historia. */
export async function gotoHistorialStep1(page: Page): Promise<void> {
  await robustLogin(page)
  await page.goto(HISTORIAL_URL)
  await expect(page.getByRole('heading', { name: '¿De quién es la mascota?' })).toBeVisible()
}

/**
 * Desde el paso 1 (ya en la pantalla) busca al propietario por documento, lo
 * selecciona, elige su mascota por nombre y espera la cabecera del paciente.
 * NO hace login (asume que ya hay sesión y estamos en el paso 1).
 */
export async function pickOwnerAndPet(page: Page, p: SeededPatient): Promise<void> {
  await ownerSearchInput(page).fill(p.owner.document)
  await page.locator('.result-row', { hasText: p.owner.document }).first().click()
  await expect(page.getByRole('heading', { name: /Qué mascota quieres consultar/ })).toBeVisible()
  await page.locator('.pet-card', { hasText: p.petName }).first().click()
  await expect(page.getByRole('heading', { name: p.petName })).toBeVisible()
}

/** Login + navega el flujo completo hasta la historia del paciente (paso 3). */
export async function openHistoryFor(page: Page, p: SeededPatient): Promise<void> {
  await gotoHistorialStep1(page)
  await pickOwnerAndPet(page, p)
}
