import { expect, test, type Page } from '@playwright/test'
import {
  CLAVE_INTENCION,
  intencion,
  leerIntencion,
  sembrarIntencion,
  type Intencion,
} from './helpers/contratacion'

/**
 * La landing comercial y el paso 2 del embudo (`/planes`).
 *
 * ── Por qué esta suite no necesita backend, ni sesión, ni credenciales ─────
 * El catálogo público NO viaja por red: `fetchPlans()` devuelve el contenido de
 * `content/plans.content.ts` (es el «seam» que el día de `GET /plans` cambia de
 * cuerpo y nada más). Así que estos casos corren en cualquier máquina, sin
 * `E2E_PASSWORD` y sin base de datos, y fallan **solo** cuando cambia el
 * marcado. Es la propiedad que hace que valga la pena tenerlos.
 *
 * ── Qué sujeta, y contra qué defecto concreto ──────────────────────────────
 * La instantánea ARIA de `<section id="planes">` es regresión de SEMÁNTICA, no
 * de píxeles. El defecto que persigue está documentado y ya ocurrió una vez: la
 * tarjeta de plan envuelta en un `RouterLink`, cuyo nombre accesible pasa a ser
 * la concatenación del título, el precio, los cinco puntos y el CTA — un
 * párrafo entero leído como si fuera el rótulo de un botón. Una captura de
 * píxeles de esa versión sale IDÉNTICA: el cambio es invisible a la vista y
 * demoledor al oído.
 */

/** El texto del `<title>` de cada ruta, tal como lo declara `meta.title`. */
const TITULO_LANDING = 'VetSoftware — Software para clínicas veterinarias en Colombia'
const TITULO_PLANES = 'Planes y precios — VetSoftware'

/**
 * El CTA del hero, distinguido del CTA final —que se llama IGUAL— por su
 * destino: `#planes` ancla en la misma página, `/planes` navega.
 */
function ctaDelHero(page: Page) {
  return page.getByRole('link', { name: 'Ver los planes' }).and(page.locator('[href="#planes"]'))
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

  test('el título del documento identifica la ruta', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(TITULO_LANDING)

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Planes' })
      .click()
    await expect(page).toHaveURL(/\/planes$/)
    await expect(page).toHaveTitle(TITULO_PLANES)
  })

  test('«Ver los planes» ancla en la misma página y lleva el foco a la sección', async ({
    page,
  }) => {
    await page.goto('/')
    const seccion = page.locator('#planes')
    await expect(seccion).toBeVisible()

    // Hay DOS enlaces llamados «Ver los planes» —el del hero, que ancla en esta
    // misma página, y el del CTA final, que navega a `/planes`—, así que el
    // nombre accesible no basta para distinguirlos y se combina con el destino.
    // (Que dos enlaces compartan nombre y lleven a sitios distintos es en sí un
    // problema de §2.4.4: fuera de contexto no se puede saber a cuál se va.)
    await ctaDelHero(page).click()

    // No navega: el ancla es de la misma página. Si alguien la convierte en
    // `RouterLink`, la URL cambia y esto falla.
    await expect(page).toHaveURL(/\/$/)
    await expect(seccion).toBeFocused()
  })

  test('la sección de planes conserva su semántica', async ({ page }) => {
    await page.goto('/')
    const seccion = page.locator('#planes')
    await expect(seccion.getByTestId('plan-card')).toHaveCount(3)

    // ── Las tres afirmaciones que fallarían HOY si alguien deshiciera el
    // arreglo, escritas aparte de la instantánea. Una instantánea generada se
    // limita a congelar lo que hubiera; esto dice lo que TIENE que haber.
    await expect(seccion.getByRole('heading', { level: 2, name: 'Planes' })).toBeVisible()

    for (const nombre of ['Esencial', 'Clínica', 'Cadena']) {
      const tarjeta = seccion.getByTestId('plan-card').filter({
        has: page.getByRole('heading', { level: 3, name: nombre, exact: true }),
      })
      // UN solo control por tarjeta, y su nombre accesible NOMBRA EL PLAN. Con
      // la tarjeta envuelta en un enlace habría dos, y el de fuera se llamaría
      // «Esencial Para empezar desde $89.000 + IVA al mes 1 sede incluida…».
      await expect(tarjeta.getByRole('link')).toHaveCount(1)
      await expect(tarjeta.getByRole('link')).toHaveAccessibleName(`Empezar con ${nombre}`)
    }

    // Y la instantánea completa, que coge lo que las afirmaciones de arriba no
    // enumeran: un `<h3>` convertido en `<div>`, una lista que deja de serlo,
    // una insignia que pierde su texto.
    await expect(seccion).toMatchAriaSnapshot({ name: 'landing-planes.aria.yml' })
  })

  test('elegir un plan guarda la intención y la lleva a /planes por la URL', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'Empezar con Clínica' }).click()

    await expect(page).toHaveURL(/\/planes\?plan=CLINICA&ciclo=MENSUAL$/)

    const leida = await leerIntencion(page)
    expect(leida, 'la elección tiene que sobrevivir al cierre del navegador').not.toBeNull()
    expect(leida!.planCode).toBe('CLINICA')
    // El importe que se VIO viaja con la elección: es la mitad de la regla de
    // «se confirma el importe que se mostró» (§5, caso 3).
    expect(leida!.importeVistoMensual).toBeGreaterThan(0)
  })

  test('con una intención vigente ofrece seguir donde lo dejó', async ({ page }) => {
    await sembrarIntencion(page, intencion())
    await page.goto('/')

    const banda = page.getByRole('complementary').filter({ hasText: 'Estabas mirando el plan' })
    await expect(banda).toContainText('Clínica')

    await banda.getByRole('button', { name: 'Seguir' }).click()
    await expect(page).toHaveURL(/\/planes\?plan=CLINICA&ciclo=MENSUAL$/)
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

test.describe('/planes — el configurador ligero', () => {
  test('siembra la selección desde la URL y continúa al registro con ella', async ({ page }) => {
    await page.goto('/planes?plan=CADENA&ciclo=ANUAL&sedes=3&usuarios=8')

    await expect(page.getByRole('heading', { level: 1, name: 'Planes y precios' })).toBeVisible()

    const sedes = page.getByRole('spinbutton', { name: /sedes/i })
    await expect(sedes).toHaveValue('3')
    const usuarios = page.getByRole('spinbutton', { name: /personas|usuarios/i })
    await expect(usuarios).toHaveValue('8')

    await page.getByRole('button', { name: /^Continuar con / }).click()

    await expect(page).toHaveURL(/\/registro\?plan=CADENA&ciclo=ANUAL&sedes=3&usuarios=8$/)
  })

  test('el carril «Tu selección» acompaña al registro', async ({ page }) => {
    await page.goto('/planes?plan=CLINICA&ciclo=MENSUAL&sedes=2&usuarios=4')
    await page.getByRole('button', { name: /^Continuar con / }).click()

    // Lo que evita que el salto de verificación por correo mate la conversión:
    // el prospecto ve durante todo el registro lo que ya eligió.
    const carril = page.getByRole('complementary').filter({ hasText: 'Tu selección' })
    await expect(carril).toContainText('Clínica')
    await expect(carril).toContainText('2 sedes')
    await expect(carril.getByRole('link', { name: 'Cambiar la selección' })).toBeVisible()
  })
})
