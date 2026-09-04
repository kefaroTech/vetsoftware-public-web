import { expect, test, type Page } from '@playwright/test'
import type {
  EditProposalLinesRequest,
  GenerateProposalRequest,
} from '../src/features/asistente/types/asistente.types'
import {
  CODIGO_AGENDA,
  CODIGO_NUCLEO,
  CODIGO_RECOMENDADO,
  CODIGO_USUARIOS_EXTRA,
  cuerpoDe,
  enrutarEmbudo,
  intencionDePropuesta,
  MOTIVO_AGENDA,
  noEncontrado,
  propuestaConRecomendado,
  propuestaDeterminista,
  propuestaSinCapacidad,
  propuestaViva,
  sembrarIntencionDePropuesta,
  sembrarSesionDelAsistente,
  TOKEN_DESCONOCIDO,
  TOKEN_MAL_FORMADO,
  TOKEN_VIVO,
  VERSION_INICIAL,
  type RedDelAsistente,
} from './helpers/asistente'
import { elemento, exigir } from './helpers/exigir'
import { responderJson } from './helpers/sesion'

/**
 * EL EMBUDO DE LA PROPUESTA DEL ASISTENTE, DE PUNTA A PUNTA.
 *
 * <p>Un prospecto ANÓNIMO —sin cuenta, sin sesión y sin empresa— cuenta a qué se
 * dedica su clínica, recibe una propuesta con precios, la edita, y se la lleva a
 * la contratación. Lo único que separa su propuesta de la de otro son 43
 * caracteres, así que buena parte de esta suite trata de esos 43 caracteres.
 *
 * ── Las cuatro cosas que estos casos existen para impedir ───────────────────
 *
 * **1. Que la credencial se quede en la barra.** Un token en la URL acaba en el
 * historial del navegador —para siempre, y visible para el siguiente que use el
 * equipo— y en cualquier captura de esa pestaña. Por eso no basta con comprobar
 * que la URL final es `/planes`: hay que comprobar que la entrada del historial
 * se SUSTITUYÓ, porque con `push` la URL con el token dentro sigue existiendo a
 * un «atrás» de distancia.
 *
 * **2. Que un enlace muerto se pinte como una avería.** El servidor devuelve 404
 * tanto si el token no existe como si caducó, deliberadamente, para no ser un
 * oráculo. Para el usuario eso es UNA sola cosa, no es culpa suya y no es un
 * fallo del sistema: es el fin de un camino, con una salida al lado.
 *
 * **3. Que las cifras no se afirmen.** Aquí se comprueban CANTIDADES e IMPORTES,
 * no que la pantalla pinte algo. `unitAmount` es el precio de UNA unidad: una
 * línea de cuatro personas que no diga «× 4» enseña la cuarta parte de lo que
 * aporta al subtotal, y una prueba que solo mire que hay una fila deja pasar
 * exactamente esa mutación.
 *
 * **4. Que solo se cubra el camino que hoy no corre.** El acceso al modelo no
 * está habilitado, así que `DETERMINISTIC` **es el camino real de hoy**. Una
 * suite que solo cubriera `PROPOSAL` no cubriría nada de lo que se ejecuta.
 *
 * ── Los controles positivos, y por qué hay cuatro ──────────────────────────
 * Cuatro de estos casos afirman una AUSENCIA —el token no está en la URL, el
 * historial no creció, no salió ninguna petición, el aviso de «punto de partida»
 * no se pinta—, y una ausencia mal escrita da exactamente la misma salida verde
 * que no haber mirado. Cada una lleva al lado la demostración de que el
 * instrumento detecta lo contrario: una URL que sí conserva el token, una
 * navegación que sí empuja historial, un token bien formado que sí llega al
 * servidor, y una respuesta `PROPOSAL` sobre la que ese mismo aviso sí aparece.
 *
 * ── Sin backend, y por qué aquí eso es una ventaja y no una trampa ─────────
 * Ver la cabecera de `helpers/asistente.ts`. En una frase: contra un servidor
 * real el único desenlace observable hoy sería el determinista, y el 404 del
 * enlace caducado exigiría esperar a que un token expirara de verdad.
 */

