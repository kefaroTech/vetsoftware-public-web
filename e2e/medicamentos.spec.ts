import { test, expect, type Page, type Locator } from '@playwright/test'
import { login, PASSWORD } from './helpers/auth'
import { uniqueSuffix } from './helpers/consulta'

/**
 * E2E del catálogo de MEDICAMENTOS (pantalla de administración + backend real).
 *
 * Cubre, de forma específica:
 *  - LISTAS: la pantalla lista el catálogo (globales sembrados + propios) desde
 *    GET /medicaments/available; los pausados desde GET /medicaments/disabled.
 *  - OBLIGATORIOS / OPCIONALES: nombre obligatorio (mín. 2); descripción opcional.
 *  - TIPOS DE DATOS: el POST envía `name`/`description` como string; la response
 *    trae `id` numérico y `general` booleano.
 *  - HTTP: 201 al crear, 2xx al listar/editar/reactivar, 204 al pausar (DELETE).
 *
 * Los casos que ESCRIBEN usan nombres ÚNICOS por ejecución (uniqueSuffix) para no
 * chocar con la restricción UNIQUE del nombre del catálogo.
 */

// Todos los casos entran por login real. Sin credenciales en el entorno la suite se salta en vez
// de fallar con un login vacío, igual que hacen consulta, acciones e historia.
test.skip(!PASSWORD, 'Define E2E_PASSWORD para correr el suite de medicamentos')

const MEDS_URL = '/dashboard/catalogos/medicamentos'
const SEEDED_GLOBAL = 'Meloxicam' // sembrado global por la migración 173

