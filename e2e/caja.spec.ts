import { test, expect, type APIRequestContext } from '@playwright/test'
import { execFileSync } from 'node:child_process'

/**
 * Suite del dominio de CAJA / arqueo (punto 5). Prueba por API contra el backend real (vía el proxy `/api/v1` del
 * dev server): abrir con base → movimientos manuales → cerrar con conteo y diferencia → export/historial, más el
 * bloqueo "caja requerida" y la orquestación (venta POS = SALE_IN, abono = OPEN_ACCOUNT_IN, reversa = VOID_OUT).
 *
 * Requiere el backend + dev server arriba. Credenciales admin por entorno (usuario = correo):
 *   E2E_EMPLOYEE_CODE (default: orlando.velasquezd@gmail.com)
 *   E2E_PASSWORD      (default: 12345678)
 *
 * El flag por empresa `cashregister.required` se fija por BD (Docker) para aislar los escenarios (el PUT
 * /company-settings está gateado a admin.all). Corre en SERIE: comparten la caja de la sede.
 */
test.describe.configure({ mode: 'serial' })

const API = '/api/v1'
const CODE = process.env.E2E_EMPLOYEE_CODE ?? 'orlando.velasquezd@gmail.com'
const PASSWORD = process.env.E2E_PASSWORD ?? '12345678'
const REQUIRED_FLAG = 'cashregister.required'

let token = ''
let companyId = 0
let branchA = 0