/**
 * `$ 176.000`: el símbolo, un espacio que puede ser duro, y la cifra EXACTA.
 *
 * <p>La cifra se escribe a mano en cada caso y no se deriva de ningún
 * formateador: derivarla del mismo `Intl` que usa la pantalla convertiría la
 * afirmación en una tautología que pasa con cualquier importe.
 */
function dinero(cifra: string): RegExp {
  return new RegExp(`^\\$\\s?${cifra.replace(/\./g, '\\.')}$`)
}

/** Lo mismo, con el sufijo de ciclo que lleva cada línea de la tabla. */
function dineroAlMes(cifra: string): RegExp {
  return new RegExp(`^\\$\\s?${cifra.replace(/\./g, '\\.')} al mes$`)
}

/** El número de entradas del historial de esta pestaña. */
function historial(page: Page): Promise<number> {
  return page.evaluate(() => window.history.length)
}

/** El `<h2>` que solo existe cuando hay una propuesta pintada. */
function encabezadoDePropuesta(page: Page) {
  return page.getByRole('heading', { level: 2, name: 'Tu propuesta' })
}

/**
 * Rellena el formulario de entrada con datos reconocibles como de prueba.
 *
 * <p>El correo lleva el TLD reservado `.invalid`: pasa la validación del
 * formulario y no puede existir, así que ni un envío accidental llegaría a nadie.
 */
async function contarleAlAsistente(page: Page): Promise<void> {
  await page
    .getByLabel('¿A qué se dedica tu negocio?')
    .fill('Clínica veterinaria E2E de prueba: consultas, vacunación, baños y una sola sede.')
  await page.getByLabel('¿A qué correo te mandamos tu propuesta?').fill('e2e@vetsoftware.invalid')

  // Dos casillas y ni una más DENTRO del bloque de entrada. El alcance dejó de
  // poder ser la página entera cuando `/planes` pasó a montar siempre el
  // selector de módulos: sus casillas contarían aquí y el fallo diría «esperaba
  // 2 y hay 3» sobre un consentimiento que está perfectamente.
  const consentimientos = page.getByTestId('asistente-entrada').getByRole('checkbox')
  await expect(consentimientos).toHaveCount(2)
  // Arrancan las DOS desmarcadas. El silencio no autoriza, y una casilla premarcada
  // no es un consentimiento: es un valor por defecto disfrazado.
  await expect(consentimientos.nth(0)).not.toBeChecked()
  await expect(consentimientos.nth(1)).not.toBeChecked()
  await consentimientos.nth(0).check()
  await consentimientos.nth(1).check()
}

/** Ninguna petición cayó en el comodín: todo lo que se pidió estaba previsto. */
function sinPeticionesImprevistas(red: RedDelAsistente): void {
  expect(red.inesperadas, 'la pantalla pidió algo que la prueba no previó').toEqual([])
}

