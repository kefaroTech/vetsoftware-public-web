import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.PW_BASE_URL ?? 'http://127.0.0.1:5175'
const outDir = path.resolve('testsprite_tests/tmp/playwright-pet-form-spacing-audit')

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
        permissions: ['admin.all', 'consultation.create', 'animal.read', 'animal.create'],
      }
    } else if (p.endsWith('/animals/by-owner/1')) {
      body = []
    } else if (p.endsWith('/species')) {
      body = [{ id: 1, name: 'Canino' }, { id: 2, name: 'Felino' }]
    } else if (p.includes('/species/1/breeds')) {
      body = [{ id: 1, name: 'Mestizo' }, { id: 2, name: 'Labrador' }]
    } else if (p.endsWith('/colors')) {
      body = [{ id: 1, name: 'Cafe' }, { id: 2, name: 'Negro' }]
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
      address: 'Carrera 48 # 18-24',
      city: {
        id: '100',
        name: 'Medellin',
        state: {
          id: '10',
          name: 'Antioquia',
          country: { id: '1', name: 'Colombia' },
        },
      },
      pets: [],
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

test('new pet form controls keep spacing inside cards', async ({ page }) => {
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
    await page.getByRole('button', { name: /Registrar primera mascota/i }).click()
    await expect(page.getByText('Registrar nueva mascota')).toBeVisible()
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined)

    const issues = await page.locator('.section-card').evaluateAll((cards) => {
      const data: Array<Record<string, unknown>> = []
      for (const card of cards) {
        const body = card.querySelector<HTMLElement>('.body')
        if (!body) continue
        const bodyRect = body.getBoundingClientRect()
        const controls = Array.from(
          body.querySelectorAll<HTMLElement>('.input, .select .trigger, .date-wrap, .segmented'),
        )
        for (const control of controls) {
          const rect = control.getBoundingClientRect()
          const leftInset = rect.left - bodyRect.left
          const rightInset = bodyRect.right - rect.right
          if (leftInset < 14 || rightInset < 14) {
            data.push({
              text: control.textContent?.trim() || control.getAttribute('placeholder') || '',
              leftInset,
              rightInset,
              bodyWidth: bodyRect.width,
              controlWidth: rect.width,
            })
          }
        }
      }
      return data
    })

    await page.screenshot({
      path: path.join(outDir, `${viewport.label}-pet-form.png`),
      fullPage: true,
    })
    await page.locator('.content').evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await page.waitForTimeout(250)
    await page.screenshot({
      path: path.join(outDir, `${viewport.label}-pet-form-characteristics.png`),
      fullPage: true,
    })
    expect(issues).toEqual([])
  }
})
