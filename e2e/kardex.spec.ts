import { test, expect, type APIRequestContext } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { elemento, exigir } from './helpers/exigir'

/**
 * Suite exhaustiva del flujo de KARDEX / inventario por sede (F1–F6). Prueba por API contra el backend real
 * (vía el proxy `/api/v1` del dev server), que es determinista y permite cubrir la matriz completa: obligatoriedad
 * de campos, tipos, nulos, negativos, cero, stock insuficiente, override de negativo, idempotencia, multi-sede, y la
 * integración de inventario con POS y cuentas abiertas.
 *
 * Requiere el backend + dev server arriba. Credenciales admin por entorno (usuario = correo):
 *   E2E_EMPLOYEE_CODE (default: orlando.velasquezd@gmail.com)
 *   E2E_PASSWORD      (default: 12345678)
 *
 * Corre en SERIE: varios casos togglean el flag global de stock negativo y comparten el catálogo/sedes.
 */
test.describe.configure({ mode: 'serial' })

const API = '/api/v1'
const CODE = process.env.E2E_EMPLOYEE_CODE ?? 'orlando.velasquezd@gmail.com'
const PASSWORD = process.env.E2E_PASSWORD ?? '12345678'
const NEG_FLAG = 'inventory.allow_negative_stock'

let token = ''
let companyId = 0 // empresa del usuario (para el flag por empresa en company_settings)
let isAdmin = false // ¿el usuario tiene admin.all? (para el gate de company-settings)
let branchA = 0 // sede principal
let branchB = 0 // segunda sede (para multi-sede/transferencias)
let categoryId = 0

/** Wrappers que inyectan el Bearer y devuelven {status, body}. */
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
  return { status: res.status(), body: body as Record<string, unknown> & unknown[] }
}

let uniq = 0
function sku(prefix = 'KX') {
  uniq += 1
  return `${prefix}-${Date.now().toString().slice(-6)}-${uniq}`
}

/**
 * Fija el flag de stock negativo de la EMPRESA en `company_settings` directamente en la BD (Docker). El endpoint
 * `PUT /company-settings` está gateado a `admin.all` (solo el admin togglea); como el usuario de prueba no
 * necesariamente es admin.all, se setea por BD para verificar que el LEDGER respete el valor. `NegativeStockPolicy`
 * lee la fila (por empresa) sin caché. Devuelve true si se pudo setear (Docker/mysql disponible).
 */
function setNegFlagDb(companyId: number, value: 'true' | 'false'): boolean {
  const sql =
    `INSERT INTO company_settings (company_id, property_name, value, created_date, enabled) ` +
    `VALUES (${companyId}, '${NEG_FLAG}', '${value}', NOW(), 1) ON DUPLICATE KEY UPDATE value = '${value}'`
  try {
    execFileSync(
      'docker',
      [
        'exec',
        'vetsoftware_mysql',
        'mysql',
        '-ucronos',
        '-pcronos2026*',
        'vetsoftware_db',
        '-e',
        sql,
      ],
      { stdio: 'pipe' },
    )
    return true
  } catch {
    return false
  }
}

/** Crea un producto de catálogo EXCLUIDO (sin tarifa) y devuelve su id. */
async function createProduct(request: APIRequestContext, name = 'Kardex Test'): Promise<number> {
  const { status, body } = await req(request, 'post', '/products', {
    data: {
      name: `${name} ${sku()}`,
      code: sku('SKU'),
      salePrice: 50000,
      taxTreatment: 'EXCLUIDO',
      productCategoryId: categoryId,
    },
  })
  expect(status, `crear producto: ${JSON.stringify(body)}`).toBe(201)
  return body.id as number
}

