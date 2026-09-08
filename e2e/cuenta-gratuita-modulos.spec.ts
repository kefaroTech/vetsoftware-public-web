import { expect, test, type Page, type Route } from '@playwright/test'
import { EMPRESA_ID, enrutarApi, instalarSesion, responderJson } from './helpers/sesion'
import type {
  ModuleCeilingResponse,
  ModuleShowcaseResponse,
} from '../src/features/entitlements/types/modulos.types'
import type { ModulePurchaseRequest } from '../src/features/suscripcion/types/compraModulos.types'

/**
 * «Tus módulos», el aviso global de fin de prueba y el modo degradado transversal
 * (`docs/ux/cuenta-gratuita-modulos-especificacion.md`).
 *
 * ── Por qué todo por `page.route` y no contra `localdev` ───────────────────
 * `FREE_LIMITED`/`EXPIRED_READ_ONLY` solo existen en una cuenta con 30 días de prueba vencidos:
 * no hay forma de sembrarlos en `localdev` sin esperar un mes o adelantar el reloj del propio
 * backend. El escaparate (`GET /subscriptions/modules`), la compra y los endpoints de
 * propietario/geografía se simulan igual que en `suscripcion.spec.ts`: router, guardas, stores
 * y componentes son los de producción, solo se sustituye la frontera HTTP.
 *
 * ── El reloj va congelado ───────────────────────────────────────────────────
 * `cuerpoTrial`/`estadoPlan` calculan los días contra `todayISO()`. Sin fijar el reloj, «Quedan 5
 * días» dejaría de ser cierto un día después de escribir esta prueba.
 */

/** 2026-09-08, mediodía UTC: mismo día natural en cualquier huso de −11 a +11. */
const HOY = new Date('2026-09-08T12:00:00.000Z')

function techo(over: Partial<ModuleCeilingResponse> = {}): ModuleCeilingResponse {
  return {
    dimensionCode: 'OWNER',
    measureKind: 'STOCK',
    used: 30,
    limit: 80,
    warnThreshold: 80,
    enforcement: 'BLOCK',
    ...over,
  }
}

function modulo(over: Partial<ModuleShowcaseResponse> & { code: string }): ModuleShowcaseResponse {
  return {
    state: 'NOT_INCLUDED',
    ceilings: [],
    purchasable: false,
    canPurchase: false,
    ...over,
  }
}

/** Uno por cada uno de los cinco estados con píldora. */
const CORE = modulo({
  code: 'CORE',
  name: 'Clientes y mascotas',
  state: 'FREE_LIMITED',
  ceilings: [techo({ used: 30, limit: 80 })],
})
const CLINICAL_HISTORY = modulo({
  code: 'CLINICAL_HISTORY',
  name: 'Historia clínica',
  state: 'TRIAL',
  trialEndDate: '2026-09-13',
  purchasable: true,
  canPurchase: true,
  monthlyPrice: 39000,
  annualPrice: 390000,
})
const HOSPITALIZATION = modulo({
  code: 'HOSPITALIZATION',
  name: 'Hospitalización',
  state: 'EXPIRED_READ_ONLY',
  trialEndDate: '2026-08-09',
  purchasable: true,
  canPurchase: true,
  monthlyPrice: 59000,
  annualPrice: 590000,
})
const GROOMING = modulo({ code: 'GROOMING', name: 'Spa y guardería', state: 'PAID' })
const ELECTRONIC_INVOICING = modulo({
  code: 'ELECTRONIC_INVOICING',
  name: 'Facturación electrónica',
  state: 'NEVER_FREE',
  purchasable: true,
  canPurchase: false,
})

const CATALOGO_BASE = [CORE, CLINICAL_HISTORY, HOSPITALIZATION, GROOMING, ELECTRONIC_INVOICING]

const MEDIO_POR_DEFECTO = {
  content: [
    {
      id: 501,
      companyId: EMPRESA_ID,
      methodKind: 'CARD',
      gateway: 'e2e',
      brand: 'Visa',
      lastFour: '4242',
      expiresOn: '2029-12-31',
      mandateStatus: 'ACTIVE',
      mandateEvidence: 'e2e',
      authorizedAt: '2026-01-01T10:00:00',
      defaultMethod: true,
      createdDate: '2026-01-01',
    },
  ],
  page: 0,
  pageSize: 50,
  totalElements: 1,
  totalPages: 1,
}

/** Respuesta 404, tal como la deja `useSuscripcion` cuando la cuenta no tiene plan comercial. */
function sinPlan(route: Route): Promise<void> {
  return responderJson(route, { status: 404, title: 'Not Found' }, 404)
}

