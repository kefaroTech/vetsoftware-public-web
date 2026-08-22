import { test, expect, type Locator, type Page } from '@playwright/test'

/**
 * GUARDA DE #111 — `prefers-reduced-motion` apaga TODO el movimiento.
 *
 * Esto no puede ser una captura visual: un PNG congela un fotograma, y lo que
 * aquí se comprueba es cuánto dura el movimiento y cuántas veces se repite. Una
 * regresión visual saldría verde con la guarda entera borrada.
 *
 * Tampoco puede ser una prueba unitaria con jsdom: jsdom no tiene motor de
 * cascada —no resuelve `@media`, no aplica `!important`, no calcula estilos
 * heredados— así que `getComputedStyle` allí devolvería el valor declarado, no
 * el que gana. Hace falta un navegador de verdad, y por eso vive en Playwright.
 *
 * ── Qué se mide y por qué en /login ───────────────────────────────────────
 * La pantalla de login es pública: no necesita backend, ni sesión, ni datos, así
 * que la prueba no depende de que haya credenciales en el entorno. Y carga las
 * mismas tres hojas que el resto de la aplicación (`tokens`, `primitives`,
 * `base`) más `public-auth.css`, donde viven `.pub-spin` y `.pub-reveal`; el
 * esqueleto (`.ds-skeleton`) vive en `primitives`, que también carga ahí.
 *
 * Las dos sondas se INYECTAN con las clases reales del producto porque ninguna
 * plantilla escribe `class="pub-spin"` a pelo (los cinco spinners la copian en su
 * `<style scoped>`). Lo que se ejercita es, aun así, la regla real de
 * `public-auth.css`: el elemento la recibe de la cascada como cualquier otro.
 *
 * ── La decisión que esta prueba NO debe romper ─────────────────────────────
 * El bloque de `base.css:108-119` (antes `main.css`, renombrado en DS-06) usa
 * `0.01ms`, NO `none`. Es deliberado: con `none`
 * la animación no se dispara y `animationend` / `transitionend` no llegan nunca,
 * así que cualquier componente que espere ese evento para limpiar estado se
 * queda colgado — el movimiento desaparecería y con él la funcionalidad. Por eso
 * aquí se afirma que la duración es CASI cero pero MAYOR que cero, y hay un caso
 * dedicado a comprobar que `transitionend` sigue llegando.
 */

/** Tolerancia: `0.01ms` = 1e-5 s. Se acepta cualquier cosa por debajo de 1 ms. */
const CASI_CERO_S = 0.001

/** `"0.00001s"` / `"0.12s, 0.15s"` → `[1e-5]` / `[0.12, 0.15]`. */
function segundos(valor: string): number[] {
  return valor.split(',').map((parte) => {
    const t = parte.trim()
    return t.endsWith('ms') ? Number.parseFloat(t) / 1000 : Number.parseFloat(t)
  })
}

interface Estilos {
  animationName: string
  animationDuration: string
  animationIterationCount: string
  animationDelay: string
  transitionProperty: string
  transitionDuration: string
  transitionDelay: string
}

function estilosDe(locator: Locator): Promise<Estilos> {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el)
    return {
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      animationIterationCount: cs.animationIterationCount,
      animationDelay: cs.animationDelay,
      transitionProperty: cs.transitionProperty,
      transitionDuration: cs.transitionDuration,
      transitionDelay: cs.transitionDelay,
    }
  })
}

/**
 * Deja en la página tres sondas con clases reales del producto, cada una con su
 * `data-testid` para poder localizarlas sin selector de clase.
 *
 * `.ds-skeleton` se añadió en #230: es la animación en bucle más nueva del
 * producto (EST-05, la primitiva de esqueleto de carga) y estuvo fuera de esta
 * red desde que se creó. La única prueba que mide la cascada de verdad no
 * alcanzaba precisamente a la animación recién introducida, que es el momento
 * en que una regresión es más probable.
 */
async function sembrarSondas(page: Page) {
  await page.evaluate(() => {
    // El tipo de tupla no es adorno: sin él TypeScript infiere `string[]` y la
    // desestructuración da `string | undefined`, que es lo que obligaba a los
    // dos `!` que el lint rechaza.
    const sondas: readonly (readonly [clase: string, testid: string])[] = [
      ['pub-spin', 'sonda-spin'],
      ['pub-reveal', 'sonda-reveal'],
      ['ds-skeleton', 'sonda-skeleton'],
    ]

    for (const [clase, testid] of sondas) {
      const el = document.createElement('div')
      el.className = clase
      el.setAttribute('data-testid', testid)
      el.style.width = '16px'
      el.style.height = '16px'
      document.body.appendChild(el)
    }
  })
}