test.describe('El enlace del correo — la llegada', () => {
  test('el token se recorta de la URL y la propuesta se pinta en /planes', async ({
    page,
    context,
  }) => {
    // ── CONTROL POSITIVO, antes de afirmar nada ─────────────────────────────
    // «El token no está en la URL» y «no lo estoy buscando» dan la misma salida
    // verde. Antes de afirmar la ausencia se demuestra que este mismo detector VE
    // el token cuando el token está, sobre una ruta que no limpia nada. Va en una
    // pestaña aparte para no ensuciar la auditoría de red de la principal, y se
    // espera a que la SPA monte: lo que se comprueba es que la aplicación,
    // montada y viva, lo deja donde estaba.
    const espejo = await context.newPage()
    await enrutarEmbudo(espejo, {})
    await espejo.goto(`/login?token=${TOKEN_VIVO}`)
    await expect(espejo.getByRole('heading', { level: 1, name: 'Inicia sesión' })).toBeVisible()
    expect(espejo.url(), 'el detector de token no detecta nada').toContain(TOKEN_VIVO)
    await espejo.close()

    const red = await enrutarEmbudo(page, {
      '/assistant/proposal*': (route) => responderJson(route, propuestaViva()),
    })

    await page.goto(`/?token=${TOKEN_VIVO}`)

    // La propuesta se pinta: llegar limpio a `/planes` sin propuesta sería el
    // fallo silencioso que este enlace existe para no producir.
    await expect(encabezadoDePropuesta(page)).toBeVisible()
    await expect(page).toHaveURL(/\/planes$/)

    // Y ahora sí, la ausencia: ni en la ruta, ni en la cadena de consulta.
    expect(page.url()).not.toContain(TOKEN_VIVO)
    expect(page.url()).not.toContain('token')

    expect(red.llamadas, 'se releyó la propuesta exactamente una vez').toHaveLength(1)
    sinPeticionesImprevistas(red)
  })

  test('sustituye la entrada del historial en vez de añadir una', async ({ page, context }) => {
    const red = await enrutarEmbudo(page, {
      '/assistant/proposal*': (route) => responderJson(route, propuestaViva()),
    })
    await page.goto(`/?token=${TOKEN_VIVO}`)
    await expect(encabezadoDePropuesta(page)).toBeVisible()
    await expect(page).toHaveURL(/\/planes$/)

    // ── CONTROL POSITIVO del contador ───────────────────────────────────────
    // Una pestaña hermana, recién abierta, con la misma línea de salida. Ahí se
    // hace una navegación que SÍ empuja —un `RouterLink` corriente— y se
    // comprueba que el contador se mueve. Sin esto, «no creció» y «este contador
    // no se mueve nunca» darían la misma salida verde.
    const control = await context.newPage()
    await enrutarEmbudo(control, {})
    await control.goto('/')
    await expect(
      control.getByRole('heading', { level: 2, name: 'Combinaciones que se piden mucho' }),
    ).toBeVisible()
    const salida = await historial(control)

    // El CTA de una tarjeta de combinación, que es hoy el único `RouterLink`
    // corriente de la portada hacia `/planes`: los dos primeros enlaces de la
    // barra superior dejaron de navegar cuando sus destinos pasaron a estar en
    // esta misma página, y un ancla no empuja entrada de historial — que es
    // justo lo que este control positivo necesita que ocurra.
    await control
      .getByTestId('plan-card')
      .filter({
        has: control.getByRole('heading', { level: 3, name: 'Pack Clínica', exact: true }),
      })
      .getByRole('link')
      .click()
    await expect(control).toHaveURL(/\/planes\?plan=PACK_CLINIC/)
    expect(await historial(control), 'el contador de historial no se mueve nunca').toBe(salida + 1)

    // Y el enlace del correo, que hace una navegación de la misma clase, NO mueve
    // el contador: es `replace`, así que la URL con la credencial dentro deja de
    // existir en vez de quedarse a un «atrás» de distancia.
    expect(await historial(page), 'el token quedó en el historial').toBe(salida)

    await control.close()
    sinPeticionesImprevistas(red)
  })
})

test.describe('El enlace del correo — el que ya no sirve', () => {
  test('un 404 es el fin del camino del usuario, no una avería del sistema', async ({ page }) => {
    const red = await enrutarEmbudo(page, {
      '/assistant/proposal*': (route) => noEncontrado(route),
    })

    await page.goto(`/?token=${TOKEN_DESCONOCIDO}`)

    const aviso = page.getByTestId('propuesta-enlace-caducado')
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText('Este enlace ya no sirve')

    // `role="status"` y NO `role="alert"`: el enlace tenía fecha de caducidad y
    // el correo la decía por escrito. Nada ha fallado, así que nada se anuncia
    // como fallo. La ausencia de `alert` es la mitad de la afirmación.
    await expect(aviso).toHaveAttribute('role', 'status')
    await expect(page.getByRole('alert'), 'se pintó como error del sistema').toHaveCount(0)

    // El foco va al aviso: quien llega por el enlace viene a ver una propuesta, y
    // el motivo por el que no está es lo único que hay que leer al llegar.
    await expect(aviso).toBeFocused()

    // La credencial sale de la barra TAMBIÉN cuando la recuperación falla. Es el
    // caso en que es más fácil olvidarlo: limpiar al terminar bien y no al
    // terminar mal deja el token puesto justo en la rama que se queda quieta.
    await expect(page).toHaveURL(/\/planes$/)
    expect(page.url()).not.toContain(TOKEN_DESCONOCIDO)

    // La salida está justo debajo y no pide nada: retira el aviso y deja el
    // cuadro de texto, que ya estaba montado.
    await page.getByRole('button', { name: 'Empezar de nuevo' }).click()
    await expect(aviso).toBeHidden()
    await expect(page.getByLabel('¿A qué se dedica tu negocio?')).toBeVisible()

    expect(red.llamadas, 'se preguntó por el token exactamente una vez').toHaveLength(1)
    sinPeticionesImprevistas(red)
  })

  test('un token con la forma rota ni siquiera sale a la red', async ({ page }) => {
    // Sin ruta declarada para el asistente A PROPÓSITO: si el front preguntara,
    // la petición caería en el comodín y `inesperadas` lo delataría.
    const red = await enrutarEmbudo(page, {})

    await page.goto(`/?token=${TOKEN_MAL_FORMADO}`)

    await expect(page.getByTestId('propuesta-enlace-caducado')).toBeVisible()
    // El control positivo de esta ausencia es el caso de arriba: con un token
    // BIEN formado, `llamadas` vale 1. Aquí vale 0 porque la guarda de forma
    // corta antes de la red, no porque nadie esté mirando.
    expect(red.llamadas, 'un token imposible salió igualmente hacia el servidor').toEqual([])
    sinPeticionesImprevistas(red)
  })
})

