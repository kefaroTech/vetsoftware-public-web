import { test, expect, type APIRequestContext } from '@playwright/test'
import { EMPLOYEE_CODE, PASSWORD } from './helpers/auth'
import { uniqueSuffix } from './helpers/consulta'
import { todayISO } from '../src/composables/format'
import { AUTH_STORAGE_KEY, type AuthSession } from '../src/services/storage/storage.service'

/**
 * E2E REAL de la Agenda de citas (feature `appointment`).
 *
 * Consume el backend real a través del proxy `/api` del dev server (igual que
 * `caja.spec.ts` y `kardex.spec.ts`): la URL del backend no se repite aquí, sale de
 * `vite.config.ts`, que además reescribe el `Origin` para que la lista CORS del
 * backend lo acepte. El setup (empleado VET + citas) se hace por API; la UI se
 * maneja inyectando la sesión en `localStorage`.
 *
 * <p><strong>El arranque ya no registra una empresa.</strong> Lo hacía, y por eso el
 * suite no podía correr: `POST /register` dejó de devolver token —su
 * `RegistrationResponse` es `{companyId, employeeId, email, status}` con
 * `status = PENDING_VERIFICATION`— y `LoginEmployeeService` corta con
 * `EmailNotVerifiedException` mientras el correo no se verifique. El token de
 * verificación se guarda hasheado y el valor plano solo viaja por correo, así que
 * autoprovisionarse una empresa desde un test es imposible por API. Ahora entra por
 * donde entran caja y kardex: `POST /auth/login/employee` con un admin ya verificado.
 * De paso desaparece la empresa `Clinica E2E <n>` que cada corrida dejaba atrás.
 *
 * <p>La clave y la forma de la sesión NO se copian: se importan de
 * `storage.service.ts`, el único módulo que toca `localStorage`. Si allí cambia la
 * clave o el interface, esto deja de compilar en vez de fallar en rojo dentro del
 * navegador.
 *
 * Requiere: backend + dev server arriba, con la migración 174 aplicada y el seed
 * `seed_appointment_permissions.sql` corrido (para que ADMIN/VET tengan appointment.*).
 * Credenciales por entorno, como el resto del suite: E2E_EMPLOYEE_CODE / E2E_PASSWORD.
 */

test.skip(!PASSWORD, 'Define E2E_PASSWORD para correr el suite de agenda')

const API = '/api/v1'

let session: AuthSession | null = null
let clientA: string
let clientB: string

/** Lo que este spec crea en la empresa del admin, para poder deshacerlo en el `afterAll`. */
const created = {
  appointmentIds: [] as number[],
  employeeId: 0,
}

test.beforeAll(async ({ playwright }, testInfo) => {
  // El contexto de API hereda el `baseURL` del proyecto (el dev server), así que las
  // rutas relativas `/api/v1/...` salen por el proxy de Vite.
  const ctx: APIRequestContext = await playwright.request.newContext({
    baseURL: testInfo.project.use.baseURL,
  })

  const loginResp = await ctx.post(`${API}/auth/login/employee`, {
    data: { employeeCode: EMPLOYEE_CODE, password: PASSWORD },
    failOnStatusCode: false,
  })
  expect(loginResp.status(), `login (${EMPLOYEE_CODE}): ${await loginResp.text()}`).toBe(200)
  const auth = await loginResp.json()
  // La sesión que se inyecta es EXACTAMENTE la que persiste el front: `token` + `type`.
  // No lleva `refreshToken`: el backend lo emite en una cookie `HttpOnly` con
  // `Path=/auth` y `AuthSession` no lo declara, así que sembrarlo en `localStorage`
  // era un campo muerto que nadie leía.
  session = { token: auth.token, type: auth.type }
  expect(session.token, 'el login debe devolver un access token').toBeTruthy()
  const headers = { Authorization: `Bearer ${auth.token}` }

  const me = await (await ctx.get(`${API}/auth/me`, { headers })).json()
  const myBranchIds: number[] = me.branchIds ?? []

  // Sede del sembrado. Se elige la PRIMERA activa asignada al usuario porque es
  // exactamente la que `useBranches` deja seleccionada al entrar (su watcher cae a
  // `visibleBranches[0]` = activas ∩ `me.branchIds`). Creando aquí las citas y el
  // empleado, la vista Día consulta la misma sede que se sembró.
  const branches = await (await ctx.get(`${API}/branches`, { headers })).json()
  const branch = branches.find(
    (b: { id: number; active: boolean }) => b.active && myBranchIds.includes(b.id),
  )
  expect(branch, 'el usuario debe tener al menos una sede activa asignada').toBeTruthy()

  // Rol VET de la empresa (instanciado en el registro desde el catálogo base).
  const roles = await (await ctx.get(`${API}/roles/by-company`, { headers })).json()
  const vetRole = roles.find((r: { code: string }) => r.code === 'VET')
  expect(vetRole, 'la empresa debe tener el rol base VET').toBeTruthy()

  // Empleado con rol VET (para que aparezca en el desplegable de veterinarios).
  // `roleIds` y `branchIds` son @NotEmpty en `CreateEmployeeRequest`: el rol se asigna
  // en el alta, así que ya no hace falta el POST /employee-roles que había aquí (y que
  // habría respondido 400 al no mandarlos). `companyId` tampoco se envía: el controller
  // usa `authz.currentCompanyId()` e ignora lo que venga en el cuerpo.
  const s = uniqueSuffix()
  const empResp = await ctx.post(`${API}/employees`, {
    headers,
    data: {
      employeeCode: `VET${s}`,
      password: 'Password123',
      name: 'Dra. Mariana Rojas',
      email: `vet${s}@e2e.com`,
      roleIds: [vetRole.id],
      branchIds: [branch.id],
    },
    failOnStatusCode: false,
  })
  expect(empResp.status(), `crear el empleado VET: ${await empResp.text()}`).toBe(201)
  const emp = await empResp.json()
  created.employeeId = emp.id

  // Dos citas de HOY (para que la vista Día por defecto las muestre). Van contra el
  // empleado recién creado, no contra uno existente: el control de solape se calcula
  // por empresa + empleado, así que una agenda virgen no puede chocar (409
  // APPOINTMENT_OVERLAP) con lo que la empresa ya tenga agendado hoy.
  const ymd = todayISO()
  clientA = `Cliente Uno ${s.slice(-4)}`
  clientB = `Cliente Dos ${s.slice(-4)}`
  const mk = (startAt: string, type: string, clientName: string) =>
    ctx.post(`${API}/appointments`, {
      headers,
      data: { startAt, type, employeeId: emp.id, clientName, branchId: branch.id },
      failOnStatusCode: false,
    })
  const r1 = await mk(`${ymd}T09:00:00`, 'CONSULTATION', clientA)
  const r2 = await mk(`${ymd}T14:00:00`, 'VACCINATION', clientB)
  expect(r1.status(), `crear cita A: ${await r1.text()}`).toBe(201)
  expect(r2.status(), `crear cita B: ${await r2.text()}`).toBe(201)
  for (const r of [r1, r2]) {
    const id = (await r.json())?.id
    if (id) created.appointmentIds.push(id)
  }

  await ctx.dispose()
})