/** Saldo (quantity/minStock/lowStock) de un producto en una sede; null si no hay fila. */
async function stockOf(request: APIRequestContext, productId: number, branchId: number) {
  const { body } = await req(request, 'get', '/inventory/stock', {
    params: { branchId, pageSize: 200 },
  })
  const rows = (body.content as Record<string, unknown>[]) ?? []
  return rows.find((r) => r.productId === productId) ?? null
}
async function qtyOf(
  request: APIRequestContext,
  productId: number,
  branchId: number,
): Promise<number> {
  const row = await stockOf(request, productId, branchId)
  return row ? (row.quantity as number) : 0
}
/** Tipos de movimiento del kardex de un producto en una sede (más reciente primero). */
async function kardexTypes(
  request: APIRequestContext,
  productId: number,
  branchId: number,
): Promise<string[]> {
  const { body } = await req(request, 'get', `/inventory/products/${productId}/kardex`, {
    params: { branchId, pageSize: 200 },
  })
  return ((body.content as Record<string, unknown>[]) ?? []).map((m) => m.type as string)
}
async function receive(
  request: APIRequestContext,
  productId: number,
  branchId: number,
  quantity: number,
  unitCost = 30000,
  extra: Record<string, unknown> = {},
) {
  return req(request, 'post', '/inventory/receipts', {
    data: { branchId, productId, quantity, unitCost, ...extra },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────
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
  isAdmin = ((me.body.permissions as unknown as string[]) ?? []).includes('admin.all')

  const branches = await req(request, 'get', '/branches')
  expect(branches.status).toBe(200)
  const active = (branches.body as unknown as Record<string, unknown>[]).filter((b) => b.active)
  expect(active.length, 'se requieren ≥1 sede activa').toBeGreaterThan(0)
  branchA = elemento(active, 0, 'las sedes activas').id as number
  branchB = active.length > 1 ? (elemento(active, 1, 'las sedes activas').id as number) : 0

  // Auto-provisión: si el usuario ve una sola sede, intenta crear una segunda (reusando la ciudad de la primera).
  // Solo sirve si el usuario ADMIN puede además LEERLA (resolveAccessibleBranch); un no-admin scopeado a 1 sede no
  // puede acceder a la nueva → se descarta y los casos de transferencia/multi-sede se saltan (no fallan).
  if (branchB === 0) {
    const cityId = (elemento(active, 0, 'las sedes activas').city as { id: number } | undefined)?.id
    if (cityId) {
      const created = await req(request, 'post', '/branches', {
        data: { name: `Kardex Sede ${sku()}`, code: sku('BR'), cityId },
      })
      if (created.status === 200 || created.status === 201) {
        const candidate = created.body.id as number
        const reachable = await req(request, 'get', '/inventory/stock', {
          params: { branchId: candidate, pageSize: 1 },
        })
        if (reachable.status === 200) branchB = candidate // solo si el usuario puede operar/leer esa sede
      }
    }
  }

  // Estado limpio del flag de la empresa (por si una corrida previa lo dejó en true): varios casos dependen de OFF.
  setNegFlagDb(companyId, 'false')

  const cats = await req(request, 'get', '/product-categories')
  if ((cats.body as unknown as unknown[]).length > 0) {
    categoryId = elemento(
      cats.body as unknown as Record<string, unknown>[],
      0,
      'las categorías de producto',
    ).id as number
  } else {
    const c = await req(request, 'post', '/product-categories', {
      data: { name: `Kardex Cat ${sku()}`, description: 'test' },
    })
    categoryId = c.body.id as number
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 1. Recepción / entrada de mercancía (PURCHASE)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Recepción de mercancía (entrada)', () => {
  test('entrada válida suma stock, crea lote y movimiento PURCHASE', async ({ request }) => {
    const p = await createProduct(request)
    expect(await qtyOf(request, p, branchA)).toBe(0)
    const r = await receive(request, p, branchA, 40, 30000, {
      lotNumber: 'L-A',
      expireDate: '2027-01-01',
    })
    expect(r.status).toBe(204)
    expect(await qtyOf(request, p, branchA)).toBe(40)

    const lots = await req(request, 'get', `/inventory/products/${p}/lots`, {
      params: { branchId: branchA },
    })
    expect(lots.status).toBe(200)
    expect((lots.body as unknown as Record<string, unknown>[]).length).toBe(1)
    expect(
      elemento(lots.body as unknown as Record<string, unknown>[], 0, 'los lotes').unitCost,
    ).toBe(30000)
    expect(await kardexTypes(request, p, branchA)).toContain('PURCHASE')
  })

  test('dos entradas del mismo lote (nº+venc+costo) se acumulan en un lote', async ({
    request,
  }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10, 5000, { lotNumber: 'X', expireDate: '2027-05-01' })
    await receive(request, p, branchA, 15, 5000, { lotNumber: 'X', expireDate: '2027-05-01' })
    expect(await qtyOf(request, p, branchA)).toBe(25)
    const lots = await req(request, 'get', `/inventory/products/${p}/lots`, {
      params: { branchId: branchA },
    })
    expect((lots.body as unknown as unknown[]).length).toBe(1)
  })

  test('entradas con distinto costo generan lotes separados', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10, 5000)
    await receive(request, p, branchA, 10, 7000)
    const lots = await req(request, 'get', `/inventory/products/${p}/lots`, {
      params: { branchId: branchA },
    })
    expect((lots.body as unknown as unknown[]).length).toBe(2)
  })

  test('productId ausente → 400', async ({ request }) => {
    const r = await req(request, 'post', '/inventory/receipts', {
      data: { branchId: branchA, quantity: 5, unitCost: 1000 },
    })
    expect(r.status).toBe(400)
  })
  test('quantity ausente → 400', async ({ request }) => {
    const p = await createProduct(request)
    const r = await req(request, 'post', '/inventory/receipts', {
      data: { branchId: branchA, productId: p, unitCost: 1000 },
    })
    expect(r.status).toBe(400)
  })
  test('quantity = 0 → 400', async ({ request }) => {
    const p = await createProduct(request)
    expect((await receive(request, p, branchA, 0)).status).toBe(400)
  })
  test('quantity negativa → 400', async ({ request }) => {
    const p = await createProduct(request)
    expect((await receive(request, p, branchA, -5)).status).toBe(400)
  })
  test('unitCost ausente → 400 (obligatorio en recepción)', async ({ request }) => {
    const p = await createProduct(request)
    const r = await req(request, 'post', '/inventory/receipts', {
      data: { branchId: branchA, productId: p, quantity: 5 },
    })
    expect(r.status).toBe(400)
  })
  test('unitCost negativo → 400', async ({ request }) => {
    const p = await createProduct(request)
    expect((await receive(request, p, branchA, 5, -100)).status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Ajustes (ADJUSTMENT_IN / ADJUSTMENT_OUT)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Ajustes de inventario', () => {
  async function adjust(
    request: APIRequestContext,
    productId: number,
    delta: number,
    reason = 'conteo',
    unitCost?: number,
  ) {
    return req(request, 'post', '/inventory/adjustments', {
      data: { branchId: branchA, productId, delta, reason, unitCost },
    })
  }

  test('ajuste positivo suma (ADJUSTMENT_IN)', async ({ request }) => {
    const p = await createProduct(request)
    expect((await adjust(request, p, 12, 'conteo', 1000)).status).toBe(204)
    expect(await qtyOf(request, p, branchA)).toBe(12)
    expect(await kardexTypes(request, p, branchA)).toContain('ADJUSTMENT_IN')
  })
  test('ajuste negativo resta (ADJUSTMENT_OUT)', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 20)
    expect((await adjust(request, p, -5, 'merma')).status).toBe(204)
    expect(await qtyOf(request, p, branchA)).toBe(15)
    expect(await kardexTypes(request, p, branchA)).toContain('ADJUSTMENT_OUT')
  })
  test('ajuste puede dejar el saldo en negativo (corrección de conteo)', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 3)
    expect((await adjust(request, p, -10, 'ajuste extremo')).status).toBe(204)
    expect(await qtyOf(request, p, branchA)).toBe(-7)
  })
  test('delta = 0 → 400', async ({ request }) => {
    const p = await createProduct(request)
    expect((await adjust(request, p, 0)).status).toBe(400)
  })
  test('motivo vacío → 400', async ({ request }) => {
    const p = await createProduct(request)
    expect((await adjust(request, p, 5, '')).status).toBe(400)
  })
  test('motivo ausente → 400', async ({ request }) => {
    const p = await createProduct(request)
    const r = await req(request, 'post', '/inventory/adjustments', {
      data: { branchId: branchA, productId: p, delta: 5 },
    })
    expect(r.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Transferencias entre sedes (TRANSFER_OUT + TRANSFER_IN)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Transferencias entre sedes', () => {
  test.skip(() => branchB === 0, 'requiere ≥2 sedes activas')

  async function transfer(
    request: APIRequestContext,
    productId: number,
    from: number,
    to: number,
    quantity: number,
    reason = 'traslado',
  ) {
    return req(request, 'post', '/inventory/transfers', {
      data: { fromBranchId: from, toBranchId: to, productId, quantity, reason },
    })
  }

  test('transferencia mueve stock y preserva costo por lote', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 30, 8000)
    expect((await transfer(request, p, branchA, branchB, 12)).status).toBe(204)
    expect(await qtyOf(request, p, branchA)).toBe(18)
    expect(await qtyOf(request, p, branchB)).toBe(12)
    // El lote replicado en destino mantiene el costo 8000.
    const lotsB = await req(request, 'get', `/inventory/products/${p}/lots`, {
      params: { branchId: branchB },
    })
    expect(
      elemento(lotsB.body as unknown as Record<string, unknown>[], 0, 'los lotes de destino')
        .unitCost,
    ).toBe(8000)
    expect(await kardexTypes(request, p, branchA)).toContain('TRANSFER_OUT')
    expect(await kardexTypes(request, p, branchB)).toContain('TRANSFER_IN')
  })
  test('misma sede origen y destino → 400', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    expect((await transfer(request, p, branchA, branchA, 5)).status).toBe(400)
  })
  test('cantidad mayor al disponible → 409 (no negativo en transferencia)', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 4)
    expect((await transfer(request, p, branchA, branchB, 10)).status).toBe(409)
  })
  test('cantidad cero → 400', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    expect((await transfer(request, p, branchA, branchB, 0)).status).toBe(400)
  })
  test('fromBranchId ausente → 400', async ({ request }) => {
    const p = await createProduct(request)
    const r = await req(request, 'post', '/inventory/transfers', {
      data: { toBranchId: branchB, productId: p, quantity: 1 },
    })
    expect(r.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Consumo clínico (CLINICAL_USE)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Consumo clínico', () => {
  async function consume(
    request: APIRequestContext,
    productId: number,
    quantity: number,
    reason = 'paciente',
  ) {
    return req(request, 'post', '/inventory/consumptions', {
      data: { branchId: branchA, productId, quantity, reason },
    })
  }
  test('consumo válido resta stock y registra CLINICAL_USE', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    expect((await consume(request, p, 4)).status).toBe(204)
    expect(await qtyOf(request, p, branchA)).toBe(6)
    expect(await kardexTypes(request, p, branchA)).toContain('CLINICAL_USE')
  })
  test('consumo sin stock (flag negativo OFF) → 409', async ({ request }) => {
    const p = await createProduct(request)
    expect((await consume(request, p, 5)).status).toBe(409)
  })
  test('quantity ausente → 400', async ({ request }) => {
    const p = await createProduct(request)
    const r = await req(request, 'post', '/inventory/consumptions', {
      data: { branchId: branchA, productId: p },
    })
    expect(r.status).toBe(400)
  })
  test('quantity cero/negativa → 400', async ({ request }) => {
    const p = await createProduct(request)
    expect((await consume(request, p, 0)).status).toBe(400)
    expect((await consume(request, p, -3)).status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Mínimo por sede + alertas
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Mínimo por sede y alertas', () => {
  async function setMin(request: APIRequestContext, productId: number, minStock: number) {
    return req(request, 'put', `/inventory/products/${productId}/min-stock`, {
      data: { branchId: branchA, minStock },
    })
  }
  test('fijar mínimo y marcar bajo mínimo (lowStock)', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 3)
    expect((await setMin(request, p, 10)).status).toBe(204)
    const row = await stockOf(request, p, branchA)
    expect(row?.minStock).toBe(10)
    expect(row?.lowStock).toBe(true)
    // Aparece en el filtro lowStock y en alertas.
    const low = await req(request, 'get', '/inventory/stock', {
      params: { branchId: branchA, lowStock: true, pageSize: 200 },
    })
    expect((low.body.content as Record<string, unknown>[]).some((r) => r.productId === p)).toBe(
      true,
    )
    const alerts = await req(request, 'get', '/inventory/alerts', { params: { branchId: branchA } })
    expect(
      (alerts.body.lowStock as unknown as Record<string, unknown>[]).some((r) => r.productId === p),
    ).toBe(true)
  })
  test('mínimo negativo → 400', async ({ request }) => {
    const p = await createProduct(request)
    expect((await setMin(request, p, -1)).status).toBe(400)
  })
  test('lote vencido/por vencer aparece en alertas.expiring', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 5, 1000, { lotNumber: 'VENC', expireDate: '2020-01-01' })
    const alerts = await req(request, 'get', '/inventory/alerts', {
      params: { branchId: branchA, expiringInDays: 30 },
    })
    const exp = alerts.body.expiring as unknown as Record<string, unknown>[]
    const hit = exp.find((e) => e.productId === p)
    expect(hit, 'el lote vencido debe estar en expiring').toBeTruthy()
    expect(exigir(hit, 'hit').daysToExpire as number).toBeLessThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Lecturas: valuación + libro de compras + kardex paginado
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Lecturas (valuación, compras, kardex)', () => {
  test('valuación = Σ(unidades × costo)', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10, 2500)
    const val = await req(request, 'get', '/inventory/valuation', { params: { branchId: branchA } })
    expect(val.status).toBe(200)
    const row = (val.body.byProduct as unknown as Record<string, unknown>[]).find(
      (r) => r.productId === p,
    )
    expect(row?.value).toBe(25000)
    expect((val.body.totalValue as number) >= 25000).toBe(true)
  })
  test('libro de compras lista la entrada con su total', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 7, 3000)
    const pur = await req(request, 'get', '/inventory/purchases', {
      params: { branchId: branchA, pageSize: 200 },
    })
    expect(pur.status).toBe(200)
    const row = (pur.body.content as Record<string, unknown>[]).find((r) => r.productId === p)
    expect(row, 'la compra debe aparecer').toBeTruthy()
    expect(exigir(row, 'row').total).toBe(21000)
  })
  test('kardex paginado y con rango de fechas', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 5)
    await receive(request, p, branchA, 5)
    const k = await req(request, 'get', `/inventory/products/${p}/kardex`, {
      params: { branchId: branchA, page: 0, pageSize: 1 },
    })
    expect(k.body.totalElements as number).toBeGreaterThanOrEqual(2)
    expect((k.body.content as unknown[]).length).toBe(1)
    const future = await req(request, 'get', `/inventory/products/${p}/kardex`, {
      params: { branchId: branchA, from: '2099-01-01' },
    })
    expect((future.body.content as unknown[]).length).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. Multi-sede: saldos independientes
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Multi-sede', () => {
  test.skip(() => branchB === 0, 'requiere ≥2 sedes activas')
  test('el saldo es independiente por sede', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    await receive(request, p, branchB, 3)
    expect(await qtyOf(request, p, branchA)).toBe(10)
    expect(await qtyOf(request, p, branchB)).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7b. Conteo físico / cíclico (concilia generando ADJUSTMENT_IN/OUT por la diferencia)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Conteo físico (cíclico)', () => {
  interface CountLine {
    productId: number
    countedQuantity: number
  }
  async function count(
    request: APIRequestContext,
    lines: CountLine[],
    note?: string,
    branchId = branchA,
  ) {
    return req(request, 'post', '/inventory/counts', { data: { branchId, note, lines } })
  }

  test('conteo sin diferencias no genera ajuste', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    const r = await count(request, [{ productId: p, countedQuantity: 10 }], 'cuadra')
    expect(r.status, JSON.stringify(r.body)).toBe(201)
    expect(r.body.totalLines).toBe(1)
    expect(r.body.adjustedLines).toBe(0)
    const line = elemento(r.body.lines as Record<string, unknown>[], 0, 'las líneas del conteo')
    expect(line.systemQuantity).toBe(10)
    expect(line.countedQuantity).toBe(10)
    expect(line.difference).toBe(0)
    expect(await qtyOf(request, p, branchA)).toBe(10)
    // Solo la entrada; ningún ajuste.
    expect(await kardexTypes(request, p, branchA)).toEqual(['PURCHASE'])
  })

  test('faltante (contado < sistema) genera ADJUSTMENT_OUT por la diferencia', async ({
    request,
  }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    const r = await count(request, [{ productId: p, countedQuantity: 7 }], 'merma detectada')
    expect(r.status).toBe(201)
    expect(r.body.adjustedLines).toBe(1)
    expect(
      elemento(r.body.lines as Record<string, unknown>[], 0, 'las líneas del conteo').difference,
    ).toBe(-3)
    expect(await qtyOf(request, p, branchA)).toBe(7)
    expect(await kardexTypes(request, p, branchA)).toContain('ADJUSTMENT_OUT')
  })

  test('sobrante (contado > sistema) genera ADJUSTMENT_IN por la diferencia', async ({
    request,
  }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    const r = await count(request, [{ productId: p, countedQuantity: 15 }])
    expect(r.status).toBe(201)
    expect(
      elemento(r.body.lines as Record<string, unknown>[], 0, 'las líneas del conteo').difference,
    ).toBe(5)
    expect(await qtyOf(request, p, branchA)).toBe(15)
    expect(await kardexTypes(request, p, branchA)).toContain('ADJUSTMENT_IN')
  })

  test('producto sin saldo previo (sistema 0) contado > 0 crea existencia', async ({ request }) => {
    const p = await createProduct(request)
    const r = await count(request, [{ productId: p, countedQuantity: 8 }])
    expect(r.status).toBe(201)
    const line = elemento(r.body.lines as Record<string, unknown>[], 0, 'las líneas del conteo')
    expect(line.systemQuantity).toBe(0)
    expect(line.difference).toBe(8)
    expect(await qtyOf(request, p, branchA)).toBe(8)
    expect(await kardexTypes(request, p, branchA)).toContain('ADJUSTMENT_IN')
  })

  test('conteo multi-línea: uno sobra y otro falta', async ({ request }) => {
    const a = await createProduct(request)
    const b = await createProduct(request)
    await receive(request, a, branchA, 10)
    await receive(request, b, branchA, 10)
    const r = await count(request, [
      { productId: a, countedQuantity: 12 }, // +2
      { productId: b, countedQuantity: 6 }, // −4
    ])
    expect(r.status).toBe(201)
    expect(r.body.totalLines).toBe(2)
    expect(r.body.adjustedLines).toBe(2)
    expect(await qtyOf(request, a, branchA)).toBe(12)
    expect(await qtyOf(request, b, branchA)).toBe(6)
    expect(await kardexTypes(request, a, branchA)).toContain('ADJUSTMENT_IN')
    expect(await kardexTypes(request, b, branchA)).toContain('ADJUSTMENT_OUT')
  })

  test('la sesión queda en el historial y su detalle trae las líneas', async ({ request }) => {
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    const created = await count(request, [{ productId: p, countedQuantity: 4 }], 'conteo semanal')
    const id = created.body.id as number
    expect(id).toBeTruthy()

    // Listado (resumen, sin líneas).
    const list = await req(request, 'get', '/inventory/counts', {
      params: { branchId: branchA, pageSize: 200 },
    })
    expect(list.status).toBe(200)
    const summary = (list.body.content as Record<string, unknown>[]).find((c) => c.id === id)
    expect(summary, 'la sesión debe aparecer en el historial').toBeTruthy()
    expect(exigir(summary, 'summary').totalLines).toBe(1)
    expect(exigir(summary, 'summary').adjustedLines).toBe(1)

    // Detalle (con líneas y diferencias).
    const detail = await req(request, 'get', `/inventory/counts/${id}`)
    expect(detail.status).toBe(200)
    expect(detail.body.note).toBe('conteo semanal')
    const line = elemento(
      detail.body.lines as Record<string, unknown>[],
      0,
      'las líneas del detalle del conteo',
    )
    expect(line.productId).toBe(p)
    expect(line.difference).toBe(-6)
  })

  test('detalle de una sesión inexistente → 404', async ({ request }) => {
    const r = await req(request, 'get', '/inventory/counts/999999999')
    expect(r.status).toBe(404)
  })

  test('sin líneas → 400', async ({ request }) => {
    expect((await count(request, [])).status).toBe(400)
  })
  test('branchId ausente → 400', async ({ request }) => {
    const p = await createProduct(request)
    const r = await req(request, 'post', '/inventory/counts', {
      data: { lines: [{ productId: p, countedQuantity: 1 }] },
    })
    expect(r.status).toBe(400)
  })
  test('productId ausente en una línea → 400', async ({ request }) => {
    const r = await req(request, 'post', '/inventory/counts', {
      data: { branchId: branchA, lines: [{ countedQuantity: 5 }] },
    })
    expect(r.status).toBe(400)
  })
  test('cantidad contada negativa → 400', async ({ request }) => {
    const p = await createProduct(request)
    expect((await count(request, [{ productId: p, countedQuantity: -3 }])).status).toBe(400)
  })
  test('producto repetido en el conteo → 400', async ({ request }) => {
    const p = await createProduct(request)
    const r = await count(request, [
      { productId: p, countedQuantity: 5 },
      { productId: p, countedQuantity: 3 },
    ])
    expect(r.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. Override de stock negativo (system_configurations, GLOBAL)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Override de stock negativo (por empresa, company_settings)', () => {
  // El flag vive en company_settings (por empresa) y se setea en BD (ver setNegFlagDb). Solo se salta si Docker no
  // está disponible. El toggle real desde la app es via PUT /company-settings, gateado a admin.all.
  test.afterAll(() => {
    setNegFlagDb(companyId, 'false') // restaura el default para no afectar otros casos
  })
  test('flag ON permite consumir sin stock (negativo)', async ({ request }) => {
    test.skip(
      !setNegFlagDb(companyId, 'true'),
      'requiere Docker (contenedor vetsoftware_mysql) para setear el flag',
    )
    const p = await createProduct(request)
    const r = await req(request, 'post', '/inventory/consumptions', {
      data: { branchId: branchA, productId: p, quantity: 5, reason: 'x' },
    })
    expect(r.status).toBe(204)
    expect(await qtyOf(request, p, branchA)).toBe(-5)
  })
  test('flag OFF vuelve a bloquear con 409', async ({ request }) => {
    test.skip(!setNegFlagDb(companyId, 'false'), 'requiere Docker para setear el flag')
    const p = await createProduct(request)
    const r = await req(request, 'post', '/inventory/consumptions', {
      data: { branchId: branchA, productId: p, quantity: 5, reason: 'x' },
    })
    expect(r.status).toBe(409)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. Integración con CUENTA ABIERTA (descuenta al cargar, repone al anular)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Inventario ↔ cuenta abierta', () => {
  let animalId = 0
  let ownerId = 0
  test.beforeAll(async ({ request }) => {
    const animals = await req(request, 'get', '/animals')
    const list = (animals.body as unknown as Record<string, unknown>[]) ?? []
    if (list.length > 0) {
      const primero = elemento(list, 0, 'los animales')
      animalId = primero.id as number
      const owner = primero.owner as Record<string, unknown> | undefined
      ownerId = (owner?.id as number) ?? (primero.ownerId as number) ?? 0
    }
  })

  test('cargar producto a la cuenta descuenta stock; anular lo repone', async ({ request }) => {
    test.skip(animalId === 0 || ownerId === 0, 'requiere un animal con propietario existente')
    const acc = await req(request, 'post', '/open-accounts', {
      data: { ownerId, branchId: branchA },
    })
    test.skip(
      acc.status !== 201 && acc.status !== 200,
      `no se pudo abrir cuenta: ${JSON.stringify(acc.body)}`,
    )
    const openAccountId = acc.body.id as number

    const p = await createProduct(request)
    await receive(request, p, branchA, 20)
    const charge = await req(request, 'post', '/product-charge-open-accounts', {
      data: { animalId, productId: p, openAccountId, quantity: 6, branchId: branchA },
    })
    expect(charge.status, JSON.stringify(charge.body)).toBe(201)
    expect(await qtyOf(request, p, branchA)).toBe(14)
    expect(await kardexTypes(request, p, branchA)).toContain('SALE')

    // Anular el cargo repone (VOID_IN).
    const chargeId = charge.body.id as number
    const voided = await req(request, 'patch', `/product-charge-open-accounts/${chargeId}/void`, {
      data: { reason: 'test reverse' },
    })
    expect(voided.status).toBe(200)
    expect(await qtyOf(request, p, branchA)).toBe(20)
    expect(await kardexTypes(request, p, branchA)).toContain('VOID_IN')
  })

  test('cargar producto sin stock (flag OFF) → 409 y no crea el cargo', async ({ request }) => {
    test.skip(animalId === 0 || ownerId === 0, 'requiere un animal con propietario existente')
    const acc = await req(request, 'post', '/open-accounts', {
      data: { ownerId, branchId: branchA },
    })
    test.skip(acc.status !== 201 && acc.status !== 200, 'no se pudo abrir cuenta')
    const openAccountId = acc.body.id as number
    const p = await createProduct(request) // 0 stock
    const charge = await req(request, 'post', '/product-charge-open-accounts', {
      data: { animalId, productId: p, openAccountId, quantity: 3, branchId: branchA },
    })
    expect(charge.status).toBe(409)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 10. Integración con POS (descuenta al vender; permite negativo)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Inventario ↔ POS', () => {
  // El POS emite un documento electrónico: requiere perfil fiscal + resolución de numeración DIAN configurados.
  // Si el entorno no los tiene (400 perfil fiscal / 409 numeración), todo el grupo se salta: la lógica de
  // descuento POS ya está cubierta por los tests unitarios y validada; aquí solo se verifica end-to-end.
  let posAvailable = false

  async function posSale(
    request: APIRequestContext,
    productId: number,
    quantity: number,
    unitPrice = 50000,
  ) {
    return req(request, 'post', '/electronic-documents/from-sale', {
      data: {
        documentType: 'DOC_EQUIV_POS',
        finalConsumer: true,
        lines: [{ kind: 'PRODUCT', refId: productId, quantity, unitPrice }],
        payments: [{ means: 'EFECTIVO', amount: unitPrice * quantity }],
        branchId: branchA,
      },
    })
  }

  test.beforeAll(async ({ request }) => {
    // Probe: una venta real; si sale 200/201 el POS está configurado (y de paso deja un producto vendido).
    const p = await createProduct(request)
    await receive(request, p, branchA, 5)
    const sale = await posSale(request, p, 1)
    posAvailable = sale.status === 200 || sale.status === 201
  })

  test('venta POS de un producto descuenta stock (POS_DOCUMENT)', async ({ request }) => {
    test.skip(
      !posAvailable,
      'POS no configurado (perfil fiscal / resolución de numeración DIAN ausentes)',
    )
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    const sale = await posSale(request, p, 3)
    expect([200, 201], JSON.stringify(sale.body)).toContain(sale.status)
    expect(await qtyOf(request, p, branchA)).toBe(7)
    expect(await kardexTypes(request, p, branchA)).toContain('SALE')
  })

  test('POS permite vender sin existencias (stock negativo)', async ({ request }) => {
    test.skip(!posAvailable, 'POS no configurado')
    const p = await createProduct(request) // 0 stock
    const sale = await posSale(request, p, 2)
    expect([200, 201]).toContain(sale.status)
    expect(await qtyOf(request, p, branchA)).toBe(-2)
  })

  test('cantidad de producto no entera en POS → 400', async ({ request }) => {
    test.skip(!posAvailable, 'POS no configurado')
    const p = await createProduct(request)
    await receive(request, p, branchA, 10)
    const sale = await req(request, 'post', '/electronic-documents/from-sale', {
      data: {
        documentType: 'DOC_EQUIV_POS',
        finalConsumer: true,
        lines: [{ kind: 'PRODUCT', refId: p, quantity: 2.5, unitPrice: 50000 }],
        payments: [{ means: 'EFECTIVO', amount: 125000 }],
        branchId: branchA,
      },
    })
    expect(sale.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 11. Autorización
// ─────────────────────────────────────────────────────────────────────────────
test.describe('company-settings (toggle del flag, gate admin.all)', () => {
  test('PUT /company-settings gateado a admin.all', async ({ request }) => {
    const r = await req(request, 'put', '/company-settings', {
      data: { propertyName: NEG_FLAG, value: 'false' },
    })
    if (isAdmin) expect([200, 201], JSON.stringify(r.body)).toContain(r.status)
    else expect(r.status, 'un no-admin no puede togglear el flag de empresa').toBe(403)
  })
  test('propertyName vacío → 400', async ({ request }) => {
    test.skip(!isAdmin, 'requiere admin.all para pasar el gate y llegar a la validación')
    const r = await req(request, 'put', '/company-settings', { data: { value: 'true' } })
    expect(r.status).toBe(400)
  })
})

test.describe('Autorización', () => {
  test('sin token → 401/403', async ({ request }) => {
    const r = await req(request, 'get', '/inventory/stock', {
      params: { branchId: branchA },
      auth: false,
    })
    expect([401, 403]).toContain(r.status)
  })
})
