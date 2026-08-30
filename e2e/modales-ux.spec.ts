import { test, expect, type Page, type Locator } from '@playwright/test'
import { login, PASSWORD } from './helpers/auth'
import {
  gotoNuevaConsulta,
  createAndSelectOwner,
  startCreatePet,
  fillValidPet,
  randomPet,
  footerNext,
  selectExistingOwnerAndPet,
  openQuickAction,
  createInSearchable,
  uniqueSuffix,
  type OwnerData,
} from './helpers/consulta'
import { exigir } from './helpers/exigir'

/**
 * E2E RIGUROSO de la UX de modales (contra la app real):
 *  - APERTURA: cada modal se abre como role="dialog".
 *  - CENTRADO: el card queda centrado horizontal y verticalmente en el viewport
 *    (márgenes izq≈der, arriba≈abajo) y siempre dentro del viewport.
 *  - TAMAÑO: los modales de contenido ocupan ~90% del ancho; los formularios
 *    CORTOS se ajustan al contenido (no fuerzan 90vh); los diálogos de
 *    confirmación son COMPACTOS (no 90%).
 *  - DESPLEGABLES / SCROLL: el panel del SearchableSelect se teletransporta a
 *    <body>, queda SIEMPRE dentro del viewport (flip hacia arriba si hace falta)
 *    y no lo recorta el modal, incluso con el campo al fondo. "Crear medicamento"
 *    abre el formulario sin cerrar el panel.
 */

// Todos los casos entran por login real. Sin credenciales en el entorno la suite se salta en vez
// de fallar con un login vacío, igual que hacen consulta, acciones e historia.
test.skip(!PASSWORD, 'Define E2E_PASSWORD para correr el suite de modales')

interface Box {
  x: number
  y: number
  width: number
  height: number
}

function viewport(page: Page): { width: number; height: number } {
  const vp = page.viewportSize()
  expect(vp, 'el test necesita un viewport definido').not.toBeNull()
  return exigir(vp, 'vp')
}

async function boxOf(loc: Locator): Promise<Box> {
  await expect(loc).toBeVisible()
  const b = await loc.boundingBox()
  expect(b, 'el elemento debe tener bounding box').not.toBeNull()
  return exigir(b, 'b')
}

/** El card del modal actualmente abierto (ModalShell teletransporta `.overlay` a <body>). */
function modalCard(page: Page): Locator {
  return page.locator('.overlay .card').last()
}

/** Márgenes izq/der y arriba/abajo casi iguales → centrado en el viewport. */
function expectCentered(b: Box, vp: { width: number; height: number }, tol = 4): void {
  const leftGap = b.x
  const rightGap = vp.width - (b.x + b.width)
  const topGap = b.y
  const bottomGap = vp.height - (b.y + b.height)
  expect(
    Math.abs(leftGap - rightGap),
    `centrado horizontal (izq ${Math.round(leftGap)} vs der ${Math.round(rightGap)})`,
  ).toBeLessThanOrEqual(tol)
  expect(
    Math.abs(topGap - bottomGap),
    `centrado vertical (arriba ${Math.round(topGap)} vs abajo ${Math.round(bottomGap)})`,
  ).toBeLessThanOrEqual(tol)
}

