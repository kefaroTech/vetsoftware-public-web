import { expect, test, type Page } from '@playwright/test'

const baseUrl = process.env.PW_BASE_URL ?? 'http://127.0.0.1:5175'

const permissions = [
  'admin.all',
  'employee.read',
  'rolePermissions.read',
  'consultation.create',
  'product.read',
  'openAccount.read',
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
  ).toString('base64url')
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
      await new Promise((resolve) => setTimeout(resolve, 450))
      body = {
        id: 1,
        type: 'EMPLOYEE',
        companyId: 1,
        name: 'Laura Gomez',
        employeeCode: 'EMP-001',
        permissions,
      }
    } else if (p.includes('/employees')) {
      body = []
    } else if (p.includes('/roles')) {
      body = []
    } else if (p.includes('/modules') || p.includes('/permissions') || p.includes('/sub-modules')) {
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

test('global paw loader appears during slow authenticated navigation and hides after', async ({ page }) => {
  test.setTimeout(30_000)
  await mockApi(page)
  await page.addInitScript((token) => {
    window.localStorage.setItem(
      'vetsoft.auth',
      JSON.stringify({ token, type: 'Bearer', refreshToken: 'refresh-token' }),
    )
  }, fakeJwt())

  const nav = page.goto(`${baseUrl}/dashboard/empleados`, {
    waitUntil: 'domcontentloaded',
    timeout: 15_000,
  })

  await expect(page.locator('.page-loader')).toBeVisible({ timeout: 2_000 })
  await nav
  await expect(page.locator('.page-loader')).toBeHidden({ timeout: 5_000 })
})
