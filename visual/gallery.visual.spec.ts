import { test, expect, type Page } from '@playwright/test'

/**
 * Regresión visual del design system.
 *
 * Existe por FE-08: la deuda de ese hallazgo se paga borrando CSS, y borrar CSS
 * sin una red que compare el antes y el después obliga a revisar la aplicación
 * pantalla por pantalla en cada tanda. Esto convierte esa revisión manual en un
 * `npm run visual`.
 *
 * ── Por qué una galería y no las pantallas reales ──────────────────────────
 * Las pantallas piden backend, sesión y datos, así que su captura dependería de
 * qué hay en la base de datos ese día: fallaría por motivos que no son un
 * cambio de CSS, y una prueba que falla por ruido se acaba desactivando. La
 * galería monta los componentes REALES y las hojas REALES con datos fijos, que
 * es lo que hace la comparación repetible.
 *
 * Cubre lo que FE-08 toca —primitivas y patrones compartidos— y NO cubre la
 * composición de cada pantalla. Es una red bajo el refactor, no bajo el diseño.
 */

const GALLERY = '/visual/gallery.html'

/** Bloques de la galería; cada uno lleva `data-shot` en `Gallery.vue`. */
const SHOTS = [
  // Primitivas y patrones compartidos: la red original del hallazgo.
  'botones',
  'icon-btn',
  'banners',
  'tarjetas',
  'tipografia',
  'vacios',
  'rejillas',
  'existing-items',

  // A11Y-09 / A11Y-10. La galería no fotografiaba ni un campo: la superficie
  // de formulario —siete primitivas por cuatro estados— se podía romper entera
  // sin mover una sola línea base. `texto-tenue` es el otro medio hueco: el
  // contraste del texto tenue se midió sobre blanco y la aplicación no tiene
  // ninguna superficie blanca.
  'campos',
  'texto-tenue',

  // Los 16 componentes que la última tanda de FE-08 extrajo de `tienda`,
  // `caja` y `acciones`. Entraron aquí porque al dejar de ser marcado copiado
  // dentro de cada vista dejaron de estar protegidos por la captura de esa
  // vista: hoy los comparten el POS, la caja y los siete modales de acciones,
  // y un cambio en cualquiera de ellos se propaga a todos a la vez.
  'pos-filtros',
  'pos-celdas',
  'pos-pies',
  'caja-panel',
  'caja-totales',
  'acciones-paciente',

  // El estado vacío DENTRO de una tabla. El bloque «vacios» solo capturaba
  // `.ds-empty` suelta, donde nadie le disputa nada; el defecto de
  // especificidad que la mantuvo inerte durante meses vivía en la celda de una
  // tabla, que es donde este bloque la pone.
  'vacios-en-tabla',

  // La tira de pestañas (issue #198). `BaseTabs` es primitiva nueva y ya
  // gobierna caja, cuentas y reportes: un cambio suyo repinta tres pantallas a
  // la vez, y las tres piden backend y sesión, así que ninguna está en la
  // galería y ningún gate veía el cambio. Cuatro tiras en un solo bloque —las
  // tres firmas reales más una que no cabe— por el mismo criterio que
  // «pos-filtros»: lo que hay que vigilar es cómo quedan JUNTAS.
  'tabs',

  // El resumen de errores (FORM-05) y las cuatro `.ds-dialog-*`. Las dos
  // familias cambiaron en la tanda de modales de hoy y ninguna captura las veía:
  // `ErrorSummary` es gemelo TR-02 y hereda su color de `.ds-banner--error`,
  // y los diálogos los comparten TODOS los modales desde que se retiraron los
  // siete a medida, pero sus dos consumidores vivos teleportan a `body` y se
  // salen de cualquier recorte por pantalla.
  'resumen-de-errores',
  'dialogos',

  // La familia de tonos completa, y la zona pública entera. Los tres bloques
  // entran a la vez porque comparten el mismo hueco: hasta hoy la galería no
  // cargaba `public-auth.css`, así que NINGUNA captura veía la landing, las
  // siete pantallas de sesión ni el flujo comercial. Los dos cambios de token
  // por contraste (`--pub-ok-tx` y el color de `.pub-error`) y la primitiva
  // nueva `.ds-tone--warning` habrían pasado en verde: no por tolerancia, sino
  // porque no había nada que comparar.
  'tonos',
  'publico-campos',
  'publico-plan',
] as const

/**
 * Todo lo que haría que dos ejecuciones idénticas produjeran píxeles distintos.
 *
 * ── Las fuentes son las REALES, y llegan por disco ─────────────────────────
 * Antes esto reescribía `--font-sans/serif/mono` a las DejaVu del contenedor,
 * así que las capturas fotografiaban una tipografía que la aplicación no usa:
 * un cambio de familia no habría movido un solo píxel, y una caída al respaldo
 * del sistema habría pasado en verde para siempre.
 *
 * Ahora `gallery.html` enlaza `visual/fonts.css`, que declara las familias del
 * producto desde ficheros `.woff2` versionados en `visual/fonts/`. Se sigue
 * bloqueando Google Fonts —la red metería latencia, fallos intermitentes y
 * diferencias entre ejecuciones—, pero ya no hace falta para nada: lo que se
 * compara es la MISMA fuente, la de verdad, en ambos lados.
 */