/** El elemento cabe completamente dentro del viewport (no se recorta). */
function expectWithinViewport(b: Box, vp: { width: number; height: number }, tol = 2): void {
  expect(b.x, 'borde izquierdo dentro del viewport').toBeGreaterThanOrEqual(-tol)
  expect(b.y, 'borde superior dentro del viewport').toBeGreaterThanOrEqual(-tol)
  expect(b.x + b.width, 'borde derecho dentro del viewport').toBeLessThanOrEqual(vp.width + tol)
  expect(b.y + b.height, 'borde inferior dentro del viewport').toBeLessThanOrEqual(vp.height + tol)
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Catálogo de medicamentos — apertura, centrado y tamaño (sin wizard)
// ════════════════════════════════════════════════════════════════════════════
const MEDS_URL = '/dashboard/catalogos/medicamentos'

test.describe('Modales · catálogo de medicamentos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Esperar el redirect post-login antes de navegar (el guard de ruta necesita
    // la sesión establecida; si no, redirige a home).
    await expect(page).toHaveURL(/\/dashboard/)
    await page.goto(MEDS_URL)
    await expect(page.getByRole('heading', { name: 'Catálogo de medicamentos' })).toBeVisible()
  })

  test('[apertura] "Nuevo medicamento" abre como diálogo accesible', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo medicamento' }).click()
    await expect(page.getByRole('dialog', { name: 'Nuevo medicamento' })).toBeVisible()
  })

  test('[centrado] el modal de formulario queda centrado y dentro del viewport', async ({
    page,
  }) => {
    const vp = viewport(page)
    await page.getByRole('button', { name: 'Nuevo medicamento' }).click()
    const b = await boxOf(modalCard(page))
    expectWithinViewport(b, vp)
    expectCentered(b, vp)
  })

  test('[tamaño] el modal de contenido ocupa ~90% del ancho del viewport', async ({ page }) => {
    const vp = viewport(page)
    await page.getByRole('button', { name: 'Nuevo medicamento' }).click()
    const b = await boxOf(modalCard(page))
    // width = min(90vw, 1600px, 100vw - 32px)
    const expected = Math.min(0.9 * vp.width, 1600, vp.width - 32)
    expect(
      Math.abs(b.width - expected),
      `ancho ${Math.round(b.width)} ≈ ${Math.round(expected)} (90%)`,
    ).toBeLessThanOrEqual(8)
  })

  test('[tamaño] un formulario CORTO se ajusta al contenido (no fuerza 90vh)', async ({ page }) => {
    const vp = viewport(page)
    await page.getByRole('button', { name: 'Nuevo medicamento' }).click()
    const b = await boxOf(modalCard(page))
    // El form tiene 2 campos: debe ser bastante más bajo que el 90% de la pantalla.
    expect(
      b.height,
      `alto ${Math.round(b.height)} debe ser << 90vh (${Math.round(0.9 * vp.height)})`,
    ).toBeLessThan(0.7 * vp.height)
    expectWithinViewport(b, vp)
  })

  test('[compact] el diálogo de confirmación "Pausar" es compacto (no 90%) y centrado', async ({
    page,
  }) => {
    const vp = viewport(page)
    // Se crea un medicamento propio (único) para poder pausarlo.
    const name = `MedUX ${uniqueSuffix()}`
    await page.getByRole('button', { name: 'Nuevo medicamento' }).click()
    const form = page.getByRole('dialog', { name: 'Nuevo medicamento' })
    await form.getByLabel(/^Nombre/).fill(name)
    await form.getByRole('button', { name: 'Crear medicamento' }).click()
    await expect(form).toBeHidden()

    const row = page.getByRole('row', {
      name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    })
    await row.getByRole('button', { name: 'Pausar' }).click()

    const confirm = page.getByRole('dialog', { name: 'Pausar medicamento' })
    await expect(confirm).toBeVisible()
    const b = await boxOf(confirm.locator('.card'))
    // Compacto: muy por debajo del 90% del ancho (ancho fijo ~620px).
    expect(b.width, `ancho compacto ${Math.round(b.width)}`).toBeLessThan(0.55 * vp.width)
    expect(b.width, 'ancho compacto acotado').toBeLessThanOrEqual(680)
    expectCentered(b, vp)
    await confirm.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('[apertura] "Editar medicamento" abre precargado y centrado', async ({ page }) => {
    const vp = viewport(page)
    const name = `MedUX ${uniqueSuffix()}`
    await page.getByRole('button', { name: 'Nuevo medicamento' }).click()
    const form = page.getByRole('dialog', { name: 'Nuevo medicamento' })
    await form.getByLabel(/^Nombre/).fill(name)
    await form.getByRole('button', { name: 'Crear medicamento' }).click()
    await expect(form).toBeHidden()

    const row = page.getByRole('row', {
      name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    })
    await row.getByRole('button', { name: 'Editar' }).click()
    const edit = page.getByRole('dialog', { name: 'Editar medicamento' })
    await expect(edit).toBeVisible()
    await expect(edit.getByLabel(/^Nombre/)).toHaveValue(name)
    expectCentered(await boxOf(edit.locator('.card')), vp)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 2. Plan terapéutico — modal grande + desplegable (teleport / scroll / flip)
// ════════════════════════════════════════════════════════════════════════════
test.describe('Modales · plan terapéutico y desplegables', () => {
  test.describe.configure({ mode: 'serial' })

  let owner: OwnerData
  let petName: string

  // Se siembra UNA sola vez (propietario + mascota) y cada test lo reutiliza.
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await gotoNuevaConsulta(page)
    owner = await createAndSelectOwner(page)
    await startCreatePet(page)
    const pet = randomPet()
    await fillValidPet(page, pet)
    await footerNext(page, 'Guardar mascota').click()
    await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
    petName = pet.name
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await selectExistingOwnerAndPet(page, owner, petName)
  })

  test('[apertura] el modal de Plan terapéutico abre centrado, ~90% de ancho y dentro del viewport', async ({
    page,
  }) => {
    const vp = viewport(page)
    await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    const b = await boxOf(modalCard(page))
    expectWithinViewport(b, vp)
    expectCentered(b, vp)
    const expected = Math.min(0.9 * vp.width, 1600, vp.width - 32)
    expect(
      Math.abs(b.width - expected),
      `ancho ${Math.round(b.width)} ≈ ${Math.round(expected)}`,
    ).toBeLessThanOrEqual(8)
    // Un modal con contenido: su alto llega hasta el tope (~90vh) sin recortarse.
    expect(b.height, 'alto acotado ≤ 90vh').toBeLessThanOrEqual(0.9 * vp.height + 2)
  })

  test('[desplegable] el panel del select se teletransporta a <body> y queda dentro del viewport', async ({
    page,
  }) => {
    const vp = viewport(page)
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await d
      .locator('.field', { hasText: 'Nombre del medicamento' })
      .first()
      .locator('button.trigger')
      .click()

    const panel = page.locator('div.panel')
    await expect(panel).toBeVisible()
    // Teletransportado: el panel NO está dentro del overlay del modal.
    await expect(
      page.locator('.overlay div.panel'),
      'el panel se teletransporta fuera del modal',
    ).toHaveCount(0)
    // Y NUNCA se recorta: cabe completo dentro del viewport.
    expectWithinViewport(await boxOf(panel), vp)
  })

  test('[desplegable] muestra el catálogo global y seleccionar actualiza el campo', async ({
    page,
  }) => {
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    const field = d.locator('.field', { hasText: 'Nombre del medicamento' }).first()
    await field.locator('button.trigger').click()
    const panel = page.locator('div.panel')
    await expect(panel.locator('button.item', { hasText: 'Meloxicam' })).toBeVisible()
    await panel.locator('button.item', { hasText: 'Meloxicam' }).first().click()
    await expect(field.locator('button.trigger')).toContainText('Meloxicam')
  })

  test('[desplegable] "Crear medicamento" abre el formulario SIN cerrar el panel (regresión)', async ({
    page,
  }) => {
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await d
      .locator('.field', { hasText: 'Nombre del medicamento' })
      .first()
      .locator('button.trigger')
      .click()
    const panel = page.locator('div.panel')
    await panel.locator('button.create').click()
    // El panel sigue abierto y ahora muestra el form de creación.
    await expect(panel).toBeVisible()
    await expect(panel.getByPlaceholder('Nombre')).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Crear y seleccionar' })).toBeVisible()
  })

  test('[desplegable] crear inline dispara POST /medicaments 201 y auto-selecciona', async ({
    page,
  }) => {
    const name = `MedInline ${uniqueSuffix()}`
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    const postP = page.waitForResponse(
      (r) => new URL(r.url()).pathname.endsWith('/medicaments') && r.request().method() === 'POST',
    )
    await createInSearchable(page, 'Nombre del medicamento', name)
    const resp = await postP
    expect(resp.status(), `POST /medicaments → ${resp.status()}`).toBe(201)
    const field = d.locator('.field', { hasText: 'Nombre del medicamento' }).first()
    await expect(field.locator('button.trigger')).toContainText(name)
  })

  test('[scroll] con varios ítems, el select del ÚLTIMO no se recorta (panel dentro del viewport)', async ({
    page,
  }) => {
    const vp = viewport(page)
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    // Se agregan medicamentos hasta empujar el último select al fondo del modal.
    for (let i = 0; i < 3; i++) {
      await d.getByRole('button', { name: 'Agregar otro medicamento' }).click()
    }
    const triggers = d
      .locator('.field', { hasText: 'Nombre del medicamento' })
      .locator('button.trigger')
    await expect(triggers).toHaveCount(4)
    const last = triggers.last()
    await last.scrollIntoViewIfNeeded()
    await last.click()

    const panel = page.locator('div.panel')
    await expect(panel).toBeVisible()
    const pb = await boxOf(panel)
    // Aunque el campo esté al fondo, el panel (teletransportado + flip) queda
    // completo dentro del viewport: no lo recorta ni el modal ni la pantalla.
    expectWithinViewport(pb, vp)
    // Debe seguir mostrando las opciones del catálogo utilizables.
    await expect(panel.locator('button.item', { hasText: 'Meloxicam' })).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 3. BaseSelect (Tipo de consulta) — el listbox también cabe en el viewport
// ════════════════════════════════════════════════════════════════════════════
test.describe('Modales · BaseSelect posiciona su listbox dentro del viewport', () => {
  test.describe.configure({ mode: 'serial' })

  let owner: OwnerData
  let petName: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await gotoNuevaConsulta(page)
    owner = await createAndSelectOwner(page)
    await startCreatePet(page)
    const pet = randomPet()
    await fillValidPet(page, pet)
    await footerNext(page, 'Guardar mascota').click()
    await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
    petName = pet.name
    await page.close()
  })

  test('[desplegable] el listbox de "Tipo de consulta" (teleport a body) queda dentro del viewport', async ({
    page,
  }) => {
    const vp = viewport(page)
    await selectExistingOwnerAndPet(page, owner, petName)
    await page.getByRole('combobox', { name: /Tipo de consulta/ }).click()
    const listbox = page.getByRole('listbox')
    await expect(listbox).toBeVisible()
    expectWithinViewport(await boxOf(listbox), vp)
    // Y el listbox NO vive dentro del contenedor del campo (está teletransportado a body).
    await expect(page.locator('.field [role="listbox"]')).toHaveCount(0)
  })
})
