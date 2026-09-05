import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  catalogoDe,
  enrutarEmbudoPublico,
  RUTAS_DEL_EMBUDO,
  subtotalDeSeleccion,
} from './helpers/catalogo'
import { CLAVE_INTENCION, intencion, leerIntencion, sembrarIntencion } from './helpers/contratacion'
import { exigir } from './helpers/exigir'
import {
  EJEMPLO_DE_NEGOCIO,
  SELECCION_POR_DEFECTO,
} from '../src/features/landing/content/cotizador.content'

/**
 * La landing comercial y el paso 2 del embudo (`/planes`).
 *
 * ── Por qué esta suite no necesita backend, ni sesión, ni credenciales ─────
 * Porque la frontera HTTP está simulada en `helpers/catalogo.ts`. La portada
 * pide `GET /plans`, `GET /catalog` y `POST /quotes/preview` —el precio lo
 * calcula el servidor, decisión D5, y no este front—, así que sin doble no monta
 * con datos. Lo que se sustituye es la respuesta; router, guardas, stores, seams
 * y componentes son los de producción, así que estos casos corren en cualquier
 * máquina sin `E2E_PASSWORD` ni base de datos, y fallan **solo** cuando cambia
 * la aplicación.
 *
 * ── Qué sujeta, y contra qué defecto concreto ──────────────────────────────
 * La instantánea ARIA de `<section id="planes">` es regresión de SEMÁNTICA, no
 * de píxeles. El defecto que persigue está documentado y ya ocurrió una vez: la
 * tarjeta de plan envuelta en un `RouterLink`, cuyo nombre accesible pasa a ser
 * la concatenación del título, el precio, los cinco puntos y el CTA — un
 * párrafo entero leído como si fuera el rótulo de un botón. Una captura de
 * píxeles de esa versión sale IDÉNTICA: el cambio es invisible a la vista y
 * demoledor al oído.
 *
 * ── Lo que los casos de ancla protegen, que no es el rótulo ────────────────
 * Los tres enlaces de esta página que apuntan a una sección propia mueven el
 * FOCO además del scroll (`irAAncla`). Con solo el hash el navegador desplaza la
 * vista y deja el foco en el `<body>`, de modo que la siguiente tabulación
 * devuelve a la barra de navegación: §2.4.3 roto por omisión, invisible con el
 * ratón. Los rótulos han cambiado dos veces ya; la afirmación de foco es lo que
 * no puede perderse al reescribirlos.
 */

/** El texto del `<title>` de cada ruta, tal como lo declara `meta.title`. */
const TITULO_LANDING = 'Lumbre — Software para clínicas veterinarias en Colombia'
const TITULO_PLANES = 'Planes y precios — Lumbre'

/**
 * El `<h1>` de `/planes`, que NO es su `<title>`: son dos textos distintos y los
 * dos correctos, y confundirlos es lo que hace que un caso afirme el de la
 * pestaña creyendo que afirma el de la pantalla.
 */
const H1_PLANES = 'Esto es lo que te armamos'

/**
 * El rótulo del único control de cada tarjeta de combinación.
 *
 * <p>Nombra el plan, que es lo que `landing-comercial-y-contratacion.md:826`
 * pide por escrito. El texto visible y el nombre accesible son el mismo, así que
 * §2.5.3 Label in Name se cumple sin `aria-label`, y el `aria-describedby` al
 * `<h3>` se conserva porque sigue siendo lo que da contexto en la lista de
 * enlaces.
 */
function ctaDe(nombre: string): string {
  return `Marcar los de ${nombre}`
}

/** Las tres combinaciones publicadas, por el nombre que enseña su `<h3>`. */
const COMBINACIONES = ['Pack Spa', 'Pack Clínica', 'Pack Clínica completa'] as const

function tarjeta(page: Page, nombre: string): Locator {
  return page
    .locator('#planes')
    .getByTestId('plan-card')
    .filter({
      has: page.getByRole('heading', { level: 3, name: nombre, exact: true }),
    })
}

/**
 * El texto del elemento que DESCRIBE a un control.
 *
 * <p>Se resuelve el `aria-describedby` de verdad en vez de comprobar que el
 * atributo existe: un identificador que no apunta a nada se lee igual de bien en
 * el marcado y no describe nada en el lector.
 */
async function descripcionDe(page: Page, control: Locator): Promise<string> {
  const id = await control.getAttribute('aria-describedby')
  expect(id, 'el control tiene que estar descrito por algo').toBeTruthy()
  return (await page.locator(`#${id}`).textContent())?.trim() ?? ''
}

