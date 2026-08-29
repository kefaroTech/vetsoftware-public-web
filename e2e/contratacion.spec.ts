import { expect, test, type Page, type Route } from '@playwright/test'
import { subtotalMensualEquivalente } from '../src/features/landing/composables/planPricing'
import { PLANS_CONTENT } from '../src/features/landing/content/plans.content'
import { intencion, leerIntencion, sembrarIntencion, type Intencion } from './helpers/contratacion'
import {
  EMPRESA_NOMBRE,
  EMPRESA_RESPUESTA,
  enrutarApi,
  instalarSesion,
  responderJson,
} from './helpers/sesion'
import { tabularHasta } from './helpers/teclado'

/**
 * Pasos 6 y 7 del embudo — `/dashboard/contratar` y su pantalla de éxito.
 *
 * Es el paso VINCULANTE: el clic por el que entra el dinero.
 *
 * ── Qué se simula y qué no ─────────────────────────────────────────────────
 * Se simulan la sesión, `GET /companies/{id}` y **`POST /quotes/self-serve`**
 * (ver `helpers/sesion.ts`). El catálogo NO se simula: `plans.source.ts` sigue
 * sirviendo `plans.content.ts`, así que el plan que se contrata es el de verdad
 * y esta spec puede importarlo para derivar de él lo que espera, en vez de
 * transcribir cifras que caducan.
 *
 * ── Lo que cambió, y por qué esta spec se reescribió entera ────────────────
 * `activarPlan()` YA SALE A LA RED. Hasta que la línea de la oferta se nombró
 * por `code` en vez de por un `catalogItemId` que ninguna respuesta alcanzable
 * por el tenant publicaba, el endpoint tenía ruta, permiso y cero llamadores
 * posibles, y el paso 7 se pintaba con el cálculo local. Eso abre tres cosas
 * que la versión anterior no podía comprobar y que ahora tienen su propio
 * bloque: **qué cuerpo se manda**, **de quién son los importes del paso 7** y
 * **que el cobro sigue siendo una simulación**.
 *
 * ── El permiso NO es atrezo del arranque ───────────────────────────────────
 * `POST /quotes/self-serve` exige `quote.request`, y ese permiso se siembra solo
 * en nivel `FULL`: una clínica en mora queda en `READ_ONLY` y **no lo tiene**.
 * Ese es el estado normal de quien se atrasó en un pago, no un borde raro, así
 * que «sin permiso el control desaparece y en su sitio hay una frase honesta»
 * es un caso con nombre propio, más abajo.
 *
 * ── El caso que justifica media especificación ─────────────────────────────
 * §5, caso 3: si el precio se movió entre elegir y confirmar, **la casilla de
 * términos se desmarca**. No es un adorno de interfaz: es §3.3.4 Error
 * Prevention. Nadie confirma un importe que no ha leído, y el consentimiento
 * dado sobre otra cifra no vale.
 */

const CONFIRMAR = 'Confirmar mi plan'

/** Lo único que hace falta para que el paso vinculante exista. Ver el encabezado. */
const PERMISOS_CONTRATAR = ['quote.request']

function planPorCodigo(code: string) {
  const plan = PLANS_CONTENT.plans.find((p) => p.code === code)
  if (!plan) throw new Error(`El contenido de planes ya no publica «${code}»`)
  return plan
}

/** El plan de la intención por defecto del helper. */
const CLINICA = planPorCodigo('CLINICA')

/**
 * El importe mensual equivalente de una selección, calculado con la MISMA
 * función que usa la aplicación.
 *
 * Es lo que se siembra en `importeVistoMensual` para que un caso no dispare el
 * aviso de deriva de precio sin querer. Derivarlo en vez de escribir «179000» es
 * lo que hace que subir un precio en `plans.content.ts` no ponga en rojo seis
 * casos que no van del precio.
 */
function vistoMensual(sedes: number, usuarios: number): number {
  return subtotalMensualEquivalente(CLINICA, { ciclo: 'MENSUAL', sedes, usuarios })
}