/**
 * Deshace el sembrado: las dos citas y el empleado VET, en orden inverso al de
 * creación. La empresa ya no entra aquí porque ya no se crea ninguna — el admin es
 * preexistente y su empresa tiene que seguir en pie.
 *
 * Dos límites que conviene tener escritos, porque no se pueden salvar desde el e2e:
 *
 * 1. **Los DELETE son borrados lógicos.** `DELETE /appointments/{id}` y
 *    `/employees/{id}` bajan la bandera `enabled` (por eso existe el
 *    `PATCH /{id}/enable` que los revive); la fila sigue en la base. Un borrado
 *    físico exigiría acceso directo a MySQL —lo que hace `caja.spec.ts` con
 *    `docker exec`— y no hay endpoint que lo ofrezca. El sistema queda como lo
 *    encontró de cara a la aplicación (ni la cita aparece en la agenda ni el
 *    empleado en el listado), no de cara al `SELECT`.
 * 2. **Puede quedarse corto por permisos.** `DeleteAppointmentUseCase` exige
 *    `hasAuthority('appointment.delete')` y `DeleteEmployeeUseCase`
 *    `hasAuthority('employee.delete')`; si el rol del usuario no los trae en el
 *    entorno donde se corre, la llamada responde 403 y esa entidad sobrevive. Por eso
 *    va con `failOnStatusCode: false`: una limpieza incompleta no debe pintar de rojo
 *    una suite cuyas aserciones pasaron. Lo que quede es reconocible como dato de
 *    prueba (`vet…@e2e.com`, `Cliente Uno/Dos …`).
 */
test.afterAll(async ({ playwright }, testInfo) => {
  if (!session?.token) return
  const ctx = await playwright.request.newContext({ baseURL: testInfo.project.use.baseURL })
  const headers = { Authorization: `Bearer ${session.token}` }
  const drop = (path: string) => ctx.delete(`${API}${path}`, { headers, failOnStatusCode: false })

  for (const id of created.appointmentIds) await drop(`/appointments/${id}`)
  if (created.employeeId) await drop(`/employees/${created.employeeId}`)

  await ctx.dispose()
})

/**
 * Entra al dashboard con la sesión del sembrado inyectada en `localStorage`.
 *
 * No usa `login()` de `helpers/auth` a propósito: cada login rota el `authVersion`
 * del empleado y `ResolveAuthContextService` rechaza todo access token con la
 * versión anterior. Un login por caso invalidaría el token que el `afterAll` necesita
 * para limpiar. Con la sesión inyectada hay un único login por corrida.
 */
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
      // El goto se abortó porque OTRA navegación —la del guard del router— ganó la
      // carrera. La condición real que hay que esperar es que ESA navegación termine,
      // no un número de milisegundos: cuando el documento llega a `domcontentloaded`
      // la página está quieta y el reintento ya no compite con ella. Si nunca llega,
      // `waitForLoadState` vence por timeout y el fallo que se ve es el de verdad, no
      // un sleep que lo tapa.
      await page.waitForLoadState('domcontentloaded')
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