test.beforeEach(async ({ page }) => {
  await enrutarEmbudoPublico(page)
})

/**
 * Un relato que menciona tres módulos de TRES áreas distintas, y ninguno de la
 * cuarta.
 *
 * <p>Las tres son deliberadas: con los tres en la misma área no se podría
 * distinguir «se abren las áreas con detección» de «se abre la primera», que es
 * lo que la portada hacía antes y sigue haciendo cuando no reconoce nada.
 *
 * <p>`guardería` → spa · `vendemos` → caja · `alimento` → inventario. Hospital y
 * quirófano se queda fuera, y es el área que prueba que no se abren las cuatro.
 */
const RELATO = 'Tenemos guardería y vendemos alimento.'

/** Los tres que {@link RELATO} nombra, por el rótulo que publica el catálogo. */
const DETECTADOS = [
  'Spa, estética y guardería',
  'Caja y ventas',
  'Inventario de productos',
] as const

/**
 * Escribe el relato y espera al REPOSO, no a un reloj.
 *
 * <p>La propuesta se recalcula 500 ms después de la última tecla (`REPOSO_MS`),
 * así que lo que se espera es el estado observable —la región de estado ya
 * dice cuántos módulos propone— y nunca un `waitForTimeout`, que en una máquina
 * cargada se queda corto y en una rápida sobra.
 */
async function contarElNegocio(page: Page, relato: string, cuantos: number): Promise<void> {
  await page.getByLabel('¿Qué hace tu negocio?').fill(relato)
  await expect(page.locator('#cotizador').getByRole('status')).toContainText(
    `te proponemos ${cuantos}`,
  )
}

/** Un rótulo convertido en localizador ANCLADO al principio del nombre accesible. */
function anclado(texto: string): RegExp {
  return new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
}

/**
 * El rótulo con el que el catálogo de prueba publica un código.
 *
 * <p>Se deriva en vez de transcribirse porque los códigos vienen de
 * `SELECCION_POR_DEFECTO`, que es producción: una tabla de rótulos escrita aquí
 * seguiría verde el día que el catálogo renombre un módulo, y el caso que dice
 * «estos cuatro llegan marcados» pasaría a mirar otra fila.
 */
function rotuloDe(code: string): string {
  const articulo = catalogoDe('MENSUAL').articulos.find((a) => a.code === code)
  return exigir(articulo, `el módulo «${code}» en el catálogo de prueba`).nombre
}

/**
 * La casilla de un módulo, por el principio de su nombre accesible.
 *
 * <p>Anclado y no exacto: la fila lleva la descripción del módulo debajo del
 * nombre y, cuando el relato lo menciona, también la nota; en `/planes` lleva
 * además el precio. Las tres entran en el nombre accesible, que es lo correcto
 * —es lo que hace falta oír para decidir— y lo que deja sin valer a un
 * localizador por nombre exacto.
 */
function casillaDe(page: Page, code: string): Locator {
  return page.getByRole('checkbox', { name: anclado(rotuloDe(code)) })
}

/**
 * Lo que suma una selección con el IVA dentro, derivado del mismo catálogo que
 * sirve la ruta simulada.
 *
 * <p>Una cifra escrita a mano rompería estos casos el día que cualquier precio
 * del doble cambie, por un motivo que no tiene nada que ver con lo que dicen
 * comprobar. Y el producto único basta en vez del redondeo por línea del
 * servidor porque todo este catálogo tributa al 19 % y sus importes son
 * múltiplos de mil, así que no hay decimales que separar.
 */
function totalConIva(modulos: readonly string[]): number {
  return Math.round(subtotalDeSeleccion({ modulos, sedes: 1, usuarios: 1 }, 'MENSUAL') * 1.19)
}

/**
 * La cifra que el carril PINTA, en pesos.
 *
 * <p>Se lee del bloque de precio y no de la región viva: las dos publican el
 * mismo importe, pero la región viva solo existe después de marcar algo, así
 * que un caso que la leyera no podría afirmar nada del primer momento.
 */
async function totalDelCarril(page: Page): Promise<number> {
  const texto = (await page.locator('#cotizador').textContent()) ?? ''
  const cifra = /desde\s*\$\s*([\d.]+)\s*al mes, IVA incluido \(19 %\)/.exec(texto)
  expect(cifra, `el carril no está pintando ningún total: «${texto}»`).not.toBeNull()
  return Number(exigir(cifra, 'la cifra del carril')[1]?.replace(/\D/g, ''))
}

