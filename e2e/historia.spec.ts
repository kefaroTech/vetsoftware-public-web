import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { PASSWORD, login } from './helpers/auth'
import { trackApiWrites } from './helpers/consulta'
import {
  HISTORIAL_URL,
  VACC_LOT_SEED,
  PATIENT_FIXTURE_PATH,
  gotoHistorialStep1,
  pickOwnerAndPet,
  openHistoryFor,
  seedPlainPatient,
  ownerSearchInput,
  weightPanel,
  openWeightPanel,
  historyUrl,
  type SeededPatient,
} from './helpers/historia'

/**
 * Suite de la HISTORIA CLÍNICA (`/dashboard/consulta/historial`).
 *
 * TODOS los casos apuntan a los SERVICIOS REALES vía la API REST (sin mocks):
 *   · se SIEMBRA un paciente real (propietario + mascota + consulta con
 *     receta y vacunación) una sola vez en `beforeAll`, y
 *   · cada caso navega la pantalla contra los endpoints reales y asevera los
 *     happy paths, la habilitación de botones, los tipos de dato, los campos
 *     requeridos (validación del alta de peso) y que los servicios responden 2xx.
 *
 * Requiere backend arriba con catálogos sembrados + E2E_PASSWORD (login real,
 * igual que consulta/acciones). Sin password, el suite se auto-salta.
 */

test.skip(!PASSWORD, 'Define E2E_PASSWORD para correr el suite de historia clínica')

// Paciente CON historia (consulta + receta + vacuna) y propietario SIN mascotas,
// sembrados UNA vez por global.setup.ts y leídos aquí desde el JSON.
let patient: SeededPatient
let emptyOwnerDoc: string

test.beforeAll(() => {
  const data = JSON.parse(readFileSync(PATIENT_FIXTURE_PATH, 'utf8')) as {
    patient: SeededPatient
    emptyOwnerDoc: string
  }
  patient = data.patient
  emptyOwnerDoc = data.emptyOwnerDoc
})

// Cada caso hace login real al entrar; con 14 workers, el burst de logins
// simultáneos del arranque puede tardar y `robustLogin` reintenta hasta 60s.
// Damos margen sobre el timeout de test por defecto (30s) para que quepa.
test.beforeEach(() => {
  test.setTimeout(90_000)
})

