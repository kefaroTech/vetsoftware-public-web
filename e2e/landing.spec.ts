import { expect, test, type Locator, type Page } from '@playwright/test'
import { enrutarEmbudoPublico } from './helpers/catalogo'
import { CLAVE_INTENCION, intencion, leerIntencion, sembrarIntencion } from './helpers/contratacion'
import { exigir } from './helpers/exigir'

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
