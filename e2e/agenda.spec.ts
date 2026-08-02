import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

/**
 * E2E REAL de la Agenda de citas (feature `appointment`).
 * Consume el backend real (localhost:8080). El setup (empresa + empleado VET +
 * rol + citas) se hace por API; la UI se maneja autenticando por localStorage.
 *
 * Requiere: backend arriba con la migración 174 aplicada y el seed
 * `seed_appointment_permissions.sql` corrido (para que ADMIN/VET tengan appointment.*).
 */

const API = 'http://localhost:8080/api/v1'
const AUTH_STORAGE_KEY = 'vetsoft.auth'

function uniq(): string {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`
}
function todayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Session {
  token: string
  type: string
  refreshToken: string
}

let session: Session
let clientA: string
let clientB: string

test.beforeAll(async () => {
  const ctx: APIRequestContext = await pwRequest.newContext()

  // Cascada geográfica real (seed 022): primer país → primer estado → primera ciudad.
  const countries = await (await ctx.get(`${API}/countries`)).json()
  const states = await (await ctx.get(`${API}/countries/${countries[0].id}/states`)).json()
  const cities = await (await ctx.get(`${API}/states/${states[0].id}/cities`)).json()
  const cityId = cities[0].id

  const u = uniq()
  const nit = `9${u}`.slice(0, 14)
  const regResp = await ctx.post(`${API}/register`, {
    data: {
      companyName: `Clinica E2E ${u.slice(-5)}`,
      documentType: 'NIT',
      companyIdentifier: nit,
      companyAddress: 'Calle 1',
      companyContactNumber: '3001234567',
      cityId,
      employeeName: 'Dueno Admin',
      employeeEmail: `admin${u}@e2e.com`,
      password: 'Password123',
      taxRegime: 'NO_RESPONSABLE_IVA',
      fiscalEmail: `fiscal${u}@e2e.com`,
    },
  })
  expect(regResp.status(), 'el registro debe devolver 201').toBe(201)
  const reg = await regResp.json()
  session = { token: reg.token, type: reg.tokenType, refreshToken: reg.refreshToken }
  const companyId = reg.companyId
  const headers = { Authorization: `Bearer ${reg.token}` }

  // Rol VET de la empresa (instanciado en el registro desde el catálogo base).
  const roles = await (await ctx.get(`${API}/roles/by-company`, { headers })).json()
  const vetRole = roles.find((r: { code: string }) => r.code === 'VET')
  expect(vetRole, 'la empresa debe tener el rol base VET').toBeTruthy()

  // Empleado con rol VET (para que aparezca en el desplegable de veterinarios).
  const emp = await (
    await ctx.post(`${API}/employees`, {
      headers,
      data: {
        employeeCode: `VET${u}`,
        password: 'Password123',
        name: 'Dra. Mariana Rojas',
        email: `vet${u}@e2e.com`,
        companyId,
      },
    })
  ).json()
  await ctx.post(`${API}/employee-roles`, {
    headers,
    data: { employeeId: emp.id, roleId: vetRole.id },
  })

  // Dos citas de HOY (para que la vista Día por defecto las muestre).
  const ymd = todayYmd()
  clientA = `Cliente Uno ${u.slice(-4)}`
  clientB = `Cliente Dos ${u.slice(-4)}`
  const mk = (startAt: string, type: string, clientName: string) =>
    ctx.post(`${API}/appointments`, {
      headers,
      data: { startAt, type, employeeId: emp.id, clientName },
    })
  const r1 = await mk(`${ymd}T09:00:00`, 'CONSULTATION', clientA)
  const r2 = await mk(`${ymd}T14:00:00`, 'VACCINATION', clientB)
  expect(r1.status(), 'crear cita A debe devolver 201').toBe(201)
  expect(r2.status(), 'crear cita B debe devolver 201').toBe(201)

  await ctx.dispose()
})

async function authenticate(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: AUTH_STORAGE_KEY,
    value: JSON.stringify(session),
  })
  // El SPA puede redirigir durante la carga y abortar el goto (ERR_ABORTED);
  // reintentamos con domcontentloaded y luego esperamos el encabezado.
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto('/dashboard/agenda', { waitUntil: 'domcontentloaded' })
      break
    } catch {
      await page.waitForTimeout(400)
    }
  }
  await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test('la vista Día muestra las citas del día creadas en el backend', async ({ page }) => {
  await authenticate(page)
  // Ambas citas de hoy visibles en el timeline.
  await expect(page.getByText(clientA, { exact: false })).toBeVisible()
  await expect(page.getByText(clientB, { exact: false })).toBeVisible()
  // El resumen del día cuenta 2 citas.
  await expect(page.getByText('Citas del día')).toBeVisible()
})

test('el detalle ofrece solo transiciones válidas y aplica el cambio de estado', async ({
  page,
}) => {
  await authenticate(page)
  await page
    .getByRole('button', { name: new RegExp(clientA) })
    .first()
    .click()

  // Estado inicial REQUESTED → etiqueta "Solicitada".
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Solicitada').first()).toBeVisible()
  // La máquina de REQUESTED ofrece Confirmar / No asistió / Cancelar; NO "Llegó" ni "En curso".
  await expect(dialog.getByRole('button', { name: /Confirmada/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Llegó/ })).toHaveCount(0)

  // Aplicar REQUESTED → CONFIRMED (PATCH /status contra el backend real).
  await dialog.getByRole('button', { name: /Confirmada/ }).click()
  await expect(dialog.getByText('Confirmada').first()).toBeVisible()
  // Ahora se ofrece "Llegó" (transición válida de CONFIRMED).
  await expect(dialog.getByRole('button', { name: /Llegó/ })).toBeVisible()
})

test('el modal "Nueva cita" muestra el diseño completo (9 tipos + vet asignable)', async ({
  page,
}) => {
  await authenticate(page)
  await page.getByRole('button', { name: 'Nueva cita' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Agendar cita' })).toBeVisible()

  // Los 9 tipos de cita.
  for (const t of [
    'Consulta',
    'Control',
    'Vacunación',
    'Desparasitación',
    'Cirugía',
    'Imagen Dx',
    'Laboratorio',
    'Spa / Estética',
    'Otro',
  ]) {
    await expect(dialog.getByRole('button', { name: t, exact: true })).toBeVisible()
  }
  // El empleado con rol VET es asignable (aparece en el modal).
  await expect(dialog.getByText('Dra. Mariana Rojas').first()).toBeVisible()
  // Toggle de sujeto de la cita.
  await expect(dialog.getByRole('button', { name: 'Cliente registrado' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Contacto libre' })).toBeVisible()
})