async function abrirModulos(
  page: Page,
  modulos: ModuleShowcaseResponse[],
  permisos: string[] = ['subscription.read'],
): Promise<void> {
  await instalarSesion(page)
  await page.clock.setFixedTime(HOY)
  await enrutarApi(
    page,
    {
      '/subscriptions/current': sinPlan,
      '/subscriptions/modules': modulos,
      '/subscription-payment-methods*': MEDIO_POR_DEFECTO,
    },
    { permisos },
  )
  await page.goto('/dashboard/suscripcion/modulos')
}

test.describe('§1 — Tus módulos: el escaparate', () => {
  test('lista los módulos con sus cinco estados y sus píldoras', async ({ page }) => {
    await abrirModulos(page, CATALOGO_BASE)
    await expect(page.getByRole('heading', { name: 'Tus módulos', level: 1 })).toBeVisible()

    const casos: [ModuleShowcaseResponse, string][] = [
      [CLINICAL_HISTORY, 'En prueba'],
      [CORE, 'Gratis con techo'],
      [HOSPITALIZATION, 'Solo lectura'],
      [GROOMING, 'Activo'],
      [ELECTRONIC_INVOICING, 'Nunca gratis'],
    ]
    for (const [m, pill] of casos) {
      const tarjeta = page.locator('li').filter({ hasText: m.name as string })
      await expect(tarjeta).toBeVisible()
      await expect(tarjeta).toContainText(pill)
    }

    const tarjetaPagada = page.locator('li').filter({ hasText: 'Spa y guardería' })
    await expect(tarjetaPagada).toContainText('Incluido en tu plan.')
    await expect(tarjetaPagada.getByRole('checkbox')).toHaveCount(0)
  })

  test('un módulo en prueba muestra la fecha de fin y los días restantes', async ({ page }) => {
    await abrirModulos(page, CATALOGO_BASE)

    const tarjeta = page.locator('li').filter({ hasText: 'Historia clínica' })
    await expect(tarjeta).toContainText('Gratis hasta el 13 sep 2026')
    await expect(tarjeta).toContainText('Quedan 5 días.')
    // ≤ 7 días: mismo giro de urgencia que el aviso global, nunca «se corta».
    await expect(tarjeta).toContainText('No se corta nada por sí solo.')
  })

  test('canPurchase=false oculta el botón y pide avisar al administrador', async ({ page }) => {
    await abrirModulos(page, CATALOGO_BASE)

    const tarjeta = page.locator('li').filter({ hasText: 'Facturación electrónica' })
    await expect(tarjeta).toContainText(
      'Solo quien administra tu cuenta puede comprar módulos. Pídeselo a tu administrador.',
    )
    await expect(tarjeta.getByRole('checkbox')).toHaveCount(0)
  })
})

test.describe('§1 — Tus módulos: comprar', () => {
  test('canPurchase=true: selecciona dos módulos, confirma y ve el resumen por línea', async ({
    page,
  }) => {
    const capturado: { cuerpo: ModulePurchaseRequest | null } = { cuerpo: null }

    await instalarSesion(page)
    await page.clock.setFixedTime(HOY)
    await enrutarApi(
      page,
      {
        '/subscriptions/current': sinPlan,
        '/subscriptions/modules': CATALOGO_BASE,
        '/subscription-payment-methods*': MEDIO_POR_DEFECTO,
        '/subscriptions/modules/purchase': (route: Route) => {
          capturado.cuerpo = route.request().postDataJSON() as ModulePurchaseRequest
          return responderJson(route, {
            quoteId: 9001,
            lines: [
              {
                catalogItemCode: 'CLINICAL_HISTORY',
                firstChargeDate: '2026-10-01',
                chargedNow: false,
              },
              {
                catalogItemCode: 'HOSPITALIZATION',
                firstChargeDate: '2026-10-01',
                chargedNow: false,
              },
            ],
          })
        },
      },
      { permisos: ['subscription.read'] },
    )
    await page.goto('/dashboard/suscripcion/modulos')

    await page.getByRole('checkbox', { name: 'Comprar Historia clínica' }).check()
    await page.getByRole('checkbox', { name: 'Comprar Hospitalización' }).check()

    const resumen = page.getByRole('heading', { name: 'Comprar módulos', level: 2 })
    await expect(resumen).toBeVisible()

    // Sin plan contratado el ciclo no viene bloqueado: se puede elegir.
    await page.getByRole('radio', { name: /Un año/ }).check()
    // El medio por defecto ya activo: no se pide tarjeta nueva.
    await expect(page.getByText('4242')).toBeVisible()

    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    const confirmacion = page.getByRole('status').filter({ hasText: 'primer cobro' })
    await expect(confirmacion).toContainText(
      'Historia clínica: el primer cobro es el 1 de octubre, 2026.',
    )
    await expect(confirmacion).toContainText(
      'Hospitalización: el primer cobro es el 1 de octubre, 2026.',
    )

    // WCAG 2.2 §2.4.3 — el foco vuelve al <h1>, no a un botón que pudo desaparecer.
    await expect(page.getByRole('heading', { name: 'Tus módulos', level: 1 })).toBeFocused()

    const cuerpo = capturado.cuerpo
    expect(cuerpo).not.toBeNull()
    expect(cuerpo?.catalogItemCodes.sort()).toEqual(['CLINICAL_HISTORY', 'HOSPITALIZATION'].sort())
    expect(cuerpo?.billingCycle).toBe('ANNUAL')
    expect(cuerpo?.paymentSourceId).toBe(501)
    expect(typeof cuerpo?.clientRequestId).toBe('string')
    expect(cuerpo?.clientRequestId.length).toBeGreaterThan(0)
  })
})

