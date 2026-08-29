import { expect, test, type Page } from '@playwright/test'
import { intencion, leerIntencion, sembrarIntencion } from './helpers/contratacion'
import { EMPRESA_NOMBRE, EMPRESA_RESPUESTA, enrutarApi, instalarSesion } from './helpers/sesion'
import { tabularHasta } from './helpers/teclado'

/**
 * Pasos 6 y 7 del embudo — `/dashboard/contratar` y su pantalla de éxito.
 *
 * Es el paso VINCULANTE: el clic por el que entra el dinero. Hasta hoy no tenía
 * ni una prueba.
 *
 * ── Qué se simula y qué no ─────────────────────────────────────────────────
 * Se simulan la sesión y `GET /companies/{id}` (ver `helpers/sesion.ts`). NO se
 * simula el cálculo: los importes y las fechas de prueba los produce el propio
 * `contratacion.source.ts` con la lista de precio transcrita, que es lo que la
 * aplicación hace de verdad hoy — no hay endpoint de contratación y la pantalla
 * lo dice. `activarPlan()` tampoco sale a la red, así que el paso 7 se ejercita
 * entero sin inventar nada.
 *
 * ── El caso que justifica media especificación ─────────────────────────────
 * §5, caso 3: si el precio se movió entre elegir y confirmar, **la casilla de
 * términos se desmarca**. No es un adorno de interfaz: es §3.3.4 Error
 * Prevention. Nadie confirma un importe que no ha leído, y el consentimiento
 * dado sobre otra cifra no vale. Se comprueba metiendo a mano un
 * `importeVistoMensual` distinto en el espejo de la intención, que es
 * exactamente lo que le pasa a quien eligió el martes y entra el jueves.
 */

const CONFIRMAR = 'Confirmar y activar mi plan'

async function entrarAlPaso6(page: Page, over: Parameters<typeof intencion>[0] = {}) {
  await instalarSesion(page)
  await sembrarIntencion(page, intencion(over))
  await enrutarApi(page, { '/companies/*': EMPRESA_RESPUESTA })
  await page.goto('/dashboard/contratar')
  await expect(page.getByRole('heading', { level: 1, name: 'Confirma tu plan' })).toBeVisible()
}

test.describe('Paso 6 — el paso vinculante', () => {
  test('resume la clínica, el plan y las fechas de prueba por línea', async ({ page }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    // El nombre y el NIT vienen del servidor: es lo ÚNICO que hoy viaja.
    await expect(paso).toContainText(EMPRESA_NOMBRE)
    await expect(paso).toContainText('900123456-7')

    // La prueba vence POR LÍNEA, no por contrato. Caja tiene 14 días y Agenda
    // 30 dentro del mismo plan, así que la tabla tiene que enseñar las dos.
    await expect(paso).toContainText('Caja')
    await expect(paso).toContainText('Agenda')

    // Al entrar en el paso el foco va al `<h1>`: tras un `router.push` se queda
    // en el `<body>` y el lector empieza a leer desde la navegación otra vez.
    await expect(page.getByRole('heading', { level: 1, name: 'Confirma tu plan' })).toBeFocused()
  })

  test('el aviso de modo demostración no se puede cerrar', async ({ page }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    // Un aviso de que no hay cobro real que se pueda descartar es un aviso que
    // la mitad de la gente no ve. Si alguien le pone una ✕, esto se pone rojo.
    await expect(paso.getByRole('button', { name: /cerrar|descartar|entendido/i })).toHaveCount(0)
  })

  test('conserva la semántica del paso', async ({ page }) => {
    await entrarAlPaso6(page)
    await expect(page.getByTestId('paso-contratar')).toMatchAriaSnapshot({
      name: 'contratar-paso6.aria.yml',
    })
  })

  test('sin aceptar los términos no activa, y el resumen de errores lo dice igual que el campo', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    await paso.getByRole('button', { name: CONFIRMAR }).click()

    // Sigue en el paso 6: no ha pasado nada.
    await expect(page).toHaveURL(/\/dashboard\/contratar$/)

    const resumen = page.getByRole('alert').filter({ hasText: 'problema' })
    await expect(resumen).toBeVisible()
    // El foco va al resumen: si se queda en el botón, quien usa lector de
    // pantalla no se entera de que hay un error arriba.
    await expect(resumen).toBeFocused()

    // GOV.UK: texto LITERAL, no reformulado. Es lo que permite reconocer el
    // error de arriba como el mismo de abajo.
    const texto = 'Tienes que aceptar los Términos para continuar.'
    await expect(resumen.getByRole('link', { name: texto })).toBeVisible()

    // Y el ancla mueve el FOCO al control, no solo el hash.
    await resumen.getByRole('link', { name: texto }).click()
    await expect(paso.getByRole('checkbox')).toBeFocused()
  })

  test('la casilla marcada lleva al paso 7 con lo que se acaba de activar', async ({ page }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    await paso.getByRole('checkbox').check()
    await paso.getByRole('button', { name: CONFIRMAR }).click()

    await expect(page).toHaveURL(/\/dashboard\/contratar\/exito$/)
    const exito = page.getByTestId('contratacion-exito')
    await expect(exito.getByRole('heading', { level: 1 })).toContainText('Clínica')
    await expect(exito.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(exito).toContainText(EMPRESA_NOMBRE)
    await expect(page).toHaveTitle('Tu plan está activo — VetSoftware')

    // Lo que todavía no es verdad, dicho donde se puede leer: hoy no existe el
    // endpoint y la confirmación no ha viajado al servidor. Si alguien borra
    // esta frase sin que exista el endpoint, la pantalla pasa a mentir.
    await expect(exito).toContainText('no ha viajado al servidor')
  })

  test('la intención se descarta al contratar: el enganche del login no vuelve a disparar', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')
    await paso.getByRole('checkbox').check()
    await paso.getByRole('button', { name: CONFIRMAR }).click()
    await expect(page).toHaveURL(/\/contratar\/exito$/)

    const guardada = await leerIntencion(page)
    expect(guardada?.descartada, 'sin esto, el guard reabre el embudo').toBe(true)
  })

  test('«Ahora no» no borra la intención: la marca, y sale al tablero', async ({ page }) => {
    await entrarAlPaso6(page)
    await page.getByTestId('paso-contratar').getByRole('button', { name: 'Ahora no' }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    const guardada = await leerIntencion(page)
    // Borrarla haría que el enganche del login volviera a disparar en la
    // siguiente navegación, y eso es una jaula.
    expect(guardada, 'descartar NO es borrar').not.toBeNull()
    expect(guardada!.descartada).toBe(true)
  })
})