/** «179.000» a partir del número, sin transcribirlo: los grupos que pinta `formatMoney`. */
const grupos = new Intl.NumberFormat('es-CO')

/**
 * La oferta que devuelve el servidor.
 *
 * **Los importes NO son los del cálculo local a propósito**, y esa es la única
 * forma de comprobar de quién son los que se pintan en el paso 7: si alguien
 * devolviera el estimado a la pantalla de éxito, estos números desaparecerían y
 * saldrían los de la lista transcrita. El impuesto ni siquiera es el 19 % del
 * subtotal — el servidor resuelve tarifa y tramos, y este front no tiene por qué
 * saber recomponerlo.
 */
const OFERTA = {
  id: 4242,
  quoteNumber: 'COT-E2E-0001',
  billingCycle: 'MONTHLY',
  subtotalAmount: 123_456,
  discountAmount: 0,
  taxAmount: 23_457,
  totalAmount: 146_913,
  status: 'SENT',
  validUntil: '2026-09-27',
  createdDate: '2026-08-28',
  enabled: true,
}

/** Lo que el paso 7 pintaría si recompusiera el total en local en vez de creer al servidor. */
const TOTAL_ESTIMADO_LOCAL = Math.round(CLINICA.monthlyFromAmount * (1 + CLINICA.taxRate / 100))

/** El cuerpo de `POST /quotes/self-serve`, espejo de `SelfServeQuoteRequest`. */
interface CuerpoEnviado {
  clientRequestId: string
  billingCycle: string
  lines: { code: string; quantity: number }[]
}

/** Lo que la prueba ve de la petición: el cuerpo y cuántas veces salió. */
interface Captura {
  cuerpo: CuerpoEnviado | null
  llamadas: number
}

interface OpcionesPaso6 {
  /** Por defecto, el mínimo que hace existir el botón. `[]` es la clínica en mora. */
  permisos?: string[]
}

/**
 * Entra al paso 6 con la sesión, la intención y la API simuladas, y devuelve el
 * espejo de lo que se mande a `/quotes/self-serve`.
 *
 * El permiso va por defecto porque sin él **el control no existe** (no está
 * deshabilitado: no está), y un caso que quisiera pulsarlo fallaría con «no
 * encuentro el botón» sin decir por qué. El caso que comprueba justamente eso lo
 * pide vacío a propósito.
 */
async function entrarAlPaso6(
  page: Page,
  over: Partial<Intencion> = {},
  opciones: OpcionesPaso6 = {},
): Promise<Captura> {
  const captura: Captura = { cuerpo: null, llamadas: 0 }

  await instalarSesion(page)
  await sembrarIntencion(page, intencion(over))
  await enrutarApi(
    page,
    {
      '/companies/*': EMPRESA_RESPUESTA,
      // 201 y no 200: es lo que devuelve el endpoint, también en el reintento
      // idempotente con la misma `clientRequestId`.
      '/quotes/self-serve': (route: Route) => {
        captura.llamadas += 1
        captura.cuerpo = route.request().postDataJSON() as CuerpoEnviado
        return responderJson(route, OFERTA, 201)
      },
    },
    { permisos: opciones.permisos ?? PERMISOS_CONTRATAR },
  )
  await page.goto('/dashboard/contratar')
  await expect(page.getByRole('heading', { level: 1, name: 'Confirma tu plan' })).toBeVisible()

  return captura
}

/** Marca los términos y confirma. Espera al paso 7, que es el estado observable. */
async function confirmar(page: Page): Promise<void> {
  const paso = page.getByTestId('paso-contratar')
  await paso.getByRole('checkbox').check()
  await paso.getByRole('button', { name: CONFIRMAR }).click()
  await expect(page).toHaveURL(/\/dashboard\/contratar\/exito$/)
}