async function gotoMedicamentos(page: Page): Promise<void> {
  await login(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await page.goto(MEDS_URL)
  await expect(page.getByRole('heading', { name: 'Catálogo de medicamentos' })).toBeVisible()
}

function formDialog(page: Page, name: string | RegExp): Locator {
  return page.getByRole('dialog', { name })
}

async function openNew(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Nuevo medicamento' }).click()
  return formDialog(page, 'Nuevo medicamento')
}

/** Crea un medicamento por la UI (nombre + descripción opcional) y espera el 201. */
async function createMedicament(page: Page, name: string, description?: string): Promise<void> {
  const d = await openNew(page)
  await d.getByLabel(/^Nombre/).fill(name)
  if (description) await d.getByLabel(/Descripción/).fill(description)
  const postP = page.waitForResponse(
    (r) => new URL(r.url()).pathname.endsWith('/medicaments') && r.request().method() === 'POST',
  )
  await d.getByRole('button', { name: 'Crear medicamento' }).click()
  const resp = await postP
  expect(resp.status(), `POST /medicaments → ${resp.status()}`).toBe(201)
  await expect(d).toBeHidden()
}

/** Fila (role=row) de la tabla que contiene el texto dado. */
function row(page: Page, text: string): Locator {
  return page.getByRole('row', { name: new RegExp(escapeRe(text)) })
}
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ════════════════════════════════════════════════════════════════════════════
// A. Carga de la pantalla y listas (HTTP)
// ════════════════════════════════════════════════════════════════════════════
test.describe('Medicamentos · carga y listas', () => {
  test('[http] al abrir, GET /medicaments/available responde 2xx con un array', async ({
    page,
  }) => {
    await login(page)
    const respP = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.endsWith('/medicaments/available') &&
        r.request().method() === 'GET',
    )
    await page.goto(MEDS_URL)
    const resp = await respP
    expect(resp.ok(), `GET available → ${resp.status()}`).toBeTruthy()
    const json = await resp.json()
    expect(Array.isArray(json), 'la respuesta debe ser una lista').toBe(true)
  })

  test('[data] lista un medicamento GLOBAL sembrado como "Global" y de solo lectura', async ({
    page,
  }) => {
    await gotoMedicamentos(page)
    const r = row(page, SEEDED_GLOBAL)
    await expect(r).toBeVisible()
    await expect(r.getByText('Global')).toBeVisible()
    await expect(r.getByText('Solo lectura')).toBeVisible()
    // Un global NO expone acciones de editar/pausar.
    await expect(r.getByRole('button', { name: 'Editar' })).toHaveCount(0)
    await expect(r.getByRole('button', { name: 'Pausar' })).toHaveCount(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// B. Validación: obligatorios vs opcionales
// ════════════════════════════════════════════════════════════════════════════
test.describe('Medicamentos · validación de campos', () => {
  test.beforeEach(async ({ page }) => {
    await gotoMedicamentos(page)
  })

  test('[det] nombre vacío exige mínimo 2 (obligatorio); descripción es opcional', async ({
    page,
  }) => {
    const d = await openNew(page)
    // Sin escribir nada: al intentar crear, el nombre valida y el modal NO se cierra.
    await d.getByRole('button', { name: 'Crear medicamento' }).click()
    await expect(d.getByText('Mínimo 2 caracteres')).toBeVisible()
    await expect(d).toBeVisible()
    // La descripción es opcional: no muestra error propio.
    await expect(d.getByText('Máximo 500 caracteres')).toHaveCount(0)
  })

  test('[det] nombre de 1 carácter exige mínimo 2 (blur)', async ({ page }) => {
    const d = await openNew(page)
    await d.getByLabel(/^Nombre/).fill('A')
    await d.getByLabel(/^Nombre/).blur()
    await expect(d.getByText('Mínimo 2 caracteres')).toBeVisible()
  })

  test('[det] nombre de 2 caracteres es válido (no muestra error)', async ({ page }) => {
    const d = await openNew(page)
    await d.getByLabel(/^Nombre/).fill('Ab')
    await d.getByLabel(/^Nombre/).blur()
    await expect(d.getByText('Mínimo 2 caracteres')).toHaveCount(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// C. Crear (tipos de datos + HTTP)
// ════════════════════════════════════════════════════════════════════════════
test.describe('Medicamentos · crear', () => {
  test.beforeEach(async ({ page }) => {
    await gotoMedicamentos(page)
  })

  test('[data] crear SOLO con nombre (descripción opcional) → 201 y aparece como "Propio"', async ({
    page,
  }) => {
    const name = `Med E2E ${uniqueSuffix()}`
    await createMedicament(page, name)
    const r = row(page, name)
    await expect(r).toBeVisible()
    await expect(r.getByText('Propio')).toBeVisible()
  })

  test('[data] crear con descripción → el POST manda name y description como STRING', async ({
    page,
  }) => {
    const name = `Med E2E ${uniqueSuffix()}`
    const description = 'Antibiótico de amplio espectro'
    const d = await openNew(page)
    await d.getByLabel(/^Nombre/).fill(name)
    await d.getByLabel(/Descripción/).fill(description)
    const reqP = page.waitForRequest(
      (r) => new URL(r.url()).pathname.endsWith('/medicaments') && r.method() === 'POST',
    )
    const respP = page.waitForResponse(
      (r) => new URL(r.url()).pathname.endsWith('/medicaments') && r.request().method() === 'POST',
    )
    await d.getByRole('button', { name: 'Crear medicamento' }).click()

    const body = (await reqP).postDataJSON()
    expect(typeof body.name).toBe('string')
    expect(body.name).toBe(name)
    expect(typeof body.description).toBe('string')
    expect(body.description).toBe(description)
    // El request NO debe mandar companyId ni general (el backend los deriva).
    expect(body.companyId).toBeUndefined()

    const resp = await respP
    const json = await resp.json()
    expect(typeof json.id).toBe('number')
    expect(typeof json.general).toBe('boolean')
    expect(json.general).toBe(false) // creado por la empresa → propio, no global
  })
})

// ════════════════════════════════════════════════════════════════════════════
// D. Editar / pausar / reactivar (ciclo de vida + HTTP)
// ════════════════════════════════════════════════════════════════════════════
test.describe('Medicamentos · editar y ciclo de vida', () => {
  test.beforeEach(async ({ page }) => {
    await gotoMedicamentos(page)
  })

  test('[data] editar un medicamento propio → PUT 2xx y refleja el nuevo nombre', async ({
    page,
  }) => {
    const name = `Med E2E ${uniqueSuffix()}`
    const renamed = `${name} (editado)`
    await createMedicament(page, name)

    await row(page, name).getByRole('button', { name: 'Editar' }).click()
    const d = formDialog(page, 'Editar medicamento')
    await expect(d).toBeVisible()
    await d.getByLabel(/^Nombre/).fill(renamed)
    const putP = page.waitForResponse(
      (r) =>
        /\/medicaments\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'PUT',
    )
    await d.getByRole('button', { name: 'Guardar cambios' }).click()
    const resp = await putP
    expect(resp.ok(), `PUT → ${resp.status()}`).toBeTruthy()
    await expect(row(page, renamed)).toBeVisible()
  })

  test('[data] pausar (DELETE 204) lo saca de disponibles; reactivar (PATCH 2xx) lo devuelve', async ({
    page,
  }) => {
    const name = `Med E2E ${uniqueSuffix()}`
    await createMedicament(page, name)

    // Pausar → DELETE (soft-delete) → 204.
    await row(page, name).getByRole('button', { name: 'Pausar' }).click()
    const confirm = formDialog(page, 'Pausar medicamento')
    await expect(confirm).toBeVisible()
    const delP = page.waitForResponse(
      (r) =>
        /\/medicaments\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'DELETE',
    )
    await confirm.getByRole('button', { name: 'Pausar' }).click()
    const delResp = await delP
    expect(delResp.status(), `DELETE → ${delResp.status()}`).toBe(204)
    await expect(row(page, name)).toHaveCount(0)

    // Pestaña "Pausados" → GET /medicaments/disabled → el pausado aparece.
    await page.getByRole('button', { name: 'Pausados' }).click()
    await expect(row(page, name)).toBeVisible()

    // Reactivar → PATCH /{id}/enable → 2xx → vuelve a disponibles.
    const patchP = page.waitForResponse(
      (r) =>
        /\/medicaments\/\d+\/enable$/.test(new URL(r.url()).pathname) &&
        r.request().method() === 'PATCH',
    )
    await row(page, name).getByRole('button', { name: 'Reactivar' }).click()
    const patchResp = await patchP
    expect(patchResp.ok(), `PATCH enable → ${patchResp.status()}`).toBeTruthy()
    await page.getByRole('button', { name: 'Disponibles' }).click()
    await expect(row(page, name)).toBeVisible()
  })
})