// ════════════════════════════════════════════════════════════════════════════
// A · Acceso
// ════════════════════════════════════════════════════════════════════════════
test.describe('A · Acceso', () => {
  test('sin sesión, la historia clínica redirige al login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(HISTORIAL_URL)
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('con sesión, el paso 1 abre en la búsqueda de propietario', async ({ page }) => {
    await gotoHistorialStep1(page)
    await expect(page.getByText('Paso 1 de 3')).toBeVisible()
    await expect(page.getByText('Empieza a escribir para buscar al propietario.')).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// B · Paso 1 — Búsqueda de propietario (contra /owners/search real)
// ════════════════════════════════════════════════════════════════════════════
test.describe('B · Búsqueda de propietario', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHistorialStep1(page)
  })

  test('buscar por documento encuentra al propietario sembrado', async ({ page }) => {
    await ownerSearchInput(page).fill(patient.owner.document)
    const row = page.locator('.result-row', { hasText: patient.owner.document })
    await expect(row).toBeVisible()
    await expect(row).toContainText(patient.owner.name)
  })

  test('buscar por nombre también lo encuentra', async ({ page }) => {
    await ownerSearchInput(page).fill(patient.owner.name)
    await expect(
      page.locator('.result-row', { hasText: patient.owner.document }),
    ).toBeVisible()
  })

  test('seleccionar un resultado avanza al paso 2 (mascotas)', async ({ page }) => {
    await ownerSearchInput(page).fill(patient.owner.document)
    await page.locator('.result-row', { hasText: patient.owner.document }).first().click()
    await expect(page).toHaveURL(/mascotas/)
    await expect(page.getByRole('heading', { name: /Qué mascota quieres consultar/ })).toBeVisible()
    await expect(page.getByText('Paso 2 de 3')).toBeVisible()
  })

  test('un término inexistente muestra el estado vacío', async ({ page }) => {
    const term = `zzqx-no-existe-${Date.now()}`
    await ownerSearchInput(page).fill(term)
    await expect(page.locator('.status.empty')).toContainText('Sin coincidencias para')
  })

  test('borrar el término vuelve al hint inicial', async ({ page }) => {
    await ownerSearchInput(page).fill(patient.owner.document)
    await expect(page.locator('.result-row').first()).toBeVisible()
    await ownerSearchInput(page).fill('')
    await expect(page.getByText('Empieza a escribir para buscar al propietario.')).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// C · Paso 2 — Selección de mascota (contra /animals/by-owner real)
// ════════════════════════════════════════════════════════════════════════════
test.describe('C · Selección de mascota', () => {
  test('el propietario sembrado lista su mascota con especie, raza, sexo y peso', async ({ page }) => {
    await gotoHistorialStep1(page)
    await ownerSearchInput(page).fill(patient.owner.document)
    await page.locator('.result-row', { hasText: patient.owner.document }).first().click()
    const card = page.locator('.pet-card', { hasText: patient.petName })
    await expect(card).toBeVisible()
    await expect(card).toContainText('Macho')
    await expect(card).toContainText('kg') // peso inicial sembrado (unidad kg)
  })

  test('elegir una mascota avanza al paso 3 (historia)', async ({ page }) => {
    await openHistoryFor(page, patient)
    await expect(page).toHaveURL(/mascotas\/\d+/)
    await expect(page.getByRole('heading', { name: patient.petName })).toBeVisible()
  })

  test('un propietario sin mascotas muestra el estado vacío', async ({ page }) => {
    test.skip(!emptyOwnerDoc, 'No se pudo sembrar el propietario sin mascotas')
    await gotoHistorialStep1(page)
    await ownerSearchInput(page).fill(emptyOwnerDoc)
    await page.locator('.result-row', { hasText: emptyOwnerDoc }).first().click()
    await expect(page.getByText('Este propietario aún no tiene mascotas registradas.')).toBeVisible()
    await expect(page.getByText('Sin mascotas registradas')).toBeVisible()
  })

  test('"Cambiar propietario" vuelve al paso 1', async ({ page }) => {
    await gotoHistorialStep1(page)
    await pickOwnerAndPet(page, patient)
    await page.getByRole('button', { name: 'Cambiar mascota' }).click()
    await page.getByRole('button', { name: 'Cambiar propietario' }).click()
    await expect(page.getByRole('heading', { name: '¿De quién es la mascota?' })).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// D · Paso 3 — Cabecera del paciente e hidratación (deep-link real por ID)
// ════════════════════════════════════════════════════════════════════════════
test.describe('D · Cabecera del paciente e hidratación', () => {
  test('la cabecera muestra la mascota, sus pills y el propietario', async ({ page }) => {
    await openHistoryFor(page, patient)
    await expect(page.getByRole('heading', { name: patient.petName })).toBeVisible()
    await expect(page.locator('.pills')).toContainText('Macho')
    await expect(page.locator('.owner-line')).toContainText(patient.owner.name)
  })

  test('deep-link por URL hidrata propietario y mascota desde la API', async ({ page }) => {
    test.skip(!patient.petId || !patient.ownerId, 'No se capturaron los IDs reales del sembrado')
    await login(page)
    await expect(page).toHaveURL(/\/dashboard/) // esperar a que el login termine antes de navegar
    await page.goto(historyUrl(patient.ownerId, patient.petId))
    await expect(page.getByRole('heading', { name: patient.petName })).toBeVisible()
    await expect(page.locator('.owner-line')).toContainText(patient.owner.name)
  })

  test('ruta con IDs inválidos muestra "Ruta inválida."', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/dashboard/) // esperar a que el login termine antes de navegar
    await page.goto(`${HISTORIAL_URL}/abc/mascotas/xyz`)
    await expect(page.getByText('Ruta inválida.')).toBeVisible()
  })

  test('"Cambiar mascota" vuelve al paso 2', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.getByRole('button', { name: 'Cambiar mascota' }).click()
    await expect(page.getByRole('heading', { name: /Qué mascota quieres consultar/ })).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// E · Timeline de eventos (GET /clinical-history real responde 2xx y renderiza)
// ════════════════════════════════════════════════════════════════════════════
test.describe('E · Timeline de eventos', () => {
  test('el GET de la historia clínica responde 2xx y pinta la timeline', async ({ page }) => {
    await gotoHistorialStep1(page)
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/animals\/\d+\/clinical-history(\?|$)/.test(r.url()) && r.request().method() === 'GET',
      ),
      pickOwnerAndPet(page, patient),
    ])
    expect(resp.ok(), `GET clinical-history → ${resp.status()}`).toBeTruthy()
    await expect(page.locator('.month-group').first()).toBeVisible()
  })

  test('aparecen los chips de los tipos sembrados (consulta, vacuna, receta)', async ({ page }) => {
    await openHistoryFor(page, patient)
    await expect(page.getByRole('button', { name: /Todos ·/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Consulta ·/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Vacunación ·/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Receta ·/ })).toBeVisible()
  })

  test('la vacunación y la receta se anidan bajo su consulta', async ({ page }) => {
    await openHistoryFor(page, patient)
    // Ambos procedimientos comparten consultationId ⇒ aparecen anidados.
    await expect(page.locator('.event-row.nested').first()).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// F · Filtros por tipo y búsqueda dentro de eventos
// ════════════════════════════════════════════════════════════════════════════
test.describe('F · Filtros y búsqueda de eventos', () => {
  test.beforeEach(async ({ page }) => {
    await openHistoryFor(page, patient)
  })

  test('filtrar por "Vacunación" oculta la receta', async ({ page }) => {
    await page.getByRole('button', { name: /Vacunación ·/ }).click()
    await expect(page.locator('.event-row', { hasText: 'Vacunación' }).first()).toBeVisible()
    await expect(page.locator('.event-row', { hasText: 'Receta' })).toHaveCount(0)
  })

  test('el filtro activo se resalta', async ({ page }) => {
    const chip = page.getByRole('button', { name: /Vacunación ·/ })
    await chip.click()
    await expect(chip).toHaveClass(/active/)
  })

  test('buscar por etiqueta del tipo filtra los eventos', async ({ page }) => {
    await page.getByPlaceholder(/Buscar en eventos/).fill('vacun')
    await expect(page.locator('.event-row', { hasText: 'Vacunación' }).first()).toBeVisible()
    await expect(page.locator('.event-row', { hasText: 'Receta' })).toHaveCount(0)
  })

  test('una búsqueda sin coincidencias muestra el mensaje de filtros', async ({ page }) => {
    await page.getByPlaceholder(/Buscar en eventos/).fill('xyz-no-existe-nada')
    await expect(page.getByText('Ningún evento coincide con los filtros.')).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// G · Modal de detalle de evento (GET /{recurso}/:id real)
// ════════════════════════════════════════════════════════════════════════════
test.describe('G · Detalle de evento', () => {
  test('abrir la consulta muestra la anamnesis real sembrada', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.event-row', { hasText: 'Consulta' }).first().locator('.card').click()
    const dialog = page.getByRole('dialog', { name: /Consulta/ })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('control anual del paciente')
    await expect(dialog).toContainText('Procedimientos asociados')
  })

  test('un procedimiento asociado es clickeable y abre su detalle', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.event-row', { hasText: 'Consulta' }).first().locator('.card').click()
    const consulta = page.getByRole('dialog', { name: /Consulta/ })
    await expect(consulta).toBeVisible()
    await expect(consulta).toContainText('Procedimientos asociados')
    // El procedimiento de vacunación asociado es un botón navegable (con chevron).
    const proc = consulta.locator('.child', { hasText: 'Vacunación' })
    await expect(proc).toHaveClass(/navigable/)
    // Al clickearlo, el modal pasa a mostrar el detalle de la vacunación (su lote real).
    await proc.click()
    const vacuna = page.getByRole('dialog', { name: /Vacunación/ })
    await expect(vacuna).toBeVisible()
    await expect(vacuna).toContainText(VACC_LOT_SEED)
  })

  test('cerrar un procedimiento asociado vuelve a la consulta (no cierra el modal)', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.event-row', { hasText: 'Consulta' }).first().locator('.card').click()
    const consulta = page.getByRole('dialog', { name: /Consulta/ })
    await consulta.locator('.child', { hasText: 'Vacunación' }).click()
    const vacuna = page.getByRole('dialog', { name: /Vacunación/ })
    await expect(vacuna).toBeVisible()
    // "Cerrar" el procedimiento vuelve al detalle de la consulta.
    await vacuna.locator('button.btn-close').click()
    const consultaOtraVez = page.getByRole('dialog', { name: /Consulta/ })
    await expect(consultaOtraVez).toBeVisible()
    await expect(consultaOtraVez).toContainText('Procedimientos asociados')
    // Ahora sí, cerrar la consulta cierra el modal por completo.
    await consultaOtraVez.locator('button.btn-close').click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('cerrar el procedimiento con Escape también vuelve a la consulta', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.event-row', { hasText: 'Consulta' }).first().locator('.card').click()
    const consulta = page.getByRole('dialog', { name: /Consulta/ })
    await consulta.locator('.child', { hasText: 'Vacunación' }).click()
    await expect(page.getByRole('dialog', { name: /Vacunación/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /Consulta/ })).toBeVisible()
  })

  test('abrir la vacunación muestra el lote real sembrado', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.event-row', { hasText: 'Vacunación' }).first().locator('.card').click()
    const dialog = page.getByRole('dialog', { name: /Vacunación/ })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(VACC_LOT_SEED)
  })

  test('el modal se cierra con el botón "Cerrar" del footer', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.event-row', { hasText: 'Vacunación' }).first().locator('.card').click()
    const dialog = page.getByRole('dialog', { name: /Vacunación/ })
    await expect(dialog).toBeVisible()
    await dialog.locator('button.btn-close').click()
    await expect(dialog).toBeHidden()
  })

  test('el modal se cierra con Escape', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.event-row', { hasText: 'Vacunación' }).first().locator('.card').click()
    const dialog = page.getByRole('dialog', { name: /Vacunación/ })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('el modal NO se cierra al hacer click en el backdrop', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.event-row', { hasText: 'Vacunación' }).first().locator('.card').click()
    const dialog = page.getByRole('dialog', { name: /Vacunación/ })
    await expect(dialog).toBeVisible()
    await page.locator('.overlay').click({ position: { x: 5, y: 5 } })
    await expect(dialog).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// H · Historial de peso — lectura, validaciones y round-trip (POST/DELETE reales)
// ════════════════════════════════════════════════════════════════════════════
test.describe('H · Historial de peso', () => {
  test('arranca COLAPSADO y se despliega con el botón', async ({ page }) => {
    await openHistoryFor(page, patient)
    // De entrada solo está el botón; el panel no se muestra.
    await expect(page.getByRole('button', { name: 'Ver historial de peso' })).toBeVisible()
    await expect(weightPanel(page)).toHaveCount(0)
    // Al abrirlo aparece el panel; el botón pasa a "Ocultar…".
    await openWeightPanel(page)
    await expect(weightPanel(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ocultar historial de peso' })).toBeVisible()
  })

  test('la mascota sembrada muestra al menos un registro de peso', async ({ page }) => {
    await openHistoryFor(page, patient)
    await openWeightPanel(page)
    const wp = weightPanel(page)
    await expect(wp.getByText('Historial de peso')).toBeVisible()
    await expect(wp.locator('.wp-item').first()).toBeVisible()
  })

  // ── Validaciones del formulario de alta (de pantalla; no dependen de red) ──
  test('validación: guardar sin peso muestra "Ingresa el peso"', async ({ page }) => {
    await openHistoryFor(page, patient)
    await openWeightPanel(page)
    const wp = weightPanel(page)
    await wp.getByRole('button', { name: 'Registrar peso' }).click()
    await wp.getByRole('button', { name: 'Guardar' }).click()
    await expect(wp.getByText('Ingresa el peso')).toBeVisible()
  })

  test('validación: peso 0 muestra "El peso debe ser mayor a 0"', async ({ page }) => {
    await openHistoryFor(page, patient)
    await openWeightPanel(page)
    const wp = weightPanel(page)
    await wp.getByRole('button', { name: 'Registrar peso' }).click()
    await wp.getByLabel(/^Peso/).fill('0')
    await wp.getByRole('button', { name: 'Guardar' }).click()
    await expect(wp.getByText('El peso debe ser mayor a 0')).toBeVisible()
  })

  test('validación de tipo: peso no numérico se rechaza y marca el campo inválido', async ({ page }) => {
    await openHistoryFor(page, patient)
    await openWeightPanel(page)
    const wp = weightPanel(page)
    await wp.getByRole('button', { name: 'Registrar peso' }).click()
    await wp.getByLabel(/^Peso/).fill('abc')
    await wp.getByRole('button', { name: 'Guardar' }).click()
    await expect(wp.getByText('El peso debe ser mayor a 0')).toBeVisible()
    await expect(wp.locator('.invalid').first()).toBeVisible()
  })

  test('cancelar cierra el formulario de alta sin guardar', async ({ page }) => {
    await openHistoryFor(page, patient)
    await openWeightPanel(page)
    const wp = weightPanel(page)
    await wp.getByRole('button', { name: 'Registrar peso' }).click()
    await expect(wp.locator('.wp-form')).toBeVisible()
    await wp.getByRole('button', { name: 'Cancelar' }).click()
    await expect(wp.locator('.wp-form')).toHaveCount(0)
  })

  test('round-trip real: registrar un peso lo agrega y eliminarlo lo quita (POST/DELETE 2xx)', async ({ page }) => {
    // Paciente DEDICADO para no interferir con los conteos del compartido.
    const api = trackApiWrites(page)
    const dedicated = await seedPlainPatient(page)
    await page.goto(HISTORIAL_URL)
    await pickOwnerAndPet(page, dedicated)
    await openWeightPanel(page)
    const wp = weightPanel(page)

    const before = await wp.locator('.wp-item').count()
    await wp.getByRole('button', { name: 'Registrar peso' }).click()
    await wp.getByLabel(/^Peso/).fill('31.5')
    const [createResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/weight-records$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
      ),
      wp.getByRole('button', { name: 'Guardar' }).click(),
    ])
    expect(createResp.ok(), `POST weight-records → ${createResp.status()}`).toBeTruthy()
    await expect(wp.locator('.wp-item')).toHaveCount(before + 1)
    await expect(wp.locator('.wp-item').first()).toContainText('31.5')

    // Eliminar el recién creado (primer registro) → DELETE 2xx y vuelve al conteo previo.
    const [delResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/weight-records\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'DELETE',
      ),
      wp.locator('.wp-item').first().locator('.wp-del').click(),
    ])
    expect(delResp.ok(), `DELETE weight-records → ${delResp.status()}`).toBeTruthy()
    await expect(wp.locator('.wp-item')).toHaveCount(before)
    api.assertAllOk()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// I · Exportar PDF (GET /clinical-history/export.pdf real)
// ════════════════════════════════════════════════════════════════════════════
test.describe('I · Exportar PDF', () => {
  test('exportar dispara el GET del PDF y responde 2xx sin error', async ({ page }) => {
    await openHistoryFor(page, patient)
    const [resp] = await Promise.all([
      page.waitForResponse((r) => /clinical-history\/export\.pdf/.test(r.url())),
      page.getByRole('button', { name: /Exportar PDF/ }).click(),
    ])
    expect(resp.ok(), `GET export.pdf → ${resp.status()}`).toBeTruthy()
    await expect(page.getByText('No se pudo exportar la historia clínica.')).toHaveCount(0)
  })

  test('el filtro activo se propaga al parámetro types del export', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.getByRole('button', { name: /Vacunación ·/ }).click()
    const [resp] = await Promise.all([
      page.waitForResponse((r) => /clinical-history\/export\.pdf/.test(r.url())),
      page.getByRole('button', { name: /Exportar PDF/ }).click(),
    ])
    expect(resp.ok()).toBeTruthy()
    expect(new URL(resp.url()).searchParams.get('types')).toBe('VACCINATION')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// J · Habilitación de botones (el usuario de prueba tiene los permisos)
// ════════════════════════════════════════════════════════════════════════════
test.describe('J · Botones de acción', () => {
  test('"Nueva consulta" está visible y navega al wizard con el paciente cargado', async ({ page }) => {
    await openHistoryFor(page, patient)
    const btn = page.getByRole('button', { name: 'Nueva consulta' })
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page).toHaveURL(/consulta\/nueva/)
  })

  test('"Registrar peso" y "Exportar PDF" están habilitados', async ({ page }) => {
    await openHistoryFor(page, patient)
    await openWeightPanel(page)
    await expect(weightPanel(page).getByRole('button', { name: 'Registrar peso' })).toBeEnabled()
    await expect(page.getByRole('button', { name: /Exportar PDF/ })).toBeEnabled()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// K · Breadcrumbs
// ════════════════════════════════════════════════════════════════════════════
test.describe('K · Breadcrumbs', () => {
  test('en el paso 3 reflejan propietario y mascota', async ({ page }) => {
    await openHistoryFor(page, patient)
    const crumbs = page.locator('.crumbs')
    await expect(crumbs.getByRole('button', { name: new RegExp(`Propietario · ${escapeRe(patient.owner.name)}`) })).toBeVisible()
    await expect(crumbs.getByRole('button', { name: new RegExp(`Mascota · ${escapeRe(patient.petName)}`) })).toBeVisible()
  })

  test('el crumb "Propietario" vuelve al paso 1', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.crumbs').getByRole('button', { name: /Propietario/ }).click()
    await expect(page.getByRole('heading', { name: '¿De quién es la mascota?' })).toBeVisible()
  })

  test('el crumb "Mascota" vuelve al paso 2', async ({ page }) => {
    await openHistoryFor(page, patient)
    await page.locator('.crumbs').getByRole('button', { name: /Mascota/ }).click()
    await expect(page.getByRole('heading', { name: /Qué mascota quieres consultar/ })).toBeVisible()
  })

  test('en el paso 1, los crumbs de mascota e historia están deshabilitados', async ({ page }) => {
    await gotoHistorialStep1(page)
    const crumbs = page.locator('.crumbs')
    await expect(crumbs.getByRole('button', { name: /Mascota/ })).toBeDisabled()
    await expect(crumbs.getByRole('button', { name: /Historia clínica/ })).toBeDisabled()
  })
})

// Escapa metacaracteres de regex en textos dinámicos (nombres con sufijo aleatorio).
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