test.describe('La banda de continuación de la landing', () => {
  test('ofrece retomar una propuesta a medida y la relee al seguir', async ({ page }) => {
    await sembrarIntencionDePropuesta(page, intencionDePropuesta({ sedes: 2, usuarios: 5 }))
    await sembrarSesionDelAsistente(page)
    const red = await enrutarEmbudo(page, {
      '/assistant/proposal*': (route) => responderJson(route, propuestaViva()),
    })

    await page.goto('/')

    const banda = page.getByTestId('banda-continuacion')
    await expect(banda).toBeVisible()
    // Es un `<aside>` con nombre accesible —complementario—, nunca un modal: quien
    // vuelve a la landing por otra cosa no puede quedarse bloqueado por una
    // decisión que no tomó.
    await expect(page.getByRole('complementary')).toHaveCount(1)

    // La frase cambia ENTERA, no solo el sustantivo: una propuesta a medida no
    // tiene `planCode`, así que la banda no puede nombrar ningún paquete.
    await expect(banda).toContainText('Estabas armando tu propuesta a medida')
    await expect(banda).toContainText('para 2 sedes y 5 personas')

    // Hasta aquí nadie ha preguntado nada al servidor: la banda se decide con lo
    // que hay en este dispositivo.
    expect(red.llamadas).toEqual([])

    await banda.getByRole('button', { name: 'Seguir' }).click()

    // «Seguir» relee ANTES de navegar: sin la relectura, `/planes` se abriría con
    // el asistente en blanco y la banda habría mentido.
    await expect(page).toHaveURL(/\/planes/)
    await expect(encabezadoDePropuesta(page)).toBeVisible()
    await expect(page.getByTestId(`propuesta-linea-${CODIGO_AGENDA}`)).toBeVisible()
    expect(red.llamadas).toHaveLength(1)
    sinPeticionesImprevistas(red)
  })

  test('sin el token de ESA propuesta en este dispositivo, no promete nada', async ({ page }) => {
    // La intención apunta a `p-1` y el espejo guarda `p-9`: el almacenamiento se
    // lee bien —hay una sesión válida dentro— y aun así `conocePropuesta('p-1')`
    // es `false`. Eso separa «no hay espejo» de «el espejo no tiene ESTA», que es
    // justo la diferencia que la guarda existe para notar; una guarda escrita como
    // «¿hay alguna sesión?» pintaría la banda igualmente y prometería retomar una
    // propuesta que este navegador ya no puede releer.
    await sembrarIntencionDePropuesta(page, intencionDePropuesta({ propuestaId: 'p-1' }))
    await sembrarSesionDelAsistente(page, { id: 'p-9' })
    const red = await enrutarEmbudo(page, {})

    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 2, name: 'Combinaciones que se piden mucho' }),
    ).toBeVisible()

    await expect(page.getByTestId('banda-continuacion')).toHaveCount(0)
    expect(red.llamadas).toEqual([])
    sinPeticionesImprevistas(red)
  })
})