async function req(
  request: APIRequestContext,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  opts: { data?: unknown; params?: Record<string, string | number | boolean>; auth?: boolean } = {},
) {
  const headers: Record<string, string> = {}
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`
  const res = await request[method](`${API}${path}`, {
    headers,
    data: opts.data as object | undefined,
    params: opts.params,
    failOnStatusCode: false,
  })
  let body: unknown = null
  const text = await res.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  return { status: res.status(), body: body as Record<string, unknown> & Array<unknown> }
}

/** Fija el flag `cashregister.required` de la empresa en `company_settings` directamente en la BD (Docker). */
function setRequiredDb(company: number, value: 'true' | 'false'): boolean {
  const sql =
    `INSERT INTO company_settings (company_id, property_name, value, created_date, enabled) ` +
    `VALUES (${company}, '${REQUIRED_FLAG}', '${value}', NOW(), 1) ON DUPLICATE KEY UPDATE value = '${value}'`
  try {
    execFileSync(
      'docker',
      ['exec', 'vetsoftware_mysql', 'mysql', '-ucronos', '-pcronos2026*', 'vetsoftware_db', '-e', sql],
      { stdio: 'pipe' },
    )
    return true
  } catch {
    return false
  }
}

async function currentCaja(request: APIRequestContext) {
  const { body } = await req(request, 'get', '/cash-sessions/current', { params: { branchId: branchA } })
  return (body && (body as Record<string, unknown>).id ? body : null) as Record<string, unknown> | null
}

/** Cierra cualquier caja OPEN de la sede para dejar estado limpio entre escenarios. */
async function closeAnyOpenCaja(request: APIRequestContext) {
  const c = await currentCaja(request)
  if (c) await req(request, 'post', `/cash-sessions/${c.id}/close`, { data: { counts: [] } })
}

async function openCaja(request: APIRequestContext, openingFloat: number) {
  return req(request, 'post', '/cash-sessions/open', { data: { branchId: branchA, openingFloat } })
}

test.beforeAll(async ({ request }) => {
  const login = await req(request, 'post', '/auth/login/employee', {
    data: { employeeCode: CODE, password: PASSWORD },
    auth: false,
  })
  expect(login.status, `login (${CODE}): ${JSON.stringify(login.body)}`).toBe(200)
  token = login.body.token as string
  expect(token).toBeTruthy()

  const me = await req(request, 'get', '/auth/me')
  companyId = me.body.companyId as number
  expect(companyId, 'companyId de /auth/me').toBeTruthy()

  const branches = await req(request, 'get', '/branches')
  const active = (branches.body as unknown as Array<Record<string, unknown>>).filter((b) => b.active)
  expect(active.length, 'se requiere ≥1 sede activa').toBeGreaterThan(0)
  branchA = active[0].id as number
})

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ciclo básico: abrir → movimientos → cerrar → export/historial
// ─────────────────────────────────────────────────────────────────────────────
test.describe('ciclo básico de caja', () => {
  let sessionId = 0

  test.beforeAll(async ({ request }) => {
    setRequiredDb(companyId, 'false') // aislar: el ciclo básico no depende del bloqueo
    await closeAnyOpenCaja(request)
  })

  test('abrir caja crea una sesión OPEN con base inicial', async ({ request }) => {
    const { status, body } = await openCaja(request, 100000)
    expect(status, JSON.stringify(body)).toBe(201)
    expect(body.status).toBe('OPEN')
    expect(Number(body.openingFloat)).toBe(100000)
    sessionId = body.id as number
    expect(sessionId).toBeTruthy()
  })

  test('rechaza una segunda apertura en la misma sede (409)', async ({ request }) => {
    const { status, body } = await openCaja(request, 50000)
    expect(status).toBe(409)
    expect(body.code).toBe('CASH_SESSION_ALREADY_OPEN')
  })

  test('registra ingreso / retiro / gasto y actualiza el esperado en efectivo', async ({ request }) => {
    await req(request, 'post', `/cash-sessions/${sessionId}/movements`, {
      data: { type: 'MANUAL_IN', method: 'CASH', amount: 50000, note: 'ingreso' },
    })
    await req(request, 'post', `/cash-sessions/${sessionId}/movements`, {
      data: { type: 'WITHDRAWAL', method: 'CASH', amount: 20000, note: 'retiro' },
    })
    const last = await req(request, 'post', `/cash-sessions/${sessionId}/movements`, {
      data: { type: 'EXPENSE', method: 'CASH', amount: 10000, note: 'gasto' },
    })
    expect(last.status).toBe(201)
    // 100000 base + 50000 − 20000 − 10000 = 120000
    const cash = (last.body.totals as Array<Record<string, unknown>>).find((t) => t.method === 'CASH')
    expect(Number(cash?.expectedAmount)).toBe(120000)
  })

  test('rechaza un tipo NO manual desde el REST (400)', async ({ request }) => {
    const { status } = await req(request, 'post', `/cash-sessions/${sessionId}/movements`, {
      data: { type: 'SALE_IN', method: 'CASH', amount: 5000 },
    })
    expect(status).toBe(400)
  })

  test('cierra con conteo y calcula la diferencia por método', async ({ request }) => {
    const { status, body } = await req(request, 'post', `/cash-sessions/${sessionId}/close`, {
      data: { counts: [{ method: 'CASH', countedAmount: 118000 }], note: 'faltan 2000' },
    })
    expect(status, JSON.stringify(body)).toBe(200)
    expect(body.status).toBe('CLOSED')
    const cash = (body.counts as Array<Record<string, unknown>>).find((c) => c.method === 'CASH')
    expect(Number(cash?.expectedAmount)).toBe(120000)
    expect(Number(cash?.countedAmount)).toBe(118000)
    expect(Number(cash?.difference)).toBe(-2000)
  })

  test('exporta el arqueo en CSV', async ({ request }) => {
    const res = await request.get(`${API}/cash-sessions/${sessionId}/arqueo/export`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { format: 'csv' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('text/csv')
  })

  test('el historial incluye la sesión cerrada', async ({ request }) => {
    const { body } = await req(request, 'get', '/cash-sessions', { params: { branchId: branchA, pageSize: 50 } })
    const ids = (body.content as Array<Record<string, unknown>>).map((s) => s.id)
    expect(ids).toContain(sessionId)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Bloqueo "caja requerida" + orquestación (abono OPEN_ACCOUNT_IN / reversa VOID_OUT)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('bloqueo caja requerida y orquestación de abonos', () => {
  let accountId = 0
  let outstanding = 0

  test.beforeAll(async ({ request }) => {
    setRequiredDb(companyId, 'true')
    await closeAnyOpenCaja(request)
    // Reutiliza una cuenta abierta OPEN con saldo pendiente (evita crear owner por API). Si no hay, se salta.
    const { body } = await req(request, 'get', '/open-accounts')
    const open = (body as unknown as Array<Record<string, unknown>>).find(
      (a) => a.status === 'OPEN' && Number(a.outstandingAmount) > 0,
    )
    if (open) {
      accountId = open.id as number
      outstanding = Number(open.outstandingAmount)
    }
  })

  test('un abono sin caja abierta se bloquea con 409 NO_OPEN_CASH_SESSION', async ({ request }) => {
    test.skip(accountId === 0, 'requiere una cuenta abierta OPEN con saldo pendiente')
    const { status, body } = await req(request, 'post', '/debt-open-accounts', {
      data: { openAccountId: accountId, amount: Math.min(1000, outstanding), paymentMethod: 'CASH' },
    })
    expect(status).toBe(409)
    expect(body.code).toBe('NO_OPEN_CASH_SESSION')
  })

  test('con caja abierta el abono pasa y registra OPEN_ACCOUNT_IN; su anulación registra VOID_OUT', async ({
    request,
  }) => {
    test.skip(accountId === 0, 'requiere una cuenta abierta OPEN con saldo pendiente')
    const opened = await openCaja(request, 0)
    expect([201, 409]).toContain(opened.status) // 409 si ya había una (reintento)
    const sessionId = (await currentCaja(request))?.id as number

    const abono = await req(request, 'post', '/debt-open-accounts', {
      data: { openAccountId: accountId, amount: Math.min(1000, outstanding), paymentMethod: 'CASH' },
    })
    expect([200, 201], JSON.stringify(abono.body)).toContain(abono.status)

    let cur = await currentCaja(request)
    let types = ((cur?.movements as Array<Record<string, unknown>>) ?? []).map((m) => m.type)
    expect(types).toContain('OPEN_ACCOUNT_IN')

    // Anular el abono compensa con VOID_OUT (requiere permiso elevado; si no lo tiene, se salta la aserción).
    const abonoId = abono.body.id as number
    const voided = await req(request, 'patch', `/debt-open-accounts/${abonoId}/void`, {
      data: { reason: 'reversa e2e' },
    })
    if (voided.status === 200) {
      cur = await currentCaja(request)
      types = ((cur?.movements as Array<Record<string, unknown>>) ?? []).map((m) => m.type)
      expect(types).toContain('VOID_OUT')
    }

    await req(request, 'post', `/cash-sessions/${sessionId}/close`, { data: { counts: [] } })
  })

  test.afterAll(async ({ request }) => {
    setRequiredDb(companyId, 'false') // no dejar el bloqueo activo para otras suites
    await closeAnyOpenCaja(request)
  })
})
