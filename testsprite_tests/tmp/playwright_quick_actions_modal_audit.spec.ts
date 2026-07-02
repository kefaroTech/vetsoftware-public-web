import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.PW_BASE_URL ?? 'http://127.0.0.1:5175'
const outDir = path.resolve('testsprite_tests/tmp/playwright-quick-actions-modal-audit')

function fakeJwt() {
  const payload = Buffer.from(
    JSON.stringify({
      sub: '1',
      companyId: 1,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      type: 'EMPLOYEE',
    }),
  ).toString('base64url')
  return `header.${payload}.signature`
}

async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const p = url.pathname
    let body: unknown = []

    if (p.endsWith('/auth/me')) {
      body = {
        id: 1,
        type: 'EMPLOYEE',
        companyId: 1,
        name: 'Laura Gomez',
        employeeCode: 'EMP-001',
        permissions: [
          'admin.all',
          'consultation.create',
          'vaccination.create',
          'laboratoryTest.create',
          'diagnosticimaging.create',
          'hospitalization.create',
          'deworming.create',
          'surgery.create',
          'prescription.create',
        ],
      }
    } else if (p.endsWith('/consultation-types')) {
      body = [{ id: 1, name: 'Consulta general', description: null, createdDate: '2026-01-01' }]
    } else if (p.endsWith('/vaccination-types/available')) {
      body = [
        { id: 1, name: 'Rabia', description: 'Anual', createdDate: '2026-01-01' },
        { id: 2, name: 'Polivalente', description: 'Refuerzo', createdDate: '2026-01-01' },
      ]
    } else if (request.method() !== 'GET') {
      body = { id: 1, version: 1 }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

function consultationDraft() {
  return {
    step: 2,
    owner: {
      id: '1',
      name: 'Carla Mendoza',
      document: '1020304050',
      phone: '+57 300 123 4567',
      email: 'carla.mendoza@clinica-norte.example',
      address: 'Carrera 48 # 18-24',
      city: null,
      pets: ['10'],
    },
    ownerCreating: null,
    pet: {
      id: '10',
      code: 'PET-010',
      name: 'Milo',
      specie: { id: '1', name: 'Canino' },
      breed: { id: '1', name: 'Mestizo', specieId: '1' },
      gender: 'MALE',
      bod: '2022-05-12',
      color: 'Cafe',
      weight: 12.4,
      weightMeasuredAt: '2026-07-01',
      weightType: 'KILOGRAMS',
      size: 42,
      animalType: 'NONE',
      reproductiveState: 'NO_STERILIZED',
      deceased: false,
      ownerId: '1',
    },
    petCreating: null,
    consultation: {
      date: '2026-07-02',
      typeId: '1',
      anamnesis: 'Paciente activo, sin signos de alarma.',
      diagnosis: '',
      diagnosticPlan: '',
      therapeuticPlan: '',
      nextControlDate: '',
      nextControlNotes: '',
      weight: '',
    },
    consultationType: { id: '1', name: 'Consulta general' },
    prescriptions: [],
    laboratoryTests: [],
    diagnosticImagings: [],
    vaccinations: [],
    hospitalizations: [],
    dewormings: [],
    surgeries: [],
  }
}

test('quick action vaccination modal is wider and notes use full row', async ({ page }) => {
  test.setTimeout(60_000)
  fs.mkdirSync(outDir, { recursive: true })
  await mockApi(page)
  await page.addInitScript(
    ({ token, draft }) => {
      window.localStorage.setItem(
        'vetsoft.auth',
        JSON.stringify({ token, type: 'Bearer', refreshToken: 'refresh-token' }),
      )
      window.localStorage.setItem('vetrina:nueva-consulta-draft', JSON.stringify(draft))
    },
    { token: fakeJwt(), draft: consultationDraft() },
  )

  for (const viewport of [
    { label: 'desktop', width: 1440, height: 1000 },
    { label: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto(`${baseUrl}/dashboard/consulta/nueva?paso=2`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    })
    await page.getByRole('button', { name: /Vacunaci/i }).click()
    await expect(page.getByRole('dialog', { name: /Aplicar vacuna/i })).toBeVisible()
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined)

    const metrics = await page.evaluate(() => {
      const modal = document.querySelector<HTMLElement>('.overlay .card')
      const grid = document.querySelector<HTMLElement>('.vac-grid')
      const notes = document.querySelector<HTMLElement>('.notes-field')
      const nextField = Array.from(document.querySelectorAll<HTMLElement>('.field')).find((el) =>
        (el.textContent ?? '').includes('Próxima dosis') ||
        (el.textContent ?? '').includes('Proxima dosis') ||
        (el.textContent ?? '').includes('PrÃ³xima dosis'),
      )
      const rect = (el: HTMLElement | null | undefined) => {
        const r = el?.getBoundingClientRect()
        return r
          ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
          : null
      }
      return {
        modal: rect(modal),
        grid: rect(grid),
        notes: rect(notes),
        nextField: rect(nextField),
      }
    })

    await page.screenshot({
      path: path.join(outDir, `${viewport.label}-vaccination-modal.png`),
      fullPage: true,
    })

    expect(metrics.modal?.width).toBeGreaterThan(viewport.label === 'desktop' ? 960 : 330)
    expect(metrics.notes?.width).toBeGreaterThan(viewport.label === 'desktop' ? 780 : 250)
    if (viewport.label === 'desktop') {
      expect(metrics.notes?.top ?? 0).toBeGreaterThan(metrics.nextField?.bottom ?? 0)
    }
  }
})

test('all quick action modals use the wider layout on desktop', async ({ page }) => {
  test.setTimeout(60_000)
  await mockApi(page)
  await page.addInitScript(
    ({ token, draft }) => {
      window.localStorage.setItem(
        'vetsoft.auth',
        JSON.stringify({ token, type: 'Bearer', refreshToken: 'refresh-token' }),
      )
      window.localStorage.setItem('vetrina:nueva-consulta-draft', JSON.stringify(draft))
    },
    { token: fakeJwt(), draft: consultationDraft() },
  )

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${baseUrl}/dashboard/consulta/nueva?paso=2`, {
    waitUntil: 'domcontentloaded',
    timeout: 15_000,
  })

  for (const index of [0, 1, 2, 3, 4, 5, 6]) {
    await page.locator('.action').nth(index).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const width = await page.locator('.overlay .card').evaluate((el) => el.getBoundingClientRect().width)
    expect(width, `quick action modal index ${index}`).toBeGreaterThan(960)
    await page.getByLabel('Cerrar').click()
    await expect(page.getByRole('dialog')).toBeHidden()
  }
})