test.describe('Paso 6 — el paso vinculante', () => {
  test('resume la clínica, el plan y las fechas de prueba por línea', async ({ page }) => {
    await entrarAlPaso6(page)
    const paso = page.getByTestId('paso-contratar')

    // El nombre y el NIT vienen del servidor.
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
    const captura = await entrarAlPaso6(page)
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

    // Y NADA salió hacia el servidor. Antes esto no se podía afirmar porque no
    // había servidor al que salir; ahora lo hay, y «no activa» sin esta línea
    // solo dice que la pantalla no cambió de URL.
    expect(captura.llamadas, 'un consentimiento no dado no puede haber pedido una oferta').toBe(0)
  })

  test('la casilla marcada lleva al paso 7 con lo que se acaba de contratar', async ({ page }) => {
    await entrarAlPaso6(page)
    await confirmar(page)

    const exito = page.getByTestId('contratacion-exito')
    await expect(exito.getByRole('heading', { level: 1 })).toContainText('Clínica')
    await expect(exito.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(exito).toContainText(EMPRESA_NOMBRE)

    // «activo» era mentira y la propia pantalla la desmentía dos párrafos más abajo. Aceptar una
    // oferta no enciende hoy los módulos —nadie reacciona a `QuoteStatus.ACCEPTED`—, así que lo
    // que de verdad pasó es que la elección quedó reservada. El título de la pestaña dice lo
    // mismo que el `<h1>`.
    await expect(page).toHaveTitle('Tu plan está reservado — VetSoftware')
    await expect(exito.getByRole('heading', { level: 1 })).toContainText('reservado')

    // Lo que todavía NO es verdad, dicho donde se puede leer. La frase vieja —«no ha viajado al
    // servidor»— se borró porque dejó de ser cierta el día que `activarPlan` empezó a llamar al
    // endpoint; lo que sigue sin ocurrir es el último eslabón, y es esto lo que no se puede
    // borrar sin que la pantalla vuelva a prometer de más.
    await expect(exito).toContainText('Para dejar los módulos encendidos')
  })

  test('la intención se descarta al contratar: el enganche del login no vuelve a disparar', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    await confirmar(page)

    const guardada = await leerIntencion(page)
    expect(guardada?.descartada, 'sin esto, el guard reabre el embudo').toBe(true)
  })

  test('«Ahora no» no borra la intención: la marca, y sale al tablero', async ({ page }) => {
    const captura = await entrarAlPaso6(page)
    await page.getByTestId('paso-contratar').getByRole('button', { name: 'Ahora no' }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    const guardada = await leerIntencion(page)
    // Borrarla haría que el enganche del login volviera a disparar en la
    // siguiente navegación, y eso es una jaula.
    expect(guardada, 'descartar NO es borrar').not.toBeNull()
    expect(guardada?.descartada).toBe(true)
    expect(captura.llamadas, 'salir del embudo no pide ninguna oferta').toBe(0)
  })
})

/**
 * El cuerpo de `POST /quotes/self-serve`.
 *
 * Este bloque es el que no podía existir antes, y es el que protege una factura.
 * `lineasDeContratacion` toma tres decisiones y las tres tienen una cifra
 * detrás; las tres se comprueban aquí contra el JSON que de verdad sale por el
 * cable, y no contra la función en un unitario, porque lo que se afirma es que
 * la pantalla la llama con lo que el usuario eligió.
 */
test.describe('El cuerpo que viaja a POST /quotes/self-serve', () => {
  test('el paquete viaja por su `code`, y va una sola línea cuando nada se pasa de lo incluido', async ({
    page,
  }) => {
    // La intención por defecto: 1 sede y 1 persona, muy por debajo de las 2
    // sedes y las 8 personas que el paquete ya trae.
    const captura = await entrarAlPaso6(page)
    await confirmar(page)

    expect(captura.llamadas).toBe(1)
    expect(captura.cuerpo?.lines).toEqual([{ code: CLINICA.code, quantity: 1 }])
  })

  test('los módulos del paquete NO viajan como línea: cobrarlos aparte los cobra dos veces', async ({
    page,
  }) => {
    const captura = await entrarAlPaso6(page)
    await confirmar(page)

    // `findPublishedIdByCode` acepta sin rechistar un `MODULE` que cuelgue de un
    // paquete publicado, así que el servidor los resolvería y los facturaría: su
    // precio YA está dentro del precio de entrada del paquete
    // (`bundle_components`). Es un cobro doble de verdad, no una diferencia de
    // redondeo, y además es la única forma de que el total del servidor se
    // separe del estimado que el usuario acaba de aceptar.
    const enviados = (captura.cuerpo?.lines ?? []).map((l) => l.code)
    for (const modulo of CLINICA.includes) {
      expect(enviados, `«${modulo.code}» es un componente del paquete, no una línea`).not.toContain(
        modulo.code,
      )
    }
  })

  test('la capacidad solo viaja cuando se pasa de lo incluido, y con la cantidad CONTRATADA', async ({
    page,
  }) => {
    const sedes = 3 // el paquete incluye 2
    const usuarios = 12 // el paquete incluye 8
    const captura = await entrarAlPaso6(page, {
      sedes,
      usuarios,
      importeVistoMensual: vistoMensual(sedes, usuarios),
    })
    await confirmar(page)

    const lineas = captura.cuerpo?.lines ?? []
    expect(lineas).toContainEqual({ code: CLINICA.code, quantity: 1 })

    // La cantidad es la CONTRATADA, no la extra: `TieredPrice.of` resta ya lo
    // incluido (`billableQuantity`) y reparte el resto por tramos acumulativos.
    // Mandar «1 sede extra» y «4 personas extra» haría que el servidor volviera
    // a restar lo incluido y cobrara de menos.
    for (const capacidad of CLINICA.capacities) {
      const contratada = capacidad.unit === 'BRANCH' ? sedes : usuarios
      expect(contratada, 'el caso deja de probar nada si no supera lo incluido').toBeGreaterThan(
        capacidad.included,
      )
      expect(lineas).toContainEqual({ code: capacidad.code, quantity: contratada })
    }

    expect(lineas).toHaveLength(1 + CLINICA.capacities.length)
  })

  test('la capacidad que NO se pasa de lo incluido se queda fuera del cuerpo', async ({ page }) => {
    // Justo lo incluido, ni una más: el servidor no emitiría renglón por ella
    // (`billableQuantity` da 0), pero el traductor sí exige que exista fila de
    // precio en el ciclo pedido, y una capacidad sin ella hunde la oferta ENTERA
    // con un mensaje que no dice cuál falló. Una línea que no cobra nada solo
    // puede hacer daño.
    const sedes = CLINICA.capacities.find((c) => c.unit === 'BRANCH')?.included ?? 1
    const usuarios = CLINICA.capacities.find((c) => c.unit === 'USER')?.included ?? 1
    const captura = await entrarAlPaso6(page, {
      sedes,
      usuarios,
      importeVistoMensual: vistoMensual(sedes, usuarios),
    })
    await confirmar(page)

    expect(captura.cuerpo?.lines).toEqual([{ code: CLINICA.code, quantity: 1 }])
  })

  test('el ciclo viaja con el vocabulario del contrato, no con el rótulo de la pantalla', async ({
    page,
  }) => {
    // `MENSUAL`/`ANUAL` son el rótulo de un selector; por el cable van
    // `MONTHLY`/`ANNUAL`. `importeVistoMensual` se normaliza a mensual, así que
    // elegir el ciclo anual no dispara por sí solo el aviso de deriva.
    const captura = await entrarAlPaso6(page, { ciclo: 'ANUAL' })
    await confirmar(page)

    expect(captura.cuerpo?.billingCycle).toBe('ANNUAL')
  })

  test('lleva llave de idempotencia, y cabe en los 64 caracteres del contrato', async ({
    page,
  }) => {
    // Es lo que hace que un doble clic —o una segunda pestaña— no cree dos
    // ofertas: el servidor devuelve la primera con el mismo 201.
    const captura = await entrarAlPaso6(page)
    await confirmar(page)

    const llave = captura.cuerpo?.clientRequestId ?? ''
    expect(llave.length).toBeGreaterThan(0)
    expect(llave.length).toBeLessThanOrEqual(64)
  })

  test('la empresa NO viaja en el cuerpo: la pone el servidor desde el principal', async ({
    page,
  }) => {
    const captura = await entrarAlPaso6(page)
    await confirmar(page)

    // `isMyCompany` compara la empresa consigo misma porque el controlador la
    // deriva de `authz.currentCompanyId()`. Mandarla desde el cliente sería
    // ofrecer un campo que el servidor ignora y que la próxima persona que lea
    // esto creería que se respeta.
    expect(Object.keys(captura.cuerpo ?? {}).sort()).toEqual([
      'billingCycle',
      'clientRequestId',
      'lines',
    ])
  })
})

/** Paso 7 — de quién son los importes, y qué NO ha pasado todavía. */
test.describe('Paso 7 — manda el servidor', () => {
  test('pinta los importes de la oferta, no el estimado que se recalcularía en local', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    await confirmar(page)
    const exito = page.getByTestId('contratacion-exito')

    // Los tres del servidor.
    await expect(exito).toContainText(grupos.format(OFERTA.subtotalAmount))
    await expect(exito).toContainText(grupos.format(OFERTA.taxAmount))
    await expect(exito).toContainText(grupos.format(OFERTA.totalAmount))

    // Y NO el que saldría de la lista de precio transcrita. Sin esta línea, un
    // `??` puesto al revés en `activarPlan` —el estimado ganando al servidor—
    // pasaría desapercibido: los dos números se leen igual de bien en pantalla.
    await expect(exito).not.toContainText(grupos.format(TOTAL_ESTIMADO_LOCAL))
  })

  test('el número de la oferta y su vigencia se pintan: hacen accionable el «escríbenos»', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    await confirmar(page)
    const exito = page.getByTestId('contratacion-exito')

    await expect(exito).toContainText(OFERTA.quoteNumber)
    // La vigencia, ENTERA. Un «27» y un «2026» sueltos ya salen en la tabla de
    // fechas de prueba, así que afirmarlos por separado pasaría igual con la
    // vigencia sin pintar: la fecha completa es lo único que solo puede venir de
    // `validUntil`.
    await expect(exito).toContainText('27 de septiembre, 2026')
  })

  test('el cobro sigue siendo una simulación, y la pantalla no dice lo contrario', async ({
    page,
  }) => {
    await entrarAlPaso6(page)
    await confirmar(page)
    const exito = page.getByTestId('contratacion-exito')

    // No hay pasarela conectada. El aviso se repite aquí una segunda y ÚLTIMA vez.
    await expect(exito).toContainText('Modo demostración')
    await expect(exito).toContainText('no se ha cobrado nada')

    // Y en ningún sitio se afirma que haya habido un cargo. Esto es lo que
    // separa «tu plan quedó reservado» de un recibo falso.
    const texto = (await exito.textContent()) ?? ''
    expect(texto).not.toMatch(
      /pago (recibido|procesado|aprobado)|hemos cobrado|te cobramos|se te ha cobrado|cargo (a|en) tu tarjeta|tarjeta terminada/i,
    )

    // Ni un solo campo que pida datos de pago: pedir dieciséis dígitos para no
    // cobrar es exactamente lo que hace el fraude.
    await expect(exito.getByRole('textbox')).toHaveCount(0)
  })
})