test.describe('§2 — Aviso global de fin de prueba', () => {
  test('≤ 7 días: banner con CTA a «Tus módulos»', async ({ page }) => {
    await instalarSesion(page)
    await page.clock.setFixedTime(HOY)
    await enrutarApi(
      page,
      {
        // El tablero hace `.filter()` sobre `/appointments`: el comodín de `enrutarApi` sirve un
        // objeto con forma de página y revienta el árbol entero.
        '/appointments*': [],
        '/subscriptions/current': {
          id: 55,
          subscriptionNumber: 'SUS-E2E-MODULOS',
          companyId: EMPRESA_ID,
          billingCycle: 'MONTHLY',
          status: 'TRIALING',
          current: true,
          startDate: '2026-08-09',
          trialEndDate: '2026-09-13',
          autoRenew: true,
          createdDate: '2026-08-09',
          enabled: true,
        },
        '/subscriptions/modules': [],
      },
      { permisos: ['appointment.read', 'subscription.read'] },
    )
    await page.goto('/dashboard')

    const aviso = page.getByRole('status').filter({ hasText: 'No se corta nada por sí solo' })
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText('Tu prueba termina el 13 sep 2026')
    await expect(aviso).toContainText(
      'algunos módulos siguen gratis con límites y otros pasan a solo consulta',
    )

    await aviso.getByRole('link', { name: 'Ver tus módulos' }).click()
    await expect(page).toHaveURL(/\/dashboard\/suscripcion\/modulos$/)
  })
})