test.describe('Landing comercial', () => {
  test('el primer elemento tabulable es el enlace de salto, y salta de verdad', async ({
    page,
  }) => {
    await page.goto('/')

    // §2.4.1 Bypass Blocks. El enlace existe fuera de pantalla y solo aparece al
    // recibir el foco, así que la única forma honesta de comprobarlo es tabular.
    // Antes hay que esperar a que la SPA monte: si no, la tabulación cae en el
    // contenedor vacío.
    const salto = page.getByRole('link', { name: 'Saltar al contenido' })
    await expect(salto).toBeAttached()
    await page.keyboard.press('Tab')
    await expect(salto).toBeFocused()
    await expect(salto).toBeVisible()

    await page.keyboard.press('Enter')
    // Lo que hace útil al enlace no es el scroll: es que el foco se mueva. Con
    // solo el hash, la siguiente tabulación devolvería a la barra de navegación.
    await expect(page.getByRole('main')).toBeFocused()
  })

  test('el título del documento identifica cada ruta', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(TITULO_LANDING)

    // `/planes` se comprueba entrando por la URL y no pulsando: desde la portada
    // no hay ningún enlace que navegue allí sin llevar consulta —los dos primeros
    // de la barra superior son anclas de esta misma página— y los tres que sí
    // navegan aterrizan en `/planes?plan=…`, que es otra URL.
    await page.goto('/planes')
    await expect(page).toHaveTitle(TITULO_PLANES)
  })

  test('los dos enlaces de la barra superior anclan en esta página y llevan el foco', async ({
    page,
  }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Principal' })

    // El destino se AFIRMA, no se usa para localizar: si alguien convierte uno de
    // estos en un `RouterLink`, lo que se lee es «el href dejó de ser #planes» y
    // no «no encuentro el enlace», que no señalaría a la causa.
    for (const [rotulo, ancla] of [
      ['Paquetes', 'planes'],
      ['Preguntas', 'preguntas'],
    ] as const) {
      const enlace = nav.getByRole('link', { name: rotulo })
      await expect(enlace).toHaveAttribute('href', `#${ancla}`)
      await enlace.click()

      // No navega: el destino está debajo, y quien está leyendo la landing no
      // tiene por qué pagar una carga entera para ver una sección que ya tiene.
      await expect(page).toHaveURL(/\/$/)
      await expect(page.locator(`#${ancla}`)).toBeFocused()
    }
  })

  test('el cierre sube al cotizador, y le lleva el foco', async ({ page }) => {
    await page.goto('/')

    // El cierre tiene UN solo control y es el mismo camino que el hero: quien
    // leyó la página entera no necesita volver arriba a buscarlo.
    const volver = page.getByRole('link', { name: 'Armar mi propuesta' })
    await expect(volver).toHaveAttribute('href', '#cotizador')
    await volver.click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('#cotizador')).toBeFocused()
  })

  test('cada tarjeta nombra su plan en el rótulo y lo repite en la descripción', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('#planes')).toBeVisible()

    // §2.4.4 Link Purpose (In Context) y §2.5.3 Label in Name a la vez. El
    // nombre del plan va en el TEXTO VISIBLE, no en un `aria-label`: ponerlo
    // solo en el atributo dejaría el nombre accesible sin el texto visible y
    // rompería §2.5.3. El `aria-describedby` al `<h3>` sigue puesto porque el
    // rótulo por sí solo no dice qué módulos entran.
    const nombresAccesibles: string[] = []
    for (const nombre of COMBINACIONES) {
      const cta = tarjeta(page, nombre).getByRole('link')
      await expect(cta).toHaveCount(1)
      await expect(cta).toHaveAccessibleName(ctaDe(nombre))
      expect(await descripcionDe(page, cta)).toBe(nombre)
      nombresAccesibles.push(ctaDe(nombre))
    }

    // Lo que el rótulo compartido costaba: en la lista de enlaces del lector las
    // tres entradas eran la misma cadena. Si vuelven a coincidir, este aserto es
    // el que lo dice, y no la instantánea —que se regenera sin leerla.
    expect(new Set(nombresAccesibles).size).toBe(COMBINACIONES.length)
  })

  test('la sección de combinaciones conserva su semántica', async ({ page }) => {
    await page.goto('/')
    const seccion = page.locator('#planes')
    await expect(seccion.getByTestId('plan-card')).toHaveCount(3)

    // ── Las afirmaciones que fallarían HOY si alguien deshiciera el arreglo,
    // escritas aparte de la instantánea. Una instantánea generada se limita a
    // congelar lo que hubiera; esto dice lo que TIENE que haber.
    //
    // El encabezado no puede prometer un paquete cerrado: la unidad de compra es
    // el módulo y estas tarjetas solo marcan varios de golpe. Un rótulo que
    // hablara de paquetes sería la negación literal de «paga solo lo que uses»,
    // que es lo que dice el titular tres pliegues más arriba.
    await expect(
      seccion.getByRole('heading', { level: 2, name: 'Combinaciones que se piden mucho' }),
    ).toBeVisible()

    // UN solo control por tarjeta. Con la tarjeta envuelta en un enlace habría
    // dos, y el de fuera se llamaría «Pack Spa Núcleo, agenda, servicios, spa y
    // caja desde $179.000 + IVA al mes 2 personas incluidas…».
    for (const nombre of COMBINACIONES) {
      await expect(tarjeta(page, nombre).getByRole('link')).toHaveCount(1)
    }

    // Y la instantánea completa, que coge lo que las afirmaciones de arriba no
    // enumeran: un `<h3>` convertido en `<div>`, una lista que deja de serlo,
    // una insignia que pierde su texto.
    await expect(seccion).toMatchAriaSnapshot({ name: 'landing-planes.aria.yml' })
  })

  test('marcar una combinación guarda la intención y lleva a /planes por la URL', async ({
    page,
  }) => {
    await page.goto('/')
    await tarjeta(page, 'Pack Clínica').getByRole('link').click()

    await expect(page).toHaveURL(/\/planes\?plan=PACK_CLINIC&ciclo=MENSUAL$/)

    const leida = await leerIntencion(page)
    expect(leida, 'la elección tiene que sobrevivir al cierre del navegador').not.toBeNull()
    expect(exigir(leida, 'leida').planCode).toBe('PACK_CLINIC')
    // Sin módulos, y eso ES la rama del paquete: la tarjeta ofrece la
    // combinación entera, no casillas. Guardar aquí los componentes haría que el
    // paso vinculante mandara el paquete Y sus piezas, que el servidor rechaza
    // con un cuerpo que no dice cuál sobró.
    expect(exigir(leida, 'leida').modulos).toEqual([])
    // El importe que se VIO viaja con la elección: es la mitad de la regla de
    // «se confirma el importe que se mostró» (§5, caso 3).
    expect(exigir(leida, 'leida').importeVistoMensual).toBeGreaterThan(0)
  })

  test('con una intención vigente ofrece seguir donde lo dejó', async ({ page }) => {
    await sembrarIntencion(page, intencion())
    await page.goto('/')

    const banda = page.getByRole('complementary').filter({ hasText: 'Estabas mirando el plan' })
    await expect(banda).toContainText('Pack Clínica')

    await banda.getByRole('button', { name: 'Seguir' }).click()
    await expect(page).toHaveURL(/\/planes\?plan=PACK_CLINIC&ciclo=MENSUAL$/)
  })

  test('«Empezar de nuevo» borra el espejo y no deja la banda puesta', async ({ page }) => {
    await sembrarIntencion(page, intencion())
    await page.goto('/')

    await page.getByRole('button', { name: 'Empezar de nuevo' }).click()

    await expect(
      page.getByRole('complementary').filter({ hasText: 'Estabas mirando el plan' }),
    ).toHaveCount(0)
    expect(
      await page.evaluate((clave) => window.localStorage.getItem(clave), CLAVE_INTENCION),
    ).toBeNull()
  })

  test('una intención caducada no reaparece: se limpia al hidratar', async ({ page }) => {
    // 31 días: el tope son 30 (`INTENCION_MAX_DIAS`). El precio de hace un mes
    // ya no vale, y arrastrarlo sería peor que perderlo.
    const hace31Dias = new Date(Date.now() - 31 * 86_400_000).toISOString()
    await sembrarIntencion(page, intencion({ creadaEn: hace31Dias }))
    await page.goto('/')

    // Se espera al MONTAJE antes de afirmar una ausencia: antes de que la SPA
    // pinte no hay ningún `aside`, así que `toHaveCount(0)` pasaría sin que la
    // limpieza se hubiera ejecutado y la prueba diría verde por el motivo
    // equivocado. Es la trampa clásica de afirmar sobre lo que no está.
    await expect(page.locator('#planes')).toBeVisible()

    await expect(
      page.getByRole('complementary').filter({ hasText: 'Estabas mirando el plan' }),
    ).toHaveCount(0)
    expect(
      await page.evaluate((clave) => window.localStorage.getItem(clave), CLAVE_INTENCION),
    ).toBeNull()
  })
})