test.describe('Editar las líneas a mano', () => {
  test('las cifras son las del servidor: importe unitario con su multiplicador', async ({
    page,
  }) => {
    const red = await enrutarEmbudo(page, {
      '/assistant/proposal*': (route) => responderJson(route, propuestaViva()),
    })
    await page.goto(`/?token=${TOKEN_VIVO}`)
    await expect(encabezadoDePropuesta(page)).toBeVisible()

    const capacidad = page.getByTestId(`propuesta-linea-${CODIGO_USUARIOS_EXTRA}`)
    // LAS DOS CIFRAS, por separado. `unitAmount` es el precio de UNA persona, así
    // que 12.000 sin el «× 4» al lado no explica los 48.000 que aporta al
    // subtotal — y una mutación que dejara la cantidad en 1, o que restara lo
    // incluido, seguiría pintando exactamente los mismos 12.000.
    await expect(capacidad.getByTestId('propuesta-linea-cantidad')).toHaveText('× 4')
    await expect(capacidad.getByTestId('propuesta-linea-importe')).toHaveText(dineroAlMes('12.000'))

    // El núcleo lleva UNA unidad, y entonces el multiplicador NO se pinta: un
    // «× 1» en cada fila es ruido que se aprende a ignorar, y el día que apareciera
    // un «× 4» de verdad ya no se leería.
    const nucleo = page.getByTestId(`propuesta-linea-${CODIGO_NUCLEO}`)
    await expect(nucleo.getByTestId('propuesta-linea-cantidad')).toHaveCount(0)
    await expect(nucleo.getByTestId('propuesta-linea-importe')).toHaveText(dineroAlMes('89.000'))

    // Los totales, los tres, tal como los mandó el servidor:
    // 89.000 + 39.000 + 4 × 12.000 = 176.000, con 19 % encima.
    await expect(page.getByTestId('propuesta-subtotal')).toHaveText(dinero('176.000'))
    await expect(page.getByTestId('propuesta-impuesto')).toHaveText(dinero('33.440'))
    await expect(page.getByTestId('propuesta-total')).toHaveText(dinero('209.440'))

    // Y el primer mes, que es la cifra que sostiene «Prueba gratis. Sin tarjeta.»:
    // núcleo y agenda van de prueba, las cuatro personas se pagan.
    await expect(page.getByTestId('propuesta-primer-mes')).toHaveText(
      /^\s*Los primeros días pagarías \$\s?48\.000: el resto va de prueba\.\s*$/,
    )

    sinPeticionesImprevistas(red)
  })

  test('quitar una línea manda el delta y adopta los importes que vuelven', async ({ page }) => {
    const cuerpos: EditProposalLinesRequest[] = []
    const red = await enrutarEmbudo(page, {
      '/assistant/proposal*': (route) => responderJson(route, propuestaViva()),
      '/assistant/proposal/lines*': (route) => {
        cuerpos.push(cuerpoDe<EditProposalLinesRequest>(route))
        return responderJson(route, propuestaSinCapacidad())
      },
    })
    await page.goto(`/?token=${TOKEN_VIVO}`)
    await expect(encabezadoDePropuesta(page)).toBeVisible()

    await page.getByRole('button', { name: 'Quitar Usuarios adicionales E2E' }).click()

    await expect(page.getByTestId(`propuesta-linea-${CODIGO_USUARIOS_EXTRA}`)).toHaveCount(0)

    // LO QUE VIAJÓ. El contrato quiere un DELTA y no el carrito entero, y la
    // versión es lo que permite aplicarlo sin adivinar: sin ella, un refinamiento
    // en vuelo pisaría esta edición y devolvería la línea recién quitada.
    expect(cuerpos).toHaveLength(1)
    expect(elemento(cuerpos, 0, 'los cuerpos de PUT /lines')).toEqual({
      token: TOKEN_VIVO,
      addedCodes: [],
      removedCodes: [CODIGO_USUARIOS_EXTRA],
      version: VERSION_INICIAL,
    })

    // LO QUE VOLVIÓ, adoptado tal cual y sin una sola resta en el cliente.
    await expect(page.getByTestId('propuesta-subtotal')).toHaveText(dinero('128.000'))
    await expect(page.getByTestId('propuesta-impuesto')).toHaveText(dinero('24.320'))
    await expect(page.getByTestId('propuesta-total')).toHaveText(dinero('152.320'))

    // Y el primer mes cae a CERO, que no es lo mismo que «no aplica»: significa
    // que todo el carrito está de prueba y el primer mes no se paga nada. Aplanar
    // los dos borraría justamente la afirmación que hace atractiva la propuesta.
    await expect(page.getByTestId('propuesta-primer-mes')).toHaveText(
      /^\s*Los primeros días pagarías \$\s?0: el resto va de prueba\.\s*$/,
    )

    sinPeticionesImprevistas(red)
  })

  test('añadir un recomendado lo manda como alta y lo mueve al carrito', async ({ page }) => {
    const cuerpos: EditProposalLinesRequest[] = []
    const red = await enrutarEmbudo(page, {
      '/assistant/proposal*': (route) => responderJson(route, propuestaViva()),
      '/assistant/proposal/lines*': (route) => {
        cuerpos.push(cuerpoDe<EditProposalLinesRequest>(route))
        return responderJson(route, propuestaConRecomendado())
      },
    })
    await page.goto(`/?token=${TOKEN_VIVO}`)
    await expect(encabezadoDePropuesta(page)).toBeVisible()

    // Antes de añadirlo NO suma al total: el bloque de recomendados se sirve
    // aparte precisamente para no inflar el carrito con lo que el propio modelo
    // marcó como no pedido.
    await expect(page.getByTestId(`propuesta-linea-${CODIGO_RECOMENDADO}`)).toHaveCount(0)
    await expect(page.getByTestId('propuesta-subtotal')).toHaveText(dinero('176.000'))

    await page
      .getByRole('button', { name: 'Añadir Laboratorio E2E de prueba a tu propuesta' })
      .click()

    await expect(page.getByTestId(`propuesta-linea-${CODIGO_RECOMENDADO}`)).toBeVisible()
    expect(cuerpos).toHaveLength(1)
    expect(elemento(cuerpos, 0, 'los cuerpos de PUT /lines')).toEqual({
      token: TOKEN_VIVO,
      addedCodes: [CODIGO_RECOMENDADO],
      removedCodes: [],
      version: VERSION_INICIAL,
    })

    await expect(page.getByTestId('propuesta-subtotal')).toHaveText(dinero('205.000'))
    await expect(page.getByTestId('propuesta-total')).toHaveText(dinero('243.950'))

    sinPeticionesImprevistas(red)
  })
})