test.describe('§5 caso 3 — el precio cambió mientras decidía', () => {
  test('el aviso aparece, se lleva el foco y la casilla queda DESMARCADA', async ({ page }) => {
    // El importe que se vio: uno que el servidor no va a devolver. Es lo que le
    // pasa a quien eligió antes de que se moviera la lista de precio.
    await entrarAlPaso6(page, { importeVistoMensual: 111_111 })
    const paso = page.getByTestId('paso-contratar')

    const aviso = page.getByRole('alert').filter({ hasText: 'El precio cambió' })
    await expect(aviso).toBeVisible()
    await expect(aviso).toBeFocused()

    // Las dos cifras, la de antes y la de ahora, para que la decisión se pueda
    // tomar sin salir de la pantalla.
    await expect(aviso).toContainText('111.111')
    await expect(aviso).toContainText('179.000')

    // LA AFIRMACIÓN QUE IMPORTA. El consentimiento anterior era sobre otra
    // cifra: no vale, y la casilla tiene que volver a su estado inicial.
    await expect(paso.getByRole('checkbox')).not.toBeChecked()

    // Y no hay atajo: confirmar sin volver a marcarla no activa nada.
    await paso.getByRole('button', { name: CONFIRMAR }).click()
    await expect(page).toHaveURL(/\/dashboard\/contratar$/)
  })

  test('sin deriva no hay aviso: el caso feliz no paga el precio del raro', async ({ page }) => {
    await entrarAlPaso6(page)
    await expect(page.getByRole('alert').filter({ hasText: 'El precio cambió' })).toHaveCount(0)
  })
})

test.describe('§5 caso 2 — se perdió la intención', () => {
  test('no es un error del usuario, así que no se pinta como tal: hay selector', async ({
    page,
  }) => {
    await instalarSesion(page)
    await enrutarApi(page, { '/companies/*': EMPRESA_RESPUESTA })
    await page.goto('/dashboard/contratar')

    const paso = page.getByTestId('paso-contratar')
    await expect(paso).toContainText('Vamos a elegir el plan de tu clínica')
    // Nada de banner rojo: quien perdió un borrador no cometió ningún fallo.
    await expect(paso.getByRole('alert')).toHaveCount(0)

    // Y el selector funciona: eligiendo aquí se llega al resumen.
    await paso.getByRole('button', { name: /^Continuar con / }).click()
    await expect(paso.getByRole('checkbox')).toBeVisible()
  })
})

test.describe('Recorrido de solo teclado', () => {
  /**
   * Va en dos tramos, y el corte no es una comodidad: entre el paso 4 y el 5 hay
   * un salto de verificación por CORREO (auto-registro Opción B del backend) que
   * ninguna prueba de navegador puede recorrer sin buzón. Los dos tramos sí son
   * continuos y sin ratón, que es lo que la especificación pide comprobar.
   */
  test('tramo público: del enlace de salto hasta elegir plan en /planes', async ({ page }) => {
    await page.goto('/')

    const salto = page.getByRole('link', { name: 'Saltar al contenido' })
    await tabularHasta(page, salto, { maximo: 2 })
    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()

    // Desde el contenido, hasta el CTA del hero. Cada parada: visible, sin
    // perder el foco y sin retroceder en el documento.
    // El del hero, no el del CTA final: se llaman igual y van a sitios distintos.
    const verPlanes = page
      .getByRole('link', { name: 'Ver los planes' })
      .and(page.locator('[href="#planes"]'))
    await tabularHasta(page, verPlanes)
    await page.keyboard.press('Enter')
    await expect(page.locator('#planes')).toBeFocused()

    // Y desde la sección de planes, hasta el CTA de la tarjeta recomendada.
    const cta = page.getByRole('link', { name: 'Empezar con Clínica' })
    await tabularHasta(page, cta)
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/planes\?plan=CLINICA/)

    const continuar = page.getByRole('button', { name: /^Continuar con / })
    await tabularHasta(page, continuar)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/registro\?plan=CLINICA/)
  })

  test('tramo autenticado: del inicio del paso 6 hasta «Confirmar y activar mi plan»', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    // El foco arranca en el `<h1>`, que es donde lo dejó la pantalla al montar.
    await expect(page.getByRole('heading', { level: 1, name: 'Confirma tu plan' })).toBeFocused()

    const casilla = paso.getByRole('checkbox')
    await tabularHasta(page, casilla)
    await page.keyboard.press('Space')
    await expect(casilla).toBeChecked()

    const boton = paso.getByRole('button', { name: CONFIRMAR })
    await tabularHasta(page, boton)
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/dashboard\/contratar\/exito$/)
  })
})
