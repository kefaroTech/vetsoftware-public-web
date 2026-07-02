import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const outDir = path.resolve('testsprite_tests/tmp/playwright-audit')
const baseUrl = 'http://127.0.0.1:5173'

const permissions = [
  'admin.all',
  'agenda.read',
  'consultation.create',
  'prescription.create',
  'medicamentPrescription.create',
  'vaccination.create',
  'vaccination.update',
  'vaccination.delete',
  'hospitalization.create',
  'hospitalization.read',
  'hospitalization.update',
  'hospitalization.delete',
  'deworming.create',
  'deworming.update',
  'deworming.delete',
  'diagnosticimaging.create',
  'diagnosticimaging.update',
  'diagnosticimaging.delete',
  'laboratoryTest.create',
  'laboratoryTest.read',
  'laboratoryTest.update',
  'laboratoryTest.delete',
  'surgery.create',
  'surgery.update',
  'surgery.delete',
  'spa.create',
  'spa.update',
  'spa.delete',
  'owner.create',
  'owner.read',
  'owner.update',
  'owner.delete',
  'animal.create',
  'animal.read',
  'employee.create',
  'employee.read',
  'employee.update',
  'employee.delete',
  'role.read',
  'rolePermissions.create',
  'rolePermissions.read',
  'rolePermissions.update',
  'product.read',
  'product.create',
  'product.update',
  'product.delete',
  'service.read',
  'service.create',
  'service.update',
  'service.delete',
  'productCategory.read',
  'serviceCategory.read',
  'promotion.read',
  'promotion.create',
  'promotion.update',
  'promotion.delete',
  'tax.read',
  'tax.create',
  'tax.update',
  'tax.delete',
  'openAccount.create',
  'openAccount.read',
  'openAccount.update',
  'openAccount.delete',
  'debtOpenAccount.delete',
  'chargeOpenAccount.delete',
  'electronicbilling.create',
]

function fakeJwt() {
  const payload = Buffer.from(
    JSON.stringify({
      sub: '1',
      companyId: 1,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      type: 'EMPLOYEE',
    }),
  )
    .toString('base64url')
  return `header.${payload}.signature`
}

function pageResponse() {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 20,
    first: true,
    last: true,
  }
}

async function mockApi(page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname
    let body: unknown = pageResponse()

    if (pathname.endsWith('/auth/me')) {
      body = {
        id: 1,
        type: 'EMPLOYEE',
        companyId: 1,
        name: 'Laura Gomez',
        employeeCode: 'EMP-001',
        permissions,
      }
    } else if (pathname.endsWith('/auth/login/employee')) {
      body = { token: fakeJwt(), type: 'Bearer', refreshToken: 'refresh-token' }
    } else if (
      pathname.includes('/countries') ||
      pathname.includes('/states') ||
      pathname.includes('/cities') ||
      pathname.includes('/types') ||
      pathname.includes('/colors') ||
      pathname.includes('/species') ||
      pathname.includes('/breeds') ||
      pathname.includes('/products') ||
      pathname.includes('/services') ||
      pathname.includes('/promotions') ||
      pathname.includes('/taxes') ||
      pathname.includes('/roles') ||
      pathname.includes('/resolutions') ||
      pathname.includes('/numbering') ||
      pathname.includes('/documents') ||
      pathname.includes('/company-tax-profile') ||
      pathname.includes('/modules') ||
      pathname.includes('/permissions') ||
      pathname.includes('/sub-modules') ||
      pathname.includes('/categories')
    ) {
      body = []
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

test('visual audit across handoff target screens', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  fs.mkdirSync(outDir, { recursive: true })
  const findings: unknown[] = []
  const errors: string[] = []

  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) errors.push(`${msg.type()}: ${msg.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

  await mockApi(page)

  const routes = [
    { name: 'login', path: '/', auth: false },
    { name: 'signup', path: '/signup', auth: false },
    { name: 'home', path: '/dashboard', auth: true },
    { name: 'agenda', path: '/dashboard/agenda', auth: true },
    { name: 'consulta-nueva', path: '/dashboard/consulta/nueva', auth: true },
    { name: 'historia', path: '/dashboard/consulta/historial', auth: true },
    { name: 'acciones-lab', path: '/dashboard/acciones/laboratorio', auth: true },
    { name: 'laboratorio', path: '/dashboard/laboratorio', auth: true },
    { name: 'hospital', path: '/dashboard/hospital', auth: true },
    { name: 'tienda', path: '/dashboard/tienda', auth: true },
    { name: 'cuentas', path: '/dashboard/cuentas', auth: true },
    { name: 'facturacion', path: '/dashboard/facturacion/habilitacion', auth: true },
    { name: 'empleados', path: '/dashboard/empleados', auth: true },
    { name: 'roles', path: '/dashboard/roles', auth: true },
  ]

  for (const viewport of [
    { label: 'desktop', width: 1440, height: 1000 },
    { label: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const route of routes) {
      if (route.auth) {
        if (!page.url().startsWith(baseUrl)) {
          await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })
        }
        await page.evaluate((session) => {
          localStorage.setItem('vetsoft.auth', JSON.stringify(session))
        }, { token: fakeJwt(), type: 'Bearer', refreshToken: 'refresh-token' })
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
      } else {
        if (!page.url().startsWith(baseUrl)) {
          await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })
        }
        await page.evaluate(() => localStorage.clear())
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
      }
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined)
      await page.screenshot({
        path: path.join(outDir, `${viewport.label}-${route.name}.png`),
        fullPage: true,
      })

      const audit = await page.evaluate(() => {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const doc = document.documentElement
        const overflowX = doc.scrollWidth - doc.clientWidth
        const visible = Array.from(document.querySelectorAll<HTMLElement>('body *'))
          .filter((el) => {
            const style = getComputedStyle(el)
            const rect = el.getBoundingClientRect()
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
          })

        const clippedText = visible
          .filter((el) => {
            const text = (el.textContent || '').trim()
            if (!text || text.length < 4) return false
            const style = getComputedStyle(el)
            return style.overflow !== 'visible' && el.scrollWidth > el.clientWidth + 2
          })
          .slice(0, 8)
          .map((el) => ({
            tag: el.tagName,
            className: String(el.className),
            text: (el.textContent || '').trim().slice(0, 80),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          }))

        const offscreen = visible
          .filter((el) => {
            const rect = el.getBoundingClientRect()
            return rect.right > vw + 2 || rect.left < -2 || rect.top < -2 || rect.bottom > vh + 4000
          })
          .slice(0, 8)
          .map((el) => {
            const rect = el.getBoundingClientRect()
            return {
              tag: el.tagName,
              className: String(el.className),
              text: (el.textContent || '').trim().slice(0, 80),
              rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
            }
          })

        return { overflowX, clippedText, offscreen, title: document.title }
      })
      findings.push({ viewport: viewport.label, route: route.name, ...audit })
    }
  }

  fs.writeFileSync(
    path.join(outDir, 'findings.json'),
    JSON.stringify({ errors, findings }, null, 2),
    'utf8',
  )
  await testInfo.attach('visual-audit-findings', {
    path: path.join(outDir, 'findings.json'),
    contentType: 'application/json',
  })
  expect(errors.filter((msg) => msg.includes('pageerror'))).toEqual([])
})