const CARAS = [
  '400 16px Inter',
  '500 16px Inter',
  '600 16px Inter',
  '700 16px Inter',
  '400 16px Poppins',
  '500 16px Poppins',
  '600 16px Poppins',
  '700 16px Poppins',
  '400 16px "JetBrains Mono"',
  '500 16px "JetBrains Mono"',
] as const

async function estabilizar(page: Page) {
  // La red sigue bloqueada a propósito: las fuentes ya no vienen de ahí, y si
  // alguien añadiera un `<link>` a Google Fonts, esto impide que se cuele.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
      }
    `,
  })

  const fuentes = await page.evaluate(
    async (caras) => {
      // Se cargan TODAS las caras, no solo las que el bloque visible use:
      // `document.fonts.ready` solo espera a las que el layout llegó a pedir, así
      // que un bloque que estrene un peso lo estrenaría a medio cargar.
      const cargas = await Promise.allSettled(caras.map((cara) => document.fonts.load(cara)))
      await document.fonts.ready
      return {
        fallidas: caras.filter((_, i) => cargas[i]?.status === 'rejected'),
        ausentes: caras.filter((cara) => !document.fonts.check(cara)),
        sinCargar: [...document.fonts]
          .filter((cara) => cara.status !== 'loaded')
          .map((cara) => `${cara.family} ${cara.style} ${cara.weight}`),
      }
    },
    [...CARAS],
  )

  // La guarda que faltaba. Sin ella, que una familia no cargue se manifiesta
  // como un diff de píxeles enigmático —o como nada en absoluto, que es lo que
  // pasaba— en vez de como un fallo que se explica solo. Se comprueba ANTES de
  // comparar un solo píxel.
  expect(fuentes.fallidas, 'no se pudieron descargar de visual/fonts/').toEqual([])
  expect(fuentes.sinCargar, 'declaradas en visual/fonts.css pero sin cargar').toEqual([])
  expect(
    fuentes.ausentes,
    'la galería estaría fotografiando la fuente de respaldo del sistema, no la del producto',
  ).toEqual([])
}

test.describe('Galería del design system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GALLERY)
    await estabilizar(page)
    await expect(page.locator('[data-shot="botones"]')).toBeVisible()
  })

  // Un caso por bloque, no una captura de la página entera: si el primer bloque
  // cambia de alto, una captura global desplazaría todo lo de abajo y una sola
  // regresión se reportaría como quince, sin decir cuál es la de verdad.
  for (const shot of SHOTS) {
    test(`bloque «${shot}» sin cambios`, async ({ page }) => {
      await expect(page.locator(`[data-shot="${shot}"]`)).toHaveScreenshot(`${shot}.png`)
    })
  }

  test('los estados de hover del botón de icono no cambian', async ({ page }) => {
    // El hover no se captura en el bloque general porque exige interacción, y es
    // justo donde vivían las variantes que FE-08 unificó: merece su propia red.
    const bloque = page.locator('[data-shot="icon-btn"]')
    await bloque.getByRole('button', { name: 'Eliminar' }).hover()
    await expect(bloque).toHaveScreenshot('icon-btn-hover-danger.png')
  })

  /**
   * ── El foco, tres veces ────────────────────────────────────────────────
   *
   * No cabe en la captura de `campos` porque exige interacción, y es justo el
   * estado que A11Y-09 mueve: `--ring` y `--ring-danger` son el ÚNICO
   * indicador de foco de estos controles, así que si se degradan no queda
   * nada. Un caso por variante, mismo patrón que el hover del botón de icono.
   */
  test('el anillo de foco del campo en reposo no cambia', async ({ page }) => {
    const bloque = page.locator('[data-shot="campos"]')
    const campo = bloque.getByTestId('campo-texto').locator('input')
    await campo.focus()
    await expect(campo).toBeFocused()
    await expect(bloque).toHaveScreenshot('campos-foco.png')
  })

  test('el anillo de foco del campo inválido no cambia', async ({ page }) => {
    const bloque = page.locator('[data-shot="campos"]')
    const envoltorio = bloque.getByTestId('campo-invalido')
    await envoltorio.locator('input').focus()
    // `.ds-field-invalid-focus` es una clase PLANA que BaseInput aplica desde
    // el marcado, no una regla `:focus-within`: hay que esperar a que Vue la
    // pinte. Se espera por el estado observable, no por un reloj.
    await expect(envoltorio).toHaveClass(/ds-field-invalid-focus/)
    await expect(bloque).toHaveScreenshot('campos-foco-invalido.png')
  })

  test('el anillo de foco del disparador de select no cambia', async ({ page }) => {
    // `:focus-visible` sólo casa si el foco llegó por teclado: un `.focus()`
    // programático sobre un <button> NO lo activa en Chromium, y la captura
    // saldría sin anillo sin que nada fallara. Por eso se llega tabulando desde
    // el campo anterior, y se afirma DÓNDE cayó el foco: si alguien reordena el
    // bloque, esto falla aquí en vez de congelar en silencio la imagen buena.
    const bloque = page.locator('[data-shot="campos"]')
    await bloque.getByTestId('campo-texto').locator('input').focus()
    await page.keyboard.press('Tab')
    const disparador = bloque.getByTestId('campo-select').locator('button')
    await expect(disparador).toBeFocused()
    await expect(bloque).toHaveScreenshot('campos-foco-select.png')
  })
})
