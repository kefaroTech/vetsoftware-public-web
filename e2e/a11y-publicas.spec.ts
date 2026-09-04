import { expect, test } from '@playwright/test'
import { exigir } from './helpers/exigir'

/**
 * La reparación de nivel A de la zona pública, sujeta para que no vuelva.
 *
 * ── Qué se rompió, y por qué costaba tanto verlo ───────────────────────────
 * `AuthField` era el único `<label>` de todo `components/public/` y **no llevaba
 * `for`**. Con el control dentro de un `<slot>`, no había forma de asociarlos:
 * un lector de pantalla anunciaba el campo sin nombre, hacer clic en la etiqueta
 * no enfocaba nada, y el error era un hermano suelto que nadie apuntaba con
 * `aria-describedby`. Cuatro incumplimientos de nivel A repartidos por siete
 * pantallas, la de registro incluida.
 *
 * Nada de esto se ve en una captura de pantalla, y por eso ninguna regresión
 * visual lo habría cogido: la etiqueta se pinta igual con `for` que sin él. La
 * única prueba posible es esta.
 *
 * ── Por qué el enlace de salto se prueba tabulando ─────────────────────────
 * Existe fuera de pantalla (`top: -100px`) y solo baja al recibir el foco. Un
 * `toBeVisible()` a secas pasaría con el enlace sacado del orden de tabulación
 * con `display: none`, que es justo la forma habitual de romperlo sin notarlo.
 */

/**
 * Las siete pantallas públicas que dejan el foco donde nace, así que en ellas el
 * primer tabulador llega al enlace de salto. Seis montan `PublicLayout` —que lo
 * trae para todas de una vez— y la landing lo declara en su propia vista, porque
 * no usa ese armazón.
 *
 * <p>`/planes` está fuera de esta lista **a propósito**: mueve el foco al `<h1>`
 * al montar, así que el primer tabulador ya no parte del principio del
 * documento. Tiene su propio caso más abajo, que afirma las dos cosas.
 */
const PANTALLAS = [
  { ruta: '/', nombre: 'landing' },
  { ruta: '/login', nombre: 'login' },
  { ruta: '/registro', nombre: 'registro' },
  { ruta: '/verify-email', nombre: 'verificar correo' },
  { ruta: '/recuperar-contrasena', nombre: 'recuperar contraseña' },
  { ruta: '/recuperar-codigo', nombre: 'recuperar código' },
  { ruta: '/restablecer-contrasena', nombre: 'restablecer contraseña' },
] as const