async function irALogin(page: Page) {
  await page.goto('/login')
  // Estado observable, nunca un `waitForTimeout`: el formulario ya está pintado.
  await expect(page.getByRole('button', { name: /iniciar sesi/i })).toBeVisible()
  await sembrarSondas(page)
}

test.describe('prefers-reduced-motion: reduce', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await irALogin(page)
  })

  test('una animación infinita (.pub-spin) queda en una sola iteración', async ({ page }) => {
    const estilos = await estilosDe(page.getByTestId('sonda-spin'))

    expect(
      estilos.animationIterationCount,
      '`.pub-spin` declara `infinite`; con movimiento reducido el giro no puede seguir dando vueltas',
    ).toBe('1')

    // La animación SIGUE existiendo: es lo que mantiene vivo `animationend`.
    expect(
      estilos.animationName,
      'la animación no se anula (`none`), solo se acorta: anularla dejaría sin `animationend` a ' +
        'quien lo espere. Ver el comentario de base.css:95-97.',
    ).not.toBe('none')

    for (const d of segundos(estilos.animationDuration)) {
      expect(d, `duración de animación ${estilos.animationDuration}`).toBeGreaterThan(0)
      expect(d).toBeLessThan(CASI_CERO_S)
    }
    expect(segundos(estilos.animationDelay).every((d) => d === 0)).toBe(true)
  })

  /**
   * EXCEPCIÓN CONOCIDA, fijada aquí a propósito.
   *
   * `public-auth.css:139-143` trae su PROPIO bloque de `prefers-reduced-motion`,
   * anterior a la guarda global, y ahí `.pub-reveal` y `.pub-drift` se apagan con
   * `animation: none`. El bloque global de `base.css:108-119` declara longhands
   * (`animation-duration`, `animation-iteration-count`) pero NO `animation-name`,
   * así que su `!important` no alcanza al `none` local: para esas clases la
   * animación no se dispara y `animationend` no llega nunca.
   *
   * Son TRES, no dos: `.ds-skeleton` (`primitives.css:1657-1662`) hace lo mismo
   * desde EST-05. Este comentario decía dos y se quedó corto, que es como una
   * lista de excepciones deja de contar la verdad.
   *
   * Hoy no rompe nada —ninguna de las tres tiene oyentes: son la entrada de la
   * tarjeta, la deriva del fondo y el destello del esqueleto—, pero contradice el
   * motivo por el que la guarda global eligió `0.01ms` en vez de `none`, y el día
   * que alguien encadene un `animationend` al final del destello para pintar las
   * filas reales, se colgará en silencio y solo para quien pidió reducir
   * movimiento. Se fija el estado REAL para que cambiarlo sea una decisión
   * visible; el cambio de fondo está reportado en #230.
   */
  test('.pub-reveal se apaga con `none` por su guarda local, no con la global', async ({
    page,
  }) => {
    const estilos = await estilosDe(page.getByTestId('sonda-reveal'))

    expect(
      estilos.animationName,
      'si esto deja de ser «none», la guarda local de public-auth.css se retiró (bien) o se ' +
        'movió: revisa que .pub-reveal pase entonces por la guarda global de base.css.',
    ).toBe('none')

    // Lo que la guarda global SÍ le impone: los longhands que sí declara ganan.
    expect(estilos.animationIterationCount).toBe('1')
    for (const d of segundos(estilos.animationDuration)) {
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThan(CASI_CERO_S)
    }
  })

  /**
   * `.ds-skeleton` — la primitiva de esqueleto de carga (EST-05), añadida a esta
   * red en #230.
   *
   * Es el caso que más importa comprobar aquí de los tres, porque es el único
   * cuyo destello está midiendo algo: el esqueleto se pinta mientras llega la
   * primera página de una tabla, y quien pidió reducir movimiento tiene que ver
   * un bloque quieto y con un aspecto deliberado, no un degradado congelado a
   * mitad de recorrido. Por eso su guarda local no se limita a parar la
   * animación: también fija `background` (`primitives.css:1657-1662`).
   *
   * Se afirma el estado REAL, incluido el `none` que contradice la decisión de
   * la guarda global. Ver el comentario de la prueba de `.pub-reveal`.
   */
  test('el destello del esqueleto se para y deja un fondo plano', async ({ page }) => {
    const sonda = page.getByTestId('sonda-skeleton')
    const estilos = await estilosDe(sonda)

    expect(
      estilos.animationName,
      '`.ds-skeleton` debe dejar de destellar con movimiento reducido: si esto ya no es ' +
        '«none», su guarda local de primitives.css se retiró o dejó de nombrar la clase',
    ).toBe('none')

    // Igual que `.pub-reveal`: el `none` local gana en `animation-name`, pero los
    // longhands `!important` de la guarda global siguen imponiéndose.
    expect(estilos.animationIterationCount).toBe('1')
    for (const d of segundos(estilos.animationDuration)) {
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThan(CASI_CERO_S)
    }

    // Lo que la guarda global NO puede hacer por él: elegir el reposo. Sin esto,
    // parar la animación dejaría el degradado de tres paradas congelado donde
    // pillara, y el hueco de la fila se vería como un defecto de pintado.
    const fondo = await sonda.evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(
      fondo,
      'el esqueleto parado sigue mostrando su degradado: la guarda local ya no repone un ' +
        'fondo plano (primitives.css) y el reposo dejó de ser deliberado',
    ).toBe('none')
  })

  test('una transición declarada en un <style scoped> queda acortada', async ({ page }) => {
    // El botón de envío es `PrimaryButton`, cuya transición
    // (`transform .12s, box-shadow .15s, background .15s`) está en su `<style scoped>`.
    // Ese es el caso que obliga al `!important`: la especificidad del atributo de
    // scope siempre gana al selector universal de la guarda.
    const estilos = await estilosDe(page.getByRole('button', { name: /iniciar sesi/i }))

    expect(
      estilos.transitionProperty,
      'la transición no se anula, solo se acorta: `transitionend` debe seguir llegando',
    ).not.toBe('none')

    const duraciones = segundos(estilos.transitionDuration)
    expect(duraciones.length).toBeGreaterThan(0)
    for (const d of duraciones) {
      expect(
        d,
        `duración de transición ${estilos.transitionDuration}: debe ser >0 (0.01ms), no 0 ni none`,
      ).toBeGreaterThan(0)
      expect(d).toBeLessThan(CASI_CERO_S)
    }
    expect(segundos(estilos.transitionDelay).every((d) => d === 0)).toBe(true)
  })

  test('`transitionend` SIGUE llegando: la guarda acorta, no anula', async ({ page }) => {
    // Este es el caso que protege la decisión de `0.01ms` frente a `none`. Si
    // alguien "simplifica" la guarda a `transition: none`, este caso se pone rojo
    // — y con él quedaría en evidencia que cualquier componente que espere el
    // evento para limpiar su estado se colgaría en silencio.
    const llego = await page.getByRole('button', { name: /iniciar sesi/i }).evaluate(
      (el: HTMLElement) =>
        new Promise<boolean>((resolve) => {
          const corte = setTimeout(() => resolve(false), 3000)
          el.addEventListener(
            'transitionend',
            () => {
              clearTimeout(corte)
              resolve(true)
            },
            { once: true },
          )
          // Lectura forzada para que el valor de partida quede calculado antes
          // del cambio; sin ella el navegador podría fundir ambos en un frame.
          void getComputedStyle(el).transform
          el.style.transform = 'translateY(-4px)'
        }),
    )

    expect(
      llego,
      'no llegó `transitionend` con movimiento reducido. La guarda debe acortar la transición ' +
        'a 0.01ms, no anularla: ver base.css:95-97.',
    ).toBe(true)
  })
})

test.describe('sin prefers-reduced-motion (control)', () => {
  // Sin este bloque la prueba de arriba pasaría igual con un navegador que
  // devolviera `0s` para todo: no mediría nada.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await irALogin(page)
  })

  test('la animación y la transición conservan sus valores reales', async ({ page }) => {
    const spin = await estilosDe(page.getByTestId('sonda-spin'))
    expect(spin.animationIterationCount).toBe('infinite')
    expect(segundos(spin.animationDuration)[0]).toBeGreaterThan(CASI_CERO_S)

    // El esqueleto, igual: sin la preferencia activada tiene que destellar de
    // verdad. Sin este control, la prueba de arriba pasaría con la primitiva
    // borrada entera — `none` y `none` son iguales.
    const skeleton = await estilosDe(page.getByTestId('sonda-skeleton'))
    expect(skeleton.animationName).toBe('ds-skeleton-shimmer')
    expect(skeleton.animationIterationCount).toBe('infinite')

    const boton = await estilosDe(page.getByRole('button', { name: /iniciar sesi/i }))
    expect(segundos(boton.transitionDuration).some((d) => d > CASI_CERO_S)).toBe(true)
  })
})