test.describe('§5 caso 3 — el precio cambió mientras decidía', () => {
  test('el aviso aparece, se lleva el foco y la casilla queda DESMARCADA', async ({ page }) => {
    // El importe que se vio: uno que el catálogo no va a devolver. Es lo que le
    // pasa a quien eligió antes de que se moviera la lista de precio.
    const captura = await entrarAlPaso6(page, { importeVistoMensual: 111_111 })
    const paso = page.getByTestId('paso-contratar')

    const aviso = page.getByRole('alert').filter({ hasText: 'El precio cambió' })
    await expect(aviso).toBeVisible()
    await expect(aviso).toBeFocused()

    // Las dos cifras, la de antes y la de ahora, para que la decisión se pueda
    // tomar sin salir de la pantalla. La de ahora se deriva del contenido: un
    // cambio de precio no debe poner en rojo un caso que va de otra cosa.
    await expect(aviso).toContainText(grupos.format(111_111))
    await expect(aviso).toContainText(grupos.format(vistoMensual(1, 1)))

    // LA AFIRMACIÓN QUE IMPORTA. El consentimiento anterior era sobre otra
    // cifra: no vale, y la casilla tiene que volver a su estado inicial.
    await expect(paso.getByRole('checkbox')).not.toBeChecked()

    // Y no hay atajo: confirmar sin volver a marcarla no pide ninguna oferta.
    await paso.getByRole('button', { name: CONFIRMAR }).click()
    await expect(page).toHaveURL(/\/dashboard\/contratar$/)
    expect(captura.llamadas).toBe(0)
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
    await enrutarApi(page, { '/companies/*': EMPRESA_RESPUESTA }, { permisos: PERMISOS_CONTRATAR })
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

/**
 * La frontera de permiso, como CASO y no como atrezo.
 *
 * Una clínica en mora queda en `READ_ONLY` y pierde `quote.request`, que solo se
 * siembra en nivel `FULL`. Sin esta comprobación el resultado sería el peor
 * posible: el botón más importante del embudo, pulsado, girando y devolviendo un
 * 403 sin explicación a alguien cuyo único problema es una factura pendiente.
 */
test.describe('Sin `quote.request` no hay paso vinculante', () => {
  test('el control está AUSENTE, no deshabilitado, y en su sitio hay una frase que explica', async ({
    page,
  }) => {
    await entrarAlPaso6(page, {}, { permisos: [] })
    const paso = page.getByTestId('paso-contratar')

    // El resumen sigue estando: se puede leer lo que costaría, que es
    // información legítima. Lo que no está es el clic vinculante.
    await expect(paso).toContainText(EMPRESA_NOMBRE)

    // AUSENTE. Un botón deshabilitado sin motivo visible se lee como un fallo de
    // la aplicación, y esta afirmación es justo la que se rompería si alguien
    // «arreglara» esto poniéndole un `:disabled`.
    await expect(paso.getByRole('button', { name: CONFIRMAR })).toHaveCount(0)
    await expect(paso.getByRole('checkbox')).toHaveCount(0)

    // Pedir que se acepten unos términos para después no dejar continuar es la
    // peor forma posible de comunicar una falta de permiso.
    await expect(paso.getByText('He leído y acepto los')).toHaveCount(0)

    // En su lugar, quién puede hacerlo y qué hacer, sin nombrar el código del
    // permiso, que al usuario no le dice nada.
    await expect(paso.getByText('Tu usuario no puede confirmar la contratación')).toBeVisible()
    await expect(paso.getByRole('link', { name: 'soporte@vetsoftware.co' }).first()).toBeVisible()

    // `role="status"`, NUNCA `alert`: no ha fallado nada, es el estado de la
    // cuenta. Un `alert` corta la locución en curso para dar una noticia que no
    // es una noticia.
    await expect(paso.getByRole('alert')).toHaveCount(0)
    await expect(
      paso.locator('[role="status"]').filter({ hasText: 'no puede confirmar' }),
    ).toHaveCount(1)
  })

  test('«Ahora no» sigue estando: quien no puede contratar tiene que poder salir', async ({
    page,
  }) => {
    const captura = await entrarAlPaso6(page, {}, { permisos: [] })
    const paso = page.getByTestId('paso-contratar')

    await paso.getByRole('button', { name: 'Ahora no' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    // Y en todo el recorrido no salió ni una petición que el servidor fuera a
    // rechazar con un 403.
    expect(captura.llamadas, 'no se pide una oferta que el gate va a negar').toBe(0)
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

  test('tramo autenticado: del inicio del paso 6 hasta «Confirmar mi plan»', async ({ page }) => {
    const captura = await entrarAlPaso6(page)
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
    expect(captura.llamadas, 'el teclado tiene que pedir la oferta igual que el ratón').toBe(1)
  })
})
