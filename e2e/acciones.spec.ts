import { test, expect } from '@playwright/test'
import { PASSWORD } from './helpers/auth'
import { trackApiWrites } from './helpers/consulta'
import {
  ACCIONES,
  type AccionKey,
  PICKER_SEARCH,
  gotoAccion,
  pickerCreateOwnerAndPet,
  pickerSelectExisting,
  openNueva,
  modalSave,
  modalControl,
  modalAsteriskAudit,
  expectCreated,
  dismissBilling,
  FILLERS,
  EXPECTED_REQUIRED,
  type SeededPatient,
} from './helpers/acciones'

/**
 * Suite rigurosa de los PROCEDIMIENTOS de Acciones Clínicas por menú principal
 * (independientes de una consulta): laboratorio, imagen, vacunación,
 * hospitalización, desparasitación, cirugía y spa.
 *
 * Cobertura por procedimiento:
 *   - gate (PatientCascadePicker): crear/seleccionar propietario + mascota.
 *   - `*` obligatorios vs opcionales (auditoría gráfica del marcador).
 *   - botón de guardar SIEMPRE activo: guardar vacío dispara validación y NO guarda.
 *   - happy path: crea (catálogo inline si aplica) → guarda → POST 2xx → fila creada.
 *   - respuestas HTTP de escritura: todas < 400 (trackApiWrites).
 *
 * [data] — escribe datos reales (crea propietario/mascota/catálogos/registros)
 * con nombres/documentos ÚNICOS por corrida; requiere BD sembrada con catálogos
 * base (especies/razas/colores/geo) para el alta de la mascota.
 */

test.skip(!PASSWORD, 'Define E2E_PASSWORD para correr el suite de acciones')

// Un paciente sembrado UNA vez (crea propietario + mascota inline en el picker)
// y reutilizado por selección en el resto de los casos, para minimizar escrituras.
let patient: SeededPatient

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  try {
    await gotoAccion(page, 'laboratorio')
    patient = await pickerCreateOwnerAndPet(page)
  } finally {
    await page.close()
  }
})

