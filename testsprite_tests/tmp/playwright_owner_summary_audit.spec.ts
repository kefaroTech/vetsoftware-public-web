import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:5173'
const outDir = path.resolve('testsprite_tests/tmp/playwright-owner-summary-audit')

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
        permissions: ['admin.all', 'consultation.create', 'animal.read'],
      }
    } else if (p.endsWith('/animals/by-owner/1')) {
      body = [
        {
          id: 10,
          name: 'Milo',
          code: 'PET-010',
          specie: { id: 1, name: 'Canino' },
          breed: { id: 1, name: 'Mestizo' },
          owner: { id: 1, name: 'Carla Mendoza', document: '1020304050' },
          gender: 'MALE',
          weightType: 'KILOGRAMS',
          animalType: 'NONE',
          reproductiveState: 'NO_STERILIZED',
          color: { id: 1, name: 'Cafe' },
          bod: '2022-05-12',
          weight: 12.4,
          weightMeasuredAt: '2026-07-01',
          size: 42,
          deceased: false,
          deceasedDate: null,
          company: { id: 1, name: 'Clinica Norte', identifier: '900123456' },
          createdDate: '2026-01-01',
        },
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

function selectedOwnerDraft() {
  return {
    step: 1,
    owner: {
      id: '1',
      name: 'Carla Mendoza',
      document: '1020304050',
      phone: '+57 300 123 4567',
      email: 'carla.mendoza@clinica-norte.example',
      address: 'Carrera 48 # 18-24, Torre Medica, Consultorio 502',
      city: {
        id: '100',
        name: 'Medellin',
        state: {
          id: '10',
          name: 'Antioquia',
          country: { id: '1', name: 'Colombia' },
        },
      },
      pets: ['10'],
    },
    ownerCreating: null,
    pet: null,
    petCreating: null,
    consultation: {
      date: '2026-07-02',
      typeId: '',
      anamnesis: '',
      diagnosis: '',
      diagnosticPlan: '',
      therapeuticPlan: '',
      nextControlDate: '',
      nextControlNotes: '',
      weight: '',
    },
    consultationType: null,
    prescriptions: [],
    laboratoryTests: [],
    diagnosticImagings: [],
    vaccinations: [],
    hospitalizations: [],
    dewormings: [],
    surgeries: [],
  }
}

test('owner summary contact icons have inner spacing', async ({ page }) => {
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
    { token: fakeJwt(), draft: selectedOwnerDraft() },
  )

  for (const viewport of [
    { label: 'desktop', width: 1440, height: 1000 },
    { label: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto(`${baseUrl}/dashboard/consulta/nueva?paso=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    })
    await expect(page.getByText('Carla Mendoza')).toBeVisible()
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined)

    const rows = page.locator('.row')
    await expect(rows).toHaveCount(4)
    const metrics = await rows.evaluateAll((elements) =>
      elements.map((row) => {
        const icon = row.querySelector<HTMLElement>('.ic')
        const rowRect = row.getBoundingClientRect()
        const iconRect = icon?.getBoundingClientRect()
        return {
          label: row.textContent?.trim() ?? '',
          leftInset: iconRect ? iconRect.left - rowRect.left : 0,
          topInset: iconRect ? iconRect.top - rowRect.top : 0,
          rowWidth: rowRect.width,
          rowHeight: rowRect.height,
        }
      }),
    )
    const normalizedLabels = metrics.map((metric) =>
      metric.label.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    )

    await page.screenshot({
      path: path.join(outDir, `${viewport.label}-owner-summary.png`),
      fullPage: true,
    })
    expect(normalizedLabels.some((label) => label.includes('Telefono'))).toBe(true)
    expect(normalizedLabels.some((label) => label.includes('Email'))).toBe(true)
    expect(normalizedLabels.some((label) => label.includes('Direccion'))).toBe(true)
    expect(normalizedLabels.some((label) => label.includes('Ciudad'))).toBe(true)
    for (const metric of metrics) {
      expect(metric.leftInset, `${viewport.label} ${metric.label}`).toBeGreaterThanOrEqual(10)
      expect(metric.topInset, `${viewport.label} ${metric.label}`).toBeGreaterThanOrEqual(10)
      expect(metric.rowWidth, `${viewport.label} ${metric.label}`).toBeGreaterThan(120)
      expect(metric.rowHeight, `${viewport.label} ${metric.label}`).toBeGreaterThan(44)
    }
  }
})
