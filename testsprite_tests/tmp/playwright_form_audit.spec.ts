import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:5173'
const outDir = path.resolve('testsprite_tests/tmp/playwright-form-audit')

const permissions = [
  'admin.all',
  'consultation.create',
  'vaccination.create',
  'hospitalization.create',
  'deworming.create',
  'diagnosticimaging.create',
  'laboratoryTest.create',
  'laboratoryTest.read',
  'surgery.create',
  'spa.create',
  'owner.create',
  'owner.read',
  'animal.create',
  'animal.read',
  'employee.create',
  'employee.read',
  'employee.update',
  'rolePermissions.read',
  'rolePermissions.create',
  'rolePermissions.update',
  'role.read',
  'product.read',
  'product.create',
  'service.read',
  'service.create',
  'promotion.read',
  'promotion.create',
  'tax.read',
  'tax.create',
  'openAccount.read',
  'openAccount.create',
  'electronicbilling.create',
]

function fakeJwt() {
  const payload = Buffer.from(JSON.stringify({
    sub: '1',
    companyId: 1,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    type: 'EMPLOYEE',
  })).toString('base64url')
  return `header.${payload}.signature`
}

function pageResponse(content: unknown[] = []) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    number: 0,
    size: 20,
    first: true,
    last: true,
  }
}