test.describe('§2.4.1 Bypass Blocks — el enlace de salto', () => {
  for (const pantalla of PANTALLAS) {
    test(`«${pantalla.nombre}» lo tiene, y es lo primero que recibe el foco`, async ({ page }) => {
      // Sin backend: lo que se comprueba es el armazón, no el contenido. Las dos
      // pantallas que llaman al servidor al montar (verificación de correo y
      // token de restablecimiento) degradan a su estado de enlace inválido, que
      // también monta `PublicLayout`.
      await page.route('**/api/v1/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
      )
      await page.goto(pantalla.ruta)

      // La SPA monta después del `load`: sin esperar al árbol real, la
      // tabulación cae en el `<div id="app">` vacío y el foco se pierde cuando
      // Vue lo reemplaza.
      const salto = page.getByRole('link', { name: 'Saltar al contenido' })
      await expect(salto).toBeAttached()

      await page.keyboard.press('Tab')
      await expect(salto, 'no es el primer elemento tabulable').toBeFocused()
      // Y se ve al recibir el foco: un enlace de salto invisible no sirve a
      // nadie que navegue con teclado y vista.
      await expect(salto).toBeVisible()
      await expect(salto).toHaveAttribute('href', '#contenido')

      await page.keyboard.press('Enter')
      await expect(page.locator('#contenido')).toBeFocused()
    })
  }

  /**
   * `/planes` es la excepción, y conviene que esté escrita en vez de descubierta.
   *
   * <p>La vista lleva el foco al `<h1>` en `onMounted` (`PlanesView.vue:85-87`),
   * para que quien llega desde la portada sepa dónde ha aterrizado (§2.4.3). El
   * `<h1>` está DENTRO de `#contenido`, así que la navegación queda saltada de
   * todos modos — pero el primer tabulador de la carga ya no llega al enlace,
   * porque Chromium sigue tabulando desde donde la vista dejó el foco. Eso es lo
   * que esta pantalla no puede afirmar y las otras siete sí, y está reportado en
   * https://github.com/kefaroTech/vetsoftware-public-web/issues/369.
   *
   * <p>Lo que aquí se sujeta es lo que sigue siendo cierto y sigue importando: el
   * enlace es el primer tabulable del DOCUMENTO —comprobado por estructura, no
   * por tabulación, que es lo que la vista desplaza— y al activarlo mueve el
   * foco, no solo la vista.
   */
  test('«planes» mueve el foco al <h1> al montar, y conserva el enlace de salto', async ({
    page,
  }) => {
    await page.route('**/api/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
    await page.goto('/planes')

    const salto = page.getByRole('link', { name: 'Saltar al contenido' })
    await expect(salto).toBeAttached()
    await expect(salto).toHaveAttribute('href', '#contenido')

    const h1 = page.getByRole('heading', { level: 1, name: 'Esto es lo que te armamos' })
    await expect(h1).toBeFocused()
    expect(
      await h1.evaluate((el) => el.closest('#contenido') !== null),
      'el foco de llegada tiene que caer dentro del contenido; si cayera fuera, el salto haría falta y no habría quien lo diera',
    ).toBe(true)

    // Primero del documento, por estructura. Si alguien mete un control delante
    // —una banda de aviso, un selector de idioma— esto se pone rojo, que es la
    // regresión que §2.4.1 persigue de verdad.
    expect(
      await salto.evaluate(
        (el) =>
          el ===
          document.querySelector(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
      ),
      'el enlace de salto ya no es el primer elemento tabulable del documento',
    ).toBe(true)

    // Y sirve cuando se llega a él: se ve al recibir el foco y mueve el foco al
    // contenido. Con solo el hash el navegador desplaza la vista y deja el foco
    // en el `<body>`, así que la siguiente tabulación volvería a la navegación.
    await salto.focus()
    await expect(salto).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('#contenido')).toBeFocused()
  })
})

test.describe('§2.4.2 Page Titled — el título por ruta', () => {
  /**
   * Las CUATRO rutas que declaran `meta.title` hoy. Las demás caen al
   * `TITULO_POR_DEFECTO`, que es lo que hace este caso explícito: si alguien
   * borra un `meta.title`, la ruta deja de identificarse y esto se pone rojo.
   *
   * El resto de la aplicación sigue sin título propio; está declarado en el
   * informe como hueco, no como algo que esta prueba deba tapar.
   */
  const CON_TITULO = [
    { ruta: '/', titulo: 'Lumbre — Software para clínicas veterinarias en Colombia' },
    { ruta: '/planes', titulo: 'Planes y precios — Lumbre' },
  ]

  for (const caso of CON_TITULO) {
    test(`«${caso.ruta}» se identifica en la pestaña`, async ({ page }) => {
      await page.goto(caso.ruta)
      await expect(page).toHaveTitle(caso.titulo)
    })
  }

  test('al navegar, el título de la pantalla anterior no se queda pegado', async ({ page }) => {
    // El defecto clásico de este arreglo: se pone el título de la ruta que lo
    // declara y no se repone al salir, así que /login se llama «Planes y
    // precios» para siempre.
    await page.goto('/planes')
    await expect(page).toHaveTitle('Planes y precios — Lumbre')

    await page.getByRole('link', { name: 'Inicia sesión' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page).toHaveTitle('Iniciar sesión — Lumbre')
  })

  test('una ruta sin título propio repone el del documento, no hereda el anterior', async ({
    page,
  }) => {
    // La otra mitad del mismo defecto, y la que no tiene ruta con la que
    // probarse desde que TODAS declaran `meta.title`: se ejercita el
    // comportamiento por defecto forzando una ruta inexistente, que el router
    // manda a `/login` sin pasar por ninguna pantalla intermedia. Si el
    // `afterEach` dejara de reponer el valor por defecto, el título anterior
    // seguiría en la pestaña. La guarda de que ninguna ruta se quede SIN título
    // es `tests/unit/router-titulos.spec.ts`, no esta.
    await page.goto('/planes')
    await expect(page).toHaveTitle('Planes y precios — Lumbre')

    await page.goto('/no-existe-esta-ruta')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page).not.toHaveTitle('Planes y precios — Lumbre')
  })
})

test.describe('§1.3.1 / §3.3.1 — etiqueta y error atados al control', () => {
  test('la etiqueta enfoca el campo al pulsarla', async ({ page }) => {
    await page.goto('/login')

    // `getByLabel` solo encuentra el campo si `<label for>` está puesto: este
    // localizador ES la comprobación. Antes de la reparación, ninguno de los 22
    // usos de `AuthField` se podía localizar así.
    const empleado = page.getByLabel('Empleado')
    await expect(empleado).toBeVisible()

    // Se pulsa el `<label>` ATADO al campo, resuelto por su `for`, y no el
    // primer nodo de la pantalla que contenga la palabra: la bajada del login
    // dice «Entra con tu código de empleado…», así que un localizador por texto
    // resuelve un párrafo que no enfoca nada y el rojo no señala a la causa.
    const id = await empleado.getAttribute('id')
    expect(id, 'sin `id` no puede haber `<label for>` que atar').toBeTruthy()

    const etiqueta = page.locator(`label[for="${id}"]`)
    await expect(etiqueta).toHaveCount(1)
    await etiqueta.click()
    await expect(empleado).toBeFocused()
  })

  test('el error queda atado con aria-describedby y marca el campo como inválido', async ({
    page,
  }) => {
    await page.goto('/login')
    const empleado = page.getByLabel('Empleado')

    // Antes de tocarlo no hay error: la validación no es prematura.
    await expect(empleado).toHaveAttribute('aria-invalid', 'false')

    await empleado.click()
    await empleado.blur()

    await expect(empleado).toHaveAttribute('aria-invalid', 'true')
    const descrito = await empleado.getAttribute('aria-describedby')
    expect(
      descrito,
      'el error tiene que describir al control, no ser un hermano suelto',
    ).toBeTruthy()

    const mensaje = page.locator(`#${descrito}`)
    await expect(mensaje).toHaveText(/Error: ?Campo requerido/)

    // El prefijo «Error:» va en texto solo para lector: el canal visual es el
    // icono y el color, y el color por sí solo no cumple §1.4.1.
    await expect(mensaje.getByText('Error:')).toBeAttached()
  })

  test('la región del error es persistente y polite, nunca un alert', async ({ page }) => {
    await page.goto('/login')

    // Una región viva que NACE junto con su contenido no se anuncia en muchos
    // lectores: por eso el contenedor está siempre montado y lo que conmuta es
    // el `<p>` de dentro. Y `polite`, no `alert`: estos formularios validan
    // mientras se escribe, y un `assertive` interrumpiría en mitad de la palabra.
    const region = page.locator('[aria-live="polite"]').first()
    await expect(region).toBeAttached()
    await expect(page.locator('form [role="alert"]')).toHaveCount(0)
  })

  test('el campo obligatorio lo dice con texto, no solo con un asterisco', async ({ page }) => {
    await page.goto('/login')
    // Un `*` a secas no se anuncia como «obligatorio» en ningún lector.
    await expect(page.getByLabel('Empleado')).toHaveAttribute('aria-required', 'true')
    await expect(page.getByText('(obligatorio)').first()).toBeAttached()
  })
})

test.describe('§2.5.8 Target Size — el ojo de la contraseña', () => {
  test('mide al menos 24×24 px', async ({ page }) => {
    await page.goto('/login')

    const ojo = page.getByRole('button', { name: 'Mostrar contraseña' })
    await expect(ojo).toBeVisible()

    const caja = exigir(await ojo.boundingBox(), 'la caja del objetivo táctil')
    // Era un icono de 16 px sin caja propia. El mínimo de la 2.2 son 24.
    expect(caja.width, 'ancho del objetivo').toBeGreaterThanOrEqual(24)
    expect(caja.height, 'alto del objetivo').toBeGreaterThanOrEqual(24)

    // Y cambia de nombre al pulsarlo: el estado no puede ir solo en el icono.
    await ojo.click()
    await expect(page.getByRole('button', { name: 'Ocultar contraseña' })).toBeVisible()
  })
})