test.describe('El camino determinista — el que corre HOY', () => {
  test('sin acceso al modelo la propuesta sale igual, rotulada como base', async ({ page }) => {
    const cuerpos: GenerateProposalRequest[] = []
    const llaves: (string | undefined)[] = []
    const red = await enrutarEmbudo(page, {
      '/assistant/proposal*': (route) => {
        cuerpos.push(cuerpoDe<GenerateProposalRequest>(route))
        llaves.push(route.request().headers()['idempotency-key'])
        return responderJson(route, propuestaDeterminista())
      },
    })

    await page.goto('/planes')
    await contarleAlAsistente(page)
    await page.getByRole('button', { name: 'Ver mi propuesta' }).click()

    // Sale una PROPUESTA, no un error. `DETERMINISTIC` es un carrito correcto
    // —núcleo, cierre de dependencias y precio por tramos— y presentarlo como
    // fallo dejaría sin comprar a todo el que llega hoy.
    await expect(encabezadoDePropuesta(page)).toBeVisible()
    // El foco salta al resultado: el contenido principal cambió, y sin el salto el
    // lector se queda en el botón sin encontrar lo que acaba de pedir.
    await expect(encabezadoDePropuesta(page)).toBeFocused()

    // Y va rotulado como lo que es. Ni una línea dice «Sugerido»: nadie leyó el
    // texto, así que atribuirle la elección al modelo sería inventarle al usuario
    // un motivo que no existe.
    const chips = page.getByTestId('propuesta-linea-chip')
    await expect(chips).toHaveCount(2)
    await expect(chips.nth(0)).toHaveText('Base')
    await expect(chips.nth(1)).toHaveText('Base')

    // El fixture manda `reason` en la agenda A PROPÓSITO. Una línea `BASE` no
    // pinta motivo, así que si `origenDe` empezara a rotular `IA` lo que el
    // servidor no llamó propuesta, este texto aparecería y esto se pondría rojo.
    await expect(page.getByText(MOTIVO_AGENDA)).toHaveCount(0)

    // ── El bloqueante del embudo ────────────────────────────────────────────
    // Las dos chips «Base» son correctas y NO bastan: están dentro de la tabla,
    // en letra pequeña, y hay que saber qué significan. Encima del carrito, con
    // el encabezado «Tu propuesta» inmediatamente antes, tiene que decirse en
    // una frase que esto NO salió de leer su texto. Sin ella, quien escribió un
    // párrafo sobre su clínica ve el resultado, concluye que se le leyó, no
    // revisa las líneas y contrata módulos que no va a usar — y con el acceso al
    // modelo deshabilitado eso le pasa al 100 % de los que llegan hoy.
    const aviso = page.getByTestId('propuesta-origen-base')
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText('Este es un punto de partida, no una recomendación.')
    await expect(aviso).toContainText('sin leer todavía lo que nos escribiste')

    // `status` y NO `alert`: hay una propuesta y se puede contratar, así que
    // nada ha fallado. Un `alert` cortaría la locución en curso justo después de
    // que el foco acabe de saltar al `<h2>`.
    await expect(aviso).toHaveAttribute('role', 'status')

    // Los importes, también aquí: 89.000 + 39.000, y todo de prueba el primer mes.
    await expect(page.getByTestId('propuesta-subtotal')).toHaveText(dinero('128.000'))
    await expect(page.getByTestId('propuesta-total')).toHaveText(dinero('152.320'))

    // Lo que se le mandó al servidor: el texto del prospecto y las DOS aceptaciones
    // legales. Se guardan, no solo se validan — el texto libre viaja a un encargado
    // en EE. UU. y el literal a) del artículo 26 exige que la autorización diga a
    // dónde.
    expect(cuerpos).toHaveLength(1)
    const enviado = elemento(cuerpos, 0, 'los cuerpos de POST /assistant/proposal')
    expect(enviado.email).toBe('e2e@vetsoftware.invalid')
    expect(enviado.description).toContain('Clínica veterinaria E2E de prueba')
    expect(enviado.acceptances).toHaveLength(2)

    // La llave de idempotencia viaja en CABECERA: es lo que hace que un doble clic
    // no pague dos invocaciones al modelo ni cree dos propuestas huérfanas que
    // consumen cupo.
    expect(exigir(llaves[0], 'una llave de idempotencia en la cabecera de la petición')).not.toBe(
      '',
    )

    sinPeticionesImprevistas(red)
  })

  /**
   * ── CONTROL POSITIVO del aviso de origen ──────────────────────────────────
   *
   * <p>El caso de arriba afirma que el aviso ESTÁ; este afirma que NO está
   * cuando el servidor sí leyó el texto. Las dos mitades son necesarias y por el
   * motivo de siempre: un aviso pintado incondicionalmente pasaría el caso de
   * arriba en verde y estaría mintiéndole a quien SÍ recibió una recomendación,
   * que es la única persona a la que este embudo puede decirle «lo armamos con
   * lo que nos contaste». Un banner que sale siempre se aprende a ignorar en dos
   * visitas, y entonces deja de proteger al 100 % de hoy.
   *
   * <p>El recorrido es idéntico al de arriba **carácter por carácter** salvo la
   * respuesta del servidor: lo único que cambia es `presentation`, que es
   * exactamente la variable de la que este aviso debe depender.
   */
  test('con el modelo leyendo el texto, el aviso de «punto de partida» NO se pinta', async ({
    page,
  }) => {
    const red = await enrutarEmbudo(page, {
      '/assistant/proposal*': (route) => responderJson(route, propuestaViva()),
    })

    await page.goto('/planes')
    await contarleAlAsistente(page)
    await page.getByRole('button', { name: 'Ver mi propuesta' }).click()

    // Se espera al MONTAJE de la propuesta antes de afirmar la ausencia: antes de
    // que el panel pinte no hay ningún banner, así que `toHaveCount(0)` pasaría
    // sin que nada se hubiera decidido. Es la trampa clásica de afirmar sobre lo
    // que no está, y la razón de que esta línea vaya primero.
    await expect(encabezadoDePropuesta(page)).toBeVisible()
    await expect(page.getByTestId('propuesta-origen-base')).toHaveCount(0)

    // Y la otra mitad, que demuestra que ESTA respuesta sí es la del camino con
    // modelo: las líneas van rotuladas y el motivo que el servidor escribió se
    // pinta. Sin esto, un fixture mal montado daría el mismo verde por no haber
    // llegado nunca a la rama que se quería probar.
    await expect(page.getByText(MOTIVO_AGENDA)).toBeVisible()

    sinPeticionesImprevistas(red)
  })
})