test.describe('§3 — Modo degradado dentro de un módulo', () => {
  const PROPIETARIO = {
    content: [
      {
        id: 900,
        name: 'Propietario E2E de Hospitalización',
        email: 'propietario.e2e@example.com',
        document: '9001112223',
        address: 'Calle 1',
        phone: '3001112233',
        city: { id: 1, name: 'Bogotá D.C.' },
        company: { id: EMPRESA_ID, name: 'Clínica E2E de prueba', identifier: '900123456-7' },
        createdDate: '2026-01-01T00:00:00',
        documentType: 'CEDULA_CIUDADANIA',
        personType: 'NATURAL',
        withholdingAgent: false,
        taxRegime: 'NO_RESPONSABLE_IVA',
        fiscalResponsibility: 'NO_APLICA',
      },
    ],
    page: 0,
    pageSize: 20,
    totalElements: 1,
    totalPages: 1,
  }

  const MASCOTA = [
    {
      id: 700,
      name: 'Firulais E2E',
      code: null,
      specie: { id: 1, name: 'Canina' },
      breed: { id: 1, name: 'Mestizo' },
      owner: { id: 900, name: 'Propietario E2E de Hospitalización', document: '9001112223' },
      color: { id: 1, name: 'Café' },
      gender: 'MALE',
      bod: '2020-01-01',
      weight: 12,
      weightMeasuredAt: '2026-01-01',
      weightType: 'KILOGRAMS',
      size: 40,
      animalType: 'NONE',
      reproductiveState: 'STERILIZED',
      deceased: false,
      enabled: true,
    },
  ]

  test('vista clínica EXPIRED_READ_ONLY: el botón de crear abre la explicación, nunca el formulario', async ({
    page,
  }) => {
    await instalarSesion(page)
    await page.clock.setFixedTime(HOY)
    await enrutarApi(
      page,
      {
        '/subscriptions/modules': [HOSPITALIZATION],
        '/owners/search*': PROPIETARIO,
        '/animals/by-owner/*': MASCOTA,
      },
      { permisos: ['hospitalization.create'] },
    )
    await page.goto('/dashboard/acciones/hospitalizacion')

    await page.getByLabel('Propietario').fill('Propietario E2E')
    await page.getByRole('button', { name: /Propietario E2E de Hospitalización/ }).click()
    await page.getByRole('button', { name: /Firulais E2E/ }).click()

    const banner = page.getByTestId('modulo-degradado')
    await expect(banner).toContainText(
      'Puedes consultar e imprimir lo que ya tienes en Hospitalización',
    )
    await expect(banner).toContainText('Para volver a crear, cómpralo.')

    // Nunca `disabled`: el botón queda enfocable, con el candado como señal visual añadida.
    await expect(page.getByRole('button', { name: 'Nueva hospitalización' })).toHaveCount(0)
    const comprar = page.getByRole('button', { name: 'Comprar Hospitalización' })
    await expect(comprar).toBeVisible()
    await expect(comprar).toBeEnabled()

    await comprar.click()
    const dialogo = page.getByRole('dialog', { name: 'Módulo en modo solo consulta' })
    await expect(dialogo).toBeVisible()
    await expect(dialogo).toContainText('Hospitalización está en modo solo consulta')
    await expect(dialogo).toContainText('Cómpralo para volver a crear.')

    await expect(page.getByRole('dialog', { name: 'Nueva hospitalización' })).toHaveCount(0)
  })

  test('409 CAPACITY_LIMIT_EXCEEDED al crear un propietario: aviso de techo con CTA', async ({
    page,
  }) => {
    await instalarSesion(page)
    await page.clock.setFixedTime(HOY)
    await enrutarApi(
      page,
      {
        '/subscriptions/modules': [
          modulo({
            code: 'CORE',
            name: 'Clientes y mascotas',
            state: 'FREE_LIMITED',
            ceilings: [
              techo({ dimensionCode: 'OWNER', measureKind: 'STOCK', used: 80, limit: 80 }),
            ],
          }),
        ],
        '/countries': [{ id: 1, name: 'Colombia', createdDate: '2020-01-01' }],
        '/countries/*/states': [
          {
            id: 1,
            name: 'Bogotá D.C.',
            country: { id: 1, name: 'Colombia' },
            createdDate: '2020-01-01',
          },
        ],
        '/states/*/cities': [
          {
            id: 1,
            name: 'Bogotá D.C.',
            state: { id: 1, name: 'Bogotá D.C.' },
            createdDate: '2020-01-01',
          },
        ],
        '/owners': (route: Route) =>
          route.fulfill({
            status: 409,
            contentType: 'application/problem+json',
            headers: {
              'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
              'access-control-allow-credentials': 'true',
              'x-trace-id': 'e2e-owner-cap-limit',
            },
            body: JSON.stringify({
              status: 409,
              title: 'Conflict',
              code: 'CAPACITY_LIMIT_EXCEEDED',
              detail: 'Cupo agotado',
              limit: 80,
            }),
          }),
      },
      { permisos: ['owner.read', 'animal.read', 'owner.create'] },
    )
    await page.goto('/dashboard/clientes')

    // El techo ya agotado se avisa ANTES de intentar nada: no hace falta chocar para verlo.
    const banner = page.getByTestId('modulo-degradado')
    await expect(banner).toContainText('Se agotó tu cupo de propietarios')
    await expect(banner.getByRole('link', { name: 'Ver tus módulos' })).toBeVisible()

    await page.getByRole('button', { name: 'Nuevo cliente' }).click()
    const modal = page.getByRole('dialog', { name: 'Nuevo cliente' })
    await expect(modal).toBeVisible()

    await modal.getByLabel('Nombre completo').fill('Cliente E2E Techo Alcanzado')
    await modal.getByLabel('Documento de identidad').fill('9998887771')
    await modal.getByLabel('Teléfono').fill('3009998877')

    await modal.getByRole('combobox', { name: 'Tipo de documento' }).click()
    await page.getByRole('option').first().click()
    await modal.getByRole('radio', { name: 'Natural' }).check()

    await modal.getByRole('combobox', { name: 'País' }).click()
    await page.getByRole('option', { name: 'Colombia' }).click()
    await modal.getByRole('combobox', { name: 'Estado / Departamento' }).click()
    await page.getByRole('option').first().click()
    await modal.getByRole('combobox', { name: 'Ciudad' }).click()
    await page.getByRole('option').first().click()

    await modal.getByRole('button', { name: 'Crear cliente' }).click()

    // El texto del techo, no el `detail` genérico del servidor.
    const toast = page.getByRole('status').filter({ hasText: 'Llegaste al tope gratuito' })
    await expect(toast).toContainText(
      'Llegaste al tope gratuito de propietarios este mes (80). Amplíalo para seguir creando.',
    )
  })
})