/**
 * La tarjeta del cotizador de la portada: llega con un ejemplo escrito en el
 * campo, con cuatro casillas ya marcadas y con el total que suman, y ese total
 * no se le pide a nadie —lo calcula el navegador con el catálogo que ya bajó—.
 *
 * ── Por qué el premarcado se prueba por sus dos condiciones, y no por sí mismo ─
 * `content/cotizador.content.ts` deja escrito que la lista solo es defendible
 * mientras haya SALIDA SIN COSTE y DIVULGACIÓN PROACTIVA. Por eso lo que
 * afirman estos casos no es «vienen cuatro marcadas» a secas, sino que se ven
 * sin abrir nada, que se quitan de un clic, que el total y lo que queda fuera
 * están en pantalla desde el primer momento, y que nada de esto se respalda con
 * una popularidad que no está medida.
 */
test.describe('El cotizador de la portada', () => {
  test('el ejemplo llega sembrado como valor, se puede reescribir, y la instrucción no se va con él', async ({
    page,
  }) => {
    await page.goto('/')
    const campo = page.getByLabel('¿Qué hace tu negocio?')

    // El ejemplo es el VALOR del campo y no su `placeholder`. Se afirma contra
    // la constante de producción y no contra una copia: el ejemplo va emparejado
    // con el conjunto premarcado y se reescribe con él, así que una
    // transcripción aquí pondría este caso rojo por el texto y no por la
    // pantalla.
    await expect(campo).toHaveValue(EJEMPLO_DE_NEGOCIO)
    expect(
      await campo.getAttribute('placeholder'),
      'el ejemplo ya no va en el placeholder, que desaparece al primer carácter',
    ).toBeNull()

    // §3.3.2 Labels or Instructions. La indicación que sobrevive a lo que se
    // escriba es la de fuera, y se resuelve el `aria-describedby` de verdad: un
    // identificador que no apunta a nada se lee igual de bien en el marcado y no
    // describe nada.
    const ayuda = page.locator(
      `#${exigir(await campo.getAttribute('aria-describedby'), 'la ayuda del campo')}`,
    )
    await expect(ayuda).toBeVisible()
    await expect(ayuda).toContainText('escríbelo con tus palabras')

    // Sembrado no es de solo lectura, y eso es lo que separa un ejemplo de un
    // relato impuesto: se reescribe entero y lo que queda es lo del visitante.
    await contarElNegocio(page, RELATO, 3)
    await expect(campo).toHaveValue(RELATO)
    await expect(ayuda).toBeVisible()
  })

  test('llega con los cuatro módulos premarcados, y con nada más', async ({ page }) => {
    await page.goto('/')

    for (const code of SELECCION_POR_DEFECTO) {
      await expect(casillaDe(page, code), `«${rotuloDe(code)}»`).toBeChecked()
    }

    // Premarcar no es detectar. La nota explica una marca que salió del texto
    // del visitante, y aquí todavía no hay texto suyo: si apareciera, la
    // pantalla estaría atribuyéndole al prospecto una decisión de la casa.
    await expect(page.locator('#cotizador')).not.toContainText('Porque lo mencionaste')

    // La facturación electrónica se queda fuera a propósito: es el único módulo
    // sin prueba gratis, así que premarcarla cobraría desde el primer día por
    // algo que nadie marcó.
    await expect(casillaDe(page, 'ELECTRONIC_INVOICING')).not.toBeChecked()

    // Y nada más marcado. Se cuenta por las insignias de las cuatro áreas
    // porque son lo único que cuenta también los módulos de un área plegada,
    // que no están en el documento.
    for (const [area, insignia] of [
      ['Atención a las mascotas', '3 de 4 módulos marcados'],
      ['Hospital y quirófano', 'ninguno de 3 módulos marcados'],
      ['Mostrador y dinero', '1 de 4 módulos marcados'],
      ['Inventario y compras', 'ninguno de 2 módulos marcados'],
    ] as const) {
      await expect(
        page.getByRole('button', { name: anclado(area) }),
        `el área «${area}»`,
      ).toHaveAccessibleName(`${area} ${insignia}`)
    }

    await expect(page.locator('#cotizador')).toContainText('Clientes y mascotas + 4 módulos')
  })

  test('las áreas que traen un premarcado llegan abiertas, y solo esas', async ({ page }) => {
    await page.goto('/')

    for (const [area, abierta] of [
      ['Atención a las mascotas', 'true'],
      ['Mostrador y dinero', 'true'],
      ['Hospital y quirófano', 'false'],
      ['Inventario y compras', 'false'],
    ] as const) {
      await expect(
        page.getByRole('button', { name: anclado(area) }),
        `el área «${area}»`,
      ).toHaveAttribute('aria-expanded', abierta)
    }

    // La condición que hace defendible el premarcado: si la portada marca algo
    // que se cobra, tiene que verse sin abrir nada. Un módulo premarcado dentro
    // de un área plegada es un cargo que nadie llegó a ver.
    const caja = casillaDe(page, 'CASH_REGISTER')
    await expect(caja).toBeVisible()
    await expect(caja).toBeChecked()
  })

  test('el total ya está en pantalla antes de escribir nada, y se mueve con lo que se quita', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('#cotizador')).toContainText('Clientes y mascotas + 4 módulos')

    // La otra condición del premarcado: sin cifra el comprador subestima lo que
    // va a pagar y ya no revisa la decisión cuando el importe aparece al final
    // del embudo, y con casillas puestas de antemano eso es cobrar sin decir
    // cuánto. El «no pagas los otros» es la misma divulgación por el otro lado.
    expect(await totalDelCarril(page)).toBe(totalConIva(SELECCION_POR_DEFECTO))
    await expect(page.locator('#cotizador')).toContainText('No pagas los otros')

    // Y la salida sin coste, medida donde se nota: un clic, sin confirmación, y
    // el total baja de verdad. Un total premarcado que no reacciona al quitar es
    // el mismo defecto que no tener total.
    const restantes = SELECCION_POR_DEFECTO.filter((code) => code !== 'CASH_REGISTER')
    await casillaDe(page, 'CASH_REGISTER').uncheck()
    await expect(page.locator('#cotizador')).toContainText('Clientes y mascotas + 3 módulos')
    expect(await totalDelCarril(page)).toBe(totalConIva(restantes))
  })

  test('no afirma que esto sea lo que más se elige', async ({ page }) => {
    await page.goto('/')
    const cotizador = page.locator('#cotizador')

    // El rótulo dice de dónde sale la selección sin respaldarla con una
    // popularidad que nadie ha medido: el art. 30 de la Ley 1480 exige que lo
    // que se afirma en publicidad sea verificable.
    await expect(cotizador).toContainText('Un punto de partida: cámbialo a tu gusto')
    await expect(cotizador).not.toContainText(/eligen|popular|la mayoría|más elegid/i)

    // La insignia de las tarjetas de paquete SÍ dice «La que más eligen», sale
    // de `recommended` y no se tocó. Va aquí porque sin ella el aserto de arriba
    // pasaría igual el día que alguien lo borrara todo, y porque es lo que
    // distingue «esta afirmación no está en la portada» de «no está en ninguna».
    await expect(page.locator('#planes')).toContainText('La que más eligen')

    // Y el rótulo se retira en cuanto lo marcado deja de ser lo que la pantalla
    // ofreció: a partir de ahí la selección es del visitante, y seguir
    // llamándola punto de partida describiría otra cosa.
    await casillaDe(page, 'CASH_REGISTER').uncheck()
    await expect(cotizador).not.toContainText('Un punto de partida')
  })

  test('la región de estado está en el documento antes de tener nada que decir', async ({
    page,
  }) => {
    await page.goto('/')

    // §4.1.3. Una región viva que NACE junto con su contenido no se anuncia en
    // varios lectores: tiene que estar puesta y vacía, y llenarse después.
    const estado = page.locator('#cotizador [role="status"]')
    await expect(estado).toBeAttached()
    await expect(estado).toHaveText('')

    await contarElNegocio(page, RELATO, 3)
    await expect(estado).toContainText('Con eso te proponemos 3 módulos')
  })

  test('el relato marca los módulos que nombra, dice por qué, y abre solo esas áreas', async ({
    page,
  }) => {
    await page.goto('/')
    await contarElNegocio(page, RELATO, 3)

    for (const nombre of DETECTADOS) {
      // La nota va DENTRO del `<label>`, así que entra en el nombre accesible de
      // la casilla: «Spa, estética y guardería Porque lo mencionaste» es lo que
      // hace falta oír para saber por qué está marcada algo que uno no marcó.
      const casilla = page.getByRole('checkbox', { name: new RegExp(`^${nombre}`) })
      await expect(casilla).toBeChecked()
      await expect(casilla).toHaveAccessibleName(`${nombre} Porque lo mencionaste`)
    }

    // Un módulo del área abierta que el relato NO nombra: ni marcado ni con
    // nota. Sin esto, la nota podría estar en las trece filas y el caso pasaría.
    const noMencionado = page.getByRole('checkbox', { name: 'Tarifas y promociones' })
    await expect(noMencionado).not.toBeChecked()
    await expect(noMencionado).toHaveAccessibleName('Tarifas y promociones')

    // Reescribir el relato SUSTITUYE al premarcado sobre lo que nadie tocó, no
    // se le suma: si se sumaran, quien se molesta en describir su negocio
    // acabaría con siete módulos, cuatro de ellos sin nombrar.
    await expect(casillaDe(page, 'CLINICAL_HISTORY')).not.toBeChecked()

    // Se abren las áreas con alguna marca que el visitante NO hizo, y solo
    // esas: abrir las cuatro son trece paradas de tabulación antes del CTA. Esas
    // marcas son de dos procedencias —la detección y el premarcado—, pero el
    // premarcado solo cuenta en la primera pintada; aquí, con relato escrito,
    // manda la detección sola, y por eso «Mostrador y dinero» sigue abierta por
    // «Caja y ventas» y no por haber venido premarcada, e «Inventario y compras»
    // se abre ahora sin traer ningún premarcado.
    for (const [area, abierta] of [
      ['Atención a las mascotas', 'true'],
      ['Mostrador y dinero', 'true'],
      ['Inventario y compras', 'true'],
      ['Hospital y quirófano', 'false'],
    ] as const) {
      await expect(
        page.getByRole('button', { name: anclado(area) }),
        `el área «${area}»`,
      ).toHaveAttribute('aria-expanded', abierta)
    }

    // El eco del carril, que es lo mismo dicho donde está el botón. No lleva
    // región viva propia a propósito: dos locuciones por un gesto se pisan.
    await expect(page.locator('#cotizador')).toContainText('Clientes y mascotas + 3 módulos')
  })

  test('sin nada reconocible lo dice, y deja el camino abierto igual', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('¿Qué hace tu negocio?').fill('Somos tres socios y abrimos hace poco.')
    const estado = page.locator('#cotizador [role="status"]')
    await expect(estado).toContainText('No reconocimos ningún módulo en tu texto')
    await expect(estado).toContainText('Abre el área que te interese y marca lo que uses')

    // No reconocer no es un error y no cierra la puerta: el mismo campo, más
    // grande y con su contexto, espera en el destino.
    await page.getByRole('button', { name: 'Ver propuesta' }).click()
    await expect(page).toHaveURL(/\/planes$/)
  })

  test('«Ver propuesta» envía el formulario y el relato viaja a /planes', async ({ page }) => {
    await page.goto('/')
    await contarElNegocio(page, RELATO, 3)

    await page.getByRole('button', { name: 'Ver propuesta' }).click()
    await expect(page).toHaveURL(/\/planes$/)

    // El relato viaja con la selección al paso siguiente: el texto no sale del
    // navegador en la landing (Ley 1581, art. 9 y 26 lit. a), así que si no
    // llegara aquí el prospecto tendría que volver a escribirlo.
    await expect(page.getByLabel('¿A qué se dedica tu negocio?')).toHaveValue(RELATO)
  })

  test('lo que se desmarca en la portada llega desmarcado a /planes, y le gana al recomendado', async ({
    page,
  }) => {
    await page.goto('/')
    const caja = casillaDe(page, 'CASH_REGISTER')
    await expect(caja).toBeChecked()
    await caja.uncheck()

    await page.getByRole('button', { name: 'Ver propuesta' }).click()
    await expect(page).toHaveURL(/\/planes$/)
    await expect(page.getByRole('heading', { level: 1, name: H1_PLANES })).toBeVisible()

    // El paquete recomendado del catálogo son EXACTAMENTE los cuatro
    // premarcados, así que este módulo es lo único que distingue «llegó la
    // selección del visitante» de «se volvió a sembrar el recomendado encima»,
    // que es lo que la pantalla hacía y lo que convertía cualquier ajuste de la
    // portada en un clic perdido.
    //
    // Se lee de las insignias porque `/planes` no premarca nada y por tanto solo
    // llega abierta la primera área: la casilla de «Caja y ventas» ni siquiera
    // está en el documento, y afirmar sobre lo que no está pasaría en verde
    // también con una selección vacía.
    for (const [area, insignia] of [
      ['Atención a las mascotas', '3 de 4 módulos marcados'],
      ['Mostrador y dinero', 'ninguno de 4 módulos marcados'],
    ] as const) {
      await expect(
        page.getByRole('button', { name: anclado(area) }),
        `el área «${area}»`,
      ).toHaveAccessibleName(`${area} ${insignia}`)
    }

    await page.getByRole('button', { name: anclado('Mostrador y dinero') }).click()
    await expect(casillaDe(page, 'CASH_REGISTER')).not.toBeChecked()
  })

  test('la portada no cotiza, y /planes sí: el cupo por IP llega entero al precio', async ({
    page,
  }) => {
    const cotizar = exigir(RUTAS_DEL_EMBUDO['/quotes/preview'], 'el doble de POST /quotes/preview')
    let cotizaciones = 0
    // Se registra DESPUÉS del `beforeEach`, así que gana: Playwright resuelve la
    // ruta declarada más tarde. Y delega en el doble de verdad para que una
    // llamada indebida no cambie además el comportamiento de la pantalla.
    await page.route('**/api/v1/quotes/preview', async (route) => {
      cotizaciones += 1
      await cotizar(route)
    })

    await page.goto('/')
    await contarElNegocio(page, RELATO, 3)

    // Y encima se toca a mano, que es el gesto que disparaba una cotización por
    // casilla cuando el hero enseñaba una cifra.
    const caja = casillaDe(page, 'CASH_REGISTER')
    await caja.uncheck()
    await caja.check()
    await expect(page.locator('#cotizador')).toContainText('Clientes y mascotas + 3 módulos')

    expect(
      cotizaciones,
      'la portada ya no pinta ninguna cifra: cotizar aquí gastaría el cupo por IP del prospecto ' +
        'antes de que llegue a la pantalla donde el precio sí se decide',
    ).toBe(0)

    // La otra mitad, sin la cual ese cero lo cumpliría también un seam borrado:
    // donde el precio SÍ se enseña, se sigue pidiendo.
    await page.goto('/planes?plan=PACK_CLINIC&ciclo=MENSUAL')
    await expect(page.getByRole('heading', { level: 1, name: H1_PLANES })).toBeVisible()
    await expect
      .poll(() => cotizaciones, { message: '`/planes` tiene que seguir cotizando' })
      .toBeGreaterThan(0)
  })
})