async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const p = url.pathname
    let body: unknown = pageResponse()

    if (p.endsWith('/auth/me')) {
      body = {
        id: 1,
        type: 'EMPLOYEE',
        companyId: 1,
        name: 'Laura Gomez',
        employeeCode: 'EMP-001',
        permissions,
      }
    } else if (p.endsWith('/auth/login/employee')) {
      body = { token: fakeJwt(), type: 'Bearer', refreshToken: 'refresh-token' }
    } else if (p.endsWith('/countries')) {
      body = [{ id: 1, name: 'Colombia' }]
    } else if (p.includes('/countries/1/states')) {
      body = [{ id: 10, name: 'Antioquia' }]
    } else if (p.includes('/states/10/cities')) {
      body = [{ id: 100, name: 'Medellin' }]
    } else if (p.includes('/roles')) {
      body = [{
        id: 1,
        name: 'Veterinario',
        code: 'VET',
        company: { id: 1, name: 'Clinica Norte', identifier: '900123456' },
        permissions: [],
        enabled: true,
      }]
    } else if (p.includes('/taxes')) {
      body = [{ id: 1, name: 'IVA 19%', percentage: 19, taxType: 'IVA', active: true }]
    } else if (p.includes('/product-categories') || p.includes('/productCategories')) {
      body = [{ id: 1, name: 'Alimentos', description: 'Productos de consumo' }]
    } else if (p.includes('/service-categories') || p.includes('/serviceCategories')) {
      body = [{ id: 1, name: 'Consulta', description: 'Servicios clinicos' }]
    } else if (p.includes('/products/search')) {
      body = pageResponse([])
    } else if (p.includes('/services/search')) {
      body = pageResponse([])
    } else if (p.includes('/products')) {
      body = []
    } else if (p.includes('/services')) {
      body = []
    } else if (p.includes('/promotions')) {
      body = []
    } else if (
      p.includes('/types') ||
      p.includes('/colors') ||
      p.includes('/species') ||
      p.includes('/breeds') ||
      p.includes('/modules') ||
      p.includes('/permissions') ||
      p.includes('/sub-modules') ||
      p.includes('/resolutions') ||
      p.includes('/documents') ||
      p.includes('/company-tax-profile')
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

async function setAuth(page: Page) {
  if (!page.url().startsWith(baseUrl)) {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  }
  await page.evaluate((session) => {
    localStorage.setItem('vetsoft.auth', JSON.stringify(session))
  }, { token: fakeJwt(), type: 'Bearer', refreshToken: 'refresh-token' })
}

async function maybeClick(page: Page, label: string | RegExp) {
  const locator = page.getByRole('button', { name: label }).first()
  if (await locator.isVisible().catch(() => false)) {
    await locator.click()
    await page.waitForTimeout(250)
    return true
  }
  return false
}

async function openInteractiveControls(page: Page) {
  const selectors = [
    '.select .trigger',
    '.ss .trigger',
    '.date-wrap .mx-input',
    '.v-select .v-field',
    '[role="combobox"]',
  ]

  for (const selector of selectors) {
    const count = await page.locator(selector).count()
    for (let i = 0; i < Math.min(count, 3); i++) {
      const target = page.locator(selector).nth(i)
      if (!(await target.isVisible().catch(() => false))) continue
      await target.click({ force: true }).catch(() => undefined)
      await page.waitForTimeout(120)
      await auditFormLayout(page, `open-${selector}-${i}`)
      await page.keyboard.press('Escape').catch(() => undefined)
      await page.waitForTimeout(80)
    }
  }
}

async function auditFormLayout(page: Page, stage: string) {
  return page.evaluate((stageName) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const controlSelector = [
      '.input',
      '.textarea',
      '.select',
      '.ss',
      '.date-wrap',
      '.v-field',
      '.search',
      '.fsel',
      'select',
      'textarea',
      'input:not([type="hidden"])',
      '.panel[role="listbox"]',
      '.ss .panel',
      '.mx-datepicker-main',
      '.v-overlay__content',
    ].join(',')

    const raw = Array.from(document.querySelectorAll<HTMLElement>(controlSelector))
    const visible = raw.filter((el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0
    })

    const modalRoot = Array.from(document.querySelectorAll<HTMLElement>('.modal-card, .v-overlay__content, [role="dialog"]'))
      .find((el) => {
        const r = el.getBoundingClientRect()
        const s = getComputedStyle(el)
        return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0
      })
    const scoped = modalRoot
      ? visible.filter((el) => modalRoot.contains(el) || el === modalRoot)
      : visible

    const topLevel: HTMLElement[] = []
    for (const el of scoped) {
      if (
        el.matches('input:not([type="hidden"]), textarea, select') &&
        el.closest('.input, .textarea, .select, .ss, .date-wrap, .v-field, .search')
      ) {
        continue
      }
      if (el.matches('input[type="checkbox"], input[type="radio"]')) continue
      if (topLevel.some((other) => other.contains(el))) continue
      for (let i = topLevel.length - 1; i >= 0; i--) {
        if (el.contains(topLevel[i])) topLevel.splice(i, 1)
      }
      topLevel.push(el)
    }

    const issues: Array<Record<string, unknown>> = []
    const meta = (el: HTMLElement) => ({
      tag: el.tagName,
      className: String(el.className),
      text: (el.textContent || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').trim().slice(0, 80),
    })

    for (const el of topLevel) {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      const isOverlay = el.matches('.panel[role="listbox"], .ss .panel, .mx-datepicker-main, .v-overlay__content')
      if (r.width < 44 || r.height < 28) {
        issues.push({ stage: stageName, type: 'too-small', ...meta(el), rect: { x: r.x, y: r.y, width: r.width, height: r.height } })
      }
      if (r.left < -1 || r.right > vw + 1 || r.top < -1 || (isOverlay && r.bottom > vh + 1)) {
        issues.push({ stage: stageName, type: 'offscreen', ...meta(el), rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom }, viewport: { vw, vh } })
      }
      if ((s.overflow === 'hidden' || s.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 3) {
        issues.push({ stage: stageName, type: 'clipped-control', ...meta(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })
      }
    }

    for (let i = 0; i < topLevel.length; i++) {
      const a = topLevel[i]
      const ar = a.getBoundingClientRect()
      for (let j = i + 1; j < topLevel.length; j++) {
        const b = topLevel[j]
        if (a.contains(b) || b.contains(a)) continue
        const br = b.getBoundingClientRect()
        const ix = Math.max(0, Math.min(ar.right, br.right) - Math.max(ar.left, br.left))
        const iy = Math.max(0, Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top))
        if (ix > 8 && iy > 8) {
          issues.push({ stage: stageName, type: 'overlap', a: meta(a), b: meta(b), intersection: { width: ix, height: iy } })
        }
      }
    }

    return { stage: stageName, controlCount: topLevel.length, issues }
  }, stage)
}

test('text fields and dropdowns are distributed without overlap', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  fs.mkdirSync(outDir, { recursive: true })
  await mockApi(page)

  const scenarios = [
    { name: 'login', path: '/', auth: false, clicks: [] },
    { name: 'signup', path: '/signup', auth: false, clicks: [] },
    { name: 'consulta-owner', path: '/dashboard/consulta/nueva', auth: true, clicks: [/Registrar nuevo propietario/i] },
    { name: 'empleados-new', path: '/dashboard/empleados', auth: true, clicks: [/Nuevo empleado/i] },
    { name: 'roles-new', path: '/dashboard/roles', auth: true, clicks: [/Crear rol/i] },
    { name: 'inventario-new', path: '/dashboard/tienda/inventario', auth: true, clicks: [/Nuevo producto/i] },
    { name: 'servicios-new', path: '/dashboard/tienda/servicios', auth: true, clicks: [/Nuevo servicio/i] },
    { name: 'promociones-new', path: '/dashboard/tienda/promociones', auth: true, clicks: [/Nueva promoci/i] },
    { name: 'impuestos-new', path: '/dashboard/tienda/impuestos', auth: true, clicks: [/Nuevo impuesto/i] },
    { name: 'cuentas-new', path: '/dashboard/cuentas', auth: true, clicks: [/Abrir cuenta/i] },
  ]

  const report: unknown[] = []
  const pageErrors: string[] = []
  let currentScenario = ''
  page.on('pageerror', (error) => pageErrors.push(`${currentScenario}: ${error.message}`))

  for (const viewport of [
    { label: 'desktop', width: 1440, height: 1000 },
    { label: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const scenario of scenarios) {
      currentScenario = `${viewport.label}/${scenario.name}`
      if (scenario.auth) await setAuth(page)
      else if (!page.url().startsWith(baseUrl)) await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
      if (!scenario.auth) await page.evaluate(() => localStorage.clear())

      await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined)
      for (const click of scenario.clicks) await maybeClick(page, click)

      report.push({ viewport: viewport.label, scenario: scenario.name, ...(await auditFormLayout(page, 'initial')) })
      await openInteractiveControls(page)
      await page.screenshot({
        path: path.join(outDir, `${viewport.label}-${scenario.name}.png`),
        fullPage: true,
      })
    }
  }

  const flatIssues = report.flatMap((entry: any) =>
    entry.issues.map((issue: unknown) => ({
      viewport: entry.viewport,
      scenario: entry.scenario,
      ...issue as Record<string, unknown>,
    })),
  )
  fs.writeFileSync(path.join(outDir, 'form-findings.json'), JSON.stringify({ pageErrors, issues: flatIssues, report }, null, 2), 'utf8')
  await testInfo.attach('form-findings', {
    path: path.join(outDir, 'form-findings.json'),
    contentType: 'application/json',
  })

  expect(pageErrors).toEqual([])
  expect(flatIssues).toEqual([])
})
