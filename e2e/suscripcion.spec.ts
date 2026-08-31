import { expect, test, type Page, type Route } from '@playwright/test'
import { EMPRESA_ID, enrutarApi, instalarSesion } from './helpers/sesion'
import { exigir } from './helpers/exigir'

/**
 * «Mi suscripción» — las cinco sub-pantallas del tenant.
 *
 * Cubre las cuatro instantáneas ARIA que pide `suscripcion-tenant-especificacion.md`
 * §13 (puntos 6 a 9). Son regresión de SEMÁNTICA, y son la ÚNICA red que tiene
 * esta feature: no hay `axe-core` en el pipeline de ninguno de los dos repos
 * (§11.4), así que ningún gate comprueba nada de la §10 salvo esto.
 *
 * ── El reloj va congelado, y no es un detalle ──────────────────────────────
 * `estadoSuscripcion` calcula los días de cortesía contra `todayISO()`. Sin
 * congelar el reloj, «Te quedan 3 días de cortesía» y la fecha «desde el 25 ago
 * 2026» cambiarían solas cada día: la prueba sería verde hoy y roja mañana sin
 * que nadie tocara una línea. `setFixedTime` fija `Date` sin tocar los
 * temporizadores, así que el velo de carga y las transiciones siguen
 * comportándose como en producción.
 *
 * ── Lo que estas pruebas NO pueden ver ─────────────────────────────────────
 * Un renombrado de campo en el backend. Los cuerpos de abajo están escritos a
 * mano contra los tipos del repositorio; si `capacities` pasara a llamarse de
 * otra forma, aquí seguiría verde y la pantalla real diría «no pudimos leer tus
 * cupos». Esa es la ceguera que la §2.2 encarga a `MatchesContract` y a
 * `api:check`, no a una prueba de interfaz.
 */

/** 2026-08-28, mediodía UTC: la misma fecha en cualquier huso de −11 a +11. */
const HOY = new Date('2026-08-28T12:00:00.000Z')

/**
 * Los permisos del empleado simulado.
 *
 * <p>`subscriptionPaymentMethod.update` no estaba y ahora hace falta: las dos acciones de
 * `MedioPagoCard` —«Hacer predeterminado» y «Revocar»— se ocultan sin él, porque los dos puertos
 * del backend lo exigen (`SetDefaultPaymentMethodUseCase`, `RevokeSubscriptionPaymentMethodUseCase`)
 * y antes el botón se ofrecía a todo el mundo para devolver un 403 al pulsarlo. El caso de §13.9
 * abre el modal de revocar, así que su rol tiene que poder revocar de verdad.
 */
const PERMISOS = [
  'subscription.read',
  'entitlement.read',
  'subscriptionItemLimit.read',
  'subscriptionBilling.read',
  'subscriptionPaymentMethod.read',
  'subscriptionPaymentMethod.update',
  'quote.read',
]

type Estado = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'READ_ONLY' | 'CANCELLED' | 'EXPIRED'

function suscripcion(over: Record<string, unknown> = {}) {
  return {
    id: 55,
    subscriptionNumber: 'SUS-E2E-001',
    companyId: EMPRESA_ID,
    billingCycle: 'MONTHLY',
    status: 'ACTIVE' as Estado,
    current: true,
    startDate: '2026-01-01',
    currentPeriodStart: '2026-08-01',
    currentPeriodEnd: '2026-08-31',
    nextBillingDate: '2026-09-01',
    autoRenew: true,
    createdDate: '2026-01-01',
    enabled: true,
    ...over,
  }
}

const PAGINA_ITEMS = {
  content: [],
  page: 0,
  pageSize: 100,
  totalElements: 0,
  totalPages: 0,
}