test.describe('/planes — el paso de la propuesta', () => {
  /**
   * El botón vive en el carril del importe y NO se deshabilita: lleva
   * `aria-disabled` para seguir siendo enfocable. Así que esperar a que exista no
   * basta —pulsarlo antes de que llegue el catálogo es un clic que no hace nada
   * y el fallo se leería como «no navegó»—, y lo que se espera es su estado real.
   */
  async function continuar(page: Page): Promise<Locator> {
    const boton = page.getByRole('button', { name: 'Continuar' })
    await expect(boton).not.toHaveAttribute('aria-disabled', 'true')
    return boton
  }

  test('siembra la selección desde la URL y continúa al registro con ella', async ({ page }) => {
    // 3 sedes y 8 personas se pasan de verdad de lo incluido (1 sede, 2
    // personas), así que la cesta lleva sus dos líneas de capacidad.
    await page.goto('/planes?plan=PACK_FULL&ciclo=ANUAL&sedes=3&usuarios=8')

    // El `<h1>` NO es «Planes y precios»: ese es el `<title>` de la ruta, que es
    // otra cosa y sigue siendo correcto —lo afirman `a11y-publicas.spec.ts` y
    // `TITULO_PLANES` aquí arriba—. El de la vista describe lo que se hace aquí,
    // y ya no habla de armar: cuando se llega, lo armado está delante.
    await expect(page.getByRole('heading', { level: 1, name: H1_PLANES })).toBeVisible()

    const sedes = page.getByRole('spinbutton', { name: /sedes/i })
    await expect(sedes).toHaveValue('3')
    const usuarios = page.getByRole('spinbutton', { name: /personas|usuarios/i })
    await expect(usuarios).toHaveValue('8')

    await (await continuar(page)).click()

    await expect(page).toHaveURL(/\/registro\?plan=PACK_FULL&ciclo=ANUAL&sedes=3&usuarios=8$/)
  })

  test('el carril «Tu selección» acompaña al registro', async ({ page }) => {
    await page.goto('/planes?plan=PACK_CLINIC&ciclo=MENSUAL&sedes=2&usuarios=4')
    await (await continuar(page)).click()

    // Lo que evita que el salto de verificación por correo mate la conversión:
    // el prospecto ve durante todo el registro lo que ya eligió.
    const carril = page.getByRole('complementary').filter({ hasText: 'Tu selección' })
    await expect(carril).toContainText('Pack Clínica')
    await expect(carril).toContainText('2 sedes')
    await expect(carril.getByRole('link', { name: 'Cambiar la selección' })).toBeVisible()
  })
})
