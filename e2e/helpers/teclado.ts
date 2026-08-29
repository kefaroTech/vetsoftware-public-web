import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Recorrido de SOLO TECLADO, con las tres comprobaciones que lo hacen valer.
 *
 * Contar tabulaciones («pulsa Tab siete veces») produce una prueba que se rompe
 * cada vez que alguien añade un enlace, y que además no comprueba nada de lo que
 * importa. Lo que importa de un recorrido de teclado es:
 *
 *  1. **Que el foco no se pierda.** Una tabulación que cae en el `<body>` es un
 *     agujero: quien navega con teclado se queda sin saber dónde está.
 *  2. **Que cada parada se vea.** Un control focalizable pero fuera de pantalla,
 *     o tapado, es §2.4.7 incumplido — y es lo que pasa con un menú que se cierra
 *     pero deja sus enlaces en el orden de tabulación.
 *  3. **Que el orden sea el visual.** Se comprueba con `compareDocumentPosition`:
 *     cada parada tiene que venir DESPUÉS de la anterior en el documento. Es
 *     exacto mientras la hoja de estilo no reordene, que es el caso en la landing
 *     y en el paso 6 (en `/registro` sí reordena la rejilla, y por eso allí no se
 *     usa esta comprobación).
 *
 * Devuelve los nombres accesibles de las paradas, para poder afirmarlos cuando
 * el orden concreto sea parte de lo que se sujeta.
 */
export async function tabularHasta(
  page: Page,
  destino: Locator,
  opciones: { maximo?: number; comprobarOrden?: boolean } = {},
): Promise<string[]> {
  const maximo = opciones.maximo ?? 60
  const comprobarOrden = opciones.comprobarOrden ?? true
  const paradas: string[] = []

  // La aplicación es una SPA con rutas perezosas: `page.goto()` resuelve con el
  // `<div id="app">` vacío y el árbol real llega uno o dos ticks después. Tabular
  // antes de eso deja el foco en un DOM que Vue va a reemplazar, y el síntoma —
  // «el enlace de salto no recibe el foco»— no señala a la causa. Se espera por
  // el destino, que es estado observable, no por un reloj.
  await expect(destino, 'el destino no llegó a existir: ¿montó la pantalla?').toBeAttached()

  await page.evaluate(() => {
    delete (window as unknown as Record<string, unknown>).__ultimoFoco
  })

  for (let i = 0; i < maximo; i++) {
    await page.keyboard.press('Tab')

    const enfocado = page.locator(':focus')
    await expect(enfocado, `el foco se perdió en la parada ${i + 1}`).toHaveCount(1)
    await expect(enfocado, `la parada ${i + 1} no es visible`).toBeVisible()

    if (comprobarOrden) {
      const avanza = await page.evaluate(() => {
        const w = window as unknown as { __ultimoFoco?: Element }
        const actual = document.activeElement
        const previo = w.__ultimoFoco
        w.__ultimoFoco = actual ?? undefined
        if (!previo || !actual || previo === actual) return true
        // DOCUMENT_POSITION_FOLLOWING === 4
        return (previo.compareDocumentPosition(actual) & 4) !== 0
      })
      expect(avanza, `la parada ${i + 1} retrocede en el documento`).toBe(true)
    }

    paradas.push(await nombreDelFoco(page))

    if (await destino.evaluate((el) => el === document.activeElement)) return paradas
  }

  throw new Error(
    `El destino no recibió el foco en ${maximo} tabulaciones. Paradas: ${paradas.join(' → ')}`,
  )
}

/** El nombre accesible aproximado de lo que tiene el foco, para el mensaje de fallo. */
async function nombreDelFoco(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return '(nada)'
    const rotulo = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? ''
    return `${el.tagName.toLowerCase()}:${rotulo.slice(0, 40) || '(sin texto)'}`
  })
}