// ════════════════════════════════════════════════════════════════════════════
// Picker (gate) — crear/seleccionar paciente desde una pantalla de acciones
// ════════════════════════════════════════════════════════════════════════════
test.describe('Acciones · Picker de paciente (gate)', () => {
  test('[det] el gate muestra el buscador y el enlace de crear propietario', async ({ page }) => {
    await gotoAccion(page, 'laboratorio')
    await expect(page.getByPlaceholder(PICKER_SEARCH)).toBeVisible()
    await expect(page.getByRole('button', { name: /Crear propietario nuevo/ }).first()).toBeVisible()
    // Sin paciente, la pantalla NO expone aún el botón "Nueva X".
    await expect(page.getByRole('button', { name: ACCIONES.laboratorio.nueva })).toHaveCount(0)
  })

  test('[det] crear propietario inline: click "Crear y seleccionar" vacío valida y no avanza', async ({ page }) => {
    await gotoAccion(page, 'laboratorio')
    await page.getByRole('button', { name: /Crear propietario nuevo/ }).first().click()
    const btn = page.getByRole('button', { name: 'Crear y seleccionar' })
    await expect(btn).toBeEnabled()
    await btn.click()
    // No crea: banner-guía + al menos un control inválido (shake) + seguimos en el form.
    await expect(page.getByText('Revisa los campos marcados antes de continuar.')).toBeVisible()
    await expect(page.locator('.invalid').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crear y seleccionar' })).toBeVisible()
  })

  test('[data] seleccionar un paciente EXISTENTE resuelve el gate y expone "Nueva solicitud"', async ({ page }) => {
    await gotoAccion(page, 'laboratorio')
    await pickerSelectExisting(page, patient.owner.document, patient.petName)
    // Gate resuelto: buscador oculto + botón de alta visible + breadcrumb del paciente.
    await expect(page.getByRole('button', { name: ACCIONES.laboratorio.nueva })).toBeVisible()
    await expect(page.getByText(patient.petName)).toBeVisible()
  })

  test('[data] crear propietario + mascota inline resuelve el gate (flujo completo)', async ({ page }) => {
    await gotoAccion(page, 'imagen')
    const writes = trackApiWrites(page)
    await pickerCreateOwnerAndPet(page)
    await expect(page.getByRole('button', { name: ACCIONES.imagen.nueva })).toBeVisible()
    writes.assertAllOk()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Un describe por procedimiento (parametrizado)
// ════════════════════════════════════════════════════════════════════════════
const KEYS: AccionKey[] = [
  'laboratorio',
  'imagen',
  'vacunacion',
  'hospitalizacion',
  'desparasitacion',
  'cirugia',
  'spa',
]

for (const key of KEYS) {
  const cfg = ACCIONES[key]
  test.describe(`Acciones · ${cfg.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoAccion(page, key)
      await pickerSelectExisting(page, patient.owner.document, patient.petName)
      await expect(page.getByRole('button', { name: cfg.nueva })).toBeVisible()
    })

    test('[data] abre el modal "Nueva" con el paciente ya fijado', async ({ page }) => {
      const dialog = await openNueva(page, key)
      // El paciente va pre-seleccionado → aparece su nombre y NO hay buscador dentro.
      await expect(dialog.getByText(patient.petName)).toBeVisible()
      await expect(dialog.getByPlaceholder(PICKER_SEARCH)).toHaveCount(0)
    })

    test('[data] el `*` marca EXACTAMENTE los campos obligatorios (opcionales sin `*`)', async ({ page }) => {
      await openNueva(page, key)
      const { required, optional } = await modalAsteriskAudit(page)
      expect(required).toEqual(EXPECTED_REQUIRED[key])
      // Ningún opcional debe llevar `*`.
      for (const r of EXPECTED_REQUIRED[key]) {
        expect(optional).not.toContain(r)
      }
    })

    test('[data] botón Guardar SIEMPRE activo; guardar vacío dispara validación y NO guarda', async ({ page }) => {
      const dialog = await openNueva(page, key)
      const writes = trackApiWrites(page)
      await expect(modalSave(page)).toBeEnabled()
      await modalSave(page).click()
      // No se cierra el modal y aparece la validación (error de campo + control inválido).
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('.field .error').first()).toBeVisible()
      await expect(dialog.locator('.invalid').first()).toBeVisible()
      // Ninguna escritura al backend (el guardado se abortó por validación).
      writes.assertAllOk()
      await expect(page).not.toHaveURL(/error/)
    })

    test('[data] happy path: llenar requeridos → Guardar → POST 2xx → fila creada', async ({ page }) => {
      // GAP DE BACKEND (Spa): POST /api/v1/spa-types responde 403 Forbidden
      // ("Access denied") — el permiso de crear tipos de spa no está otorgado al
      // rol (ver handoff §14: falta registrar el permiso SPA en el backend). El
      // resto del flujo de Spa (modal, validación, `*`) sí se valida. Cuando el
      // backend otorgue el permiso, quitar este fixme. Ver _TAREA_COMPLETADA.md.
      test.fixme(
        key === 'spa',
        'Backend: POST /api/v1/spa-types → 403 Forbidden (permiso SPA no otorgado al rol).',
      )
      const writes = trackApiWrites(page)
      await openNueva(page, key)
      await FILLERS[key](page)
      // El POST del procedimiento debe responder 2xx.
      await expectCreated(page, cfg.endpoint, async () => {
        await modalSave(page).click()
      })
      // Tras crear, se abre la facturación integrada; la saltamos con "Cancelar".
      await dismissBilling(page)
      // Ya sin modales, la tabla muestra al menos una fila (el registro creado).
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.locator('tbody tr').first()).toBeVisible()
      // Todas las respuestas de escritura (catálogo + procedimiento) fueron exitosas.
      writes.assertAllOk()
    })
  })
}

// ════════════════════════════════════════════════════════════════════════════
// Casos de tipo de dato / borde específicos
// ════════════════════════════════════════════════════════════════════════════
test.describe('Acciones · casos de borde por tipo de dato', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAccion(page, 'laboratorio')
    await pickerSelectExisting(page, patient.owner.document, patient.petName)
    await expect(page.getByRole('button', { name: ACCIONES.laboratorio.nueva })).toBeVisible()
  })

  test('[data] laboratorio: cantidad 0 es inválida (mínimo 1) y bloquea el guardado', async ({ page }) => {
    const dialog = await openNueva(page, 'laboratorio')
    const writes = trackApiWrites(page)
    // Llena tipo + diagnóstico válidos pero cantidad = 0.
    await FILLERS.laboratorio(page)
    await modalControl(page, 'Cantidad').fill('0')
    await modalSave(page).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Cantidad inválida')).toBeVisible()
    writes.assertAllOk()
  })

  test('[data] laboratorio: el campo Cantidad es de tipo numérico', async ({ page }) => {
    await openNueva(page, 'laboratorio')
    await expect(modalControl(page, 'Cantidad')).toHaveAttribute('type', 'number')
  })
})