/** Consumo: 340 de 500 mascotas. La cifra del ejemplo de la especificación. */
const ACCESO = {
  companyId: EMPRESA_ID,
  recalculatedAt: '2026-08-28T06:00:00',
  entitlements: [
    {
      id: 1,
      companyId: EMPRESA_ID,
      subModule: { code: 'AGENDA', name: 'Agenda' },
      accessLevel: 'FULL',
    },
  ],
  capacities: [
    {
      id: 10,
      companyId: EMPRESA_ID,
      limitDimensionId: 3,
      dimensionCode: 'ANIMAL',
      measureKind: 'COUNTER',
      limitQuantity: 500,
      usedQuantity: 340,
      exhausted: false,
      subscriptionId: 55,
      limitRecalculatedAt: '2026-08-28T06:00:00',
    },
  ],
}

const TOPES = [
  {
    id: 90,
    companyId: EMPRESA_ID,
    subscriptionItemId: 1,
    limitDimensionId: 3,
    measureKind: 'COUNTER',
    mode: 'LIMITED',
    limitQuantity: 500,
    enforcement: 'WARN',
    warnThreshold: 80,
    createdDate: '2026-01-01',
  },
]

const MEDIOS = {
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

async function abrir(
  page: Page,
  ruta: string,
  sub: Record<string, unknown> | null = suscripcion(),
) {
  await instalarSesion(page)
  await page.clock.setFixedTime(HOY)
  await enrutarApi(
    page,
    {
      '/subscriptions/current': sub
        ? sub
        : (route: Route) =>
            route.fulfill({
              status: 404,
              contentType: 'application/problem+json',
              headers: {
                'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
                'access-control-allow-credentials': 'true',
              },
              body: JSON.stringify({ status: 404, title: 'Not Found' }),
            }),
      '/subscriptions/*/items*': PAGINA_ITEMS,
      '/entitlements/access': ACCESO,
      '/subscription-item-limits': TOPES,
      '/subscription-payment-methods*': MEDIOS,
    },
    { permisos: PERMISOS },
  )
  await page.goto(ruta)
}

test.describe('§13.6 — el banner de estado del armazón', () => {
  /**
   * Los siete estados. `alert` implica `aria-live="assertive"` y **corta la
   * locución en curso**: interrumpir a quien lee la ficha de un paciente para
   * decirle que debe dinero le hace perder el punto de lectura. Estar en mora es
   * una condición permanente de la cuenta, no un suceso.
   */
  const CASOS: { nombre: string; sub: Record<string, unknown> | null; contiene: string }[] = [
    { nombre: 'sin plan', sub: null, contiene: '' },
    {
      nombre: 'en prueba, lejos del final',
      sub: suscripcion({ status: 'TRIALING', trialEndDate: '2026-12-31' }),
      contiene: '',
    },
    {
      nombre: 'en prueba, dentro de los 7 días',
      sub: suscripcion({ status: 'TRIALING', trialEndDate: '2026-09-02' }),
      // Va en mayúscula porque ahora ABRE la frase: es lo que se pone en negrita, y lo que
      // tranquiliza va delante de lo que preocupa.
      contiene: 'No se corta nada por sí solo',
    },
    { nombre: 'al día', sub: suscripcion({ status: 'ACTIVE' }), contiene: '' },
    {
      nombre: 'en mora, con cortesía',
      sub: suscripcion({ status: 'PAST_DUE', pastDueSince: '2026-08-25', graceDays: 10 }),
      contiene: 'Sigues trabajando con normalidad',
    },
    {
      nombre: 'en solo consulta',
      sub: suscripcion({ status: 'READ_ONLY' }),
      contiene: 'incluida la historia clínica',
    },
    {
      nombre: 'cancelado',
      sub: suscripcion({ status: 'CANCELLED', cancelEffectiveDate: '2026-08-20' }),
      contiene: 'quedó cancelado',
    },
  ]

  for (const caso of CASOS) {
    test(`«${caso.nombre}»: role="status" y ningún alert`, async ({ page }) => {
      await abrir(page, '/dashboard/suscripcion/plan', caso.sub)

      const banner = page.getByTestId('suscripcion-estado')
      // El contenedor está SIEMPRE montado: si el nodo naciera a la vez que su
      // contenido, muchos lectores no anunciarían nada.
      await expect(banner).toHaveAttribute('role', 'status')
      // Y nunca, en ningún estado, un `alert` dentro de él.
      await expect(banner.locator('[role="alert"]')).toHaveCount(0)

      if (caso.contiene) await expect(banner).toContainText(caso.contiene)
    })
  }

  test('en mora, «sigues trabajando» va ANTES de la deuda', async ({ page }) => {
    await abrir(
      page,
      '/dashboard/suscripcion/plan',
      suscripcion({ status: 'PAST_DUE', pastDueSince: '2026-08-25', graceDays: 10 }),
    )

    const banner = page.getByTestId('suscripcion-estado')
    // `textContent()` es una lectura de una sola vez, sin espera: el contenedor
    // del banner está SIEMPRE montado y nace vacío, así que leerlo antes de que
    // llegue el plan devuelve «» y la comparación de orden se haría sobre nada.
    // El centinela de carga era «Pago pendiente», el rótulo del estado, que ya NO se pinta en el
    // banner: era lo único que iba en `<strong>` y abrir en negrita con la amenaza es
    // exactamente lo que este caso existe para impedir. El rótulo sigue estando donde es un
    // dato — la ficha «Estado» de «Mi plan» —. Aquí se espera por la deuda, que sí está en el
    // banner y sirve igual de centinela.
    await expect(banner).toContainText('saldo pendiente')
    const texto = (await banner.textContent()) ?? ''

    // El orden NO es cosmético: lo que quita el pánico va primero, y el pánico es
    // lo que hace que alguien deje de atender para llamar a soporte. Si alguien
    // lo invierte y pone la amenaza delante, esto se pone rojo.
    const trabajando = texto.indexOf('Sigues trabajando')
    const cortesia = texto.indexOf('de cortesía')
    expect(trabajando, 'falta la frase que quita el pánico').toBeGreaterThan(-1)
    expect(cortesia, 'falta el plazo').toBeGreaterThan(-1)
    expect(trabajando, '«sigues trabajando» tiene que ir primero').toBeLessThan(cortesia)

    // Con el reloj congelado el número es exacto: 10 de cortesía desde el 25,
    // hoy 28 → quedan 7.
    await expect(banner).toContainText('7 días de cortesía')

    // Y ninguna de las cinco palabras prohibidas. Es riesgo legal, no estilo: no
    // existe ni existirá un corte total de acceso.
    for (const prohibida of ['bloquear', 'suspender', 'cortar', 'desactivar', 'inhabilitar']) {
      expect(texto.toLowerCase()).not.toContain(prohibida)
    }
  })

  test('la mora conserva su semántica', async ({ page }) => {
    await abrir(
      page,
      '/dashboard/suscripcion/plan',
      suscripcion({ status: 'PAST_DUE', pastDueSince: '2026-08-25', graceDays: 10 }),
    )
    await expect(page.getByTestId('suscripcion-estado')).toMatchAriaSnapshot({
      name: 'suscripcion-banner-mora.aria.yml',
    })
  })
})

test.describe('§13.7 — la sub-navegación', () => {
  test('es navigation con nombre accesible y la activa lleva aria-current', async ({ page }) => {
    await abrir(page, '/dashboard/suscripcion/cupos')

    const nav = page.getByRole('navigation', { name: 'Secciones de mi suscripción' })
    await expect(nav).toBeVisible()

    // NO es `role="tablist"`: el patrón Tabs del APG exige un `tabpanel` en el
    // mismo documento con `aria-controls`, y con `RouterLink` no lo hay.
    await expect(page.locator('[role="tablist"]')).toHaveCount(0)

    await expect(nav.getByRole('link')).toHaveCount(5)
    await expect(nav.getByRole('link', { name: 'Cupos y consumo' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    // Y solo una.
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)

    await expect(nav).toMatchAriaSnapshot({ name: 'suscripcion-subnav.aria.yml' })
  })

  test('los cinco destinos miden al menos 24x24 (§2.5.8)', async ({ page }) => {
    await abrir(page, '/dashboard/suscripcion/plan')
    const enlaces = page
      .getByRole('navigation', { name: 'Secciones de mi suscripción' })
      .getByRole('link')

    for (let i = 0; i < (await enlaces.count()); i++) {
      const caja = exigir(await enlaces.nth(i).boundingBox(), 'la caja del objetivo táctil')
      expect(caja.width).toBeGreaterThanOrEqual(24)
      expect(caja.height).toBeGreaterThanOrEqual(24)
    }
  })
})

test.describe('§13.8 — el medidor de cupo', () => {
  test('expone progressbar con valuenow/valuemax sin una línea de ARIA escrita', async ({
    page,
  }) => {
    await abrir(page, '/dashboard/suscripcion/cupos')

    const medidor = page.getByRole('progressbar')
    await expect(medidor).toHaveCount(1)

    // `<progress>` nativo: el rol, el valor y el máximo salen del elemento. Un
    // `<div role="progressbar">` con tres `aria-value*` es más marcado para
    // conseguir menos, y hay que mantenerlo sincronizado a mano.
    await expect(medidor).toHaveJSProperty('tagName', 'PROGRESS')
    await expect(medidor).toHaveJSProperty('value', 340)
    await expect(medidor).toHaveJSProperty('max', 500)
    // Ni un `aria-value*` escrito: si aparecen, alguien cambió de estrategia.
    await expect(medidor).not.toHaveAttribute('aria-valuenow', /.*/)

    // La barra NUNCA va sola: un 68 % no se puede leer por teléfono, y por
    // teléfono es como esto llega a soporte.
    await expect(page.getByText('340 de 500 mascotas')).toBeVisible()

    await expect(medidor.locator('xpath=..')).toMatchAriaSnapshot({
      name: 'suscripcion-medidor.aria.yml',
    })
  })

  test('el medidor tiene una etiqueta REALMENTE asociada', async ({ page }) => {
    await abrir(page, '/dashboard/suscripcion/cupos')
    await expect(page.getByRole('progressbar')).toBeVisible()

    /*
     * Se comprueba con `HTMLProgressElement.labels`, y NO con
     * `toHaveAccessibleName`, por un motivo medido, no por comodidad:
     * Playwright calcula el nombre accesible con su PROPIA implementación de
     * accname, y esa no contempla el `<label>` de un `<progress>` (devuelve «»).
     * El árbol de accesibilidad real de Chromium, consultado por CDP con
     * `Accessibility.getPartialAXTree`, sí lo nombra: `{role: "progressbar",
     * name: "MASCOTAS"}`. Es decir, el producto está bien y la herramienta se
     * queda corta; afirmar con `toHaveAccessibleName` dejaría esta prueba en
     * rojo permanente sobre marcado correcto, que es la vía más rápida a que
     * alguien la borre.
     *
     * `labels` es lo que de verdad importa: lo calcula el navegador siguiendo
     * la misma regla que el lector de pantalla —el `for` tiene que apuntar al
     * `id` del control—, así que un `for` roto lo deja en 0.
     */
    const asociacion = await page.getByRole('progressbar').evaluate((el) => {
      const p = el as HTMLProgressElement
      return {
        etiquetas: p.labels?.length ?? 0,
        texto: p.labels?.[0]?.textContent?.trim() ?? '',
        apunta: p.labels?.[0]?.getAttribute('for') === p.id,
      }
    })

    expect(asociacion.etiquetas, 'el `<label for>` no apunta al `<progress>`').toBe(1)
    expect(asociacion.apunta).toBe(true)
    expect(asociacion.texto).toBe('Mascotas')
  })
})

test.describe('§13.9 — el modal de revocar', () => {
  test('el campo en error lleva aria-describedby y aria-invalid', async ({ page }) => {
    await abrir(page, '/dashboard/suscripcion/medios-pago')

    await page.getByRole('button', { name: 'Revocar', exact: true }).click()

    const dialogo = page.getByRole('alertdialog')
    await expect(dialogo).toBeVisible()

    // El botón NOMBRA la acción; «Confirmar» no dice qué se confirma.
    const enviar = dialogo.getByRole('button', { name: 'Revocar medio de pago' })
    await expect(enviar).toBeVisible()

    // La consecuencia va escrita ANTES del botón: es el caso que puede dejar a
    // la clínica sin cobro.
    await expect(dialogo).toContainText('Visa')

    const campo = dialogo.getByRole('textbox')
    // Antes de tocarlo no hay error: nada de validación prematura, y el atributo
    // ni siquiera se escribe (`invalid || undefined` en `BaseTextarea`).
    await expect(campo).not.toHaveAttribute('aria-invalid', /.*/)

    await enviar.click()

    await expect(campo).toHaveAttribute('aria-invalid', 'true')
    const descrito = await campo.getAttribute('aria-describedby')
    expect(
      descrito,
      'el error tiene que estar ATADO al campo, no ser un hermano suelto',
    ).toBeTruthy()

    const mensaje = 'Escribe por qué revocas este medio de pago.'
    await expect(dialogo.locator(`#${descrito}`)).toContainText(mensaje)
    // Y el resumen usa el MISMO texto literal que el error en línea.
    await expect(dialogo.getByRole('link', { name: mensaje })).toBeVisible()

    // ⚠️ SI REGENERAS ESTA INSTANTÁNEA, VUELVE A PONER LA EXPRESIÓN REGULAR EN
    // EL `/url` DEL ENLACE DEL RESUMEN. Tenía congelado `- /url: "#v-5"`, y ese
    // `v-5` es un `useId()` (`RevocarMedioModal.vue:44`): un contador de la
    // APLICACIÓN que se incrementa en orden de montaje, así que su valor depende
    // de cuántos componentes montaron antes en esa carga. Añadir un `useId()` en
    // cualquier otra parte del producto lo desplaza, y como el orden de montaje
    // depende de qué trozos perezosos hayan llegado ya, el número **cambia entre
    // pasadas**: este caso falló 2 de cada 3 veces con `#v-6` sin que nadie
    // hubiera tocado ni el modal ni esta prueba.
    //
    // El literal no afirmaba nada que no estuviera ya afirmado, y mejor, doce
    // líneas más arriba: `descrito` comprueba que el `aria-describedby` del campo
    // resuelve al elemento que lleva el mensaje, que es la RELACIÓN. El número
    // solo aportaba la parte frágil. La expresión regular conserva lo que sí
    // significa algo —que es un ancla a un id de esta página— y tira el ruido.
    await expect(dialogo).toMatchAriaSnapshot({ name: 'suscripcion-revocar-error.aria.yml' })
  })
})

test.describe('§2.2 — capacities ausente no es «no tienes topes»', () => {
  test('dice que no pudo leerlos, que es lo que de verdad pasó', async ({ page }) => {
    await instalarSesion(page)
    await page.clock.setFixedTime(HOY)
    await enrutarApi(
      page,
      {
        '/subscriptions/current': suscripcion(),
        '/subscriptions/*/items*': PAGINA_ITEMS,
        // El hueco que `MatchesContract` no ve: la clave desaparece del cuerpo.
        '/entitlements/access': { companyId: EMPRESA_ID, entitlements: [] },
        '/subscription-item-limits': TOPES,
      },
      { permisos: PERMISOS },
    )
    await page.goto('/dashboard/suscripcion/cupos')

    // El fallo más caro que esta feature puede producir es pintar «no tienes
    // topes» en verde sobre un renombrado del backend.
    await expect(page.getByText(/no pudimos leer tus cupos/i)).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveCount(0)
  })
})
